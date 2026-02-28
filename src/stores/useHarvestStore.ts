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
import { createOrchardMapSlice } from './slices/orchardMapSlice';
import { createUISlice } from './slices/uiSlice';

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

/**
 * Fetch orchard data from Supabase with intelligent Delta Sync.
 * 
 * **Delta mode** (when lastSyncAt exists and < 24h old):
 *   - Queries pickers/buckets WHERE updated_at >= (lastSyncAt - 2 min jitter)
 *   - Does NOT filter out deleted_at — so soft-deleted "zombies" arrive and get purged
 *   - Merges into existing state using O(1) Map-based upsert
 * 
 * **Full mode** (first load or stale):
 *   - Downloads all non-deleted records (fresh start)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchOrchardData(get: StoreGetter, set: StoreSetter): Promise<any> {
    const state = get();
    const lastSync = state.lastSyncAt;
    const now = new Date().toISOString();

    // Determine sync mode: delta vs full
    const isStale = !lastSync ||
        (Date.now() - new Date(lastSync).getTime() > 24 * 60 * 60 * 1000);
    const useDelta = !isStale;

    // --- Always fetch orchard + settings (tiny, no delta needed) ---
    const { data: orchards } = await supabase.from('orchards').select('*').limit(1);
    const activeOrchard = orchards?.[0] || null;

    const { data: settings } = await supabase
        .from('harvest_settings')
        .select('*')
        .eq('orchard_id', activeOrchard?.id)
        .single();

    set({
        orchard: activeOrchard,
        settings: settings || state.settings,
    });

    // --- Pickers + Attendance (with delta sync fallback) ---
    const today = todayNZST();
    const startOfDayNZ = toNZST((() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapPickerWithAttendance = (p: any) => ({
        ...p,
        checked_in_today: !!p.daily_attendance?.[0]?.check_in_time,
        check_in_time: p.daily_attendance?.[0]?.check_in_time || null,
        daily_attendance: undefined,
    });

    let syncSucceeded = false;

    // --- Attempt delta/full sync with updated_at/deleted_at columns ---
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let pickersQuery: any = supabase
            .from('pickers')
            .select(`*, daily_attendance!left(check_in_time, check_out_time)`)
            .eq('orchard_id', activeOrchard?.id)
            .eq('daily_attendance.date', today);

        let bucketsQuery = supabase
            .from('bucket_records')
            .select('*')
            .eq('orchard_id', activeOrchard?.id)
            .gte('scanned_at', startOfDayNZ)
            .order('scanned_at', { ascending: false });

        if (useDelta) {
            const safeSyncDate = new Date(new Date(lastSync!).getTime() - 120_000).toISOString();
            pickersQuery = pickersQuery.gte('updated_at', safeSyncDate);
            bucketsQuery = bucketsQuery.gte('updated_at', safeSyncDate);
            logger.info(`[Sync] Delta mode: fetching changes since ${safeSyncDate}`);
        } else {
            pickersQuery = pickersQuery.is('deleted_at', null);
            bucketsQuery = bucketsQuery.is('deleted_at', null);
            logger.info('[Sync] Full mode: downloading all active records');
        }

        const [pickersRes, bucketsRes] = await Promise.all([pickersQuery, bucketsQuery]);

        if (pickersRes.error) throw pickersRes.error;
        if (bucketsRes.error) throw bucketsRes.error;

        if (useDelta) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const crewMap = new Map(state.crew.map((p: any) => [p.id, p]));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pickersRes.data.forEach((p: any) => {
                if (p.deleted_at) {
                    crewMap.delete(p.id);
                } else {
                    crewMap.set(p.id, mapPickerWithAttendance(p));
                }
            });

            const bucketsMap = new Map(state.bucketRecords.map((b: BucketRecord) => [b.id, b]));
            bucketsRes.data.forEach((b: BucketRecord) => {
                if (b.deleted_at) {
                    bucketsMap.delete(b.id);
                } else {
                    bucketsMap.set(b.id, b);
                }
            });

            set({
                crew: Array.from(crewMap.values()),
                bucketRecords: Array.from(bucketsMap.values()),
                lastSyncAt: now,
            });
            logger.info(`[Sync] Delta applied: ${pickersRes.data.length} pickers, ${bucketsRes.data.length} buckets`);
        } else {
            const crewWithAttendance = pickersRes.data?.map(mapPickerWithAttendance) || [];
            set({
                crew: crewWithAttendance,
                bucketRecords: bucketsRes.data || [],
                lastSyncAt: now,
            });
            logger.info(`[Sync] Full load: ${crewWithAttendance.length} pickers, ${(bucketsRes.data || []).length} buckets`);
        }
        syncSucceeded = true;
    } catch (syncError) {
        // 🛡️ GRACEFUL DEGRADATION: If updated_at/deleted_at columns don't exist in DB yet,
        // fall back to simple queries without those filters. This happens when the
        // verification migration hasn't been applied to Supabase.
        logger.warn('[Sync] Delta/full sync failed — falling back to simple fetch:', syncError);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [pickersRes, bucketsRes] = await Promise.all([
            supabase
                .from('pickers')
                .select(`*, daily_attendance!left(check_in_time, check_out_time)`)
                .eq('orchard_id', activeOrchard?.id)
                .eq('daily_attendance.date', today),
            supabase
                .from('bucket_records')
                .select('*')
                .eq('orchard_id', activeOrchard?.id)
                .gte('scanned_at', startOfDayNZ)
                .order('scanned_at', { ascending: false }),
        ]);

        const crewWithAttendance = pickersRes.data?.map(mapPickerWithAttendance) || [];
        set({
            crew: crewWithAttendance,
            bucketRecords: bucketsRes.data || [],
            lastSyncAt: null, // Don't set lastSyncAt — delta columns don't exist yet
        });
        logger.info(`[Sync] Fallback load: ${crewWithAttendance.length} pickers, ${(bucketsRes.data || []).length} buckets`);
        syncSucceeded = true;
    }

    // ── Fetch real blocks from Supabase (replaces MOCK_BLOCKS) ──
    if (activeOrchard?.id) {
        await get().fetchBlocks(activeOrchard.id);
    }

    // ── Rebuild rowAssignments from crew.current_row ONLY if persisted state is empty ──
    const existingAssignments = get().rowAssignments;
    if (existingAssignments.length === 0) {
        const crewList = get().crew;
        const rowMap = new Map<string, { row: number; pickers: string[] }>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const p of crewList as any[]) {
            if (p.current_row > 0) {
                const groupKey = p.team_leader_id || p.id;
                const mapKey = `${groupKey}-${p.current_row}`;
                if (!rowMap.has(mapKey)) {
                    rowMap.set(mapKey, { row: p.current_row, pickers: [] });
                }
                rowMap.get(mapKey)!.pickers.push(p.id);
            }
        }
        // Also add team leaders themselves
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const p of crewList as any[]) {
            if (p.current_row > 0 && p.role === 'team_leader') {
                const mapKey = `${p.id}-${p.current_row}`;
                if (!rowMap.has(mapKey)) {
                    rowMap.set(mapKey, { row: p.current_row, pickers: [] });
                }
                if (!rowMap.get(mapKey)!.pickers.includes(p.id)) {
                    rowMap.get(mapKey)!.pickers.push(p.id);
                }
            }
        }
        const rebuiltAssignments = Array.from(rowMap.values()).map(entry => ({
            id: `rebuilt-${entry.row}-${entry.pickers[0]}`,
            row_number: entry.row,
            side: 'north' as const,
            assigned_pickers: entry.pickers,
            completion_percentage: 0,
        }));
        if (rebuiltAssignments.length > 0) {
            set({ rowAssignments: rebuiltAssignments });
            logger.info(`[Store] Rebuilt ${rebuiltAssignments.length} row assignments from crew data`);
        }
    } else {
        logger.info(`[Store] Using ${existingAssignments.length} persisted row assignments`);
    }

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
            ...createOrchardMapSlice(set, get, api),
            ...createUISlice(set, get, api),

            // === ORCHESTRATOR STATE ===
            currentUser: null,
            inventory: [],
            orchard: null,
            serverTimestamp: null,
            clockSkew: 0,
            simulationMode: false,
            dayClosed: false,
            lastSyncAt: null,
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
                // 🔧 R8-Fix3: Removed `buckets` from persist.
                // With 3000+ buckets, JSON.stringify blocks the main thread
                // for ~500ms on every scan. Buckets live in Dexie (sync_queue).
                // Only persist lightweight UI state.
                settings: state.settings,
                orchard: state.orchard,
                crew: state.crew,
                currentUser: state.currentUser,
                simulationMode: state.simulationMode,
                clockSkew: state.clockSkew, // 🔧 Fix 4: Persist anti-fraud skew across restarts
                lastSyncAt: state.lastSyncAt, // ⚡ Delta sync: remember last sync timestamp
                rowAssignments: state.rowAssignments, // 🔧 Persist multi-row assignments (Supabase only stores one current_row per picker)
            }),
        }
    )
);
