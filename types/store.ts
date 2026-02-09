import { HarvestState, Picker, Bin, HarvestSettings, Role, AppUser } from '../types';

export interface HarvestStore extends HarvestState {
    // Actions
    setCrew: (crew: Picker[]) => void;
    updatePicker: (id: string, updates: Partial<Picker>) => void;
    setBins: (bins: Bin[]) => void;
    setSettings: (settings: HarvestSettings) => void;
    setSelectedBinId: (id: string | undefined) => void;

    // Real-time Sync Actions
    addBucketRecord: (record: any) => void;

    // Computed (Getters)
    getActiveCrew: () => Picker[];
}

export interface ProductionStore {
    scanHistory: Map<string, number>;
    scannedCodes: Set<string>;

    // Actions
    recordScan: (code: string) => void;
    isDuplicate: (code: string, debounceMs: number) => boolean;
    clearHistory: () => void;
}

export interface TelemetryStore {
    events: any[];
    addEvent: (type: string, payload: any) => void;
    clearEvents: () => void;
}
