import { bucketLedgerService } from './bucket-ledger.service';
import { simpleMessagingService } from './simple-messaging.service';
import { userService } from './user.service';
import { conflictService } from './conflict.service';
import { toNZST, nowNZST } from '@/utils/nzst';
import { logger } from '@/utils/logger';
import { db } from './db';
import type { QueuedSyncItem } from './db';

// Import extracted processors and types
import { processContract, processTransport, processTimesheet, processAttendance } from './sync-processors';
import type { PendingItem, SyncPayload, AttendancePayload, ContractPayload, TransportPayload, TimesheetPayload } from './sync-processors';

export type { PendingItem };

export const syncService = {

    // 1. Add to Queue (Persist to IndexedDB immediately)
    async addToQueue(type: PendingItem['type'], payload: SyncPayload) {
        const newItem: QueuedSyncItem = {
            id: crypto.randomUUID(),
            type,
            payload: payload as Record<string, unknown>,
            timestamp: Date.now(),
            retryCount: 0
        };

        await db.sync_queue.put(newItem);

        // Try to sync immediately if online
        if (navigator.onLine) {
            this.processQueue();
        }

        return newItem.id;
    },

    // 2. Get Queue (from IndexedDB)
    async getQueue(): Promise<QueuedSyncItem[]> {
        try {
            return await db.sync_queue.toArray();
        } catch (e) {
            logger.error("SyncService: Failed to read queue from IndexedDB", e);
            return [];
        }
    },

    // 3. Process Queue — The Orchestrator
    async processQueue() {
        if (!navigator.onLine) return;

        const queue = await this.getQueue();
        if (queue.length === 0) return;

        const processedIds: string[] = [];

        for (const item of queue) {
            try {
                switch (item.type) {
                    case 'SCAN':
                        await bucketLedgerService.recordBucket({
                            ...item.payload,
                            scanned_at: toNZST(new Date(item.timestamp))
                        });
                        break;

                    case 'ATTENDANCE':
                        await processAttendance(
                            item.payload as unknown as AttendancePayload,
                            item.updated_at
                        );
                        break;

                    case 'ASSIGNMENT':
                        await userService.assignUserToOrchard(
                            item.payload.userId as string,
                            item.payload.orchardId as string
                        );
                        break;

                    case 'MESSAGE':
                        await simpleMessagingService.sendMessage(
                            item.payload.receiverId as string,
                            item.payload.content as string,
                            (item.payload.type as string) || 'direct'
                        );
                        break;

                    // Delegated to extracted Strategy processors
                    case 'CONTRACT':
                        await processContract(item.payload as unknown as ContractPayload, item.updated_at);
                        break;

                    case 'TRANSPORT':
                        await processTransport(item.payload as unknown as TransportPayload, item.updated_at);
                        break;

                    case 'TIMESHEET':
                        await processTimesheet(item.payload as unknown as TimesheetPayload, item.updated_at);
                        break;

                    default:
                        logger.warn(`[SyncService] Unknown item type: ${item.type}`);
                        break;
                }

                // If we reach here, sync was successful — mark for removal
                processedIds.push(item.id);

            } catch (e) {
                const errorCategory = this.categorizeError(e);
                logger.error(`[SyncService] Failed to sync item ${item.id} (${errorCategory})`, e);

                // Increment retry count in IndexedDB
                const newRetryCount = item.retryCount + 1;

                // Smart retry based on error category
                const maxRetries = errorCategory === 'validation' ? 5 : 50;
                if (newRetryCount < maxRetries) {
                    // Update retry count in-place in IndexedDB
                    await db.sync_queue.update(item.id, { retryCount: newRetryCount });
                } else {
                    logger.error(`[SyncService] Giving up on item ${item.id} after ${newRetryCount} retries (${errorCategory}).`);
                    // Log to conflict service as a dead-letter record
                    await conflictService.detect(
                        item.type.toLowerCase(),
                        item.id,
                        toNZST(new Date(item.timestamp)),
                        nowNZST(),
                        item.payload,
                        { error: 'max_retries_exceeded', category: errorCategory, retryCount: newRetryCount }
                    );
                    // Persist to DLQ in IndexedDB for admin review
                    try {
                        await db.dead_letter_queue.put({
                            id: item.id,
                            type: item.type,
                            payload: item.payload,
                            timestamp: item.timestamp,
                            retryCount: newRetryCount,
                            failureReason: `${errorCategory}: max retries exceeded`,
                            errorCode: e instanceof Error ? e.message : String(e),
                            movedAt: Date.now(),
                        });
                    } catch (dlqError) {
                        logger.error('[SyncService] Failed to persist dead letter item:', dlqError);
                    }
                    // Remove from sync queue (moved to DLQ)
                    processedIds.push(item.id);
                }
            }
        }

        // Bulk-delete processed items from IndexedDB
        if (processedIds.length > 0) {
            await db.sync_queue.bulkDelete(processedIds);
        }

        // Track last successful sync time
        if (processedIds.length > 0) {
            await this.setLastSyncTime();
        }
    },

    // 4. Get Pending Count (For UI Badges)
    async getPendingCount(): Promise<number> {
        return await db.sync_queue.count();
    },

    // 5. Last Sync Timestamp (from IndexedDB)
    async getLastSyncTime(): Promise<number | null> {
        try {
            const meta = await db.sync_meta.get('lastSync');
            return meta ? meta.value : null;
        } catch (e) {
            logger.warn('[SyncService] Failed to read last sync time:', e);
            return null;
        }
    },

    async setLastSyncTime() {
        try {
            await db.sync_meta.put({ id: 'lastSync', value: Date.now() });
        } catch (e) {
            logger.warn('[SyncService] Failed to save last sync time:', e);
        }
    },

    // 6. Get Max Retry Count (for UI display)
    async getMaxRetryCount(): Promise<number> {
        const queue = await this.getQueue();
        if (queue.length === 0) return 0;
        return Math.max(...queue.map(item => item.retryCount));
    },

    /**
     * 7. Queue Summary — Per-type breakdown with retry stats
     */
    async getQueueSummary(): Promise<{
        total: number;
        byType: Record<string, number>;
        maxRetry: number;
        oldestTimestamp: number | null;
        lastSync: number | null;
    }> {
        const queue = await this.getQueue();
        const byType: Record<string, number> = {};

        for (const item of queue) {
            byType[item.type] = (byType[item.type] || 0) + 1;
        }

        return {
            total: queue.length,
            byType,
            maxRetry: queue.length > 0 ? Math.max(...queue.map(i => i.retryCount)) : 0,
            oldestTimestamp: queue.length > 0 ? Math.min(...queue.map(i => i.timestamp)) : null,
            lastSync: await this.getLastSyncTime(),
        };
    },

    /**
     * 8. Categorize Error — network | server | validation | unknown
     */
    categorizeError(error: unknown): 'network' | 'server' | 'validation' | 'unknown' {
        if (!navigator.onLine) return 'network';

        if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('aborted')) {
                return 'network';
            }
            if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('429')) {
                return 'server';
            }
            if (msg.includes('23') || msg.includes('constraint') || msg.includes('violat') || msg.includes('unique') || msg.includes('foreign key')) {
                return 'validation';
            }
        }

        // Supabase error objects
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const code = String((error as Record<string, unknown>).code);
            if (code.startsWith('23')) return 'validation';
            if (code === 'PGRST') return 'server';
        }

        return 'unknown';
    },
};

// Auto-start processing when online — WITH JITTER to prevent thundering herd
if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
        // Stagger sync by 0-30s to prevent hundreds of devices
        // from DDoS-ing Supabase when Wi-Fi returns at end of shift
        const { randomJitter } = await import('@/utils/jitter');
        await randomJitter(30_000);
        syncService.processQueue();
    });

    // Also try on load (no jitter needed — staggered by natural page load times)
    setTimeout(() => syncService.processQueue(), 5000);
}