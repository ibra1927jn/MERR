/**
 * settingsSlice — Tests for initial state + optimistic mutations
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/repositories/settings.repository', () => ({
    settingsRepository: { upsert: vi.fn().mockResolvedValue({}) },
}));
vi.mock('@/services/audit.service', () => ({
    auditService: { logAudit: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { createSettingsSlice, defaultSettings } from './settingsSlice';

function makeSlice(initial: Record<string, unknown> = {}) {
    const store: Record<string, unknown> = {
        settings: { ...defaultSettings },
        orchard: { id: 'o1' },
        currentUser: { id: 'u1' },
        ...initial,
    };
    const setSpy = vi.fn((updater: unknown) => {
        const patch = typeof updater === 'function' ? updater(store) : updater;
        Object.assign(store, patch);
    });
    const slice = createSettingsSlice(setSpy as never, (() => store) as never, {} as never);
    return { slice, store, setSpy };
}

describe('settingsSlice', () => {
    it('exports NZ-compliant defaults', () => {
        expect(defaultSettings.min_wage_rate).toBe(23.15);
        expect(defaultSettings.piece_rate).toBe(6.50);
        expect(defaultSettings.min_buckets_per_hour).toBe(3.6);
        expect(defaultSettings.target_tons).toBe(100);
    });

    it('initial slice matches defaultSettings', () => {
        const { slice } = makeSlice();
        expect(slice.settings).toEqual(defaultSettings);
    });

    it('exposes updateSettings method', () => {
        const { slice } = makeSlice();
        expect(typeof slice.updateSettings).toBe('function');
    });

    it('updateSettings calls set() with merged result', () => {
        const { slice, setSpy } = makeSlice();
        // Don't await — just trigger the synchronous set() call
        slice.updateSettings({ piece_rate: 7.00 });
        expect(setSpy).toHaveBeenCalled();
        // Verify the updater produces correct merge
        const updater = setSpy.mock.calls[0][0] as (s: Record<string, unknown>) => Record<string, { piece_rate: number; min_wage_rate: number; target_tons: number }>;
        const result = updater({ settings: { ...defaultSettings } });
        expect(result.settings.piece_rate).toBe(7.00);
        expect(result.settings.min_wage_rate).toBe(23.15); // preserved
        expect(result.settings.target_tons).toBe(100); // preserved
    });

    it('updateSettings does nothing without orchard', async () => {
        const { slice, setSpy } = makeSlice({ orchard: null });
        await slice.updateSettings({ piece_rate: 99 });
        expect(setSpy).not.toHaveBeenCalled();
    });
});
