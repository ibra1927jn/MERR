/**
 * Tests for schemas/api.schemas.ts — API response Zod schemas
 */
import { describe, it, expect, vi } from 'vitest';
import {
  PayrollResultSchema,
  PickerBreakdownSchema,
  CheckInResponseSchema,
  CheckOutResponseSchema,
  AnomalySchema,
  AnomalyResponseSchema,
  ComplianceResultSchema,
  AdminResponseSchema,
  PushResponseSchema,
  AuditResponseSchema,
  validateResponse,
  validateResponseSafe,
} from './api.schemas';

// ── Test Fixtures ────────────────────────────────────

const validPickerBreakdown = {
  picker_id: 'P001',
  picker_name: 'John Smith',
  buckets: 45,
  hours_worked: 8.5,
  piece_rate_earnings: 157.5,
  hourly_rate: 23.15,
  minimum_required: 196.78,
  top_up_required: 39.28,
  total_earnings: 196.78,
  is_below_minimum: true,
};

const validPayrollResult = {
  orchard_id: 'orchard-1',
  date_range: { start: '2026-03-01', end: '2026-03-15' },
  summary: {
    total_buckets: 500,
    total_hours: 120,
    total_piece_rate_earnings: 3250.0,
    total_top_up: 150.0,
    total_earnings: 3400.0,
  },
  compliance: {
    workers_below_minimum: 2,
    workers_total: 20,
    compliance_rate: 90.0,
  },
  picker_breakdown: [validPickerBreakdown],
  settings: {
    bucket_rate: 6.5,
    min_wage_rate: 23.15,
  },
};

// ── PayrollResultSchema ──────────────────────────────

