import { supabase } from './supabase';
import { Picker } from '../types';

export const pickerService = {
    // --- PICKERS (WORKFORCE) ---
    async getPickersByTeam(teamLeaderId?: string, orchardId?: string): Promise<Picker[]> {
        // Smart Query Logic:
        // - If teamLeaderId provided => ALL pickers assigned to that TL (any orchard)
        // - If only orchardId provided => ALL pickers in that orchard
        // - If both provided => EITHER assigned to TL OR in the orchard (union behavior)

        let query = supabase
            .from('pickers')
            .select('*');

        // CRITICAL FIX: Use OR logic when both filters are provided
        if (teamLeaderId && orchardId) {
            // Show pickers that belong to this TL OR are in this orchard
            query = query.or(`team_leader_id.eq.${teamLeaderId},orchard_id.eq.${orchardId}`);
        } else if (teamLeaderId) {
            // TL view: show only their assigned pickers
            query = query.eq('team_leader_id', teamLeaderId);
        } else if (orchardId) {
            // Manager view: show all pickers in orchard
            query = query.eq('orchard_id', orchardId);
        }
        // If neither provided, returns all pickers (admin view)

        // 2. Fetch Performance (Smart Hours View)
        const { data: perfData } = await supabase
            .from('pickers_performance_today')
            .select('*');

        const { data, error } = await query;
        if (error) throw error;

        console.log('[getPickersByTeam] Query result:', data?.length || 0, 'pickers found');

        // 3. Merge Data
        return (data || []).map((p: any) => {
            const perf = perfData?.find((stat: any) => stat.picker_id === p.id);

            return {
                id: p.id,
                picker_id: p.picker_id,
                name: p.name || p.full_name || 'Unknown',
                avatar: (p.name || p.full_name || '??').substring(0, 2).toUpperCase(),
                hours: perf?.hours_worked || 0,
                total_buckets_today: perf?.total_buckets || 0,
                current_row: p.current_row || 0,
                status: p.status as 'active' | 'break' | 'issue',
                safety_verified: p.safety_verified,
                qcStatus: [1, 1, 1], // Placeholder for now
                harness_id: p.harness_number || p.harness_id, // Allow both for compat
                team_leader_id: p.team_leader_id,
                orchard_id: p.orchard_id,
                role: p.role // Include role for filtering TL/Runners
            };
        });
    },

    async assignRowToPickers(pickerIds: string[], row: number) {
        if (!pickerIds.length) return;
        const { error } = await supabase
            .from('pickers')
            .update({ current_row: row })
            .in('id', pickerIds); // Bulk update by UUIDs

        if (error) throw error;
    },

    async addPicker(picker: Partial<Picker>) {
        // Roster Mode: orchard_id is OPTIONAL.
        const { data, error } = await supabase
            .from('pickers')
            .insert([{
                picker_id: picker.picker_id,
                name: picker.name,
                // Default values
                status: 'active',
                safety_verified: picker.safety_verified || false,
                team_leader_id: picker.team_leader_id,
                current_row: 0, // Default for new pickers
                orchard_id: picker.orchard_id || null // Explicitly allow null
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePickerStatus(pickerId: string, status: 'active' | 'break' | 'inactive') {
        const { error } = await supabase
            .from('pickers')
            .update({ status: status })
            .match({ id: pickerId });

        if (error) throw error;
    },

    async deletePicker(pickerId: string) {
        const { error } = await supabase
            .from('pickers')
            .delete()
            .match({ id: pickerId });

        if (error) throw error;
    },

    async updatePickerRow(pickerId: string, row: number) {
        const { error } = await supabase
            .from('pickers')
            .update({ current_row: row })
            .match({ id: pickerId }); // Match by UUID

        if (error) throw error;
    },

    async updatePicker(pickerId: string, updates: Partial<Picker>) {
        // Validation: Harness Uniqueness
        if (updates.harness_id) {
            // Check if any *other* active picker has this harness
            const { data: duplicate } = await supabase
                .from('pickers')
                .select('id, name')
                .eq('harness_id', updates.harness_id)
                .eq('status', 'active')
                .neq('id', pickerId) // Exclude self
                .single();

            if (duplicate) {
                throw new Error(`Harness ${updates.harness_id} is already assigned to ${duplicate.name}`);
            }
        }

        // Map frontend fields to DB columns if necessary
        const dbUpdates: any = { ...updates };

        // Handle potential mapping for harness_id if legacy column exists
        // But for now, we pass standard fields. 
        // Types cleanup: remove fields that might not distinct in DB or are readonly
        delete dbUpdates.id;
        delete dbUpdates.qcStatus;

        // Explicitly map if needed, otherwise trust Partial<Picker> matches table columns
        // We know 'status' and 'current_row' work. 'harness_id' should act same.

        const { error } = await supabase
            .from('pickers')
            .update(dbUpdates)
            .match({ id: pickerId });

        if (error) throw error;
    },
};
