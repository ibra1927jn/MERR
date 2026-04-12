/**
 * Playwright Global Setup — Pre-autenticación por rol
 *
 * Hace login UNA vez por rol y guarda el storageState en .auth/<role>.json
 * Los tests que usan test.use({ storageState }) evitan re-logins y el rate limit de Supabase.
 *
 * Roles cubiertos: manager, runner, teamLeader, qc, acidManager
 */
import { chromium, FullConfig } from '@playwright/test';
import { mkdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar .env.local igual que playwright.config.ts
try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && !key.startsWith('#') && key.trim()) {
            process.env[key.trim()] = vals.join('=').trim();
        }
    });
} catch {
    // En CI puede no existir
}

const AUTH_DIR = 'e2e/.auth';

const ROLES = [
    { name: 'manager',     email: 'manager@harvestpro.nz',              password: process.env.TEST_MANAGER_PASSWORD ?? '111111', urlPattern: /\/manager/ },
    { name: 'runner',      email: 'runner@harvestpro.nz',               password: process.env.TEST_DEMO_PASSWORD    ?? '111111', urlPattern: /\/runner/ },
    { name: 'teamLeader',  email: 'lead@harvestpro.nz',                 password: process.env.TEST_DEMO_PASSWORD    ?? '111111', urlPattern: /\/team-leader/ },
    { name: 'qc',          email: 'qc@harvestpro.nz',                   password: process.env.TEST_DEMO_PASSWORD    ?? '111111', urlPattern: /\/qc/ },
    { name: 'acidManager', email: 'acid_manager_1_1@harvestpro.test',   password: process.env.TEST_ACID_PASSWORD    ?? 'AcidTest2026!', urlPattern: /\/manager/ },
];

export default async function globalSetup(config: FullConfig) {
    const baseURL = (config.projects[0]?.use as { baseURL?: string })?.baseURL ?? 'http://localhost:3000';

    mkdirSync(AUTH_DIR, { recursive: true });

    const browser = await chromium.launch();

    for (const role of ROLES) {
        const context = await browser.newContext({ baseURL });
        const page = await context.newPage();

        try {
            await page.goto('/login');
            await page.fill('input[type="email"]', role.email);
            await page.fill('input[type="password"]', role.password);
            await page.click('button[type="submit"]');
            await page.waitForURL(role.urlPattern, { timeout: 20_000 });
            await context.storageState({ path: `${AUTH_DIR}/${role.name}.json` });
            console.log(`  [global-setup] ✅ ${role.name}: ${role.email}`);
        } catch (e) {
            console.error(`  [global-setup] ❌ ${role.name}: ${(e as Error).message?.slice(0, 80)}`);
        } finally {
            await context.close();
        }
    }

    await browser.close();
}
