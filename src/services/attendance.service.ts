import { supabase } from './supabase';
import { nowNZST, todayNZST } from '@/utils/nzst';
import type { SupabasePicker, SupabasePerformanceStat } from '../types/database.types';

export const attendanceService = {
    // --- DAILY ATTENDANCE (LIVE OPERATIONS) ---

    // 1. Get Today's Attendance for an Orchard
    async getDailyAttendance(orchardId: string, date?: string) {
        const queryDate = date || todayNZST();

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

    async checkInPicker(pickerId: string, orchardId: string, verifiedBy?: string) {
        const today = todayNZST();

        // 1. Proactive Check: Avoid red 409 Conflict in browser console
        const { data: existing } = await supabase
            .from('daily_attendance')
            .select('id')
            .eq('picker_id', pickerId)
            .eq('date', today)
            .maybeSingle();

        if (existing) {
            // Ensure status is active even if already checked in
            await supabase.from('pickers').update({ status: 'active' }).eq('id', pickerId);
            return { picker_id: pickerId, status: 'present', id: existing.id };
        }

        const { data, error } = await supabase
            .from('daily_attendance')
            .insert({
                picker_id: pickerId,
                orchard_id: orchardId,
                date: today,
                check_in_time: nowNZST(),
                status: 'present',
                verified_by: verifiedBy
            })
            .select()
            .single();

        if (error) throw error;

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
                check_out_time: nowNZST(),
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
                .eq('id', data.picker_id);
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
        const today = todayNZST();

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
        return (attendanceData || []).map((record: unknown) => {
            const rec = record as Record<string, unknown>;
            const p = rec.pickers as SupabasePicker;
            const perf = perfData?.find((stat: SupabasePerformanceStat) => stat.picker_id === p.id);

            return {
                id: p.id,
                picker_id: p.picker_id || p.id,
                name: p.name || 'Unknown',
                avatar: (p.name || '??').substring(0, 2).toUpperCase(),
                hours: 0, // Calculate from times
                total_buckets_today: perf?.total_buckets || 0,
                current_row: p.current_row || 0,
                status: (p.status !== 'archived' && p.status !== 'inactive' ? 'active' : 'inactive') as 'active' | 'break' | 'issue',
                safety_verified: p.safety_verified,
                qcStatus: [1, 1, 1],
                harness_id: p.picker_id || undefined,
                team_leader_id: p.team_leader_id || undefined,
                orchard_id: p.orchard_id,
                role: 'picker'
            };
        });
    }
};