/**
 * Tests para useVelocityDrilldown
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { DrilldownData } from '@/services/harvestMetrics/drilldown';

// vi.mock se eleva al tope del archivo — el factory no puede referenciar variables externas
vi.mock('@/services/harvestMetrics/drilldown', () => ({
    drilldownForHour: vi.fn().mockReturnValue({
        hourLabel: '08:00–09:00',
        slotStartMs: 1_000_000,
        slotEndMs: 1_003_600,
        totalBins: 5,
        pickers: [
            { pickerId: 'p1', pickerName: 'Alice', bins: 3, prevHourBins: 2, trendVsPrevHour: 1 },
            { pickerId: 'p2', pickerName: 'Bob', bins: 2, prevHourBins: 3, trendVsPrevHour: -1 },
        ],
    }),
}));

import { useVelocityDrilldown } from './useVelocityDrilldown';

describe('useVelocityDrilldown', () => {
    it('arranca cerrado con drilldownData null', () => {
        const { result } = renderHook(() => useVelocityDrilldown([], []));
        expect(result.current.isOpen).toBe(false);
        expect(result.current.drilldownData).toBeNull();
    });

    it('open() abre el panel y expone drilldownData', () => {
        const { result } = renderHook(() => useVelocityDrilldown([], []));
        act(() => {
            result.current.open(1_000_000, 1_003_600, '08:00–09:00');
        });
        expect(result.current.isOpen).toBe(true);
        expect(result.current.drilldownData?.hourLabel).toBe('08:00–09:00');
        expect(result.current.drilldownData?.totalBins).toBe(5);
    });

    it('close() cierra el panel', () => {
        const { result } = renderHook(() => useVelocityDrilldown([], []));
        act(() => { result.current.open(1_000_000, 1_003_600, '08:00–09:00'); });
        act(() => { result.current.close(); });
        expect(result.current.isOpen).toBe(false);
    });

    it('open() con slot distinto actualiza drilldownData', async () => {
        const { drilldownForHour } = await import('@/services/harvestMetrics/drilldown');
        const mock = vi.mocked(drilldownForHour);

        const { result } = renderHook(() => useVelocityDrilldown([], []));

        act(() => { result.current.open(1_000_000, 1_003_600, '08:00–09:00'); });
        expect(mock).toHaveBeenCalledWith([], [], 1_000_000, 1_003_600, '08:00–09:00');

        const newData: DrilldownData = {
            hourLabel: '09:00–10:00',
            slotStartMs: 1_003_600,
            slotEndMs: 1_007_200,
            totalBins: 3,
            pickers: [],
        };
        mock.mockReturnValueOnce(newData);

        act(() => { result.current.open(1_003_600, 1_007_200, '09:00–10:00'); });
        expect(result.current.drilldownData?.hourLabel).toBe('09:00–10:00');
    });
});
