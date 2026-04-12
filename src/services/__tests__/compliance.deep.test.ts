/**
 * compliance.service — Deep functional tests
 * Targets all pure logic functions: calculateNextBreakDue, isBreakOverdue,
 * getRequiredBreakDuration, calculateEffectiveHourlyRate, checkWageCompliance,
 * getMinimumBucketsPerHour, checkWorkHoursCompliance, checkPickerCompliance
 */
import { describe, it, expect, vi } from 'vitest';
import {
  calculateNextBreakDue,
  getRequiredBreakDuration,
  calculateEffectiveHourlyRate,
  checkWageCompliance,
  getMinimumBucketsPerHour,
  checkWorkHoursCompliance,
  checkPickerCompliance,
  NZ_BREAK_REQUIREMENTS,
} from '../compliance.service';
import { NZ_MINIMUM_WAGE_2025 as NZ_MINIMUM_WAGE } from '@/constants/nz-law';

// Mock nowNZST to control time in tests
vi.mock('@/utils/nzst', () => ({
  nowNZST: () => '2026-03-01T14:00:00',
  toNZST: (d: Date) => d.toISOString(),
  todayNZST: () => '2026-03-01',
}));

// ──────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────
describe('NZ constants', () => {
  it('NZ_BREAK_REQUIREMENTS has correct rest interval', () => {
    expect(NZ_BREAK_REQUIREMENTS.REST_BREAK_INTERVAL_MINUTES).toBe(120);
  });

  it('NZ_BREAK_REQUIREMENTS has correct meal interval', () => {
    expect(NZ_BREAK_REQUIREMENTS.MEAL_BREAK_INTERVAL_MINUTES).toBe(240);
  });

  it('NZ_BREAK_REQUIREMENTS has correct hydration interval', () => {
    expect(NZ_BREAK_REQUIREMENTS.HYDRATION_REMINDER_INTERVAL_MINUTES).toBe(45);
  });

  it('NZ_MINIMUM_WAGE is defined', () => {
    expect(NZ_MINIMUM_WAGE).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────
// calculateNextBreakDue
// ──────────────────────────────────────────────────────
describe('calculateNextBreakDue', () => {
  const workStart = new Date('2026-03-01T06:00:00Z');

  it('rest break is 120 min from work start when no prior break', () => {
    const dueAt = calculateNextBreakDue(null, 'rest', workStart);
    expect(dueAt.getTime()).toBe(workStart.getTime() + 120 * 60 * 1000);
  });

  it('meal break is 240 min from work start when no prior break', () => {
    const dueAt = calculateNextBreakDue(null, 'meal', workStart);
    expect(dueAt.getTime()).toBe(workStart.getTime() + 240 * 60 * 1000);
  });

  it('hydration break is 45 min from work start when no prior break', () => {
    const dueAt = calculateNextBreakDue(null, 'hydration', workStart);
    expect(dueAt.getTime()).toBe(workStart.getTime() + 45 * 60 * 1000);
  });

  it('uses lastBreakAt as base when provided', () => {
    const lastBreak = new Date('2026-03-01T08:00:00Z');
    const dueAt = calculateNextBreakDue(lastBreak, 'rest', workStart);
    expect(dueAt.getTime()).toBe(lastBreak.getTime() + 120 * 60 * 1000);
  });

  it('defaults to rest interval for unknown break type', () => {
    const dueAt = calculateNextBreakDue(null, 'unknown' as any, workStart);
    expect(dueAt.getTime()).toBe(workStart.getTime() + 120 * 60 * 1000);
  });
});

// ──────────────────────────────────────────────────────
// getRequiredBreakDuration
// ──────────────────────────────────────────────────────
describe('getRequiredBreakDuration', () => {
  it('rest break is 10 minutes', () => {
    expect(getRequiredBreakDuration('rest')).toBe(10);
  });

  it('meal break is 30 minutes', () => {
    expect(getRequiredBreakDuration('meal')).toBe(30);
  });

  it('hydration break is 5 minutes', () => {
    expect(getRequiredBreakDuration('hydration')).toBe(5);
  });

  it('unknown type defaults to rest (10 minutes)', () => {
    expect(getRequiredBreakDuration('unknown' as any)).toBe(10);
  });
});

// ──────────────────────────────────────────────────────
// calculateEffectiveHourlyRate
// ──────────────────────────────────────────────────────
describe('calculateEffectiveHourlyRate', () => {
  it('returns 0 when hours <= 0', () => {
    expect(calculateEffectiveHourlyRate(50, 0)).toBe(0);
    expect(calculateEffectiveHourlyRate(50, -1)).toBe(0);
  });

  it('calculates rate correctly', () => {
    // 10 buckets * $5/bucket = $50 / 2 hours = $25/hr
    expect(calculateEffectiveHourlyRate(10, 2, 5)).toBe(25);
  });

  it('uses default piece rate when not specified', () => {
    const result = calculateEffectiveHourlyRate(10, 2);
    expect(result).toBeGreaterThan(0);
  });

  it('handles fractional hours', () => {
    // 5 buckets * $5/bucket = $25 / 1.5 hours ≈ $16.67
    const result = calculateEffectiveHourlyRate(5, 1.5, 5);
    expect(result).toBeCloseTo(16.67, 1);
  });
});

// ──────────────────────────────────────────────────────
// checkWageCompliance
// ──────────────────────────────────────────────────────
describe('checkWageCompliance', () => {
  it('compliant when effective rate >= minimum wage', () => {
    // Need enough buckets to earn >= NZ_MINIMUM_WAGE/hr
    // At $5/bucket, need >= ceil(23.5/5) ≈ 5 buckets/hr
    const result = checkWageCompliance(100, 8, 5);
    expect(result.isCompliant).toBe(true);
    expect(result.shortfall).toBe(0);
    expect(result.topUpRequired).toBe(0);
  });

  it('non-compliant when effective rate < minimum wage', () => {
    // 1 bucket * $5 = $5 / 8 hours = $0.625/hr — way below minimum
    const result = checkWageCompliance(1, 8, 5);
    expect(result.isCompliant).toBe(false);
    expect(result.shortfall).toBeGreaterThan(0);
    expect(result.topUpRequired).toBeGreaterThan(0);
  });

  it('calculates topUpRequired correctly', () => {
    // 2 buckets * $5 = $10; 1 hour * $23.95 = $23.95; topUp = $13.15
    const result = checkWageCompliance(2, 1, 5);
    expect(result.topUpRequired).toBe(13.15);
  });

  it('returns minimumWage in result', () => {
    const result = checkWageCompliance(10, 1, 5);
    expect(result.minimumWage).toBe(NZ_MINIMUM_WAGE);
  });

  it('effectiveHourlyRate is rounded to 2 decimals', () => {
    const result = checkWageCompliance(7, 3, 5);
    // 7 * 5 / 3 = 11.666... → should be 11.67
    expect(result.effectiveHourlyRate).toBe(11.67);
  });

  it('handles 0 hours (returns compliant with rate 0)', () => {
    const result = checkWageCompliance(10, 0, 5);
    expect(result.effectiveHourlyRate).toBe(0);
    // with 0 hours, minimumRequired = 0, so topUp = 0
    expect(result.topUpRequired).toBe(0);
  });
});

// ──────────────────────────────────────────────────────
// getMinimumBucketsPerHour
// ──────────────────────────────────────────────────────
describe('getMinimumBucketsPerHour', () => {
  it('returns a positive number', () => {
    expect(getMinimumBucketsPerHour()).toBeGreaterThan(0);
  });

  it('uses custom piece rate', () => {
    // At $10/bucket, need 23.95/10 = 2.35 → ceil to 2.4
    const result = getMinimumBucketsPerHour(10);
    expect(result).toBe(2.4);
  });

  it('increases when piece rate decreases', () => {
    const highRate = getMinimumBucketsPerHour(10);
    const lowRate = getMinimumBucketsPerHour(2);
    expect(lowRate).toBeGreaterThan(highRate);
  });
});

// ──────────────────────────────────────────────────────
// checkWorkHoursCompliance
// ──────────────────────────────────────────────────────
describe('checkWorkHoursCompliance', () => {
  it('needsBreak is false when consecutive < 110 min', () => {
    const result = checkWorkHoursCompliance(60, 60);
    expect(result.needsBreak).toBe(false);
  });

  it('needsBreak is true when consecutive >= 110 min', () => {
    const result = checkWorkHoursCompliance(110, 110);
    expect(result.needsBreak).toBe(true);
  });

  it('maxRecommendedReached is false below 12h', () => {
    const result = checkWorkHoursCompliance(60, 600); // 10 hours
    expect(result.maxRecommendedReached).toBe(false);
  });

  it('maxRecommendedReached is true at 12h+', () => {
    const result = checkWorkHoursCompliance(60, 720); // 12 hours
    expect(result.maxRecommendedReached).toBe(true);
  });

  it('warning set when consecutive >= 10 hours (600 min)', () => {
    const result = checkWorkHoursCompliance(600, 600);
    expect(result.warning).toContain('without a mandatory break');
  });

  it('warning set when daily max exceeded', () => {
    const result = checkWorkHoursCompliance(60, 780); // 13 hours total
    expect(result.warning).toContain('exceeded recommended');
  });

  it('no warning under normal conditions', () => {
    const result = checkWorkHoursCompliance(90, 360);
    expect(result.warning).toBeUndefined();
  });

  it('consecutive warning takes priority over daily max', () => {
    // Both conditions met — consecutive >= 600 AND total >= 720
    const result = checkWorkHoursCompliance(610, 720);
    expect(result.warning).toContain('mandatory break');
  });
});

// ──────────────────────────────────────────────────────
// checkPickerCompliance (full integration)
// ──────────────────────────────────────────────────────
describe('checkPickerCompliance', () => {
  const workStart = new Date('2026-03-01T06:00:00Z');

  const baseInput = {
    pickerId: 'P001',
    bucketCount: 50,
    hoursWorked: 8,
    consecutiveMinutesWorked: 60,
    totalMinutesToday: 480,
    lastRestBreakAt: new Date('2026-03-01T13:00:00'),
    lastMealBreakAt: new Date('2026-03-01T12:00:00'),
    lastHydrationAt: new Date('2026-03-01T13:30:00'),
    workStartTime: workStart,
  };

  it('returns pickerId in result', () => {
    const result = checkPickerCompliance(baseInput);
    expect(result.pickerId).toBe('P001');
  });

  it('wage-compliant picker has no wage violations', () => {
    const result = checkPickerCompliance({
      ...baseInput,
      bucketCount: 100, // plenty of buckets → high effective rate
    });
    expect(result.wageCompliance.isCompliant).toBe(true);
  });

  it('wage-noncompliant picker gets wage_below_minimum violation', () => {
    const result = checkPickerCompliance({
      ...baseInput,
      bucketCount: 1, // very few buckets
      hoursWorked: 8,
    });
    expect(result.wageCompliance.isCompliant).toBe(false);
    const wageViolation = result.violations.find(v => v.type === 'wage_below_minimum');
    expect(wageViolation).toBeDefined();
    expect(wageViolation!.severity).toBe('high');
  });

  it('no wage violation when hoursWorked < 1 (even if rate is low)', () => {
    const result = checkPickerCompliance({
      ...baseInput,
      bucketCount: 0,
      hoursWorked: 0.5,
    });
    const wageViolation = result.violations.find(v => v.type === 'wage_below_minimum');
    expect(wageViolation).toBeUndefined();
  });

  it('sets workHours.needsBreak when consecutive >= 110', () => {
    const result = checkPickerCompliance({
      ...baseInput,
      consecutiveMinutesWorked: 115,
    });
    expect(result.workHours.needsBreak).toBe(true);
  });

  it('workHours.maxRecommended is set correctly', () => {
    const result = checkPickerCompliance(baseInput);
    expect(result.workHours.maxRecommended).toBe(720); // 12 * 60
  });

  it('isCompliant only considers medium/high violations', () => {
    // All breaks very recent, high bucket count → compliant wages
    const recentTime = new Date('2026-03-01T13:50:00');
    const result = checkPickerCompliance({
      ...baseInput,
      bucketCount: 100,
      workStartTime: new Date('2026-03-01T10:00:00'),
      lastRestBreakAt: recentTime,
      lastMealBreakAt: recentTime,
      lastHydrationAt: recentTime,
    });
    // isCompliant is based on filtering out low-severity violations
    const medHighViolations = result.violations.filter(v => v.severity !== 'low');
    expect(result.isCompliant).toBe(medHighViolations.length === 0);
  });

  it('isCompliant ignores low-severity violations', () => {
    // Hydration reminders are severity 'low' → should not affect isCompliant
    const recentTime = new Date('2026-03-01T13:50:00');
    const result = checkPickerCompliance({
      ...baseInput,
      bucketCount: 100,
      workStartTime: new Date('2026-03-01T10:00:00'),
      lastHydrationAt: null, // hydration overdue → low severity
      lastRestBreakAt: recentTime,
      lastMealBreakAt: recentTime,
    });
    // Verify low-severity violations don't affect isCompliant
    const lowViolations = result.violations.filter(v => v.severity === 'low');
    const medHighViolations = result.violations.filter(v => v.severity !== 'low');
    // isCompliant should equal whether there are zero medium/high violations
    expect(result.isCompliant).toBe(medHighViolations.length === 0);
    // And hydration (low severity) violations should exist
    if (lowViolations.length > 0) {
      expect(lowViolations[0].type).toBe('hydration_reminder');
    }
  });

  it('nextBreakDue is set to soonest break', () => {
    const result = checkPickerCompliance(baseInput);
    expect(result.nextBreakDue).toBeDefined();
    expect(result.nextBreakDue!.type).toBeDefined();
  });

  it('excessive hours adds violation with warning', () => {
    const result = checkPickerCompliance({
      ...baseInput,
      consecutiveMinutesWorked: 610,
      totalMinutesToday: 720,
    });
    const excessViolation = result.violations.find(v => v.type === 'excessive_hours');
    expect(excessViolation).toBeDefined();
    expect(excessViolation!.severity).toBe('high');
  });
});
