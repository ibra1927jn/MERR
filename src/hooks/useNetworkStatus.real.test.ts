/**
 * useNetworkStatus — renderHook() tests for online/offline detection
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from './useNetworkStatus';

describe('useNetworkStatus', () => {
    it('detects initial online state', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        const { result } = renderHook(() => useNetworkStatus());
        expect(result.current.isOnline).toBe(true);
    });

    it('detects initial offline state', () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        const { result } = renderHook(() => useNetworkStatus());
        expect(result.current.isOnline).toBe(false);
    });

    it('transitions to offline on "offline" event', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        const { result } = renderHook(() => useNetworkStatus());

        act(() => {
            window.dispatchEvent(new Event('offline'));
        });

        expect(result.current.isOnline).toBe(false);
    });

    it('transitions back to online on "online" event', () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        const { result } = renderHook(() => useNetworkStatus());

        // Go offline first
        act(() => { window.dispatchEvent(new Event('offline')); });
        // Then come back online
        act(() => { window.dispatchEvent(new Event('online')); });

        expect(result.current.isOnline).toBe(true);
    });

    it('sets wasOffline=true after offline→online transition', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        const { result } = renderHook(() => useNetworkStatus());

        // Go offline
        act(() => { window.dispatchEvent(new Event('offline')); });
        // Come back online
        act(() => { window.dispatchEvent(new Event('online')); });

        expect(result.current.wasOffline).toBe(true);
    });

    it('clearWasOffline resets the flag', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        const { result } = renderHook(() => useNetworkStatus());

        // Trigger offline→online
        act(() => { window.dispatchEvent(new Event('offline')); });
        act(() => { window.dispatchEvent(new Event('online')); });
        expect(result.current.wasOffline).toBe(true);

        // Clear it
        act(() => { result.current.clearWasOffline(); });
        expect(result.current.wasOffline).toBe(false);
    });

    it('lastOnline is set when online', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
        const { result } = renderHook(() => useNetworkStatus());
        expect(result.current.lastOnline).toBe(1700000000000);
        vi.restoreAllMocks();
    });

    it('lastOnline is null when initially offline', () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        const { result } = renderHook(() => useNetworkStatus());
        expect(result.current.lastOnline).toBeNull();
    });
});
