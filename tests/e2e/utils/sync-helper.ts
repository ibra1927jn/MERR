/**
 * Sync Helper — Playwright E2E test utilities for offline→sync flows
 *
 * Provides reusable helpers for:
 *  - Logging in
 *  - Waiting for Service Worker readiness
 *  - Toggling offline/online with assertions
 *  - Polling for sync completion via UI indicators
 *  - Injecting items into the IndexedDB sync queue
 */
import { Page, BrowserContext, expect } from '@playwright/test';

/* ── Constants ──────────────────────────────────────── */

// Password de demo viene de env var — nunca hardcodeado en codigo
const DEMO_PASSWORD = process.env.TEST_DEMO_PASSWORD;
if (!DEMO_PASSWORD) throw new Error('TEST_DEMO_PASSWORD env var is required for E2E tests');

export const DEMO_CREDENTIALS = {
    runner: { email: 'runner@harvestpro.nz', password: DEMO_PASSWORD },
    teamLeader: { email: 'teamleader@harvestpro.nz', password: DEMO_PASSWORD },
    manager: { email: 'manager@harvestpro.nz', password: DEMO_PASSWORD },
} as const;

export type Role = keyof typeof DEMO_CREDENTIALS;

/* ── Login ──────────────────────────────────────────── */

/**
 * Log in to the application with the given role credentials.
 * Waits until the URL changes to the expected dashboard route.
 */
export async function login(page: Page, role: Role = 'runner'): Promise<void> {
    const creds = DEMO_CREDENTIALS[role];
    await page.goto('/login');
    await page.fill('input[type="email"]', creds.email);
    await page.fill('input[type="password"]', creds.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(runner|team-leader|manager)/, { timeout: 15_000 });
}

/* ── Service Worker ─────────────────────────────────── */

/**
 * Wait for the Service Worker to register and reach "activated" state.
 * Returns `true` if the SW is ready, `false` otherwise.
 */
export async function waitForServiceWorker(page: Page, timeout = 10_000): Promise<boolean> {
    return page.evaluate(async (timeoutMs) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const reg = await navigator.serviceWorker?.getRegistration();
            if (reg?.active) return true;
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    }, timeout);
}

/* ── Offline / Online Toggles ───────────────────────── */

/**
 * Simulate going offline and optionally assert the "You are Offline" banner.
 */
export async function goOffline(
    context: BrowserContext,
    page: Page,
    opts: { assertBanner?: boolean; waitMs?: number } = {},
): Promise<void> {
    const { assertBanner = true, waitMs = 2_000 } = opts;
    await context.setOffline(true);
    await page.waitForTimeout(waitMs);

    if (assertBanner) {
        await expect(page.getByText(/You are Offline/i)).toBeVisible({ timeout: 5_000 });
    }
}

/**
 * Simulate going back online.
 */
export async function goOnline(
    context: BrowserContext,
    page: Page,
    opts: { waitMs?: number } = {},
): Promise<void> {
    const { waitMs = 1_000 } = opts;
    await context.setOffline(false);
    await page.waitForTimeout(waitMs);
}

/* ── Sync Polling ───────────────────────────────────── */

/**
 * Wait until the "Syncing X items..." banner disappears from the UI,
 * indicating that the queue has been fully processed.
 *
 * @param timeout  Max time to wait in milliseconds (default 30 s)
 */
export async function waitForSyncComplete(page: Page, timeout = 30_000): Promise<void> {
    const syncBanner = page.getByText(/Syncing \d+ items/i);
    // The banner may not be visible yet if sync is instant; guard with a short wait
    await page.waitForTimeout(500);
    // If visible, wait for it to disappear (sync finished)
    if (await syncBanner.isVisible().catch(() => false)) {
        await expect(syncBanner).not.toBeVisible({ timeout });
    }
}

/**
 * Assert that the "All Synced" success toast appears.
 */
export async function assertAllSynced(page: Page, timeout = 15_000): Promise<void> {
    await expect(page.getByText(/All Synced/i)).toBeVisible({ timeout });
}

/**
 * Assert that the sync queue badge shows the expected count.
 */
export async function assertPendingCount(page: Page, expected: number, timeout = 5_000): Promise<void> {
    if (expected === 0) {
        const badge = page.getByText(/Syncing \d+ items/i);
        await expect(badge).not.toBeVisible({ timeout });
    } else {
        await expect(page.getByText(new RegExp(`Syncing ${expected} items`, 'i'))).toBeVisible({ timeout });
    }
}

/* ── IndexedDB Injection ────────────────────────────── */

/**
 * Inject a fake item directly into the IndexedDB sync_queue table (Dexie).
 * This bypasses the UI to create deterministic test scenarios.
 *
 * @returns the generated item id
 */
