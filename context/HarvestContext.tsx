import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { HarvestState, Role, Picker, Bin, HarvestSettings, RowAssignment, AppUser } from '../types';
import { databaseService } from '../services/database.service';
import { bucketLedgerService } from '../services/bucket-ledger.service';
import { simpleMessagingService } from '../services/simple-messaging.service';
import { offlineService } from '../services/offline.service';
import { productionService } from '../services/production.service';
import { telemetryService } from '../services/telemetry.service';
import { useAuth } from './AuthContext';
import { useHarvestStore } from '../store/useHarvestStore';
import { useProductionStore } from '../store/useProductionStore';
import { useTelemetryStore } from '../store/useTelemetryStore';

export { Role, type HarvestState } from '../types';

// Initial Empty State
const INITIAL_STATE: HarvestState = {
  currentUser: { name: '', role: null },
  crew: [],
  bins: [],
  notifications: [],
  stats: {
    totalBuckets: 0,
    payEstimate: 0,
    tons: 0,
    velocity: 0,
    goalVelocity: 400,
    binsFull: 0
  },
  settings: {
    min_wage_rate: 23.50,
    piece_rate: 6.50,
    min_buckets_per_hour: 3.6,
    target_tons: 40.0
  },
  bucketRecords: [],
  selectedBinId: undefined
};

interface HarvestContextType extends HarvestState {
  login: (role: Role) => void;
  logout: () => void;
  addPicker: (picker: Partial<Picker>) => Promise<void>;
  scanBucket: (pickerId: string, grade?: 'A' | 'B' | 'C' | 'reject', binId?: string) => Promise<{ success: boolean; offline: boolean }>;
  getWageShieldStatus: (picker: Picker) => 'safe' | 'warning' | 'critical';
  // Legacy fields for compat with Manager.tsx until full refactor
  signOut?: () => Promise<void>;
  teamVelocity?: number;
  totalBucketsToday?: number;
  updateSettings?: (settings: HarvestSettings) => void;
  inventory?: Bin[]; // Alias for bins
  alert?: (msg: string) => void;
  resolveAlert?: (id: string) => void;
  updatePicker?: (id: string, updates: Partial<Picker>) => Promise<void>;
  appUser?: AppUser;
  orchard?: { id: string; name?: string; total_rows?: number };
  teamLeaders?: any[];
  allRunners?: any[];
  rowAssignments?: RowAssignment[];
  assignRow?: (rowNumber: number, side: 'north' | 'south', pickerIds: string[]) => Promise<void>;
  updateRowProgress?: (rowId: string, percentage: number) => Promise<void>;
  completeRow?: (rowId: string) => Promise<void>;
  removePicker: (id: string) => Promise<void>;
  unassignUser: (id: string) => Promise<void>;
  activeCrew: Picker[];
  presentCount: number;
  setSelectedBinId: (id: string | undefined) => void;
}

const HarvestContext = createContext<HarvestContextType | undefined>(undefined);

