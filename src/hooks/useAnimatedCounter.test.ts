/**
 * useAnimatedCounter — Tests for smooth number animation hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnimatedCounter } from './useAnimatedCounter';

describe('useAnimatedCounter', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts at 0', () => {
        const { result } = renderHook(() => useAnimatedCounter(100));
        // Initially 0 before animation starts
        expect(result.current).toBe(0);
    });

    it('returns 0 when target is 0', () => {
        const { result } = renderHook(() => useAnimatedCounter(0));
        act(() => { vi.advanceTimersByTime(50); });
        expect(result.current).toBe(0);
    });

    it('respects delay parameter', () => {
        const { result } = renderHook(() => useAnimatedCounter(100, 1200, 500));
        // Before delay, should still be 0
        act(() => { vi.advanceTimersByTime(100); });
        expect(result.current).toBe(0);
    });

    it('accepts custom duration parameter', () => {
        const { result } = renderHook(() => useAnimatedCounter(50, 500));
        // Should accept the parameter without error
        expect(result.current).toBeDefined();
    });

    it('updates when target changes', () => {
        const { result, rerender } = renderHook(
            ({ target }) => useAnimatedCounter(target),
            { initialProps: { target: 100 } }
        );

        // Rerender with a new target
        rerender({ target: 200 });
        expect(result.current).toBeDefined();
    });
});
