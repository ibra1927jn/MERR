/**
 * usePickerStatus — renderHook() tests for picker status calculation
 *
 * Verifies: status labels, hourly rate, bucketsPerHour, isBelowMinimum, earnings
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePickerStatus } from './usePickerStatus';

describe('usePickerStatus', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns "Break" for on_break status', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-14T12:00:00'));
        const { result } = renderHook(() =>
            usePickerStatus({ buckets: 10, startTime: '07:00', baseStatus: 'on_break' })
        );
        expect(result.current.status).toBe('Break');
    });

    it('returns "Off Duty" for inactive', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-14T12:00:00'));
        const { result } = renderHook(() =>
            usePickerStatus({ buckets: 10, startTime: '07:00', baseStatus: 'inactive' })
        );
        expect(result.current.status).toBe('Off Duty');
    });

    it('returns "Off Duty" for off_duty', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-14T12:00:00'));
        const { result } = renderHook(() =>
            usePickerStatus({ buckets: 10, startTime: '07:00', baseStatus: 'off_duty' })
        );
        expect(result.current.status).toBe('Off Duty');
    });

    it('returns "Below Minimum" when bucket rate is too low', () => {
        vi.useFakeTimers();
        // 12:00 - 07:00 = 5 hours worked
        vi.setSystemTime(new Date('2026-03-14T12:00:00'));
        // 2 buckets / 5 hours = 0.4 BPH < 3.615 (MIN_BUCKETS_PER_HOUR)
        const { result } = renderHook(() =>
            usePickerStatus({ buckets: 2, startTime: '07:00', baseStatus: 'active' })
        );
        expect(result.current.status).toBe('Below Minimum');
        expect(result.current.isBelowMinimum).toBe(true);
    });

    it('returns "Active" when performing well', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-14T12:00:00'));
        // 50 buckets / 5 hours = 10 BPH > 3.615
        const { result } = renderHook(() =>
            usePickerStatus({ buckets: 50, startTime: '07:00', baseStatus: 'active' })
        );
        expect(result.current.status).toBe('Active');
        expect(result.current.isBelowMinimum).toBe(false);
    });

    it('calculates earnings = buckets × PIECE_RATE ($6.50)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-14T12:00:00'));
        const { result } = renderHook(() =>
            usePickerStatus({ buckets: 10, startTime: '07:00' })
        );
        expect(result.current.earnings).toBe(65); // 10 × $6.50
    });

    it('rounds bucketsPerHour to 1 decimal', () => {
        vi.useFakeTimers();
        // 10:00 - 07:00 = 3 hours
        vi.setSystemTime(new Date('2026-03-14T10:00:00'));
        // 10 / 3 = 3.333... → 3.3
        const { result } = renderHook(() =>
            usePickerStatus({ buckets: 10, startTime: '07:00' })
        );
        expect(result.current.bucketsPerHour).toBe(3.3);
    });

    it('calculates hoursWorked from startTime', () => {
        vi.useFakeTimers();
        // 12:00 - 07:00 = 5 hours
        vi.setSystemTime(new Date('2026-03-14T12:00:00'));
        const { result } = renderHook(() =>
            usePickerStatus({ buckets: 25, startTime: '07:00' })
        );
        expect(result.current.hoursWorked).toBe(5);
    });

    it('defaults startTime to 07:00', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-14T12:00:00'));
        const { result } = renderHook(() =>
            usePickerStatus({ buckets: 25 })
        );
        expect(result.current.hoursWorked).toBe(5);
    });

    it('minimum hoursWorked is 0.1 (avoids division by zero)', () => {
        vi.useFakeTimers();
        // 07:00 - 07:00 = 0 → clamped to 0.1
        vi.setSystemTime(new Date('2026-03-14T07:00:00'));
        const { result } = renderHook(() =>
            usePickerStatus({ buckets: 0, startTime: '07:00' })
        );
        expect(result.current.hoursWorked).toBe(0.1);
    });
});
