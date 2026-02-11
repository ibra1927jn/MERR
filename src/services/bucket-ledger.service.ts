
// Clean imports
import { supabase } from './supabase';
import { nowNZST } from '@/utils/nzst';
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

        // 1. UUID Resolution: Resolve badge ID to Picker UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(finalPickerId)) {
            // eslint-disable-next-line no-console
            console.log(`[Ledger] Resolving Badge ID: ${finalPickerId}`);

            // Try EXACT match first
            const { data: exactPicker } = await supabase
                .from('pickers')
                .select('id, picker_id')
                .eq('picker_id', finalPickerId)
                .maybeSingle();

            if (exactPicker) {
                finalPickerId = exactPicker.id;
            } else {
                // Try SUBSTRING match (The "Hazlo" logic)
                // We fetch all pickers for the orchard to find the best match
                // eslint-disable-next-line no-console
                console.warn(`[Ledger] Exact match failed for ${finalPickerId}. Trying substring resolution...`);

                const { data: allPickers } = await supabase
                    .from('pickers')
                    .select('id, picker_id')
                    .eq('orchard_id', event.orchard_id);

                // Strategy: Subsequence Match (The "Hazlo" logic)
                // A picker ID matches if all its characters appear in order within the scanned code
                const isSubsequence = (sub: string, full: string) => {
                    if (!sub) return false;
                    let i = 0, j = 0;
                    while (i < sub.length && j < full.length) {
                        if (sub[i] === full[j]) i++;
                        j++;
                    }
                    return i === sub.length;
                };

                const match = (allPickers || []).find(p =>
                    finalPickerId.includes(p.picker_id) ||
                    isSubsequence(p.picker_id, finalPickerId)
                );

                if (match) {
                    // eslint-disable-next-line no-console
                    console.log(`[Ledger] Resolved fuzzy match: ${finalPickerId} -> picker ${match.picker_id} (${match.id})`);
                    finalPickerId = match.id;
                } else {
                    // eslint-disable-next-line no-console
                    console.error(`[Ledger] Resolution failed for ${finalPickerId}. Available IDs:`, allPickers?.map(p => p.picker_id));
                    throw new Error(`CÃ“DIGO DESCONOCIDO: No se encontrÃ³ picker. (Scanned: ${finalPickerId}). Verifique que el trabajador estÃ© registrado.`);
                }
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
            // eslint-disable-next-line no-console
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
