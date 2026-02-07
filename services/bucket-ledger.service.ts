
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
        // 1. Validate Picker ID Format (Basic Check)
        if (!event.picker_id || event.picker_id.length < 5) {
            throw new Error("Invalid Picker ID: Must be a valid UUID");
        }

        const { data, error } = await supabase
            .from('bucket_records')
            .insert([{
                picker_id: event.picker_id, // This must be the UUID of the picker
                orchard_id: event.orchard_id,
                // row_number column does not exist in V1 schema, storing in coords
                coords: {
                    lat: 0,
                    lng: 0,
                    row: event.row_number,
                    quality: event.quality_grade // Storing quality in metadata since column is missing in V1
                },
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
