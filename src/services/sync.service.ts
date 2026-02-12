import { bucketLedgerService } from './bucket-ledger.service';
import { simpleMessagingService } from './simple-messaging.service';
import { attendanceService } from './attendance.service';
import { userService } from './user.service';
import { toNZST } from '@/utils/nzst';
import { logger } from '@/utils/logger';

// Payload types for different sync operations
type ScanPayload = {
    picker_id: string;
    orchard_id: string;
    quality_grade: 'A' | 'B' | 'C' | 'reject';
    timestamp: string;
    row_number?: number;
};

type MessagePayload = {
    channel_type: 'direct' | 'group' | 'team';
    recipient_id: string;
    sender_id: string;
    content: string;
    timestamp: string;
    priority?: string;
};

type AttendancePayload = {
    picker_id: string;
    orchard_id: string;
    check_in_time?: string;
    check_out_time?: string;
};

type SyncPayload = ScanPayload | MessagePayload | AttendancePayload;

interface PendingItem {
    id: string; // UUID (generated client-side)
    type: 'SCAN' | 'MESSAGE' | 'ATTENDANCE' | 'ASSIGNMENT';
    payload: SyncPayload;
    timestamp: number;
    retryCount: number;
}

const STORAGE_KEY = 'harvest_sync_queue';
const LAST_SYNC_KEY = 'harvest_last_sync';

export type { PendingItem };

export const syncService = {

    // 1. Add to Queue (Persist immediately)
    addToQueue(type: 'SCAN' | 'MESSAGE' | 'ATTENDANCE', payload: SyncPayload) {
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
            console.error("SyncService: Failed to parse queue", e);
            return [];
        }
    },

    // 3. Save Queue
    saveQueue(queue: PendingItem[]) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    },

    // 4. Process Queue (The "Background" Worker)
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
                            scanned_at: toNZST(new Date(item.timestamp)) // Preserve original time in NZST
                        });
                        break;

                    case 'ATTENDANCE':
                        // Check-in picker to daily attendance
                        await attendanceService.checkInPicker(
                            item.payload.pickerId,
                            item.payload.orchardId,
                            item.payload.verifiedBy
                        );
                        break;

                    case 'ASSIGNMENT':
                        // Assign user to orchard
                        await userService.assignUserToOrchard(
                            item.payload.userId,
                            item.payload.orchardId
                        );
                        break;

                    case 'MESSAGE':
                        // Send message via messaging service
                        await simpleMessagingService.sendMessage(
                            item.payload.receiverId,
                            item.payload.content,
                            item.payload.type || 'direct'
                        );
                        break;

                    default:
                        logger.warn(`[SyncService] Unknown item type: ${item.type}`);
                        // Remove unknown items to avoid queue blockage
                        break;
                }

                // If we reach here, sync was successful

            } catch (e) {
                logger.error(`[SyncService] Failed to sync item ${item.id}`, e);
                item.retryCount++;
                if (item.retryCount < 50) { // Keep trying for a long time
                    remainingQueue.push(item);
                } else {
                    logger.error(`[SyncService] Giving up on item ${item.id} after 50 retries.`);
                    // Move to "Dead Letter" storage? For now just drop to clean queue.
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
        } catch {
            return null;
        }
    },

    setLastSyncTime() {
        try {
            localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
        } catch {
            // localStorage quota — ignore
        }
    },

    // 7. Get Max Retry Count (for UI display)
    getMaxRetryCount(): number {
        const queue = this.getQueue();
        if (queue.length === 0) return 0;
        return Math.max(...queue.map(item => item.retryCount));
    }
};

// Auto-start processing when online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        syncService.processQueue();
    });

    // Also try on load
    setTimeout(() => syncService.processQueue(), 5000);
}