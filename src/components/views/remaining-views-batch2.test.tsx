/**
 * Import-level tests for remaining view components
 * These views had no direct test file
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/stores/useHarvestStore', () => ({
    useHarvestStore: Object.assign(
        (selector?: any) => {
            const state = {
                crew: [], rows: [], rowAssignments: [], teams: [], teamLeaders: [],
                orchard: { id: 'o1', name: 'Test' }, bucketRecords: [],
                settings: { piece_rate: 6.5, min_wage_rate: 23.15 },
            };
            return typeof selector === 'function' ? selector(state) : state;
        },
        { getState: () => ({ crew: [], rows: [] }) }
    ),
}));
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'u1' }, appUser: { id: 'u1', role: 'manager', name: 'Mgr' }, orchardId: 'o1' }),
}));
vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/utils/nzst', () => ({
    todayNZST: () => '2026-03-10',
    nowNZST: () => '2026-03-10T12:00:00+13:00',
}));
vi.mock('@/services/supabase', () => ({
    supabase: { from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() },
}));

describe('Remaining view exports', () => {
    it('VelocityChart exports default', async () => {
        const mod = await import('./manager/VelocityChart');
        expect(mod.default).toBeDefined();
    });

    it('AnomalyDetectionView exports default', async () => {
        const mod = await import('./manager/AnomalyDetectionView');
        expect(mod.default).toBeDefined();
    });

    it('TeamsToolbar exports default', async () => {
        const mod = await import('./manager/teams/TeamsToolbar');
        expect(mod.default).toBeDefined();
    });

    it('SettingsFormComponents exports', async () => {
        const mod = await import('./manager/settings/SettingsFormComponents');
        expect(mod).toBeDefined();
    });
});
