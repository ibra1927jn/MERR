/**
 * api.schemas.extra — cubre los schemas secundarios (compliance, anomaly,
 * admin, push, audit) que api.schemas.test.ts original no tocaba.
 */
import { describe, it, expect } from 'vitest';
import {
    ComplianceResultSchema,
    AnomalyResponseSchema,
    AdminResponseSchema,
    PushResponseSchema,
    AuditResponseSchema,
    validateResponseSafe,
    validateResponse,
} from './api.schemas';
import { z } from 'zod';

// ── ComplianceResultSchema ───────────────────────────

const validCompliance = {
    orchard_id: 'o1',
    date: '2026-04-18',
    pickers: [
        {
            picker_id: 'p1',
            picker_name: 'Jane',
            is_compliant: true,
            violations: [],
            metrics: {
                hours_worked: 8,
                buckets_today: 40,
                effective_hourly_rate: 26,
                minimum_wage: 23.95,
                is_below_minimum: false,
                top_up_required: 0,
            },
        },
    ],
    summary: { total_checked: 1, compliant: 1, with_violations: 0, total_violations: 0 },
};

describe('ComplianceResultSchema', () => {
    it('accepts valid compliance result', () => {
        expect(ComplianceResultSchema.safeParse(validCompliance).success).toBe(true);
    });

    it('rejects malformed violation severity', () => {
        const bad = {
            ...validCompliance,
            pickers: [{
                ...validCompliance.pickers[0],
                violations: [{ type: 'break_overdue', severity: 'ULTRA', message: 'x', details: {} }],
            }],
        };
        expect(ComplianceResultSchema.safeParse(bad).success).toBe(false);
    });

    it('rejects unknown violation type', () => {
        const bad = {
            ...validCompliance,
            pickers: [{
                ...validCompliance.pickers[0],
                violations: [{ type: 'smoking', severity: 'high', message: 'no', details: {} }],
            }],
        };
        expect(ComplianceResultSchema.safeParse(bad).success).toBe(false);
    });

    it('rejects negative metrics', () => {
        const bad = {
            ...validCompliance,
            pickers: [{
                ...validCompliance.pickers[0],
                metrics: { ...validCompliance.pickers[0].metrics, hours_worked: -1 },
            }],
        };
        expect(ComplianceResultSchema.safeParse(bad).success).toBe(false);
    });
});

// ── AnomalyResponseSchema ───────────────────────────

describe('AnomalyResponseSchema', () => {
    const valid = {
        anomalies: [
            {
                id: 'a1',
                type: 'peer_outlier' as const,
                severity: 'medium' as const,
                pickerId: 'p1',
                pickerName: 'John',
                detail: '3x peer avg',
                timestamp: '2026-04-18T09:00:00Z',
                evidence: { buckets: 120 },
                rule: 'peer_comparison' as const,
            },
        ],
        stats: { total: 1, high: 0, medium: 1, low: 0 },
    };

    it('accepts full payload', () => {
        expect(AnomalyResponseSchema.safeParse(valid).success).toBe(true);
    });

    it('accepts empty anomalies + minimal stats', () => {
        expect(AnomalyResponseSchema.safeParse({ anomalies: [], stats: { total: 0 } }).success).toBe(true);
    });

    it('rejects unknown rule', () => {
        const bad = { ...valid, anomalies: [{ ...valid.anomalies[0], rule: 'magical' }] };
        expect(AnomalyResponseSchema.safeParse(bad).success).toBe(false);
    });

    it('rejects negative stats.total', () => {
        expect(
            AnomalyResponseSchema.safeParse({ anomalies: [], stats: { total: -1 } }).success,
        ).toBe(false);
    });
});

// ── AdminResponseSchema ──────────────────────────────

describe('AdminResponseSchema', () => {
    it('accepts success-only', () => {
        expect(AdminResponseSchema.safeParse({ success: true }).success).toBe(true);
    });

    it('accepts all fields', () => {
        expect(
            AdminResponseSchema.safeParse({
                success: true,
                user_id: 'u1',
                new_role: 'admin',
                is_active: true,
            }).success,
        ).toBe(true);
    });

    it('rejects missing success field', () => {
        expect(AdminResponseSchema.safeParse({ user_id: 'u1' }).success).toBe(false);
    });

    it('rejects non-boolean success', () => {
        expect(AdminResponseSchema.safeParse({ success: 1 }).success).toBe(false);
    });
});

// ── PushResponseSchema ───────────────────────────────

describe('PushResponseSchema', () => {
    it('accepts minimal success', () => {
        expect(PushResponseSchema.safeParse({ success: true }).success).toBe(true);
    });

    it('accepts full push result', () => {
        expect(
            PushResponseSchema.safeParse({
                success: true,
                sent: 10,
                total: 12,
                expired: 2,
            }).success,
        ).toBe(true);
    });

    it('accepts error field for failure', () => {
        expect(
            PushResponseSchema.safeParse({ success: false, error: 'FCM down' }).success,
        ).toBe(true);
    });

    it('rejects negative sent count', () => {
        expect(PushResponseSchema.safeParse({ success: true, sent: -1 }).success).toBe(false);
    });

    it('rejects non-integer sent', () => {
        expect(PushResponseSchema.safeParse({ success: true, sent: 1.5 }).success).toBe(false);
    });
});

// ── AuditResponseSchema ──────────────────────────────

describe('AuditResponseSchema', () => {
    it('accepts success+count', () => {
        expect(AuditResponseSchema.safeParse({ success: true, count: 5 }).success).toBe(true);
    });

    it('count is optional', () => {
        expect(AuditResponseSchema.safeParse({ success: true }).success).toBe(true);
    });

    it('rejects negative count', () => {
        expect(AuditResponseSchema.safeParse({ success: true, count: -1 }).success).toBe(false);
    });
});

// ── validateResponse helpers ─────────────────────────

const NumSchema = z.number();

describe('validateResponse', () => {
    it('devuelve data validada en caso OK', () => {
        expect(validateResponse(NumSchema, 42, 'op')).toBe(42);
    });

    it('throws con mensaje operacional en caso KO', () => {
        expect(() => validateResponse(NumSchema, 'not a num', 'myOp')).toThrow(/myOp/);
    });
});

describe('validateResponseSafe', () => {
    it('devuelve data validada cuando OK', () => {
        expect(validateResponseSafe(NumSchema, 7, 'op', 0)).toBe(7);
    });

    it('devuelve fallback cuando KO (no throws)', () => {
        expect(validateResponseSafe(NumSchema, 'nope', 'op', -1)).toBe(-1);
    });
});
