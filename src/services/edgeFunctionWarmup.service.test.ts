/**
 * edgeFunctionWarmup.service — ping periódico a 4 edge functions críticas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { edgeFunctionsRepository } from '@/repositories/edge-functions.repository';
import { edgeFunctionWarmupService } from './edgeFunctionWarmup.service';

beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

afterEach(() => {
    edgeFunctionWarmupService.stop();
    vi.useRealTimers();
});

describe('edgeFunctionWarmupService', () => {
    it('start() dispara ping inmediato a las 4 funciones críticas', async () => {
        const invokeSpy = vi.spyOn(edgeFunctionsRepository, 'invoke').mockResolvedValue({
            data: null,
            error: null,
        });

        edgeFunctionWarmupService.start();
        // Dejar microtasks drenar
        await vi.advanceTimersByTimeAsync(0);

        expect(invokeSpy).toHaveBeenCalledWith('manage-attendance', { _warmup: true });
        expect(invokeSpy).toHaveBeenCalledWith('record-bucket', { _warmup: true });
        expect(invokeSpy).toHaveBeenCalledWith('calculate-payroll', { _warmup: true });
        expect(invokeSpy).toHaveBeenCalledWith('check-compliance', { _warmup: true });
        expect(invokeSpy).toHaveBeenCalledTimes(4);
    });

    it('dispara ping cada 4min tras el start inmediato', async () => {
        const invokeSpy = vi.spyOn(edgeFunctionsRepository, 'invoke').mockResolvedValue({
            data: null,
            error: null,
        });

        edgeFunctionWarmupService.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(invokeSpy).toHaveBeenCalledTimes(4);

        // Avanzar 4 min → otra ronda de 4 calls
        await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
        expect(invokeSpy).toHaveBeenCalledTimes(8);

        // Y otros 4 min
        await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
        expect(invokeSpy).toHaveBeenCalledTimes(12);
    });

    it('start() es idempotente — no spawnea intervals duplicados', async () => {
        const invokeSpy = vi.spyOn(edgeFunctionsRepository, 'invoke').mockResolvedValue({
            data: null,
            error: null,
        });

        edgeFunctionWarmupService.start();
        edgeFunctionWarmupService.start();
        edgeFunctionWarmupService.start();
        await vi.advanceTimersByTimeAsync(0);

        // Sólo el primer start hizo pingAll inmediato
        expect(invokeSpy).toHaveBeenCalledTimes(4);
    });

    it('stop() cancela el interval', async () => {
        const invokeSpy = vi.spyOn(edgeFunctionsRepository, 'invoke').mockResolvedValue({
            data: null,
            error: null,
        });

        edgeFunctionWarmupService.start();
        await vi.advanceTimersByTimeAsync(0);
        edgeFunctionWarmupService.stop();

        await vi.advanceTimersByTimeAsync(10 * 60 * 1000); // 10 min — no debería pingar más

        expect(invokeSpy).toHaveBeenCalledTimes(4); // Sólo el inicial
    });

    it('skip completo cuando navigator.onLine === false', async () => {
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
        const invokeSpy = vi.spyOn(edgeFunctionsRepository, 'invoke').mockResolvedValue({
            data: null,
            error: null,
        });

        edgeFunctionWarmupService.start();
        await vi.advanceTimersByTimeAsync(0);

        expect(invokeSpy).not.toHaveBeenCalled();
    });

    it('swallowea errores del repo — siguiente ping sigue funcionando', async () => {
        const invokeSpy = vi.spyOn(edgeFunctionsRepository, 'invoke').mockRejectedValue(new Error('down'));

        edgeFunctionWarmupService.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(invokeSpy).toHaveBeenCalledTimes(4);
        // No throws al caller
    });
});
