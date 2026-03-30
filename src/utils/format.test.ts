/**
 * Tests for utils/format.ts — NZD currency, date, and number formatting
 */
import { describe, it, expect } from 'vitest';
import {
  formatNZD,
  formatNZDRaw,
  formatDateNZ,
  formatDateLongNZ,
  formatDateTimeNZ,
  formatHours,
  formatHourlyRate,
  formatPieceRate,
  formatPercent,
} from './format';

describe('formatNZD', () => {
  it('formats 23.15 as "$23.15"', () => {
    expect(formatNZD(23.15)).toBe('$23.15');
  });

  it('formats without cents when showCents=false', () => {
    expect(formatNZD(23.15, false)).toBe('$23');
  });

  it('formats zero as "$0.00"', () => {
    expect(formatNZD(0)).toBe('$0.00');
  });

  it('formats large numbers with grouping', () => {
    const result = formatNZD(1234567.89);
    // en-NZ uses comma grouping
    expect(result).toContain('1,234,567');
    expect(result).toContain('89');
    expect(result).toContain('$');
  });

  it('formats negative amounts', () => {
    const result = formatNZD(-50.25);
    expect(result).toContain('50.25');
  });
});

describe('formatNZDRaw', () => {
  it('formats without $ sign', () => {
    const result = formatNZDRaw(1234.56);
    expect(result).not.toContain('$');
    expect(result).toContain('1,234');
    expect(result).toContain('56');
  });

  it('respects custom decimal places', () => {
    const result = formatNZDRaw(100, 0);
    expect(result).toBe('100');
  });
});

describe('formatDateNZ', () => {
  it('formats ISO date string to NZ short format (dd/mm/yyyy)', () => {
    // Use a UTC midnight date to avoid timezone shifting the day
    const result = formatDateNZ('2026-03-20T00:00:00Z');
    // In Pacific/Auckland (NZDT, UTC+13), this is 20 March 2026 afternoon
    expect(result).toMatch(/20\/03\/2026/);
  });

  it('accepts a Date object', () => {
    const result = formatDateNZ(new Date('2026-03-20T00:00:00Z'));
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('formatDateLongNZ', () => {
  it('formats ISO date string to NZ long format', () => {
    const result = formatDateLongNZ('2026-03-20T00:00:00Z');
    expect(result).toContain('March');
    expect(result).toContain('2026');
    expect(result).toContain('20');
  });
});

describe('formatDateTimeNZ', () => {
  it('formats ISO datetime with time portion', () => {
    const result = formatDateTimeNZ('2026-03-20T09:45:00Z');
    // Should have a date and time
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    // Should include am or pm
    expect(result.toLowerCase()).toMatch(/[ap]m/);
  });
});

describe('formatHours', () => {
  it('formats 8.75 as "8h 45m"', () => {
    expect(formatHours(8.75)).toBe('8h 45m');
  });

  it('formats 0.5 as "30m" (no hours)', () => {
    expect(formatHours(0.5)).toBe('30m');
  });

  it('formats 3 as "3h" (no minutes)', () => {
    expect(formatHours(3)).toBe('3h');
  });

  it('formats 0 as "0m"', () => {
    expect(formatHours(0)).toBe('0m');
  });

  it('formats 1.25 as "1h 15m"', () => {
    expect(formatHours(1.25)).toBe('1h 15m');
  });
});

describe('formatHourlyRate', () => {
  it('includes "/hr" suffix', () => {
    const result = formatHourlyRate(23.15);
    expect(result).toContain('/hr');
    expect(result).toContain('$23.15');
  });
});

describe('formatPieceRate', () => {
  it('includes "/bin" suffix', () => {
    const result = formatPieceRate(6.50);
    expect(result).toContain('/bin');
    expect(result).toContain('$6.50');
  });
});

describe('formatPercent', () => {
  it('formats 98.333 with 1 decimal as "98.3%"', () => {
    expect(formatPercent(98.333)).toBe('98.3%');
  });

  it('formats 100 with 0 decimals as "100%"', () => {
    expect(formatPercent(100, 0)).toBe('100%');
  });

  it('formats 0 as "0.0%"', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });
});
