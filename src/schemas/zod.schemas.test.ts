/**
 * Tests for schemas/zod.schemas.ts — Zod boundary validation schemas
 */
import { describe, it, expect, vi } from 'vitest';
import {
  QRPayloadSchema,
  PickerSchema,
  AttendanceRecordSchema,
  HarvestSettingsSchema,
  safeParse,
  safeParseArray,
} from './zod.schemas';
import { z } from 'zod';

// ── QRPayloadSchema ──────────────────────────────────

describe('QRPayloadSchema', () => {
  it('accepts valid minimal input', () => {
    const result = QRPayloadSchema.safeParse({ picker_id: 'P001' });
    expect(result.success).toBe(true);
  });

  it('rejects empty picker_id', () => {
    const result = QRPayloadSchema.safeParse({ picker_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects too long picker_id', () => {
    const result = QRPayloadSchema.safeParse({ picker_id: 'x'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('defaults quality_grade to "A"', () => {
    const result = QRPayloadSchema.parse({ picker_id: 'P001' });
    expect(result.quality_grade).toBe('A');
  });

  it('validates UUID for orchard_id', () => {
    const validResult = QRPayloadSchema.safeParse({
      picker_id: 'P001',
      orchard_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(validResult.success).toBe(true);

    const invalidResult = QRPayloadSchema.safeParse({
      picker_id: 'P001',
      orchard_id: 'not-a-uuid',
    });
    expect(invalidResult.success).toBe(false);
  });

  it('accepts all valid quality grades', () => {
    for (const grade of ['A', 'B', 'C', 'reject']) {
      const result = QRPayloadSchema.safeParse({
        picker_id: 'P001',
        quality_grade: grade,
      });
      expect(result.success, `grade "${grade}" should be valid`).toBe(true);
    }
  });

  it('rejects invalid quality grade', () => {
    const result = QRPayloadSchema.safeParse({
      picker_id: 'P001',
      quality_grade: 'D',
    });
    expect(result.success).toBe(false);
  });
});

// ── PickerSchema ─────────────────────────────────────

describe('PickerSchema', () => {
  const validPicker = {
    id: 'picker-1',
    name: 'John Smith',
  };

  it('accepts valid input', () => {
    const result = PickerSchema.safeParse(validPicker);
    expect(result.success).toBe(true);
  });

  it('defaults status to "inactive"', () => {
    const result = PickerSchema.parse(validPicker);
    expect(result.status).toBe('inactive');
  });

  it('rejects missing name', () => {
    const result = PickerSchema.safeParse({ id: 'picker-1' });
    expect(result.success).toBe(false);
  });

  it('rejects empty id', () => {
    const result = PickerSchema.safeParse({ id: '', name: 'Test' });
    expect(result.success).toBe(false);
  });

  it('defaults safety_verified to false', () => {
    const result = PickerSchema.parse(validPicker);
    expect(result.safety_verified).toBe(false);
  });

  it('accepts all valid statuses', () => {
    for (const status of ['active', 'break', 'on_break', 'issue', 'inactive', 'suspended', 'archived']) {
      const result = PickerSchema.safeParse({ ...validPicker, status });
      expect(result.success, `status "${status}" should be valid`).toBe(true);
    }
  });
});

// ── AttendanceRecordSchema ───────────────────────────

describe('AttendanceRecordSchema', () => {
  const validAttendance = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    picker_id: '550e8400-e29b-41d4-a716-446655440001',
    orchard_id: '550e8400-e29b-41d4-a716-446655440002',
    date: '2026-03-20',
  };

  it('accepts valid input', () => {
    const result = AttendanceRecordSchema.safeParse(validAttendance);
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = AttendanceRecordSchema.safeParse({
      ...validAttendance,
      date: '20-03-2026',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID id', () => {
    const result = AttendanceRecordSchema.safeParse({
      ...validAttendance,
      id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID picker_id', () => {
    const result = AttendanceRecordSchema.safeParse({
      ...validAttendance,
      picker_id: 'bad-id',
    });
    expect(result.success).toBe(false);
  });

  it('defaults status to "present"', () => {
    const result = AttendanceRecordSchema.parse(validAttendance);
    expect(result.status).toBe('present');
  });

  it('accepts optional nullable fields', () => {
    const result = AttendanceRecordSchema.safeParse({
      ...validAttendance,
      check_in_time: null,
      check_out_time: null,
      verified_by: null,
    });
    expect(result.success).toBe(true);
  });
});

// ── HarvestSettingsSchema ────────────────────────────

describe('HarvestSettingsSchema', () => {
  const validSettings = {
    min_wage_rate: 23.15,
    piece_rate: 6.5,
    min_buckets_per_hour: 5,
    target_tons: 100,
  };

  it('accepts valid input', () => {
    const result = HarvestSettingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  it('rejects negative wage', () => {
    const result = HarvestSettingsSchema.safeParse({
      ...validSettings,
      min_wage_rate: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects wage > 500', () => {
    const result = HarvestSettingsSchema.safeParse({
      ...validSettings,
      min_wage_rate: 501,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative piece rate', () => {
    const result = HarvestSettingsSchema.safeParse({
      ...validSettings,
      piece_rate: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional variety', () => {
    const result = HarvestSettingsSchema.safeParse({
      ...validSettings,
      variety: 'Lapin',
    });
    expect(result.success).toBe(true);
  });
});

// ── safeParse ────────────────────────────────────────

describe('safeParse', () => {
  const SimpleSchema = z.object({ name: z.string().min(1) });

  it('returns success with valid data', () => {
    const result = safeParse(SimpleSchema, { name: 'Alice' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Alice');
    }
  });

  it('returns error string with invalid data', () => {
    const result = safeParse(SimpleSchema, { name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});

// ── safeParseArray ───────────────────────────────────

describe('safeParseArray', () => {
  const ItemSchema = z.object({ id: z.number(), label: z.string() });

  it('returns all items when all valid', () => {
    const data = [
      { id: 1, label: 'One' },
      { id: 2, label: 'Two' },
    ];
    const result = safeParseArray(ItemSchema, data);
    expect(result).toHaveLength(2);
  });

  it('filters out invalid items', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = [
      { id: 1, label: 'One' },
      { id: 'bad', label: 'Invalid' },
      { id: 3, label: 'Three' },
    ];
    const result = safeParseArray(ItemSchema, data);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(3);
    vi.restoreAllMocks();
  });

  it('returns empty array when all invalid', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = [{ wrong: true }, { also: 'wrong' }];
    const result = safeParseArray(ItemSchema, data);
    expect(result).toHaveLength(0);
    vi.restoreAllMocks();
  });
});
