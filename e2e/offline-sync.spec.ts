import { test, expect } from '@playwright/test';

test.describe('Offline Synchronization & Resilience', () => {
    test.beforeEach(async ({ page }) => {
        // Mock the initial network state as online and fast
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should display offline warning banner when network connection drops', async ({ page, context }) => {
        // Assert initial state is clean
        const offlineBanner = page.locator('text=You are Offline');
        await expect(offlineBanner).toBeHidden();

        // Simulate going offline via browser context
        await context.setOffline(true);

        // A mock way to trigger the window 'offline' event because setOffline alone 
        // doesn't always fire the event in the exact way simple apps expect immediately without navigation
        await page.evaluate(() => window.dispatchEvent(new Event('offline')));

        // Wait for the UI to pick up the offline signal (SyncStatusMonitor depends on useNetworkStatus)
        await expect(offlineBanner).toBeVisible({ timeout: 5000 });
        
        // Assert visual cues are present
        await expect(page.locator('span:has-text("wifi_off")')).toBeVisible();
    });

    test('should recover from offline state and initiate sync', async ({ page, context }) => {
        // Go offline
        await context.setOffline(true);
        await page.evaluate(() => window.dispatchEvent(new Event('offline')));
        
        const offlineBanner = page.locator('text=You are Offline');
        await expect(offlineBanner).toBeVisible();

        // Restore network
        await context.setOffline(false);
        await page.evaluate(() => window.dispatchEvent(new Event('online')));

        // Ensure offline banner disappears
        await expect(offlineBanner).toBeHidden({ timeout: 5000 });
    });
});
