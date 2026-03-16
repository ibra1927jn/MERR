/**
 * TrendsTab — Import verification test
 */
import { describe, it, expect } from 'vitest';

describe('TrendsTab', () => {
    it('exports a default component', async () => {
        const mod = await import('./TrendsTab');
        expect(mod.default).toBeDefined();
        expect(typeof mod.default).toBe('function');
    });
});
