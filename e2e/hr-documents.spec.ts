/**
 * HR Documents e2e — upload/list/delete flow.
 * Login as hr_admin, go to HHRR > Documents, verify UI shows upload
 * button + lista empty state, open modal, verify form fields.
 *
 * No file upload here — jsdom/playwright file handling varies; unit
 * tests cover the upload logic. This covers UI scaffolding + RLS.
 */
import { test, expect } from '@playwright/test';

test.describe('HR Documents', () => {
  test.use({ storageState: 'e2e/.auth/hr.json' });

  test('hr_admin can see Documents tab with upload UI', async ({ page }) => {
    await page.goto('/hr');

    // Documents tab in the sidebar nav
    await page.getByRole('link', { name: /documents/i }).or(page.getByText(/documents/i).first()).click();

    // Either list, empty state, or upload button visible
    const uploadBtn = page.getByTestId('hr-docs-upload-btn');
    const empty = page.getByTestId('hr-docs-empty');
    const list = page.getByTestId('hr-docs-list');

    await expect(uploadBtn.or(empty).or(list).first()).toBeVisible({ timeout: 15000 });
    await expect(uploadBtn).toBeVisible();
  });

  test('upload button opens modal with form fields', async ({ page }) => {
    await page.goto('/hr');
    await page.getByRole('link', { name: /documents/i }).or(page.getByText(/documents/i).first()).click();

    await page.getByTestId('hr-docs-upload-btn').click();

    await expect(page.getByTestId('upload-file')).toBeVisible();
    await expect(page.getByTestId('upload-title')).toBeVisible();
    await expect(page.getByTestId('upload-type')).toBeVisible();
    await expect(page.getByTestId('upload-expires')).toBeVisible();
    await expect(page.getByTestId('upload-submit')).toBeVisible();
  });

  test('submit sin archivo ni title muestra error', async ({ page }) => {
    await page.goto('/hr');
    await page.getByRole('link', { name: /documents/i }).or(page.getByText(/documents/i).first()).click();
    await page.getByTestId('hr-docs-upload-btn').click();

    await page.getByTestId('upload-submit').click();
    await expect(page.getByRole('alert')).toContainText(/requeridos/i);
  });
});

test.describe('HR Documents RLS', () => {
  test.use({ storageState: 'e2e/.auth/picker.json' });

  test('role picker no debe ver el tab HHRR ni documentos', async ({ page }) => {
    // Picker lands on team-leader or runner, not /hr
    await page.goto('/hr');
    // Either redirected or page shows permission error
    await expect(page).not.toHaveURL(/\/hr\/?$/, { timeout: 5000 }).catch(() => {
      // If still on /hr, should show access denied or empty
      return expect(page.getByText(/access|forbidden|not authorized/i).first()).toBeVisible();
    });
  });
});
