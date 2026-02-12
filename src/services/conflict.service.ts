/**
 * Conflict Resolution Service
 * ============================
 * Detects and logs sync conflicts when offline changes
 * collide with server-side changes.
 *
 * Strategy:
 * - INSERT operations (bucket scans) → no conflicts possible (append-only + 23505 dedup)
 * - UPDATE operations (picker status, attendance) → check updated_at before applying
 * - Conflicts are logged to localStorage and optionally synced to audit_logs
 */

import { logger } from '@/utils/logger';
import { nowNZST } from '@/utils/nzst';

// ============================================
// TYPES
// ============================================

export interface SyncConflict {
    id: string;
    table: string;
    record_id: string;
    local_updated_at: string;
    server_updated_at: string;
    local_values: Record<string, unknown>;
    server_values: Record<string, unknown>;
    resolution: 'pending' | 'keep_local' | 'keep_server' | 'merged';
    detected_at: string;
}

// ============================================
// STORAGE
// ============================================

const CONFLICTS_KEY = 'harvest_sync_conflicts';
const MAX_STORED_CONFLICTS = 50;

function getStoredConflicts(): SyncConflict[] {
    try {
        const stored = localStorage.getItem(CONFLICTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveConflicts(conflicts: SyncConflict[]): void {
    try {
        // Keep only the most recent conflicts to avoid localStorage bloat
        const trimmed = conflicts.slice(-MAX_STORED_CONFLICTS);
        localStorage.setItem(CONFLICTS_KEY, JSON.stringify(trimmed));
    } catch {
        logger.error('[ConflictService] Failed to save conflicts to localStorage');
    }
}

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
    detect(
        table: string,
        recordId: string,
        localUpdatedAt: string,
        serverUpdatedAt: string,
        localValues: Record<string, unknown>,
        serverValues: Record<string, unknown>
    ): SyncConflict | null {
        const localTime = new Date(localUpdatedAt).getTime();
        const serverTime = new Date(serverUpdatedAt).getTime();

        // No conflict if local is newer or equal
        if (localTime >= serverTime) {
            return null;
        }

        // Server has a newer version — conflict detected
        const conflict: SyncConflict = {
            id: crypto.randomUUID(),
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

        // Store conflict
        const conflicts = getStoredConflicts();
        conflicts.push(conflict);
        saveConflicts(conflicts);

        return conflict;
    },

    /**
     * Resolve a conflict with the chosen strategy.
     */
    resolve(conflictId: string, resolution: 'keep_local' | 'keep_server' | 'merged'): SyncConflict | null {
        const conflicts = getStoredConflicts();
        const idx = conflicts.findIndex(c => c.id === conflictId);

        if (idx === -1) {
            logger.warn(`[ConflictService] Conflict ${conflictId} not found`);
            return null;
        }

        conflicts[idx].resolution = resolution;
        saveConflicts(conflicts);

        logger.info(
            `[ConflictService] ✅ Conflict ${conflictId} resolved: ${resolution} ` +
            `(${conflicts[idx].table}/${conflicts[idx].record_id})`
        );

        return conflicts[idx];
    },

    /**
     * Get all pending (unresolved) conflicts.
     */
    getPendingConflicts(): SyncConflict[] {
        return getStoredConflicts().filter(c => c.resolution === 'pending');
    },

    /**
     * Get all conflicts (for audit/history UI).
     */
    getAllConflicts(): SyncConflict[] {
        return getStoredConflicts();
    },

    /**
     * Get count of pending conflicts (for UI badges).
     */
    getPendingCount(): number {
        return this.getPendingConflicts().length;
    },

    /**
     * Clear resolved conflicts older than N days.
     */
    cleanup(maxAgeDays: number = 7): number {
        const conflicts = getStoredConflicts();
        const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
        const before = conflicts.length;

        const remaining = conflicts.filter(c =>
            c.resolution === 'pending' || // Always keep pending
            new Date(c.detected_at).getTime() > cutoff
        );

        saveConflicts(remaining);
        const removed = before - remaining.length;

        if (removed > 0) {
            logger.info(`[ConflictService] Cleaned up ${removed} resolved conflicts`);
        }

        return removed;
    },

    /**
     * Clear all conflicts (after successful full sync).
     */
    clearAll(): void {
        localStorage.removeItem(CONFLICTS_KEY);
    }
};
