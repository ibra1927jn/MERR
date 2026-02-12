import { db, QueuedBucket } from './db';
import { toNZST } from '@/utils/nzst';

const DAYS_TO_KEEP_SYNCED = 7;

export interface QueueStats {
  pending: number;
  synced: number;
  errors: number;
  oldestPending: string | null;
}

export const offlineService = {
  /**
   * BUCKETS: Main Persistence
   */
  async queueBucket(bucket: Omit<QueuedBucket, 'synced'>) {
    try {
      // Save to Dexie with synced = 0 (Pending)
      await db.bucket_queue.put({ ...bucket, synced: 0 });
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
    const isoThreshold = toNZST(threshold);

    await db.bucket_queue
      .filter(b => b.synced === 1 && b.timestamp < isoThreshold)
      .delete();
  },

  /**
   * Queue Statistics: pending, synced, errors, oldest pending item
   */
  async getQueueStats(): Promise<QueueStats> {
    const all = await db.bucket_queue.toArray();
    const pending = all.filter(b => b.synced === 0);
    const synced = all.filter(b => b.synced === 1);
    const errors = all.filter(b => b.synced === -1);

    let oldestPending: string | null = null;
    if (pending.length > 0) {
      const sorted = pending.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      oldestPending = sorted[0].timestamp;
    }

    return {
      pending: pending.length,
      synced: synced.length,
      errors: errors.length,
      oldestPending,
    };
  },

  /**
   * LEGACY STUB: Conflict count (always 0, kept for compatibility)
   */
  getConflictCount: async () => 0,
};