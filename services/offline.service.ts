import { db, QueuedBucket, QueuedMessage } from './db';
import { bucketLedgerService } from './bucket-ledger.service';
import { simpleMessagingService } from './simple-messaging.service';
import { supabase } from './supabase';
import { telemetryService } from './telemetry.service';

export const offlineService = {
  isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  },

  // --- BUCKET QUEUE ---
  async queueBucketScan(pickerId: string, quality: 'A' | 'B' | 'C' | 'reject', orchardId: string, row?: number, binId?: string, scannedBy?: string) {
    try {
      await db.bucket_queue.add({
        picker_id: pickerId,
        orchard_id: orchardId,
        quality_grade: quality,
        timestamp: new Date().toISOString(),
        synced: 0, // 0 = pending
        row_number: row,
        bin_id: binId,
        scanned_by: scannedBy
      });
      telemetryService.log('INFO', 'Offline', 'Bucket Queued', { pickerId, binId });
      console.log('[Offline] Bucket Scan Queued');
    } catch (e: any) {
      telemetryService.error('Offline', 'Queueing Failed', e);
      console.error('[Offline] Failed to queue bucket', e);
    }
  },

  async getPendingCount(): Promise<number> {
    const buckets = await db.bucket_queue.where('synced').equals(0).count();
    const messages = await db.message_queue.where('synced').equals(0).count();
    return buckets + messages;
  },

  async getConflictCount(): Promise<number> {
    const buckets = await db.bucket_queue.where('synced').equals(-1).count();
    const messages = await db.message_queue.where('synced').equals(-1).count();
    return buckets + messages;
  },

  // --- SYNC CONFIG ---
  _syncInProgress: false,
  _lastSyncTime: null as Date | null,
  _retryDelays: [1000, 2000, 4000], // Exponential backoff

  getSyncStatus() {
    return {
      inProgress: this._syncInProgress,
      lastSync: this._lastSyncTime
    };
  },

  // Helper for delays
  async _sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // --- SYNC LOGIC WITH RETRY & DEAD LETTER QUEUE ---
  async processQueue() {
    if (!this.isOnline()) return;
    if (this._syncInProgress) return; // Prevent concurrent syncs

    this._syncInProgress = true;
    telemetryService.log('INFO', 'OfflineSync', 'Sync Started');

    try {
      // 1. Process Buckets (Only pending ones)
      const pendingBuckets = await db.bucket_queue.where('synced').equals(0).toArray();

      if (pendingBuckets.length > 0) {
        telemetryService.log('INFO', 'OfflineSync', 'Syncing Buckets', { count: pendingBuckets.length });
        console.log(`[Sync] Processing ${pendingBuckets.length} pending buckets...`);
        for (const item of pendingBuckets) {
          let success = false;
          let lastError: any = null;

          // Retry loop with exponential backoff
          for (let attempt = 0; attempt < 3 && !success; attempt++) {
            try {
              await bucketLedgerService.recordBucket({
                picker_id: item.picker_id,
                quality_grade: item.quality_grade,
                scanned_at: item.timestamp,
                row_number: item.row_number,
                orchard_id: item.orchard_id,
                bin_id: item.bin_id,
                scanned_by: item.scanned_by
              });

              if (item.id) {
                // Success: Mark as synced (1) and delete
                await db.bucket_queue.update(item.id, { synced: 1 });
                await db.bucket_queue.delete(item.id);
              }
              success = true;
              telemetryService.log('INFO', 'OfflineSync', 'Bucket Synced', { id: item.id });
            } catch (e: any) {
              lastError = e;
              console.warn(`[Sync] Bucket ${item.id} attempt ${attempt + 1} failed`, e);

              // CONFLICT CHECK (409)
              if (e?.code === '23505' || e?.status === 409) {
                telemetryService.log('WARN', 'OfflineSync', 'Conflict (Already Synced)', { id: item.id });
                console.log('[Sync] Conflict detected (duplicate), treating as success.');
                if (item.id) await db.bucket_queue.delete(item.id);
                success = true;
                break;
              }

              if (attempt < 2) {
                await this._sleep(this._retryDelays[attempt]);
              }
            }
          }

          // Dead Letter Queue Logic
          if (!success && item.id) {
            telemetryService.log('ERROR', 'OfflineSync', 'Bucket Failed Sync', { id: item.id, error: lastError?.message });
            console.error(`[Sync] Bucket ${item.id} moved to Dead Letter Queue (synced=-1)`);
            await db.bucket_queue.update(item.id, {
              synced: -1,
              failure_reason: lastError?.message || 'Unknown error'
            });
          }
        }
      }

      // 2. Process Messages
      const pendingMessages = await db.message_queue.where('synced').equals(0).toArray();

      if (pendingMessages.length > 0) {
        console.log(`[Sync] Processing ${pendingMessages.length} pending messages...`);
        for (const msg of pendingMessages) {
          let success = false;
          let lastError: any = null;

          for (let attempt = 0; attempt < 3 && !success; attempt++) {
            try {
              await simpleMessagingService.sendMessage(
                msg.recipient_id,
                msg.sender_id,
                msg.content
              );

              if (msg.id) {
                await db.message_queue.update(msg.id, { synced: 1 });
                await db.message_queue.delete(msg.id);
              }
              success = true;
            } catch (e: any) {
              lastError = e;
              console.warn(`[Sync] Message ${msg.id} attempt ${attempt + 1} failed`, e);

              // CONFLICT CHECK
              if (e?.code === '23505' || e?.status === 409) {
                if (msg.id) await db.message_queue.delete(msg.id);
                success = true;
                break;
              }

              if (attempt < 2) {
                await this._sleep(this._retryDelays[attempt]);
              }
            }
          }

          if (!success && msg.id) {
            console.error(`[Sync] Message ${msg.id} moved to Dead Letter Queue (synced=-1)`);
            await db.message_queue.update(msg.id, {
              synced: -1,
              failure_reason: lastError?.message || 'Unknown error'
            });
          }
        }
      }

      this._lastSyncTime = new Date();
    } finally {
      this._syncInProgress = false;
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
  },

  // --- ROSTER CACHE (For Offline Validation) ---
  async cacheRoster(roster: any[], orchardId: string) {
    await db.user_cache.put({
      id: `roster_${orchardId}`,
      roster,
      orchard_id: orchardId,
      timestamp: Date.now()
    });
  },

  async getCachedRoster(orchardId: string) {
    const cached = await db.user_cache.get(`roster_${orchardId}`);
    return cached ? cached.roster : [];
  },

  // --- DEFENSIVE CLEANUP (War Tank Strategy) ---
  cleanupLegacyStorage() {
    const legacyKeys = ['bin_history', 'scan_queue', 'bucket_history', 'offline_bins'];
    legacyKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`[Cleanup] Removing legacy storage key: ${key}`);
        localStorage.removeItem(key);
      }
    });
  }
};

// Auto-sync on online & Defensive Cleanup
if (typeof window !== 'undefined') {
  offlineService.cleanupLegacyStorage();
  window.addEventListener('online', () => {
    console.log('[Sync] Online detected. Flushing queue...');
    offlineService.processQueue();
  });
}