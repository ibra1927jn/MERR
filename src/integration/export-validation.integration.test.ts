/**
 * INTEGRATION TEST: Export + Payroll Pipeline
 *
 * Tests: store crew data → preparePayrollData → generateCSV → verify output
 * Uses REAL exportService, REAL compliance math. Only Supabase/nzst mocked.
 */
import { describe, it, expect, vi, _beforeEach } from 'vitest';
import { exportService } from '@/services/export.service';
import { validationService } from '@/services/validation.service';
import type { Picker } from '@/types';

// Mock nzst to avoid timezone issues in tests
vi.mock('@/utils/nzst', () => ({
  todayNZST: vi.fn(() => '2026-03-09'),
  nowNZST: vi.fn(() => new Date().toISOString()),
}));

// ── Helpers ──────────────────────────────────
function makePicker(
  id: string,
  name: string,
  buckets: number,
  hours: number,
  status = 'active'
): Picker {
  return {
    id,
    name,
    status,
    checked_in_today: true,
    total_buckets_today: buckets,
    hours,
    current_row: 1,
    role: 'picker',
    avatar: name[0],
    picker_id: `EMP-${id}`,
  } as Picker;
}

// ── EXPORT SERVICE INTEGRATION ────────────────

describe('Export + Payroll Pipeline — Integration', () => {
  describe('preparePayrollData', () => {
    it('produces correct payroll for single picker', () => {
      const crew = [makePicker('p1', 'Alice', 20, 4)];
      const data = exportService.preparePayrollData(crew, '2026-03-09');

      expect(data.date).toBe('2026-03-09');
      expect(data.crew.length).toBe(1);

      const alice = data.crew[0];
      expect(alice.name).toBe('Alice');
      expect(alice.buckets).toBe(20);
      expect(alice.hours).toBe(4);
      // Piece: 20 × PIECE_RATE (default $3.50) = $70
      expect(alice.pieceEarnings).toBeGreaterThan(0);
      // Min wage: 4 × $23.95 = $94
      // If piece < min, top-up = min - piece
      expect(alice.totalEarnings).toBeGreaterThanOrEqual(alice.pieceEarnings);
    });

    it('produces correct summary for multiple pickers', () => {
      const crew = [
        makePicker('p1', 'Alice', 20, 4),
        makePicker('p2', 'Bob', 50, 6),
        makePicker('p3', 'Carlo', 100, 8),
      ];
      const data = exportService.preparePayrollData(crew, '2026-03-09');

      expect(data.crew.length).toBe(3);
      expect(data.summary.totalBuckets).toBe(170); // 20+50+100
      expect(data.summary.totalHours).toBeGreaterThan(0);
      expect(data.summary.grandTotal).toBeGreaterThan(0);
      expect(data.summary.averageBucketsPerHour).toBeGreaterThan(0);
    });

    it('custom piece rate applied correctly', () => {
      const crew = [makePicker('p1', 'Alice', 10, 4)];
      const data = exportService.preparePayrollData(crew, '2026-03-09', { pieceRate: 5.0 });

      const alice = data.crew[0];
      expect(alice.pieceEarnings).toBe(50); // 10 × $5.00
    });

    it('custom min wage applied correctly', () => {
      const crew = [makePicker('p1', 'Alice', 1, 8)]; // 1 bucket, 8 hours
      const data = exportService.preparePayrollData(crew, '2026-03-09', {
        pieceRate: 3.5,
        minWage: 25.0,
      });

      const alice = data.crew[0];
      // Piece: 1 × $3.50 = $3.50
      // Min: 8 × $25.00 = $200
      // Top-up: $200 - $3.50 = $196.50
      expect(alice.minimumTopUp).toBeCloseTo(196.5, 1);
      expect(alice.totalEarnings).toBeCloseTo(200, 0);
    });

    it('unpaid break deduction applied for workers >6h', () => {
      const crew = [makePicker('p1', 'Alice', 50, 8)];
      const data = exportService.preparePayrollData(crew, '2026-03-09', {
        unpaidBreakMinutes: 30, // 30 min break
      });

      // 8h gross - 0.5h break = 7.5h net
      expect(data.crew[0].hours).toBe(7.5);
    });

    it('unpaid break NOT deducted for workers ≤6h', () => {
      const crew = [makePicker('p1', 'Alice', 50, 5)];
      const data = exportService.preparePayrollData(crew, '2026-03-09', {
        unpaidBreakMinutes: 30,
      });

      expect(data.crew[0].hours).toBe(5); // No deduction
    });

    it('zero hours → averageBucketsPerHour is 0', () => {
      const crew = [makePicker('p1', 'Alice', 10, 0)];
      const data = exportService.preparePayrollData(crew, '2026-03-09');

      expect(data.summary.averageBucketsPerHour).toBe(0);
    });
  });

  describe('generateCSV', () => {
    it('CSV contains headers and picker data', () => {
      const crew = [makePicker('p1', 'Alice', 20, 4)];
      const data = exportService.preparePayrollData(crew, '2026-03-09');
      const csv = exportService.generateCSV(data);

      expect(csv).toContain('Employee ID');
      expect(csv).toContain('Name');
      expect(csv).toContain('Buckets');
      expect(csv).toContain('Hours');
      expect(csv).toContain('Alice');
      expect(csv).toContain('SUMMARY');
    });

    it('CSV contains correct summary totals', () => {
      const crew = [makePicker('p1', 'Alice', 20, 4), makePicker('p2', 'Bob', 30, 6)];
      const data = exportService.preparePayrollData(crew, '2026-03-09');
      const csv = exportService.generateCSV(data);

      expect(csv).toContain('Total Buckets');
      expect(csv).toContain('50'); // 20+30
      expect(csv).toContain('Grand Total');
    });

    it('CSV sanitizes formula injection', () => {
      const crew = [
        {
          ...makePicker('p1', '=HYPERLINK("evil")', 10, 4),
          name: '=HYPERLINK("evil")',
        },
      ] as Picker[];
      const data = exportService.preparePayrollData(crew, '2026-03-09');
      const csv = exportService.generateCSV(data);

      // Cell should be escaped with leading apostrophe
      expect(csv).toContain("'=HYPERLINK");
    });
  });

  describe('Full pipeline: store → prepare → CSV', () => {
    it('10-picker payroll produces valid CSV with all rows', () => {
      const crew = Array.from({ length: 10 }, (_, i) =>
        makePicker(`p${i}`, `Worker ${i}`, 20 + i * 5, 4 + i * 0.5)
      );
      const data = exportService.preparePayrollData(crew, '2026-03-09');
      const csv = exportService.generateCSV(data);

      // All 10 workers in CSV
      expect(data.crew.length).toBe(10);
      for (let i = 0; i < 10; i++) {
        expect(csv).toContain(`Worker ${i}`);
      }
      // Summary correct
      expect(data.summary.totalBuckets).toBe(
        Array.from({ length: 10 }, (_, i) => 20 + i * 5).reduce((a, b) => a + b, 0)
      ); // 20+25+30+35+40+45+50+55+60+65 = 425
    });
  });
});

