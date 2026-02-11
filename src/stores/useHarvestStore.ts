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
                console.warn('⚠️ [Store] localStorage full — evicting synced buckets');
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
                    console.error('❌ [Store] localStorage permanently full — data safe in Dexie only');
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

            // Intelligence Action
            recalculateIntelligence: () => {
                const state = get();
                const { crew, settings } = state;

                // 1. Calculate Payroll
                // Convert crew to expected format with buckets/hours (Assuming crew has these fields populated or derived)
                // For now, we compute buckets from local 'buckets' array + historical 'bucketRecords'
                // This is an expensive operation if arrays are huge, optimize later
                const bucketCounts = new Map<string, number>();

                // Count current session buckets
                state.buckets.forEach(b => {
                    bucketCounts.set(b.picker_id, (bucketCounts.get(b.picker_id) || 0) + 1);
                });

                // TODO: Add historical counts if needed for daily total

                const payrollCrew = crew.map(p => ({
                    ...p,
                    buckets: (bucketCounts.get(p.id) || 0) + (p.total_buckets_today || 0),
                    hours: p.hours || 4 // Mock hours if missing
                }));

                // Inline payroll calculation (was calculationsService.calculateDailyPayroll)
                let totalPiece = 0;
                let totalMinimum = 0;
                payrollCrew.forEach(p => {
                    const pieceEarnings = p.buckets * settings.piece_rate;
                    const minimumEarnings = p.hours * settings.min_wage_rate;
                    totalPiece += pieceEarnings;
                    totalMinimum += Math.max(minimumEarnings - pieceEarnings, 0);
                });
                const payroll = {
                    totalPiece,
                    totalMinimum,
                    finalTotal: totalPiece + totalMinimum
                };

                // 2. Compliance Checks
                const alerts: ComplianceViolation[] = [];
                payrollCrew.forEach(p => {
                    // Check compliance
                    const status = complianceService.checkPickerCompliance({
                        pickerId: p.id,
                        bucketCount: p.buckets,
                        hoursWorked: p.hours,
                        consecutiveMinutesWorked: 120, // Mock
                        totalMinutesToday: p.hours * 60,
                        lastRestBreakAt: null, // Mock
                        lastMealBreakAt: null, // Mock
                        lastHydrationAt: null, // Mock
                        workStartTime: new Date(Date.now() - (p.hours * 3600000))
                    });

                    if (status.violations.length > 0) {
                        alerts.push(...status.violations.map(v => ({ ...v, details: { ...v.details, pickerId: p.id, pickerName: p.name } })));
                    }
                });

                set({ payroll, alerts });
            },

            // Acción: Añadir Cubo (Instantáneo)
            addBucket: (bucketData) => {
                // STRICT ATTENDANCE: reject if picker not active in crew
                const crew = get().crew;
                const picker = crew.find(p => p.id === bucketData.picker_id);
                if (!picker) {
                    console.warn(`⚠️ [Store] Rejected bucket — picker ${bucketData.picker_id} not in crew`);
                    return;
                }
                if (picker.status === 'inactive' || picker.status === 'suspended') {
                    console.warn(`⚠️ [Store] Rejected bucket — picker ${picker.name} is ${picker.status}`);
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
                const { synced, ...bucketToQueue } = newBucket;
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
                console.log('🔄 [Store] Fetching global data...');

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
                                    console.log(`🔧 [Store] Recovered ${uniqueRecovered.length} buckets from crash backup`);
                                    return { buckets: [...uniqueRecovered, ...state.buckets] };
                                }
                                return state;
                            });
                        }
                        // Clear recovery key after successful merge
                        localStorage.removeItem('harvest-pro-recovery');
                        console.log('🔧 [Store] Recovery data consumed and cleared');
                    }
                } catch (e) {
                    console.error('⚠️ [Store] Failed to hydrate from recovery:', e);
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
                                console.log(`📥 [Store] Hydrated ${uniquePending.length} pending buckets from Dexie`);
                                return { buckets: [...uniquePending, ...state.buckets] };
                            }
                            return state;
                        });
                    }
                } catch (e) {
                    console.error('⚠️ [Store] Failed to hydrate from Dexie:', e);
                }

                try {
                    // 1. Fetch Orchard (Mock or Real)
                    // For now getting the first orchard or active one
                    const { data: orchards } = await supabase.from('orchards').select('*').limit(1);
                    const activeOrchard = orchards?.[0] || null;

                    // 2. Fetch Settings
                    const { data: settings } = await supabase.from('harvest_settings').select('*').eq('orchard_id', activeOrchard?.id).single();

                    // 3. Fetch Click (Pickers) - using "pickers" table
                    const { data: pickers } = await supabase.from('pickers').select('*').eq('orchard_id', activeOrchard?.id);

                    // 4. Fetch Inventory (Bins)
                    // const { data: bins } = await supabase.from('bins').select('*').eq('orchard_id', activeOrchard?.id);

                    set({
                        orchard: activeOrchard,
                        settings: settings || get().settings,
                        crew: pickers || [],
                        // inventory: bins || []
                    });

                    // 5. Run initial intelligence check
                    get().recalculateIntelligence();


                } catch (error) {
                    console.error('❌ [Store] Error fetching global data:', error);
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

                    // 🔒 AUDIT LOG - Legal compliance tracking
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

                    console.log('✅ [Store] Settings updated in Supabase');
                } catch (e) {
                    console.error('❌ [Store] Failed to update settings:', e);
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
                    console.log('✅ [Store] Picker added to Supabase');
                } catch (e) {
                    console.error('❌ [Store] Failed to add picker:', e);
                    set(state => ({ crew: state.crew.filter(p => p.id !== tempId) })); // Rollback
                }
            },

            removePicker: async (id) => {
                // Optimistic
                const originalCrew = get().crew;
                set(state => ({ crew: state.crew.filter(p => p.id !== id) }));

                try {
                    // Soft delete or hard delete depending on policy.
                    // For now, let's assuming soft delete via status 'inactive' or hard delete.
                    // Request implied "remove", let's try strict delete first, or update status.
                    // Given previous context of "soft-delete", let's set status to inactive if delete fails or as preference.
                    // But typically "remove" in UI implies disappearance.
                    const { error } = await supabase.from('pickers').delete().eq('id', id);
                    if (error) throw error;
                    console.log('✅ [Store] Picker removed from Supabase');
                } catch (e) {
                    console.error('❌ [Store] Failed to remove picker:', e);
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

                    // 🔒 AUDIT LOG - Track employee data changes
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

                    console.log('✅ [Store] Picker updated in Supabase');
                } catch (e) {
                    console.error('❌ [Store] Failed to update picker:', e);
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
                    console.error('❌ [Store] Failed to unassign user:', e);
                }
            },

            setSimulationMode: (enabled) => {
                set({ simulationMode: enabled });
                console.log(`🧪 [Store] Simulation mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
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
                    console.log(`📍 [Store] Row ${rowNumber} assigned to Supabase`);
                } catch (e) {
                    console.error('❌ [Store] Failed to assign row:', e);
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
                    console.error('❌ [Store] Failed to update row progress:', e);
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
                    console.error('❌ [Store] Failed to complete row:', e);
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
