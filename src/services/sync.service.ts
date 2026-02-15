import { bucketLedgerService } from './bucket-ledger.service';
import { simpleMessagingService } from './simple-messaging.service';
import { attendanceService } from './attendance.service';
import { userService } from './user.service';
import { conflictService } from './conflict.service';
import { toNZST, nowNZST } from '@/utils/nzst';
import { logger } from '@/utils/logger';

// Import extracted processors and types
import { processContract, processTransport, processTimesheet } from './sync-processors';
import type { PendingItem, SyncPayload, ContractPayload, TransportPayload, TimesheetPayload } from './sync-processors';

const STORAGE_KEY = 'harvest_sync_queue';
const LAST_SYNC_KEY = 'harvest_last_sync';

export type { PendingItem };

export const syncService = {

    // 1. Add to Queue (Persist immediately)
    addToQueue(type: PendingItem['type'], payload: SyncPayload) {
        const queue = this.getQueue();
        const newItem: PendingItem = {
            id: crypto.randomUUID(),
            type,
            payload,
            timestamp: Date.now(),
            retryCount: 0
        };

        queue.push(newItem);
        this.saveQueue(queue);

        // Try to sync immediately if online
        if (navigator.onLine) {
            this.processQueue();
        }

        return newItem.id;
    },

    // 2. Get Queue
    getQueue(): PendingItem[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            logger.error("SyncService: Failed to parse queue", e);
            return [];
        }
    },

    // 3. Save Queue
    saveQueue(queue: PendingItem[]) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    },

    // 4. Process Queue — The Orchestrator
    async processQueue() {
        if (!navigator.onLine) return;

        const queue = this.getQueue();
        if (queue.length === 0) return;

        const remainingQueue: PendingItem[] = [];

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
                        await attendanceService.checkInPicker(
                            item.payload.pickerId,
                            item.payload.orchardId,
                            item.payload.verifiedBy
                        );
                        break;

                    case 'ASSIGNMENT':
                        await userService.assignUserToOrchard(
                            item.payload.userId,
                            item.payload.orchardId
                        );
                        break;

                    case 'MESSAGE':
                        await simpleMessagingService.sendMessage(
                            item.payload.receiverId,
                            item.payload.content,
                            item.payload.type || 'direct'
                        );
                        break;

                    // Delegated to extracted Strategy processors
                    case 'CONTRACT':
                        await processContract(item.payload as ContractPayload, item.updated_at);
                        break;

                    case 'TRANSPORT':
                        await processTransport(item.payload as TransportPayload, item.updated_at);
                        break;

                    case 'TIMESHEET':
                        await processTimesheet(item.payload as TimesheetPayload, item.updated_at);
                        break;

                    default:
                        logger.warn(`[SyncService] Unknown item type: ${item.type}`);
                        break;
                }

                // If we reach here, sync was successful

            } catch (e) {
                const errorCategory = this.categorizeError(e);
                logger.error(`[SyncService] Failed to sync item ${item.id} (${errorCategory})`, e);
                item.retryCount++;

                // Smart retry based on error category
                const maxRetries = errorCategory === 'validation' ? 5 : 50;
                if (item.retryCount < maxRetries) {
                    remainingQueue.push(item);
                } else {
                    logger.error(`[SyncService] Giving up on item ${item.id} after ${item.retryCount} retries (${errorCategory}).`);
                    // Log to conflict service as a dead-letter record
                    conflictService.detect(
                        item.type.toLowerCase(),
                        item.id,
                        toNZST(new Date(item.timestamp)),
                        nowNZST(),
                        item.payload as Record<string, unknown>,
                        { error: 'max_retries_exceeded', category: errorCategory, retryCount: item.retryCount }
                    );
                    // Persist to IndexedDB for admin review
                    try {
                        const { db } = await import('./db');
                        await db.dead_letter_queue.put({
                            id: item.id,
                            type: item.type,
                            payload: item.payload as Record<string, unknown>,
                            timestamp: item.timestamp,
                            retryCount: item.retryCount,
                            failureReason: `${errorCategory}: max retries exceeded`,
                            errorCode: e instanceof Error ? e.message : String(e),
                            movedAt: Date.now(),
                        });
                    } catch (dlqError) {
                        logger.error('[SyncService] Failed to persist dead letter item:', dlqError);
                    }
                }
            }
        }

        this.saveQueue(remainingQueue);

        // Track last successful sync time
        if (remainingQueue.length < queue.length) {
            this.setLastSyncTime();
        }
    },

    // 5. Get Pending Count (For UI Badges)
    getPendingCount() {
        return this.getQueue().length;
    },

    // 6. Last Sync Timestamp
    getLastSyncTime(): number | null {
        try {
            const stored = localStorage.getItem(LAST_SYNC_KEY);
            return stored ? Number(stored) : null;
        } catch (e) {
            logger.warn('[SyncService] Failed to read last sync time:', e);
            return null;
        }
    },

    setLastSyncTime() {
        try {
            localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
        } catch (e) {
            logger.warn('[SyncService] Failed to save last sync time (quota?):', e);
        }
    },

    // 7. Get Max Retry Count (for UI display)
    getMaxRetryCount(): number {
        const queue = this.getQueue();
        if (queue.length === 0) return 0;
        return Math.max(...queue.map(item => item.retryCount));
    },

    /**
     * 8. Queue Summary — Per-type breakdown with retry stats
     */
    getQueueSummary(): {
        total: number;
        byType: Record<string, number>;
        maxRetry: number;
        oldestTimestamp: number | null;
        lastSync: number | null;
    } {
        const queue = this.getQueue();
        const byType: Record<string, number> = {};

        for (const item of queue) {
            byType[item.type] = (byType[item.type] || 0) + 1;
        }

        return {
            total: queue.length,
            byType,
            maxRetry: queue.length > 0 ? Math.max(...queue.map(i => i.retryCount)) : 0,
            oldestTimestamp: queue.length > 0 ? Math.min(...queue.map(i => i.timestamp)) : null,
            lastSync: this.getLastSyncTime(),
        };
    },

    /**
     * 9. Categorize Error — network | server | validation | unknown
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

// Auto-start processing when online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        syncService.processQueue();
    });

    // Also try on load
    setTimeout(() => syncService.processQueue(), 5000);
}