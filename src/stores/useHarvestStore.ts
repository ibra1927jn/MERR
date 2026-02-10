import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../../services/supabase';
import {
    Picker,
    Bin,
    HarvestSettings,
    BucketRecord,
    Notification
} from '../../types';

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

                set((state) => ({
                    buckets: [newBucket, ...state.buckets],
                    lastScanTime: Date.now(),
                    // Optimistic update of stats
                    stats: {
                        ...state.stats,
                        totalBuckets: state.stats.totalBuckets + 1,
                        // Update other stats as needed
                    }
                }));

                console.log('✅ [Store] Cubo guardado localmente:', newBucket.id);
            },

            markAsSynced: (id) => {
                set((state) => ({
                    buckets: state.buckets.map((b) =>
                        b.id === id ? { ...b, synced: true } : b
                    )
                }));
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
            updateSettings: async (newSettings) => {
                set((state) => ({ settings: { ...state.settings, ...newSettings } }));
                // TODO: Supabase update
            },
            addPicker: async (picker) => { console.log('Add picker', picker); },
            removePicker: async (id) => { console.log('Remove picker', id); },
            updatePicker: async (id, updates) => { console.log('Update picker', id, updates); },
            unassignUser: async (id) => { console.log('Unassign user', id); }
        }),
        {
            name: 'harvest-pro-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
