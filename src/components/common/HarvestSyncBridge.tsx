import { useEffect } from 'react';
import { useHarvestStore } from '../../stores/useHarvestStore';
import { supabase } from '../../services/supabase';
import { offlineService } from '../../services/offline.service';

export const HarvestSyncBridge = () => {
    // Leemos del store directamente
    const buckets = useHarvestStore((state) => state.buckets);
    const markAsSynced = useHarvestStore((state) => state.markAsSynced);

    useEffect(() => {
        const syncPendingBuckets = async () => {
            // Buscamos cubos que tengan synced: false
            const pending = buckets.filter(b => !b.synced);
            if (pending.length === 0) return;

            console.log(`[Bridge] Sincronizando ${pending.length} cubos...`);

            let syncedCount = 0;

            for (const bucket of pending) {
                try {
                    // Enviamos a Supabase
                    const { error } = await supabase.from('bucket_events').insert({
                        // Send ID to ensure idempotency if schema supports it, otherwise Supabase generates one
                        // id: bucket.id, 
                        picker_id: bucket.picker_id,
                        quality_grade: bucket.quality_grade,
                        orchard_id: bucket.orchard_id,
                        recorded_at: bucket.timestamp // FIXED: Changed from scanned_at to recorded_at
                    });

                    if (!error) {
                        // ¡ÉXITO! Marcamos en el store como "En la nube" (Esto también actualiza Dexie)
                        markAsSynced(bucket.id);
                        syncedCount++;
                        console.log(`[Bridge] Cubo ${bucket.id} sincronizado.`);
                    } else {
                        console.error('[Bridge] Error subiendo bucket:', error);
                    }
                } catch (e) {
                    console.error('[Bridge] Error de red:', e);
                }
            }

            // Cleanup old synced records if we did some work
            if (syncedCount > 0) {
                offlineService.cleanupSynced().catch(e => console.error('[Bridge] Cleanup failed:', e));
            }
        };

        // El puente intenta sincronizar cada 5 segundos si hay cambios
        const interval = setInterval(syncPendingBuckets, 5000);
        return () => clearInterval(interval);
    }, [buckets, markAsSynced]);

    return null; // Es invisible, no renderiza nada en pantalla
};
