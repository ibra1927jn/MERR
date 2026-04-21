/**
 * feedback.service — haptic vibration + beep wrapper.
 * Tests stubbeam navigator.vibrate y AudioContext para verificar llamadas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('feedbackService', () => {
    let vibrateSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vibrateSpy = vi.fn();
        Object.defineProperty(navigator, 'vibrate', {
            configurable: true,
            value: vibrateSpy,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('vibrate(pattern) llama navigator.vibrate con ese pattern', async () => {
        const { feedbackService } = await import('./feedback.service');
        feedbackService.vibrate([10, 20, 30]);
        expect(vibrateSpy).toHaveBeenCalledWith([10, 20, 30]);
    });

    it('vibrate() sin args usa default 200', async () => {
        const { feedbackService } = await import('./feedback.service');
        feedbackService.vibrate();
        expect(vibrateSpy).toHaveBeenCalledWith(200);
    });

    it('triggerSuccess dispara vibrate con pattern dos-pulsos', async () => {
        const { feedbackService } = await import('./feedback.service');
        feedbackService.triggerSuccess();
        expect(vibrateSpy).toHaveBeenCalledWith([100, 50, 100]);
    });

    it('triggerError dispara vibrate con pulso largo [400]', async () => {
        const { feedbackService } = await import('./feedback.service');
        feedbackService.triggerError();
        expect(vibrateSpy).toHaveBeenCalledWith([400]);
    });

    it('vibrate no crashea cuando navigator.vibrate no existe', async () => {
        Object.defineProperty(navigator, 'vibrate', {
            configurable: true,
            value: undefined,
        });
        const { feedbackService } = await import('./feedback.service');
        expect(() => feedbackService.vibrate(100)).not.toThrow();
    });

    it('beep no crashea aunque AudioContext esté ausente (jsdom)', async () => {
        // jsdom no provee AudioContext; beep debe degradar gracefully al no-op.
        const { feedbackService } = await import('./feedback.service');
        expect(() => feedbackService.beep('success')).not.toThrow();
        expect(() => feedbackService.beep('error')).not.toThrow();
        expect(() => feedbackService.beep('alert')).not.toThrow();
    });
});
