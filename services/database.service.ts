// =============================================
// DATABASE SERVICE - Funciones auxiliares para Supabase
// =============================================
import { supabase } from './supabase';
import { Picker } from '../types';

// Tipo para usuarios registrados
export interface RegisteredUser {
  id: string;
  email: string;
  full_name: string;
  role: 'manager' | 'team_leader' | 'runner' | 'qa_inspector' | 'admin';
  avatar_url?: string;
}

export const databaseService = {
  // =============================================
  // USERS - Obtener usuarios registrados para mensajería
  // =============================================
  async getAllUsers(orchardId?: string): Promise<RegisteredUser[]> {
    try {
      let query = supabase
        .from('users')
        .select('id, email, full_name, role, avatar_url')
        .eq('is_active', true);

      if (orchardId) {
        query = query.eq('orchard_id', orchardId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }

      return (data || []).map((u: any) => ({
        id: u.id,
        email: u.email || '',
        full_name: u.full_name || 'Unknown User',
        role: u.role || 'runner',
        avatar_url: u.avatar_url,
      }));
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return [];
    }
  },

  async getUserById(userId: string): Promise<RegisteredUser | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, avatar_url')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        email: data.email || '',
        full_name: data.full_name || 'Unknown User',
        role: data.role || 'runner',
        avatar_url: data.avatar_url,
      };
    } catch {
      return null;
    }
  },

  // =============================================
  // PICKERS
  // =============================================
  async getAllPickers(orchardId: string): Promise<Picker[]> {
    let query = supabase
      .from('pickers')
      .select('*');

    if (orchardId) {
      query = query.eq('orchard_id', orchardId);
    }
    // If no orchardId, we fetch all (RLS will filter)

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pickers:', error);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.full_name || 'Unknown',
      role: 'Picker',
      avatar: p.full_name ? p.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : '??',
      row: p.current_row || undefined,
      buckets: p.daily_buckets || 0,
      status: p.status || 'active',
      qcStatus: [],
      onboarded: p.safety_verified || false,
      employeeId: p.employeeId || '',
      harnessId: p.harness_number,
      team_leader_id: p.team_leader_id,
    }));
  },

  async addPicker(picker: {
    fullName: string;
    employeeId: string;
    harnessNumber?: string;
    orchardId: string;
  }) {
    const { data, error } = await supabase
      .from('pickers')
      .insert([{
        full_name: picker.fullName,
        employeeId: picker.employeeId,
        harness_number: picker.harnessNumber,
        orchard_id: picker.orchardId,
        status: 'active',
        safety_verified: false,
        daily_buckets: 0,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePicker(pickerId: string, updates: {
    harnessNumber?: string;
    currentRow?: number;
    dailyBuckets?: number;
    status?: string;
  }) {
    const dbUpdates: any = {};
    if (updates.harnessNumber !== undefined) dbUpdates.harness_number = updates.harnessNumber;
    if (updates.currentRow !== undefined) dbUpdates.current_row = updates.currentRow;
    if (updates.dailyBuckets !== undefined) dbUpdates.daily_buckets = updates.dailyBuckets;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await supabase
      .from('pickers')
      .update(dbUpdates)
      .eq('id', pickerId);

    if (error) throw error;
  },

  async deletePicker(pickerId: string) {
    const { error } = await supabase
      .from('pickers')
      .delete()
      .eq('id', pickerId);

    if (error) throw error;
  },

  // =============================================
  // ROW ASSIGNMENTS
  // =============================================
  async getRowAssignments(daySetupId?: string) {
    let query = supabase
      .from('row_assignments')
      .select('*')
      .in('status', ['assigned', 'in_progress']);

    if (daySetupId) {
      query = query.eq('day_setup_id', daySetupId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching row assignments:', error);
      return [];
    }

    return data || [];
  },

  async assignRow(assignment: {
    rowNumber: number;
    side: 'north' | 'south' | 'both';
    assignedPickers: string[];
    daySetupId?: string;
  }) {
    const { data, error } = await supabase
      .from('row_assignments')
      .insert([{
        row_number: assignment.rowNumber,
        side: assignment.side,
        assigned_pickers: assignment.assignedPickers,
        status: 'assigned',
        completion_percentage: 0,
        day_setup_id: assignment.daySetupId,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateRowProgress(rowId: string, percentage: number) {
    const status = percentage >= 100 ? 'completed' : percentage > 0 ? 'in_progress' : 'assigned';

    const { error } = await supabase
      .from('row_assignments')
      .update({
        completion_percentage: percentage,
        status,
        completed_at: percentage >= 100 ? new Date().toISOString() : null,
      })
      .eq('id', rowId);

    if (error) throw error;
  },

  // =============================================
  // BUCKET LOGS
  // =============================================
  async addBucketLog(data: {
    pickerId: string;
    binId?: string;
    rowNumber?: number;
    qualityGrade?: string;
  }) {
    const { error } = await supabase
      .from('bucket_records')
      .insert([{
        picker_id: data.pickerId,
        bin_id: data.binId,
        row_number: data.rowNumber,
        quality_grade: data.qualityGrade || 'A',
        bucket_count: 1,
        collection_status: 'pending',
        scanned_at: new Date().toISOString(),
      }]);

    if (error) throw error;
  },

  // =============================================
  // BINS
  // =============================================
  async getActiveBin(runnerId: string) {
    const { data } = await supabase
      .from('bins')
      .select('*')
      .eq('runner_id', runnerId)
      .eq('status', 'in-progress')
      .single();

    return data;
  },

  async createBin(runnerId: string, binType: string = 'Standard') {
    const binId = `BIN-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabase
      .from('bins')
      .insert([{
        id: binId,
        runner_id: runnerId,
        status: 'empty',
        fill_percentage: 0,
        bin_type: binType,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // =============================================
  // BROADCASTS
  // =============================================
  async getBroadcasts(orchardId: string) {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('orchard_id', orchardId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching broadcasts:', error);
      return [];
    }

    return data || [];
  },

  async sendBroadcast(broadcast: {
    orchardId: string;
    senderId: string;
    title: string;
    content: string;
    priority?: string;
    targetRoles?: string[];
  }) {
    const { data, error } = await supabase
      .from('broadcasts')
      .insert([{
        orchard_id: broadcast.orchardId,
        sender_id: broadcast.senderId,
        title: broadcast.title,
        content: broadcast.content,
        priority: broadcast.priority || 'normal',
        target_roles: broadcast.targetRoles || ['team_leader', 'picker', 'bucket_runner'],
        acknowledged_by: [],
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // =============================================
  // ALERTS
  // =============================================
  async getAlerts(orchardId: string) {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('orchard_id', orchardId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }

    return data || [];
  },

  async resolveAlert(alertId: string, resolvedBy: string) {
    const { error } = await supabase
      .from('alerts')
      .update({
        is_resolved: true,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw error;
  },

  // =============================================
  // DAY SETUP
  // =============================================
  async getTodaySetup(orchardId: string) {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('day_setups')
      .select('*, block:blocks(*)')
      .eq('orchard_id', orchardId)
      .eq('setup_date', today)
      .single();

    return data;
  },

  async createDaySetup(setup: {
    orchardId: string;
    blockId: string;
    variety: string;
    targetSize: string;
    targetColor: string;
    binType?: string;
    createdBy?: string;
  }) {
    const { data, error } = await supabase
      .from('day_setups')
      .insert([{
        orchard_id: setup.orchardId,
        setup_date: new Date().toISOString().split('T')[0],
        block_id: setup.blockId,
        variety: setup.variety,
        target_size: setup.targetSize,
        target_color: setup.targetColor,
        bin_type: setup.binType || 'standard',
        min_wage_rate: 23.50,
        piece_rate: 6.50,
        min_buckets_per_hour: 3.6,
        status: 'active',
        started_at: new Date().toISOString(),
        created_by: setup.createdBy,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // =============================================
  // USERS
  // =============================================
  async getUser(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return data;
  },

  async updateUser(userId: string, updates: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
  }) {
    const dbUpdates: any = {};
    if (updates.fullName) dbUpdates.full_name = updates.fullName;
    if (updates.phone) dbUpdates.phone = updates.phone;
    if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;

    const { error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', userId);

    if (error) throw error;
  },

  // =============================================
  // ORCHARDS
  // =============================================
  async getOrchards() {
    const { data, error } = await supabase
      .from('orchards')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching orchards:', error);
      return [];
    }

    return data || [];
  },

  async getBlocks(orchardId: string) {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('orchard_id', orchardId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching blocks:', error);
      return [];
    }

    return data || [];
  },
  // =============================================
  // STAFF BY ROLE - Para gestión en Manager
  // =============================================
  async getTeamLeaders(orchardId?: string): Promise<RegisteredUser[]> {
    try {
      let query = supabase
        .from('users')
        .select('id, email, full_name, role, avatar_url')
        .eq('role', 'team_leader')
        .eq('is_active', true);

      if (orchardId) {
        query = query.eq('orchard_id', orchardId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching team leaders:', error);
        return [];
      }

      return (data || []).map((u: any) => ({
        id: u.id,
        email: u.email || '',
        full_name: u.full_name || 'Unknown',
        role: u.role,
        avatar_url: u.avatar_url,
      }));
    } catch (error) {
      console.error('Error in getTeamLeaders:', error);
      return [];
    }
  },

  async getBucketRunners(orchardId?: string): Promise<RegisteredUser[]> {
    try {
      let query = supabase
        .from('users')
        .select('id, email, full_name, role, avatar_url')
        .in('role', ['bucket_runner', 'runner'])
        .eq('is_active', true);

      if (orchardId) {
        query = query.eq('orchard_id', orchardId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching bucket runners:', error);
        return [];
      }

      return (data || []).map((u: any) => ({
        id: u.id,
        email: u.email || '',
        full_name: u.full_name || 'Unknown',
        role: u.role,
        avatar_url: u.avatar_url,
      }));
    } catch (error) {
      console.error('Error in getBucketRunners:', error);
      return [];
    }
  },

  async getTeamPickersCount(teamLeaderId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('pickers')
        .select('*', { count: 'exact', head: true })
        .eq('team_leader_id', teamLeaderId);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  },

  async getTeamStats(teamLeaderId: string): Promise<{
    pickerCount: number;
    totalBuckets: number;
    activeRows: number[];
    aboveMinimum: number;
    belowMinimum: number;
  }> {
    try {
      // Get pickers for this team leader
      const { data: pickers } = await supabase
        .from('pickers')
        .select('id, daily_buckets, current_row, status')
        .eq('team_leader_id', teamLeaderId);

      const pickerList = pickers || [];
      const totalBuckets = pickerList.reduce((sum, p) => sum + (p.daily_buckets || 0), 0);
      const activeRows = [...new Set(pickerList.filter(p => p.current_row).map(p => p.current_row))];

      // Calculate minimum wage compliance (simplified)
      const PIECE_RATE = 6.50;
      const MIN_WAGE = 23.50;
      const HOURS_WORKED = 4; // Assumed average

      let aboveMinimum = 0;
      let belowMinimum = 0;

      pickerList.forEach(p => {
        const hourlyRate = ((p.daily_buckets || 0) * PIECE_RATE) / HOURS_WORKED;
        if (hourlyRate >= MIN_WAGE) {
          aboveMinimum++;
        } else {
          belowMinimum++;
        }
      });

      return {
        pickerCount: pickerList.length,
        totalBuckets,
        activeRows,
        aboveMinimum,
        belowMinimum,
      };
    } catch (error) {
      console.error('Error getting team stats:', error);
      return {
        pickerCount: 0,
        totalBuckets: 0,
        activeRows: [],
        aboveMinimum: 0,
        belowMinimum: 0,
      };
    }
  },
};

export default databaseService;