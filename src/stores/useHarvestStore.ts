/**
 * useHarvestStore - Slim Orchestrator
 * 
 * **Architecture**: Zustand store composed from focused slices.
 * Each slice manages its own state + actions, receiving get()/set() for cross-slice access.
 * This file handles:
 *   - Slice composition
 *   - fetchGlobalData (cross-cutting: touches all domains)
 *   - Trivial orchestrator actions (reset, setGlobalState, etc.)
 *   - Persistence config (partialize)
 *   - Real-time subscriptions
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/services/supabase';
import { offlineService } from '@/services/offline.service';
import { logger } from '@/utils/logger';
import { todayNZST, toNZST } from '@/utils/nzst';
import { BucketRecord } from '@/types';

// Slice imports
import { createSettingsSlice } from './slices/settingsSlice';
import { createCrewSlice } from './slices/crewSlice';
import { createBucketSlice } from './slices/bucketSlice';
import { createIntelligenceSlice } from './slices/intelligenceSlice';
import { createRowSlice } from './slices/rowSlice';

// Re-export types for backward compatibility
export type { HarvestStoreState, ScannedBucket, HarvestStats } from './storeTypes';
import type { HarvestStoreState, ScannedBucket } from './storeTypes';

// Safe localStorage wrapper — handles QuotaExceededError
const safeStorage = {
    getItem: (name: string) => localStorage.getItem(name),
    setItem: (name: string, value: string) => {
        try {
            localStorage.setItem(name, value);
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                logger.error('[Storage] QuotaExceededError - clearing old data');
                // Emergency cleanup: remove non-critical cached data
                const keysToKeep = ['harvest-pro-storage', 'harvest-pro-recovery'];
                const keysToRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && !keysToKeep.includes(key)) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
                // Retry after cleanup
                try {
                    localStorage.setItem(name, value);
                    logger.info('[Storage] Retry succeeded after cleanup');
                } catch (e) {
                    logger.error('[Storage] Still over quota after cleanup', e);
                    // Last resort: save critical data to IndexedDB (Dexie)
                    // 🔧 Fix 11: localStorage is FULL — fallback to same storage would fail again.
                    // Dexie/IndexedDB has ~500MB dynamic quota vs localStorage's 5MB.
                    try {
                        const parsed = JSON.parse(value);
                        const criticalData = {
                            state: {
                                buckets: parsed?.state?.buckets?.filter((b: { synced: boolean }) => !b.synced) || [],
                                currentUser: parsed?.state?.currentUser,
                            }
                        };
                        import('@/services/db').then(({ db }) => {
                            db.table('recovery').put({ id: 'quota-crash', data: criticalData, timestamp: Date.now() })
                                .catch((dbErr: unknown) => logger.error('[Storage] Dexie recovery also failed:', dbErr));
                        });
                    } catch (e) {
                        logger.error('[Storage] Recovery key also failed — data may be lost', e);
                    }
                }
            }
        }
    },
    removeItem: (name: string) => localStorage.removeItem(name),
};

// --- EXTRACTED HELPERS (from fetchGlobalData) ---

type StoreSetter = (
    partial: Partial<HarvestStoreState> | ((state: HarvestStoreState) => Partial<HarvestStoreState>)
) => void;
type StoreGetter = () => HarvestStoreState;

/** Recover crash-saved buckets from localStorage */
function hydrateFromRecovery(set: StoreSetter): void {
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
                        logger.info(`[Store] Recovered ${uniqueRecovered.length} buckets from crash backup`);
                        return { buckets: [...uniqueRecovered, ...state.buckets] };
                    }
                    return state;
                });
            }
            localStorage.removeItem('harvest-pro-recovery');
            logger.info('[Store] Recovery data consumed and cleared');
        }
    } catch (e) {
        logger.error('[Store] Failed to hydrate from recovery:', e);
        localStorage.removeItem('harvest-pro-recovery');
    }
}

/** Recover pending (unsynced) buckets from Dexie/IndexedDB */
async function hydrateFromDexie(set: StoreSetter): Promise<void> {
    try {
        const pendingBuckets = await offlineService.getPendingBuckets();
        if (pendingBuckets.length > 0) {
            set((state) => {
                const existingIds = new Set(state.buckets.map(b => b.id));
                const uniquePending = pendingBuckets
                    .filter(b => !existingIds.has(String(b.id)))
                    .map(pb => ({
                        ...pb,
                        id: String(pb.id),
                        synced: false,
                    }));
                if (uniquePending.length > 0) {
                    logger.info(`[Store] Hydrated ${uniquePending.length} pending buckets from Dexie`);
                    return { buckets: [...uniquePending, ...state.buckets] };
                }
                return state;
            });
        }
    } catch (e) {
        logger.error('[Store] Failed to hydrate from Dexie:', e);
    }
}

/** Fetch orchard, settings, crew, and today's bucket records from Supabase */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchOrchardData(get: StoreGetter, set: StoreSetter): Promise<any> {
    const { data: orchards } = await supabase.from('orchards').select('*').limit(1);
    const activeOrchard = orchards?.[0] || null;

    const { data: settings } = await supabase
        .from('harvest_settings')
        .select('*')
        .eq('orchard_id', activeOrchard?.id)
        .single();

    const today = todayNZST();
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const crewWithAttendance = pickers?.map((p: any) => ({
        ...p,
        checked_in_today: !!p.daily_attendance?.[0]?.check_in_time,
        check_in_time: p.daily_attendance?.[0]?.check_in_time || null,
        daily_attendance: undefined,
    })) || [];

    const startOfDayNZ = toNZST((() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })());
    const { data: bucketRecords } = await supabase
        .from('bucket_records')
        .select('*')
        .eq('orchard_id', activeOrchard?.id)
        .gte('scanned_at', startOfDayNZ)
        .order('scanned_at', { ascending: false });

    set({
        orchard: activeOrchard,
        settings: settings || get().settings,
        crew: crewWithAttendance,
        bucketRecords: bucketRecords || [],
    });

    return activeOrchard;
}