export const HarvestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { appUser, orchardId, isAuthenticated, signOut: authSignOut } = useAuth();
  const { setCrew, setBins, setSettings, addBucketRecord, setSelectedBinId: setStoreBinId } = useHarvestStore();

  const [state, setState] = useState<HarvestState>({
    ...INITIAL_STATE,
    currentUser: { name: '', role: null }
  });

  // 1. Sync Auth User to Local State
  useEffect(() => {
    if (appUser) {
      setState(prev => ({
        ...prev,
        currentUser: { name: appUser.full_name, role: appUser.role, id: appUser.id }
      }));
    } else {
      setState(prev => ({ ...prev, currentUser: { name: '', role: null } }));
    }
  }, [appUser]);

  // 2. Data Loading Functions (Memoized or top-level)
  const loadCrew = useCallback(async () => {
    if (!orchardId) return;
    try {
      const pickers = await databaseService.getPickersByTeam(undefined, orchardId);
      if (pickers) {
        setState(prev => ({ ...prev, crew: pickers }));
        offlineService.cacheRoster(pickers, orchardId);
      }
    } catch (e) {
      console.error("Failed to load crew:", e);
    }
  }, [orchardId]);

  const loadBins = useCallback(async () => {
    if (!orchardId) return;
    try {
      const bins = await databaseService.getBins(orchardId);
      if (bins) setState(prev => ({ ...prev, bins }));
    } catch (e) {
      console.error("Failed to load bins:", e);
    }
  }, [orchardId]);

  const loadSettings = useCallback(async () => {
    const cached = await offlineService.getCachedSettings();
    if (cached) setState(prev => ({ ...prev, settings: cached }));

    if (orchardId) {
      setState(prev => ({
        ...prev,
        orchard: { ...prev.orchard, id: orchardId, name: prev.orchard?.name || 'Loading...' }
      }));
      try {
        const settings = await databaseService.getHarvestSettings(orchardId);
        if (settings) {
          setState(prev => ({ ...prev, settings }));
          offlineService.cacheSettings(settings);
        }
      } catch (e) {
        console.warn('Failed to fetch settings, using cache if available');
      }
    }
  }, [orchardId]);

  // 3. Initial Load & Basic Effects
  useEffect(() => {
    if (orchardId) {
      loadSettings();
      loadCrew();
      loadBins();
      productionService.clearHistory();
    }
  }, [orchardId, loadSettings, loadCrew, loadBins]);

  // 4. Bridge to Zustand
  useEffect(() => { setCrew(state.crew); }, [state.crew, setCrew]);
  useEffect(() => { setBins(state.bins); }, [state.bins, setBins]);
  useEffect(() => { if (state.settings) setSettings(state.settings); }, [state.settings, setSettings]);
  useEffect(() => { setStoreBinId(state.selectedBinId); }, [state.selectedBinId, setStoreBinId]);

  // 5. Real-time Subscriptions
  useEffect(() => {
    if (!orchardId) return;

    const bucketChannel = supabase.channel('public:bucket_records')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bucket_records' }, async (payload) => {
        const newRecord = payload.new as any;
        if (newRecord) {
          addBucketRecord(newRecord);
          setState(prev => ({
            ...prev,
            bucketRecords: [newRecord, ...prev.bucketRecords].slice(0, 200),
            stats: { ...prev.stats, totalBuckets: prev.stats.totalBuckets + 1 },
            crew: prev.crew.map(p => (p.id === newRecord.picker_id || p.picker_id === newRecord.picker_id)
              ? { ...p, total_buckets_today: (p.total_buckets_today || 0) + 1 } : p
            )
          }));
        }
      }).subscribe();

    const pickerChannel = supabase.channel('public:pickers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pickers' }, async (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        setState(prev => {
          let newCrew = [...prev.crew];
          if (eventType === 'INSERT') {
            if (!newCrew.find(p => p.id === newRecord.id)) {
              newCrew.push({
                id: newRecord.id, picker_id: newRecord.picker_id,
                name: newRecord.name || newRecord.full_name || 'Unknown',
                avatar: (newRecord.name || newRecord.full_name || '??').substring(0, 2).toUpperCase(),
                current_row: newRecord.current_row || 0, total_buckets_today: 0,
                hours: 0, status: newRecord.status || 'active', safety_verified: newRecord.safety_verified,
                qcStatus: [1, 1, 1], harness_id: newRecord.harness_id, team_leader_id: newRecord.team_leader_id
              });
            }
          } else if (eventType === 'UPDATE') {
            newCrew = newCrew.map(p => p.id === newRecord.id ? { ...p, ...newRecord } : p);
          } else if (eventType === 'DELETE') {
            newCrew = newCrew.filter(p => p.id !== oldRecord.id);
          }
          return { ...prev, crew: newCrew };
        });
      }).subscribe();

    const settingsChannel = supabase.channel('public:harvest_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'harvest_settings' }, (payload) => {
        if (payload.new) {
          const newSettings = {
            min_wage_rate: payload.new.min_wage_rate, piece_rate: payload.new.piece_rate,
            min_buckets_per_hour: payload.new.min_buckets_per_hour, target_tons: payload.new.target_tons
          };
          setState(prev => ({ ...prev, settings: newSettings }));
          offlineService.cacheSettings(newSettings);
        }
      }).subscribe();

    const attendanceChannel = supabase.channel('public:daily_attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_attendance' }, () => {
        loadCrew();
      }).subscribe();

    return () => {
      supabase.removeChannel(bucketChannel);
      supabase.removeChannel(pickerChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(attendanceChannel);
    };
  }, [orchardId, loadCrew, addBucketRecord]);

  const login = (role: Role) => console.warn("Legacy login called.");
  const logout = () => { authSignOut(); };
  const signOut = async () => { logout(); };

  const addPicker = useCallback(async (pickerData: Partial<Picker>) => {
    try {
      // 0. Validation: Duplicate Check
      const exists = state.crew.some(p =>
        p.picker_id === pickerData.picker_id ||
        (p.name === pickerData.name && p.picker_id === pickerData.picker_id)
      );

      if (exists) {
        throw new Error(`Picker with ID ${pickerData.picker_id} already exists.`);
      }

      const newPicker = await databaseService.addPicker(pickerData);

      if (newPicker) {
        setState(prev => ({
          ...prev,
          crew: [...prev.crew, {
            id: newPicker.id,
            picker_id: newPicker.picker_id,
            name: newPicker.name || newPicker.full_name || 'Unknown',
            avatar: (newPicker.name || newPicker.full_name || '??').substring(0, 2).toUpperCase(),
            current_row: newPicker.current_row || 0,
            total_buckets_today: 0,
            hours: 0,
            status: 'active',
            safety_verified: newPicker.safety_verified,
            qcStatus: [1, 1, 1],
            team_leader_id: newPicker.team_leader_id,
            orchard_id: newPicker.orchard_id || undefined,
            harness_id: newPicker.harness_id
          }]
        }));
      }
    } catch (e: any) {
      console.error("Failed to add picker", e);
      throw e;
    }
  }, [state.crew]);

  const scanBucket = useCallback(async (scannedCode: string, grade: 'A' | 'B' | 'C' | 'reject' = 'A', binId?: string) => {
    const activeBinId = binId || state.selectedBinId;
    const currentOrchardId = state.orchard?.id || orchardId || 'offline_pending';

    try {
      const result = await productionService.scanSticker(
        scannedCode,
        currentOrchardId,
        grade,
        activeBinId,
        appUser?.id
      );

      if (!result.success) {
        throw new Error(result.error || "Scan failed");
      }

      const picker = state.crew.find(p => p.picker_id === scannedCode || p.id === scannedCode);
      if (picker) {
        setState(prev => ({
          ...prev,
          crew: prev.crew.map(p =>
            p.id === picker.id ? { ...p, total_buckets_today: (p.total_buckets_today || 0) + 1 } : p
          ),
          stats: {
            ...prev.stats,
            totalBuckets: prev.stats.totalBuckets + 1,
            velocity: prev.stats.velocity + 1
          }
        }));
      }

      return { success: true, offline: true };

    } catch (e: any) {
      telemetryService.error('HarvestContext', 'Scan Fatal Error', e);
      console.error("[HarvestContext] Scan failed:", e);
      throw e;
    }
  }, [state.selectedBinId, state.orchard?.id, orchardId, state.crew, appUser?.id]);

  // Derived Row Assignments (Stateless Source of Truth)
  const rowAssignments = useMemo(() => {
    const assignments: Record<number, RowAssignment> = {};

    state.crew.forEach(picker => {
      const r = picker.current_row;
      if (r && r > 0) {
        if (!assignments[r]) {
          assignments[r] = {
            id: `row-${r}`,
            row_number: r,
            side: 'north',
            assigned_pickers: [],
            completion_percentage: 0
          };
        }
        assignments[r].assigned_pickers.push(picker.id);
      }
    });

    return Object.values(assignments).sort((a, b) => a.row_number - b.row_number);
  }, [state.crew]);

  const assignRow = useCallback(async (rowNumber: number, side: 'north' | 'south', pickerIds: string[]) => {
    try {
      await databaseService.assignRowToPickers(pickerIds, rowNumber);

      const { error: allocError } = await supabase
        .from('row_assignments')
        .upsert({
          row_number: rowNumber,
          orchard_id: orchardId,
          status: 'active',
          assigned_at: new Date().toISOString()
        }, { onConflict: 'row_number, orchard_id' });

      if (allocError) console.warn("Row Assignment Table update failed:", allocError);

      setState(prev => ({
        ...prev,
        crew: prev.crew.map(p =>
          pickerIds.includes(p.id) || pickerIds.includes(p.picker_id)
            ? { ...p, current_row: rowNumber }
            : p
        )
      }));
    } catch (e) {
      console.error("Assign Row Failed:", e);
    }
  }, [orchardId]);

  const getWageShieldStatus = useCallback((picker: Picker): 'safe' | 'warning' | 'critical' => {
    const threshold = state.settings?.min_buckets_per_hour || 3.6;
    const rate = picker.hours > 0 ? picker.total_buckets_today / picker.hours : 0;

    if (rate >= threshold) return 'safe';
    if (rate >= threshold * 0.8) return 'warning';
    return 'critical';
  }, [state.settings?.min_buckets_per_hour]);

  const updateSettings = useCallback((newSettings: HarvestSettings) => {
    setState(prev => ({ ...prev, settings: newSettings }));
  }, []);

  // --- DERIVED LIVE OPS DATA ---
  const activeCrew = useMemo(() => {
    return state.crew.filter(p =>
      p.status === 'active' ||
      p.status === 'break' ||
      p.status === 'on_break' ||
      p.status === 'issue'
    );
  }, [state.crew]);

  const presentCount = activeCrew.length;

  const value = useMemo(() => ({
    ...state,
    appUser,
    activeCrew,
    presentCount,
    login: (role: Role) => setState(prev => ({ ...prev, currentUser: { ...prev.currentUser, role } })),
    logout,
    addPicker,
    scanBucket,
    getWageShieldStatus,
    signOut,
    teamVelocity: state.stats.velocity,
    totalBucketsToday: state.stats.totalBuckets,
    updateSettings,
    assignRow,
    inventory: state.bins,
    alert: (msg: string) => console.log(msg),
    resolveAlert: () => { },
    selectedBinId: state.selectedBinId,
    setSelectedBinId: (id: string) => setState(prev => ({ ...prev, selectedBinId: id })),
    rowAssignments,
    updateRowProgress: async () => { },
    completeRow: async () => { },
    updatePicker: async (id: string, updates: Partial<Picker>) => {
      try {
        await databaseService.updatePicker(id, updates);
        setState(prev => ({
          ...prev,
          crew: prev.crew.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
      } catch (e) {
        console.error("Failed to update picker:", e);
        throw e;
      }
    },
    removePicker: async (id: string) => {
      try {
        await databaseService.deletePicker(id);
        setState(prev => ({
          ...prev,
          crew: prev.crew.filter(p => p.id !== id && p.picker_id !== id)
        }));
      } catch (error) {
        try {
          await databaseService.updatePickerStatus(id, 'inactive');
          await databaseService.updatePicker(id, { orchard_id: null as any });
          setState(prev => ({
            ...prev,
            crew: prev.crew.filter(p => p.id !== id && p.picker_id !== id)
          }));
        } catch (softError) {
          console.error('[Safe Delete] Soft delete failed:', softError);
        }
      }
    },
    unassignUser: async (id: string) => {
      try {
        await databaseService.unassignUserFromOrchard(id);
        setState(prev => ({
          ...prev,
          crew: prev.crew.filter(p => p.id !== id && p.picker_id !== id)
        }));
      } catch (error) {
        console.error('[Manager Ops] Unassign failed:', error);
      }
    }
  }), [
    state, appUser, activeCrew, presentCount, logout, addPicker, scanBucket,
    getWageShieldStatus, signOut, updateSettings, assignRow, rowAssignments
  ]);

  return (
    <HarvestContext.Provider value={value}>
      {children}
    </HarvestContext.Provider>
  );
};

export const useHarvest = () => {
  const context = useContext(HarvestContext);
  if (!context) throw new Error('useHarvest must be used within a HarvestProvider');
  return context;
};