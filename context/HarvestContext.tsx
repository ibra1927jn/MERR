// =============================================
// HARVEST CONTEXT - REFACTORED
// =============================================
// Focused only on Operational Data (Orchard, Crew, Buckets, Rows)
// Auth moved to AuthContext
// Messaging moved to MessagingContext
// =============================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { scanSticker, ScanResult } from '../services/sticker.service';
import { useAuth } from './AuthContext';
import {
  Role,
  UserRole,
  Picker,
  Orchard,
  Block,
  Team,
  DaySetup,
  BucketRecord,
  RowAssignment,
  BreakLog,
  BucketRunner,
  InventoryState,
  HarvestSettings,
  PickerStatus,
  CollectionStatus,
  RowStatus,
  Alert,
  Bin,
  Broadcast,
  PIECE_RATE,
  MINIMUM_WAGE,
} from '../types';

export { Role };
export type { UserRole, Picker, RowAssignment, DaySetup, PickerStatus, CollectionStatus, RowStatus };
export { supabase };

interface HarvestState {
  orchard: Orchard | null;
  team: Team | null;
  daySetup: DaySetup | null;
  blocks: Block[];
  crew: Picker[];
  pickers: Picker[];
  bucketRecords: BucketRecord[];
  rowAssignments: RowAssignment[];
  breakLogs: BreakLog[];
  runners: BucketRunner[];
  pendingCollections: BucketRecord[];
  broadcasts: Broadcast[];
  alerts: Alert[];
  totalBucketsToday: number;
  teamVelocity: number;
  bins: Bin[];
  inventory: InventoryState;
  settings: HarvestSettings;
  isOnline: boolean;
  lastSyncAt: string | null;
}

interface HarvestContextType extends HarvestState {
  // Pickers
  addTeamMember: (name: string, employeeId: string) => void;
  updatePickerDetails: (id: string, updates: Partial<Picker>) => void;
  addPicker: (picker: Omit<Picker, 'id'>) => Promise<Picker>;
  updatePicker: (id: string, updates: Partial<Picker>) => Promise<void>;
  removePicker: (id: string) => Promise<void>;

  // Buckets
  scanBucket: (pickerId: string, rowNumber?: number, qualityGrade?: string) => Promise<BucketRecord>;
  collectBuckets: (bucketIds: string[], runnerId: string) => Promise<void>;
  deliverBuckets: (bucketIds: string[]) => Promise<void>;

  // Breaks
  logBreak: (pickerId: string, breakType: BreakLog['break_type']) => Promise<void>;
  endBreak: (breakLogId: string) => Promise<void>;

  // Rows
  assignRow: (rowNumber: number, side: 'north' | 'south' | 'both', pickerIds: string[]) => Promise<void>;
  updateRowProgress: (rowAssignmentId: string, percentage: number) => Promise<void>;
  completeRow: (rowAssignmentId: string) => Promise<void>;

  // Alerts & Broadcasts (Operational)
  createAlert: (alert: Omit<Alert, 'id' | 'created_at' | 'is_resolved'>) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  sendBroadcast: (title: string, content: string, priority: 'normal' | 'high' | 'urgent') => Promise<void>;
  acknowledgeBroadcast: (broadcastId: string) => Promise<void>;

  // Day
  startDay: (blockId: string, variety: string, targetSize: string, targetColor: string) => Promise<void>;
  endDay: (signature?: string) => Promise<void>;

  // Runner specific
  addBucket: (binId: string) => void;
  addBucketWithValidation: (binId: string, stickerCode: string) => Promise<ScanResult>;
  updateInventory: (key: keyof InventoryState, delta: number) => void;

  // Utility
  refreshData: () => Promise<void>;
  updateSettings: (newSettings: Partial<HarvestSettings>) => void;

  // View State (UI) - Keeping here for convenience or move to UI Context later
  currentView: string;
  setCurrentView: (view: string) => void;
}

const defaultCrew: Picker[] = [];
const defaultSettings: HarvestSettings = {
  bucketRate: PIECE_RATE,
  targetTons: 40,
  startTime: '07:00',
  teams: ['Alpha', 'Beta'],
};
const defaultInventory: InventoryState = {
  emptyBins: 25,
  binsOfBuckets: 0,
};

const HarvestContext = createContext<HarvestContextType | undefined>(undefined);

