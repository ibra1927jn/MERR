import { supabase } from './supabase';
import { Bin } from '../types';

export const binService = {
    async getBins(orchardId: string): Promise<Bin[]> {
        const { data, error } = await supabase
            .from('bins')
            .select('*')
            .eq('orchard_id', orchardId);

        if (error) throw error;

        return (data || []).map(b => ({
            id: b.id,
            status: b.status,
            fillPercentage: 0, // Calculated in UI or derived
            type: (b as any).variety || 'Standard',
            bin_code: b.bin_code
        }));
    },

    async updateBinStatus(binId: string, status: 'empty' | 'in-progress' | 'full' | 'collected') {
        const { error } = await supabase
            .from('bins')
            .update({
                status,
                filled_at: status === 'full' ? new Date().toISOString() : null
            })
            .eq('id', binId);

        if (error) throw error;
    }
};
