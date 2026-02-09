import { supabase } from './supabase';

export const attendanceService = {
    // --- DAILY ATTENDANCE (LIVE OPERATIONS) ---

    // 1. Get Today's Attendance for an Orchard
    async getDailyAttendance(orchardId: string, date?: string) {
        const queryDate = date || new Date().toISOString().split('T')[0];

        // Join with pickers to get names
        const { data, error } = await supabase
            .from('daily_attendance')
            .select(`
        *,
        picker:pickers ( name, role, team_leader_id )
      `)
            .eq('orchard_id', orchardId)
            .eq('date', queryDate);

        if (error) throw error;
        return data || [];
    },

    // 2. Check-In a Picker (Create Attendance Record)
    async checkInPicker(pickerId: string, orchardId: string, verifiedBy?: string) {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('daily_attendance')
            .insert({
                picker_id: pickerId,
                orchard_id: orchardId,
                date: today,
                check_in_time: new Date().toISOString(),
                status: 'present',
                verified_by: verifiedBy
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                console.warn("Picker already checked in today. Ensuring status is active...");
                await supabase.from('pickers').update({ status: 'active' }).eq('id', pickerId);
                return { picker_id: pickerId, status: 'present' }; // Return a mock success object
            }
            throw error;
        }

        if (data) {
            // Synchronize Picker Status: Set to 'active' on check-in
            await supabase
                .from('pickers')
                .update({ status: 'active' })
                .eq('id', pickerId);
        }
        return data;
    },

    // 3. Check-Out a Picker
    async checkOutPicker(attendanceId: string) {
        const { data, error } = await supabase
            .from('daily_attendance')
            .update({
                check_out_time: new Date().toISOString(),
                status: 'present' // Confirm present on checkout
            })
            .eq('id', attendanceId)
            .select()
            .single();

        if (error) throw error;

        if (data) {
            // Synchronize Picker Status: Set to 'inactive' on check-out
            await supabase
                .from('pickers')
                .update({ status: 'inactive' })
                .eq('id', (data as any).picker_id);
        }
        return data;
    },

    async getTodayPerformance(orchardId?: string) {
        let query = supabase.from('pickers_performance_today').select('*');
        if (orchardId) query = query.eq('orchard_id', orchardId);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    // 4. Get Active Pickers for Live Ops (Runner View)
    async getActivePickersForLiveOps(orchardId: string) {
        const today = new Date().toISOString().split('T')[0];

        // A. Get Active IDs
        const { data: attendanceData, error } = await supabase
            .from('daily_attendance')
            .select(`
            picker_id,
            status,
            pickers!inner ( * )
        `)
            .eq('orchard_id', orchardId)
            .eq('date', today)
            .eq('status', 'present');

        if (error) throw error;

        // B. Get Performance Data
        const { data: perfData } = await supabase
            .from('pickers_performance_today')
            .select('*')
            .eq('orchard_id', orchardId);

        // C. Merge & Map
        return (attendanceData || []).map((record: any) => {
            const p = record.pickers;
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
                qcStatus: [1, 1, 1],
                harness_id: p.harness_number || p.harness_id,
                team_leader_id: p.team_leader_id,
                orchard_id: p.orchard_id,
                role: p.role // CRITICAL: Fix for TL visibility in Context
            };
        });
    }
};
