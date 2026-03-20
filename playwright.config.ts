import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local for local Playwright tests (Supabase credentials)
try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && !key.startsWith('#') && key.trim()) {
            process.env[key.trim()] = vals.join('=').trim();
        }
    });
} catch { /* .env.local not found — expected in CI */ }

import { defineConfig, devices } from '@playwright/test';

/**
 * STR-10: Consolidated Playwright config — replaces 4 separate files.
 *
 * Environment selection via PLAYWRIGHT_ENV:
 *   local   (default) → http://localhost:5173 — runs dev server
 *   ci                → http://localhost:4173 — serves pre-built dist/
 *   staging           → https://harvestpro-staging.vercel.app
 *   production        → https://harvestpro.vercel.app
 *
 * Test selection via PLAYWRIGHT_MATCH:
 *   (unset)           → all tests in ./e2e
 *   smoke             → **/smoke.spec.ts only
 */

const ENV = (process.env.PLAYWRIGHT_ENV ?? 'local') as 'local' | 'ci' | 'staging' | 'production';
const SMOKE_ONLY = process.env.PLAYWRIGHT_MATCH === 'smoke';

const BASE_URLS: Record<typeof ENV, string> = {
    local:      'http://localhost:5173',
    ci:         'http://localhost:4173',
    staging:    'https://harvestpro-staging.vercel.app',
    production: 'https://harvestpro.vercel.app',
};

const WEB_SERVERS: Partial<Record<typeof ENV, object>> = {
    local: {
        command: 'npm run dev',
        url: BASE_URLS.local,
        reuseExistingServer: true,
        timeout: 60_000,
    },
    ci: {
        command: 'npx serve dist -l 4173 -s',
        port: 4173,
        reuseExistingServer: !process.env.CI,
        timeout: 10_000,
    },
};

const isRemote = ENV === 'staging' || ENV === 'production';

export default defineConfig({
    testDir: './e2e',
    ...(SMOKE_ONLY ? { testMatch: '**/smoke.spec.ts' } : {}),

    fullyParallel: !isRemote,
    forbidOnly: !!process.env.CI || isRemote,
    retries: isRemote || process.env.CI ? 2 : 0,
    workers: isRemote || process.env.CI ? 1 : undefined,

    reporter: process.env.CI
        ? [['list'], ['html', { open: 'never' }]]
        : [['html']],

    timeout: 30_000,

    use: {
        baseURL: BASE_URLS[ENV],
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        actionTimeout: 10_000,
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Mobile only for local dev
        ...(ENV === 'local' ? [{
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        }] : []),
    ],

    ...(WEB_SERVERS[ENV] ? { webServer: WEB_SERVERS[ENV] } : {}),
});
