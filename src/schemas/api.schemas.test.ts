/**
 * api.schemas.test.ts — Boundary validation de respuestas del backend.
 * Añadido 2026-04-18 junto con el soporte de public holidays en
 * calculate-payroll. Cubre PickerBreakdownSchema con los nuevos
 * hours_ordinary + hours_holiday opcionales, PayrollResultSchema shape,
 * CheckInResponseSchema y CheckOutResponseSchema.
 */
import { describe, it, expect } from 'vitest';
import {
    PickerBreakdownSchema,
    PayrollResultSchema,
    CheckInResponseSchema,
    CheckOutResponseSchema,
} from './api.schemas';

describe('PickerBreakdownSchema', () => {
    const baseRow = {
        picker_id: 'p1',
        picker_name: 'John',
        buckets: 50,
        hours_worked: 8,
        piece_rate_earnings: 325,
        hourly_rate: 40.625,
        minimum_required: 191.6,
        top_up_required: 0,
        total_earnings: 325,
        is_below_minimum: false,
    };

    it('accepts a valid row without holiday fields (backcompat)', () => {
        expect(PickerBreakdownSchema.safeParse(baseRow).success).toBe(true);
    });

    it('accepts row with hours_ordinary + hours_holiday', () => {
        expect(
            PickerBreakdownSchema.safeParse({ ...baseRow, hours_ordinary: 6, hours_holiday: 2 }).success,
        ).toBe(true);
    });

    it('rejects negative hours_holiday', () => {
        expect(PickerBreakdownSchema.safeParse({ ...baseRow, hours_holiday: -1 }).success).toBe(false);
    });

    it('rejects when required fields missing', () => {
        const bad = { ...baseRow } as Record<string, unknown>;
        delete bad.picker_id;
        expect(PickerBreakdownSchema.safeParse(bad).success).toBe(false);
    });

    it('rejects picker_id empty string', () => {
        expect(PickerBreakdownSchema.safeParse({ ...baseRow, picker_id: '' }).success).toBe(false);
    });

    it('accepts buckets = 0', () => {
        expect(PickerBreakdownSchema.safeParse({ ...baseRow, buckets: 0 }).success).toBe(true);
    });

    it('rejects non-integer buckets', () => {
        expect(PickerBreakdownSchema.safeParse({ ...baseRow, buckets: 3.5 }).success).toBe(false);
    });
});

describe('PayrollResultSchema', () => {
    const validResult = {
        orchard_id: 'o1',
        date_range: { start: '2026-04-01', end: '2026-04-07' },
        summary: {
            total_buckets: 50,
            total_hours: 8,
            total_piece_rate_earnings: 325,
            total_top_up: 0,
            total_earnings: 325,
        },
        compliance: {
            workers_below_minimum: 0,
            workers_total: 1,
            compliance_rate: 100,
        },
        picker_breakdown: [
            {
                picker_id: 'p1',
                picker_name: 'John',
                buckets: 50,
                hours_worked: 8,
                piece_rate_earnings: 325,
                hourly_rate: 40.625,
                minimum_required: 191.6,
                top_up_required: 0,
                total_earnings: 325,
                is_below_minimum: false,
            },
        ],
        settings: { bucket_rate: 6.5, min_wage_rate: 23.95 },
    };

    it('accepts a full payroll result with 1 picker', () => {
        expect(PayrollResultSchema.safeParse(validResult).success).toBe(true);
    });

    it('rejects malformed date_range', () => {
        const result = {
            ...validResult,
            date_range: { start: '01/04/2026', end: '2026-04-07' },
        };
        expect(PayrollResultSchema.safeParse(result).success).toBe(false);
    });

    it('rejects compliance_rate > 100', () => {
        const result = {
            ...validResult,
            compliance: { ...validResult.compliance, compliance_rate: 150 },
        };
        expect(PayrollResultSchema.safeParse(result).success).toBe(false);
    });

    it('rejects empty orchard_id', () => {
        expect(PayrollResultSchema.safeParse({ ...validResult, orchard_id: '' }).success).toBe(false);
    });

    it('accepts picker_breakdown with holiday hours', () => {
        const result = {
            ...validResult,
            picker_breakdown: [
                { ...validResult.picker_breakdown[0], hours_ordinary: 4, hours_holiday: 4 },
            ],
        };
        expect(PayrollResultSchema.safeParse(result).success).toBe(true);
    });
});

describe('CheckInResponseSchema', () => {
    it('accepts a valid check-in response', () => {
        const res = {
            picker_id: 'p1',
            status: 'checked_in',
            id: 'attendance-uuid',
            already_checked_in: false,
        };
        expect(CheckInResponseSchema.safeParse(res).success).toBe(true);
    });

    it('rejects empty id', () => {
        const res = { picker_id: 'p1', status: 'ok', id: '', already_checked_in: false };
        expect(CheckInResponseSchema.safeParse(res).success).toBe(false);
    });
});

describe('CheckOutResponseSchema', () => {
    it('accepts a valid check-out response', () => {
        const res = {
            id: 'attendance-uuid',
            picker_id: 'p1',
            check_out: '2026-04-18T17:30:00Z',
            hours_worked: 8.5,
        };
        expect(CheckOutResponseSchema.safeParse(res).success).toBe(true);
    });

    it('rejects negative hours_worked', () => {
        const res = {
            id: 'attendance-uuid',
            picker_id: 'p1',
            check_out: '2026-04-18T17:30:00Z',
            hours_worked: -1,
        };
        expect(CheckOutResponseSchema.safeParse(res).success).toBe(false);
    });
});