// ── VALIDATION + SANITIZATION INTEGRATION ─────

describe('Validation + Sanitization Pipeline — Integration', () => {
  describe('Email → Sanitize → Validate', () => {
    it('valid email passes', () => {
      const email = 'worker@harvestpro.co.nz';
      const result = validationService.validateEmail(email);
      expect(result.valid).toBe(true);
    });

    it('XSS in email name rejected', () => {
      const email = '<script>@evil.com';
      const result = validationService.validateEmail(email);
      expect(result.valid).toBe(false);
    });

    it('empty email rejected', () => {
      expect(validationService.validateEmail('').valid).toBe(false);
    });
  });

  describe('Name → Sanitize → Validate', () => {
    it('valid NZ Māori name passes', () => {
      const result = validationService.validateName("Tama O'Brien-Smith");
      expect(result.valid).toBe(true);
    });

    it('name with XSS rejected', () => {
      const sanitized = validationService.sanitizeString('<script>alert(1)</script>');
      expect(sanitized).not.toContain('<script>');
    });

    it('sanitizeName trims and normalizes', () => {
      const cleaned = validationService.sanitizeName('  John   Doe  ');
      expect(cleaned).toBe('John Doe');
    });
  });

  describe('Phone → Sanitize → Validate', () => {
    it('NZ mobile passes', () => {
      const result = validationService.validatePhone('0274123456', true);
      expect(result.valid).toBe(true);
    });

    it('international format passes', () => {
      const result = validationService.validatePhone('+6474123456');
      expect(result.valid).toBe(true);
    });

    it('sanitizePhone strips non-digits', () => {
      const cleaned = validationService.sanitizePhone('+64 27-412-3456');
      expect(cleaned).toMatch(/^\+?\d+$/);
    });
  });

  describe('Employee ID validation', () => {
    it('valid employee ID passes', () => {
      expect(validationService.validateEmployeeId('EMP-12345').valid).toBe(true);
    });

    it('invalid employee ID fails', () => {
      expect(validationService.validateEmployeeId('').valid).toBe(false);
    });
  });

  describe('UUID validation', () => {
    it('valid UUID passes', () => {
      expect(validationService.validateUUID('550e8400-e29b-41d4-a716-446655440000').valid).toBe(
        true
      );
    });

    it('invalid UUID fails', () => {
      expect(validationService.validateUUID('not-a-uuid').valid).toBe(false);
    });
  });

  describe('SQL injection防御 — sanitizeForQuery', () => {
    it('escapes single quotes for defense-in-depth', () => {
      const result = validationService.sanitizeForQuery("'; DROP TABLE users; --");
      // sanitizeForQuery escapes quotes ('' → '''') as parameterized query protection
      expect(result).toContain("''");
    });

    it('trims and removes null bytes', () => {
      const result = validationService.sanitizeForQuery('  test\0value  ');
      expect(result).toBe('testvalue');
    });
  });

  describe('Batch validation: validateFields', () => {
    it('validates multiple fields at once', () => {
      const result = validationService.validateFields([
        {
          field: 'email',
          value: 'test@example.com',
          validator: v => validationService.validateEmail(v as string),
        },
        {
          field: 'name',
          value: 'Alice Smith',
          validator: v => validationService.validateName(v as string),
        },
      ]);

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('reports all field errors', () => {
      const result = validationService.validateFields([
        {
          field: 'email',
          value: 'bad-email',
          validator: v => validationService.validateEmail(v as string),
        },
        { field: 'name', value: '', validator: v => validationService.validateName(v as string) },
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors['email']).toBeDefined();
      expect(result.errors['name']).toBeDefined();
    });
  });
});
