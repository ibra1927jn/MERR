/**
 * useScanRateLimit — renderHook() tests for smart rate limiting
 *
 * Logic:
 * - Same code within 3s → BLOCK (trembling hand)
 * - Different code within 500ms → DEBOUNCE (schedule after gap)
 * - Otherwise → ACCEPT
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { useScanRateLimit } from './useScanRateLimit';

describe('useScanRateLimit', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Mock navigator.vibrate
        Object.defineProperty(navigator, 'vibrate', { value: vi.fn(), configurable: true });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('accepts first scan immediately', () => {
        const onScan = vi.fn();
        const { result } = renderHook(() => useScanRateLimit(onScan));

        act(() => { result.current.handleScan('CODE-A'); });

        expect(onScan).toHaveBeenCalledWith('CODE-A');
        expect(onScan).toHaveBeenCalledTimes(1);
    });

    it('blocks same code within cooldown (trembling hand)', () => {
        const onScan = vi.fn();
        const { result } = renderHook(() => useScanRateLimit(onScan, { sameScanCooldownMs: 3000 }));

        act(() => {
            result.current.handleScan('CODE-A');
        });
        expect(onScan).toHaveBeenCalledTimes(1);

        // Same code 100ms later → BLOCKED
        act(() => { vi.advanceTimersByTime(100); });
        act(() => { result.current.handleScan('CODE-A'); });
        expect(onScan).toHaveBeenCalledTimes(1); // Still 1
    });

    it('allows same code after cooldown expires', () => {
        const onScan = vi.fn();
        const { result } = renderHook(() => useScanRateLimit(onScan, { sameScanCooldownMs: 3000 }));

        act(() => { result.current.handleScan('CODE-A'); });
        // Wait 3001ms
        act(() => { vi.advanceTimersByTime(3001); });
        act(() => { result.current.handleScan('CODE-A'); });

        expect(onScan).toHaveBeenCalledTimes(2);
    });

    it('debounces different code within globalDebounceMs', () => {
        const onScan = vi.fn();
        const { result } = renderHook(() => useScanRateLimit(onScan, { globalDebounceMs: 500 }));

        act(() => { result.current.handleScan('CODE-A'); });
        expect(onScan).toHaveBeenCalledTimes(1);

        // Different code 200ms later → DEBOUNCED
        act(() => { vi.advanceTimersByTime(200); });
        act(() => { result.current.handleScan('CODE-B'); });
        expect(onScan).toHaveBeenCalledTimes(1); // Not yet

        // After remaining 300ms → fires
        act(() => { vi.advanceTimersByTime(300); });
        expect(onScan).toHaveBeenCalledTimes(2);
        expect(onScan).toHaveBeenCalledWith('CODE-B');
    });

    it('accepts different code after debounce period', () => {
        const onScan = vi.fn();
        const { result } = renderHook(() => useScanRateLimit(onScan, { globalDebounceMs: 500 }));

        act(() => { result.current.handleScan('CODE-A'); });
        act(() => { vi.advanceTimersByTime(600); });
        act(() => { result.current.handleScan('CODE-B'); });

        expect(onScan).toHaveBeenCalledTimes(2);
    });

    it('triggers haptic vibration on acceptance', () => {
        const onScan = vi.fn();
        const vibrateMock = vi.fn();
        Object.defineProperty(navigator, 'vibrate', { value: vibrateMock, configurable: true });

        const { result } = renderHook(() => useScanRateLimit(onScan));
        act(() => { result.current.handleScan('CODE-A'); });

        expect(vibrateMock).toHaveBeenCalledWith([200]);
    });

    it('triggers rejection vibration on duplicate block', () => {
        const onScan = vi.fn();
        const vibrateMock = vi.fn();
        Object.defineProperty(navigator, 'vibrate', { value: vibrateMock, configurable: true });

        const { result } = renderHook(() => useScanRateLimit(onScan));
        act(() => { result.current.handleScan('CODE-A'); });
        vibrateMock.mockClear();

        act(() => { vi.advanceTimersByTime(100); });
        act(() => { result.current.handleScan('CODE-A'); }); // Duplicate
        expect(vibrateMock).toHaveBeenCalledWith([50, 50, 50]); // Triple buzz rejection
    });
});
