import { db, QueuedBucket } from './db';
import { bucketLedgerService } from './bucket-ledger.service';

export const offlineService = {
  isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  },

  // --- BUCKET QUEUE ---
  async queueBucketScan(pickerId: string, quality: 'A' | 'B' | 'C' | 'reject', row?: number) {
    try {
      await db.bucket_queue.add({
        picker_id: pickerId,
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

    const pending = await db.bucket_queue.where('synced').equals(0).toArray();
    if (pending.length === 0) return;

    console.log(`[Sync] Processing ${pending.length} pending buckets...`);

    for (const item of pending) {
      try {
        // Send to Supabase via existing service
        await bucketLedgerService.recordBucket({
          picker_id: item.picker_id,
          quality_grade: item.quality_grade,
          scanned_at: item.timestamp,
          row_number: item.row_number
          // orchard_id handled by service or context if needed, 
          // but service takes what we give. We might need to cache orchard_id too.
        });

        // Mark as synced or delete
        if (item.id) {
          await db.bucket_queue.update(item.id, { synced: true });
          // Optional: Delete after sync to keep DB small
          await db.bucket_queue.delete(item.id);
        }
      } catch (e) {
        console.error(`[Sync] Failed to sync item ${item.id}`, e);
        // Leave 'synced: false' to retry later
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