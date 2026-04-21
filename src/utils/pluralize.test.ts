/**
 * Tests de utils/pluralize — formas singular/plural EN+ES
 * para counts de people, bins y pickers.
 */
import { describe, it, expect } from 'vitest';
import {
  plural,
  formatPeople,
  formatBins,
  formatPickers,
  type SupportedLocale,
} from './pluralize';

describe('plural', () => {
  it('returns singular form when count equals 1', () => {
    expect(plural(1, 'item', 'items')).toBe('item');
  });

  it('returns plural form when count is 0', () => {
    expect(plural(0, 'item', 'items')).toBe('items');
  });

  it('returns plural form when count is greater than 1', () => {
    expect(plural(2, 'item', 'items')).toBe('items');
    expect(plural(100, 'item', 'items')).toBe('items');
  });

  it('returns plural form for negative counts (not singular)', () => {
    expect(plural(-1, 'item', 'items')).toBe('items');
  });
});

describe('formatPeople', () => {
  it('defaults to English plural form', () => {
    expect(formatPeople(3)).toBe('3 people');
  });

  it('returns English singular for count of 1', () => {
    expect(formatPeople(1)).toBe('1 person');
  });

  it('returns Spanish singular for count of 1', () => {
    expect(formatPeople(1, 'es')).toBe('1 persona');
  });

  it('returns Spanish plural for other counts', () => {
    expect(formatPeople(5, 'es')).toBe('5 personas');
    expect(formatPeople(0, 'es')).toBe('0 personas');
  });

  it('falls back to English for non-ES locales', () => {
    const locales: SupportedLocale[] = ['en', 'mi', 'sm', 'hi', 'to', 'tl'];
    for (const loc of locales) {
      expect(formatPeople(2, loc)).toBe('2 people');
    }
  });
});

describe('formatBins', () => {
  it('returns English singular/plural correctly', () => {
    expect(formatBins(1)).toBe('1 bin');
    expect(formatBins(7)).toBe('7 bins');
  });

  it('returns Spanish "cubeta/cubetas"', () => {
    expect(formatBins(1, 'es')).toBe('1 cubeta');
    expect(formatBins(10, 'es')).toBe('10 cubetas');
  });

  it('handles zero count as plural', () => {
    expect(formatBins(0)).toBe('0 bins');
    expect(formatBins(0, 'es')).toBe('0 cubetas');
  });
});

describe('formatPickers', () => {
  it('returns English singular/plural correctly', () => {
    expect(formatPickers(1)).toBe('1 picker');
    expect(formatPickers(4)).toBe('4 pickers');
  });

  it('returns Spanish "recolector/recolectores"', () => {
    expect(formatPickers(1, 'es')).toBe('1 recolector');
    expect(formatPickers(3, 'es')).toBe('3 recolectores');
  });

  it('handles zero count as plural', () => {
    expect(formatPickers(0)).toBe('0 pickers');
    expect(formatPickers(0, 'es')).toBe('0 recolectores');
  });
});
