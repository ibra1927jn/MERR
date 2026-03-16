/**
 * Picker History Repository — Domain queries for picker history data
 * 
 * Extracts all Supabase queries from picker-history.service.ts
 */
import { supabase } from '@/services/supabase';

export const pickerHistoryRepository = {
    /** Get picker profile by ID */
    async getPickerById(pickerId: string) {
        const { data, error } = await supabase
            .from('pickers')
            .select('*')
            .eq('id', pickerId)
            .single();
        if (error) return null;
        return data;
    },

    /** Get user's full_name by ID */
    async getUserName(userId: string): Promise<string | null> {
        const { data } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', userId)
            .single();
        return data?.full_name || null;
    },

    /** Get attendance records for a picker since a given date */
    async getAttendanceSince(pickerId: string, sinceDate: string) {
        const { data } = await supabase
            .from('daily_attendance')
            .select('*')
            .eq('picker_id', pickerId)
            .gte('date', sinceDate)
            .order('date', { ascending: false });
        return data || [];
    },

    /** Get bucket records for a picker since a given ISO timestamp */
    async getBucketRecordsSince(pickerId: string, sinceIso: string) {
        const { data } = await supabase
            .from('bucket_records')
            .select('*')
            .eq('picker_id', pickerId)
            .gte('scanned_at', sinceIso)
            .order('scanned_at', { ascending: false });
        return data || [];
    },

    /** Get quality inspections for a picker since a given ISO timestamp */
    async getInspectionsSince(pickerId: string, sinceIso: string) {
        const { data } = await supabase
            .from('quality_inspections')
            .select('*')
            .eq('picker_id', pickerId)
            .gte('created_at', sinceIso);
        return data || [];
    },

    /** Get day setups for an orchard since a given date */
    async getDaySetupsSince(orchardId: string, sinceDate: string) {
        const { data } = await supabase
            .from('day_setups')
            .select('date, variety, piece_rate, min_wage_rate')
            .eq('orchard_id', orchardId)
            .gte('date', sinceDate)
            .order('date', { ascending: false });
        return data || [];
    },
};
