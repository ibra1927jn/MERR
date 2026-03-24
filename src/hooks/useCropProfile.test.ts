/**
 * Tests for useCropProfile hook
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/stores/useHarvestStore', () => ({
  useHarvestStore: (selector: (s: unknown) => unknown) =>
    selector({ settings: { crop_type: 'kiwifruit' } }),
}));

vi.mock('@/config/crop-profiles', () => ({
  getCropProfile: (type?: string) => ({
    type: type || 'kiwifruit',
    harvestUnit: 'tray',
    harvestUnitPlural: 'trays',
    containerName: 'bin',
    containerPlural: 'bins',
  }),
}));

import { useCropProfile } from './useCropProfile';

describe('useCropProfile', () => {
  it('returns crop profile from settings', () => {
    const { result } = renderHook(() => useCropProfile());
    expect(result.current.profile).toBeDefined();
    expect(result.current.cropType).toBe('kiwifruit');
  });

  it('returns convenience accessors', () => {
    const { result } = renderHook(() => useCropProfile());
    expect(result.current.unit).toBe('tray');
    expect(result.current.units).toBe('trays');
    expect(result.current.container).toBe('bin');
    expect(result.current.containers).toBe('bins');
  });
});
