/**
 * Payroll Repository — Domain queries for payroll service
 * 
 * Extracts Supabase calls from payroll.service.ts:
 *  - Edge Function invocation (calculate-payroll) — via gateway resilience
 *  - Timesheet data fetching (daily_attendance + pickers)
 */
import { supabase } from '@/services/supabase';
import { edgeFunctionsRepository } from '@/repositories/edge-functions.repository';

export const payrollRepository = {
    /** Invoke the calculate-payroll Edge Function with gateway resilience */
    async invokeCalculatePayroll(orchardId: string, startDate: string, endDate: string) {
        const { data, error } = await edgeFunctionsRepository.invoke('calculate-payroll', {
            orchard_id: orchardId,
            start_date: startDate,
            end_date: endDate,
        });
        if (error) throw new Error(error.message);
        return data;
    },

    /** Fetch attendance records for timesheets */
    async fetchTimesheetAttendance(orchardId: string, date: string) {
        const { data, error } = await supabase
            .from('daily_attendance')
            .select('id, picker_id, date, check_in_time, check_out_time, hours_worked, verified_by, orchard_id, updated_at')
            .eq('orchard_id', orchardId)
            .eq('date', date)
            .order('check_in_time', { ascending: true });
        return { data: data || [], error };
    },

    /** Fetch picker names by IDs */
    async fetchPickerNames(pickerIds: string[]): Promise<Record<string, string>> {
        if (pickerIds.length === 0) return {};
        const { data } = await supabase
            .from('pickers')
            .select('id, name')
            .in('id', pickerIds);
        return Object.fromEntries((data || []).map(p => [p.id, p.name]));
    },
};

