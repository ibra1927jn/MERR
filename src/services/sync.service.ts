import { bucketLedgerService } from './bucket-ledger.service';
import { simpleMessagingService } from './simple-messaging.service';
import { attendanceService } from './attendance.service';
import { userService } from './user.service';
import { toNZST } from '@/utils/nzst';

interface PendingItem {
    id: string; // UUID (generated client-side)
    type: 'SCAN' | 'MESSAGE' | 'ATTENDANCE' | 'ASSIGNMENT';
    payload: any;
    timestamp: number;
    retryCount: number;
}

const STORAGE_KEY = 'harvest_sync_queue';

export const syncService = {

    // 1. Add to Queue (Persist immediately)
    addToQueue(type: 'SCAN' | 'MESSAGE' | 'ATTENDANCE', payload: any) {
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
        console.log(`[SyncService] Processing ${queue.length} items...`);

        const remainingQueue: PendingItem[] = [];

        for (const item of queue) {
            try {
                let success = false;

                switch (item.type) {
                    case 'SCAN':
                        await bucketLedgerService.recordBucket({
                            ...item.payload,
                            scanned_at: toNZST(new Date(item.timestamp)) // Preserve original time in NZST
                        });
                        success = true;
                        break;

                    case 'ATTENDANCE':
                        // Check-in picker to daily attendance
                        await attendanceService.checkInPicker(
                            item.payload.pickerId,
                            item.payload.orchardId,
                            item.payload.verifiedBy
                        );
                        success = true;
                        console.log(`[SyncService] Attendance synced for picker ${item.payload.pickerId}`);
                        break;

                    case 'ASSIGNMENT':
                        // Assign user to orchard
                        await userService.assignUserToOrchard(
                            item.payload.userId,
                            item.payload.orchardId
                        );
                        success = true;
                        console.log(`[SyncService] Assignment synced for user ${item.payload.userId}`);
                        break;

                    case 'MESSAGE':
                        // Send message via messaging service
                        await simpleMessagingService.sendMessage(
                            item.payload.receiverId,
                            item.payload.content,
                            item.payload.type || 'direct'
                        );
                        success = true;
                        console.log(`[SyncService] Message synced to ${item.payload.receiverId}`);
                        break;

                    default:
                        console.warn(`[SyncService] Unknown item type: ${item.type}`);
                        success = true; // Remove unknown items to avoid queue blockage
                        break;
                }

                if (success) {
                    console.log(`[SyncService] Item ${item.id} synced successfully.`);
                } else {
                    // Should not start here normally, logic is inside switch
                }

            } catch (e) {
                console.error(`[SyncService] Failed to sync item ${item.id}`, e);
                item.retryCount++;
                if (item.retryCount < 50) { // Keep trying for a long time
                    remainingQueue.push(item);
                } else {
                    console.error(`[SyncService] Giving up on item ${item.id} after 50 retries.`);
                    // Move to "Dead Letter" storage? For now just drop to clean queue.
                }
            }
        }

        this.saveQueue(remainingQueue);
    },

    // 5. Get Pending Count (For UI Badges)
    getPendingCount() {
        return this.getQueue().length;
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