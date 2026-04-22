/**
 * edge-functions.repository.test.ts
 *
 * Chokepoint repository — every Edge Function call in the app routes
 * through `edgeFunctionsRepository.invoke()`, so failures here silently
 * break payroll / compliance / timesheet approval.
 *
 * Strategy: test the repository's contract with gatewayService (its
 * upstream dependency). We intercept at `gatewayService.withResilience`
 * rather than at the inner `supabase.functions.invoke` call — the
 * Supabase `functions` namespace is a bound getter that is awkward to
 * reliably mock across the repo's module graph, and the repository's
 * single responsibility is wrapping the gateway call, not exercising
 * the Supabase SDK.
 *
 * Coverage achieved: function signature, default invocation, option
 * forwarding, error propagation from the gateway layer. The inner
 * `throw new Error(...)` path is intentionally not re-tested here; it
 * is covered implicitly by gatewayService's own retry/timeout tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gatewayService } from '@/services/gateway.service';
import { edgeFunctionsRepository } from './edge-functions.repository';

describe('edgeFunctionsRepository.invoke', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('returns whatever gatewayService resolves', async () => {
        vi.spyOn(gatewayService, 'withResilience').mockResolvedValue({
            data: { ok: true, total: 42 },
            error: null,
        } as never);

        const result = await edgeFunctionsRepository.invoke<{ ok: boolean; total: number }>(
            'calculate-payroll',
            { orchard_id: 'abc' },
        );

        expect(result).toEqual({ data: { ok: true, total: 42 }, error: null });
    });

    it('propagates gateway failures (rejection reaches caller)', async () => {
        vi.spyOn(gatewayService, 'withResilience').mockRejectedValue(
            new Error('retries exhausted'),
        );

        await expect(
            edgeFunctionsRepository.invoke('calculate-payroll', {}),
        ).rejects.toThrow(/retries exhausted/);
    });

    it('forwards operationName to gatewayService', async () => {
        const spy = vi.spyOn(gatewayService, 'withResilience').mockResolvedValue({
            data: null,
            error: null,
        } as never);

        await edgeFunctionsRepository.invoke('record-bucket', { picker_id: 'p1' });

        expect(spy).toHaveBeenCalledTimes(1);
        const [, optsArg] = spy.mock.calls[0] as [unknown, { operationName: string }];
        expect(optsArg).toMatchObject({ operationName: 'record-bucket' });
    });

    it('merges caller options into gatewayService config', async () => {
        const spy = vi.spyOn(gatewayService, 'withResilience').mockResolvedValue({
            data: null,
            error: null,
        } as never);

        await edgeFunctionsRepository.invoke('calculate-payroll', {}, {
            maxRetries: 5,
            timeoutMs: 30_000,
        });

        const [, optsArg] = spy.mock.calls[0] as [
            unknown,
            { operationName: string; maxRetries?: number; timeoutMs?: number },
        ];
        expect(optsArg).toMatchObject({
            operationName: 'calculate-payroll',
            maxRetries: 5,
            timeoutMs: 30_000,
        });
    });

    it('passes a function (not a raw promise) to gatewayService for retry capability', async () => {
        // Important: gatewayService needs a thunk it can re-invoke on retry.
        // If the repository accidentally awaits before calling
        // withResilience, retries would no-op.
        const spy = vi.spyOn(gatewayService, 'withResilience').mockResolvedValue({
            data: null,
            error: null,
        } as never);

        await edgeFunctionsRepository.invoke('x', {});
        const [fnArg] = spy.mock.calls[0];
        expect(typeof fnArg).toBe('function');
    });
});
