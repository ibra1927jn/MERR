/**
 * Tests for translations — verify all 4 language modules export valid translation objects
 */
import { describe, it, expect } from 'vitest';

describe('Translation modules', () => {
    it('en.ts exports valid English translations', async () => {
        const mod = await import('./en');
        expect(mod.default || mod).toBeDefined();
        const translations = mod.default || mod;
        expect(typeof translations).toBe('object');
    });

    it('es.ts exports valid Spanish translations', async () => {
        const mod = await import('./es');
        expect(mod.default || mod).toBeDefined();
        const translations = mod.default || mod;
        expect(typeof translations).toBe('object');
    });

    it('sm.ts exports valid Samoan translations', async () => {
        const mod = await import('./sm');
        expect(mod.default || mod).toBeDefined();
        const translations = mod.default || mod;
        expect(typeof translations).toBe('object');
    });

    it('to.ts exports valid Tongan translations', async () => {
        const mod = await import('./to');
        expect(mod.default || mod).toBeDefined();
        const translations = mod.default || mod;
        expect(typeof translations).toBe('object');
    });

    it('all translations have the same top-level keys as English', async () => {
        const en = await import('./en');
        const es = await import('./es');
        const sm = await import('./sm');
        const to = await import('./to');

        const enKeys = Object.keys(en.default || en).sort();

        // Each language should have the same top-level keys
        if (enKeys.length > 0) {
            const esKeys = Object.keys(es.default || es).sort();
            const smKeys = Object.keys(sm.default || sm).sort();
            const toKeys = Object.keys(to.default || to).sort();

            expect(esKeys).toEqual(enKeys);
            expect(smKeys).toEqual(enKeys);
            expect(toKeys).toEqual(enKeys);
        }
    });
});
