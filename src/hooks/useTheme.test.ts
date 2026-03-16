/**
 * useTheme — Tests for dark mode toggle hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme', () => {
    const originalMatchMedia = window.matchMedia;
    let mockMediaQuery: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
        mockMediaQuery = {
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        };
        window.matchMedia = vi.fn().mockReturnValue(mockMediaQuery) as unknown as typeof window.matchMedia;
    });

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
    });

    it('defaults to system theme when no stored preference', () => {
        const { result } = renderHook(() => useTheme());
        expect(result.current.theme).toBe('system');
    });

    it('reads stored theme from localStorage', () => {
        localStorage.setItem('harvestpro-theme', 'dark');
        const { result } = renderHook(() => useTheme());
        expect(result.current.theme).toBe('dark');
    });

    it('setTheme updates state and localStorage', () => {
        const { result } = renderHook(() => useTheme());
        act(() => result.current.setTheme('dark'));
        expect(result.current.theme).toBe('dark');
        expect(localStorage.getItem('harvestpro-theme')).toBe('dark');
    });

    it('setTheme applies dark class to document', () => {
        const { result } = renderHook(() => useTheme());
        act(() => result.current.setTheme('dark'));
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('setTheme removes dark class when switching to light', () => {
        document.documentElement.classList.add('dark');
        const { result } = renderHook(() => useTheme());
        act(() => result.current.setTheme('light'));
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('toggleTheme switches from light to dark', () => {
        localStorage.setItem('harvestpro-theme', 'light');
        const { result } = renderHook(() => useTheme());
        act(() => result.current.toggleTheme());
        expect(result.current.theme).toBe('dark');
    });

    it('toggleTheme switches from dark to light', () => {
        localStorage.setItem('harvestpro-theme', 'dark');
        const { result } = renderHook(() => useTheme());
        act(() => result.current.toggleTheme());
        expect(result.current.theme).toBe('light');
    });

    it('isDark is true when theme is dark', () => {
        localStorage.setItem('harvestpro-theme', 'dark');
        const { result } = renderHook(() => useTheme());
        expect(result.current.isDark).toBe(true);
    });

    it('isDark is false when theme is light', () => {
        localStorage.setItem('harvestpro-theme', 'light');
        const { result } = renderHook(() => useTheme());
        expect(result.current.isDark).toBe(false);
    });

    it('isDark follows system when theme is system', () => {
        mockMediaQuery.matches = true; // system dark
        window.matchMedia = vi.fn().mockReturnValue(mockMediaQuery) as unknown as typeof window.matchMedia;
        const { result } = renderHook(() => useTheme());
        expect(result.current.isDark).toBe(true);
    });

    it('registers mediaQuery change listener', () => {
        renderHook(() => useTheme());
        expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('cleans up mediaQuery listener on unmount', () => {
        const { unmount } = renderHook(() => useTheme());
        unmount();
        expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
});
