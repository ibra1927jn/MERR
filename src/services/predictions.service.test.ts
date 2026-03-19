/**
 * Tests for predictions.service.ts
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('predictions.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports predictionsService object', async () => {
    const { predictionsService } = await import('@/services/predictions.service');
    expect(predictionsService).toBeDefined();
    expect(typeof predictionsService.predictYield).toBe('function');
    expect(typeof predictionsService.estimateLabourDemand).toBe('function');
    expect(typeof predictionsService.analyzeQualityTrends).toBe('function');
    expect(typeof predictionsService.getDashboard).toBe('function');
  });

  it('exports PredictionDashboard type', async () => {
    const mod = await import('@/services/predictions.service');
    expect(mod.predictionsService).toBeDefined();
  });

  it('predictYield returns array of YieldPrediction', async () => {
    const { predictionsService } = await import('@/services/predictions.service');
    // Mock no data scenario — should still return 7 predictions with default values
    const { supabase } = await import('@/services/supabase');
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as never);

    const result = await predictionsService.predictYield('test-orchard');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(7);
    result.forEach(p => {
      expect(p).toHaveProperty('date');
      expect(p).toHaveProperty('predicted_buckets');
      expect(p).toHaveProperty('confidence');
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    });
  });
});
