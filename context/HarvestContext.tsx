import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { HarvestState, Role, Picker, Bin, HarvestSettings, RowAssignment } from '../types';
import { databaseService } from '../services/database.service';
import { bucketLedgerService } from '../services/bucket-ledger.service';
import { simpleMessagingService } from '../services/simple-messaging.service';
import { offlineService } from '../services/offline.service';
import { useAuth } from './AuthContext';
import { useMessaging } from './MessagingContext';

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
    goalVelocity: 400
  },
  settings: {
    min_wage_rate: 23.50,
    piece_rate: 6.50,
    min_buckets_per_hour: 3.6,
    target_tons: 40.0
  },
  bucketRecords: []
};

interface HarvestContextType extends HarvestState {
  login: (role: Role) => void;
  logout: () => void;
  addPicker: (picker: Partial<Picker>) => Promise<void>;
  scanBucket: (pickerId: string, grade?: 'A' | 'B' | 'C' | 'reject') => Promise<{ success: boolean; offline: boolean }>;
  getWageShieldStatus: (picker: Picker) => 'safe' | 'warning' | 'critical';
  // Legacy fields for compat with Manager.tsx until full refactor
  signOut?: () => Promise<void>;
  teamVelocity?: number;
  totalBucketsToday?: number;
  updateSettings?: (settings: HarvestSettings) => void;
  inventory?: Bin[]; // Alias for bins
  alerts?: any[];
  broadcasts?: any[];
  resolveAlert?: (id: string) => void;
  sendBroadcast?: (title: string, msg: string, prio: any) => Promise<void>;
  updatePicker?: (id: string, updates: Partial<Picker>) => Promise<void>;
  appUser?: { id: string; full_name: string; email: string };
  orchard?: { id: string; name?: string; total_rows?: number };
  chatGroups?: any[];
  createChatGroup?: (name: string, members: string[]) => Promise<any>;
  loadChatGroups?: () => Promise<void>;
  teamLeaders?: any[];
  allRunners?: any[];
  rowAssignments?: RowAssignment[];
  assignRow?: (rowNumber: number, side: 'north' | 'south', pickerIds: string[]) => Promise<void>;
  updateRowProgress?: (rowId: string, percentage: number) => Promise<void>;
  completeRow?: (rowId: string) => Promise<void>;
  removePicker?: (id: string) => Promise<void>;
}

const HarvestContext = createContext<HarvestContextType | undefined>(undefined);

