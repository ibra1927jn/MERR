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

    async getAvailableRunners() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'runner')
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
            // Check if picker record already exists
            const { data: existingPicker } = await supabase
                .from('pickers')
                .select('id')
                .eq('id', userId)
                .maybeSingle();

            if (existingPicker) {
                // UPDATE existing — don't touch picker_id to avoid unique constraint
                const { error: pickerError } = await supabase
                    .from('pickers')
                    .update({
                        name: user.full_name,
                        role: user.role,
                        orchard_id: orchardId,
                        team_leader_id: user.role === 'team_leader' ? userId : null,
                        status: 'active',
                    })
                    .eq('id', userId);

                if (pickerError) {
                    logger.error("Failed to update picker record:", pickerError);
                }
            } else {
                // INSERT new — generate unique picker_id from UUID
                const uniquePickerId = userId.replace(/-/g, '').substring(0, 8).toUpperCase();
                const { error: pickerError } = await supabase
                    .from('pickers')
                    .insert({
                        id: userId,
                        picker_id: uniquePickerId,
                        name: user.full_name,
                        role: user.role,
                        orchard_id: orchardId,
                        team_leader_id: user.role === 'team_leader' ? userId : null,
                        status: 'active',
                        safety_verified: true
                    });

                if (pickerError) {
                    // If picker_id collides, try with a longer/random suffix
                    if (pickerError.code === '23505') {
                        const fallbackId = userId.replace(/-/g, '').substring(0, 6).toUpperCase() + Math.random().toString(36).substring(2, 4).toUpperCase();
                        const { error: retryError } = await supabase
                            .from('pickers')
                            .insert({
                                id: userId,
                                picker_id: fallbackId,
                                name: user.full_name,
                                role: user.role,
                                orchard_id: orchardId,
                                team_leader_id: user.role === 'team_leader' ? userId : null,
                                status: 'active',
                                safety_verified: true
                            });
                        if (retryError) logger.error("Failed to insert picker (retry):", retryError);
                    } else {
                        logger.error("Failed to insert picker record:", pickerError);
                    }
                }
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
                            verified_by: userId // 🔧 R9-Fix6: Use actual assigning user, not zeroed UUID
                        });
                }
            } catch (e) {
                logger.warn("Auto-checkin error:", e);
            }
        }
    },

    async unassignUserFromOrchard(userId: string) {
        if (!userId) throw new Error("User ID is required");

        logger.info(`[UserService] Unlinking user ${userId} from orchard...`);

        // 1. Clear orchard from User Profile
        const { error: userError } = await supabase
            .from('users')
            .update({ orchard_id: null })
            .eq('id', userId);

        if (userError) {
            logger.error("[UserService] Failed to update users table:", userError);
            throw userError;
        }
        logger.info(`[UserService] Users table updated for ${userId}`);

        // 2. Try to update picker record
        const { error: pickerError } = await supabase
            .from('pickers')
            .update({
                orchard_id: null,
                team_leader_id: null,
                status: 'inactive'
            })
            .eq('id', userId);

        if (pickerError) {
            logger.error("[UserService] Picker update returned error:", pickerError);
        }

        // 3. Verify the update actually took effect (RLS can silently block updates)
        const { data: verifyPicker } = await supabase
            .from('pickers')
            .select('id, orchard_id, status')
            .eq('id', userId)
            .maybeSingle();

        if (verifyPicker && verifyPicker.orchard_id !== null) {
            logger.info("[UserService] Update was silently blocked by RLS. Falling back to delete...");
            const { error: deleteError } = await supabase
                .from('pickers')
                .delete()
                .eq('id', userId);

            if (deleteError) {
                logger.error("[UserService] Picker delete also failed:", deleteError);
            } else {
                logger.info(`[UserService] Picker record deleted for ${userId}`);
            }
        } else if (verifyPicker) {
            logger.info(`[UserService] Picker record verified inactive for ${userId}`);
        } else {
            logger.info(`[UserService] No picker record found for ${userId} (already removed)`);
        }
    }
};