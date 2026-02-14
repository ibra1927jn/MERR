// =============================================
// PAYROLL SERVICE TESTS
// =============================================
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mock supabase BEFORE importing the service
vi.mock('./supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
        },
        from: vi.fn(),
    },
}));

vi.mock('@/services/config.service', () => ({
    getConfig: () => ({
        SUPABASE_URL: 'https://test-project.supabase.co',
    }),
}));

vi.mock('@/utils/nzst', () => ({
    todayNZST: () => '2026-02-13',
}));

vi.mock('@/services/sync.service', () => ({
    syncService: {
        addToQueue: vi.fn(() => 'queued-id-001'),
    },
}));

import { payrollService, type PayrollResult, type TimesheetEntry } from './payroll.service';
import { supabase } from './supabase';
import { syncService } from './sync.service';

// =============================================
// TEST DATA
// =============================================

const MOCK_SESSION = {
    data: {
        session: {
            access_token: 'test-token-abc123',
            user: { id: 'user-001', email: 'test@harvestpro.nz' },
        },
    },
};

const MOCK_NO_SESSION = { data: { session: null } };

const MOCK_PAYROLL_RESULT: PayrollResult = {
    orchard_id: 'orchard-001',
    date_range: { start: '2026-02-13', end: '2026-02-13' },
    summary: {
        total_buckets: 240,
        total_hours: 80,
        total_piece_rate_earnings: 1560.00,
        total_top_up: 82.00,
        total_earnings: 1642.00,
    },
    compliance: {
        workers_below_minimum: 2,
        workers_total: 10,
        compliance_rate: 80.0,
    },
    picker_breakdown: [
        {
            picker_id: 'pk-001',
            picker_name: 'James Wilson',
            buckets: 30,
            hours_worked: 8,
            piece_rate_earnings: 195.00,
            hourly_rate: 24.38,
            minimum_required: 188.00,
            top_up_required: 0,
            total_earnings: 195.00,
            is_below_minimum: false,
        },
        {
            picker_id: 'pk-002',
            picker_name: 'Sarah Chen',
            buckets: 10,
            hours_worked: 8,
            piece_rate_earnings: 65.00,
            hourly_rate: 8.13,
            minimum_required: 188.00,
            top_up_required: 123.00,
            total_earnings: 188.00,
            is_below_minimum: true,
        },
    ],
    settings: {
        bucket_rate: 6.50,
        min_wage_rate: 23.50,
    },
};

const MOCK_ATTENDANCE_DATA = [
    {
        id: 'att-001',
        picker_id: 'pk-001',
        date: '2026-02-13',
        check_in_time: '2026-02-13T07:00:00+13:00',
        check_out_time: '2026-02-13T15:00:00+13:00',
        verified_by: 'manager-001',
        orchard_id: 'orchard-001',
    },
    {
        id: 'att-002',
        picker_id: 'pk-002',
        date: '2026-02-13',
        check_in_time: '2026-02-13T08:00:00+13:00',
        check_out_time: null,
        verified_by: null,
        orchard_id: 'orchard-001',
    },
];

const MOCK_PICKERS_DATA = [
    { id: 'pk-001', name: 'James Wilson' },
    { id: 'pk-002', name: 'Sarah Chen' },
];

// =============================================
// TESTS
// =============================================

