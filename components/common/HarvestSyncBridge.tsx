import { useEffect } from 'react';
import { useHarvestStore } from '../../stores/useHarvestStore';
import { supabase } from '../../services/supabase';

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

            for (const bucket of pending) {
                try {
                    // Enviamos a Supabase
                    const { error } = await supabase.from('bucket_ledger').insert({
                        picker_id: bucket.picker_id,
                        quality_grade: bucket.quality_grade,
                        orchard_id: bucket.orchard_id,
                        scanned_at: bucket.timestamp
                    });

                    if (!error) {
                        // ¡ÉXITO! Marcamos en el store como "En la nube"
                        markAsSynced(bucket.id);
                        console.log(`[Bridge] Cubo ${bucket.id} sincronizado.`);
                    } else {
                        console.error('[Bridge] Error subiendo bucket:', error);
                    }
                } catch (e) {
                    console.error('[Bridge] Error de red:', e);
                }
            }
        };

        // El puente intenta sincronizar cada 5 segundos si hay cambios
        const interval = setInterval(syncPendingBuckets, 5000);
        return () => clearInterval(interval);
    }, [buckets, markAsSynced]);

    return null; // Es invisible, no renderiza nada en pantalla
};
