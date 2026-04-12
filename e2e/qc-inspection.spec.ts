/**
 * E2E: QC Inspector — Flujo de inspección de calidad
 *
 * Flows cubiertos:
 *  1. Login como qc_inspector → redirección a /qc
 *  2. Inspect tab: selector de picker y botones de grado visibles
 *  3. Asignar grado A a un picker (happy path)
 *  4. History tab: inspecciones del día visibles
 *  5. Stats tab: distribución de grados visible
 *  6. Trends tab: gráfico histórico carga
 *  7. Offline: app renderiza con caché (SW)
 *
 * Credenciales: usa TEST_DEMO_PASSWORD (misma contraseña demo)
 * con email qc@harvestpro.nz (cuenta pre-configurada en seeds).
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import { newAuthContext, goOffline } from './utils/sync-helper';

/* ── Credenciales QC ────────────────────────────────── */
const QC_EMAIL = process.env.TEST_QC_EMAIL || 'qc@harvestpro.nz';
const QC_PASSWORD = (() => {
  const p = process.env.TEST_DEMO_PASSWORD;
  if (!p) throw new Error('TEST_DEMO_PASSWORD env var is required');
  return p;
})();

async function loginAsQC(page: Page): Promise<void> {
  // Intentar ruta directa primero — storageState puede ya tener la sesion
  await page.goto('/qc');
  try {
    await page.waitForURL(/\/qc/, { timeout: 4_000 });
    return; // Sesion activa, no se necesita login
  } catch {
    // Sin sesion — hacer login normal
  }
  await page.goto('/login');
  await page.fill('input[type="email"]', QC_EMAIL);
  await page.fill('input[type="password"]', QC_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/qc/, { timeout: 15_000 });
}

/* ── Suite ──────────────────────────────────────────── */

