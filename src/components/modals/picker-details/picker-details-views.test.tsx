/**
 * Import-level tests for picker-details sub-views
 * Covers: ActivityHistoryView, PickerProfileView, QuickMessageView,
 *         RunnerProfileView, TeamLeaderProfileView, roleUtils
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/stores/useHarvestStore', () => ({
    useHarvestStore: Object.assign(
        (selector?: any) => {
            const state = { crew: [], bucketRecords: [], settings: {} };
            return typeof selector === 'function' ? selector(state) : state;
        },
        { getState: () => ({ crew: [] }) }
    ),
}));
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'u1' }, appUser: { id: 'u1', role: 'manager' } }),
}));
vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/services/supabase', () => ({
    supabase: { from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() },
}));

describe('Picker Details Sub-Views', () => {
    it('roleUtils exports functions', async () => {
        const mod = await import('./roleUtils');
        expect(mod).toBeDefined();
    });

    it('PickerProfileView exports default', async () => {
        const mod = await import('./PickerProfileView');
        expect(mod.default).toBeDefined();
    });

    it('ActivityHistoryView exports default', async () => {
        const mod = await import('./ActivityHistoryView');
        expect(mod.default).toBeDefined();
    });

    it('QuickMessageView exports default', async () => {
        const mod = await import('./QuickMessageView');
        expect(mod.default).toBeDefined();
    });

    it('RunnerProfileView exports default', async () => {
        const mod = await import('./RunnerProfileView');
        expect(mod.default).toBeDefined();
    });

    it('TeamLeaderProfileView exports default', async () => {
        const mod = await import('./TeamLeaderProfileView');
        expect(mod.default).toBeDefined();
    });
});
