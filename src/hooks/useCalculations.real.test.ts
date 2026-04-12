/**
 * useCalculations — Real renderHook() tests for NZ wage calculations
 *
 * Tests the actual hook with mocked store, verifying:
 * - Earnings calculation (piece rate × buckets)
 * - Minimum wage top-up (wage shield)
 * - Traffic light status (green/orange/red)
 * - isUnderMinimum detection
 * - bucketsPerHour rounding
 * - bucketsNeeded for remaining hours
 * - Configurable settings from store (min_wage_rate, piece_rate)
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock the store to return configurable settings
const mockSettings = { min_wage_rate: 23.95, piece_rate: 6.50 };

vi.mock('@/stores/useHarvestStore', () => ({
    useHarvestStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) => {
        const state = { settings: mockSettings };
        return selector(state);
    }),
}));

import { useCalculations } from './useCalculations';

describe('useCalculations (renderHook)', () => {
    // ── Earnings ──
    describe('earnings', () => {
        it('calculates piece rate earnings = buckets × piece_rate', () => {
            const { result } = renderHook(() => useCalculations({ buckets: 10, hours: 2 }));
            expect(result.current.earnings).toBe(65); // 10 × $6.50
        });

        it('0 buckets = $0 earnings', () => {
            const { result } = renderHook(() => useCalculations({ buckets: 0, hours: 4 }));
            expect(result.current.earnings).toBe(0);
        });

        it('large bucket count', () => {
            const { result } = renderHook(() => useCalculations({ buckets: 100, hours: 8 }));
            expect(result.current.earnings).toBe(650); // 100 × $6.50
        });
    });

    // ── Minimum Wage Top-Up (NZ Wage Shield) ──
    describe('top-up (wage shield)', () => {
        it('applies top-up when piece earnings < minimum guarantee', () => {
            // 2 buckets × $6.50 = $13 piece earnings
            // 4 hours × $23.95 = $95.80 minimum guarantee
            // Top-up = $95.80 - $13 = $82.80
            const { result } = renderHook(() => useCalculations({ buckets: 2, hours: 4 }));
            expect(result.current.topUp).toBe(82.8);
            expect(result.current.totalEarnings).toBe(95.8); // piece + top-up
        });

        it('no top-up when piece rate exceeds minimum', () => {
            // 20 buckets × $6.50 = $130 > $47.90 (2h × $23.95)
            const { result } = renderHook(() => useCalculations({ buckets: 20, hours: 2 }));
            expect(result.current.topUp).toBe(0);
            expect(result.current.totalEarnings).toBe(130);
        });

        it('0 hours = no top-up', () => {
            const { result } = renderHook(() => useCalculations({ buckets: 0, hours: 0 }));
            expect(result.current.topUp).toBe(0);
        });
    });

    // ── Traffic Light Status ──
    describe('status', () => {
        it('green when earning >110% of minimum wage', () => {
            // 5 buckets × $6.50 = $32.50/hour > $26.345 (110% of $23.95)
            const { result } = renderHook(() => useCalculations({ buckets: 5, hours: 1 }));
            expect(result.current.status).toBe('green');
        });

        it('red when below minimum wage', () => {
            // 2 buckets × $6.50 = $13/hour < $23.95
            const { result } = renderHook(() => useCalculations({ buckets: 2, hours: 1 }));
            expect(result.current.status).toBe('red');
        });

        it('orange when between minimum and 110%', () => {
            // Need hourly between $23.95 and $26.345
            // 4 buckets × $6.50 = $26/hour → green (just above 110%)
            // 3.7 × $6.50 = $24.05/hour → orange
            // Use 3 buckets in 0.8 hours: 3*6.50 / 0.8 = $24.375 → orange
            const { result } = renderHook(() => useCalculations({ buckets: 3, hours: 0.8 }));
            expect(result.current.status).toBe('orange');
        });

        it('orange when 0 hours (no data yet)', () => {
            const { result } = renderHook(() => useCalculations({ buckets: 50, hours: 0 }));
            expect(result.current.status).toBe('orange');
        });
    });

    // ── isUnderMinimum ──
    describe('isUnderMinimum', () => {
        it('true when rate below min_buckets_per_hour (≈3.685)', () => {
            // 2 buckets / 1 hour = 2 < 3.685
            const { result } = renderHook(() => useCalculations({ buckets: 2, hours: 1 }));
            expect(result.current.isUnderMinimum).toBe(true);
        });

        it('false when rate above threshold', () => {
            // 5 / 1 = 5 > 3.685
            const { result } = renderHook(() => useCalculations({ buckets: 5, hours: 1 }));
            expect(result.current.isUnderMinimum).toBe(false);
        });

        it('false when 0 hours (avoid division by zero)', () => {
            const { result } = renderHook(() => useCalculations({ buckets: 0, hours: 0 }));
            expect(result.current.isUnderMinimum).toBe(false);
        });
    });

    // ── Buckets Per Hour ──
    describe('bucketsPerHour', () => {
        it('calculates correctly', () => {
            const { result } = renderHook(() => useCalculations({ buckets: 10, hours: 2 }));
            expect(result.current.bucketsPerHour).toBe(5);
        });

        it('rounds to 1 decimal place', () => {
            // 10 / 3 = 3.333... → 3.3
            const { result } = renderHook(() => useCalculations({ buckets: 10, hours: 3 }));
            expect(result.current.bucketsPerHour).toBe(3.3);
        });

        it('0 when no hours', () => {
            const { result } = renderHook(() => useCalculations({ buckets: 10, hours: 0 }));
            expect(result.current.bucketsPerHour).toBe(0);
        });
    });

    // ── Buckets Needed ──
    describe('bucketsNeeded', () => {
        it('calculates remaining buckets for minimum wage', () => {
            // Total hours = 2 + 6 = 8
            // Need: ceil(23.95 * 8 / 6.50) = ceil(29.477) = 30
            // bucketsNeeded = max(0, 30 - 5) = 25
            const { result } = renderHook(() => useCalculations({ buckets: 5, hours: 2, hoursRemaining: 6 }));
            expect(result.current.bucketsNeeded).toBe(25);
        });

        it('0 when already exceeding minimum', () => {
            const { result } = renderHook(() => useCalculations({ buckets: 100, hours: 2, hoursRemaining: 0 }));
            expect(result.current.bucketsNeeded).toBe(0);
        });

        it('handles no remaining hours', () => {
            // Total = 4h, need ceil(23.95*4/6.50) = ceil(14.738) = 15, have 0
            const { result } = renderHook(() => useCalculations({ buckets: 0, hours: 4 }));
            expect(result.current.bucketsNeeded).toBe(15);
        });
    });

    // ── Hourly Earnings ──
    describe('hourlyEarnings', () => {
        it('piece rate earnings / hours', () => {
            // 10 × $6.50 / 2 = $32.50/hour
            const { result } = renderHook(() => useCalculations({ buckets: 10, hours: 2 }));
            expect(result.current.hourlyEarnings).toBe(32.5);
        });

        it('0 when no hours', () => {
            const { result } = renderHook(() => useCalculations({ buckets: 10, hours: 0 }));
            expect(result.current.hourlyEarnings).toBe(0);
        });
    });
});
