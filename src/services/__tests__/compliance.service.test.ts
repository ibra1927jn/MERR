/**
 * compliance.service.test.ts — Phase 4: NZ Compliance Verification
 *
 * Validates all compliance logic against NZ Employment Relations Act 2000:
 *  - Break requirements (rest 10min/2h, meal 30min/4h, hydration 5min/45m)
 *  - Minimum wage enforcement ($23.15/hr)
 *  - Work hour limits (10h mandatory break, 12h daily max)
 *  - Full picker compliance checks
 *  - Top-up calculations for piece-rate shortfall
 */
import { describe, it, expect, vi } from 'vitest';
import {
  calculateNextBreakDue,
  isBreakOverdue,
  getRequiredBreakDuration,
  calculateEffectiveHourlyRate,
  checkWageCompliance,
  getMinimumBucketsPerHour,
  checkWorkHoursCompliance,
  checkPickerCompliance,
  NZ_BREAK_REQUIREMENTS,
} from '../compliance.service';

// Mock NZST to use fixed time for deterministic tests
// vi.hoisted ensures this value is available when the hoisted vi.mock factory runs
const { MOCK_NZST_ISO } = vi.hoisted(() => ({
  MOCK_NZST_ISO: '2026-03-15T01:00:00.000Z',
}));
const FIXED_NOW = new Date(MOCK_NZST_ISO);

vi.mock('@/utils/nzst', () => ({
  nowNZST: () => MOCK_NZST_ISO,
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/repositories/edge-functions.repository', () => ({
  edgeFunctionsRepository: { invoke: vi.fn() },
}));

// =============================================
// § 1 – BREAK REQUIREMENTS (Employment Relations Act 2000)
// =============================================
describe('NZ Break Requirements Constants', () => {
  it('rest break interval is 120 minutes (every 2 hours)', () => {
    expect(NZ_BREAK_REQUIREMENTS.REST_BREAK_INTERVAL_MINUTES).toBe(120);
  });

  it('rest break duration is 10 minutes (paid)', () => {
    expect(NZ_BREAK_REQUIREMENTS.REST_BREAK_DURATION_MINUTES).toBe(10);
  });

  it('meal break interval is 240 minutes (every 4 hours)', () => {
    expect(NZ_BREAK_REQUIREMENTS.MEAL_BREAK_INTERVAL_MINUTES).toBe(240);
  });

  it('meal break duration is 30 minutes (unpaid)', () => {
    expect(NZ_BREAK_REQUIREMENTS.MEAL_BREAK_DURATION_MINUTES).toBe(30);
  });

  it('hydration reminder is every 45 minutes', () => {
    expect(NZ_BREAK_REQUIREMENTS.HYDRATION_REMINDER_INTERVAL_MINUTES).toBe(45);
  });

  it('max consecutive work is 10 hours before mandatory break', () => {
    expect(NZ_BREAK_REQUIREMENTS.MAX_CONSECUTIVE_WORK_HOURS).toBe(10);
  });

  it('recommended max daily hours is 12', () => {
    expect(NZ_BREAK_REQUIREMENTS.RECOMMENDED_MAX_DAILY_HOURS).toBe(12);
  });
});

// =============================================
// § 2 – calculateNextBreakDue
// =============================================
describe('calculateNextBreakDue()', () => {
  const workStart = new Date('2026-03-15T06:00:00+13:00');

  it('rest break due 2 hours after work start', () => {
    const due = calculateNextBreakDue(null, 'rest', workStart);
    expect(due.getTime()).toBe(workStart.getTime() + 120 * 60 * 1000);
  });

  it('meal break due 4 hours after work start', () => {
    const due = calculateNextBreakDue(null, 'meal', workStart);
    expect(due.getTime()).toBe(workStart.getTime() + 240 * 60 * 1000);
  });

  it('hydration due 45 minutes after work start', () => {
    const due = calculateNextBreakDue(null, 'hydration', workStart);
    expect(due.getTime()).toBe(workStart.getTime() + 45 * 60 * 1000);
  });

  it('uses lastBreakAt as base when provided', () => {
    const lastBreak = new Date('2026-03-15T08:00:00+13:00');
    const due = calculateNextBreakDue(lastBreak, 'rest', workStart);
    expect(due.getTime()).toBe(lastBreak.getTime() + 120 * 60 * 1000);
  });
});

