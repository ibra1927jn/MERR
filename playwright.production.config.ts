/**
 * playwright.production.config.ts
 * Configuracion para smoke tests en produccion (post-deploy).
 * Usado por deploy-production.yml tras cada deploy exitoso.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/smoke.spec.ts',
  timeout: 30_000,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-production' }]],

  use: {
    baseURL: process.env.PRODUCTION_URL ?? 'https://merr-pi.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-production',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
