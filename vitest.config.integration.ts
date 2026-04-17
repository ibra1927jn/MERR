/**
 * Vitest config para integration tests — usa entorno Node, no jsdom.
 * Los integration tests golpean Supabase local real, sin mocks.
 *
 * Ejecutar: npx vitest run --config vitest.config.integration.ts
 */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',   // No jsdom — fetch real a localhost
        setupFiles: [],         // Sin test-setup.ts — sin mocks, sin fake-indexeddb
        include: ['tests/integration/**/*.test.ts'],
        testTimeout: 30_000,
        hookTimeout: 30_000,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