describe('PayrollResultSchema', () => {
  it('accepts valid full input', () => {
    const result = PayrollResultSchema.safeParse(validPayrollResult);
    expect(result.success).toBe(true);
  });

  it('rejects negative totals', () => {
    const result = PayrollResultSchema.safeParse({
      ...validPayrollResult,
      summary: { ...validPayrollResult.summary, total_buckets: -1 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date range format', () => {
    const result = PayrollResultSchema.safeParse({
      ...validPayrollResult,
      date_range: { start: 'bad-date', end: '2026-03-15' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects compliance_rate > 100', () => {
    const result = PayrollResultSchema.safeParse({
      ...validPayrollResult,
      compliance: { ...validPayrollResult.compliance, compliance_rate: 101 },
    });
    expect(result.success).toBe(false);
  });
});

// ── PickerBreakdownSchema ────────────────────────────

describe('PickerBreakdownSchema', () => {
  it('validates individual breakdown', () => {
    const result = PickerBreakdownSchema.safeParse(validPickerBreakdown);
    expect(result.success).toBe(true);
  });

  it('rejects negative hours_worked', () => {
    const result = PickerBreakdownSchema.safeParse({
      ...validPickerBreakdown,
      hours_worked: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer buckets', () => {
    const result = PickerBreakdownSchema.safeParse({
      ...validPickerBreakdown,
      buckets: 3.5,
    });
    expect(result.success).toBe(false);
  });
});

// ── CheckInResponseSchema ────────────────────────────

describe('CheckInResponseSchema', () => {
  it('accepts valid input', () => {
    const result = CheckInResponseSchema.safeParse({
      picker_id: 'P001',
      status: 'checked_in',
      id: 'rec-123',
      already_checked_in: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty picker_id', () => {
    const result = CheckInResponseSchema.safeParse({
      picker_id: '',
      status: 'checked_in',
      id: 'rec-123',
      already_checked_in: false,
    });
    expect(result.success).toBe(false);
  });
});

// ── CheckOutResponseSchema ───────────────────────────

describe('CheckOutResponseSchema', () => {
  it('accepts valid input', () => {
    const result = CheckOutResponseSchema.safeParse({
      id: 'rec-123',
      picker_id: 'P001',
      check_out_time: '2026-03-20T17:00:00Z',
      hours_worked: 8.5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative hours_worked', () => {
    const result = CheckOutResponseSchema.safeParse({
      id: 'rec-123',
      picker_id: 'P001',
      check_out_time: '2026-03-20T17:00:00Z',
      hours_worked: -1,
    });
    expect(result.success).toBe(false);
  });
});

// ── AnomalySchema ────────────────────────────────────

describe('AnomalySchema', () => {
  const validAnomaly = {
    id: 'anom-1',
    type: 'impossible_velocity',
    severity: 'high',
    pickerId: 'P001',
    pickerName: 'John Smith',
    detail: 'Bucket rate exceeds physical possibility',
    timestamp: '2026-03-20T12:00:00Z',
    evidence: { velocity: 100, threshold: 50 },
    rule: 'elapsed_velocity',
  };

  it('accepts valid input with all fields', () => {
    const result = AnomalySchema.safeParse(validAnomaly);
    expect(result.success).toBe(true);
  });

  it('rejects invalid anomaly type', () => {
    const result = AnomalySchema.safeParse({ ...validAnomaly, type: 'invalid_type' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid severity', () => {
    const result = AnomalySchema.safeParse({ ...validAnomaly, severity: 'critical' });
    expect(result.success).toBe(false);
  });
});

// ── AnomalyResponseSchema ────────────────────────────

describe('AnomalyResponseSchema', () => {
  it('accepts valid response', () => {
    const result = AnomalyResponseSchema.safeParse({
      anomalies: [],
      stats: { total: 0 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts response with optional stats fields', () => {
    const result = AnomalyResponseSchema.safeParse({
      anomalies: [],
      stats: { total: 5, high: 1, medium: 2, low: 2 },
    });
    expect(result.success).toBe(true);
  });
});

// ── ComplianceResultSchema ───────────────────────────

describe('ComplianceResultSchema', () => {
  it('accepts valid response', () => {
    const result = ComplianceResultSchema.safeParse({
      orchard_id: 'orchard-1',
      date: '2026-03-20',
      pickers: [],
      summary: {
        total_checked: 20,
        compliant: 18,
        with_violations: 2,
        total_violations: 3,
      },
    });
    expect(result.success).toBe(true);
  });
});

// ── AdminResponseSchema ──────────────────────────────

describe('AdminResponseSchema', () => {
  it('accepts minimal valid input', () => {
    const result = AdminResponseSchema.safeParse({ success: true });
    expect(result.success).toBe(true);
  });

  it('accepts with optional fields', () => {
    const result = AdminResponseSchema.safeParse({
      success: true,
      user_id: 'user-123',
      new_role: 'manager',
      is_active: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing success field', () => {
    const result = AdminResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── PushResponseSchema ───────────────────────────────

describe('PushResponseSchema', () => {
  it('accepts valid with optional fields', () => {
    const result = PushResponseSchema.safeParse({
      success: true,
      sent: 10,
      total: 12,
      expired: 2,
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal input', () => {
    const result = PushResponseSchema.safeParse({ success: false });
    expect(result.success).toBe(true);
  });

  it('accepts with error string', () => {
    const result = PushResponseSchema.safeParse({
      success: false,
      error: 'Push service unavailable',
    });
    expect(result.success).toBe(true);
  });
});

// ── AuditResponseSchema ──────────────────────────────

describe('AuditResponseSchema', () => {
  it('accepts valid input', () => {
    const result = AuditResponseSchema.safeParse({
      success: true,
      count: 42,
    });
    expect(result.success).toBe(true);
  });

  it('accepts without count', () => {
    const result = AuditResponseSchema.safeParse({ success: true });
    expect(result.success).toBe(true);
  });
});

// ── validateResponse ─────────────────────────────────

describe('validateResponse', () => {
  it('returns data on success', () => {
    const data = validateResponse(
      AdminResponseSchema,
      { success: true },
      'testOp'
    );
    expect(data.success).toBe(true);
  });

  it('throws on invalid data', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      validateResponse(AdminResponseSchema, { bad: 'data' }, 'testOp')
    ).toThrow('Invalid testOp response from server');
    vi.restoreAllMocks();
  });
});

// ── validateResponseSafe ─────────────────────────────

describe('validateResponseSafe', () => {
  it('returns data on success', () => {
    const data = validateResponseSafe(
      AdminResponseSchema,
      { success: true },
      'testOp',
      { success: false }
    );
    expect(data.success).toBe(true);
  });

  it('returns fallback on invalid data', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fallback = { success: false };
    const data = validateResponseSafe(
      AdminResponseSchema,
      { bad: 'data' },
      'testOp',
      fallback
    );
    expect(data).toEqual(fallback);
    vi.restoreAllMocks();
  });
});
