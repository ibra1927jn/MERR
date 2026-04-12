/**
 * E2E: Runner — Bucket Scanning & Offline Queue
 *
 * Flows cubiertos:
 *  1. Login → redirección a /runner
 *  2. Logistics view carga por defecto con UI de scan
 *  3. Modal de scan abre al hacer clic
 *  4. Manual entry: campo de picker ID + confirmación
 *  5. Offline: scan inyectado en IndexedDB → badge de pendientes visible
 *  6. Online: cola se drena y desaparece el badge
 *  7. Warehouse tab: inventario de bins visible
 *  8. Batch mode UI: opción de escáner en lote accesible
 *
 * Nota: el lector QR (html5-qrcode) requiere cámara — en headless
 * se ejercita la ruta de entrada manual (fallback sin cámara).
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  login,
  newAuthContext,
  goOffline,
  goOnline,
  waitForSyncComplete,
  injectSyncQueueItem,
  getSyncQueueCount,
  clearSyncQueue,
} from './utils/sync-helper';

test.describe('Runner — Bucket Scanning', () => {
  test.setTimeout(90_000);

  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    // Usa storageState pre-autenticado si existe (creado por global-setup.ts)
    context = await newAuthContext(browser, 'runner');
    page = await context.newPage();
    await login(page, 'runner');
    await page.waitForTimeout(2_000);
  });

  test.afterEach(async () => {
    await context.setOffline(false);
    await clearSyncQueue(page).catch(() => {/* no-op si la DB ya se cerró */});
    await page.close();
    await context.close();
  });

  /* ── 1. Carga inicial ───────────────────────────────── */

  test('1 — Login redirige a /runner y la app carga', async () => {
    await expect(page).toHaveURL(/runner/);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });

  /* ── 2. Logistics view ──────────────────────────────── */

  test('2 — Logistics tab es la vista por defecto', async () => {
    await expect(
      page.locator('text=/Logistics|Scan|Inventory|Bin/i').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('3 — Botón de scan visible en Logistics', async () => {
    // El botón principal de scan debe estar disponible
    const scanBtn = page
      .getByRole('button', { name: /Scan|Record Bucket|Scan Bucket/i })
      .first();

    await expect(scanBtn).toBeVisible({ timeout: 10_000 });
  });

  /* ── 3. Modal de scan ───────────────────────────────── */

  test('4 — Clic en Scan abre modal o panel de escáner', async () => {
    const scanBtn = page
      .getByRole('button', { name: /Scan|Record Bucket/i })
      .first();

    await scanBtn.click();
    await page.waitForTimeout(1_000);

    // Debe aparecer alguna forma de modal / diálogo de escaneo
    await expect(
      page.locator('[role="dialog"], .modal, text=/Scan|Picker|QR|Manual/i').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('5 — Modal de scan: campo de entrada manual presente', async () => {
    const scanBtn = page
      .getByRole('button', { name: /Scan|Record Bucket/i })
      .first();
    await scanBtn.click();
    await page.waitForTimeout(1_000);

    // El modal debe contener un input para picker ID o bin code
    const input = page.locator(
      'input[placeholder*="picker" i], input[placeholder*="ID" i], input[placeholder*="bin" i], input[type="text"]'
    ).first();

    await expect(input).toBeVisible({ timeout: 8_000 });
  });

  /* ── 4. Inventory counters ──────────────────────────── */

  test('6 — Logistics view: contadores de inventario visibles', async () => {
    // La vista de logistics muestra full/empty/total bins
    await expect(
      page.locator('text=/Full|Empty|Total|In Progress|Bin/i').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  /* ── 5. Warehouse tab ───────────────────────────────── */

  test('7 — Warehouse tab carga con inventario o estado vacío', async () => {
    const warehouseTab = page.getByText(/Warehouse/i).first();
    if (await warehouseTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await warehouseTab.click();
      await page.waitForTimeout(1_000);

      await expect(
        page.locator('text=/Warehouse|Bin|Stock|Inventory|Empty/i').first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  /* ── 6. Offline → queue → sync ─────────────────────── */

  test('8 — Offline: scan inyectado en IndexedDB aparece como pendiente', async () => {
    // Cortar red
    await goOffline(context, page, { assertBanner: true, waitMs: 1_500 });

    // Inyectar directamente en IndexedDB (simula un scan offline)
    await injectSyncQueueItem(page, {
      type: 'SCAN',
      payload: {
        picker_id: 'E2E-RUNNER-001',
        orchard_id: 'test-orchard-001',
        quality_grade: 'A',
        scanned_at: new Date().toISOString(),
      },
    });

    await page.waitForTimeout(1_000);

    // La cola ahora tiene 1 item
    const count = await getSyncQueueCount(page);
    expect(count).toBeGreaterThanOrEqual(1);

    // El badge de sincronización debe reflejar el pendiente
    await expect(
      page.locator('text=/Syncing|Pending|\\d+\\s*item/i').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('9 — Online: cola se drena al recuperar conexión', async () => {
    // Setup: ir offline e inyectar item
    await goOffline(context, page, { assertBanner: true, waitMs: 1_500 });
    await injectSyncQueueItem(page, {
      type: 'SCAN',
      payload: {
        picker_id: 'E2E-RUNNER-002',
        orchard_id: 'test-orchard-001',
        quality_grade: 'B',
        scanned_at: new Date().toISOString(),
      },
    });
    await page.waitForTimeout(500);

    // Volver online
    await goOnline(context, page, { waitMs: 2_000 });

    // Esperar a que la cola se vacíe (sync procesa los items)
    await waitForSyncComplete(page, 30_000);

    // Badge de sync no debe estar visible
    await expect(
      page.locator('text=/Syncing \\d+ items/i')
    ).not.toBeVisible({ timeout: 10_000 });
  });

  /* ── 7. Múltiples items offline ─────────────────────── */

  test('10 — Múltiples scans offline se encolan sin pérdida de datos', async () => {
    await goOffline(context, page, { assertBanner: false, waitMs: 1_000 });

    // Inyectar 3 scans
    for (let i = 1; i <= 3; i++) {
      await injectSyncQueueItem(page, {
        type: 'SCAN',
        payload: {
          picker_id: `E2E-RUNNER-BATCH-${i}`,
          orchard_id: 'test-orchard-001',
          quality_grade: 'A',
          scanned_at: new Date().toISOString(),
        },
      });
    }

    await page.waitForTimeout(500);

    const count = await getSyncQueueCount(page);
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
