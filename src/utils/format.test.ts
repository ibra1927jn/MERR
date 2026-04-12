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

describe('format utilities', () => {
  describe('formatNZD', () => {
    it('formats positive amount with cents', () => {
      const result = formatNZD(23.15);
      expect(result).toContain('23');
      expect(result).toContain('15');
    });

    it('formats zero', () => {
      const result = formatNZD(0);
      expect(result).toContain('0');
    });

    it('formats negative amount', () => {
      const result = formatNZD(-50.5);
      expect(result).toContain('50');
    });

    it('hides cents when showCents is false', () => {
      const result = formatNZD(23.99, false);
      // Sin decimales, deberia redondear
      expect(result).not.toContain('.99');
    });

    it('formats large amounts with grouping', () => {
      const result = formatNZD(1234567.89);
      expect(result).toContain('1');
      expect(result).toContain('234');
    });
  });

  describe('formatNZDRaw', () => {
    it('formats without currency symbol', () => {
      const result = formatNZDRaw(23.15);
      expect(result).not.toContain('$');
      expect(result).toContain('23');
    });

    it('respects custom decimals', () => {
      const result = formatNZDRaw(5.1, 0);
      expect(result).toBe('5');
    });

    it('formats zero', () => {
      const result = formatNZDRaw(0);
      expect(result).toContain('0');
    });
  });

  describe('formatDateNZ', () => {
    it('formats Date object as NZ short date', () => {
      // 2026-03-20 en NZ timezone
      const result = formatDateNZ(new Date('2026-03-20T12:00:00Z'));
      expect(result).toMatch(/20/);
      expect(result).toMatch(/03/);
      expect(result).toMatch(/2026/);
    });

    it('formats ISO string as NZ short date', () => {
      const result = formatDateNZ('2026-01-05T00:00:00Z');
      expect(result).toMatch(/2026/);
    });
  });

  describe('formatDateLongNZ', () => {
    it('formats Date as long NZ date with month name', () => {
      const result = formatDateLongNZ(new Date('2026-03-20T12:00:00Z'));
      expect(result).toMatch(/March/);
      expect(result).toMatch(/2026/);
    });

    it('formats string input', () => {
      const result = formatDateLongNZ('2026-12-25T00:00:00Z');
      expect(result).toMatch(/December/);
    });
  });

  describe('formatDateTimeNZ', () => {
    it('formats Date with time component', () => {
      const result = formatDateTimeNZ(new Date('2026-03-20T09:45:00Z'));
      expect(result).toMatch(/2026/);
    });

    it('formats string input with time', () => {
      const result = formatDateTimeNZ('2026-06-15T14:30:00Z');
      expect(result).toMatch(/2026/);
    });
  });

  describe('formatHours', () => {
    it('formats full hours only', () => {
      expect(formatHours(8)).toBe('8h');
    });

    it('formats minutes only when less than 1 hour', () => {
      expect(formatHours(0.5)).toBe('30m');
    });

    it('formats hours and minutes', () => {
      expect(formatHours(8.75)).toBe('8h 45m');
    });

    it('formats zero as 0m', () => {
      expect(formatHours(0)).toBe('0m');
    });

    it('formats 1.5 hours', () => {
      expect(formatHours(1.5)).toBe('1h 30m');
    });
  });

  describe('formatHourlyRate', () => {
    it('formats rate with /hr suffix', () => {
      const result = formatHourlyRate(23.15);
      expect(result).toContain('/hr');
      expect(result).toContain('23');
    });
  });

  describe('formatPieceRate', () => {
    it('formats rate with /bin suffix', () => {
      const result = formatPieceRate(6.5);
      expect(result).toContain('/bin');
      expect(result).toContain('6');
    });
  });

  describe('formatPercent', () => {
    it('formats with default 1 decimal', () => {
      expect(formatPercent(98.333)).toBe('98.3%');
    });

    it('formats with custom decimals', () => {
      expect(formatPercent(98.333, 2)).toBe('98.33%');
    });

    it('formats zero', () => {
      expect(formatPercent(0)).toBe('0.0%');
    });

    it('formats 100%', () => {
      expect(formatPercent(100)).toBe('100.0%');
    });
  });
});
