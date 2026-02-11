/**
 * useHarvestStore - High-Performance Harvest Operations Store
 * 
 * **Architecture**: Zustand with localStorage persistence
 * **Why Zustand?**: 
 * - High-frequency updates (bucket scans every few seconds)
 * - Performance-critical (real-time production dashboard)
 * - Built-in persistence for offline support
 * - Minimal re-renders (only components using specific state slices)
 * 
 * **State Size**: ~735 lines, 30+ actions
 * **Update Frequency**: High (real-time scans)
 * **Persistence**: localStorage with quota failsafe + Dexie backup
 * 
 * **See**: `docs/architecture/state-management.md` for decision rationale
 * 
 * @module stores/useHarvestStore
 * @see {@link file:///c:/Users/ibrab/Downloads/app/harvestpro-nz%20%281%29/docs/architecture/state-management.md}
 * 
 * @example
 * ```tsx
 * // Subscribe to specific state slices (performance optimization)
 * const buckets = useHarvestStore(state => state.buckets);
 * const addBucket = useHarvestStore(state => state.addBucket);
 * 
 * // Add bucket (instant UI update, background sync)
 * addBucket({
 *   picker_id: 'uuid',
 *   quality_grade: 'A',
 *   timestamp: new Date().toISOString(),
 *   orchard_id: 'orchard-uuid'
 * });
 * ```
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/services/supabase';
import { offlineService } from '@/services/offline.service';
import { complianceService, ComplianceViolation } from '@/services/compliance.service';
// calculationsService removed — payroll logic inlined below
import { auditService } from '@/services/audit.service';
import {
    Picker,
    Bin,
    HarvestSettings,
    BucketRecord,
    Notification,
    RowAssignment
} from '@/types';

// Safe localStorage wrapper — handles QuotaExceededError
const safeStorage = {
    getItem: (name: string) => localStorage.getItem(name),
    setItem: (name: string, value: string) => {
        try {
            localStorage.setItem(name, value);
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                console.warn('?? [Store] localStorage full — evicting synced buckets');
                try {
                    const current = localStorage.getItem(name);
                    if (current) {
                        const parsed = JSON.parse(current);
                        if (parsed?.state?.buckets) {
                            parsed.state.buckets = parsed.state.buckets.filter(
                                (b: { synced?: boolean }) => !b.synced
                            );
                            localStorage.setItem(name, JSON.stringify(parsed));
                            return;
                        }
                    }
                    localStorage.setItem(name, value);
                } catch {
                    console.error('? [Store] localStorage permanently full — data safe in Dexie only');
                }
            }
        }
    },
    removeItem: (name: string) => localStorage.removeItem(name),
};

// --- TIPOS (La estructura de nuestros datos) ---
export interface ScannedBucket {
    id: string;           // UUID único generado al instante
    picker_id: string;    // ID del recolector
    quality_grade: 'A' | 'B' | 'C' | 'reject';
    timestamp: string;    // ISO string
    synced: boolean;      // ¿Ya se envió a Supabase?
    orchard_id: string;   // Huerto donde se escaneó
}

// Stats interface matching usage in Manager.tsx
interface HarvestStats {
    totalBuckets: number;
    payEstimate: number;
    tons: number;
    velocity: number;
    goalVelocity: number;
    binsFull: number;
}

interface HarvestStoreState {
    // 1. ESTADO LOCAL (Offline Critical)
    buckets: ScannedBucket[];
    isScanning: boolean;
    lastScanTime: number | null;

    // 2. ESTADO GLOBAL (Cached from Cloud)
    currentUser: { name: string; role: string | null; id?: string } | null;
    crew: Picker[];
    inventory: Bin[]; // Renamed from bins to match Manager usage

    // Intelligence & Compliance
    alerts: ComplianceViolation[];
    payroll: {
        totalPiece: number;
        totalMinimum: number;
        finalTotal: number;
    };

    notifications: Notification[];
    stats: HarvestStats;
    settings: HarvestSettings;
    orchard: { id: string; name?: string; total_rows?: number } | null;
    bucketRecords: BucketRecord[]; // Historical/Cloud records
    rowAssignments: RowAssignment[]; // Row assignment tracking

    // ?? FASE 9: Timestamp validation for anti-fraud
    serverTimestamp: number | null; // Last known server time
    clockSkew: number; // Difference between device and server (ms)

    // Derived/Aux
    presentCount: number;
    simulationMode: boolean; // Track if drill simulator is active
    dayClosed: boolean; // True when day has been closed (prevents reload)

    // 3. ACCIONES (Lógica)
    addBucket: (bucket: Omit<ScannedBucket, 'id' | 'synced'>) => void;
    recalculateIntelligence: () => void;
    markAsSynced: (id: string) => void;
    clearSynced: () => void;
    reset: () => void;

    // Global Data Actions
    setGlobalState: (data: Partial<HarvestStoreState>) => void;
    fetchGlobalData: () => Promise<void>;
    setSimulationMode: (enabled: boolean) => void;
    setDayClosed: (closed: boolean) => void;

    // Legacy Helpers for Manager.tsx
    updateSettings: (newSettings: Partial<HarvestSettings>) => Promise<void>;
    addPicker: (picker: Partial<Picker>) => Promise<void>;
    removePicker: (id: string) => Promise<void>;
    updatePicker: (id: string, updates: Partial<Picker>) => Promise<void>;
    unassignUser: (id: string) => Promise<void>;

    // Row Assignment stubs (TODO: connect to Supabase)
    assignRow: (rowNumber: number, side: 'north' | 'south', pickerIds: string[]) => Promise<void>;
    updateRowProgress: (rowId: string, percentage: number) => Promise<void>;
    completeRow: (rowId: string) => Promise<void>;
}

// --- EL STORE (Cerebro) ---
export const useHarvestStore = create<HarvestStoreState>()(
    persist(
        (set, get) => ({
            // Estado Inicial
            buckets: [],
            isScanning: false,
            lastScanTime: null,

            currentUser: null,
            crew: [],
            inventory: [],
            notifications: [],

            // Intelligence Init
            alerts: [],
            payroll: { totalPiece: 0, totalMinimum: 0, finalTotal: 0 },

            stats: { totalBuckets: 0, payEstimate: 0, tons: 0, velocity: 0, goalVelocity: 0, binsFull: 0 },
            settings: { min_wage_rate: 23.50, piece_rate: 6.50, min_buckets_per_hour: 3.6, target_tons: 100 },
            orchard: null,
            bucketRecords: [],
            rowAssignments: [],
            presentCount: 0,
            simulationMode: false,
            dayClosed: false,

            // ?? FASE 9: Timestamp validation init
            serverTimestamp: null,
            clockSkew: 0,

            // Intelligence Action
            recalculateIntelligence: () => {
                const state = get();
                const { crew, settings } = state;

                // 1. Calculate Payroll
                // Count current session buckets
                const bucketCounts = new Map<string, number>();
                state.buckets.forEach(b => {
                    bucketCounts.set(b.picker_id, (bucketCounts.get(b.picker_id) || 0) + 1);
                });

                // ?? FASE 9: Filter out archived pickers and use payroll service
                const activeCrew = crew.filter(p => p.status !== 'archived');

                // Calculate payroll using local logic (same as Edge Function)
                let totalPiece = 0;
                let totalMinimum = 0;
                activeCrew.forEach(p => {
                    const buckets = (bucketCounts.get(p.id) || 0) + (p.total_buckets_today || 0);
                    const hours = p.hours || 4; // Default 4 hours

                    const pieceEarnings = buckets * settings.piece_rate;
                    const minimumWageThreshold = hours * settings.min_wage_rate;
                    const minimumWageOwed = Math.max(0, minimumWageThreshold - pieceEarnings);

                    totalPiece += pieceEarnings;
                    totalMinimum += minimumWageOwed;
                });

                const payroll = {
                    totalPiece,
                    totalMinimum,
                    finalTotal: totalPiece + totalMinimum
                };

                // 2. Compliance Checks
                const alerts: ComplianceViolation[] = [];
                activeCrew.forEach(p => {
                    const buckets = (bucketCounts.get(p.id) || 0) + (p.total_buckets_today || 0);
                    const hours = p.hours || 4;

                    // Check compliance
                    const status = complianceService.checkPickerCompliance({
                        pickerId: p.id,
                        bucketCount: buckets,
                        hoursWorked: hours,
                        consecutiveMinutesWorked: 120, // Mock
                        totalMinutesToday: hours * 60,
                        lastRestBreakAt: null, // Mock
                        lastMealBreakAt: null, // Mock
                        lastHydrationAt: null, // Mock
                        workStartTime: new Date(Date.now() - (hours * 3600000))
                    });

                    if (status.violations.length > 0) {
                        alerts.push(...status.violations.map(v => ({ ...v, details: { ...v.details, pickerId: p.id, pickerName: p.name } })));
                    }
                });

                set({ payroll, alerts });
            },

            // Acción: Añadir Cubo (Instantáneo)
            addBucket: (bucketData) => {
                const state = get();
                const { crew, clockSkew } = state;

                // ?? FASE 9 - VALIDACIÓN 1: Timestamp validation (anti-fraud)
                const MAX_ALLOWED_SKEW = 5 * 60 * 1000; // 5 minutes
                if (clockSkew && clockSkew > MAX_ALLOWED_SKEW) {
                    console.error(`?? [Store] REJECTED — Device clock is ${Math.round(clockSkew / 60000)} minutes off`);
                    return;
                }

                // STRICT ATTENDANCE: reject if picker not active in crew
                const picker = crew.find(p => p.id === bucketData.picker_id);
                if (!picker) {
                    console.warn(`?? [Store] Rejected bucket — picker ${bucketData.picker_id} not in crew`);
                    return;
                }
                if (picker.status === 'inactive' || picker.status === 'suspended' || picker.status === 'archived') {
                    console.warn(`?? [Store] Rejected bucket — picker ${picker.name} is ${picker.status}`);
                    return;
                }

                // ?? FASE 9 - VALIDACIÓN 2: Check-in validation (offline-safe from cache)
                if (!picker.checked_in_today) {
                    console.warn(`?? [Store] REJECTED — picker ${picker.name} not checked in today (cache)`);
                    return;
                }

                const newBucket: ScannedBucket = {
                    ...bucketData,
                    id: crypto.randomUUID(),
                    synced: false
                };

                // 1. Update UI immediately (Optimistic)
                set((state) => ({
                    buckets: [newBucket, ...state.buckets],
                    lastScanTime: Date.now(),
                    stats: {
                        ...state.stats,
                        totalBuckets: state.stats.totalBuckets + 1,
                    }
                }));

                // 2. Persist to "The Checkpoint" (Dexie)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { synced: _synced, ...bucketToQueue } = newBucket;
                offlineService.queueBucket(bucketToQueue);

                // 3. Recalculate Intelligence
                get().recalculateIntelligence();
            },

            markAsSynced: (id) => {
                set((state) => ({
                    buckets: state.buckets.map((b) =>
                        b.id === id ? { ...b, synced: true } : b
                    )
                }));
                // Update Dexie
                offlineService.markAsSynced(id);
            },

            clearSynced: () => {
                set((state) => ({
                    buckets: state.buckets.filter((b) => !b.synced)
                }));
            },

            reset: () => set({ buckets: [], isScanning: false, lastScanTime: null }),

            // Global Actions
            setGlobalState: (data) => set((state) => ({ ...state, ...data })),
            setDayClosed: (closed) => set({ dayClosed: closed }),

            fetchGlobalData: async () => {
                console.log('?? [Store] Fetching global data...');

                // 0a. RECOVERY HYDRATION: Check for crash-recovered data
                try {
                    const recoveryData = localStorage.getItem('harvest-pro-recovery');
                    if (recoveryData) {
                        const parsed = JSON.parse(recoveryData);
                        const recoveredBuckets = parsed?.state?.buckets || [];
                        if (recoveredBuckets.length > 0) {
                            set((state) => {
                                const existingIds = new Set(state.buckets.map(b => b.id));
                                const uniqueRecovered = recoveredBuckets.filter(
                                    (b: ScannedBucket) => !existingIds.has(b.id)
                                );
                                if (uniqueRecovered.length > 0) {
                                    console.log(`?? [Store] Recovered ${uniqueRecovered.length} buckets from crash backup`);
                                    return { buckets: [...uniqueRecovered, ...state.buckets] };
                                }
                                return state;
                            });
                        }
                        // Clear recovery key after successful merge
                        localStorage.removeItem('harvest-pro-recovery');
                        console.log('?? [Store] Recovery data consumed and cleared');
                    }
                } catch (e) {
                    console.error('?? [Store] Failed to hydrate from recovery:', e);
                    localStorage.removeItem('harvest-pro-recovery');
                }

                // 0b. Hydrate from Dexie (Recover unsynced work)
                try {
                    const pendingBuckets = await offlineService.getPendingBuckets();
                    if (pendingBuckets.length > 0) {
                        set((state) => {
                            // Merge Dexie buckets with Store buckets, avoiding duplicates
                            const existingIds = new Set(state.buckets.map(b => b.id));
                            const uniquePending = pendingBuckets
                                .filter(b => !existingIds.has(String(b.id)))
                                .map(pb => ({
                                    ...pb,
                                    id: String(pb.id), // Ensure string
                                    synced: false // Pending in Dexie = false
                                }));

                            if (uniquePending.length > 0) {
                                console.log(`?? [Store] Hydrated ${uniquePending.length} pending buckets from Dexie`);
                                return { buckets: [...uniquePending, ...state.buckets] };
                            }
                            return state;
                        });
                    }
                } catch (e) {
                    console.error('?? [Store] Failed to hydrate from Dexie:', e);
                }

                try {
                    // 1. Fetch Orchard (Mock or Real)
                    // For now getting the first orchard or active one
                    const { data: orchards } = await supabase.from('orchards').select('*').limit(1);
                    const activeOrchard = orchards?.[0] || null;

                    // 2. Fetch Settings
                    const { data: settings } = await supabase.from('harvest_settings').select('*').eq('orchard_id', activeOrchard?.id).single();

                    // 3. ?? FASE 9: Fetch Crew WITH attendance status
                    const today = new Date().toISOString().split('T')[0];

                    const { data: pickers } = await supabase
                        .from('pickers')
                        .select(`
                            *,
                            daily_attendance!left(
                                check_in_time,
                                check_out_time
                            )
                        `)
                        .eq('orchard_id', activeOrchard?.id)
                        .eq('daily_attendance.date', today);

                    // Map pickers with attendance flag
                    const crewWithAttendance = pickers?.map((p: any) => ({
                        ...p,
                        checked_in_today: !!p.daily_attendance?.[0]?.check_in_time,
                        check_in_time: p.daily_attendance?.[0]?.check_in_time || null,
                        // Remove nested object
                        daily_attendance: undefined
                    })) || [];

                    // 4. Fetch Bucket Records for today (for HeatMap and intelligence)
                    const startOfDay = new Date();
                    startOfDay.setHours(0, 0, 0, 0);
                    const { data: bucketRecords } = await supabase
                        .from('bucket_records')
                        .select('*')
                        .eq('orchard_id', activeOrchard?.id)
                        .gte('scanned_at', startOfDay.toISOString())
                        .order('scanned_at', { ascending: false });

                    set({
                        orchard: activeOrchard,
                        settings: settings || get().settings,
                        crew: crewWithAttendance, // ?? Using crew with attendance data
                        bucketRecords: bucketRecords || []
                    });

                    // 5. Run initial intelligence check
                    get().recalculateIntelligence();

                    // ?? REAL-TIME SUBSCRIPTIONS: Listen to new bucket scans
                    if (activeOrchard?.id) {
                        console.log('?? [Store] Setting up real-time subscription for bucket_records...');

                        // Unsubscribe from any previous channel (cleanup)
                        supabase.removeAllChannels();

                        supabase.channel(`harvest-global-${activeOrchard.id}`)
                            .on(
                                'postgres_changes',
                                {
                                    event: 'INSERT',
                                    schema: 'public',
                                    table: 'bucket_records',
                                    filter: `orchard_id=eq.${activeOrchard.id}`
                                },
                                (payload) => {
                                    console.log('?? [Store] Real-time bucket record received:', payload.new);

                                    // Add new record to bucketRecords
                                    set((state) => ({
                                        bucketRecords: [payload.new as BucketRecord, ...state.bucketRecords]
                                    }));

                                    // Recalculate intelligence to update Dashboard live
                                    get().recalculateIntelligence();
                                }
                            )
                            .subscribe((status) => {
                                console.log(`?? [Store] Realtime subscription status: ${status}`);
                            });

                        // ?? FASE 9: Real-time subscription for attendance updates
                        supabase.channel(`attendance-${activeOrchard.id}`)
                            .on(
                                'postgres_changes',
                                {
                                    event: '*', // INSERT, UPDATE, DELETE
                                    schema: 'public',
                                    table: 'daily_attendance',
                                    filter: `orchard_id=eq.${activeOrchard.id}`
                                },
                                (payload) => {
                                    console.log('?? [Store] Real-time attendance change:', payload);

                                    const today = new Date().toISOString().split('T')[0];
                                    const attendanceRecord = payload.new as any;

                                    if (attendanceRecord && attendanceRecord.date === today) {
                                        // Update crew cache
                                        set((state) => ({
                                            crew: state.crew.map(p =>
                                                p.id === attendanceRecord.picker_id
                                                    ? {
                                                        ...p,
                                                        checked_in_today: !!attendanceRecord.check_in_time,
                                                        check_in_time: attendanceRecord.check_in_time
                                                    }
                                                    : p
                                            )
                                        }));
                                        console.log(`? [Store] Updated attendance cache for picker ${attendanceRecord.picker_id}`);
                                    }
                                }
                            )
                            .subscribe((status) => {
                                console.log(`?? [Store] Attendance subscription status: ${status}`);
                            });
                    }

                } catch (error) {
                    console.error('? [Store] Error fetching global data:', error);
                }
            },

            // Real Supabase Actions
            updateSettings: async (newSettings) => {
                const orchardId = get().orchard?.id;
                if (!orchardId) return;

                // Store previous state for audit
                const previousSettings = { ...get().settings };

                // Optimistic Update
                set((state) => ({ settings: { ...state.settings, ...newSettings } }));

                try {
                    const { error } = await supabase
                        .from('harvest_settings')
                        .update(newSettings)
                        .eq('orchard_id', orchardId);

                    if (error) throw error;

                    // ?? AUDIT LOG - Legal compliance tracking
                    await auditService.logAudit(
                        'settings.day_setup_modified',
                        'Updated harvest settings',
                        {
                            severity: 'info',
                            userId: get().currentUser?.id,
                            orchardId,
                            entityType: 'harvest_settings',
                            entityId: orchardId,
                            details: {
                                previous: previousSettings,
                                updated: newSettings,
                                changes: Object.keys(newSettings)
                            }
                        }
                    );
                    console.log('? [Store] Settings updated in Supabase');
                } catch (e) {
                    console.error('? [Store] Failed to update settings:', e);
                    // Rollback
                    set({ settings: previousSettings });
                }
            },

            addPicker: async (picker) => {
                const orchardId = get().orchard?.id;
                if (!orchardId) return; // Must have orchard context

                // Optimistic
                const tempId = crypto.randomUUID();
                const optimisticPicker: Picker = {
                    ...picker,
                    id: tempId,
                    orchard_id: orchardId,
                    status: 'active'
                } as Picker;

                set(state => ({ crew: [...state.crew, optimisticPicker] }));

                try {
                    const { error } = await supabase
                        .from('pickers')
                        .insert([{ ...picker, orchard_id: orchardId }]);

                    if (error) throw error;
                    // Re-fetch to get real ID and data
                    await get().fetchGlobalData();
                    console.log('? [Store] Picker added to Supabase');
                } catch (e) {
                    console.error('? [Store] Failed to add picker:', e);
                    set(state => ({ crew: state.crew.filter(p => p.id !== tempId) })); // Rollback
                }
            },

            removePicker: async (id) => {
                // Optimistic
                const originalCrew = get().crew;
                // ?? FASE 9: Mark as archived in UI
                set(state => ({
                    crew: state.crew.map(p =>
                        p.id === id
                            ? { ...p, status: 'archived' as const, archived_at: new Date().toISOString() }
                            : p
                    )
                }));

                try {
                    // ?? FASE 9: Soft delete - UPDATE status instead of DELETE
                    const { error } = await supabase
                        .from('pickers')
                        .update({
                            status: 'archived',
                            archived_at: new Date().toISOString()
                        })
                        .eq('id', id);

                    if (error) throw error;
                    console.log('? [Store] Picker archived (soft delete)');
                } catch (e) {
                    console.error('? [Store] Failed to archive picker:', e);
                    set({ crew: originalCrew }); // Rollback
                }
            },

            updatePicker: async (id, updates) => {
                // Store previous state for audit and potential rollback
                const previousPicker = get().crew.find(p => p.id === id);

                // Optimistic
                set(state => ({
                    crew: state.crew.map(p => p.id === id ? { ...p, ...updates } : p)
                }));

                try {
                    const { error } = await supabase
                        .from('pickers')
                        .update(updates)
                        .eq('id', id);

                    if (error) throw error;

                    // ?? AUDIT LOG - Track employee data changes
                    await auditService.logPickerEvent(
                        'updated',
                        id,
                        get().currentUser?.id,
                        {
                            pickerName: previousPicker?.name,
                            previous: previousPicker,
                            updated: updates,
                            changes: Object.keys(updates)
                        }
                    );
                    console.log('? [Store] Picker updated in Supabase');
                } catch (e) {
                    console.error('? [Store] Failed to update picker:', e);
                    // Rollback to previous state
                    if (previousPicker) {
                        set(state => ({
                            crew: state.crew.map(p => p.id === id ? previousPicker : p)
                        }));
                    }
                }
            },

            unassignUser: async (id) => {
                // Logic to unassign user from orchard (set orchard_id to null)
                set(state => ({ crew: state.crew.filter(p => p.id !== id) })); // Remove from local list
                try {
                    const { error } = await supabase
                        .from('pickers')
                        .update({ orchard_id: null })
                        .eq('id', id);
                    if (error) throw error;
                } catch (e) {
                    console.error('? [Store] Failed to unassign user:', e);
                }
            },

            setSimulationMode: (enabled) => {
                set({ simulationMode: enabled });
                console.log(`?? [Store] Simulation mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
            },

            // FIX U2: Row Assignments — connected to Supabase
            assignRow: async (rowNumber, side, pickerIds) => {
                const orchardId = get().orchard?.id;
                if (!orchardId) return;

                const newRow: RowAssignment = {
                    id: crypto.randomUUID(),
                    row_number: rowNumber,
                    side,
                    assigned_pickers: pickerIds,
                    completion_percentage: 0
                };

                // Optimistic update
                set(state => ({ rowAssignments: [...state.rowAssignments, newRow] }));

                try {
                    const { error } = await supabase.from('row_assignments').insert({
                        id: newRow.id,
                        orchard_id: orchardId,
                        row_number: rowNumber,
                        side,
                        assigned_pickers: pickerIds,
                        completion_percentage: 0,
                        status: 'active'
                    });
                    if (error) throw error;
                    console.log(`?? [Store] Row ${rowNumber} assigned to Supabase`);
                } catch (e) {
                    console.error('? [Store] Failed to assign row:', e);
                    // Rollback optimistic update
                    set(state => ({ rowAssignments: state.rowAssignments.filter(r => r.id !== newRow.id) }));
                }
            },

            updateRowProgress: async (rowId, percentage) => {
                // Optimistic update
                set(state => ({
                    rowAssignments: state.rowAssignments.map(r =>
                        r.id === rowId ? { ...r, completion_percentage: percentage } : r
                    )
                }));

                try {
                    const { error } = await supabase.from('row_assignments')
                        .update({ completion_percentage: percentage })
                        .eq('id', rowId);
                    if (error) throw error;
                } catch (e) {
                    console.error('? [Store] Failed to update row progress:', e);
                }
            },

            completeRow: async (rowId) => {
                set(state => ({
                    rowAssignments: state.rowAssignments.map(r =>
                        r.id === rowId ? { ...r, completion_percentage: 100 } : r
                    )
                }));

                try {
                    const { error } = await supabase.from('row_assignments')
                        .update({ completion_percentage: 100, status: 'completed' })
                        .eq('id', rowId);
                    if (error) throw error;
                } catch (e) {
                    console.error('? [Store] Failed to complete row:', e);
                }
            }
        }),
        {
            name: 'harvest-pro-storage',
            storage: createJSONStorage(() => safeStorage),
            partialize: (state) => ({
                buckets: state.buckets.filter(b => !b.synced),
                settings: state.settings,
                orchard: state.orchard,
                crew: state.crew, // Persist crew for offline attendance guard
                currentUser: state.currentUser,
                simulationMode: state.simulationMode,
            }),
        }
    )
);
