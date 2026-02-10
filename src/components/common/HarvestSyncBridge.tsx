import { useEffect, useRef, useCallback } from 'react';
import { useHarvestStore } from '../../stores/useHarvestStore';
import { supabase } from '../../services/supabase';
import { offlineService } from '../../services/offline.service';

const BASE_DELAY = 5_000;    // 5 seconds
const MAX_DELAY = 300_000;   // 5 minutes cap

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
                picker_id: b.picker_id,
                quality_grade: b.quality_grade,
                orchard_id: b.orchard_id,
                recorded_at: b.timestamp,
            }));

            const { error } = await supabase.from('bucket_events').insert(rows);

            if (!error) {
                // Success — mark all as synced
                pending.forEach(b => markAsSynced(b.id));
                console.log(`[Bridge] ✅ Batch synced ${pending.length} buckets`);

                // Reset backoff on success
                retryDelay.current = BASE_DELAY;

                // Cleanup old synced records
                offlineService.cleanupSynced().catch(e =>
                    console.error('[Bridge] Cleanup failed:', e)
                );
            } else {
                console.error('[Bridge] Batch insert error:', error.message);
                // Exponential backoff on failure
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
