/**
 * Tests for i18n module — translation system (402 lines)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// Import all exports from i18n
import { SUPPORTED_LOCALES, type Locale } from './index';

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

    it('has exactly 3 locales', () => {
      expect(SUPPORTED_LOCALES).toHaveLength(3);
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
