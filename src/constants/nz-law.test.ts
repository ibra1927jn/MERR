/**
 * Tests for constants/nz-law.ts — NZ Employment Law constants
 */
import { describe, it, expect } from 'vitest';
import {
  NZ_MINIMUM_WAGE_2025,
  NZ_MINIMUM_WAGE_2024,
  NZ_STARTING_OUT_WAGE_2025,
  NZ_DEFAULT_PIECE_RATE,
  NZ_MAX_DAILY_HOURS,
  NZ_REST_BREAK_INTERVAL_HOURS,
  NZ_REST_BREAK_DURATION_MINUTES,
  NZ_MEAL_BREAK_INTERVAL_HOURS,
  NZ_MEAL_BREAK_DURATION_MINUTES,
  NZ_KIWISAVER_RATES,
  NZ_KIWISAVER_EMPLOYER_MIN,
  NZ_DEFAULT_WAGE_RATES,
} from './nz-law';

describe('NZ Minimum Wage', () => {
  it('NZ_MINIMUM_WAGE_2025 equals 23.15', () => {
    expect(NZ_MINIMUM_WAGE_2025).toBe(23.15);
  });

  it('NZ_MINIMUM_WAGE_2024 is alias for NZ_MINIMUM_WAGE_2025', () => {
    expect(NZ_MINIMUM_WAGE_2024).toBe(NZ_MINIMUM_WAGE_2025);
  });

  it('NZ_STARTING_OUT_WAGE_2025 equals 18.52', () => {
    expect(NZ_STARTING_OUT_WAGE_2025).toBe(18.52);
  });
});

describe('NZ Piece Rate', () => {
  it('NZ_DEFAULT_PIECE_RATE equals 6.5', () => {
    expect(NZ_DEFAULT_PIECE_RATE).toBe(6.5);
  });
});

describe('NZ Work Hours and Breaks', () => {
  it('NZ_MAX_DAILY_HOURS equals 12', () => {
    expect(NZ_MAX_DAILY_HOURS).toBe(12);
  });

  it('NZ_REST_BREAK_INTERVAL_HOURS equals 2', () => {
    expect(NZ_REST_BREAK_INTERVAL_HOURS).toBe(2);
  });

  it('NZ_REST_BREAK_DURATION_MINUTES equals 10', () => {
    expect(NZ_REST_BREAK_DURATION_MINUTES).toBe(10);
  });

  it('NZ_MEAL_BREAK_INTERVAL_HOURS equals 4', () => {
    expect(NZ_MEAL_BREAK_INTERVAL_HOURS).toBe(4);
  });

  it('NZ_MEAL_BREAK_DURATION_MINUTES equals 30', () => {
    expect(NZ_MEAL_BREAK_DURATION_MINUTES).toBe(30);
  });
});

describe('NZ KiwiSaver', () => {
  it('NZ_KIWISAVER_RATES has 5 rates: 3%, 4%, 6%, 8%, 10%', () => {
    expect(NZ_KIWISAVER_RATES).toHaveLength(5);
    expect([...NZ_KIWISAVER_RATES]).toEqual([0.03, 0.04, 0.06, 0.08, 0.10]);
  });

  it('NZ_KIWISAVER_EMPLOYER_MIN equals 0.03', () => {
    expect(NZ_KIWISAVER_EMPLOYER_MIN).toBe(0.03);
  });
});

describe('NZ Default Wage Rates', () => {
  const expectedJobTypes = [
    'picker',
    'team_leader',
    'runner',
    'qc_inspector',
    'logistics',
    'hr_admin',
    'manager',
    'admin',
  ];

  it('has all 8 job types', () => {
    const keys = Object.keys(NZ_DEFAULT_WAGE_RATES);
    expect(keys).toHaveLength(8);
    for (const jobType of expectedJobTypes) {
      expect(keys).toContain(jobType);
    }
  });

  it('all default wage rates are >= NZ_MINIMUM_WAGE_2025', () => {
    for (const [jobType, rate] of Object.entries(NZ_DEFAULT_WAGE_RATES)) {
      expect(rate, `${jobType} rate ${rate} should be >= ${NZ_MINIMUM_WAGE_2025}`).toBeGreaterThanOrEqual(
        NZ_MINIMUM_WAGE_2025
      );
    }
  });

  it('all rates are positive numbers', () => {
    for (const rate of Object.values(NZ_DEFAULT_WAGE_RATES)) {
      expect(rate).toBeGreaterThan(0);
    }
  });
});
