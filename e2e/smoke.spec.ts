import { test, expect } from '@playwright/test';

test.describe('HarvestPro Smoke Tests', () => {
  test('renders login page correctly', async ({ page }) => {
    // Go to the base URL (managed by playwright config)
    await page.goto('/');

    // Very basic assertions to ensure the page loaded and React hydrated
    await expect(page).toHaveTitle(/HarvestPro/i);

    // Wait for redirect to /login
    await page.waitForURL('**/login', { timeout: 15_000 });

    // Wait for the login form to appear
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible({ timeout: 15_000 });
  });

  // Offline test stub: To fully test offline->online scanning, we'd need to bypass auth
  // or use a seeded user, but for a smoke test we just ensure basic routing works.
  test('PWA manifest available', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.ok()).toBeTruthy();
  });
});
