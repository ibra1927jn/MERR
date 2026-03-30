/**
 * Export PDF Template Service — Unit Tests
 *
 * Tests for HTML generation for payroll reports,
 * including XSS escaping and content correctness.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/types', () => ({
  MINIMUM_WAGE: 23.15,
  PIECE_RATE: 0.80,
}));

// Mock export.service to provide the PayrollExportData type without importing the real module
vi.mock('../export.service', () => ({}));

import { escHtml, generatePDFContent } from '../export-pdf-template.service';

// ── Helpers ──────────────────────────────────────────

function makePayrollData(overrides: Record<string, unknown> = {}) {
  return {
    date: '2025-03-15',
    crew: [
      {
        id: 'p-001',
        name: 'Alice Smith',
        employeeId: 'EMP001',
        buckets: 20,
        hours: 8.0,
        pieceEarnings: 16.00,
        minimumTopUp: 169.20,
        totalEarnings: 185.20,
        status: 'active',
      },
      {
        id: 'p-002',
        name: 'Bob Jones',
        employeeId: 'EMP002',
        buckets: 50,
        hours: 8.0,
        pieceEarnings: 40.00,
        minimumTopUp: 145.20,
        totalEarnings: 185.20,
        status: 'active',
      },
    ],
    summary: {
      totalBuckets: 70,
      totalHours: 16.0,
      totalPieceEarnings: 56.00,
      totalMinimumTopUp: 314.40,
      grandTotal: 370.40,
      averageBucketsPerHour: 4.4,
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────

describe('export-pdf-template.service', () => {
  describe('escHtml', () => {
    it('escapes &, <, >, "', () => {
      expect(escHtml('a & b')).toBe('a &amp; b');
      expect(escHtml('<script>')).toBe('&lt;script&gt;');
      expect(escHtml('say "hello"')).toBe('say &quot;hello&quot;');
      expect(escHtml('a & <b> "c"')).toBe('a &amp; &lt;b&gt; &quot;c&quot;');
    });

    it('handles empty string', () => {
      expect(escHtml('')).toBe('');
    });

    it('passes through strings with no special characters', () => {
      expect(escHtml('Alice Smith')).toBe('Alice Smith');
    });
  });

  describe('generatePDFContent', () => {
    it('includes date in title', () => {
      const data = makePayrollData();
      const html = generatePDFContent(data as any);

      expect(html).toContain('<title>Payroll Report - 2025-03-15</title>');
      expect(html).toContain('Date: 2025-03-15');
    });

    it('includes crew member rows', () => {
      const data = makePayrollData();
      const html = generatePDFContent(data as any);

      expect(html).toContain('Alice Smith');
      expect(html).toContain('Bob Jones');
      expect(html).toContain('EMP001');
      expect(html).toContain('EMP002');
      expect(html).toContain('$185.20');
    });

    it('uses custom pieceRate/minWage from options', () => {
      const data = makePayrollData();
      const html = generatePDFContent(data as any, {
        pieceRate: 1.50,
        minWage: 25.00,
      });

      expect(html).toContain('$25/hr');
      expect(html).toContain('$1.5/bucket');
    });

    it('uses default PIECE_RATE and MINIMUM_WAGE when no options', () => {
      const data = makePayrollData();
      const html = generatePDFContent(data as any);

      expect(html).toContain('$23.15/hr');
      expect(html).toContain('$0.8/bucket');
    });

    it('includes summary totals', () => {
      const data = makePayrollData();
      const html = generatePDFContent(data as any);

      expect(html).toContain('70');         // totalBuckets
      expect(html).toContain('16.0');       // totalHours
      expect(html).toContain('$56.00');     // totalPieceEarnings
      expect(html).toContain('$314.40');    // totalMinimumTopUp
      expect(html).toContain('$370.40');    // grandTotal
      expect(html).toContain('4.4');        // averageBucketsPerHour
    });

    it('XSS-escapes employee names', () => {
      const data = makePayrollData({
        crew: [
          {
            id: 'p-xss',
            name: '<script>alert("xss")</script>',
            employeeId: 'EMP<injection>',
            buckets: 10,
            hours: 4.0,
            pieceEarnings: 8.00,
            minimumTopUp: 84.60,
            totalEarnings: 92.60,
            status: 'active',
          },
        ],
      });
      const html = generatePDFContent(data as any);

      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(html).toContain('EMP&lt;injection&gt;');
    });

    it('returns valid HTML document', () => {
      const data = makePayrollData();
      const html = generatePDFContent(data as any);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
      expect(html).toContain('HarvestPro NZ');
    });
  });
});
