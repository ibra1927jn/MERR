import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local for Playwright tests (Supabase credentials)
try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && !key.startsWith('#') && key.trim()) {
            process.env[key.trim()] = vals.join('=').trim();
        }
    });
} catch { /* .env.local not found */ }

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
    ],
});
