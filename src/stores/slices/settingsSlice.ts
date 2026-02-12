/**
 * settingsSlice - Harvest Settings Management
 * 
 * Manages harvest_settings state and Supabase persistence.
 * Most isolated slice — only reads orchard.id and currentUser.id from global state.
 */
import { StateCreator } from 'zustand';
import { supabase } from '@/services/supabase';
import { auditService } from '@/services/audit.service';
import { logger } from '@/utils/logger';
import { HarvestSettings } from '@/types';
import type { HarvestStoreState, SettingsSlice } from '../storeTypes';

// --- Default State ---
export const defaultSettings: HarvestSettings = {
    min_wage_rate: 23.50,
    piece_rate: 6.50,
    min_buckets_per_hour: 3.6,
    target_tons: 100,
};

// --- Slice Creator ---
export const createSettingsSlice: StateCreator<
    HarvestStoreState,
    [],
    [],
    SettingsSlice
> = (set, get) => ({
    settings: defaultSettings,

    updateSettings: async (newSettings) => {
        const orchardId = get().orchard?.id;
        if (!orchardId) return;

        // Store previous state for audit + rollback
        const previousSettings = { ...get().settings };

        // Optimistic Update
        set((state) => ({ settings: { ...state.settings, ...newSettings } }));

        try {
            const { error } = await supabase
                .from('harvest_settings')
                .update(newSettings)
                .eq('orchard_id', orchardId);

            if (error) throw error;

            // 🔍 AUDIT LOG - Legal compliance tracking
            await auditService.logAudit(
                'settings.day_setup_modified',
                'Updated harvest settings',
                {
                    severity: 'info',
                    userId: get().currentUser?.id,
                    orchardId,
                    entityType: 'harvest_settings',
                    entityId: orchardId,
                    details: {
                        previous: previousSettings,
                        updated: newSettings,
                        changes: Object.keys(newSettings)
                    }
                }
            );
            logger.info('✅ [Store] Settings updated in Supabase');
        } catch (e) {
            logger.error('❌ [Store] Failed to update settings:', e);
            // Rollback
            set({ settings: previousSettings });
        }
    },
});