export async function injectSyncQueueItem(
    page: Page,
    overrides: Partial<{
        id: string;
        type: string;
        payload: Record<string, unknown>;
        timestamp: number;
        retryCount: number;
    }> = {},
): Promise<string> {
    return page.evaluate(async (opts) => {
        const id = opts.id ?? crypto.randomUUID();
        const item = {
            id,
            type: opts.type ?? 'SCAN',
            payload: opts.payload ?? {
                picker_id: 'test-picker-' + Date.now(),
                orchard_id: 'test-orchard-001',
                quality_grade: 'A',
                scanned_at: new Date().toISOString(),
            },
            timestamp: opts.timestamp ?? Date.now(),
            retryCount: opts.retryCount ?? 0,
        };

        // Open the Dexie DB directly
        const dbReq = indexedDB.open('HarvestProDB');
        await new Promise<void>((resolve, reject) => {
            dbReq.onsuccess = () => {
                const db = dbReq.result;
                const tx = db.transaction('sync_queue', 'readwrite');
                const store = tx.objectStore('sync_queue');
                const putReq = store.put(item);
                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            };
            dbReq.onerror = () => reject(dbReq.error);
        });

        return id;
    }, overrides);
}

/**
 * Read the current count of items in the IndexedDB sync_queue table.
 */
export async function getSyncQueueCount(page: Page): Promise<number> {
    return page.evaluate(async () => {
        return new Promise<number>((resolve, reject) => {
            const dbReq = indexedDB.open('HarvestProDB');
            dbReq.onsuccess = () => {
                const db = dbReq.result;
                const tx = db.transaction('sync_queue', 'readonly');
                const store = tx.objectStore('sync_queue');
                const countReq = store.count();
                countReq.onsuccess = () => resolve(countReq.result);
                countReq.onerror = () => reject(countReq.error);
            };
            dbReq.onerror = () => reject(dbReq.error);
        });
    });
}

/**
 * Read the current count of items in the IndexedDB bucket_queue table.
 */
export async function getBucketQueueCount(page: Page): Promise<number> {
    return page.evaluate(async () => {
        return new Promise<number>((resolve, reject) => {
            const dbReq = indexedDB.open('HarvestProDB');
            dbReq.onsuccess = () => {
                const db = dbReq.result;
                const tx = db.transaction('bucket_queue', 'readonly');
                const store = tx.objectStore('bucket_queue');
                const countReq = store.count();
                countReq.onsuccess = () => resolve(countReq.result);
                countReq.onerror = () => reject(countReq.error);
            };
            dbReq.onerror = () => reject(dbReq.error);
        });
    });
}

/**
 * Read the last sync timestamp from IndexedDB sync_meta.
 */
export async function getLastSyncTimestamp(page: Page): Promise<number | null> {
    return page.evaluate(async () => {
        return new Promise<number | null>((resolve, reject) => {
            const dbReq = indexedDB.open('HarvestProDB');
            dbReq.onsuccess = () => {
                const db = dbReq.result;
                const tx = db.transaction('sync_meta', 'readonly');
                const store = tx.objectStore('sync_meta');
                const getReq = store.get('lastSync');
                getReq.onsuccess = () => {
                    const result = getReq.result;
                    resolve(result ? result.value : null);
                };
                getReq.onerror = () => reject(getReq.error);
            };
            dbReq.onerror = () => reject(dbReq.error);
        });
    });
}

/**
 * Read all items from the dead_letter_queue table.
 */
export async function getDeadLetterQueueItems(page: Page): Promise<unknown[]> {
    return page.evaluate(async () => {
        return new Promise<unknown[]>((resolve, reject) => {
            const dbReq = indexedDB.open('HarvestProDB');
            dbReq.onsuccess = () => {
                const db = dbReq.result;
                const tx = db.transaction('dead_letter_queue', 'readonly');
                const store = tx.objectStore('dead_letter_queue');
                const getAll = store.getAll();
                getAll.onsuccess = () => resolve(getAll.result);
                getAll.onerror = () => reject(getAll.error);
            };
            dbReq.onerror = () => reject(dbReq.error);
        });
    });
}

/**
 * Clear the entire sync_queue table (cleanup between tests).
 */
export async function clearSyncQueue(page: Page): Promise<void> {
    await page.evaluate(async () => {
        return new Promise<void>((resolve, reject) => {
            const dbReq = indexedDB.open('HarvestProDB');
            dbReq.onsuccess = () => {
                const db = dbReq.result;
                const tx = db.transaction('sync_queue', 'readwrite');
                const store = tx.objectStore('sync_queue');
                const clearReq = store.clear();
                clearReq.onsuccess = () => resolve();
                clearReq.onerror = () => reject(clearReq.error);
            };
            dbReq.onerror = () => reject(dbReq.error);
        });
    });
}
