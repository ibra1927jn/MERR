/**
 * settings.repository — thin wrapper sobre supabase para harvest_settings.
 * Usa vi.spyOn(supabase, 'from') (mismo patrón que batch-repos.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabase';
import { settingsRepository } from './settings.repository';

function mockChain(result: { data?: unknown; error?: unknown }) {
    const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        upsert: vi.fn(() => chain),
        single: vi.fn(() => chain),
        then: (onF?: (v: unknown) => unknown, onR?: (r: unknown) => unknown) =>
            Promise.resolve(result).then(onF, onR),
    };
    return chain;
}

let fromSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    vi.restoreAllMocks();
    fromSpy = vi.spyOn(supabase, 'from').mockReturnValue(mockChain({ data: [], error: null }) as never);
});

describe('settingsRepository.getByOrchardId', () => {
    it('returns data when OK', async () => {
        fromSpy.mockReturnValue(mockChain({ data: { piece_rate: 6.5, variety: 'Hayward' }, error: null }) as never);
        const res = await settingsRepository.getByOrchardId('o1');
        expect(res).toEqual({ piece_rate: 6.5, variety: 'Hayward' });
    });

    it('returns null when supabase returns error (e.g. PGRST116)', async () => {
        fromSpy.mockReturnValue(mockChain({ data: null, error: { code: 'PGRST116', message: 'no rows' } }) as never);
        const res = await settingsRepository.getByOrchardId('o1');
        expect(res).toBeNull();
    });

    it('hits from("harvest_settings")', async () => {
        fromSpy.mockReturnValue(mockChain({ data: { piece_rate: 5 }, error: null }) as never);
        await settingsRepository.getByOrchardId('orchard-42');
        expect(fromSpy).toHaveBeenCalledWith('harvest_settings');
    });
});

describe('settingsRepository.upsert', () => {
    it('completes without throw when supabase returns no error', async () => {
        fromSpy.mockReturnValue(mockChain({ data: null, error: null }) as never);
        await expect(settingsRepository.upsert('o1', { piece_rate: 7 })).resolves.not.toThrow();
    });

    it('throws when supabase returns error', async () => {
        fromSpy.mockReturnValue(mockChain({ data: null, error: { message: 'conflict' } }) as never);
        await expect(settingsRepository.upsert('o1', { piece_rate: 7 })).rejects.toBeTruthy();
    });

    it('passes orchard_id + updates to upsert()', async () => {
        const chain = mockChain({ data: null, error: null });
        fromSpy.mockReturnValue(chain as never);
        await settingsRepository.upsert('o1', { piece_rate: 7, min_wage_rate: 24 });
        expect((chain.upsert as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
            { orchard_id: 'o1', piece_rate: 7, min_wage_rate: 24 },
            { onConflict: 'orchard_id' },
        );
    });
});
