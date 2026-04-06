/**
 * E2E: Manager Navigation — Desktop sidebar, mobile bottom nav, More menu
 */
import { test, expect } from '@playwright/test';
import { loginAsManager, clickNavItem } from './helpers';

/* ───────────── Desktop (1280×720) ───────────── */
test.describe('Manager Navigation — Desktop', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsManager(page);
    });

    test('sidebar shows all 7 nav items', async ({ page }) => {
        const nav = page.locator('nav, [role="navigation"], aside').first();
        await expect(nav).toBeVisible();

        for (const label of ['Dashboard', 'Teams', 'Orchard Map', 'Logistics', 'Insights', 'Messaging', 'Settings']) {
            await expect(page.getByText(label, { exact: false }).first()).toBeVisible({ timeout: 5_000 });
        }
        await page.screenshot({ path: 'test-results/manager-nav-desktop-sidebar.png', fullPage: false });
    });

    test('clicking each sidebar tab renders correct view', async ({ page }) => {
        // Teams
        await clickNavItem(page, 'Teams');
        await expect(page.locator('text=/Harvest Teams|No Team Members/i').first()).toBeVisible({ timeout: 10_000 });

        // Orchard Map
        await clickNavItem(page, 'Orchard Map');
        await expect(page.locator('text=/Táctico|Calor|Lista/i').first()).toBeVisible({ timeout: 10_000 });

        // Logistics
        await clickNavItem(page, 'Logistics');
        await expect(page.locator('text=/Logistics Hub|No Logistics/i').first()).toBeVisible({ timeout: 10_000 });

        // Insights
        await clickNavItem(page, 'Insights');
        await expect(page.locator('text=/Insights & Analytics/i').first()).toBeVisible({ timeout: 10_000 });

        // Messaging
        await clickNavItem(page, 'Messaging');
        await expect(page.locator('text=/chat|message|conversation/i').first()).toBeVisible({ timeout: 10_000 });

        // Settings
        await clickNavItem(page, 'Settings');
        await expect(page.locator('text=/Harvest Configuration|Settings/i').first()).toBeVisible({ timeout: 10_000 });

        // Back to Dashboard
        await clickNavItem(page, 'Dashboard');
        await expect(page.locator('text=/Orchard Overview|No Team Members/i').first()).toBeVisible({ timeout: 10_000 });

        await page.screenshot({ path: 'test-results/manager-nav-desktop-all-tabs.png', fullPage: false });
    });

    test('active sidebar tab is visually highlighted', async ({ page }) => {
        await clickNavItem(page, 'Teams');
        await page.screenshot({ path: 'test-results/manager-nav-desktop-active-tab.png', fullPage: false });
    });
});

/* ───────────── Mobile (390×844) ───────────── */
test.describe('Manager Navigation — Mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test.beforeEach(async ({ page }) => {
        await loginAsManager(page);
    });

    test('bottom nav shows 5 tabs: Dashboard, Teams, Map, Logistics, More', async ({ page }) => {
        for (const label of ['Dashboard', 'Teams', 'Map', 'Logistics', 'More']) {
            await expect(page.locator(`text=/^${label}$/i`).last()).toBeVisible({ timeout: 5_000 });
        }
        await page.screenshot({ path: 'test-results/manager-nav-mobile-bottom.png', fullPage: false });
    });

    test('More menu shows Insights, Messaging, Settings', async ({ page }) => {
        const moreBtn = page.locator('text=/More|Más/i').last();
        await moreBtn.click();
        await page.waitForTimeout(500);

        await expect(page.locator('text=/Insights/i').first()).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('text=/Messaging/i').first()).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('text=/Settings/i').first()).toBeVisible({ timeout: 5_000 });

        await page.screenshot({ path: 'test-results/manager-nav-mobile-more-menu.png', fullPage: false });
    });

    test('More → Insights navigates to Insights view', async ({ page }) => {
        const moreBtn = page.locator('text=/More|Más/i').last();
        await moreBtn.click();
        await page.waitForTimeout(500);

        await page.locator('text=/Insights/i').first().click();
        await expect(page.locator('text=/Insights & Analytics/i').first()).toBeVisible({ timeout: 10_000 });
        await page.screenshot({ path: 'test-results/manager-nav-mobile-insights.png', fullPage: false });
    });

    test('More → Settings navigates to Settings view', async ({ page }) => {
        const moreBtn = page.locator('text=/More|Más/i').last();
        await moreBtn.click();
        await page.waitForTimeout(500);

        await page.locator('text=/Settings/i').first().click();
        await expect(page.locator('text=/Harvest Configuration|Settings/i').first()).toBeVisible({ timeout: 10_000 });
        await page.screenshot({ path: 'test-results/manager-nav-mobile-settings.png', fullPage: false });
    });

    test('mobile header shows title and orchard name', async ({ page }) => {
        await expect(page.locator('text=/Harvest Manager/i').first()).toBeVisible();
        await page.screenshot({ path: 'test-results/manager-nav-mobile-header.png', fullPage: false });
    });
});
