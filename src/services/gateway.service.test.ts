import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gatewayService } from './gateway.service';

describe('gatewayService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        gatewayService._resetState();
    });

    // ═══════════════════════════════════════
    // classifyError
    // ═══════════════════════════════════════

    describe('classifyError', () => {
        it('classifies 504 as server/retryable', () => {
            const result = gatewayService.classifyError(new Error('HTTP 504 Gateway Timeout'));
            expect(result.type).toBe('server');
            expect(result.retryable).toBe(true);
            expect(result.status).toBe(504);
        });

        it('classifies 502 as server/retryable', () => {
            const result = gatewayService.classifyError(new Error('502 Bad Gateway'));
            expect(result.type).toBe('server');
            expect(result.retryable).toBe(true);
            expect(result.status).toBe(502);
        });

        it('classifies timeout (AbortError) as timeout/retryable', () => {
            const err = new DOMException('The operation was aborted', 'AbortError');
            const result = gatewayService.classifyError(err);
            expect(result.type).toBe('timeout');
            expect(result.retryable).toBe(true);
        });

        it('classifies fetch/network errors as network/retryable', () => {
            const result = gatewayService.classifyError(new Error('Failed to fetch'));
            expect(result.type).toBe('network');
            expect(result.retryable).toBe(true);
        });

        it('classifies 429 rate limit as server/retryable', () => {
            const result = gatewayService.classifyError(new Error('429 Rate limit exceeded'));
            expect(result.type).toBe('server');
            expect(result.retryable).toBe(true);
        });

        it('classifies 401 as auth/non-retryable', () => {
            const result = gatewayService.classifyError(new Error('401 Unauthorized'));
            expect(result.type).toBe('auth');
            expect(result.retryable).toBe(false);
        });

        it('classifies 403 as auth/non-retryable', () => {
            const result = gatewayService.classifyError(new Error('403 Forbidden'));
            expect(result.type).toBe('auth');
            expect(result.retryable).toBe(false);
        });

        it('classifies constraint violations as validation/non-retryable', () => {
            const result = gatewayService.classifyError(new Error('unique constraint violation'));
            expect(result.type).toBe('validation');
            expect(result.retryable).toBe(false);
        });

        it('classifies unknown errors as unknown/non-retryable', () => {
            const result = gatewayService.classifyError(new Error('something weird'));
            expect(result.type).toBe('unknown');
            expect(result.retryable).toBe(false);
        });

        it('handles non-Error objects with status', () => {
            const result = gatewayService.classifyError({ status: 504, message: 'timeout' });
            expect(result.type).toBe('server');
            expect(result.retryable).toBe(true);
        });
    });

    // ═══════════════════════════════════════
    // withResilience
    // ═══════════════════════════════════════

    describe('withResilience', () => {
        it('returns result on first successful attempt', async () => {
            const result = await gatewayService.withResilience(
                async () => ({ ok: true }),
                { operationName: 'test' }
            );
            expect(result).toEqual({ ok: true });
        });

        it('retries on retryable errors and succeeds', async () => {
            let attempts = 0;
            const result = await gatewayService.withResilience(
                async () => {
                    attempts++;
                    if (attempts < 3) throw new Error('502 Bad Gateway');
                    return { ok: true };
                },
                { operationName: 'test', maxRetries: 3, baseDelayMs: 10 }
            );
            expect(result).toEqual({ ok: true });
            expect(attempts).toBe(3);
        });

        it('throws after max retries exhausted', async () => {
            await expect(
                gatewayService.withResilience(
                    async () => { throw new Error('504 Gateway Timeout'); },
                    { operationName: 'test', maxRetries: 2, baseDelayMs: 10 }
                )
            ).rejects.toThrow('504 Gateway Timeout');
        });

        it('throws immediately on non-retryable errors', async () => {
            let attempts = 0;
            await expect(
                gatewayService.withResilience(
                    async () => {
                        attempts++;
                        throw new Error('401 Unauthorized');
                    },
                    { operationName: 'test', maxRetries: 3, baseDelayMs: 10 }
                )
            ).rejects.toThrow('401 Unauthorized');
            expect(attempts).toBe(1); // No retries
        });
    });

    // ═══════════════════════════════════════
    // Event System
    // ═══════════════════════════════════════

    describe('onEvent', () => {
        it('emits degraded and error events during retry failures', async () => {
            const events: string[] = [];
            const unsub = gatewayService.onEvent(e => events.push(e.type));

            try {
                await gatewayService.withResilience(
                    async () => { throw new Error('504 Gateway Timeout'); },
                    { operationName: 'test', maxRetries: 2, baseDelayMs: 10 }
                );
            } catch {
                // expected
            }

            unsub();
            expect(events).toContain('degraded');
            expect(events).toContain('error');
        });

        it('unsubscribe stops receiving events', () => {
            const events: string[] = [];
            const unsub = gatewayService.onEvent(e => events.push(e.type));
            unsub();

            gatewayService._emit('degraded', 'test');
            expect(events).toHaveLength(0);
        });
    });
});
