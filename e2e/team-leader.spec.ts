/**
 * E2E: Team Leader — Core Workflow
 *
 * Flows cubiertos:
 *  1. Login → redirección a /team-leader
 *  2. Navegación por todas las tabs del BottomNav
 *  3. Team tab: lista de crew visible
 *  4. Attendance tab: UI de check-in visible
 *  5. Timesheet tab: editor visible
 *  6. Home view: métricas de rendimiento del día
 *  7. Offline: app renderiza con caché (SW)
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import { login, newAuthContext, goOffline } from './utils/sync-helper';

test.describe('Team Leader — Core Workflow', () => {
  test.setTimeout(60_000);

  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    // Usa storageState pre-autenticado si existe (creado por global-setup.ts)
    context = await newAuthContext(browser, 'teamLeader');
    page = await context.newPage();
    await login(page, 'teamLeader');
    // Dar tiempo al store para hidratarse con datos iniciales
    await page.waitForTimeout(2_000);
  });

  test.afterEach(async () => {
    await context.setOffline(false);
    await page.close();
    await context.close();
  });

  /* ── 1. Login y redirección ─────────────────────────── */

  test('1 — Login redirige a /team-leader y la app carga', async () => {
    await expect(page).toHaveURL(/team-leader/);
    // La página tiene contenido real (no pantalla en blanco)
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
  });

  /* ── 2. BottomNav / Sidebar navegación ─────────────── */

  test('2 — Todas las tabs principales son accesibles', async () => {
    // Comprueba que existe navegación visible
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 8_000 });

    // Las tabs clave deben estar en el DOM
    await expect(page.locator('text=/Team|Crew/i').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=/Attendance/i').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=/Timesheet/i').first()).toBeVisible({ timeout: 8_000 });
  });

  /* ── 3. Team tab: crew list ─────────────────────────── */

  test('3 — Team tab: encabezado de crew setup visible', async () => {
    await page.getByText(/Team/i).first().click();
    await page.waitForTimeout(1_000);

    await expect(
      page.locator('text=/Crew|Total Crew|Picker|Team Setup|Team Leader/i').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('4 — Team tab: botón de añadir picker presente', async () => {
    await page.getByText(/Team/i).first().click();
    await page.waitForTimeout(1_000);

    // Botón Add / + para añadir picker
    const addBtn = page
      .getByRole('button', { name: /Add|New Picker|\+/i })
      .first();

    // Si no hay crew es posible que el botón esté en empty state
    const addOrEmpty = addBtn.or(page.locator('text=/Add Picker|No crew|Empty/i').first());
    await expect(addOrEmpty).toBeVisible({ timeout: 10_000 });
  });

  /* ── 4. Attendance tab ──────────────────────────────── */

  test('5 — Attendance tab: UI de roll call / check-in carga', async () => {
    await page.getByText(/Attendance/i).first().click();
    await page.waitForTimeout(1_000);

    await expect(
      page.locator('text=/Attendance|Check.?[Ii]n|Roll Call|Morning|Safety/i').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  /* ── 5. Timesheet tab ───────────────────────────────── */

  test('6 — Timesheet tab: editor o empty state carga', async () => {
    await page.getByText(/Timesheet/i).first().click();
    await page.waitForTimeout(1_000);

    await expect(
      page.locator('text=/Timesheet|Hours|Sign|Generate|No timesheet/i').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  /* ── 6. Home view métricas ──────────────────────────── */

  test('7 — Home view: métricas de producción del día visibles', async () => {
    // Home es la vista por defecto al cargar
    await expect(
      page.locator('text=/Bin|Bucket|Pay|Earn|Hour|Harvest|Crew|Total/i').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('8 — Home view: estado de safety visible', async () => {
    await expect(
      page.locator('text=/Safety|Morning|Huddle|Action|Compliant/i').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  /* ── 7. Offline resilience ──────────────────────────── */

  test('9 — Offline: la app renderiza datos cacheados (Service Worker)', async () => {
    // Navegar al Team tab mientras estamos online para cachear datos
    await page.getByText(/Team/i).first().click();
    await page.waitForTimeout(1_000);

    // Cortar conexión
    await goOffline(context, page, { assertBanner: true, waitMs: 1_500 });

    // Recargar — el Service Worker debe servir el shell cacheado
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);

    // La app no debe mostrar pantalla en blanco
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(50);

    // El banner offline debe seguir visible
    await expect(page.getByText(/offline/i)).toBeVisible({ timeout: 8_000 });
  });
});
