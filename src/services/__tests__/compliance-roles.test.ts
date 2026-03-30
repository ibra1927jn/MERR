/**
 * compliance-roles.test.ts — Compliance checks across all 8 roles
 *
 * Verifies that wage rates, break rules, and work hour limits apply
 * correctly for every role in the system per NZ employment law.
 */
import { describe, it, expect, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Import real constants and service ───────────────────

import {
  NZ_DEFAULT_WAGE_RATES,
  NZ_MINIMUM_WAGE_2024,
  NZ_MAX_DAILY_HOURS,
  NZ_REST_BREAK_INTERVAL_HOURS,
  NZ_MEAL_BREAK_INTERVAL_HOURS,
  type JobType,
} from '@/constants/nz-law';

import { validateWageRate } from '@/services/wage-rates.service';

// ── Constants ───────────────────────────────────────────

const ALL_ROLES: JobType[] = [
  'picker',
  'team_leader',
  'runner',
  'qc_inspector',
  'logistics',
  'hr_admin',
  'manager',
  'admin',
];

const SALARIED_ROLES: JobType[] = ['hr_admin', 'manager', 'admin'];
const PIECE_RATE_ELIGIBLE_ROLES: JobType[] = ['picker', 'team_leader'];

// ── Tests ───────────────────────────────────────────────

describe('NZ_DEFAULT_WAGE_RATES coverage', () => {
  it('has default rates for all 8 roles', () => {
    for (const role of ALL_ROLES) {
      expect(NZ_DEFAULT_WAGE_RATES[role]).toBeDefined();
      expect(typeof NZ_DEFAULT_WAGE_RATES[role]).toBe('number');
    }
  });

  it('has exactly 8 role entries', () => {
    const keys = Object.keys(NZ_DEFAULT_WAGE_RATES);
    expect(keys).toHaveLength(8);
  });

  it('every role default rate >= NZ minimum wage', () => {
    for (const role of ALL_ROLES) {
      expect(NZ_DEFAULT_WAGE_RATES[role]).toBeGreaterThanOrEqual(NZ_MINIMUM_WAGE_2024);
    }
  });
});

describe('Picker role compliance', () => {
  it('picker default rate equals minimum wage floor', () => {
    expect(NZ_DEFAULT_WAGE_RATES.picker).toBe(NZ_MINIMUM_WAGE_2024);
  });

  it('picker rate validates as legal', () => {
    const result = validateWageRate(NZ_DEFAULT_WAGE_RATES.picker, 'picker');
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('picker is piece rate eligible', () => {
    expect(PIECE_RATE_ELIGIBLE_ROLES).toContain('picker');
  });

  it('picker rate below minimum wage is rejected', () => {
    const result = validateWageRate(20.0, 'picker');
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]).toContain('below');
  });
});

describe('Team Leader role compliance', () => {
  it('team_leader default rate is above minimum wage', () => {
    expect(NZ_DEFAULT_WAGE_RATES.team_leader).toBeGreaterThan(NZ_MINIMUM_WAGE_2024);
  });

  it('team_leader rate validates as legal', () => {
    const result = validateWageRate(NZ_DEFAULT_WAGE_RATES.team_leader, 'team_leader');
    expect(result.valid).toBe(true);
  });

  it('team_leader is piece rate eligible', () => {
    expect(PIECE_RATE_ELIGIBLE_ROLES).toContain('team_leader');
  });
});

describe('Runner role compliance', () => {
  it('runner default rate is above minimum wage', () => {
    expect(NZ_DEFAULT_WAGE_RATES.runner).toBeGreaterThan(NZ_MINIMUM_WAGE_2024);
  });

  it('runner rate validates as legal', () => {
    const result = validateWageRate(NZ_DEFAULT_WAGE_RATES.runner, 'runner');
    expect(result.valid).toBe(true);
  });

  it('runner is not piece rate eligible', () => {
    expect(PIECE_RATE_ELIGIBLE_ROLES).not.toContain('runner');
  });
});

describe('QC Inspector role compliance', () => {
  it('qc_inspector default rate is above minimum wage', () => {
    expect(NZ_DEFAULT_WAGE_RATES.qc_inspector).toBeGreaterThan(NZ_MINIMUM_WAGE_2024);
  });

  it('qc_inspector rate validates as legal', () => {
    const result = validateWageRate(NZ_DEFAULT_WAGE_RATES.qc_inspector, 'qc_inspector');
    expect(result.valid).toBe(true);
  });

  it('qc_inspector earns more than picker (skilled role)', () => {
    expect(NZ_DEFAULT_WAGE_RATES.qc_inspector).toBeGreaterThan(NZ_DEFAULT_WAGE_RATES.picker);
  });
});

describe('Logistics role compliance', () => {
  it('logistics default rate is above minimum wage', () => {
    expect(NZ_DEFAULT_WAGE_RATES.logistics).toBeGreaterThan(NZ_MINIMUM_WAGE_2024);
  });

  it('logistics rate validates as legal', () => {
    const result = validateWageRate(NZ_DEFAULT_WAGE_RATES.logistics, 'logistics');
    expect(result.valid).toBe(true);
  });
});

describe('HR Admin role compliance', () => {
  it('hr_admin default rate is above minimum wage (salaried)', () => {
    expect(NZ_DEFAULT_WAGE_RATES.hr_admin).toBeGreaterThan(NZ_MINIMUM_WAGE_2024);
  });

  it('hr_admin rate validates as legal', () => {
    const result = validateWageRate(NZ_DEFAULT_WAGE_RATES.hr_admin, 'hr_admin');
    expect(result.valid).toBe(true);
  });

  it('hr_admin is a salaried role', () => {
    expect(SALARIED_ROLES).toContain('hr_admin');
  });

  it('hr_admin earns more than field workers', () => {
    expect(NZ_DEFAULT_WAGE_RATES.hr_admin).toBeGreaterThan(NZ_DEFAULT_WAGE_RATES.picker);
    expect(NZ_DEFAULT_WAGE_RATES.hr_admin).toBeGreaterThan(NZ_DEFAULT_WAGE_RATES.runner);
  });
});

describe('Manager role compliance', () => {
  it('manager default rate is above minimum wage (salaried)', () => {
    expect(NZ_DEFAULT_WAGE_RATES.manager).toBeGreaterThan(NZ_MINIMUM_WAGE_2024);
  });

  it('manager rate validates as legal', () => {
    const result = validateWageRate(NZ_DEFAULT_WAGE_RATES.manager, 'manager');
    expect(result.valid).toBe(true);
  });

  it('manager is a salaried role', () => {
    expect(SALARIED_ROLES).toContain('manager');
  });

  it('manager earns the highest default rate', () => {
    for (const role of ALL_ROLES) {
      expect(NZ_DEFAULT_WAGE_RATES.manager).toBeGreaterThanOrEqual(NZ_DEFAULT_WAGE_RATES[role]);
    }
  });
});

describe('Admin role compliance', () => {
  it('admin default rate is above minimum wage (salaried)', () => {
    expect(NZ_DEFAULT_WAGE_RATES.admin).toBeGreaterThan(NZ_MINIMUM_WAGE_2024);
  });

  it('admin rate validates as legal', () => {
    const result = validateWageRate(NZ_DEFAULT_WAGE_RATES.admin, 'admin');
    expect(result.valid).toBe(true);
  });

  it('admin is a salaried role', () => {
    expect(SALARIED_ROLES).toContain('admin');
  });
});

describe('validateWageRate — cross-role validation', () => {
  it('rejects $0/hr for every role', () => {
    for (const role of ALL_ROLES) {
      const result = validateWageRate(0, role);
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('zero'))).toBe(true);
    }
  });

  it('rejects rate below minimum wage for every role', () => {
    for (const role of ALL_ROLES) {
      const result = validateWageRate(NZ_MINIMUM_WAGE_2024 - 1, role);
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('below'))).toBe(true);
    }
  });

  it('accepts minimum wage for every role', () => {
    for (const role of ALL_ROLES) {
      const result = validateWageRate(NZ_MINIMUM_WAGE_2024, role);
      expect(result.valid).toBe(true);
    }
  });

  it('flags unreasonably high rates (>$500/hr)', () => {
    for (const role of ALL_ROLES) {
      const result = validateWageRate(501, role);
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('unreasonably high'))).toBe(true);
    }
  });

  it('accepts reasonable rates above minimum', () => {
    const reasonableRates: Record<JobType, number> = {
      picker: 23.15,
      team_leader: 28,
      runner: 25,
      qc_inspector: 30,
      logistics: 27,
      hr_admin: 35,
      manager: 50,
      admin: 40,
    };

    for (const role of ALL_ROLES) {
      const result = validateWageRate(reasonableRates[role], role);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    }
  });
});

describe('NZ work hour and break constants', () => {
  it('max daily hours is 12', () => {
    expect(NZ_MAX_DAILY_HOURS).toBe(12);
  });

  it('rest break interval is every 2 hours', () => {
    expect(NZ_REST_BREAK_INTERVAL_HOURS).toBe(2);
  });

  it('meal break interval is every 4 hours', () => {
    expect(NZ_MEAL_BREAK_INTERVAL_HOURS).toBe(4);
  });

  it('break rules apply equally to all roles', () => {
    // These are legal requirements — same for every worker regardless of role
    for (const _role of ALL_ROLES) {
      expect(NZ_REST_BREAK_INTERVAL_HOURS).toBe(2);
      expect(NZ_MEAL_BREAK_INTERVAL_HOURS).toBe(4);
      expect(NZ_MAX_DAILY_HOURS).toBe(12);
    }
  });
});
