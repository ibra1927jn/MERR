import { describe, it, expect } from 'vitest';
import { formatPeople, formatBins, formatPickers } from '@/utils/pluralize';

describe('formatPeople', () => {
    it('"1 people" must NOT appear — 1 EN = "1 person"', () => {
        expect(formatPeople(1, 'en')).toBe('1 person');
        expect(formatPeople(1, 'en')).not.toContain('people');
    });
    it('0 EN = "0 people"', () => {
        expect(formatPeople(0, 'en')).toBe('0 people');
    });
    it('3 EN = "3 people"', () => {
        expect(formatPeople(3, 'en')).toBe('3 people');
    });
    it('1 ES = "1 persona"', () => {
        expect(formatPeople(1, 'es')).toBe('1 persona');
    });
    it('0 ES = "0 personas"', () => {
        expect(formatPeople(0, 'es')).toBe('0 personas');
    });
    it('3 ES = "3 personas"', () => {
        expect(formatPeople(3, 'es')).toBe('3 personas');
    });
});

describe('formatBins', () => {
    it('1 EN = "1 bin"', () => expect(formatBins(1, 'en')).toBe('1 bin'));
    it('5 EN = "5 bins"', () => expect(formatBins(5, 'en')).toBe('5 bins'));
    it('1 ES = "1 cubeta"', () => expect(formatBins(1, 'es')).toBe('1 cubeta'));
    it('5 ES = "5 cubetas"', () => expect(formatBins(5, 'es')).toBe('5 cubetas'));
});

describe('formatPickers', () => {
    it('1 EN = "1 picker"', () => expect(formatPickers(1, 'en')).toBe('1 picker'));
    it('5 EN = "5 pickers"', () => expect(formatPickers(5, 'en')).toBe('5 pickers'));
    it('1 ES = "1 recolector"', () => expect(formatPickers(1, 'es')).toBe('1 recolector'));
    it('5 ES = "5 recolectores"', () => expect(formatPickers(5, 'es')).toBe('5 recolectores'));
});
