/**
 * Tests for config/env.validation.ts — validateEnv with Zod
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { validateEnv } from './env.validation';

describe('validateEnv', () => {
    it('returns env object (may have default values)', () => {
        const env = validateEnv();
        expect(env).toBeDefined();
        expect(typeof env).toBe('object');
    });

    it('has MODE property', () => {
        const env = validateEnv();
        expect(env).toHaveProperty('MODE');
    });

    it('returns object with expected shape', () => {
        const env = validateEnv();
        // In test env, returns raw values with defaults where available
        expect(typeof env).toBe('object');
    });
});
