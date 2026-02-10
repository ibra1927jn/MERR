import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { HarvestStore } from '../types/store';
import { Picker, Bin, HarvestSettings } from '../types';

export const useHarvestStore = create<HarvestStore>()(
    persist(
        (set, get) => ({
            // State
            orchard: null,
            currentUser: { name: '', role: null },
            crew: [],
            bins: [],
            notifications: [],
            settings: undefined,
            selectedBinId: undefined,
            bucketRecords: [],
            stats: {
                totalBuckets: 0,
                velocity: 0,
                binsFull: 0,
                payEstimate: 0,
                tons: 0,
                goalVelocity: 400
            },

            // Actions
            setCrew: (crew: Picker[]) => set({ crew }),

            updatePicker: (id: string, updates: Partial<Picker>) =>
                set((state) => ({
                    crew: state.crew.map((p) => (p.id === id ? { ...p, ...updates } : p))
                })),

            setBins: (bins: Bin[]) => set({ bins }),

            setSettings: (settings: HarvestSettings) => set({ settings }),

            setSelectedBinId: (id: string | undefined) => set({ selectedBinId: id }),

            addBucketRecord: (record: any) =>
                set((state) => ({
                    bucketRecords: [record, ...state.bucketRecords].slice(0, 50)
                })),

            getActiveCrew: () => {
                return get().crew;
            }
        }),
        {
            name: 'harvest-pro-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                settings: state.settings,
                selectedBinId: state.selectedBinId
            }), // Only persist critical UI state to localStorage; actual data is in Dexie
        }
    )
);
