
import { WB } from './supabase'; // Wait, supabase import might differ in the repo. 
// In (1) it is 'import { supabase } from './supabase';' in other files.
// Let me double check usage in verified file.
import { supabase } from './supabase';
import { BucketEvent } from '../types';

export const bucketLedgerService = {
    /**
     * The Single Source of Truth for Bucket Recording.
     * Records to 'bucket_records' table.
     */
    async recordBucket(event: BucketEvent) {
        const { data, error } = await supabase
            .from('bucket_records')
            .insert([{
                picker_id: event.picker_id, // This must be the UUID of the picker
                orchard_id: event.orchard_id,
                device_id: event.device_id,
                row_number: event.row_number,
                quality_grade: event.quality_grade,
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
