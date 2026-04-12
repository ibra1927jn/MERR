/**
 * format.ts — Unit tests for all NZD/date/number formatting utilities
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

// ──────────────────────────────────────────────────────
// formatNZD
// ──────────────────────────────────────────────────────
describe('formatNZD', () => {
    it('formats current minimum wage correctly', () => {
        expect(formatNZD(23.95)).toBe('$23.95');
    });

    it('formats zero as $0.00', () => {
        expect(formatNZD(0)).toBe('$0.00');
    });

    it('formats thousands with comma separator', () => {
        expect(formatNZD(1234.56)).toBe('$1,234.56');
    });

    it('formats large amounts', () => {
        expect(formatNZD(10000)).toBe('$10,000.00');
    });

    it('formats negative amounts', () => {
        expect(formatNZD(-5.5)).toBe('-$5.50');
    });

    it('hides cents when showCents=false', () => {
        expect(formatNZD(23.95, false)).toBe('$24');
    });

    it('rounds to whole dollar when showCents=false', () => {
        expect(formatNZD(23.40, false)).toBe('$23');
    });

    it('shows cents by default', () => {
        const result = formatNZD(6.5);
        expect(result).toBe('$6.50');
    });

    it('formats piece rate correctly', () => {
        expect(formatNZD(6.5)).toBe('$6.50');
    });
});

// ──────────────────────────────────────────────────────
// formatNZDRaw
// ──────────────────────────────────────────────────────
describe('formatNZDRaw', () => {
    it('formats without dollar sign', () => {
        const result = formatNZDRaw(23.95);
        expect(result).not.toContain('$');
        expect(result).toBe('23.95');
    });

    it('formats thousands with comma separator', () => {
        expect(formatNZDRaw(1234.56)).toBe('1,234.56');
    });

    it('respects custom decimals', () => {
        expect(formatNZDRaw(23.95, 0)).toBe('24');
        expect(formatNZDRaw(23.95, 3)).toBe('23.950');
    });

    it('formats zero correctly', () => {
        expect(formatNZDRaw(0)).toBe('0.00');
    });

    it('pads to 2 decimals by default', () => {
        expect(formatNZDRaw(6.5)).toBe('6.50');
    });
});

// ──────────────────────────────────────────────────────
// formatDateNZ
// ──────────────────────────────────────────────────────
describe('formatDateNZ', () => {
    it('formats date string in NZ short format (dd/mm/yyyy)', () => {
        // 2026-04-01 UTC = daytime April 1 NZST
        const result = formatDateNZ('2026-04-01');
        expect(result).toContain('04');
        expect(result).toContain('2026');
    });

    it('formats Date object', () => {
        const d = new Date('2026-07-15T12:00:00Z');
        const result = formatDateNZ(d);
        expect(result).toContain('2026');
        expect(result).toContain('07');
    });

    it('produces day/month/year structure (/ separator)', () => {
        const result = formatDateNZ('2026-04-01');
        expect(result.split('/').length).toBe(3);
    });

    it('zero-pads day and month', () => {
        const result = formatDateNZ('2026-04-01');
        // Should have 2-digit segments
        const parts = result.split('/');
        expect(parts[0].length).toBe(2); // day
        expect(parts[1].length).toBe(2); // month
    });
});

// ──────────────────────────────────────────────────────
// formatDateLongNZ
// ──────────────────────────────────────────────────────
describe('formatDateLongNZ', () => {
    it('includes full month name', () => {
        const result = formatDateLongNZ('2026-04-01');
        expect(result).toContain('April');
    });

    it('includes 4-digit year', () => {
        const result = formatDateLongNZ('2026-04-01');
        expect(result).toContain('2026');
    });

    it('formats Date object', () => {
        const d = new Date('2026-07-15T12:00:00Z');
        const result = formatDateLongNZ(d);
        expect(result).toContain('July');
        expect(result).toContain('2026');
    });

    it('formats December correctly', () => {
        const result = formatDateLongNZ('2026-12-25');
        expect(result).toContain('December');
        expect(result).toContain('2026');
    });
});

// ──────────────────────────────────────────────────────
// formatDateTimeNZ
// ──────────────────────────────────────────────────────
describe('formatDateTimeNZ', () => {
    it('includes date parts', () => {
        const result = formatDateTimeNZ('2026-04-01T10:00:00Z');
        expect(result).toContain('2026');
    });

    it('includes time separator (am/pm for 12h format)', () => {
        const result = formatDateTimeNZ('2026-04-01T10:00:00Z');
        // en-NZ uses am/pm
        const hasAmPm = result.toLowerCase().includes('am') || result.toLowerCase().includes('pm');
        expect(hasAmPm).toBe(true);
    });

    it('formats Date object', () => {
        const d = new Date('2026-07-15T12:00:00Z');
        const result = formatDateTimeNZ(d);
        expect(result).toContain('2026');
    });
});

// ──────────────────────────────────────────────────────
// formatHours
// ──────────────────────────────────────────────────────
describe('formatHours', () => {
    it('formats 0 hours as 0m', () => {
        expect(formatHours(0)).toBe('0m');
    });

    it('formats whole hours without minutes', () => {
        expect(formatHours(8)).toBe('8h');
    });

    it('formats sub-hour as minutes only', () => {
        expect(formatHours(0.5)).toBe('30m');
        expect(formatHours(0.25)).toBe('15m');
    });

    it('formats hours with minutes', () => {
        expect(formatHours(8.5)).toBe('8h 30m');
        expect(formatHours(8.75)).toBe('8h 45m');
        expect(formatHours(1.25)).toBe('1h 15m');
    });

    it('handles common shift lengths', () => {
        expect(formatHours(7.5)).toBe('7h 30m');
        expect(formatHours(10)).toBe('10h');
    });

    it('rounds minutes correctly', () => {
        // 0.333... hours = ~20 minutes (actually 19.98... → rounds to 20)
        const result = formatHours(1 / 3);
        expect(result).toContain('20m');
    });
});

// ──────────────────────────────────────────────────────
// formatHourlyRate
// ──────────────────────────────────────────────────────
describe('formatHourlyRate', () => {
    it('appends /hr suffix', () => {
        expect(formatHourlyRate(23.95)).toBe('$23.95/hr');
    });

    it('formats with NZD currency symbol', () => {
        const result = formatHourlyRate(25.00);
        expect(result).toContain('$');
        expect(result).toContain('/hr');
    });

    it('formats current NZ minimum wage', () => {
        expect(formatHourlyRate(23.95)).toBe('$23.95/hr');
    });

    it('formats starting-out wage', () => {
        expect(formatHourlyRate(19.16)).toBe('$19.16/hr');
    });
});

// ──────────────────────────────────────────────────────
// formatPieceRate
// ──────────────────────────────────────────────────────
describe('formatPieceRate', () => {
    it('appends /bin suffix', () => {
        expect(formatPieceRate(6.5)).toBe('$6.50/bin');
    });

    it('formats with NZD currency symbol', () => {
        const result = formatPieceRate(7.00);
        expect(result).toContain('$');
        expect(result).toContain('/bin');
    });

    it('formats common piece rates', () => {
        expect(formatPieceRate(3.5)).toBe('$3.50/bin');
        expect(formatPieceRate(10)).toBe('$10.00/bin');
    });
});

// ──────────────────────────────────────────────────────
// formatPercent
// ──────────────────────────────────────────────────────
describe('formatPercent', () => {
    it('formats with 1 decimal by default', () => {
        expect(formatPercent(98.333)).toBe('98.3%');
    });

    it('formats 100%', () => {
        expect(formatPercent(100)).toBe('100.0%');
    });

    it('formats 0%', () => {
        expect(formatPercent(0)).toBe('0.0%');
    });

    it('respects custom decimal places', () => {
        expect(formatPercent(98.333, 2)).toBe('98.33%');
        expect(formatPercent(98.333, 0)).toBe('98%');
    });

    it('formats compliance rate', () => {
        expect(formatPercent(86.7)).toBe('86.7%');
    });
});
