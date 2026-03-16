/**
 * gateway.service — Deep functional tests
 * Targets: classifyError, withResilience, onEvent, _toError, _emit
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gatewayService } from './gateway.service';

describe('gatewayService', () => {
    beforeEach(() => {
        gatewayService._resetState();
    });

    // ── classifyError ──────────────────────────────────
    describe('classifyError', () => {
        it('classifies AbortError as timeout', () => {
            const err = new DOMException('aborted', 'AbortError');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('timeout');
            expect(classified.retryable).toBe(true);
        });

        it('classifies 504 as server error (retryable)', () => {
            const err = new Error('504 Gateway Timeout');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('server');
            expect(classified.status).toBe(504);
            expect(classified.retryable).toBe(true);
        });

        it('classifies 502 as server error', () => {
            const err = new Error('502 Bad Gateway');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('server');
            expect(classified.status).toBe(502);
            expect(classified.retryable).toBe(true);
        });

        it('classifies 503 as server error', () => {
            const err = new Error('503 Service Unavailable');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('server');
            expect(classified.retryable).toBe(true);
        });

        it('classifies rate limit (429) as retryable server error', () => {
            const err = new Error('429 rate limit exceeded');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('server');
            expect(classified.status).toBe(429);
            expect(classified.retryable).toBe(true);
        });

        it('classifies fetch error as network', () => {
            const err = new Error('fetch failed');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('network');
            expect(classified.retryable).toBe(true);
        });

        it('classifies network error as retryable', () => {
            const err = new Error('network error');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('network');
            expect(classified.retryable).toBe(true);
        });

        it('classifies ECONNREFUSED as network', () => {
            const err = new Error('ECONNREFUSED');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('network');
        });

        it('classifies DNS error as network', () => {
            const err = new Error('dns lookup failed');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('network');
        });

        it('classifies 401 as auth error (not retryable)', () => {
            const err = new Error('401 Unauthorized');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('auth');
            expect(classified.status).toBe(401);
            expect(classified.retryable).toBe(false);
        });

        it('classifies 403 as auth error (not retryable)', () => {
            const err = new Error('403 Forbidden');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('auth');
            expect(classified.status).toBe(403);
            expect(classified.retryable).toBe(false);
        });

        it('classifies 400 as validation error (not retryable)', () => {
            const err = new Error('400 Bad Request');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('validation');
            expect(classified.retryable).toBe(false);
        });

        it('classifies 422 as validation error', () => {
            const err = new Error('422 Unprocessable Entity');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('validation');
        });

        it('classifies constraint violation as validation', () => {
            const err = new Error('constraint violation on users');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('validation');
            expect(classified.retryable).toBe(false);
        });

        it('classifies invalid input as validation', () => {
            const err = new Error('invalid data format');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('validation');
        });

        it('classifies Supabase status object as server error', () => {
            const err = { status: 502, message: 'Bad Gateway' };
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('server');
            expect(classified.retryable).toBe(true);
        });

        it('classifies Supabase 429 status object', () => {
            const err = { status: 429, message: 'Rate limited' };
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('server');
            expect(classified.retryable).toBe(true);
        });

        it('classifies unknown error as non-retryable', () => {
            const err = new Error('something unexpected');
            const classified = gatewayService.classifyError(err);
            expect(classified.type).toBe('unknown');
            expect(classified.retryable).toBe(false);
        });

        it('classifies non-Error values as unknown', () => {
            const classified = gatewayService.classifyError('string error');
            expect(classified.type).toBe('unknown');
            expect(classified.message).toBe('string error');
        });
    });

    // ── onEvent / _emit ──────────────────────────────────
    describe('events', () => {
        it('onEvent subscribes and receives events', () => {
            const listener = vi.fn();
            gatewayService.onEvent(listener);
            gatewayService._emit('degraded', 'test message');
            expect(listener).toHaveBeenCalledWith({ type: 'degraded', message: 'test message', error: undefined });
        });

        it('onEvent returns unsubscribe function', () => {
            const listener = vi.fn();
            const unsub = gatewayService.onEvent(listener);
            unsub();
            gatewayService._emit('recovered', 'test');
            expect(listener).not.toHaveBeenCalled();
        });

        it('_emit catches listener errors silently', () => {
            const badListener = vi.fn(() => { throw new Error('oops'); });
            gatewayService.onEvent(badListener);
            // Should not throw
            expect(() => gatewayService._emit('error', 'test')).not.toThrow();
        });
    });

    // ── _toError ──────────────────────────────────────────
    describe('_toError', () => {
        it('converts GatewayError to standard Error', () => {
            const err = gatewayService._toError({
                type: 'timeout', message: 'timed out', retryable: true,
            });
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toBe('timed out');
            expect(err.name).toBe('GatewayError:timeout');
        });
    });

    // ── withResilience ────────────────────────────────────
    describe('withResilience', () => {
        it('returns result on success', async () => {
            const result = await gatewayService.withResilience(async () => 'ok');
            expect(result).toBe('ok');
        });

        it('retries on retryable errors and eventually succeeds', async () => {
            let attempts = 0;
            const result = await gatewayService.withResilience(
                async () => {
                    attempts++;
                    if (attempts < 3) throw new Error('504 Gateway Timeout');
                    return 'success';
                },
                { maxRetries: 3, baseDelayMs: 1 }
            );
            expect(result).toBe('success');
            expect(attempts).toBe(3);
        });

        it('throws immediately on non-retryable errors', async () => {
            await expect(
                gatewayService.withResilience(
                    async () => { throw new Error('403 Forbidden'); },
                    { maxRetries: 3, baseDelayMs: 1 }
                )
            ).rejects.toThrow();
        });

        it('throws after exhausting retries', async () => {
            await expect(
                gatewayService.withResilience(
                    async () => { throw new Error('502 Bad Gateway'); },
                    { maxRetries: 1, baseDelayMs: 1 }
                )
            ).rejects.toThrow();
        });

        it('emits degraded event on retryable failure', async () => {
            const listener = vi.fn();
            gatewayService.onEvent(listener);
            try {
                await gatewayService.withResilience(
                    async () => { throw new Error('502 Bad Gateway'); },
                    { maxRetries: 1, baseDelayMs: 1 }
                );
            } catch { /* expected */ }
            const degradedCall = listener.mock.calls.find((c: any) => c[0].type === 'degraded');
            expect(degradedCall).toBeDefined();
        });

        it('emits recovered event after recovery', async () => {
            const listener = vi.fn();
            gatewayService.onEvent(listener);
            let attempts = 0;
            await gatewayService.withResilience(
                async () => {
                    attempts++;
                    if (attempts < 2) throw new Error('502 error');
                    return 'ok';
                },
                { maxRetries: 3, baseDelayMs: 1 }
            );
            const recoveredCall = listener.mock.calls.find((c: any) => c[0].type === 'recovered');
            expect(recoveredCall).toBeDefined();
        });

        it('uses custom operation name in error messages', async () => {
            const listener = vi.fn();
            gatewayService.onEvent(listener);
            try {
                await gatewayService.withResilience(
                    async () => { throw new Error('502'); },
                    { maxRetries: 0, baseDelayMs: 1, operationName: 'Custom Op' }
                );
            } catch { /* expected */ }
            const errorCall = listener.mock.calls.find((c: any) => c[0].type === 'error');
            expect(errorCall?.[0].message).toContain('Custom Op');
        });
    });
});
