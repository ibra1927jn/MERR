/**
 * useLogisticsHealth.test.ts — Tests para el hook de salud logística
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLogisticsHealth } from './useLogisticsHealth';

// Mock del store de cosecha — estado vacío por defecto
vi.mock('@/stores/useHarvestStore', () => ({
  useHarvestStore: vi.fn((selector) => {
    const state = {
      crew: [],
      bucketRecords: [],
      settings: {
        shift_start_time: '07:00',
        shift_end_time: '17:00',
        min_wage_rate: 23.95,
        piece_rate: 6.5,
        min_buckets_per_hour: 3,
        target_tons: 10,
      },
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock del hook de logística — datos vacíos por defecto
vi.mock('@/hooks/useLogistics', () => ({
  useLogistics: vi.fn(() => ({
    summary: { fullBins: 0, emptyBins: 0, activeTractors: 0, pendingRequests: 0, binsInTransit: 0 },
    tractors: [],
    bins: [],
    requests: [],
    history: [],
    isLoading: false,
    reload: vi.fn(),
  })),
}));

// Mock del logger para silenciar output en tests
vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe('useLogisticsHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sin crash con estado del store vacío', () => {
    expect(() => renderHook(() => useLogisticsHealth())).not.toThrow();
  });

  it('devuelve la forma correcta del objeto', () => {
    const { result } = renderHook(() => useLogisticsHealth());
    const data = result.current;

    expect(data).toHaveProperty('health');
    expect(data).toHaveProperty('backlogSeries');
    expect(data).toHaveProperty('avgPickup');
    expect(data).toHaveProperty('avgCycle');
    expect(data).toHaveProperty('runnerLeaderboard');
    expect(data).toHaveProperty('recentEvents');
    expect(data).toHaveProperty('isLoading');
  });

  it('health=green cuando backlog=0 y no hay runners', () => {
    const { result } = renderHook(() => useLogisticsHealth());

    expect(result.current.health).toBe('green');
  });

  it('isLoading refleja el estado de useLogistics', () => {
    const { result } = renderHook(() => useLogisticsHealth());

    // El mock devuelve isLoading=false
    expect(result.current.isLoading).toBe(false);
  });

  it('backlogSeries es un array', () => {
    const { result } = renderHook(() => useLogisticsHealth());

    expect(Array.isArray(result.current.backlogSeries)).toBe(true);
  });

  it('runnerLeaderboard es un array vacío con crew vacío', () => {
    const { result } = renderHook(() => useLogisticsHealth());

    expect(Array.isArray(result.current.runnerLeaderboard)).toBe(true);
    expect(result.current.runnerLeaderboard).toHaveLength(0);
  });

  it('recentEvents es un array vacío cuando no hay requests', () => {
    const { result } = renderHook(() => useLogisticsHealth());

    expect(Array.isArray(result.current.recentEvents)).toBe(true);
    expect(result.current.recentEvents).toHaveLength(0);
  });

  it('avgPickup y avgCycle son números', () => {
    const { result } = renderHook(() => useLogisticsHealth());

    expect(typeof result.current.avgPickup).toBe('number');
    expect(typeof result.current.avgCycle).toBe('number');
  });
});
