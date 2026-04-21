/**
 * Tests for analytics-trends.service.ts
 * Covers: getRowDensity, getDailyBleed
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock repositories
vi.mock('@/repositories/analytics-trends.repository', () => ({
  analyticsTrendsRepository: {
    getBucketsByRowInRange: vi.fn(),
    getDailyAggregates: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { AnalyticsTrendsService } from '../analytics-trends.service';
import { analyticsTrendsRepository } from '@/repositories/analytics-trends.repository';

describe('AnalyticsTrendsService', () => {
  let service: AnalyticsTrendsService;

  beforeEach(() => {
    service = new AnalyticsTrendsService();
    vi.clearAllMocks();
  });

  describe('getRowDensity', () => {
    it('returns empty result when no events', async () => {
      vi.mocked(analyticsTrendsRepository.getBucketsByRowInRange).mockResolvedValue([]);

      const result = await service.getRowDensity('orch-1', '2026-03-01', '2026-03-03');
      expect(result.total_buckets).toBe(0);
      expect(result.density_by_row).toEqual([]);
      expect(result.top_rows).toEqual([]);
      expect(result.pending_rows).toEqual([]);
    });

    it('throws on supabase error', async () => {
      vi.mocked(analyticsTrendsRepository.getBucketsByRowInRange).mockRejectedValue(
        new Error('DB error')
      );

      await expect(service.getRowDensity('orch-1', '2026-03-01', '2026-03-03')).rejects.toThrow(
        'DB error'
      );
    });

    it('calculates density correctly with events', async () => {
      const events = [
        { row_number: 1, picker_id: 'p1', scanned_at: '2026-03-01T08:00:00' },
        { row_number: 1, picker_id: 'p1', scanned_at: '2026-03-01T09:00:00' },
        { row_number: 1, picker_id: 'p2', scanned_at: '2026-03-01T09:30:00' },
        { row_number: 2, picker_id: 'p1', scanned_at: '2026-03-01T10:00:00' },
      ];
      vi.mocked(analyticsTrendsRepository.getBucketsByRowInRange).mockResolvedValue(events as any);

      const result = await service.getRowDensity('orch-1', '2026-03-01', '2026-03-03', 100);
      expect(result.total_buckets).toBe(4);
      expect(result.total_rows_harvested).toBe(2);
      expect(result.density_by_row).toHaveLength(2);

      const row1 = result.density_by_row.find(r => r.row_number === 1)!;
      expect(row1.total_buckets).toBe(3);
      expect(row1.unique_pickers).toBe(2);
      expect(row1.target_completion).toBe(3); // 3/100 * 100

      // Row 1 and 2 both below 50% → pending
      expect(result.pending_rows).toContain(1);
      expect(result.pending_rows).toContain(2);
    });

    it('identifies top rows (>=100% completion)', async () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        row_number: 5,
        picker_id: `p${i % 3}`,
        scanned_at: `2026-03-01T${String(8 + (i % 8)).padStart(2, '0')}:00:00`,
      }));
      vi.mocked(analyticsTrendsRepository.getBucketsByRowInRange).mockResolvedValue(events as any);

      const result = await service.getRowDensity('orch-1', '2026-03-01', '2026-03-03', 100);
      expect(result.top_rows).toContain(5);
    });
  });

  describe('getDailyBleed', () => {
    it('returns array with correct length (no orchardId)', async () => {
      const result = await service.getDailyBleed(undefined, 5);
      expect(result).toHaveLength(5);
    });

    it('labels last day as Today', async () => {
      const result = await service.getDailyBleed(undefined, 3);
      expect(result[result.length - 1].label).toBe('Today');
    });

    it('returns zeros when no orchardId provided', async () => {
      const result = await service.getDailyBleed(undefined, 7);
      result.forEach(d => expect(d.value).toBe(0));
    });

    it('returns zeros when no settings provided', async () => {
      const result = await service.getDailyBleed('orch-1', 7);
      result.forEach(d => expect(d.value).toBe(0));
    });

    it('computes bleed from getDailyAggregates when orchardId + settings provided', async () => {
      const { analyticsTrendsRepository: repo } = await import('@/repositories/analytics-trends.repository');
      // Use today's date (computed at test-run time) so the mock always falls
      // inside the 7-day rolling window the service uses. Hardcoded dates drift
      // out of the window once the wall-clock advances past them.
      const todayIso = new Date().toISOString().slice(0, 10);
      vi.mocked(repo.getDailyAggregates).mockResolvedValue([
        { date: todayIso, total_buckets: 100, workforce_count: 10 },
      ]);

      const result = await service.getDailyBleed('orch-1', 7, 'en-NZ', { piece_rate: 6.5, min_wage_rate: 23.95 });
      expect(result).toHaveLength(7);
      // bleed = max(0, 10 × 8 × 23.95 - 100 × 6.5) = max(0, 1916 - 650) = 1266
      const dayEntry = result.find(d => d.value > 0);
      expect(dayEntry).toBeDefined();
      expect(dayEntry?.value).toBeGreaterThan(0);
    });

    it('all values are non-negative', async () => {
      const result = await service.getDailyBleed(undefined, 7);
      result.forEach(d => expect(d.value).toBeGreaterThanOrEqual(0));
    });
  });
});
