import { create } from 'zustand';
import { ProductionStore } from '../types/store';

export const useProductionStore = create<ProductionStore>((set, get) => ({
    scanHistory: new Map<string, number>(),
    scannedCodes: new Set<string>(),

    recordScan: (code: string) => {
        const { scanHistory, scannedCodes } = get();
        const newHistory = new Map(scanHistory);
        const newScanned = new Set(scannedCodes);

        newHistory.set(code, Date.now());
        newScanned.add(code);

        set({ scanHistory: newHistory, scannedCodes: newScanned });
    },

    isDuplicate: (code: string, debounceMs: number) => {
        const { scanHistory, scannedCodes } = get();

        // Check session set first
        if (scannedCodes.has(code)) return true;

        // Check temporal debounce
        const lastScan = scanHistory.get(code);
        if (lastScan && (Date.now() - lastScan < debounceMs)) return true;

        return false;
    },

    clearHistory: () => set({
        scanHistory: new Map(),
        scannedCodes: new Set()
    })
}));