export const HarvestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, appUser } = useAuth(); // Depend on AuthContext

  const [state, setState] = useState<HarvestState>({
    orchard: null,
    team: null,
    daySetup: null,
    blocks: [],
    crew: defaultCrew,
    pickers: defaultCrew,
    bucketRecords: [],
    rowAssignments: [],
    breakLogs: [],
    runners: [],
    pendingCollections: [],
    broadcasts: [],
    alerts: [],
    totalBucketsToday: 0,
    teamVelocity: 0,
    bins: [{ id: 'BIN-001', status: 'in-progress', fillPercentage: 0, type: 'Standard', timestamp: new Date().toISOString() }],
    inventory: defaultInventory,
    settings: defaultSettings,
    isOnline: navigator.onLine,
    lastSyncAt: null,
  });

  const [currentView, setCurrentView] = useState('home');

  const updateState = useCallback((updates: Partial<HarvestState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<HarvestSettings>) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...newSettings } }));
  }, []);

  // =============================================
  // CARGA DE DATOS (OPERACIONAL)
  // =============================================
  const loadHarvestData = async () => {
    if (!user || !appUser) return;

    try {
      const orchardId = appUser.orchard_id;
      let orchard = null;
      let blocks: Block[] = [];

      if (orchardId) {
        const { data: orchardData } = await supabase.from('orchards').select('*').eq('id', orchardId).single();
        orchard = orchardData;
        const { data: blocksData } = await supabase.from('blocks').select('*').eq('orchard_id', orchardId);
        blocks = blocksData || [];
      }

      // Pickers
      const { data: dbPickers } = await supabase.from('pickers').select('*').eq('orchard_id', orchardId);
      const mappedCrew: Picker[] = (dbPickers || []).map((p: any) => ({
        id: p.id,
        name: p.full_name || 'Unknown',
        avatar: p.full_name ? p.full_name.substring(0, 2).toUpperCase() : '??',
        role: 'Picker',
        employeeId: p.external_picker_id || '',
        harnessId: p.harness_number,
        onboarded: p.safety_verified || false,
        buckets: p.daily_buckets || 0,
        row: p.current_row,
        status: (p.status as PickerStatus) || 'active',
        qcStatus: [],
      }));

      // Rows
      const { data: rowsData } = await supabase.from('row_assignments').select('*').in('status', ['assigned', 'in_progress']);
      const mappedRows: RowAssignment[] = (rowsData || []).map((r: any) => ({
        id: r.id,
        day_setup_id: r.day_setup_id,
        block_id: r.block_id,
        team_id: r.team_id,
        row_number: r.row_number,
        side: r.side,
        status: r.status as RowStatus,
        assigned_pickers: r.assigned_pickers || [],
        completion_percentage: r.completion_percentage || 0,
        started_at: r.started_at,
        completed_at: r.completed_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      // Broadcasts & Alerts
      const { data: broadcastsData } = await supabase.from('broadcasts').select('*').eq('orchard_id', orchardId).order('created_at', { ascending: false }).limit(20);
      const { data: alertsData } = await supabase.from('alerts').select('*').eq('orchard_id', orchardId).eq('is_resolved', false).order('created_at', { ascending: false });

      // Day Setup
      const today = new Date().toISOString().split('T')[0];
      let daySetupData = null;
      try {
        const { data } = await supabase.from('day_setups').select('*').eq('orchard_id', orchardId).eq('setup_date', today).maybeSingle();
        daySetupData = data;
      } catch (e) { console.log('[HarvestContext] day_setups query skipped'); }

      const totalBuckets = mappedCrew.reduce((sum, p) => sum + p.buckets, 0);

      updateState({
        orchard,
        blocks,
        crew: mappedCrew,
        pickers: mappedCrew,
        rowAssignments: mappedRows,
        broadcasts: broadcastsData || [],
        alerts: alertsData || [],
        daySetup: daySetupData,
        totalBucketsToday: totalBuckets,
        teamVelocity: mappedCrew.length > 0 ? Math.round(totalBuckets / Math.max(1, mappedCrew.length)) : 0,
        lastSyncAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error('[HarvestContext] Error loading harvest data:', error);
    }
  };

  useEffect(() => {
    if (user && appUser) {
      loadHarvestData();
    }
  }, [user, appUser]);

  // =============================================
  // ACCIONES OPERATIVAS
  // =============================================

  const addTeamMember = (name: string, employeeId: string) => {
    addPicker({
      name,
      employeeId,
      role: 'Picker',
      avatar: name.substring(0, 2).toUpperCase(),
      onboarded: false,
      buckets: 0,
      status: 'active',
      qcStatus: [],
    });
  };

  const updatePickerDetails = (id: string, updates: Partial<Picker>) => {
    updatePicker(id, updates);
  };

  const addPicker = async (pickerData: Omit<Picker, 'id'>): Promise<Picker> => {
    try {
      const { data, error } = await supabase
        .from('pickers')
        .insert([{
          full_name: pickerData.name,
          external_picker_id: pickerData.employeeId,
          harness_number: pickerData.harnessId,
          status: 'active',
          safety_verified: pickerData.onboarded,
          daily_buckets: 0,
          orchard_id: state.orchard?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      const newPicker: Picker = {
        id: data.id,
        name: data.full_name,
        avatar: pickerData.avatar || data.full_name?.substring(0, 2).toUpperCase() || '??',
        role: 'Picker',
        employeeId: data.external_picker_id || '',
        harnessId: data.harness_number,
        onboarded: data.safety_verified || false,
        buckets: 0,
        status: 'active',
        qcStatus: [],
      };
      setState(prev => ({ ...prev, crew: [...prev.crew, newPicker], pickers: [...prev.pickers, newPicker] }));
      return newPicker;
    } catch (e) {
      console.error('Error adding picker:', e);
      // Fallback local
      const newPicker: Picker = { id: Math.random().toString(36).substring(2, 11), ...pickerData };
      setState(prev => ({ ...prev, crew: [...prev.crew, newPicker], pickers: [...prev.pickers, newPicker] }));
      return newPicker;
    }
  };

  const updatePicker = async (id: string, updates: Partial<Picker>) => {
    setState(prev => ({
      ...prev,
      crew: prev.crew.map(p => p.id === id ? { ...p, ...updates } : p),
      pickers: prev.pickers.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
    const dbUpdates: any = {};
    if (updates.harnessId !== undefined) dbUpdates.harness_number = updates.harnessId;
    if (updates.row !== undefined) dbUpdates.current_row = updates.row;
    if (updates.buckets !== undefined) dbUpdates.daily_buckets = updates.buckets;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.onboarded !== undefined) dbUpdates.safety_verified = updates.onboarded;
    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('pickers').update(dbUpdates).eq('id', id);
    }
  };

  const removePicker = async (id: string) => {
    try { await supabase.from('pickers').delete().eq('id', id); } catch (e) { console.error(e); }
    setState(prev => ({ ...prev, crew: prev.crew.filter(p => p.id !== id), pickers: prev.pickers.filter(p => p.id !== id) }));
  };

  // Rows
  const assignRow = async (rowNumber: number, side: 'north' | 'south' | 'both', pickerIds: string[]) => {
    try {
      const { data, error } = await supabase.from('row_assignments').insert([{
        row_number: rowNumber,
        side: side,
        assigned_pickers: pickerIds,
        status: 'assigned',
        completion_percentage: 0,
        day_setup_id: state.daySetup?.id,
      }]).select().single();
      const newRow: RowAssignment = {
        id: data?.id || Math.random().toString(36).substring(2, 11),
        day_setup_id: state.daySetup?.id,
        row_number: rowNumber,
        side,
        status: 'assigned',
        assigned_pickers: pickerIds,
        completion_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setState(prev => ({ ...prev, rowAssignments: [...prev.rowAssignments, newRow] }));
    } catch (e) { console.error(e); }
  };

  const updateRowProgress = async (rowAssignmentId: string, percentage: number) => {
    setState(prev => ({
      ...prev,
      rowAssignments: prev.rowAssignments.map(ra =>
        ra.id === rowAssignmentId ? { ...ra, completion_percentage: percentage, status: percentage > 0 ? 'in_progress' : 'assigned' } : ra
      ),
    }));
    await supabase.from('row_assignments').update({ completion_percentage: percentage, status: percentage > 0 ? 'in_progress' : 'assigned' }).eq('id', rowAssignmentId);
  };

  const completeRow = async (rowAssignmentId: string) => {
    setState(prev => ({
      ...prev,
      rowAssignments: prev.rowAssignments.map(ra =>
        ra.id === rowAssignmentId ? { ...ra, completion_percentage: 100, status: 'completed', completed_at: new Date().toISOString() } : ra
      ),
    }));
    await supabase.from('row_assignments').update({ completion_percentage: 100, status: 'completed', completed_at: new Date().toISOString() }).eq('id', rowAssignmentId);
  };

  // Buckets
  const scanBucket = async (pickerId: string, rowNumber?: number, qualityGrade?: string): Promise<BucketRecord> => {
    const record: BucketRecord = {
      id: Math.random().toString(36).substring(2, 11),
      day_setup_id: state.daySetup?.id || '1',
      picker_id: pickerId,
      team_id: state.team?.id,
      row_number: rowNumber,
      bucket_count: 1,
      quality_grade: (qualityGrade as 'A' | 'B' | 'C' | 'reject') || 'A',
      collection_status: 'pending',
      scanned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      bucketRecords: [record, ...prev.bucketRecords],
      totalBucketsToday: prev.totalBucketsToday + 1,
      crew: prev.crew.map(p => p.id === pickerId ? { ...p, buckets: p.buckets + 1 } : p),
      pickers: prev.pickers.map(p => p.id === pickerId ? { ...p, buckets: p.buckets + 1 } : p),
    }));
    return record;
  };

  const collectBuckets = async (bucketIds: string[], runnerId: string) => {
    setState(prev => ({
      ...prev,
      bucketRecords: prev.bucketRecords.map(br =>
        bucketIds.includes(br.id) ? { ...br, collection_status: 'collected', collected_by: runnerId, collected_at: new Date().toISOString() } : br
      ),
    }));
  };

  const deliverBuckets = async (bucketIds: string[]) => {
    setState(prev => ({
      ...prev,
      bucketRecords: prev.bucketRecords.map(br =>
        bucketIds.includes(br.id) ? { ...br, collection_status: 'delivered', delivered_at: new Date().toISOString() } : br
      ),
    }));
  };

  // Breaks
  const logBreak = async (pickerId: string, breakType: BreakLog['break_type']) => {
    const breakLog: BreakLog = {
      id: Math.random().toString(36).substring(2, 11),
      day_setup_id: state.daySetup?.id || '1',
      picker_id: pickerId,
      break_type: breakType,
      started_at: new Date().toISOString(),
      is_overdue: false,
      created_at: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      breakLogs: [breakLog, ...prev.breakLogs],
      crew: prev.crew.map(p => p.id === pickerId ? { ...p, status: 'on_break' } : p),
      pickers: prev.pickers.map(p => p.id === pickerId ? { ...p, status: 'on_break' } : p),
    }));
  };

  const endBreak = async (breakLogId: string) => {
    const breakLog = state.breakLogs.find(b => b.id === breakLogId);
    if (!breakLog) return;
    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - new Date(breakLog.started_at).getTime()) / 60000);
    setState(prev => ({
      ...prev,
      breakLogs: prev.breakLogs.map(b => b.id === breakLogId ? { ...b, ended_at: now.toISOString(), duration_minutes: durationMinutes } : b),
      crew: prev.crew.map(p => p.id === breakLog.picker_id ? { ...p, status: 'active' } : p),
      pickers: prev.pickers.map(p => p.id === breakLog.picker_id ? { ...p, status: 'active' } : p),
    }));
  };

  // Alerts & Broadcasts
  const createAlert = async (alert: Omit<Alert, 'id' | 'created_at' | 'is_resolved'>) => {
    const newAlert: Alert = {
      ...alert,
      id: Math.random().toString(36).substring(2, 11),
      is_resolved: false,
      created_at: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, alerts: [newAlert, ...prev.alerts] }));
  };

  const resolveAlert = async (alertId: string) => {
    setState(prev => ({ ...prev, alerts: prev.alerts.filter(a => a.id !== alertId) }));
  };

  const sendBroadcast = async (title: string, content: string, priority: 'normal' | 'high' | 'urgent') => {
    if (!state.orchard?.id || !appUser?.id) return;
    const newBroadcast: Broadcast = {
      id: Math.random().toString(36).substring(2, 11), // In real app, DB generates ID
      orchard_id: state.orchard.id,
      sender_id: appUser.id,
      title,
      content,
      priority,
      target_roles: ['team_leader', 'picker', 'bucket_runner'],
      acknowledged_by: [],
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('broadcasts').insert([newBroadcast]).select().single();
      if (!error && data) {
         setState(prev => ({ ...prev, broadcasts: [data, ...prev.broadcasts] }));
      } else {
         // Optimistic update if offline or fallback
         setState(prev => ({ ...prev, broadcasts: [newBroadcast, ...prev.broadcasts] }));
      }
    } catch (e) {
      console.error(e);
      setState(prev => ({ ...prev, broadcasts: [newBroadcast, ...prev.broadcasts] }));
    }
  };

  const acknowledgeBroadcast = async (broadcastId: string) => {
    if (!appUser) return;
    setState(prev => ({
      ...prev,
      broadcasts: prev.broadcasts.map(b =>
        b.id === broadcastId && !b.acknowledged_by.includes(appUser.id) ? { ...b, acknowledged_by: [...b.acknowledged_by, appUser.id] } : b
      ),
    }));
  };

  // Day
  const startDay = async (blockId: string, variety: string, targetSize: string, targetColor: string) => {
    const daySetup: DaySetup = {
      id: Math.random().toString(36).substring(2, 11),
      orchard_id: state.orchard?.id || '1',
      setup_date: new Date().toISOString().split('T')[0],
      block_id: blockId,
      variety,
      target_size: targetSize,
      target_color: targetColor,
      bin_type: 'standard',
      min_wage_rate: MINIMUM_WAGE,
      piece_rate: PIECE_RATE,
      min_buckets_per_hour: MINIMUM_WAGE / PIECE_RATE,
      status: 'active',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    updateState({ daySetup });
  };

  const endDay = async (signature?: string) => {
    if (!state.daySetup) return;
    updateState({ daySetup: { ...state.daySetup, status: 'completed', ended_at: new Date().toISOString() } });
  };

  // Runner
  const addBucket = (binId: string) => {
    setState(prev => ({
      ...prev,
      bins: prev.bins.map(b => {
        if (b.id === binId) {
          const newFill = Math.min(100, b.fillPercentage + (100 / 72));
          return { ...b, fillPercentage: newFill, status: newFill >= 100 ? 'full' : 'in-progress' };
        }
        return b;
      }),
      inventory: { ...prev.inventory, binsOfBuckets: prev.bins.some(b => b.id === binId && b.fillPercentage >= 100) ? prev.inventory.binsOfBuckets + 1 : prev.inventory.binsOfBuckets },
      totalBucketsToday: prev.totalBucketsToday + 1,
    }));
  };

  const addBucketWithValidation = async (binId: string, stickerCode: string): Promise<ScanResult> => {
    const teamLeaderId = appUser?.role === 'team_leader' ? appUser.id : undefined;
    const result = await scanSticker(stickerCode, binId, appUser?.id, teamLeaderId, state.orchard?.id);
    if (result.success) addBucket(binId);
    return result;
  };

  const updateInventory = (key: keyof InventoryState, delta: number) => {
    setState(prev => ({ ...prev, inventory: { ...prev.inventory, [key]: Math.max(0, prev.inventory[key] + delta) } }));
  };

  const refreshData = async () => {
    await loadHarvestData();
  };

  useEffect(() => {
    const handleOnline = () => { updateState({ isOnline: true }); refreshData(); };
    const handleOffline = () => { updateState({ isOnline: false }); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <HarvestContext.Provider value={{
      ...state,
      currentView,
      setCurrentView,
      addTeamMember,
      updatePickerDetails,
      addPicker,
      updatePicker,
      removePicker,
      scanBucket,
      collectBuckets,
      deliverBuckets,
      logBreak,
      endBreak,
      assignRow,
      updateRowProgress,
      completeRow,
      createAlert,
      resolveAlert,
      sendBroadcast,
      acknowledgeBroadcast,
      startDay,
      endDay,
      addBucket,
      addBucketWithValidation,
      updateInventory,
      refreshData,
      updateSettings,
    }}>
      {children}
    </HarvestContext.Provider>
  );
};

export const useHarvest = (): HarvestContextType => {
  const context = useContext(HarvestContext);
  if (!context) throw new Error('useHarvest must be used within a HarvestProvider');
  return context;
};

export default HarvestContext;
