/**
 * Tests for config/nz-tax-rates.ts — NZ tax year configurations
 */
import { describe, it, expect } from 'vitest';
import {
  NZ_TAX_YEARS,
  getTaxYearConfig,
  getCurrentTaxYear,
} from './nz-tax-rates';

describe('NZ_TAX_YEARS', () => {
  it('has at least 2 entries', () => {
    expect(NZ_TAX_YEARS.length).toBeGreaterThanOrEqual(2);
  });

  it('entries are sorted most recent first', () => {
    for (let i = 0; i < NZ_TAX_YEARS.length - 1; i++) {
      expect(NZ_TAX_YEARS[i].effectiveFrom > NZ_TAX_YEARS[i + 1].effectiveFrom).toBe(true);
    }
  });
});

describe('2025-2026 tax year config', () => {
  const config = NZ_TAX_YEARS.find((c) => c.taxYear === '2025-2026')!;

  it('exists', () => {
    expect(config).toBeDefined();
  });

  it('has correct PAYE brackets', () => {
    expect(config.payeBrackets).toHaveLength(5);
    expect(config.payeBrackets[0]).toEqual({ upTo: 15_600, rate: 0.105 });
    expect(config.payeBrackets[1]).toEqual({ upTo: 53_500, rate: 0.175 });
    expect(config.payeBrackets[2]).toEqual({ upTo: 78_100, rate: 0.30 });
    expect(config.payeBrackets[3]).toEqual({ upTo: 180_000, rate: 0.33 });
    expect(config.payeBrackets[4].upTo).toBe(Infinity);
    expect(config.payeBrackets[4].rate).toBe(0.39);
  });

  it('has minimum wage 23.15', () => {
    expect(config.minimumWageHourly).toBe(23.15);
  });

  it('has ACC earner levy rate of 0.016', () => {
    expect(config.accEarnerLevyRate).toBe(0.016);
  });

  it('has KiwiSaver rates [0.03, 0.04, 0.06, 0.08, 0.10]', () => {
    expect([...config.kiwisaverEmployeeRates]).toEqual([0.03, 0.04, 0.06, 0.08, 0.10]);
  });

  it('weekly PAYE brackets are approx 1/52 of annual', () => {
    expect(config.payeBracketsWeekly).toHaveLength(config.payeBrackets.length);
    for (let i = 0; i < config.payeBrackets.length; i++) {
      const annual = config.payeBrackets[i];
      const weekly = config.payeBracketsWeekly[i];
      // Rates must match exactly
      expect(weekly.rate).toBe(annual.rate);
      // Thresholds should be ~annual/52 (rounded)
      if (annual.upTo !== Infinity) {
        const expected = Math.round((annual.upTo / 52) * 100) / 100;
        expect(weekly.upTo).toBe(expected);
      } else {
        expect(weekly.upTo).toBe(Infinity);
      }
    }
  });
});

describe('getTaxYearConfig', () => {
  it('returns 2025-2026 for a date in that range', () => {
    const config = getTaxYearConfig(new Date('2025-10-15'));
    expect(config.taxYear).toBe('2025-2026');
  });

  it('returns 2024-2025 for a date in that range', () => {
    const config = getTaxYearConfig(new Date('2024-10-15'));
    expect(config.taxYear).toBe('2024-2025');
  });

  it('returns most recent config for a future date', () => {
    const config = getTaxYearConfig(new Date('2030-01-01'));
    // Should fallback to the most recent (first) entry
    expect(config.taxYear).toBe(NZ_TAX_YEARS[0].taxYear);
  });

  it('returns a config when no date is provided', () => {
    const config = getTaxYearConfig();
    expect(config).toBeDefined();
    expect(config.taxYear).toBeTruthy();
  });
});

describe('getCurrentTaxYear', () => {
  it('returns a valid config', () => {
    const config = getCurrentTaxYear();
    expect(config).toBeDefined();
    expect(config.taxYear).toBeTruthy();
    expect(config.payeBrackets.length).toBeGreaterThan(0);
    expect(config.minimumWageHourly).toBeGreaterThan(0);
  });

  it('returns same result on consecutive calls (caching)', () => {
    const a = getCurrentTaxYear();
    const b = getCurrentTaxYear();
    expect(a).toBe(b); // Same reference due to caching
  });
});
