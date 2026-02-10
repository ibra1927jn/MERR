import { db, QueuedBucket } from './db';

const DAYS_TO_KEEP_SYNCED = 7;

export const offlineService = {
  /**
   * BUCKETS: Main Persistence
   */
  async queueBucket(bucket: Omit<QueuedBucket, 'synced'>) {
    try {
      // Save to Dexie with synced = 0 (Pending)
      await db.bucket_queue.put({ ...bucket, synced: 0 });
      console.log('📦 [Offline] Bucket queued in Dexie:', bucket.id);
    } catch (error) {
      console.error('❌ [Offline] Failed to queue bucket:', error);
    }
  },

  async getPendingBuckets(): Promise<QueuedBucket[]> {
    return await db.bucket_queue.where('synced').equals(0).toArray();
  },

  async markAsSynced(id: string) {
    try {
      await db.bucket_queue.update(id, { synced: 1 });
      console.log('✅ [Offline] Marked as synced in Dexie:', id);
    } catch (error) {
      console.error('❌ [Offline] Failed to mark as synced:', error);
    }
  },

  async getPendingCount(): Promise<number> {
    return await db.bucket_queue.where('synced').equals(0).count();
  },

  /**
   * CLEANUP: Remove old synced records to save space
   */
  async cleanupSynced() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - DAYS_TO_KEEP_SYNCED);
    const isoThreshold = threshold.toISOString();

    const deleteCount = await db.bucket_queue
      .filter(b => b.synced === 1 && b.timestamp < isoThreshold)
      .delete();

    if (deleteCount > 0) {
      console.log(`🧹 [Offline] Cleaned up ${deleteCount} old synced records.`);
    }
  },

  /**
   * LEGACY / STUBS (Keep for compatibility until fully refactored)
   */
  getConflictCount: async () => 0,
  getSyncStatus: () => ({ inProgress: false }),
  processQueue: async () => { }, // Handled by Bridge
  cacheRoster: async () => { },
  cacheSettings: async () => { },
  getCachedSettings: async () => null,
};
