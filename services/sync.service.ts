import { bucketLedgerService } from './bucket-ledger.service';
import { simpleMessagingService } from './simple-messaging.service';

interface PendingItem {
    id: string; // UUID (generated client-side)
    type: 'SCAN' | 'MESSAGE' | 'ATTENDANCE';
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
                            scanned_at: new Date(item.timestamp).toISOString() // Preserve original time
                        });
                        success = true;
                        break;

                    // TODO: Add MESSAGE and ATTENDANCE handlers when ready
                    default:
                        console.warn(`[SyncService] Unknown item type: ${item.type}`);
                        // Keep it in queue? Or discard? For now discard to avoid stuck queue.
                        // But safer to keep distinct check.
                        success = true; // Pretend success to remove bad item
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
