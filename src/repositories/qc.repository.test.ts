/**
 * qc.repository — thin wrapper sobre supabase para qc_inspections.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabase';
import { qcRepository } from './qc.repository';

function mockChain(result: { data?: unknown; error?: unknown }) {
    const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        insert: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
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

describe('qcRepository.insert', () => {
    it('devuelve {data, error} sin transformar', async () => {
        fromSpy.mockReturnValue(mockChain({ data: { id: 'q1', grade: 'A' }, error: null }) as never);
        const res = await qcRepository.insert({ picker_id: 'p1', grade: 'A' });
        expect(fromSpy).toHaveBeenCalledWith('qc_inspections');
        expect(res.data).toEqual({ id: 'q1', grade: 'A' });
        expect(res.error).toBeNull();
    });

    it('propaga error sin lanzar', async () => {
        fromSpy.mockReturnValue(mockChain({ data: null, error: { message: 'rls' } }) as never);
        const res = await qcRepository.insert({});
        expect(res.error).toMatchObject({ message: 'rls' });
    });
});

describe('qcRepository.getByOrchardAndDateRange', () => {
    it('devuelve array cuando OK', async () => {
        fromSpy.mockReturnValue(
            mockChain({ data: [{ id: 'q1' }, { id: 'q2' }], error: null }) as never,
        );
        const res = await qcRepository.getByOrchardAndDateRange('o1', '2026-04-01', '2026-04-18');
        expect(res).toHaveLength(2);
    });

    it('devuelve [] cuando data es null', async () => {
        fromSpy.mockReturnValue(mockChain({ data: null, error: null }) as never);
        const res = await qcRepository.getByOrchardAndDateRange('o1', 's', 'e');
        expect(res).toEqual([]);
    });

    it('throws cuando error', async () => {
        fromSpy.mockReturnValue(mockChain({ data: null, error: { message: 'timeout' } }) as never);
        await expect(
            qcRepository.getByOrchardAndDateRange('o1', 's', 'e'),
        ).rejects.toBeTruthy();
    });
});

describe('qcRepository.getByPicker', () => {
    it('devuelve array limitado', async () => {
        fromSpy.mockReturnValue(mockChain({ data: [{ id: 'q1' }], error: null }) as never);
        const res = await qcRepository.getByPicker('p1', 5);
        expect(res).toHaveLength(1);
    });

    it('default limit=20 cuando no se pasa', async () => {
        const chain = mockChain({ data: [], error: null });
        fromSpy.mockReturnValue(chain as never);
        await qcRepository.getByPicker('p1');
        expect((chain.limit as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(20);
    });

    it('throws cuando error', async () => {
        fromSpy.mockReturnValue(mockChain({ data: null, error: { message: 'fail' } }) as never);
        await expect(qcRepository.getByPicker('p1')).rejects.toBeTruthy();
    });
});
