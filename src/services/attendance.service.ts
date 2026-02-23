import { supabase } from './supabase';
import { logger } from '@/utils/logger'; // 🔧 R9-Fix10: Needed for audit log error reporting
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

        // ── Attempt atomic RPC ──
        const { data: rpcResult, error: rpcErr } = await supabase.rpc('check_in_picker', {
            p_picker_id: pickerId,
            p_orchard_id: orchardId,
            p_verified_by: verifiedBy || null,
        });

        if (!rpcErr && rpcResult) {
            return rpcResult as { picker_id: string; status: string; id: string };
        }

        // Fallback if RPC not deployed (42883)
        if (rpcErr && rpcErr.code !== '42883') throw rpcErr;

        // ── Sequential fallback ──
        const { data: existing } = await supabase
            .from('daily_attendance')
            .select('id')
            .eq('picker_id', pickerId)
            .eq('orchard_id', orchardId)
            .eq('date', today)
            .maybeSingle();

        if (existing) {
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
            await supabase.from('pickers').update({ status: 'active' }).eq('id', pickerId);
        }
        return data;
    },

    async checkOutPicker(attendanceId: string) {
        // ── Attempt atomic RPC ──
        const { data: rpcResult, error: rpcErr } = await supabase.rpc('check_out_picker', {
            p_attendance_id: attendanceId,
        });

        if (!rpcErr && rpcResult) {
            return rpcResult as { id: string; picker_id: string; check_out_time: string; hours_worked: number };
        }

        // Fallback if RPC not deployed (42883)
        if (rpcErr && rpcErr.code !== '42883') throw rpcErr;

        // ── Sequential fallback ──
        const { data: existing } = await supabase
            .from('daily_attendance')
            .select('check_in_time')
            .eq('id', attendanceId)
            .single();

        const checkOutTime = nowNZST();
        let hoursWorked: number | undefined;
        if (existing?.check_in_time) {
            hoursWorked = Math.round(
                ((new Date(checkOutTime).getTime() - new Date(existing.check_in_time).getTime()) / 3600000) * 100
            ) / 100;
        }

        const { data, error } = await supabase
            .from('daily_attendance')
            .update({
                check_out_time: checkOutTime,
                status: 'present',
                ...(hoursWorked !== undefined ? { hours_worked: hoursWorked } : {}),
            })
            .eq('id', attendanceId)
            .select()
            .single();

        if (error) throw error;

        if (data) {
            await supabase.from('pickers').update({ status: 'inactive' }).eq('id', data.picker_id);
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
            check_in_time,
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

            // 🔧 L8: Calculate live hours from check_in_time (was hardcoded to 0)
            const checkInTime = rec.check_in_time as string | null;
            let hoursWorked = 0;
            if (checkInTime) {
                hoursWorked = Math.round(
                    ((Date.now() - new Date(checkInTime).getTime()) / 3600000) * 100
                ) / 100;
                hoursWorked = Math.max(0, hoursWorked);
            }

            return {
                id: p.id,
                picker_id: p.picker_id || p.id,
                name: p.name || 'Unknown',
                avatar: (p.name || '??').substring(0, 2).toUpperCase(),
                hours: hoursWorked,
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
    },

    // ========================================
    // ADMIN: TIMESHEET CORRECTIONS
    // ========================================

    /**
     * Get attendance records for a specific date (any date, not just today).
     * Includes picker name via join.
     */
    async getAttendanceByDate(orchardId: string, date: string) {
        const { data, error } = await supabase
            .from('daily_attendance')
            .select(`
                *,
                picker:pickers ( id, name, picker_id )
            `)
            .eq('orchard_id', orchardId)
            .eq('date', date)
            .order('check_in_time', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Admin correction: update check-in/out times with audit trail.
     * Records who made the correction, when, and why.
     */
    async correctAttendance(
        attendanceId: string,
        updates: {
            check_in_time?: string;
            check_out_time?: string;
        },
        reason: string,
        adminId: string
    ): Promise<void> {
        // ── Attempt atomic RPC ──
        const { error: rpcErr } = await supabase.rpc('correct_attendance', {
            p_attendance_id: attendanceId,
            p_check_in_time: updates.check_in_time || null,
            p_check_out_time: updates.check_out_time || null,
            p_reason: reason,
            p_admin_id: adminId,
        });

        if (!rpcErr) return; // Atomic success — audit log included

        // Fallback if RPC not deployed (42883)
        if (rpcErr.code !== '42883') throw rpcErr;

        // ── Sequential fallback ──
        // Build update object with audit fields
        const updatePayload: Record<string, unknown> = {
            ...updates,
            correction_reason: reason,
            corrected_by: adminId,
            corrected_at: nowNZST(),
        };

        const checkIn = updates.check_in_time;
        const checkOut = updates.check_out_time;
        if (checkIn && checkOut) {
            updatePayload.hours_worked = Math.max(0, Math.round(
                ((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000) * 100
            ) / 100);
        } else if (checkIn || checkOut) {
            const { data: existing } = await supabase
                .from('daily_attendance')
                .select('check_in_time, check_out_time')
                .eq('id', attendanceId)
                .single();
            if (existing) {
                const ci = checkIn || existing.check_in_time;
                const co = checkOut || existing.check_out_time;
                if (ci && co) {
                    updatePayload.hours_worked = Math.max(0, Math.round(
                        ((new Date(co).getTime() - new Date(ci).getTime()) / 3600000) * 100
                    ) / 100);
                }
            }
        }

        const { error } = await supabase
            .from('daily_attendance')
            .update(updatePayload)
            .eq('id', attendanceId);

        if (error) throw error;

        // Audit log (best-effort in fallback mode)
        await supabase.from('audit_logs').insert({
            action: 'timesheet_correction',
            entity_type: 'daily_attendance',
            entity_id: attendanceId,
            performed_by: adminId,
            new_values: updates,
            notes: reason,
        }).then(({ error: auditError }) => {
            if (auditError) logger.error('[Attendance] Audit log insert failed — compliance gap:', auditError);
        });
    },
};