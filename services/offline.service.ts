import { db, QueuedBucket, QueuedMessage } from './db';
import { bucketLedgerService } from './bucket-ledger.service';
import { simpleMessagingService } from './simple-messaging.service';

export const offlineService = {
  isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  },

  // --- BUCKET QUEUE ---
  // Added orchardId to signature
  async queueBucketScan(pickerId: string, quality: 'A' | 'B' | 'C' | 'reject', orchardId: string, row?: number) {
    try {
      await db.bucket_queue.add({
        picker_id: pickerId,
        orchard_id: orchardId, // Saved to DB
        quality_grade: quality,
        timestamp: new Date().toISOString(),
        synced: false,
        row_number: row
      });
      console.log('[Offline] Bucket Scan Queued');
    } catch (e) {
      console.error('[Offline] Failed to queue bucket', e);
    }
  },

  async getPendingCount(): Promise<number> {
    return await db.bucket_queue.where('synced').equals(0).count();
  },

  // --- SYNC LOGIC ---
  async processQueue() {
    if (!this.isOnline()) return;

    // 1. Process Buckets
    const pendingBuckets = await db.bucket_queue.where('synced').equals(0).toArray();

    if (pendingBuckets.length > 0) {
      console.log(`[Sync] Processing ${pendingBuckets.length} pending buckets...`);
      for (const item of pendingBuckets) {
        try {
          await bucketLedgerService.recordBucket({
            picker_id: item.picker_id,
            quality_grade: item.quality_grade,
            scanned_at: item.timestamp,
            row_number: item.row_number,
            orchard_id: item.orchard_id
          });

          if (item.id) {
            await db.bucket_queue.update(item.id, { synced: true });
            await db.bucket_queue.delete(item.id);
          }
        } catch (e) {
          console.error(`[Sync] Failed to sync bucket ${item.id}`, e);
        }
      }
    }

    // 2. Process Messages
    const pendingMessages = await db.message_queue.where('synced').equals(0).toArray();

    if (pendingMessages.length > 0) {
      console.log(`[Sync] Processing ${pendingMessages.length} pending messages...`);
      for (const msg of pendingMessages) {
        try {
          await simpleMessagingService.sendMessage(
            msg.recipient_id,
            msg.sender_id, // Use real, saved sender_id
            msg.content
          );

          if (msg.id) {
            await db.message_queue.update(msg.id, { synced: true });
            await db.message_queue.delete(msg.id);
          }
        } catch (e) {
          console.error(`[Sync] Failed to sync message ${msg.id}`, e);
        }
      }
    }
  },

  // --- CACHE HELPERS ---
  async cacheUser(user: any, orchardId: string) {
    await db.user_cache.put({
      id: user.id || 'current',
      profile: user,
      orchard_id: orchardId,
      timestamp: Date.now()
    });
  },

  async getCachedUser() {
    return await db.user_cache.toCollection().first();
  },

  async cacheSettings(settings: any) {
    await db.settings_cache.put({
      id: 'current',
      settings,
      timestamp: Date.now()
    });
  },

  async getCachedSettings() {
    const cached = await db.settings_cache.get('current');
    return cached ? cached.settings : null;
  }
};

// Auto-sync on online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Sync] Online detected. Flushing queue...');
    offlineService.processQueue();
  });
}