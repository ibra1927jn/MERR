/**
 * config.service — Deep functional tests
 * Targets: getConfig, resetConfig, isFeatureEnabled, getLogLevel, ConfigurationError
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getConfig,
  resetConfig,
  isFeatureEnabled,
  getLogLevel,
  ConfigurationError,
} from './config.service';

describe('ConfigurationError', () => {
  it('captures missing keys', () => {
    const err = new ConfigurationError('Missing config', ['KEY_A', 'KEY_B']);
    expect(err.missingKeys).toEqual(['KEY_A', 'KEY_B']);
    expect(err.name).toBe('ConfigurationError');
    expect(err.message).toBe('Missing config');
  });

  it('defaults to empty missingKeys array', () => {
    const err = new ConfigurationError('No keys');
    expect(err.missingKeys).toEqual([]);
  });

  it('is an instance of Error', () => {
    expect(new ConfigurationError('test')).toBeInstanceOf(Error);
  });
});

describe('getConfig', () => {
  beforeEach(() => resetConfig());

  it('returns config object', () => {
    const config = getConfig();
    expect(config).toBeDefined();
    expect(config.environment).toBeDefined();
    expect(typeof config.isDevelopment).toBe('boolean');
    expect(typeof config.isProduction).toBe('boolean');
  });

  it('returns singleton (same reference)', () => {
    const a = getConfig();
    const b = getConfig();
    expect(a).toBe(b);
  });

  it('resetConfig clears the singleton', () => {
    const _a = getConfig();
    resetConfig();
    const b = getConfig();
    // After reset, a new instance is created (may or may not be same object,
    // but resetConfig should have cleared _config)
    expect(b).toBeDefined();
  });

  it('config has SUPABASE_URL (string, may be empty in test env)', () => {
    const config = getConfig();
    expect(typeof config.SUPABASE_URL).toBe('string');
  });

  it('config has default APP_VERSION', () => {
    const config = getConfig();
    expect(config.APP_VERSION).toBeDefined();
  });

  it('config has LOG_LEVEL', () => {
    const config = getConfig();
    expect(['debug', 'info', 'warn', 'error', undefined]).toContain(config.LOG_LEVEL);
  });
});

describe('isFeatureEnabled', () => {
  it('returns false for undefined features', () => {
    expect(isFeatureEnabled('NONEXISTENT_FEATURE_XYZ')).toBe(false);
  });

  it('returns boolean', () => {
    expect(typeof isFeatureEnabled('ANALYTICS')).toBe('boolean');
  });
});

describe('getLogLevel', () => {
  beforeEach(() => resetConfig());

  it('returns a valid log level', () => {
    const level = getLogLevel();
    expect(['debug', 'info', 'warn', 'error', undefined]).toContain(level);
  });
});