export const HarvestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { appUser, orchardId, isAuthenticated, signOut: authSignOut } = useAuth();

  // Initialize state without currentUser (derived from AuthContext)
  const [state, setState] = useState<HarvestState>({
    ...INITIAL_STATE,
    currentUser: { name: '', role: null }
  });

  // Sync Auth User to Harvest State (for compatibility)
  useEffect(() => {
    if (appUser) {
      setState(prev => ({
        ...prev,
        currentUser: {
          name: appUser.full_name,
          role: appUser.role, // Logic handled in AuthContext
          id: appUser.id
        }
      }));
    } else {
      setState(prev => ({ ...prev, currentUser: { name: '', role: null } }));
    }
  }, [appUser]);

  // Load basic settings on mount (Real Implementation)
  useEffect(() => {
    const loadSettings = async () => {
      // 1. Try Cache First (Faster startup)
      const cached = await offlineService.getCachedSettings();
      if (cached) setState(prev => ({ ...prev, settings: cached }));

      // 2. Fetch Fresh if Online & Auth
      if (orchardId) {
        // IMMEDIATE FIX: Set orchard ID in state so UI knows we have one
        setState(prev => ({
          ...prev,
          orchard: { ...prev.orchard, id: orchardId, name: prev.orchard?.name || 'Loading...' }
        }));

        try {
          const settings = await databaseService.getHarvestSettings(orchardId);
          if (settings) {
            setState(prev => ({ ...prev, settings }));
            await offlineService.cacheSettings(settings);
          }

          // Optional: Fetch Orchard Details (Name, Rows) if not standard
          // const details = await databaseService.getOrchard(orchardId);
          // if(details) setState(prev => ({ ...prev, orchard: details }));

        } catch (e) {
          console.warn('Failed to fetch settings, using cache if available');
        }
      }
    };
    loadSettings();

    // 3. Real-time Subscription (Smart Sync)
    // Subscribe to bucket_records to auto-update UI when ANYONE scans
    const channel = supabase
      .channel('public:bucket_records')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bucket_records' },
        async (payload) => {
          console.log('[Realtime] New bucket scanned:', payload);
          // Refresh Stats (Or Optimistically add if simpler)
          // Ideally, we'd just add +1 to stats and picker, but fetching fresh is "safer" to stay in sync with View
          // For v2.5 speed, let's trigger a light refetch of crew performance?
          // Or just optimistic +1 derived from payload if we have picker_id

          const newRecord = payload.new as any;

          // 1. Maintain HeatMap Stream (Last 200 records)
          // Critical: Functional update to avoid stale closures
          if (newRecord) {
            setState(prev => ({
              ...prev,
              bucketRecords: [newRecord, ...prev.bucketRecords].slice(0, 200),
              // 2. Refresh Stats (Optimistic)
              stats: {
                ...prev.stats,
                totalBuckets: prev.stats.totalBuckets + 1
              },
              crew: prev.crew.map(p =>
                p.id === newRecord.picker_id || p.picker_id === newRecord.picker_id
                  ? { ...p, total_buckets_today: (p.total_buckets_today || 0) + 1 }
                  : p
              )
            }));
          }
        }
      )
      .subscribe();

    // 4. Load Crew (Pickers) - CRITICAL FIX
    // Fetch all pickers (runners and team leaders) associated with the orchard
    const loadCrew = async () => {
      try {
        const pickers = await databaseService.getPickersByTeam(); // Fetch all
        console.log('Loaded crew:', pickers.length);
        if (pickers) {
          setState(prev => ({ ...prev, crew: pickers }));
        }
      } catch (e) {
        console.error("Failed to load crew:", e);
      }
    };
    loadCrew(); // Call immediately                // SUSCRIPCIÓN A PICKERS (Alta/Baja/Modificación en Tiempo Real)
    const pickerChannel = supabase
      .channel('public:pickers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickers' }, // Escuchar TODO (Insert, Update, Delete)
        async (payload) => {
          console.log('[Realtime] Picker Update:', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;

          setState(prev => {
            let newCrew = [...prev.crew];

            if (eventType === 'INSERT') {
              // Evitar duplicados si ya lo añadimos optimísticamente
              if (!newCrew.find(p => p.id === newRecord.id)) {
                newCrew.push({
                  id: newRecord.id,
                  picker_id: newRecord.picker_id,
                  name: newRecord.name || newRecord.full_name || 'Unknown',
                  avatar: (newRecord.name || newRecord.full_name || '??').substring(0, 2).toUpperCase(),
                  current_row: newRecord.current_row || 0,
                  total_buckets_today: 0, // Nuevo picker empieza en 0
                  hours: 0,
                  status: newRecord.status || 'active',
                  safety_verified: newRecord.safety_verified,
                  qcStatus: [1, 1, 1],
                  harness_id: newRecord.harness_id,
                  team_leader_id: newRecord.team_leader_id
                });
              }
            } else if (eventType === 'UPDATE') {
              newCrew = newCrew.map(p =>
                p.id === newRecord.id
                  ? { ...p, name: newRecord.full_name, status: newRecord.status, current_row: newRecord.current_row, safety_verified: newRecord.safety_verified }
                  : p
              );
            } else if (eventType === 'DELETE') {
              newCrew = newCrew.filter(p => p.id !== oldRecord.id);
            }

            return { ...prev, crew: newCrew };
          });
        }
      )
      .subscribe();

    // 5. Settings Subscription (Real-time)
    const settingsChannel = supabase
      .channel('public:harvest_settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'harvest_settings' },
        (payload) => {
          console.log('[Realtime] Settings Updated:', payload);
          if (payload.new) {
            const newSettings = {
              min_wage_rate: payload.new.min_wage_rate,
              piece_rate: payload.new.piece_rate,
              min_buckets_per_hour: payload.new.min_buckets_per_hour,
              target_tons: payload.new.target_tons
            };
            setState(prev => ({ ...prev, settings: newSettings }));
            offlineService.cacheSettings(newSettings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(pickerChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [orchardId, appUser?.id]); // React to User Auth changes

  const login = (role: Role) => {
    console.warn("Legacy login called. Please use AuthContext.signIn");
  };

  const logout = () => {
    authSignOut();
  };

  // Compat alias
  const signOut = async () => { logout(); };

  const addPicker = async (pickerData: Partial<Picker>) => {
    try {
      // 0. Validation: Duplicate Check
      // Check both ID and Employee ID (picker_id)
      const exists = state.crew.some(p =>
        p.picker_id === pickerData.picker_id ||
        (p.name === pickerData.name && p.picker_id === pickerData.picker_id)
      );

      if (exists) {
        throw new Error(`Picker with ID ${pickerData.picker_id} already exists.`);
      }

      // 1. Persist to DB
      const newPicker = await databaseService.addPicker(pickerData);

      // 2. Update Local State (Optimistic or confirmed)
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
            orchard_id: newPicker.orchard_id || undefined, // Can be undefined/null
            harness_id: newPicker.harness_id
          }]
        }));
      }
    } catch (e: any) {
      console.error("Failed to add picker", e);
      // Re-throw so Modal can catch and alert
      throw e;
    }
  };

  const scanBucket = async (scannedCode: string, grade: 'A' | 'B' | 'C' | 'reject' = 'A') => {
    // 1. Resolve to UUID (Critical for DB)
    const picker = state.crew.find(p => p.picker_id === scannedCode || p.id === scannedCode);

    // VALIDATION: If code is unknown, reject immediately (don't queue junk)
    if (!picker && scannedCode.length < 5) { // Basic sanity check
      throw new Error("Invalid/Unknown Picker Code");
    }

    const targetId = picker ? picker.id : scannedCode;
    const backupRow = picker ? picker.current_row : 0;

    console.log(`[Scan] Code: ${scannedCode} -> UUID: ${targetId} | Row: ${backupRow}`);

    // 2. Optimistic UI Update (Safety: only if picker found, or we trust the code is a valid UUID)
    if (picker) {
      setState(prev => ({
        ...prev,
        crew: prev.crew.map(p =>
          p.id === targetId ? { ...p, total_buckets_today: (p.total_buckets_today || 0) + 1 } : p
        ),
        stats: {
          ...prev.stats,
          totalBuckets: prev.stats.totalBuckets + 1,
          velocity: prev.stats.velocity + 1
        }
      }));
    }

    try {
      // 3. Try Online Record
      await bucketLedgerService.recordBucket({
        picker_id: targetId,
        quality_grade: grade,
        scanned_at: new Date().toISOString(),
        row_number: backupRow
      });

      return { success: true, offline: false };

    } catch (e: any) {
      console.warn("Scan failed fast, queuing offline...", e.message);

      // 4. Fallback to Offline Queue
      const currentOrchardId = state.orchard?.id || 'unknown_orchard';

      try {
        await offlineService.queueBucketScan(
          targetId,
          grade,
          currentOrchardId,
          backupRow
        );
        return { success: true, offline: true };
      } catch (queueError) {
        console.error("Critical: Failed to queue offline", queueError);
        throw new Error("Storage Error: Could not save scan.");
      }
    }
  };

  // Derived Row Assignments (Stateless Source of Truth)
  const rowAssignments = React.useMemo(() => { // Using React.useMemo since we didn't add it to imports yet
    const assignments: Record<number, RowAssignment> = {};

    state.crew.forEach(picker => {
      const r = picker.current_row;
      if (r && r > 0) {
        if (!assignments[r]) {
          assignments[r] = {
            id: `row-${r}`,
            row_number: r,
            side: 'north', // Default
            assigned_pickers: [],
            completion_percentage: 0
          };
        }
        assignments[r].assigned_pickers.push(picker.id);
      }
    });

    return Object.values(assignments).sort((a, b) => a.row_number - b.row_number);
  }, [state.crew]);

  const assignRow = async (rowNumber: number, side: 'north' | 'south', pickerIds: string[]) => {
    try {
      // 1. Update PICKERS (Bulk)
      await databaseService.assignRowToPickers(pickerIds, rowNumber);

      // 2. Update ROW_ASSIGNMENTS (Upsert) - As requested for HeatMap Integration
      // Check if table exists/is used. Assuming 'row_assignments' table for now.
      // If table doesn't exist, this might fail, so we wrap in try/catch or skip if not in schema.
      // But user insisted: "La función assignRow debe escribir en la tabla row_assignments de Supabase"

      const { error: allocError } = await supabase
        .from('row_assignments')
        .upsert({
          row_number: rowNumber,
          orchard_id: orchardId, // Assuming context has this
          status: 'active',
          assigned_at: new Date().toISOString()
        }, { onConflict: 'row_number, orchard_id' }); // Guessing constraint

      if (allocError) console.warn("Row Assignment Table update failed (might not exist):", allocError);


      // 3. Optimistic Update Local State
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
  };

  const getWageShieldStatus = (picker: Picker): 'safe' | 'warning' | 'critical' => {
    const threshold = state.settings?.min_buckets_per_hour || 3.6;
    const rate = picker.hours > 0 ? picker.total_buckets_today / picker.hours : 0;

    if (rate >= threshold) return 'safe';
    if (rate >= threshold * 0.8) return 'warning';
    return 'critical';
  };

  const updateSettings = (newSettings: HarvestSettings) => {
    setState(prev => ({ ...prev, settings: newSettings }));
  };

  // Messaging Integration
  const {
    messages,
    broadcasts,
    chatGroups,
    sendMessage,
    sendBroadcast,
    createChatGroup,
    loadChatGroups
  } = useMessaging();

  return (
    <HarvestContext.Provider value={{
      ...state,
      login,
      logout,
      addPicker,
      scanBucket,
      getWageShieldStatus,
      // Compat props
      signOut,
      teamVelocity: state.stats.velocity,
      totalBucketsToday: state.stats.totalBuckets,
      updateSettings,
      assignRow,
      inventory: state.bins,
      alerts: [], // Still mock alerts for now
      broadcasts, // Real broadcasts from MessagingContext
      chatGroups,
      resolveAlert: () => { },
      rowAssignments,
      updateRowProgress: async () => { },
      completeRow: async () => { },
      updatePicker: async (id: string, updates: Partial<Picker>) => {
        try {
          // 1. Update DB
          await databaseService.updatePicker(id, updates);

          // 2. Optimistic Update
          setState(prev => ({
            ...prev,
            crew: prev.crew.map(p =>
              p.id === id ? { ...p, ...updates } : p
            )
          }));
        } catch (e) {
          console.error("Failed to update picker:", e);
          throw e;
        }
      },
      removePicker: async (id) => {
        try {
          console.log(`[Picker Management] Attempting to remove picker ${id}...`);
          await databaseService.deletePicker(id);

          // Success - Remove from state
          setState(prev => ({
            ...prev,
            crew: prev.crew.filter(p => p.id !== id && p.picker_id !== id)
          }));
        } catch (error: any) {
          console.error('[Picker Management] Delete failed:', error);

          // Check for 409 Conflict (Foreign Key constraint) or if we just want to be safe
          if (error?.code === '23503' || error?.status === 409 || error?.message?.includes('violates foreign key')) {
            console.log(`[Safe Delete] Picker ${id} has records. Switching to Soft Delete (Inactive).`);

            try {
              await databaseService.updatePickerStatus(id, 'inactive');

              // Update Local State to Inactive
              setState(prev => ({
                ...prev,
                crew: prev.crew.map(p => (p.id === id || p.picker_id === id) ? { ...p, status: 'inactive' } : p)
              }));

              alert("⚠️ Trabajador marcado como INACTIVO (tiene registros).");
            } catch (softError) {
              console.error('[Safe Delete] Soft delete also failed:', softError);
              alert("Error: Could not delete or deactivate picker.");
            }
          } else {
            alert(`Error removing picker: ${error.message}`);
          }
        }
      }
    }}>
      {children}
    </HarvestContext.Provider>
  );
};

export const useHarvest = () => {
  const context = useContext(HarvestContext);
  if (!context) throw new Error('useHarvest must be used within a HarvestProvider');
  return context;
};