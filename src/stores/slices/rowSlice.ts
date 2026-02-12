/**
 * rowSlice - Row Assignment Management
 * 
 * Manages row assignments with Supabase persistence and optimistic updates.
 * Reads orchard.id from global state via get().
 */
import { StateCreator } from 'zustand';
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';
import { RowAssignment } from '@/types';
import type { HarvestStoreState, RowSlice } from '../storeTypes';

// --- Slice Creator ---
export const createRowSlice: StateCreator<
    HarvestStoreState,
    [],
    [],
    RowSlice
> = (set, get) => ({
    rowAssignments: [],

    assignRow: async (rowNumber, side, pickerIds) => {
        const orchardId = get().orchard?.id;
        if (!orchardId) return;

        const newRow: RowAssignment = {
            id: crypto.randomUUID(),
            row_number: rowNumber,
            side,
            assigned_pickers: pickerIds,
            completion_percentage: 0,
        };

        // Optimistic update
        set(state => ({ rowAssignments: [...state.rowAssignments, newRow] }));

        try {
            const { error } = await supabase.from('row_assignments').insert({
                id: newRow.id,
                orchard_id: orchardId,
                row_number: rowNumber,
                side,
                assigned_pickers: pickerIds,
                completion_percentage: 0,
                status: 'active',
            });

            if (error) throw error;
            logger.info(`📍 [Store] Row ${rowNumber} assigned to Supabase`);
        } catch (e) {
            logger.error('❌ [Store] Failed to assign row:', e);
            // Rollback optimistic update
            set(state => ({
                rowAssignments: state.rowAssignments.filter(r => r.id !== newRow.id),
            }));
        }
    },

    updateRowProgress: async (rowId, percentage) => {
        // Optimistic update
        set(state => ({
            rowAssignments: state.rowAssignments.map(r =>
                r.id === rowId ? { ...r, completion_percentage: percentage } : r
            ),
        }));

        try {
            const { error } = await supabase
                .from('row_assignments')
                .update({ completion_percentage: percentage })
                .eq('id', rowId);

            if (error) throw error;
        } catch (e) {
            logger.error('❌ [Store] Failed to update row progress:', e);
        }
    },

    completeRow: async (rowId) => {
        set(state => ({
            rowAssignments: state.rowAssignments.map(r =>
                r.id === rowId ? { ...r, completion_percentage: 100 } : r
            ),
        }));

        try {
            const { error } = await supabase
                .from('row_assignments')
                .update({ completion_percentage: 100, status: 'completed' })
                .eq('id', rowId);

            if (error) throw error;
        } catch (e) {
            logger.error('❌ [Store] Failed to complete row:', e);
        }
    },
});
