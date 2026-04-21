/**
 * Tests for i18n/index.ts — internationalization provider and helpers
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SUPPORTED_LOCALES, I18nProvider, useI18n } from './index';

describe('SUPPORTED_LOCALES', () => {
  it('has 7 locales (en, es, mi, sm, hi, to, tl)', () => {
    expect(SUPPORTED_LOCALES.length).toBe(7);
  });

  it('default is English', () => {
    expect(SUPPORTED_LOCALES[0].code).toBe('en');
    expect(SUPPORTED_LOCALES[0].label).toBe('English');
  });

  it('includes Spanish', () => {
    const es = SUPPORTED_LOCALES.find(l => l.code === 'es');
    expect(es).toBeDefined();
    expect(es!.nativeName).toBe('Español');
  });

  it('includes Māori', () => {
    const mi = SUPPORTED_LOCALES.find(l => l.code === 'mi');
    expect(mi).toBeDefined();
  });

  it('each locale has required fields', () => {
    SUPPORTED_LOCALES.forEach(locale => {
      expect(locale).toHaveProperty('code');
      expect(locale).toHaveProperty('label');
      expect(locale).toHaveProperty('nativeName');
      expect(locale).toHaveProperty('flag');
    });
  });
});

describe('I18nProvider', () => {
  it('renders children', () => {
    render(
      React.createElement(
        I18nProvider,
        null,
        React.createElement('div', { 'data-testid': 'child' }, 'Hello')
      )
    );
    expect(screen.getByTestId('child')).toBeDefined();
  });
});

describe('useI18n', () => {
  it('is a function', () => {
    expect(typeof useI18n).toBe('function');
  });
});
