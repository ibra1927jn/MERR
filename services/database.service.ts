import { supabase } from './supabase';
import { Picker, HarvestSettings, Role } from '../types';

export const databaseService = {
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

  // --- PICKERS (WORKFORCE) ---
  async getPickersByTeam(teamLeaderId?: string): Promise<Picker[]> {
    // 1. Fetch Pickers (Workforce)
    let query = supabase
      .from('pickers')
      .select('*');
    //.or(`role.eq.${Role.RUNNER},role.eq.picker`); // Removed role check as we are querying pickers table directly

    if (teamLeaderId) {
      query = query.eq('team_leader_id', teamLeaderId);
    }

    // 2. Fetch Performance (Smart Hours View)
    // We try to join or fetch separately. Separate fetch is safer if view is new/optional.
    const { data: perfData } = await supabase
      .from('pickers_performance_today')
      .select('*');

    const { data, error } = await query;
    if (error) throw error;

    // 3. Merge Data
    return (data || []).map((p: any) => {
      const perf = perfData?.find((stat: any) => stat.picker_id === p.id);

      return {
        id: p.id,
        picker_id: p.picker_id, // Ensure we use the correct column
        name: p.full_name,
        avatar: p.full_name ? p.full_name.substring(0, 2).toUpperCase() : '??',
        // Use smart Calculated hours if available, else 0
        hours: perf?.hours_worked || 0,
        // Use smart Total Buckets if available
        total_buckets_today: perf?.total_buckets || 0,
        current_row: p.current_row || 0, // Now sourced from DB, not hardcoded
        status: p.status as 'active' | 'break' | 'issue',
        safety_verified: p.safety_verified,
        qcStatus: [1, 1, 1], // Placeholder for now
        harness_id: p.harness_number || p.harness_id, // Allow both for compat
        team_leader_id: p.team_leader_id,
        orchard_id: p.orchard_id
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

  async getTodayPerformance(orchardId?: string) {
    let query = supabase.from('pickers_performance_today').select('*');
    if (orchardId) query = query.eq('orchard_id', orchardId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async addPicker(picker: Partial<Picker>) {
    const { data, error } = await supabase
      .from('pickers')
      .insert([{
        picker_id: picker.picker_id,
        full_name: picker.name,
        // Default values
        status: 'active',
        safety_verified: picker.safety_verified || false,
        team_leader_id: picker.team_leader_id,
        current_row: 0 // Default for new pickers
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

  // --- SETTINGS ---
  async getHarvestSettings(orchardId: string): Promise<HarvestSettings | null> {
    const { data, error } = await supabase
      .from('harvest_settings')
      .select('*')
      .eq('orchard_id', orchardId)
      .single();

    if (error) return null;

    return {
      min_wage_rate: data.min_wage_rate,
      piece_rate: data.piece_rate,
      min_buckets_per_hour: data.min_buckets_per_hour,
      target_tons: data.target_tons
    };
  },

  // Legacy support for Manager.tsx if needed, but removed addBucketLog per instructions
  async getAllUsers() {
    // Should be replaced by specific query but keeping for Manager.tsx compat
    const { data, error } = await supabase
      .from('users')
      .select('*');
    if (error) throw error;
    return data;
  }
};

export interface RegisteredUser {
  id: string;
  full_name: string;
  role: string;
  email?: string;
}