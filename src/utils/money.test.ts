/**
 * money.test.ts — Tests for money utility functions
 *
 * Verifica que los inputs monetarios siempre usen '.' sin importar el locale.
 */
import { describe, it, expect } from 'vitest';
import { normalizeMoney, parseMoney, formatMoneyInput } from './money';

describe('normalizeMoney', () => {
    it('replaces comma with dot', () => {
        expect(normalizeMoney('6,5')).toBe('6.5');
    });

    it('passes through dot unchanged', () => {
        expect(normalizeMoney('6.5')).toBe('6.5');
    });

    it('strips non-numeric characters except dot and minus', () => {
        expect(normalizeMoney('$6.50')).toBe('6.50');
    });

    it('handles empty string', () => {
        expect(normalizeMoney('')).toBe('');
    });

    it('handles integer string', () => {
        expect(normalizeMoney('23')).toBe('23');
    });
});

describe('parseMoney', () => {
    it('parses dot-separated decimal', () => {
        expect(parseMoney('6.50')).toBe(6.5);
    });

    it('parses comma-separated decimal (ES locale input)', () => {
        expect(parseMoney('6,50')).toBe(6.5);
    });

    it('parses integer', () => {
        expect(parseMoney('23')).toBe(23);
    });

    it('returns 0 for empty string', () => {
        expect(parseMoney('')).toBe(0);
    });

    it('returns 0 for non-numeric input', () => {
        expect(parseMoney('abc')).toBe(0);
    });

    it('handles NZD currency string by stripping $', () => {
        expect(parseMoney('$23.15')).toBe(23.15);
    });
});

describe('formatMoneyInput', () => {
    it('formats to 2 decimals by default', () => {
        expect(formatMoneyInput(6.5)).toBe('6.50');
    });

    it('formats to 0 decimals when specified', () => {
        expect(formatMoneyInput(23, 0)).toBe('23');
    });

    it('always uses dot as decimal separator', () => {
        const result = formatMoneyInput(6.5, 2);
        expect(result).not.toContain(',');
        expect(result).toBe('6.50');
    });

    it('rounds correctly', () => {
        // JS IEEE 754: 6.555 is stored as ~6.5549999..., so toFixed(2) → '6.55'
        expect(formatMoneyInput(6.556, 2)).toBe('6.56');
    });
});
