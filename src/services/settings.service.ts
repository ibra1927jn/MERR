import { logger } from '@/utils/logger';
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
            target_tons: data.target_tons,
            variety: data.variety,
        };
    },

    async updateHarvestSettings(
        orchardId: string,
        updates: Partial<HarvestSettings>
    ): Promise<boolean> {
        const { error } = await supabase
            .from('harvest_settings')
            .upsert(
                {
                    orchard_id: orchardId,
                    ...updates,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'orchard_id' }
            );

        if (error) {
            logger.error('[SettingsService] Failed to update settings:', error.message);
            return false;
        }
        return true;
    },
};
