/**
 * sticker.repository — thin wrapper sobre scanned_stickers con count queries.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabase';
import { stickerRepository } from './sticker.repository';

function mockChain(result: { data?: unknown; error?: unknown; count?: number | null }) {
    const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        insert: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        maybeSingle: vi.fn(() => chain),
        single: vi.fn(() => chain),
        then: (onF?: (v: unknown) => unknown, onR?: (r: unknown) => unknown) =>
            Promise.resolve(result).then(onF, onR),
    };
    return chain;
}

let fromSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    vi.restoreAllMocks();
    fromSpy = vi.spyOn(supabase, 'from').mockReturnValue(mockChain({ data: null, error: null }) as never);
});

describe('stickerRepository.findByCode', () => {
    it('devuelve data cuando existe', async () => {
        fromSpy.mockReturnValue(mockChain({ data: { id: 'st1' }, error: null }) as never);
        const res = await stickerRepository.findByCode('ABC-123');
        expect(res).toEqual({ id: 'st1' });
    });

    it('devuelve null cuando no existe (maybeSingle)', async () => {
        fromSpy.mockReturnValue(mockChain({ data: null, error: null }) as never);
        const res = await stickerRepository.findByCode('UNKNOWN');
        expect(res).toBeNull();
    });

    it('throws cuando hay error', async () => {
        fromSpy.mockReturnValue(mockChain({ data: null, error: { message: 'boom' } }) as never);
        await expect(stickerRepository.findByCode('X')).rejects.toBeTruthy();
    });
});

describe('stickerRepository.insert', () => {
    it('devuelve {data, error}', async () => {
        fromSpy.mockReturnValue(mockChain({ data: { id: 'st1' }, error: null }) as never);
        const res = await stickerRepository.insert({
            sticker_code: 'ABC',
            picker_id: 'p1',
            bin_id: 'b1',
        });
        expect(res.data).toEqual({ id: 'st1' });
    });

    it('propaga error sin lanzar', async () => {
        fromSpy.mockReturnValue(mockChain({ data: null, error: { message: 'duplicate' } }) as never);
        const res = await stickerRepository.insert({
            sticker_code: 'ABC',
            picker_id: 'p1',
            bin_id: 'b1',
        });
        expect(res.error).toMatchObject({ message: 'duplicate' });
    });
});

describe('stickerRepository count queries', () => {
    it('countByTeamLeader devuelve count number', async () => {
        fromSpy.mockReturnValue(mockChain({ count: 42 }) as never);
        const res = await stickerRepository.countByTeamLeader('tl1');
        expect(res).toBe(42);
    });

    it('countByTeamLeader devuelve 0 cuando count es null', async () => {
        fromSpy.mockReturnValue(mockChain({ count: null }) as never);
        expect(await stickerRepository.countByTeamLeader('tl1')).toBe(0);
    });

    it('countByTeamLeaderInRange con date range', async () => {
        fromSpy.mockReturnValue(mockChain({ count: 10 }) as never);
        const res = await stickerRepository.countByTeamLeaderInRange('tl1', '2026-04-01', '2026-04-18');
        expect(res).toBe(10);
    });

    it('countByPickerInRange', async () => {
        fromSpy.mockReturnValue(mockChain({ count: 5 }) as never);
        const res = await stickerRepository.countByPickerInRange('p1', '2026-04-01', '2026-04-18');
        expect(res).toBe(5);
    });
});
