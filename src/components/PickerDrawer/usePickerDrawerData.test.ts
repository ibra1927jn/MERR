/**
 * usePickerDrawerData — Tests
 *
 * Verifica que los datos de hoy vengan de useHarvestMetrics().perPicker
 * (misma fuente que Dashboard Top 10 y Analytics).
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePickerDrawerData } from './usePickerDrawerData';

// --- Mocks ---

vi.mock('@/stores/useHarvestStore', () => ({
    useHarvestStore: vi.fn(),
}));

vi.mock('@/hooks/useHarvestMetrics', () => ({
    useHarvestMetrics: vi.fn(),
}));

vi.mock('@/services/picker-history.service', () => ({
    pickerHistoryService: {
        getPickerHistory: vi.fn(),
    },
}));

vi.mock('@/utils/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useHarvestStore } from '@/stores/useHarvestStore';
import { useHarvestMetrics } from '@/hooks/useHarvestMetrics';
import { pickerHistoryService } from '@/services/picker-history.service';
import type { Picker } from '@/types';
import type { PickerMetrics } from '@/services/harvestMetrics';

// Helpers para construir mocks limpios por test
const mockPicker = (overrides: Partial<Picker> = {}): Picker => ({
    id: 'picker-uuid-1',
    picker_id: 'P001',
    name: 'Test Picker',
    avatar: 'T',
    current_row: 5,
    total_buckets_today: 12,
    hours: 4,
    status: 'active',
    safety_verified: true,
    qcStatus: [1, 1],
    role: 'picker',
    ...overrides,
});

const mockMetrics = (overrides: Partial<PickerMetrics> = {}): PickerMetrics => ({
    pickerId: 'picker-uuid-1',
    pickerName: 'Test Picker',
    bins: 12,
    hoursWorked: 4,
    earned: 120,
    pieceRateEarnings: 78,
    topUp: 42,
    costPerBin: 10,
    ...overrides,
});

function setupStoreMock(crew: Picker[] = [], settings = { min_wage_rate: 23.95, piece_rate: 6.5 }) {
    const mockUseHarvestStore = vi.mocked(useHarvestStore);
    mockUseHarvestStore.mockImplementation((selector: (s: unknown) => unknown) => {
        const state = {
            crew,
            settings,
            orchard: { id: 'orchard-1', name: 'Test Orchard' },
        };
        return selector(state);
    });
}

function setupMetricsMock(perPicker: PickerMetrics[] = []) {
    vi.mocked(useHarvestMetrics).mockReturnValue({
        perPicker,
        kpis: { totalBins: 0, totalEarned: 0, totalCost: 0, avgBinsPerPicker: 0, binsPerHour: 0, activePickers: 0 },
        perTeam: [],
        efficiency: [],
        projectedEndOfDay: 0,
        hoursElapsed: 0,
        now: new Date(),
    });
}

// ---

describe('usePickerDrawerData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(pickerHistoryService.getPickerHistory).mockResolvedValue(null);
    });

    it('returns today.empty=true when picker has no scans', () => {
        const picker = mockPicker();
        setupStoreMock([picker]);
        setupMetricsMock([]); // sin métricas para este picker

        const { result } = renderHook(() => usePickerDrawerData('picker-uuid-1'));

        expect(result.current.today.empty).toBe(true);
        expect(result.current.today.bins).toBe(0);
    });

    it('returns today.bins matching useHarvestMetrics perPicker for that picker', () => {
        const picker = mockPicker();
        setupStoreMock([picker]);
        setupMetricsMock([mockMetrics({ bins: 17 })]);

        const { result } = renderHook(() => usePickerDrawerData('picker-uuid-1'));

        expect(result.current.today.bins).toBe(17);
        expect(result.current.today.empty).toBe(false);
    });

    it('returns the correct picker from crew', () => {
        const picker = mockPicker({ name: 'Jane D.' });
        setupStoreMock([picker]);
        setupMetricsMock([]);

        const { result } = renderHook(() => usePickerDrawerData('picker-uuid-1'));

        expect(result.current.picker?.name).toBe('Jane D.');
    });

    it('returns role=picker for undefined role', () => {
        const picker = mockPicker({ role: undefined });
        setupStoreMock([picker]);
        setupMetricsMock([]);

        const { result } = renderHook(() => usePickerDrawerData('picker-uuid-1'));

        expect(result.current.role).toBe('picker');
    });

    it('returns role=team_leader when picker.role is team_leader', () => {
        const picker = mockPicker({ role: 'team_leader' });
        setupStoreMock([picker]);
        setupMetricsMock([]);

        const { result } = renderHook(() => usePickerDrawerData('picker-uuid-1'));

        expect(result.current.role).toBe('team_leader');
    });

    it('history starts null and isHistoryLoading starts false when pickerId is null', () => {
        setupStoreMock([]);
        setupMetricsMock([]);

        const { result } = renderHook(() => usePickerDrawerData(null));

        expect(result.current.history).toBeNull();
        expect(result.current.isHistoryLoading).toBe(false);
    });

    it('renders without crash when pickerId is null', () => {
        setupStoreMock([]);
        setupMetricsMock([]);

        expect(() => renderHook(() => usePickerDrawerData(null))).not.toThrow();
    });

    it('today.empty=false when picker has scans', () => {
        const picker = mockPicker();
        setupStoreMock([picker]);
        setupMetricsMock([mockMetrics({ bins: 5, hoursWorked: 2, earned: 40 })]);

        const { result } = renderHook(() => usePickerDrawerData('picker-uuid-1'));

        expect(result.current.today.empty).toBe(false);
        expect(result.current.today.bins).toBe(5);
        expect(result.current.today.hoursWorked).toBe(2);
        expect(result.current.today.earned).toBe(40);
    });
});
