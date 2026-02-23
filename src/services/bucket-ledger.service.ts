
// Clean imports
import { supabase } from './supabase';
import { nowNZST } from '@/utils/nzst';
import { BucketEvent } from '../types';
import { logger } from '@/utils/logger';
import { QRPayloadSchema, safeParse } from '@/lib/schemas';



export const bucketLedgerService = {
    /**
     * The Single Source of Truth for Bucket Recording.
     * Records to 'bucket_records' table.
     * 
     * Zod validates the input to prevent corrupted QR data from
     * entering the financial ledger (picker pay depends on this).
     */
    async recordBucket(event: BucketEvent) {
        // ── Zod boundary: validate scanner input ──
        const parsed = safeParse(QRPayloadSchema, event);
        if (!parsed.success) {
            logger.error(`[Ledger] Invalid scan data rejected by Zod: ${parsed.error}`);
            throw new Error(`DATOS INVÁLIDOS: ${parsed.error}`);
        }

        let finalPickerId = parsed.data.picker_id;

        // 1. UUID Resolution: Resolve badge ID to Picker UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(finalPickerId)) {

            // Try EXACT match first
            const { data: exactPicker } = await supabase
                .from('pickers')
                .select('id, picker_id')
                .eq('picker_id', finalPickerId)
                .eq('orchard_id', event.orchard_id) // 🔧 U1: Prevent cross-tenant identity leak
                .maybeSingle();

            if (exactPicker) {
                finalPickerId = exactPicker.id;
            } else {
                // 🔴 EXACT MATCH ONLY — fuzzy matching removed (financial safety)
                // A financial ledger must never guess. If the QR is dirty or partial,
                // the Runner must re-scan or enter the ID manually.
                logger.error(`[Ledger] No exact match for picker_id: "${finalPickerId}"`);
                throw new Error(
                    `CÓDIGO DESCONOCIDO: No se encontró picker con ID exacto "${finalPickerId}". ` +
                    `Verifique que el código esté limpio o ingrese el ID manualmente.`
                );
            }
        }

        const { data, error } = await supabase
            .from('bucket_records')
            .insert([{
                picker_id: finalPickerId,
                orchard_id: event.orchard_id,
                row_number: event.row_number,
                quality_grade: event.quality_grade,
                bin_id: event.bin_id,
                scanned_by: event.scanned_by, // Required for RLS
                scanned_at: event.scanned_at || nowNZST()
            }])
            .select()
            .single();

        if (error) {
            logger.error('Ledger Error:', error);
            throw error;
        }

        // Trigger update on picker total (Optional: Triggered by DB usually, but good for UI consistency if offline)
        // For v2.5 we rely on Realtime subscription to update the UI
        return data;
    },

    /**
     * Fetch recent history for a picker
     */
    async getPickerHistory(pickerId: string) {
        const { data, error } = await supabase
            .from('bucket_records')
            .select('*')
            .eq('picker_id', pickerId)
            .order('scanned_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        return data;
    }
};