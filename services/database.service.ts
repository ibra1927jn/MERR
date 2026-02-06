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
  async getPickersByTeam(teamLeaderId: string): Promise<Picker[]> {
    const { data, error } = await supabase
      .from('pickers')
      .select('*')
      .eq('team_leader_id', teamLeaderId);

    if (error) throw error;

    // Map DB fields to Frontend Interface if needed (though we aligned types, safe access is good)
    return (data || []).map((p: any) => ({
      id: p.id,
      picker_id: p.picker_id,
      name: p.full_name,
      avatar: p.full_name.substring(0, 2).toUpperCase(),
      row: p.current_row || 0,
      total_buckets_today: p.total_buckets_today || 0,
      hours: 0, // Placeholder: meaningful hours tracking needs a separate system or shift table
      status: p.status as 'active' | 'break' | 'issue',
      safety_verified: p.safety_verified,
      qcStatus: [1, 1, 1], // Placeholder for now
      harnessId: p.harness_number,
      team_leader_id: p.team_leader_id,
      orchard_id: p.orchard_id
    }));
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
        team_leader_id: picker.team_leader_id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
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