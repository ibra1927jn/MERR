/**
 * Tests for mpi-export.service.ts
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('mpi-export.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports mpiExportService object', async () => {
    const { mpiExportService } = await import('@/services/mpi-export.service');
    expect(mpiExportService).toBeDefined();
    expect(typeof mpiExportService.generateBinTrace).toBe('function');
    expect(typeof mpiExportService.generateBatchExport).toBe('function');
    expect(typeof mpiExportService.checkReadiness).toBe('function');
    expect(typeof mpiExportService.exportAsCSV).toBe('function');
  });

  it('exportAsCSV generates valid CSV from MPIExportBatch', async () => {
    const { mpiExportService } = await import('@/services/mpi-export.service');
    const batch = {
      export_id: 'MPI-TEST-001',
      orchard_id: 'test-orchard',
      generated_at: '2026-03-19T10:00:00Z',
      date_range: { start: '2026-03-12', end: '2026-03-19' },
      total_bins: 1,
      complete_bins: 1,
      incomplete_bins: 0,
      compliance_percentage: 100,
      records: [
        {
          bin_id: 'BIN-001',
          orchard_id: 'test-orchard',
          orchard_name: 'Test Orchard',
          block_name: 'Block A',
          row_numbers: [1, 2, 3],
          variety: 'Lapin',
          harvest_date: '2026-03-19',
          harvest_time: '08:00:00',
          picker_ids: ['p1'],
          picker_names: ['John Doe'],
          quality_grade: 'A',
          weight_kg: 250,
          bucket_count: 45,
          coolstore_entry_at: '2026-03-19T12:00:00Z',
          packhouse_receipt_at: null,
          export_lot_id: null,
          completeness_score: 80,
          missing_fields: ['packhouse_receipt'],
        },
      ],
    };

    const csv = mpiExportService.exportAsCSV(batch);
    expect(csv).toContain('Bin ID');
    expect(csv).toContain('BIN-001');
    expect(csv).toContain('Test Orchard');
    expect(csv).toContain('Lapin');
    expect(csv.split('\n').length).toBe(2); // header + 1 row
  });
});
