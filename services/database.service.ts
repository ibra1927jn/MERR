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
    // 1. Fetch Pickers (Workforce) - GLOBAL ROSTER (All pickers for this TL)
    let query = supabase
      .from('pickers')
      .select('*');

    if (teamLeaderId) {
      query = query.eq('team_leader_id', teamLeaderId);
    }
    // Note: We intentionally DO NOT filter by 'status' or 'orchard_id' here.
    // This allows the Team View to show "History" and "Roster" even if not active today.

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
        picker_id: p.picker_id,
        name: p.name || p.full_name || 'Unknown',
        avatar: (p.name || p.full_name || '??').substring(0, 2).toUpperCase(),
        hours: perf?.hours_worked || 0,
        total_buckets_today: perf?.total_buckets || 0,
        current_row: p.current_row || 0,
        status: p.status as 'active' | 'break' | 'issue',
        safety_verified: p.safety_verified,
        qcStatus: [1, 1, 1], // Placeholder for now
        harness_id: p.harness_number || p.harness_id, // Allow both for compat
        team_leader_id: p.team_leader_id,
        orchard_id: p.orchard_id // Can be null now
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
    // Roster Mode: orchard_id is OPTIONAL.
    const { data, error } = await supabase
      .from('pickers')
      .insert([{
        picker_id: picker.picker_id,
        name: picker.name,
        // Default values
        status: 'active',
        safety_verified: picker.safety_verified || false,
        team_leader_id: picker.team_leader_id,
        current_row: 0, // Default for new pickers
        orchard_id: picker.orchard_id || null // Explicitly allow null
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

  async updatePicker(pickerId: string, updates: Partial<Picker>) {
    // Validation: Harness Uniqueness
    if (updates.harness_id) {
      // Check if any *other* active picker has this harness
      const { data: duplicate } = await supabase
        .from('pickers')
        .select('id, name')
        .eq('harness_id', updates.harness_id)
        .eq('status', 'active')
        .neq('id', pickerId) // Exclude self
        .single();

      if (duplicate) {
        throw new Error(`Harness ${updates.harness_id} is already assigned to ${duplicate.name}`);
      }
    }

    // Map frontend fields to DB columns if necessary
    const dbUpdates: any = { ...updates };

    // Handle potential mapping for harness_id if legacy column exists
    // But for now, we pass standard fields. 
    // Types cleanup: remove fields that might not distinct in DB or are readonly
    delete dbUpdates.id;
    delete dbUpdates.qcStatus;

    // Explicitly map if needed, otherwise trust Partial<Picker> matches table columns
    // We know 'status' and 'current_row' work. 'harness_id' should act same.

    const { error } = await supabase
      .from('pickers')
      .update(dbUpdates)
      .match({ id: pickerId });

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
    // 1. Update User Profile (Auth/Login association)
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
            role: user.role,
            orchard_id: orchardId,
            team_leader_id: user.role === 'team_leader' ? userId : null, // TL is their own leader? Or null? Usually null or self.
            status: 'active',
            safety_verified: true
          });

        if (pickerError) console.error("Failed to sync picker record:", pickerError);
      } else {
        // Update existing picker to current orchard
        await supabase
          .from('pickers')
          .update({
            orchard_id: orchardId,
            status: 'active'
          })
          .eq('id', userId);
      }
    }
  }
};

export interface RegisteredUser {
  id: string;
  full_name: string;
  role: string;
  orchard_id?: string;
  email?: string; // Optional for list displays
}