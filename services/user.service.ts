import { supabase } from './supabase';

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
        // Basic fetch of all users assigned to this orchard
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
            .eq('is_active', true); // Only active accounts

        if (role) {
            query = query.eq('role', role);
        }

        // We fetch all and let frontend filter if needed, 
        // or we can filter by 'orchard_id is null' if we only want unassigned.
        // User requested "lista de todos los que se han registrado", 
        // implying we might want to see even those assigned elsewhere to steal them?
        // For now, just fetch by role.

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    // Obtener todos los Team Leaders disponibles (Global Roster)
    async getAvailableTeamLeaders() {
        // Nota: Gracias al cambio de RLS, esto ahora devolverá todos los TLs si soy Manager
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'team_leader')
            .order('full_name');

        if (error) throw error;
        return data || [];
    },

    async assignUserToOrchard(userId: string, orchardId: string) {
        // 1. Validación estricta
        if (!userId) throw new Error("User ID is required");
        if (!orchardId) throw new Error("Orchard ID is required (No orchard selected)");

        // 2. Update User Profile (Auth/Login association)
        const { data: user, error: userError } = await supabase
            .from('users')
            .update({
                orchard_id: orchardId,
                is_active: true // Reactivar al usuario si estaba inactivo
            })
            .eq('id', userId)
            .select()
            .single();

        if (userError) throw userError;

        // 2. Sync to Pickers Table (Roster Association)
        // Team Leaders & Runners MUST exist in 'pickers' to be visible in Manager/TeamsView operations.
        if (user) {
            // Check if picker record exists
            const { data: existingPicker } = await supabase
                .from('pickers')
                .select('id')
                .eq('id', userId) // Link by UUID
                .maybeSingle();

            if (!existingPicker) {
                // Create Picker Record linked to User
                const { error: pickerError } = await supabase
                    .from('pickers')
                    .insert({
                        id: userId, // CRITICAL: Use User UUID
                        picker_id: userId.substring(0, 4).toUpperCase(), // Fallback ID if none
                        name: user.full_name,
                        orchard_id: orchardId,
                        team_leader_id: user.role === 'team_leader' ? userId : null,
                        status: 'active',
                        safety_verified: true
                    });

                if (pickerError) console.error("Failed to sync picker record:", pickerError);
            } else {
                // Update existing picker to current orchard AND role
                await supabase
                    .from('pickers')
                    .update({
                        orchard_id: orchardId,
                        team_leader_id: user.role === 'team_leader' ? userId : null,
                        status: 'active'
                    })
                    .eq('id', userId);
            }

            // 4. AUTO-CHECKIN: Create daily_attendance record so user appears in Dashboard immediately
            const today = new Date().toISOString().split('T')[0];
            try {
                // Check if already checked in today
                const { data: existingAttendance } = await supabase
                    .from('daily_attendance')
                    .select('id')
                    .eq('picker_id', userId)
                    .eq('date', today)
                    .maybeSingle();

                if (!existingAttendance) {
                    // Auto-checkin the user
                    const { error: attendanceError } = await supabase
                        .from('daily_attendance')
                        .insert({
                            picker_id: userId,
                            orchard_id: orchardId,
                            date: today,
                            status: 'present',
                            check_in_time: new Date().toISOString(),
                            verified_by: '00000000-0000-0000-0000-000000000000' // Auto-assigned by system
                        });

                    if (attendanceError) {
                        console.warn("Auto-checkin failed:", attendanceError);
                    } else {
                        console.log(`[Auto-Checkin] ${user.full_name} checked in for today`);
                    }
                }
            } catch (e) {
                console.warn("Auto-checkin error:", e);
            }

            // 5. Send Notification/Welcome Message
            try {
                const { error: msgError } = await supabase
                    .from('messages')
                    .insert({
                        sender_id: '00000000-0000-0000-0000-000000000000',
                        receiver_id: userId,
                        content: `You have been assigned to orchard: ${orchardId}. Welcome to the team!`,
                        type: 'system',
                        read: false,
                        created_at: new Date().toISOString()
                    });
                if (msgError) console.warn("Failed to send welcome message:", msgError);
            } catch (e) {
                console.warn("Message sending failed", e);
            }
        }
    }
};
