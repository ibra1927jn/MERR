/**
 * Wage Rates Service — Unit Tests
 *
 * Tests for configurable wage rates per job type,
 * NZ minimum wage compliance, and caching.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────

const mockUpsert = vi.fn();

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: mockUpsert,
    })),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/constants/nz-law', () => ({
  NZ_MINIMUM_WAGE_2024: 23.15,
  NZ_DEFAULT_WAGE_RATES: {
    picker: 23.15,
    team_leader: 26.00,
    runner: 24.00,
    qc_inspector: 27.50,
    logistics: 25.00,
    hr_admin: 32.00,
    manager: 45.00,
    admin: 35.00,
  },
}));

import {
  getCachedWageRates,
  getHourlyRate,
  validateWageRate,
  saveWageRate,
} from '../wage-rates.service';

// ── Helpers ──────────────────────────────────────────

const NZ_MINIMUM_WAGE_2024 = 23.15;

function makeConfig(overrides: Record<string, Partial<{ hourly_rate: number }>> = {}) {
  const defaults: Record<string, number> = {
    picker: 23.15,
    team_leader: 26.00,
    runner: 24.00,
    qc_inspector: 27.50,
    logistics: 25.00,
    hr_admin: 32.00,
    manager: 45.00,
    admin: 35.00,
  };

  const rates = Object.fromEntries(
    Object.entries(defaults).map(([jt, rate]) => [
      jt,
      {
        id: `default-${jt}`,
        orchard_id: 'orchard-1',
        job_type: jt,
        hourly_rate: overrides[jt]?.hourly_rate ?? rate,
        is_piece_rate_eligible: jt === 'picker' || jt === 'team_leader',
        piece_rate_per_bin: 6.5,
        effective_from: '2024-04-01',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ])
  );

  return { orchardId: 'orchard-1', rates, lastUpdated: new Date().toISOString() };
}

// ── Tests ──────────────────────────────────────────

describe('wage-rates.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getCachedWageRates', () => {
    it('returns defaults when no cache', () => {
      const config = getCachedWageRates('orchard-1');

      expect(config.orchardId).toBe('orchard-1');
      expect(config.rates.picker.hourly_rate).toBe(23.15);
      expect(config.rates.manager.hourly_rate).toBe(45.00);
      expect(config.rates.team_leader.hourly_rate).toBe(26.00);
    });

    it('returns from localStorage when available', () => {
      const cached = makeConfig();
      cached.rates.picker.hourly_rate = 30.00;
      localStorage.setItem('wage_rates_cache_orchard-1', JSON.stringify(cached));

      const config = getCachedWageRates('orchard-1');

      expect(config.rates.picker.hourly_rate).toBe(30.00);
    });
  });

  describe('getHourlyRate', () => {
    it('returns rate from config', () => {
      const config = makeConfig();
      const rate = getHourlyRate(config, 'manager');

      expect(rate).toBe(45.00);
    });

    it('clamps to minimum wage if rate below minimum', () => {
      const config = makeConfig({ picker: { hourly_rate: 15.00 } });
      const rate = getHourlyRate(config, 'picker');

      expect(rate).toBe(NZ_MINIMUM_WAGE_2024);
    });

    it('returns minimum wage for unknown job type', () => {
      const config = makeConfig();
      const rate = getHourlyRate(config, 'nonexistent_role');

      expect(rate).toBe(NZ_MINIMUM_WAGE_2024);
    });
  });

  describe('validateWageRate', () => {
    it('passes for valid rate', () => {
      const result = validateWageRate(30.00, 'picker');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('fails for rate below minimum', () => {
      const result = validateWageRate(20.00, 'picker');

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('below the NZ Minimum Wage');
    });

    it('fails for zero rate', () => {
      const result = validateWageRate(0, 'picker');

      expect(result.valid).toBe(false);
      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('below the NZ Minimum Wage'),
          expect.stringContaining('cannot be zero'),
        ])
      );
    });

    it('warns for rate above 500', () => {
      const result = validateWageRate(600, 'manager');

      expect(result.valid).toBe(false);
      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('unreasonably high'),
        ])
      );
    });
  });

  describe('saveWageRate', () => {
    it('rejects rate below minimum', async () => {
      const result = await saveWageRate('orchard-1', {
        job_type: 'picker',
        hourly_rate: 10.00,
        is_piece_rate_eligible: true,
        piece_rate_per_bin: 6.5,
        effective_from: '2025-04-01',
        updated_by: 'admin-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('below the NZ legal minimum wage');
    });

    it('calls supabase upsert on valid rate', async () => {
      mockUpsert.mockResolvedValue({ error: null });

      const result = await saveWageRate('orchard-1', {
        job_type: 'picker',
        hourly_rate: 25.00,
        is_piece_rate_eligible: true,
        piece_rate_per_bin: 6.5,
        effective_from: '2025-04-01',
        updated_by: 'admin-1',
      });

      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          orchard_id: 'orchard-1',
          job_type: 'picker',
          hourly_rate: 25.00,
        }),
        { onConflict: 'orchard_id,job_type' }
      );
    });

    it('returns error when supabase upsert fails', async () => {
      mockUpsert.mockResolvedValue({ error: { message: 'DB error' } });

      const result = await saveWageRate('orchard-1', {
        job_type: 'picker',
        hourly_rate: 25.00,
        is_piece_rate_eligible: true,
        piece_rate_per_bin: 6.5,
        effective_from: '2025-04-01',
        updated_by: 'admin-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });
});
