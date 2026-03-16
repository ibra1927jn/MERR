/**
 * useGatewayStatus — Tests for gateway degradation hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Track listener
type EventCallback = (event: { type: string; message: string }) => void;
let activeListener: EventCallback | null = null;
const mockUnsubscribe = vi.fn();

vi.mock('@/services/gateway.service', () => ({
    gatewayService: {
        onEvent: vi.fn((cb: EventCallback) => {
            activeListener = cb;
            return () => {
                activeListener = null;
                mockUnsubscribe();
            };
        }),
    },
}));

import { useGatewayStatus } from './useGatewayStatus';

function emitEvent(type: string, message: string) {
    if (activeListener) activeListener({ type, message });
}

describe('useGatewayStatus', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        activeListener = null;
        mockUnsubscribe.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts with non-degraded state', () => {
        const { result } = renderHook(() => useGatewayStatus());
        expect(result.current.isDegraded).toBe(false);
        expect(result.current.message).toBeNull();
        expect(result.current.type).toBeNull();
    });

    it('sets degraded state on degraded event', () => {
        const { result } = renderHook(() => useGatewayStatus());
        act(() => emitEvent('degraded', 'Connection unstable'));
        expect(result.current.isDegraded).toBe(true);
        expect(result.current.message).toBe('Connection unstable');
        expect(result.current.type).toBe('warning');
    });

    it('sets recovered state on recovered event', () => {
        const { result } = renderHook(() => useGatewayStatus());
        act(() => emitEvent('recovered', 'Connection restored'));
        expect(result.current.isDegraded).toBe(false);
        expect(result.current.message).toBe('Connection restored');
        expect(result.current.type).toBe('success');
    });

    it('sets error state on error event', () => {
        const { result } = renderHook(() => useGatewayStatus());
        act(() => emitEvent('error', 'Gateway error'));
        expect(result.current.isDegraded).toBe(true);
        expect(result.current.message).toBe('Gateway error');
        expect(result.current.type).toBe('error');
    });

    it('clearMessage resets message and type', () => {
        const { result } = renderHook(() => useGatewayStatus());
        act(() => emitEvent('degraded', 'Testing'));
        act(() => result.current.clearMessage());
        expect(result.current.message).toBeNull();
        expect(result.current.type).toBeNull();
    });

    it('auto-clears recovery message after 3 seconds', () => {
        const { result } = renderHook(() => useGatewayStatus());
        act(() => emitEvent('recovered', 'Restored'));
        expect(result.current.message).toBe('Restored');
        act(() => { vi.advanceTimersByTime(3000); });
        expect(result.current.message).toBeNull();
    });

    it('unsubscribes on unmount', () => {
        const { unmount } = renderHook(() => useGatewayStatus());
        unmount();
        expect(mockUnsubscribe).toHaveBeenCalled();
    });
});
