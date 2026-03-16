/**
 * playwright.ci.config.ts — Playwright config for CI pipeline
 *
 * Serves the pre-built dist/ folder locally and runs smoke tests.
 * Used by `.github/workflows/ci.yml` in the `e2e` job.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/smoke.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Serve the pre-built dist/ folder — CI downloads the artifact from the build job */
  webServer: {
    command: 'npx serve dist -l 4173 -s',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
