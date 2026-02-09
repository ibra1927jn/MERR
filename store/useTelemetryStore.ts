import { create } from 'zustand';
import { TelemetryStore } from '../types/store';

export const useTelemetryStore = create<TelemetryStore>((set) => ({
    events: [],

    addEvent: (type: string, payload: any) => set((state) => ({
        events: [{ type, payload, timestamp: Date.now() }, ...state.events].slice(0, 100)
    })),

    clearEvents: () => set({ events: [] })
}));
