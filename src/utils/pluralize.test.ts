/**
 * pluralize — helpers EN/ES de singular/plural para harvestpro-nz.
 */
import { describe, it, expect } from 'vitest';
import { plural, formatPeople, formatBins, formatPickers } from './pluralize';

describe('plural (generic)', () => {
    it('count=1 → singular', () => {
        expect(plural(1, 'apple', 'apples')).toBe('apple');
    });
    it('count=0 → plural', () => {
        expect(plural(0, 'apple', 'apples')).toBe('apples');
    });
    it('count=2 → plural', () => {
        expect(plural(2, 'apple', 'apples')).toBe('apples');
    });
    it('count negativo → plural', () => {
        expect(plural(-1, 'apple', 'apples')).toBe('apples');
    });
});

describe('formatPeople', () => {
    it('EN 1 → "1 person"', () => {
        expect(formatPeople(1)).toBe('1 person');
    });
    it('EN 3 → "3 people"', () => {
        expect(formatPeople(3)).toBe('3 people');
    });
    it('ES 1 → "1 persona"', () => {
        expect(formatPeople(1, 'es')).toBe('1 persona');
    });
    it('ES 5 → "5 personas"', () => {
        expect(formatPeople(5, 'es')).toBe('5 personas');
    });
    it('locale no-EN-no-ES cae a EN (mi fallback)', () => {
        expect(formatPeople(2, 'mi')).toBe('2 people');
    });
});

describe('formatBins', () => {
    it('EN 1 → "1 bin"', () => {
        expect(formatBins(1)).toBe('1 bin');
    });
    it('EN 10 → "10 bins"', () => {
        expect(formatBins(10)).toBe('10 bins');
    });
    it('ES 1 → "1 cubeta"', () => {
        expect(formatBins(1, 'es')).toBe('1 cubeta');
    });
    it('ES 7 → "7 cubetas"', () => {
        expect(formatBins(7, 'es')).toBe('7 cubetas');
    });
});

describe('formatPickers', () => {
    it('EN 1 → "1 picker"', () => {
        expect(formatPickers(1)).toBe('1 picker');
    });
    it('EN 4 → "4 pickers"', () => {
        expect(formatPickers(4)).toBe('4 pickers');
    });
    it('ES 1 → "1 recolector"', () => {
        expect(formatPickers(1, 'es')).toBe('1 recolector');
    });
    it('ES 6 → "6 recolectores"', () => {
        expect(formatPickers(6, 'es')).toBe('6 recolectores');
    });
});
