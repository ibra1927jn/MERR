/**
 * Conflict Resolution Service
 * ============================
 * Detects and logs sync conflicts when offline changes
 * collide with server-side changes.
 *
 * Strategy:
 * - INSERT operations (bucket scans) → no conflicts possible (append-only + 23505 dedup)
 * - UPDATE operations (picker status, attendance) → check updated_at before applying
 * - Conflicts are logged to IndexedDB and optionally synced to audit_logs
 *
 * Storage: Dexie.js (IndexedDB) — replaces localStorage (audit fix: no 5MB limit)
 */

import { logger } from '@/utils/logger';
import { nowNZST } from '@/utils/nzst';
import { safeUUID } from '@/utils/uuid';
import { db } from './db';
import type { StoredConflict } from './db';

// Re-export for backwards compatibility
export type SyncConflict = StoredConflict;

// ============================================
// CONSTANTS
// ============================================

const MAX_STORED_CONFLICTS = 50;

// ============================================
// PUBLIC API
// ============================================

export const conflictService = {
    /**
     * Check if a local update conflicts with server state.
     * Returns the conflict if detected, null if safe to proceed.
     *
     * @param table - DB table name (e.g. 'pickers', 'daily_attendance')
     * @param recordId - UUID of the record
     * @param localUpdatedAt - Timestamp when local change was made
     * @param serverUpdatedAt - Timestamp from the server's current version
     * @param localValues - The values the client wants to write
     * @param serverValues - The current values on the server
     */
    async detect(
        table: string,
        recordId: string,
        localUpdatedAt: string,
        serverUpdatedAt: string,
        localValues: Record<string, unknown>,
        serverValues: Record<string, unknown>
    ): Promise<SyncConflict | null> {
        const localTime = new Date(localUpdatedAt).getTime();
        const serverTime = new Date(serverUpdatedAt).getTime();

        // No conflict if local is newer or equal
        if (localTime >= serverTime) {
            return null;
        }

        // Server has a newer version — conflict detected
        const conflict: SyncConflict = {
            id: safeUUID(),
            table,
            record_id: recordId,
            local_updated_at: localUpdatedAt,
            server_updated_at: serverUpdatedAt,
            local_values: localValues,
            server_values: serverValues,
            resolution: 'pending',
            detected_at: nowNZST()
        };

        logger.warn(
            `[ConflictService] ⚠️ Conflict detected on ${table}/${recordId}: ` +
            `local=${localUpdatedAt}, server=${serverUpdatedAt}`
        );

        // Store conflict in IndexedDB
        try {
            await db.sync_conflicts.put(conflict);

            // Trim old conflicts if over limit
            const total = await db.sync_conflicts.count();
            if (total > MAX_STORED_CONFLICTS) {
                const oldest = await db.sync_conflicts
                    .orderBy('detected_at')
                    .limit(total - MAX_STORED_CONFLICTS)
                    .toArray();
                const idsToRemove = oldest
                    .filter(c => c.resolution !== 'pending')
                    .map(c => c.id);
                if (idsToRemove.length > 0) {
                    await db.sync_conflicts.bulkDelete(idsToRemove);
                }
            }
        } catch (e) {
            logger.error('[ConflictService] Failed to save conflict to IndexedDB:', e);
        }

        return conflict;
    },

    /**
     * Resolve a conflict with the chosen strategy.
     */
    async resolve(conflictId: string, resolution: 'keep_local' | 'keep_server' | 'merged'): Promise<SyncConflict | null> {
        try {
            const conflict = await db.sync_conflicts.get(conflictId);
            if (!conflict) {
                logger.warn(`[ConflictService] Conflict ${conflictId} not found`);
                return null;
            }

            conflict.resolution = resolution;
            await db.sync_conflicts.put(conflict);

            logger.info(
                `[ConflictService] ✅ Conflict ${conflictId} resolved: ${resolution} ` +
                `(${conflict.table}/${conflict.record_id})`
            );

            return conflict;
        } catch (e) {
            logger.error('[ConflictService] Failed to resolve conflict:', e);
            return null;
        }
    },

    /**
     * Get all pending (unresolved) conflicts.
     */
    async getPendingConflicts(): Promise<SyncConflict[]> {
        try {
            return await db.sync_conflicts.where('resolution').equals('pending').toArray();
        } catch (e) {
            logger.error('[ConflictService] Failed to read pending conflicts:', e);
            return [];
        }
    },

    /**
     * Get all conflicts (for audit/history UI).
     */
    async getAllConflicts(): Promise<SyncConflict[]> {
        try {
            return await db.sync_conflicts.toArray();
        } catch (e) {
            logger.error('[ConflictService] Failed to read conflicts:', e);
            return [];
        }
    },

    /**
     * Get count of pending conflicts (for UI badges).
     */
    async getPendingCount(): Promise<number> {
        try {
            return await db.sync_conflicts.where('resolution').equals('pending').count();
        } catch (e) {
            logger.error('[ConflictService] Failed to count pending conflicts:', e);
            return 0;
        }
    },

    /**
     * Clear resolved conflicts older than N days.
     */
    async cleanup(maxAgeDays: number = 7): Promise<number> {
        try {
            const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
            const cutoffDate = new Date(cutoff).toISOString();

            const oldResolved = await db.sync_conflicts
                .where('resolution').notEqual('pending')
                .filter(c => c.detected_at < cutoffDate)
                .toArray();

            if (oldResolved.length > 0) {
                await db.sync_conflicts.bulkDelete(oldResolved.map(c => c.id));
                logger.info(`[ConflictService] Cleaned up ${oldResolved.length} resolved conflicts`);
            }

            return oldResolved.length;
        } catch (e) {
            logger.error('[ConflictService] Failed to clean up conflicts:', e);
            return 0;
        }
    },

    /**
     * Clear all conflicts (after successful full sync).
     */
    async clearAll(): Promise<void> {
        try {
            await db.sync_conflicts.clear();
        } catch (e) {
            logger.error('[ConflictService] Failed to clear conflicts:', e);
        }
    }
};
