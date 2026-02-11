import { useEffect, useRef, useCallback } from 'react';
import { useHarvestStore } from '../../stores/useHarvestStore';
import { supabase } from '../../services/supabase';
import { offlineService } from '../../services/offline.service';

const BASE_DELAY = 5_000;    // 5 seconds
const MAX_DELAY = 300_000;   // 5 minutes cap

/**
 * Invisible sync bridge that batch-uploads pending buckets to Supabase.
 * 
 * IDEMPOTENCY: If `bucket_events.id` has a UNIQUE constraint (migration),
 * duplicate inserts from retry attempts receive a 409/23505 error.
 * We treat these as success — the data already exists in the DB.
 */
export const HarvestSyncBridge = () => {
    const buckets = useHarvestStore((state) => state.buckets);
    const markAsSynced = useHarvestStore((state) => state.markAsSynced);

    const retryDelay = useRef(BASE_DELAY);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const syncPendingBuckets = useCallback(async () => {
        const pending = buckets.filter(b => !b.synced);
        if (pending.length === 0) {
            // Nothing to sync — schedule next check at base delay
            retryDelay.current = BASE_DELAY;
            scheduleNext();
            return;
        }

        console.log(`[Bridge] Batch syncing ${pending.length} buckets...`);

        try {
            // Batch INSERT — single network call for all pending
            const rows = pending.map(b => ({
                id: b.id, // Include UUID for idempotency
                picker_id: b.picker_id,
                quality_grade: b.quality_grade,
                orchard_id: b.orchard_id,
                recorded_at: b.timestamp,
            }));

            const { error } = await supabase.from('bucket_events').insert(rows);

            if (!error) {
                // Clean success — mark all as synced
                pending.forEach(b => markAsSynced(b.id));
                console.log(`[Bridge] ✅ Batch synced ${pending.length} buckets`);

                // Reset backoff on success
                retryDelay.current = BASE_DELAY;

                // Cleanup old synced records
                offlineService.cleanupSynced().catch(e =>
                    console.error('[Bridge] Cleanup failed:', e)
                );
            } else if (error.code === '23505') {
                // UNIQUE VIOLATION — duplicates from retry
                // This means data already exists in DB → treat as success
                console.log('[Bridge] ⚡ Duplicate detected (23505), treating as success');

                // Try inserting one-by-one to identify which are new vs duplicates
                let syncedCount = 0;
                for (const b of pending) {
                    const { error: singleError } = await supabase
                        .from('bucket_events')
                        .insert({
                            id: b.id,
                            picker_id: b.picker_id,
                            quality_grade: b.quality_grade,
                            orchard_id: b.orchard_id,
                            recorded_at: b.timestamp,
                        });

                    if (!singleError || singleError.code === '23505') {
                        // Either inserted or already exists — mark as synced
                        markAsSynced(b.id);
                        syncedCount++;
                    }
                }
                console.log(`[Bridge] ✅ Resolved ${syncedCount}/${pending.length} buckets (some were duplicates)`);
                retryDelay.current = BASE_DELAY;
            } else {
                console.error('[Bridge] Batch insert error:', error.message);
                // Exponential backoff on other failures
                retryDelay.current = Math.min(retryDelay.current * 2, MAX_DELAY);
                console.log(`[Bridge] ⏳ Retrying in ${retryDelay.current / 1000}s`);
            }
        } catch (e) {
            console.error('[Bridge] Network error:', e);
            // Exponential backoff on network failure
            retryDelay.current = Math.min(retryDelay.current * 2, MAX_DELAY);
            console.log(`[Bridge] ⏳ Retrying in ${retryDelay.current / 1000}s`);
        }

        scheduleNext();
    }, [buckets, markAsSynced]);

    const scheduleNext = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            syncPendingBuckets();
        }, retryDelay.current);
    };

    useEffect(() => {
        // Initial sync attempt
        syncPendingBuckets();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [syncPendingBuckets]);

    return null; // Invisible component — renders nothing
};