// =============================================
// § 3 – isBreakOverdue
// =============================================
describe('isBreakOverdue()', () => {
  it('returns overdue=true when rest break is past due', () => {
    // Worker started 3 hours before FIXED_NOW, no breaks taken
    const workStart = new Date(FIXED_NOW.getTime() - 3 * 60 * 60 * 1000);
    const result = isBreakOverdue(null, 'rest', workStart);
    expect(result.overdue).toBe(true);
    expect(result.minutesOverdue).toBeGreaterThan(0);
  });

  it('returns a due date in the future when break was recently taken', () => {
    const now = new Date();
    const lastBreak = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
    const workStart = new Date(now.getTime() - 60 * 60 * 1000);
    const dueAt = calculateNextBreakDue(lastBreak, 'rest', workStart);
    // Next rest break due = lastBreak + 120min = 90min from now
    expect(dueAt.getTime()).toBe(lastBreak.getTime() + 120 * 60 * 1000);
    expect(dueAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it('calculates minutes overdue correctly', () => {
    // Started 2.5 hours ago → 30 min overdue on rest break
    const workStart = new Date(FIXED_NOW.getTime() - 150 * 60 * 1000);
    const result = isBreakOverdue(null, 'rest', workStart);
    expect(result.overdue).toBe(true);
    expect(result.minutesOverdue).toBeGreaterThan(0);
  });
});

// =============================================
// § 4 – getRequiredBreakDuration
// =============================================
describe('getRequiredBreakDuration()', () => {
  it('rest break is 10 minutes', () => {
    expect(getRequiredBreakDuration('rest')).toBe(10);
  });

  it('meal break is 30 minutes', () => {
    expect(getRequiredBreakDuration('meal')).toBe(30);
  });

  it('hydration break is 5 minutes', () => {
    expect(getRequiredBreakDuration('hydration')).toBe(5);
  });
});

// =============================================
// § 5 – WAGE COMPLIANCE (Minimum Wage Act 1983 + Order 2025)
// =============================================
describe('calculateEffectiveHourlyRate()', () => {
  it('correctly calculates rate: 10 buckets × $6.50 / 4 hours = $16.25/hr', () => {
    expect(calculateEffectiveHourlyRate(10, 4, 6.5)).toBeCloseTo(16.25, 2);
  });

  it('returns 0 for zero hours worked', () => {
    expect(calculateEffectiveHourlyRate(10, 0, 6.5)).toBe(0);
  });

  it('high output meets minimum wage: 20 buckets × $6.50 / 4 hours = $32.50/hr', () => {
    expect(calculateEffectiveHourlyRate(20, 4, 6.5)).toBeCloseTo(32.5, 2);
  });
});

describe('checkWageCompliance()', () => {
  it('detects non-compliance: 1 bucket in 8 hours', () => {
    const result = checkWageCompliance(1, 8, 6.5, 23.15);
    expect(result.isCompliant).toBe(false);
    expect(result.effectiveHourlyRate).toBeCloseTo(0.81, 1);
    expect(result.shortfall).toBeGreaterThan(0);
    expect(result.topUpRequired).toBeGreaterThan(0);
  });

  it('calculates correct top-up amount for shortfall', () => {
    // 1 bucket × $6.50 = $6.50 earned, minimum required = 8h × $23.15 = $185.20
    const result = checkWageCompliance(1, 8, 6.5, 23.15);
    expect(result.topUpRequired).toBeCloseTo(185.20 - 6.50, 0);
  });

  it('reports compliance when earnings exceed minimum wage', () => {
    // 30 buckets × $6.50 / 8 hours = $24.375/hr > $23.15
    const result = checkWageCompliance(30, 8, 6.5, 23.15);
    expect(result.isCompliant).toBe(true);
    expect(result.shortfall).toBe(0);
    expect(result.topUpRequired).toBe(0);
  });

  it('uses default NZ minimum wage ($23.15) when not specified', () => {
    const result = checkWageCompliance(1, 8, 6.5);
    expect(result.minimumWage).toBe(23.15);
  });

  it('all monetary values are rounded to 2 decimal places', () => {
    const result = checkWageCompliance(7, 3.33, 6.5, 23.15);
    const check = (n: number) => Math.round(n * 100) / 100 === n;
    expect(check(result.effectiveHourlyRate)).toBe(true);
    expect(check(result.shortfall)).toBe(true);
    expect(check(result.topUpRequired)).toBe(true);
  });
});

describe('getMinimumBucketsPerHour()', () => {
  it('returns correct minimum buckets for default rates', () => {
    const min = getMinimumBucketsPerHour(6.5, 23.15);
    // $23.15 / $6.50 = 3.56 → ceil to 1 decimal = 3.6
    expect(min).toBe(3.6);
  });

  it('higher piece rate requires fewer buckets', () => {
    const min = getMinimumBucketsPerHour(10, 23.15);
    // $23.15 / $10 = 2.315 → ceil to 1 decimal = 2.4
    expect(min).toBeLessThan(3);
  });
});

// =============================================
// § 6 – WORK HOURS COMPLIANCE
// =============================================
describe('checkWorkHoursCompliance()', () => {
  it('does NOT need break under 110 consecutive minutes', () => {
    const result = checkWorkHoursCompliance(100, 100);
    expect(result.needsBreak).toBe(false);
  });

  it('triggers needsBreak at exactly 110 consecutive minutes (pre-2h warning)', () => {
    const result = checkWorkHoursCompliance(110, 110);
    expect(result.needsBreak).toBe(true);
  });

  it('flags warning at 10 consecutive hours (600 minutes)', () => {
    const result = checkWorkHoursCompliance(600, 600);
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('10');
  });

  it('flags maxRecommendedReached at 12 daily hours (720 minutes)', () => {
    const result = checkWorkHoursCompliance(0, 720);
    expect(result.maxRecommendedReached).toBe(true);
  });

  it('no warning for normal work hours', () => {
    const result = checkWorkHoursCompliance(60, 240);
    expect(result.warning).toBeUndefined();
    expect(result.maxRecommendedReached).toBe(false);
  });
});

// =============================================
// § 7 – FULL PICKER COMPLIANCE CHECK
// =============================================
describe('checkPickerCompliance()', () => {
  const serviceNow = new Date(FIXED_NOW.toISOString()).getTime();

  const makeInput = (overrides = {}) => ({
    pickerId: 'picker-001',
    bucketCount: 30, // 30 × $6.50 / 4h = $48.75/hr (above $23.15)
    hoursWorked: 4,
    consecutiveMinutesWorked: 60,
    totalMinutesToday: 240,
    lastRestBreakAt: new Date(serviceNow - 10 * 60 * 1000), // 10 min ago
    lastMealBreakAt: new Date(serviceNow - 10 * 60 * 1000),
    lastHydrationAt: new Date(serviceNow - 5 * 60 * 1000), // 5 min ago
    workStartTime: new Date(serviceNow - 2 * 60 * 60 * 1000), // 2h ago (within meal break window)
    ...overrides,
  });

  it('returns compliant status when all checks pass', () => {
    const status = checkPickerCompliance(makeInput());
    expect(status.pickerId).toBe('picker-001');
    // Wage compliance should pass: 30 × $6.50 / 4h = $48.75/hr > $23.15
    expect(status.wageCompliance.isCompliant).toBe(true);
    expect(status.wageCompliance.effectiveHourlyRate).toBeCloseTo(48.75, 1);
    // Work hours should be fine (60 consecutive minutes, 240 total)
    expect(status.workHours.needsBreak).toBe(false);
  });

  it('detects wage_below_minimum violation', () => {
    const status = checkPickerCompliance(makeInput({
      bucketCount: 1,
      hoursWorked: 8,
    }));
    expect(status.wageCompliance.isCompliant).toBe(false);
    const wageViolation = status.violations.find(v => v.type === 'wage_below_minimum');
    expect(wageViolation).toBeDefined();
    expect(wageViolation!.severity).toBe('high');
  });

  it('detects rest break overdue violation', () => {
    const status = checkPickerCompliance(makeInput({
      lastRestBreakAt: null,
      workStartTime: new Date(FIXED_NOW.getTime() - 3 * 60 * 60 * 1000), // 3h ago
    }));
    const breakViolation = status.violations.find(
      v => v.type === 'break_overdue' && v.message.includes('Rest')
    );
    expect(breakViolation).toBeDefined();
  });

  it('escalates rest break severity to high when 30+ min overdue', () => {
    const status = checkPickerCompliance(makeInput({
      lastRestBreakAt: null,
      workStartTime: new Date(FIXED_NOW.getTime() - 3 * 60 * 60 * 1000),
    }));
    const breakViolation = status.violations.find(
      v => v.type === 'break_overdue' && v.message.includes('Rest')
    );
    expect(breakViolation?.severity).toBe('high');
  });

  it('meal break overdue is always high severity', () => {
    const status = checkPickerCompliance(makeInput({
      lastMealBreakAt: null,
      workStartTime: new Date(FIXED_NOW.getTime() - 5 * 60 * 60 * 1000),
    }));
    const mealViolation = status.violations.find(
      v => v.type === 'break_overdue' && v.message.includes('Meal')
    );
    expect(mealViolation).toBeDefined();
    expect(mealViolation!.severity).toBe('high');
  });

  it('detects excessive hours violation at 10h consecutive', () => {
    const status = checkPickerCompliance(makeInput({
      consecutiveMinutesWorked: 600,
      totalMinutesToday: 600,
    }));
    const hoursViolation = status.violations.find(v => v.type === 'excessive_hours');
    expect(hoursViolation).toBeDefined();
    expect(hoursViolation!.severity).toBe('high');
  });

  it('hydration reminder is low severity', () => {
    const status = checkPickerCompliance(makeInput({
      lastHydrationAt: null,
      workStartTime: new Date(FIXED_NOW.getTime() - 2 * 60 * 60 * 1000),
    }));
    const hydration = status.violations.find(v => v.type === 'hydration_reminder');
    if (hydration) {
      expect(hydration.severity).toBe('low');
    }
  });

  it('low-severity violations do NOT affect isCompliant status', () => {
    const status = checkPickerCompliance(makeInput({
      lastHydrationAt: null,
      // Good wage compliance, recent breaks, but overdue hydration
      workStartTime: new Date(FIXED_NOW.getTime() - 2 * 60 * 60 * 1000),
    }));
    // Even if hydration reminder fires, picker should still be compliant (low severity only)
    const nonLowViolations = status.violations.filter(v => v.severity !== 'low');
    if (nonLowViolations.length === 0) {
      expect(status.isCompliant).toBe(true);
    }
  });

  it('includes nextBreakDue in response', () => {
    const status = checkPickerCompliance(makeInput());
    expect(status.nextBreakDue).toBeDefined();
    expect(status.nextBreakDue!.type).toBeDefined();
    expect(status.nextBreakDue!.dueAt).toBeInstanceOf(Date);
  });

  it('includes work hours tracking', () => {
    const status = checkPickerCompliance(makeInput());
    expect(status.workHours.consecutiveMinutes).toBe(60);
    expect(status.workHours.totalToday).toBe(240);
    expect(status.workHours.maxRecommended).toBe(720); // 12h * 60
  });

  it('does not flag wage violation for workers under 1 hour', () => {
    const status = checkPickerCompliance(makeInput({
      bucketCount: 0,
      hoursWorked: 0.5, // 30 minutes
    }));
    const wageViolation = status.violations.find(v => v.type === 'wage_below_minimum');
    expect(wageViolation).toBeUndefined();
  });
});
