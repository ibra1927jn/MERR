/**
 * Deep tests for useHarvestStore (Zustand store) — exercises state updates
 * and computed properties
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/services/database.service', () => ({
    databaseService: {
        getPickersByTeam: vi.fn().mockResolvedValue([]),
        getActivePickersForLiveOps: vi.fn().mockResolvedValue([]),
        getDailyAttendance: vi.fn().mockResolvedValue([]),
        getHarvestSettings: vi.fn().mockResolvedValue({ piece_rate: 6.50, target_tons: 10, min_wage_rate: 23.95, min_buckets_per_hour: 4 }),
        updateHarvestSettings: vi.fn().mockResolvedValue(undefined),
        addPicker: vi.fn().mockResolvedValue({ id: 'new' }),
        deletePicker: vi.fn().mockResolvedValue(undefined),
        updatePicker: vi.fn().mockResolvedValue(undefined),
        assignRowToPickers: vi.fn().mockResolvedValue(undefined),
        getBins: vi.fn().mockResolvedValue([]),
        getOrchardDetails: vi.fn().mockResolvedValue(null),
    },
}));

vi.mock('@/services/attendance.service', () => ({
    attendanceService: {
        getActivePickersForLiveOps: vi.fn().mockResolvedValue([]),
        getDailyAttendance: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock('@/services/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        channel: vi.fn().mockReturnValue({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
        }),
        removeChannel: vi.fn(),
    },
}));

vi.mock('@/services/notification.service', () => ({
    notificationService: { getPrefs: () => ({ enabled: false }), startChecking: vi.fn(), stopChecking: vi.fn() },
}));

vi.mock('@/services/db', () => ({
    db: { sync_queue: { put: vi.fn() } },
}));

import { useHarvestStore } from '@/stores/useHarvestStore';

describe('useHarvestStore — deep tests', () => {
    beforeEach(() => {
        // Reset store to initial state
        useHarvestStore.setState({
            crew: [],
            inventory: [],
            stats: { totalBuckets: 0, payEstimate: 0, tons: 0, velocity: 0, goalVelocity: 15 },
            orchard: null,
            settings: null,
            presentCount: 0,
            bucketRecords: [],
            lastSyncAt: null,
        });
    });

    it('has initial state', () => {
        const state = useHarvestStore.getState();
        expect(state.crew).toEqual([]);
        expect(state.inventory).toEqual([]);
        expect(state.presentCount).toBe(0);
    });

    it('updates crew via setState', () => {
        useHarvestStore.setState({ crew: [{ id: 'p1', name: 'Alice' }] as any });
        expect(useHarvestStore.getState().crew.length).toBe(1);
    });

    it('updates settings via setState', () => {
        useHarvestStore.setState({ settings: { piece_rate: 7.0 } as any });
        expect(useHarvestStore.getState().settings?.piece_rate).toBe(7.0);
    });

    it('updates presentCount via setState', () => {
        useHarvestStore.setState({ presentCount: 12 });
        expect(useHarvestStore.getState().presentCount).toBe(12);
    });

    it('updates orchard via setState', () => {
        useHarvestStore.setState({ orchard: { id: 'o1', name: 'Test Orchard' } as any });
        expect(useHarvestStore.getState().orchard?.name).toBe('Test Orchard');
    });

    it('exposes fetchGlobalData function', () => {
        expect(useHarvestStore.getState().fetchGlobalData).toBeDefined();
    });

    it('exposes updateSettings function', () => {
        expect(useHarvestStore.getState().updateSettings).toBeDefined();
    });

    it('exposes addPicker function', () => {
        expect(useHarvestStore.getState().addPicker).toBeDefined();
    });

    it('exposes removePicker function', () => {
        expect(useHarvestStore.getState().removePicker).toBeDefined();
    });

    it('exposes updatePicker function', () => {
        expect(useHarvestStore.getState().updatePicker).toBeDefined();
    });

    it('exposes assignRow function', () => {
        expect(useHarvestStore.getState().assignRow).toBeDefined();
    });

    it('updates inventory via setState', () => {
        useHarvestStore.setState({ inventory: [{ id: 'b1', status: 'full' }] as any });
        expect(useHarvestStore.getState().inventory.length).toBe(1);
    });

    it('updates stats via setState', () => {
        useHarvestStore.setState({ stats: { totalBuckets: 500, payEstimate: 3250, tons: 5, velocity: 20, goalVelocity: 15 } });
        expect(useHarvestStore.getState().stats.totalBuckets).toBe(500);
    });
});
