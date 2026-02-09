
// Clean imports
import { supabase } from './supabase';
import { BucketEvent } from '../types';

// Simple cache for validation (could be expanded)
const validPickerCache = new Set<string>();

export const bucketLedgerService = {
    /**
     * The Single Source of Truth for Bucket Recording.
     * Records to 'bucket_records' table.
     */
    async recordBucket(event: BucketEvent) {
        let finalPickerId = event.picker_id;

        // 1. UUID Resolution: If not a UUID, it's likely a badge ID (sticker code)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(finalPickerId)) {
            console.log(`[Ledger] Resolving Badge ID: ${finalPickerId}`);
            const { data: picker, error: lookupError } = await supabase
                .from('pickers')
                .select('id')
                .eq('picker_id', finalPickerId)
                .single();

            if (lookupError || !picker) {
                console.error(`[Ledger] Resolution failed for ${finalPickerId}:`, lookupError);
                throw new Error(`CÓDIGO DESCONOCIDO: No se encontró picker con ID ${finalPickerId}`);
            }
            finalPickerId = picker.id;
        }

        const { data, error } = await supabase
            .from('bucket_records')
            .insert([{
                picker_id: finalPickerId,
                orchard_id: event.orchard_id,
                row_number: event.row_number,
                quality_grade: event.quality_grade,
                bin_id: event.bin_id,
                scanned_at: event.scanned_at || new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('Ledger Error:', error);
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
