/**
 * ============================================
 * attendance.service.test.ts
 * Tests for attendance management functions
 *
 * Uses vi.spyOn on repositories for mocking.
 * ============================================
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/nzst', () => ({
    todayNZST: vi.fn(() => '2024-12-15'),
    nowNZST: vi.fn(() => '2024-12-15T09:00:00'),
}));

import { edgeFunctionsRepository } from '@/repositories/edgeFunctions.repository';
import { attendanceRepository } from '@/repositories/attendance.repository';
import { pickerRepository } from '@/repositories/picker.repository';
import { attendanceService } from './attendance.service';

describe('attendanceService', () => {
    let mockInvoke: ReturnType<typeof vi.spyOn>;
    let mockGetDailyWithPickers: ReturnType<typeof vi.spyOn>;
    let mockGetByDateWithPickers: ReturnType<typeof vi.spyOn>;
    let mockGetPerformanceToday: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        mockInvoke = vi.spyOn(edgeFunctionsRepository, 'invoke').mockResolvedValue({ data: null, error: null });
        mockGetDailyWithPickers = vi.spyOn(attendanceRepository, 'getDailyWithPickers').mockResolvedValue([]);
        mockGetByDateWithPickers = vi.spyOn(attendanceRepository, 'getByDateWithPickers').mockResolvedValue([]);
        mockGetPerformanceToday = vi.spyOn(pickerRepository, 'getPerformanceToday').mockResolvedValue([]);
    });

    // ═══════════════════════════════
    // getDailyAttendance (read-only, via repository)
    // ═══════════════════════════════
    describe('getDailyAttendance', () => {
        it('fetches attendance for given orchard and date', async () => {
            const mockData = [
                { id: 'att-1', picker_id: 'p-1', status: 'present', picker: { name: 'Alice', role: 'picker' } },
                { id: 'att-2', picker_id: 'p-2', status: 'present', picker: { name: 'Bob', role: 'picker' } },
            ];
            mockGetDailyWithPickers.mockResolvedValue(mockData);

            const result = await attendanceService.getDailyAttendance('orchard-1', '2024-12-15');

            expect(mockGetDailyWithPickers).toHaveBeenCalledWith('orchard-1', '2024-12-15');
            expect(result).toEqual(mockData);
            expect(result).toHaveLength(2);
        });

        it('uses todayNZST when no date provided', async () => {
            mockGetDailyWithPickers.mockResolvedValue([]);

            await attendanceService.getDailyAttendance('orchard-1');

            expect(mockGetDailyWithPickers).toHaveBeenCalledWith('orchard-1', '2024-12-15');
        });

        it('returns result from repository', async () => {
            mockGetDailyWithPickers.mockResolvedValue(null);

            const result = await attendanceService.getDailyAttendance('orchard-1');
            expect(result).toBeNull();
        });
    });

    // ═══════════════════════════════
    // checkInPicker — via Edge Function
    // ═══════════════════════════════
    describe('checkInPicker', () => {
        it('returns result from manage-attendance Edge Function', async () => {
            const edgeResult = {
                picker_id: 'p-1',
                status: 'present',
                id: 'att-1',
                already_checked_in: false,
            };
            mockInvoke.mockResolvedValue({ data: edgeResult, error: null });

            const result = await attendanceService.checkInPicker('p-1', 'orchard-1', 'admin-1');

            expect(mockInvoke).toHaveBeenCalledWith('manage-attendance', {
                action: 'check_in',
                picker_id: 'p-1',
                orchard_id: 'orchard-1',
                verified_by: 'admin-1',
            });
            expect(result).toEqual(edgeResult);
        });

        it('returns already_checked_in flag for duplicate check-in', async () => {
            mockInvoke.mockResolvedValue({
                data: { picker_id: 'p-1', status: 'present', id: 'existing-att-1', already_checked_in: true },
                error: null,
            });

            const result = await attendanceService.checkInPicker('p-1', 'orchard-1');
            expect(result!.already_checked_in).toBe(true);
        });

        it('throws on Edge Function error', async () => {
            mockInvoke.mockResolvedValue({ data: null, error: { message: 'Insufficient permissions' } });

            await expect(attendanceService.checkInPicker('p-1', 'orchard-1')).rejects.toThrow('Insufficient permissions');
        });
    });

    // ═══════════════════════════════
    // checkOutPicker — via Edge Function
    // ═══════════════════════════════
    describe('checkOutPicker', () => {
        it('returns checkout result from Edge Function', async () => {
            const edgeResult = {
                id: 'att-1',
                picker_id: 'p-1',
                check_out_time: '2024-12-15T17:00:00',
                hours_worked: 8,
            };
            mockInvoke.mockResolvedValue({ data: edgeResult, error: null });

            const result = await attendanceService.checkOutPicker('att-1');

            expect(mockInvoke).toHaveBeenCalledWith('manage-attendance', {
                action: 'check_out',
                attendance_id: 'att-1',
            });
            expect(result).toEqual(edgeResult);
        });

        it('throws on Edge Function error', async () => {
            mockInvoke.mockResolvedValue({ data: null, error: { message: 'Attendance record not found' } });

            await expect(attendanceService.checkOutPicker('bad-id')).rejects.toThrow('Attendance record not found');
        });
    });

    // ═══════════════════════════════
    // getTodayPerformance (read-only, via repository)
    // ═══════════════════════════════
    describe('getTodayPerformance', () => {
        it('fetches performance for specific orchard', async () => {
            const perfData = [
                { picker_id: 'p-1', total_buckets: 10, orchard_id: 'orchard-1' },
            ];
            mockGetPerformanceToday.mockResolvedValue(perfData);

            const result = await attendanceService.getTodayPerformance('orchard-1');

            expect(mockGetPerformanceToday).toHaveBeenCalledWith('orchard-1');
            expect(result).toEqual(perfData);
        });

        it('fetches all performance when no orchardId', async () => {
            mockGetPerformanceToday.mockResolvedValue([]);

            await attendanceService.getTodayPerformance();

            expect(mockGetPerformanceToday).toHaveBeenCalledWith(undefined);
        });
    });

    // ═══════════════════════════════
    // getAttendanceByDate (read-only)
    // ═══════════════════════════════
    describe('getAttendanceByDate', () => {
        it('fetches attendance for any given date', async () => {
            const mockData = [
                { id: 'att-1', picker: { id: 'p-1', name: 'Alice' }, check_in_time: '09:00' },
            ];
            mockGetByDateWithPickers.mockResolvedValue(mockData);

            const result = await attendanceService.getAttendanceByDate('orchard-1', '2024-12-10');

            expect(mockGetByDateWithPickers).toHaveBeenCalledWith('orchard-1', '2024-12-10');
            expect(result).toEqual(mockData);
        });

        it('returns result from repository', async () => {
            mockGetByDateWithPickers.mockResolvedValue([]);

            const result = await attendanceService.getAttendanceByDate('orchard-1', '2024-12-10');
            expect(result).toEqual([]);
        });
    });

    // ═══════════════════════════════
    // correctAttendance — via Edge Function
    // ═══════════════════════════════
    describe('correctAttendance', () => {
        it('sends correction to Edge Function with audit trail', async () => {
            mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

            await attendanceService.correctAttendance(
                'att-1',
                { check_in_time: '08:30:00' },
                'Late arrival correction',
                'admin-1'
            );

            expect(mockInvoke).toHaveBeenCalledWith('manage-attendance', {
                action: 'correct',
                attendance_id: 'att-1',
                check_in_time: '08:30:00',
                check_out_time: undefined,
                reason: 'Late arrival correction',
                admin_id: 'admin-1',
            });
        });

        it('throws on Edge Function error', async () => {
            mockInvoke.mockResolvedValue({ data: null, error: { message: 'RLS violation' } });

            await expect(
                attendanceService.correctAttendance(
                    'att-1',
                    { check_out_time: '17:30:00' },
                    'Early departure',
                    'admin-1'
                )
            ).rejects.toThrow('RLS violation');
        });
    });
});