/** Set up Supabase real-time channels for live updates */
function setupRealtimeSubscriptions(orchardId: string, get: StoreGetter, set: StoreSetter): void {
    logger.info('[Store] Setting up real-time subscriptions...');
    supabase.removeAllChannels();

    // Bucket records — live bin count
    supabase.channel(`harvest-global-${orchardId}`)
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'bucket_records',
            filter: `orchard_id=eq.${orchardId}`,
        }, (payload) => {
            logger.info('[Store] Real-time bucket record received:', payload.new);
            set((state) => {
                // 🔧 U3: Deduplicate — optimistic insert already added this record
                const newRecord = payload.new as BucketRecord;
                if (state.bucketRecords.some(b => b.id === newRecord.id)) return state;
                return { bucketRecords: [newRecord, ...state.bucketRecords] };
            });
            get().recalculateIntelligence();
        })
        .subscribe((status) => logger.info(`[Store] Realtime subscription status: ${status}`));

    // Attendance — live check-in/out
    supabase.channel(`attendance-${orchardId}`)
        .on('postgres_changes', {
            event: '*', schema: 'public', table: 'daily_attendance',
            filter: `orchard_id=eq.${orchardId}`,
        }, (payload) => {
            logger.info('[Store] Real-time attendance change:', payload);
            const todayStr = todayNZST();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const attendanceRecord = payload.new as any;
            if (attendanceRecord && attendanceRecord.date === todayStr) {
                set((state) => ({
                    crew: state.crew.map(p =>
                        p.id === attendanceRecord.picker_id
                            ? { ...p, checked_in_today: !!attendanceRecord.check_in_time, check_in_time: attendanceRecord.check_in_time }
                            : p
                    ),
                }));
                logger.info(`[Store] Updated attendance cache for picker ${attendanceRecord.picker_id}`);
            }
        })
        .subscribe((status) => logger.info(`[Store] Attendance subscription status: ${status}`));

    // QC Inspections — live grade updates
    supabase.channel(`qc-inspections-${orchardId}`)
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'qc_inspections',
            filter: `orchard_id=eq.${orchardId}`,
        }, (payload) => {
            logger.info('[Store] Real-time QC inspection received:', payload.new);
            // 🔧 U9: Append to capped list instead of overwrite to prevent event squashing
            set(state => ({
                recentQcInspections: [
                    payload.new as Record<string, unknown>,
                    ...state.recentQcInspections
                ].slice(0, 10)
            }));
        })
        .subscribe((status) => logger.info(`[Store] QC inspections subscription status: ${status}`));

    // Timesheets — live payroll updates
    supabase.channel(`timesheets-${orchardId}`)
        .on('postgres_changes', {
            event: '*', schema: 'public', table: 'timesheets',
            filter: `orchard_id=eq.${orchardId}`,
        }, (payload) => {
            logger.info('[Store] Real-time timesheet change:', payload.new);
            // 🔧 U9: Append to capped list instead of overwrite
            set(state => ({
                recentTimesheetUpdates: [
                    payload.new as Record<string, unknown>,
                    ...state.recentTimesheetUpdates
                ].slice(0, 10)
            }));
        })
        .subscribe((status) => logger.info(`[Store] Timesheets subscription status: ${status}`));
}

// --- THE STORE (Slim Orchestrator) ---
export const useHarvestStore = create<HarvestStoreState>()(
    persist(
        (set, get, api) => ({
            // === SLICES (delegated state + actions) ===
            ...createSettingsSlice(set, get, api),
            ...createCrewSlice(set, get, api),
            ...createBucketSlice(set, get, api),
            ...createIntelligenceSlice(set, get, api),
            ...createRowSlice(set, get, api),

            // === ORCHESTRATOR STATE ===
            currentUser: null,
            inventory: [],
            orchard: null,
            serverTimestamp: null,
            clockSkew: 0,
            simulationMode: false,
            dayClosed: false,
            // 🔧 U9: Initialize as empty arrays
            recentQcInspections: [],
            recentTimesheetUpdates: [],

            // === ORCHESTRATOR ACTIONS ===
            setGlobalState: (data) => set(data),
            setDayClosed: (closed) => set({ dayClosed: closed }),
            reset: () => set({ buckets: [], lastScanTime: null }),
            setSimulationMode: (enabled) => {
                set({ simulationMode: enabled });
                logger.info(`[Store] Simulation mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
            },

            // === FETCH GLOBAL DATA (orchestrator — delegates to focused helpers) ===
            fetchGlobalData: async () => {
                logger.info('[Store] Fetching global data...');
                hydrateFromRecovery(set);
                await hydrateFromDexie(set);
                try {
                    const activeOrchard = await fetchOrchardData(get, set);
                    get().recalculateIntelligence();
                    if (activeOrchard?.id) {
                        setupRealtimeSubscriptions(activeOrchard.id, get, set);
                    }
                } catch (error) {
                    logger.error('[Store] Error fetching global data:', error);
                }
            },
        }),
        {
            name: 'harvest-pro-storage',
            storage: createJSONStorage(() => safeStorage),
            partialize: (state) => ({
                buckets: state.buckets.filter(b => !b.synced),
                settings: state.settings,
                orchard: state.orchard,
                crew: state.crew,
                currentUser: state.currentUser,
                simulationMode: state.simulationMode,
                clockSkew: state.clockSkew, // 🔧 Fix 4: Persist anti-fraud skew across restarts
            }),
        }
    )
);
