/**
 * HR Documents e2e — upload/list/delete flow.
 *
 * Usa storageState del manager porque global-setup.ts cubre 5 roles
 * (manager/runner/teamLeader/qc/acidManager). Manager tiene acceso
 * via RLS hr_documents_hr_manage (policy incluye 'manager' role).
 *
 * Picker block cubre RLS negativo: un runner no debe entrar a /hr.
 */
import { test, expect } from '@playwright/test';

test.describe('HR Documents', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' });

  test('manager can see Documents tab with upload UI', async ({ page }) => {
    await page.goto('/manager');
    // Navigate a /hr via URL directa
    await page.goto('/hr');

    // Click tab "documents" (puede ser link nav o tab button)
    const docsTab = page.getByRole('link', { name: /documents/i }).or(
      page.getByRole('button', { name: /documents/i }),
    ).or(
      page.getByText(/^documents$/i).first(),
    );
    await docsTab.first().click();

    // Visible: upload button OR empty state OR list
    const uploadBtn = page.getByTestId('hr-docs-upload-btn');
    const empty = page.getByTestId('hr-docs-empty');
    const list = page.getByTestId('hr-docs-list');

    await expect(uploadBtn.or(empty).or(list).first()).toBeVisible({ timeout: 15000 });
    await expect(uploadBtn).toBeVisible();
  });

  test('upload button opens modal with form fields', async ({ page }) => {
    await page.goto('/hr');
    await page.getByRole('link', { name: /documents/i }).or(
      page.getByRole('button', { name: /documents/i }),
    ).or(page.getByText(/^documents$/i).first()).first().click();

    await page.getByTestId('hr-docs-upload-btn').click();

    await expect(page.getByTestId('upload-file')).toBeVisible();
    await expect(page.getByTestId('upload-title')).toBeVisible();
    await expect(page.getByTestId('upload-type')).toBeVisible();
    await expect(page.getByTestId('upload-expires')).toBeVisible();
    await expect(page.getByTestId('upload-submit')).toBeVisible();
  });

  test('submit sin archivo ni title muestra error', async ({ page }) => {
    await page.goto('/hr');
    await page.getByRole('link', { name: /documents/i }).or(
      page.getByRole('button', { name: /documents/i }),
    ).or(page.getByText(/^documents$/i).first()).first().click();
    await page.getByTestId('hr-docs-upload-btn').click();

    await page.getByTestId('upload-submit').click();
    await expect(page.getByRole('alert')).toContainText(/requeridos/i);
  });
});

test.describe('HR Documents RLS negativo', () => {
  test.use({ storageState: 'e2e/.auth/runner.json' });

  test('runner no debe poder acceder a HHRR', async ({ page }) => {
    await page.goto('/hr');
    // Runner redirigido a /runner O muestra denied
    await page.waitForTimeout(1500);
    const url = page.url();
    // Acepta redirect o página denied/empty
    expect(
      !url.includes('/hr') ||
        (await page.getByText(/access|forbidden|not authorized|sign in/i).first().isVisible().catch(() => false)),
    ).toBeTruthy();
  });
});
