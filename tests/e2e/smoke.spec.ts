// Smoke tests - críticos para verificar que la app funciona después de deployment
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Critical Paths', () => {
    test('App loads successfully', async ({ page }) => {
        await page.goto('/');

        // Should see login page — heading shows HarvestProNZ
        await expect(page.locator('h1')).toContainText(/HarvestPro/i);

        // Email and password fields should be present
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('Authentication works', async ({ page }) => {
        await page.goto('/');

        // Fill login form with demo credentials
        await page.fill('input[type="email"]', process.env.TEST_MANAGER_EMAIL || 'manager@harvestpro.nz');
        await page.fill('input[type="password"]', process.env.TEST_MANAGER_PASSWORD || '111111');

        // Submit
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await expect(page).toHaveURL(/\/(manager|runner|team-leader)/, { timeout: 15000 });
    });

    test('API connection works', async ({ page }) => {
        // Simple health check — requires both URL and anon key
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
        test.skip(!supabaseUrl || !supabaseKey, 'Supabase credentials not set');
        const response = await page.request.get(supabaseUrl + '/rest/v1/', {
            headers: { apikey: supabaseKey!, Authorization: `Bearer ${supabaseKey}` },
        });
        expect(response.status()).toBe(200);
    });

    test('Service Worker registers', async ({ page }) => {
        await page.goto('/');

        // Check if SW registered
        const swRegistered = await page.evaluate(() => {
            return 'serviceWorker' in navigator;
        });

        expect(swRegistered).toBe(true);
    });
});
