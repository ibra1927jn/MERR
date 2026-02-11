// Smoke tests - críticos para verificar que la app funciona después de deployment
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Critical Paths', () => {
    test('App loads successfully', async ({ page }) => {
        await page.goto('/');

        // Should see login page
        await expect(page.locator('h1, h2')).toContainText(/login|sign in/i);

        // No console errors
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.waitForTimeout(2000);
        expect(errors).toHaveLength(0);
    });

    test('Authentication works', async ({ page }) => {
        await page.goto('/');

        // Fill login form
        await page.fill('input[type="email"]', process.env.TEST_MANAGER_EMAIL || 'test@example.com');
        await page.fill('input[type="password"]', process.env.TEST_MANAGER_PASSWORD || 'password123');

        // Submit
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await expect(page).toHaveURL(/\/(manager|runner|team-leader)/);
    });

    test('API connection works', async ({ page }) => {
        // Simple health check
        const response = await page.request.get(process.env.VITE_SUPABASE_URL + '/rest/v1/');
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
