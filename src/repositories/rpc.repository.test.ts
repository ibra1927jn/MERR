/**
 * rpc.repository — wrapper thin para supabase.rpc. Tests confirmar que
 * los argumentos se pasan tal cual y la shape de retorno se preserva.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('@/services/supabase', () => ({
    supabase: {
        rpc: (...args: unknown[]) => rpcMock(...args),
    },
}));

import { rpcRepository } from './rpc.repository';

describe('rpcRepository.call', () => {
    beforeEach(() => rpcMock.mockReset());

    it('forwards functionName + params sin transformar', async () => {
        rpcMock.mockResolvedValue({ data: { ok: true }, error: null });
        const res = await rpcRepository.call('do_thing', { x: 1, y: 'z' });
        expect(rpcMock).toHaveBeenCalledWith('do_thing', { x: 1, y: 'z' });
        expect(res).toEqual({ data: { ok: true }, error: null });
    });

    it('propaga error objects', async () => {
        rpcMock.mockResolvedValue({ data: null, error: { code: '42501', message: 'denied' } });
        const res = await rpcRepository.call('secret_fn', {});
        expect(res.data).toBeNull();
        expect(res.error?.code).toBe('42501');
        expect(res.error?.message).toBe('denied');
    });

    it('typed generic T se respeta en data', async () => {
        type Row = { id: number; label: string };
        rpcMock.mockResolvedValue({ data: [{ id: 1, label: 'a' }] as Row[], error: null });
        const res = await rpcRepository.call<Row[]>('list_rows', { limit: 10 });
        expect(res.data?.[0]?.label).toBe('a');
    });
});
