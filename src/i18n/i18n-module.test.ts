/**
 * Tests for i18n module — translation system (402 lines)
 */
import { describe, it, expect } from 'vitest';

import { SUPPORTED_LOCALES } from './index';

describe('i18n module', () => {
  describe('SUPPORTED_LOCALES', () => {
    it('supports English', () => {
      const en = SUPPORTED_LOCALES.find(l => l.code === 'en');
      expect(en).toBeDefined();
      expect(en!.label).toBe('English');
    });

    it('supports Spanish', () => {
      const es = SUPPORTED_LOCALES.find(l => l.code === 'es');
      expect(es).toBeDefined();
      expect(es!.nativeName).toBe('Español');
    });

    it('supports Māori', () => {
      const mi = SUPPORTED_LOCALES.find(l => l.code === 'mi');
      expect(mi).toBeDefined();
    });

    it('supports Samoan', () => {
      const sm = SUPPORTED_LOCALES.find(l => l.code === 'sm');
      expect(sm).toBeDefined();
      expect(sm!.nativeName).toBe('Gagana Samoa');
    });

    it('supports Hindi', () => {
      const hi = SUPPORTED_LOCALES.find(l => l.code === 'hi');
      expect(hi).toBeDefined();
      expect(hi!.flag).toBe('🇮🇳');
    });

    it('supports Tongan', () => {
      const to = SUPPORTED_LOCALES.find(l => l.code === 'to');
      expect(to).toBeDefined();
      expect(to!.nativeName).toBe('Lea Faka-Tonga');
    });

    it('supports Filipino/Tagalog', () => {
      const tl = SUPPORTED_LOCALES.find(l => l.code === 'tl');
      expect(tl).toBeDefined();
      expect(tl!.nativeName).toBe('Filipino');
    });

    it('has exactly 7 locales', () => {
      expect(SUPPORTED_LOCALES).toHaveLength(7);
    });

    it('all locales have required fields', () => {
      SUPPORTED_LOCALES.forEach(locale => {
        expect(locale.code).toBeDefined();
        expect(locale.label).toBeDefined();
        expect(locale.nativeName).toBeDefined();
        expect(locale.flag).toBeDefined();
      });
    });
  });
});
