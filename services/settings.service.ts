import { supabase } from './supabase';
import { HarvestSettings } from '../types';

export const settingsService = {
    // --- SETTINGS ---
    async getHarvestSettings(orchardId: string): Promise<HarvestSettings | null> {
        const { data, error } = await supabase
            .from('harvest_settings')
            .select('*')
            .eq('orchard_id', orchardId)
            .single();

        if (error) return null;

        return {
            min_wage_rate: data.min_wage_rate,
            piece_rate: data.piece_rate,
            min_buckets_per_hour: data.min_buckets_per_hour,
            target_tons: data.target_tons
        };
    },
};