describe('Payroll Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', vi.fn());
    });

    // =============================================
    // calculatePayroll
    // =============================================
    describe('calculatePayroll', () => {
        it('should throw when no session exists', async () => {
            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_NO_SESSION);

            await expect(
                payrollService.calculatePayroll('orchard-001', '2026-02-13', '2026-02-13')
            ).rejects.toThrow('No authenticated session');
        });

        it('should call edge function with correct params', async () => {
            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_PAYROLL_RESULT),
            });

            await payrollService.calculatePayroll('orchard-001', '2026-02-10', '2026-02-13');

            expect(globalThis.fetch).toHaveBeenCalledWith(
                'https://test-project.supabase.co/functions/v1/calculate-payroll',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer test-token-abc123',
                    },
                    body: JSON.stringify({
                        orchard_id: 'orchard-001',
                        start_date: '2026-02-10',
                        end_date: '2026-02-13',
                    }),
                })
            );
        });

        it('should return payroll result on success', async () => {
            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_PAYROLL_RESULT),
            });

            const result = await payrollService.calculatePayroll('orchard-001', '2026-02-13', '2026-02-13');

            expect(result.summary.total_earnings).toBe(1642.00);
            expect(result.compliance.workers_below_minimum).toBe(2);
            expect(result.picker_breakdown).toHaveLength(2);
        });

        it('should throw on edge function error', async () => {
            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: false,
                json: () => Promise.resolve({ error: 'Invalid date range' }),
            });

            await expect(
                payrollService.calculatePayroll('orchard-001', '2026-02-15', '2026-02-10')
            ).rejects.toThrow('Invalid date range');
        });

        it('should throw generic error when edge function returns no message', async () => {
            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: false,
                json: () => Promise.resolve({}),
            });

            await expect(
                payrollService.calculatePayroll('orchard-001', '2026-02-13', '2026-02-13')
            ).rejects.toThrow('Failed to calculate payroll');
        });
    });

    // =============================================
    // Compliance validation
    // =============================================
    describe('NZ Employment Compliance', () => {
        it('should identify workers below minimum wage', async () => {
            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_PAYROLL_RESULT),
            });

            const result = await payrollService.calculatePayroll('orchard-001', '2026-02-13', '2026-02-13');

            // Sarah Chen earns $65 for 8h work ($8.13/hr) < $23.50 min wage
            const sarahBreakdown = result.picker_breakdown.find(p => p.picker_id === 'pk-002');
            expect(sarahBreakdown?.is_below_minimum).toBe(true);
            expect(sarahBreakdown?.top_up_required).toBeGreaterThan(0);
            expect(sarahBreakdown?.total_earnings).toBeGreaterThanOrEqual(
                sarahBreakdown!.hours_worked * result.settings.min_wage_rate
            );
        });

        it('should not flag workers above minimum wage', async () => {
            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_PAYROLL_RESULT),
            });

            const result = await payrollService.calculatePayroll('orchard-001', '2026-02-13', '2026-02-13');

            // James Wilson earns $195 for 8h ($24.38/hr) > $23.50 min wage
            const jamesBreakdown = result.picker_breakdown.find(p => p.picker_id === 'pk-001');
            expect(jamesBreakdown?.is_below_minimum).toBe(false);
            expect(jamesBreakdown?.top_up_required).toBe(0);
        });

        it('should calculate compliance rate correctly', async () => {
            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_PAYROLL_RESULT),
            });

            const result = await payrollService.calculatePayroll('orchard-001', '2026-02-13', '2026-02-13');

            // 2 out of 10 below minimum = 80% compliance
            expect(result.compliance.compliance_rate).toBe(80.0);
            expect(result.compliance.workers_below_minimum).toBe(2);
            expect(result.compliance.workers_total).toBe(10);
        });
    });

    // =============================================
    // calculateToday
    // =============================================
    describe('calculateToday', () => {
        it('should use today NZST as date range', async () => {
            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_PAYROLL_RESULT),
            });

            await payrollService.calculateToday('orchard-001');

            expect(globalThis.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify({
                        orchard_id: 'orchard-001',
                        start_date: '2026-02-13',
                        end_date: '2026-02-13',
                    }),
                })
            );
        });
    });

    // =============================================
    // getDashboardSummary
    // =============================================
    describe('getDashboardSummary', () => {
        it('should return simplified summary', async () => {
            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_PAYROLL_RESULT),
            });

            const summary = await payrollService.getDashboardSummary('orchard-001');

            expect(summary).toEqual({
                totalBuckets: 240,
                totalCost: 1642.00,
                workersAtRisk: 2,
                complianceRate: 80.0,
            });
        });
    });

    // =============================================
    // fetchTimesheets
    // =============================================
    describe('fetchTimesheets', () => {
        const createMockFrom = (attendanceResponse: unknown, pickersResponse: unknown) => {
            let callCount = 0;
            return vi.fn(() => {
                callCount++;
                if (callCount === 1) {
                    // First call: daily_attendance
                    return {
                        select: () => ({
                            eq: () => ({
                                eq: () => ({
                                    order: () => Promise.resolve(attendanceResponse),
                                }),
                            }),
                        }),
                    };
                } else {
                    // Second call: pickers
                    return {
                        select: () => ({
                            in: () => Promise.resolve(pickersResponse),
                        }),
                    };
                }
            });
        };

        it('should fetch and format timesheets correctly', async () => {
            (supabase.from as Mock) = createMockFrom(
                { data: MOCK_ATTENDANCE_DATA, error: null },
                { data: MOCK_PICKERS_DATA, error: null }
            );

            const timesheets = await payrollService.fetchTimesheets('orchard-001', '2026-02-13');

            expect(timesheets).toHaveLength(2);
            expect(timesheets[0].picker_name).toBe('James Wilson');
            expect(timesheets[0].is_verified).toBe(true);
        });

        it('should calculate hours worked correctly', async () => {
            (supabase.from as Mock) = createMockFrom(
                { data: MOCK_ATTENDANCE_DATA, error: null },
                { data: MOCK_PICKERS_DATA, error: null }
            );

            const timesheets = await payrollService.fetchTimesheets('orchard-001');

            // 07:00 to 15:00 = 8 hours
            expect(timesheets[0].hours_worked).toBe(8);
        });

        it('should return 0 hours when check_out is null', async () => {
            (supabase.from as Mock) = createMockFrom(
                { data: MOCK_ATTENDANCE_DATA, error: null },
                { data: MOCK_PICKERS_DATA, error: null }
            );

            const timesheets = await payrollService.fetchTimesheets('orchard-001');

            // No checkout = 0 hours
            expect(timesheets[1].hours_worked).toBe(0);
            expect(timesheets[1].is_verified).toBe(false);
        });

        it('should cap hours at 12 maximum', async () => {
            const longShiftData = [{
                ...MOCK_ATTENDANCE_DATA[0],
                check_in_time: '2026-02-13T04:00:00+13:00',
                check_out_time: '2026-02-13T20:00:00+13:00', // 16h shift
            }];

            (supabase.from as Mock) = createMockFrom(
                { data: longShiftData, error: null },
                { data: MOCK_PICKERS_DATA, error: null }
            );

            const timesheets = await payrollService.fetchTimesheets('orchard-001');

            expect(timesheets[0].hours_worked).toBeLessThanOrEqual(12);
        });

        it('should return empty array on database error', async () => {
            (supabase.from as Mock) = createMockFrom(
                { data: null, error: { message: 'Connection failed' } },
                { data: null, error: null }
            );

            const timesheets = await payrollService.fetchTimesheets('orchard-001');
            expect(timesheets).toEqual([]);
        });

        it('should handle unknown pickers gracefully', async () => {
            (supabase.from as Mock) = createMockFrom(
                { data: MOCK_ATTENDANCE_DATA, error: null },
                { data: [], error: null } // No picker names found
            );

            const timesheets = await payrollService.fetchTimesheets('orchard-001');

            expect(timesheets[0].picker_name).toBe('Unknown');
        });
    });

    // =============================================
    // approveTimesheet
    // =============================================
    describe('approveTimesheet', () => {
        it('should queue timesheet approval via syncService', () => {
            const result = payrollService.approveTimesheet('att-001', 'manager-001');

            expect(syncService.addToQueue).toHaveBeenCalledWith('TIMESHEET', {
                action: 'approve',
                attendanceId: 'att-001',
                verifiedBy: 'manager-001',
            });
            expect(result).toBe('queued-id-001');
        });
    });

    // =============================================
    // NZ Minimum Wage Boundary Tests ($23.50)
    // =============================================
    describe('NZ Minimum Wage Edge Cases', () => {
        it('should NOT flag picker earning exactly $23.50/hr (boundary)', async () => {
            // Exactly at minimum: 29 buckets * $6.50 = $188.50 / 8h = $23.5625/hr
            // But if settings say $23.50, boundary is $23.50 * 8 = $188.00
            const boundaryResult: PayrollResult = {
                ...MOCK_PAYROLL_RESULT,
                picker_breakdown: [{
                    picker_id: 'pk-boundary',
                    picker_name: 'Boundary Worker',
                    buckets: 29,
                    hours_worked: 8,
                    piece_rate_earnings: 188.50,
                    hourly_rate: 23.5625,
                    minimum_required: 188.00,  // 8h * $23.50
                    top_up_required: 0,
                    total_earnings: 188.50,
                    is_below_minimum: false,
                }],
                settings: { bucket_rate: 6.50, min_wage_rate: 23.50 },
            };

            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(boundaryResult),
            });

            const result = await payrollService.calculatePayroll('orchard-001', '2026-02-13', '2026-02-13');
            const worker = result.picker_breakdown[0];

            expect(worker.is_below_minimum).toBe(false);
            expect(worker.top_up_required).toBe(0);
            expect(worker.piece_rate_earnings).toBeGreaterThanOrEqual(
                worker.hours_worked * result.settings.min_wage_rate
            );
        });

        it('should handle configurable min_wage_rate from settings', async () => {
            // If government changes min wage to $24.00, settings should reflect
            const futureWageResult: PayrollResult = {
                ...MOCK_PAYROLL_RESULT,
                settings: { bucket_rate: 6.50, min_wage_rate: 24.00 },
                picker_breakdown: [{
                    picker_id: 'pk-future',
                    picker_name: 'Future Worker',
                    buckets: 29,
                    hours_worked: 8,
                    piece_rate_earnings: 188.50,
                    hourly_rate: 23.5625,
                    minimum_required: 192.00,  // 8h * $24.00
                    top_up_required: 3.50,      // $192 - $188.50
                    total_earnings: 192.00,
                    is_below_minimum: true,
                }],
            };

            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(futureWageResult),
            });

            const result = await payrollService.calculatePayroll('orchard-001', '2026-02-13', '2026-02-13');
            const worker = result.picker_breakdown[0];

            // At $24/hr, same worker now falls below
            expect(worker.is_below_minimum).toBe(true);
            expect(worker.top_up_required).toBe(3.50);
            expect(result.settings.min_wage_rate).toBe(24.00);
        });

        it('should handle zero-bucket picker correctly', async () => {
            const zeroResult: PayrollResult = {
                ...MOCK_PAYROLL_RESULT,
                picker_breakdown: [{
                    picker_id: 'pk-zero',
                    picker_name: 'Zero Picker',
                    buckets: 0,
                    hours_worked: 8,
                    piece_rate_earnings: 0,
                    hourly_rate: 0,
                    minimum_required: 188.00,
                    top_up_required: 188.00,
                    total_earnings: 188.00,
                    is_below_minimum: true,
                }],
            };

            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(zeroResult),
            });

            const result = await payrollService.calculatePayroll('orchard-001', '2026-02-13', '2026-02-13');
            const worker = result.picker_breakdown[0];

            // Zero buckets = full top-up to minimum wage
            expect(worker.buckets).toBe(0);
            expect(worker.is_below_minimum).toBe(true);
            expect(worker.top_up_required).toBe(188.00);
            expect(worker.total_earnings).toBe(188.00);
        });

        it('should handle high-volume picker (450+ buckets/day)', async () => {
            const highVolumeResult: PayrollResult = {
                ...MOCK_PAYROLL_RESULT,
                picker_breakdown: [{
                    picker_id: 'pk-star',
                    picker_name: 'Star Picker',
                    buckets: 450,
                    hours_worked: 10,
                    piece_rate_earnings: 2925.00,  // 450 * $6.50
                    hourly_rate: 292.50,
                    minimum_required: 235.00,      // 10h * $23.50
                    top_up_required: 0,
                    total_earnings: 2925.00,
                    is_below_minimum: false,
                }],
            };

            (supabase.auth.getSession as Mock).mockResolvedValue(MOCK_SESSION);
            (globalThis.fetch as Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(highVolumeResult),
            });

            const result = await payrollService.calculatePayroll('orchard-001', '2026-02-13', '2026-02-13');
            const worker = result.picker_breakdown[0];

            expect(worker.is_below_minimum).toBe(false);
            expect(worker.piece_rate_earnings).toBe(2925.00);
            expect(worker.total_earnings).toBe(worker.piece_rate_earnings);
        });
    });
});
