/**
 * setup.repository — thin wrapper sobre supabase inserts para orchards y
 * day_setups. Tests sólo validan que la query chain reciba los args
 * esperados y el resultado se propague sin transformar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeBuilder<T>(terminal: { data: T | null; error: unknown | null }) {
    const calls: { method: string; args: unknown[] }[] = [];
    const chain: Record<string, unknown> = {};
    for (const method of ['insert', 'select', 'single']) {
        chain[method] = vi.fn((...args: unknown[]) => {
            calls.push({ method, args });
            return chain;
        });
    }
    chain.then = (resolve: (v: unknown) => void) => Promise.resolve(terminal).then(resolve);
    return { chain, calls };
}

const fromMock = vi.fn();

vi.mock('@/services/supabase', () => ({
    supabase: {
        from: (...args: unknown[]) => fromMock(...args),
    },
}));

import { setupRepository } from './setup.repository';

describe('setupRepository.insertOrchard', () => {
    beforeEach(() => fromMock.mockReset());

    it('insert + select + single, devuelve {data, error}', async () => {
        const { chain, calls } = makeBuilder({ data: { id: 'o1', name: 'Farm A' }, error: null });
        fromMock.mockReturnValue(chain);

        const res = await setupRepository.insertOrchard({ name: 'Farm A' });
        expect(fromMock).toHaveBeenCalledWith('orchards');
        expect(calls.find((c) => c.method === 'insert')?.args[0]).toEqual({ name: 'Farm A' });
        expect(calls.some((c) => c.method === 'select')).toBe(true);
        expect(calls.some((c) => c.method === 'single')).toBe(true);
        expect(res.data).toEqual({ id: 'o1', name: 'Farm A' });
        expect(res.error).toBeNull();
    });

    it('propaga error sin lanzar', async () => {
        const { chain } = makeBuilder({ data: null, error: { message: 'duplicate key' } });
        fromMock.mockReturnValue(chain);
        const res = await setupRepository.insertOrchard({ name: 'Farm A' });
        expect(res.data).toBeNull();
        expect(res.error).toMatchObject({ message: 'duplicate key' });
    });
});

describe('setupRepository.insertDaySetup', () => {
    beforeEach(() => fromMock.mockReset());

    it('insert en day_setups + devuelve solo {error}', async () => {
        const { chain, calls } = makeBuilder({ data: null, error: null });
        fromMock.mockReturnValue(chain);

        const res = await setupRepository.insertDaySetup({ orchard_id: 'o1', date: '2026-04-18' });
        expect(fromMock).toHaveBeenCalledWith('day_setups');
        expect(calls[0]).toEqual({ method: 'insert', args: [{ orchard_id: 'o1', date: '2026-04-18' }] });
        expect(res).toEqual({ error: null });
    });
});
