import { useEffect, useRef, useCallback } from 'react';
import { useHarvestStore } from '../../stores/useHarvestStore';
import { supabase } from '../../services/supabase';
import { offlineService } from '../../services/offline.service';

const BASE_DELAY = 5_000;    // 5 seconds
const MAX_DELAY = 300_000;   // 5 minutes cap

/**
 * Invisible sync bridge that batch-uploads pending buckets to Supabase.
 * 
 * FIX C3: Uses getState() to avoid stale closure on buckets array.
 * 
 * IDEMPOTENCY: If `bucket_events.id` has a UNIQUE constraint (migration),
 * duplicate inserts from retry attempts receive a 409/23505 error.
 * We treat these as success â€” the data already exists in the DB.
 */
export const HarvestSyncBridge = () => {
    const retryDelay = useRef(BASE_DELAY);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // FIX C3: Stable callback â€” reads from store directly, no stale closure
    const syncPendingBuckets = useCallback(async () => {
        const { buckets, markAsSynced } = useHarvestStore.getState();
        const pending = buckets.filter(b => !b.synced);

        if (pending.length === 0) {
            retryDelay.current = BASE_DELAY;
            scheduleNext();
            return;
        }

        // eslint-disable-next-line no-console
        console.log(`[Bridge] Batch syncing ${pending.length} buckets...`);

        try {
            const rows = pending.map(b => ({
                id: b.id,
                picker_id: b.picker_id,
                quality_grade: b.quality_grade,
                orchard_id: b.orchard_id,
                recorded_at: b.timestamp,
            }));

            const { error } = await supabase.from('bucket_events').insert(rows);

            if (!error) {
                pending.forEach(b => markAsSynced(b.id));
                // eslint-disable-next-line no-console
                console.log(`[Bridge] âœ… Batch synced ${pending.length} buckets`);
                retryDelay.current = BASE_DELAY;

                offlineService.cleanupSynced().catch(e =>
                    // eslint-disable-next-line no-console
                    console.error('[Bridge] Cleanup failed:', e)
                );
            } else if (error.code === '23505') {
                // eslint-disable-next-line no-console
                console.log('[Bridge] âš¡ Duplicate detected (23505), resolving individually');

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
                        markAsSynced(b.id);
                        syncedCount++;
                    }
                }
                // eslint-disable-next-line no-console
                console.log(`[Bridge] âœ… Resolved ${syncedCount}/${pending.length} buckets`);
                retryDelay.current = BASE_DELAY;
            } else {
                // eslint-disable-next-line no-console
                console.error('[Bridge] Batch insert error:', error.message);
                retryDelay.current = Math.min(retryDelay.current * 2, MAX_DELAY);
                // eslint-disable-next-line no-console
                console.log(`[Bridge] â³ Retrying in ${retryDelay.current / 1000}s`);
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[Bridge] Network error:', e);
            retryDelay.current = Math.min(retryDelay.current * 2, MAX_DELAY);
            // eslint-disable-next-line no-console
            console.log(`[Bridge] â³ Retrying in ${retryDelay.current / 1000}s`);
        }

        scheduleNext();
    }, []); // Empty deps â€” stable forever, reads state via getState()

    const scheduleNext = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            syncPendingBuckets();
        }, retryDelay.current);
    };

    useEffect(() => {
        syncPendingBuckets();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [syncPendingBuckets]);

    return null;
};
