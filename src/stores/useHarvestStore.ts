import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/services/supabase';
import { offlineService } from '@/services/offline.service';
import {
    Picker,
    Bin,
    HarvestSettings,
    BucketRecord,
    Notification
} from '@/types';

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

    notifications: Notification[];
    stats: HarvestStats;
    settings: HarvestSettings;
    orchard: { id: string; name?: string; total_rows?: number } | null;
    bucketRecords: BucketRecord[]; // Historical/Cloud records

    // Derived/Aux
    presentCount: number;

    // 3. ACCIONES (Lógica)
    addBucket: (bucket: Omit<ScannedBucket, 'id' | 'synced'>) => void;
    markAsSynced: (id: string) => void;
    clearSynced: () => void;
    reset: () => void;

    // Global Data Actions
    setGlobalState: (data: Partial<HarvestStoreState>) => void;
    fetchGlobalData: () => Promise<void>;

    // Legacy Helpers for Manager.tsx
    updateSettings: (newSettings: Partial<HarvestSettings>) => Promise<void>;
    addPicker: (picker: Partial<Picker>) => Promise<void>;
    removePicker: (id: string) => Promise<void>;
    updatePicker: (id: string, updates: Partial<Picker>) => Promise<void>;
    unassignUser: (id: string) => Promise<void>;
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
            stats: { totalBuckets: 0, payEstimate: 0, tons: 0, velocity: 0, goalVelocity: 0, binsFull: 0 },
            settings: { min_wage_rate: 23.50, piece_rate: 6.50, min_buckets_per_hour: 3.6, target_tons: 100 },
            orchard: null,
            bucketRecords: [],
            presentCount: 0,

            // Acción: Añadir Cubo (Instantáneo)
            addBucket: (bucketData) => {
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
                // Remove 'synced' from the object passed to queueBucket
                const { synced, ...bucketToQueue } = newBucket;
                offlineService.queueBucket(bucketToQueue);
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

            fetchGlobalData: async () => {
                console.log('🔄 [Store] Fetching global data...');

                // 0. Hydrate from Dexie (Recover unsynced work)
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

                } catch (error) {
                    console.error('❌ [Store] Error fetching global data:', error);
                }
            },

            // Legacy Helpers (Mocked for now to satisfy types, implement with Supabase later)
            // Real Supabase Actions
            updateSettings: async (newSettings) => {
                const orchardId = get().orchard?.id;
                if (!orchardId) return;

                // Optimistic Update
                set((state) => ({ settings: { ...state.settings, ...newSettings } }));

                try {
                    const { error } = await supabase
                        .from('harvest_settings')
                        .update(newSettings)
                        .eq('orchard_id', orchardId);

                    if (error) throw error;
                    console.log('✅ [Store] Settings updated in Supabase');
                } catch (e) {
                    console.error('❌ [Store] Failed to update settings:', e);
                    // Rollback could be implemented here if needed
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
                    console.log('✅ [Store] Picker updated in Supabase');
                } catch (e) {
                    console.error('❌ [Store] Failed to update picker:', e);
                    // Rollback logic would require keeping previous state of specific picker
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
            }
        }),
        {
            name: 'harvest-pro-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
