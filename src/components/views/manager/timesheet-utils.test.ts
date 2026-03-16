/**
 * timesheet-utils — Pure Function Tests
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { formatTimeForInput, formatTime, calculateHours, isAbnormal } from './timesheet-utils';

describe('timesheet-utils', () => {
    describe('formatTimeForInput', () => {
        it('formats ISO string to HH:MM pattern', () => {
            const result = formatTimeForInput('2026-03-07T09:30:00Z');
            expect(result).toMatch(/^\d{2}:\d{2}$/);
        });

        it('handles midnight correctly', () => {
            const result = formatTimeForInput('2026-03-07T00:00:00Z');
            expect(result).toMatch(/^\d{2}:\d{2}$/);
        });
    });

    describe('formatTime', () => {
        it('returns dash for null', () => {
            expect(formatTime(null)).toBe('—');
        });

        it('formats valid ISO string to a non-dash value', () => {
            const result = formatTime('2026-03-07T14:30:00Z');
            expect(result).toBeTruthy();
            expect(result).not.toBe('—');
        });
    });

    describe('calculateHours', () => {
        it('returns null when no check-in', () => {
            expect(calculateHours(null, null)).toBeNull();
        });

        it('calculates 8 hours between 07:00 and 15:00', () => {
            expect(calculateHours('2026-03-07T07:00:00Z', '2026-03-07T15:00:00Z')).toBe(8);
        });

        it('handles partial hours', () => {
            expect(calculateHours('2026-03-07T07:00:00Z', '2026-03-07T10:30:00Z')).toBe(3.5);
        });

        it('uses now as end when checkOut is null', () => {
            const hours = calculateHours('2026-03-07T07:00:00Z', null);
            expect(hours).toBeGreaterThan(0);
        });
    });

    describe('isAbnormal', () => {
        it('returns false for null', () => {
            expect(isAbnormal(null)).toBe(false);
        });

        it('returns false for normal hours', () => {
            expect(isAbnormal(8)).toBe(false);
            expect(isAbnormal(12)).toBe(false);
        });

        it('returns true for > 12 hours', () => {
            expect(isAbnormal(13)).toBe(true);
        });

        it('returns true for negative hours', () => {
            expect(isAbnormal(-1)).toBe(true);
        });
    });
});
