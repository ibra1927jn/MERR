/**
 * Orchard Map Repository — Domain queries for orchard map data
 * 
 * Extracts Supabase queries from orchardMapSlice:
 *  - Active season lookup
 *  - Block fetching
 *  - Block rows fetching
 */
import { supabase } from '@/services/supabase';

export const orchardMapRepository = {
    /** Get active season for an orchard */
    async getActiveSeason(orchardId: string) {
        const { data, error } = await supabase
            .from('harvest_seasons')
            .select('id, name, start_date, end_date, status')
            .eq('orchard_id', orchardId)
            .eq('status', 'active')
            .is('deleted_at', null)
            .limit(1);
        return { data, error };
    },

    /** Get blocks for an orchard + season */
    async getBlocks(orchardId: string, seasonId: string) {
        const { data, error } = await supabase
            .from('orchard_blocks')
            .select('id, name, total_rows, start_row, color_code, status')
            .eq('orchard_id', orchardId)
            .eq('season_id', seasonId)
            .is('deleted_at', null)
            .order('start_row', { ascending: true });
        return { data, error };
    },

    /** Get rows for given block IDs */
    async getBlockRows(blockIds: string[]) {
        const { data, error } = await supabase
            .from('block_rows')
            .select('id, block_id, row_number, variety')
            .in('block_id', blockIds)
            .is('deleted_at', null)
            .order('row_number', { ascending: true });
        return { data, error };
    },
};