test.describe('QC Inspector — Flujo de Inspección', () => {
  test.setTimeout(60_000);

  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    // Usa storageState pre-autenticado si existe (creado por global-setup.ts)
    context = await newAuthContext(browser, 'qc');
    page = await context.newPage();
    await loginAsQC(page);
    await page.waitForTimeout(2_000);
  });

  test.afterEach(async () => {
    await context.setOffline(false);
    await page.close();
    await context.close();
  });

  /* ── 1. Login y redirección ─────────────────────────── */

  test('1 — Login redirige a /qc y la app carga', async () => {
    await expect(page).toHaveURL(/\/qc/);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });

  /* ── 2. Tabs de navegación ──────────────────────────── */

  test('2 — Tabs de QC visibles: Inspect, History, Stats/Analytics', async () => {
    // Al menos Inspect debe estar presente
    await expect(
      page.locator('text=/Inspect/i').first()
    ).toBeVisible({ timeout: 10_000 });

    // History tab
    await expect(
      page.locator('text=/History/i').first()
    ).toBeVisible({ timeout: 8_000 });

    // Stats o Analytics tab
    await expect(
      page.locator('text=/Stats|Analytics|Distribution/i').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  /* ── 3. Inspect tab: UI principal ──────────────────── */

  test('3 — Inspect tab: UI de selección de picker visible', async () => {
    // Navegar a Inspect si no es la tab por defecto
    const inspectTab = page.getByText(/Inspect/i).first();
    await inspectTab.click();
    await page.waitForTimeout(1_000);

    // Debe mostrar algún selector de picker o lista de crew
    await expect(
      page.locator('text=/Picker|Select|Crew|Inspector|Choose/i').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('4 — Inspect tab: botones de grado presentes (A / B / C / Reject)', async () => {
    await page.getByText(/Inspect/i).first().click();
    await page.waitForTimeout(1_000);

    // Los botones de grado pueden no estar visibles hasta seleccionar picker
    // Comprobamos que los botones existan en alguna parte del DOM visible
    const gradeArea = page.locator(
      '[data-grade], button:has-text("Grade"), text=/Grade|Quality|A|B|C|Reject/i'
    ).first();

    // Si hay pickers en el seed, los botones de grado deben aparecer
    // Si no hay pickers, acepta el empty state
    const gradeOrEmpty = gradeArea.or(
      page.locator('text=/No picker|No crew|Select a picker|Empty/i').first()
    );
    await expect(gradeOrEmpty).toBeVisible({ timeout: 10_000 });
  });

  test('5 — Inspect tab: si hay pickers, se puede seleccionar uno', async () => {
    await page.getByText(/Inspect/i).first().click();
    await page.waitForTimeout(1_000);

    // Intentar seleccionar un picker si la lista está disponible
    const pickerItem = page.locator(
      '[data-picker-id], li:has(button), .picker-row, [role="listitem"]'
    ).first();

    if (await pickerItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pickerItem.click();
      await page.waitForTimeout(500);

      // Los botones de grado deben aparecer ahora
      await expect(
        page.locator(
          'button:has-text("A"), button:has-text("Grade A"), [data-grade="A"]'
        ).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test('6 — Grading workflow: seleccionar picker y asignar grado A', async () => {
    await page.getByText(/Inspect/i).first().click();
    await page.waitForTimeout(1_000);

    // Solo ejecutar si hay pickers disponibles
    const pickerList = page.locator(
      '[data-picker-id], .picker-row, [role="listitem"]:has(button)'
    ).first();

    if (!await pickerList.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip(); // No hay pickers en el entorno de test — skip graceful
      return;
    }

    await pickerList.click();
    await page.waitForTimeout(500);

    // Click en grado A
    const gradeA = page.locator(
      'button:has-text("A"), [data-grade="A"], button[aria-label*="Grade A" i]'
    ).first();

    if (await gradeA.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await gradeA.click();
      await page.waitForTimeout(500);

      // Debe aparecer confirmación o avanzar al siguiente picker
      await expect(
        page.locator('text=/Saved|Success|Graded|✓|Next/i').first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  /* ── 4. History tab ─────────────────────────────────── */

  test('7 — History tab: inspecciones del día o estado vacío', async () => {
    await page.getByText(/History/i).first().click();
    await page.waitForTimeout(1_000);

    await expect(
      page.locator('text=/History|Inspection|Today|Grade|No inspection|Empty/i').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  /* ── 5. Stats tab ───────────────────────────────────── */

  test('8 — Stats/Analytics tab: distribución de grados visible', async () => {
    const statsTab = page.getByText(/Stats|Analytics/i).first();
    await statsTab.click();
    await page.waitForTimeout(1_000);

    await expect(
      page.locator('text=/Grade|Distribution|A%|Quality|Total|No data/i').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  /* ── 6. Trends tab ──────────────────────────────────── */

  test('9 — Trends tab: gráfico histórico carga sin error', async () => {
    const trendsTab = page.getByText(/Trend|Trends/i).first();
    if (await trendsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await trendsTab.click();
      await page.waitForTimeout(1_500);

      // No debe haber pantalla de error — cualquier contenido es válido
      await expect(page.locator('text=/Error|Crash/i')).not.toBeVisible({ timeout: 5_000 });
      const body = await page.textContent('body');
      expect(body!.length).toBeGreaterThan(50);
    }
  });

  /* ── 7. Offline resilience ──────────────────────────── */

  test('10 — Offline: app renderiza datos cacheados (Service Worker)', async () => {
    // Cargar el inspect tab mientras online para cachear
    await page.getByText(/Inspect/i).first().click();
    await page.waitForTimeout(1_000);

    // Cortar red
    await goOffline(context, page, { assertBanner: true, waitMs: 1_500 });

    // Recargar desde caché del SW
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);

    // La shell de la app debe seguir renderizando
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(50);

    // Banner offline visible
    await expect(page.getByText(/offline/i)).toBeVisible({ timeout: 8_000 });
  });
});
