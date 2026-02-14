import { logger } from '@/utils/logger';
import { supabase } from './supabase';
import { nowNZST, todayNZST } from '@/utils/nzst';

export const userService = {
    // --- USERS & AUTH ---
    async getUserProfile(userId: string) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    },

    async getOrchardUsers(orchardId: string) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('orchard_id', orchardId)
            .order('role');

        if (error) throw error;
        return data || [];
    },

    // --- MANAGE REGISTERED USERS (TEAM LEADERS & RUNNERS) ---
    async getAvailableUsers(role?: string) {
        let query = supabase
            .from('users')
            .select('id, full_name, role, orchard_id')
            .eq('is_active', true);

        if (role) {
            query = query.eq('role', role);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getAvailableTeamLeaders() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'team_leader')
            .order('full_name');

        if (error) throw error;
        return data || [];
    },

    async assignUserToOrchard(userId: string, orchardId: string) {
        if (!userId) throw new Error("User ID is required");
        if (!orchardId) throw new Error("Orchard ID is required (No orchard selected)");

        const { data: user, error: userError } = await supabase
            .from('users')
            .update({
                orchard_id: orchardId,
                is_active: true
            })
            .eq('id', userId)
            .select()
            .single();

        if (userError) throw userError;

        if (user) {
            const { data: existingPicker } = await supabase
                .from('pickers')
                .select('id')
                .eq('id', userId)
                .maybeSingle();

            if (!existingPicker) {
                const { error: pickerError } = await supabase
                    .from('pickers')
                    .insert({
                        id: userId,
                        picker_id: userId.substring(0, 4).toUpperCase(),
                        name: user.full_name,
                        role: user.role,
                        orchard_id: orchardId,
                        team_leader_id: user.role === 'team_leader' ? userId : null,
                        status: 'active',
                        safety_verified: true
                    });
                if (pickerError) logger.error("Failed to sync picker record:", pickerError);
            } else {
                await supabase
                    .from('pickers')
                    .update({
                        orchard_id: orchardId,
                        role: user.role,
                        team_leader_id: user.role === 'team_leader' ? userId : null,
                        status: 'active'
                    })
                    .eq('id', userId);
            }

            const today = todayNZST();
            try {
                const { data: existingAttendance } = await supabase
                    .from('daily_attendance')
                    .select('id')
                    .eq('picker_id', userId)
                    .eq('date', today)
                    .maybeSingle();

                if (!existingAttendance) {
                    await supabase
                        .from('daily_attendance')
                        .insert({
                            picker_id: userId,
                            orchard_id: orchardId,
                            date: today,
                            status: 'present',
                            check_in_time: nowNZST(),
                            verified_by: '00000000-0000-0000-0000-000000000000'
                        });
                }
            } catch (e) {
                logger.warn("Auto-checkin error:", e);
            }
        }
    },

    async unassignUserFromOrchard(userId: string) {
        if (!userId) throw new Error("User ID is required");

        // 1. Clear orchard from User Profile
        const { error: userError } = await supabase
            .from('users')
            .update({ orchard_id: null })
            .eq('id', userId);

        if (userError) throw userError;

        // 2. Mark Picker record as inactive and clear orchard
        const { error: pickerError } = await supabase
            .from('pickers')
            .update({
                orchard_id: null,
                team_leader_id: null,
                status: 'inactive'
            })
            .eq('id', userId);

        if (pickerError) {
            logger.error("Failed to unassign picker record:", pickerError);
        }
    }
};