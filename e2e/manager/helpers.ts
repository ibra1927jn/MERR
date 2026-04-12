/**
 * Shared E2E helpers for Manager tests.
 *
 * Since the environment runs against a mock Supabase (no real backend),
 * we intercept auth and data endpoints so the app loads as an
 * authenticated Manager with seed data.
 */
import { Page } from '@playwright/test';

/* ── Mock IDs ──────────────────────────────────────── */
const MANAGER_USER_ID = 'e2e-manager-001';
const ORCHARD_ID = 'e2e-orchard-001';
const TEAM_LEADER_ID = 'e2e-leader-001';
const RUNNER_ID = 'e2e-runner-001';
const PICKER_1_ID = 'e2e-picker-001';
const PICKER_2_ID = 'e2e-picker-002';

/* ── Mock JWT (not validated — just needs to be parseable) ── */
const MOCK_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInN1YiI6ImUyZS1tYW5hZ2VyLTAwMSIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock';

/* ── Seed crew data ────────────────────────────────── */
const SEED_CREW = [
    {
        id: TEAM_LEADER_ID, name: 'Ana Torres', picker_id: 'TL-101',
        role: 'team_leader', orchard_id: ORCHARD_ID, status: 'active',
        safety_verified: true, avatar: 'AT', current_row: 3,
        total_buckets_today: 0, hours: 6, qcStatus: [100],
        team_leader_id: null,
    },
    {
        id: RUNNER_ID, name: 'Jake Wilson', picker_id: 'RN-201',
        role: 'runner', orchard_id: ORCHARD_ID, status: 'active',
        safety_verified: true, avatar: 'JW', current_row: 5,
        total_buckets_today: 0, hours: 5, qcStatus: [],
        team_leader_id: null,
    },
    {
        id: PICKER_1_ID, name: 'Liam O\'Connor', picker_id: 'PK-301',
        role: 'picker', orchard_id: ORCHARD_ID, status: 'active',
        safety_verified: true, avatar: 'LO', current_row: 3,
        total_buckets_today: 28, hours: 4.5, qcStatus: [95, 100, 88],
        team_leader_id: TEAM_LEADER_ID,
    },
    {
        id: PICKER_2_ID, name: 'Maria Santos', picker_id: 'PK-302',
        role: 'picker', orchard_id: ORCHARD_ID, status: 'active',
        safety_verified: true, avatar: 'MS', current_row: 7,
        total_buckets_today: 35, hours: 5, qcStatus: [100, 92],
        team_leader_id: TEAM_LEADER_ID,
    },
];

/* ── Seed bucket records ───────────────────────────── */
function makeBucketRecords() {
    const now = new Date();
    const records = [];
    for (let i = 0; i < 63; i++) {
        const time = new Date(now.getTime() - i * 3 * 60_000); // every 3 min
        records.push({
            id: `br-${i}`,
            picker_id: i % 2 === 0 ? PICKER_1_ID : PICKER_2_ID,
            orchard_id: ORCHARD_ID,
            quality_grade: 'A',
            created_at: time.toISOString(),
            scanned_at: time.toISOString(),
            synced: true,
        });
    }
    return records;
}

const SEED_ORCHARD = {
    id: ORCHARD_ID,
    name: 'Sunrise Orchard',
    total_rows: 20,
    bucket_rate: 6.50,
    daily_target_tons: 10,
    variety: 'Cherry',
};

const SEED_SETTINGS = {
    piece_rate: 6.50,
    target_tons: 10,
    min_wage_rate: 23.15,
    min_buckets_per_hour: 3.6,
};

/**
 * Intercept Supabase endpoints and seed the Zustand store so the app
 * boots as an authenticated Manager with data.
 */
export async function setupManagerSession(page: Page) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? 'https://staging-mock.supabase.co';

    /* ── 1. Intercept Supabase Auth ────────────────── */

    // Mock user with verified MFA factor (bypasses MFAGuard)
    const MOCK_AUTH_USER = {
        id: MANAGER_USER_ID,
        email: 'manager@harvestpro.nz',
        role: 'authenticated',
        aud: 'authenticated',
        app_metadata: { role: 'manager' },
        user_metadata: { full_name: 'E2E Manager' },
        factors: [{
            id: 'e2e-factor-001',
            type: 'totp',
            factor_type: 'totp',
            status: 'verified',
            friendly_name: 'E2E Authenticator',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }],
    };

    // GET /auth/v1/user — return current user with MFA factors
    await page.route(`${supabaseUrl}/auth/v1/user`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_AUTH_USER),
        }),
    );

    // POST /auth/v1/token — login / refresh
    await page.route(`${supabaseUrl}/auth/v1/token**`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                access_token: MOCK_ACCESS_TOKEN,
                token_type: 'bearer',
                expires_in: 86400,
                refresh_token: 'mock-refresh',
                user: {
                    id: MANAGER_USER_ID,
                    email: 'manager@harvestpro.nz',
                    role: 'authenticated',
                    app_metadata: { role: 'manager' },
                    user_metadata: { full_name: 'E2E Manager' },
                },
            }),
        }),
    );

    // MFA factors — return a verified TOTP factor to bypass MFA guard
    await page.route(`${supabaseUrl}/auth/v1/factors**`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                totp: [{
                    id: 'e2e-factor-001',
                    type: 'totp',
                    status: 'verified',
                    friendly_name: 'E2E Authenticator',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }],
                phone: [],
            }),
        }),
    );

    // GET /auth/v1/session — existing session
    await page.route(`${supabaseUrl}/auth/v1/session`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                access_token: MOCK_ACCESS_TOKEN,
                token_type: 'bearer',
                expires_in: 86400,
                refresh_token: 'mock-refresh',
                user: {
                    id: MANAGER_USER_ID,
                    email: 'manager@harvestpro.nz',
                    role: 'authenticated',
                },
            }),
        }),
    );

    /* ── 2. Intercept Supabase REST (PostgREST) ────── */

    // Helper: PostgREST uses Accept header to decide single vs array response.
    // .maybeSingle() / .single() sends "application/vnd.pgrst.object+json"
    function fulfillPostgrest(
        route: import('@playwright/test').Route,
        request: import('@playwright/test').Request,
        rows: Record<string, unknown>[],
    ) {
        const accept = request.headers()['accept'] || '';
        const isSingle = accept.includes('vnd.pgrst.object');
        const body = isSingle ? JSON.stringify(rows[0] ?? null) : JSON.stringify(rows);
        const headers: Record<string, string> = {
            'content-type': 'application/json',
            'content-range': `0-${rows.length - 1}/${rows.length}`,
        };
        return route.fulfill({ status: 200, headers, body });
    }

    // IMPORTANT: Register catch-all FIRST (Playwright matches routes LIFO,
    // so specific routes registered after this will take priority).
    await page.route(`${supabaseUrl}/rest/v1/**`, (route) => {
        if (route.request().method() === 'GET') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    // Realtime WebSocket — let it fail silently
    await page.route(`${supabaseUrl}/realtime/**`, route => route.abort());

    const MANAGER_PROFILE = {
        id: MANAGER_USER_ID,
        name: 'E2E Manager',
        full_name: 'E2E Manager',
        email: 'manager@harvestpro.nz',
        role: 'manager',
        orchard_id: ORCHARD_ID,
        safety_verified: true,
        privacy_consent_at: new Date().toISOString(),
        status: 'active',
    };

    // Profile lookup (used by loadUserData)
    await page.route(`${supabaseUrl}/rest/v1/users*`, (route, request) => {
        if (request.method() === 'GET') {
            return fulfillPostgrest(route, request, [MANAGER_PROFILE]);
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    // Orchards
    await page.route(`${supabaseUrl}/rest/v1/orchards*`, (route, request) => {
        if (request.method() === 'GET') {
            return fulfillPostgrest(route, request, [SEED_ORCHARD]);
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    // Pickers / crew
    await page.route(`${supabaseUrl}/rest/v1/pickers*`, (route, request) => {
        if (request.method() === 'GET') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(SEED_CREW),
            });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    // Bucket records
    await page.route(`${supabaseUrl}/rest/v1/bucket_records*`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(makeBucketRecords()),
        }),
    );

    // Harvest settings
    await page.route(`${supabaseUrl}/rest/v1/harvest_settings*`, (route, request) => {
        if (request.method() === 'PATCH' || request.method() === 'POST') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
        return fulfillPostgrest(route, request, [SEED_SETTINGS as Record<string, unknown>]);
    });

    // Allowed registrations (whitelist)
    await page.route(`${supabaseUrl}/rest/v1/allowed_registrations*`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );

    // Conversations / messages
    await page.route(`${supabaseUrl}/rest/v1/conversations*`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.route(`${supabaseUrl}/rest/v1/messages*`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.route(`${supabaseUrl}/rest/v1/broadcasts*`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.route(`${supabaseUrl}/rest/v1/chat_groups*`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );

    // Payroll
    await page.route(`${supabaseUrl}/rest/v1/payroll*`, route =>
        route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify([{ id: 'pr-1', finalTotal: 485.50, orchard_id: ORCHARD_ID }]),
        }),
    );

    // Alerts
    await page.route(`${supabaseUrl}/rest/v1/alerts*`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );

    /* ── 3. Inject auth session into localStorage ──── */
    // Supabase stores session in localStorage with key pattern: sb-*-auth-*
    await page.addInitScript((args) => {
        const { token, userId } = args;
        const sessionData = {
            access_token: token,
            token_type: 'bearer',
            expires_in: 86400,
            expires_at: Math.floor(Date.now() / 1000) + 86400,
            refresh_token: 'mock-refresh',
            user: {
                id: userId,
                email: 'manager@harvestpro.nz',
                role: 'authenticated',
                app_metadata: { role: 'manager' },
                user_metadata: { full_name: 'E2E Manager' },
                aud: 'authenticated',
                factors: [{
                    id: 'e2e-factor-001',
                    type: 'totp',
                    factor_type: 'totp',
                    status: 'verified',
                    friendly_name: 'E2E Authenticator',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }],
            },
        };

        // Supabase checks all localStorage keys matching sb-*-auth-*
        // We set a few variations to cover the dynamic tabId key
        const keys = Object.keys(localStorage);
        const existingKey = keys.find(k => k.startsWith('sb-') && k.includes('-auth-'));

        if (existingKey) {
            localStorage.setItem(existingKey, JSON.stringify(sessionData));
        }
        // Also set a predictable key
        localStorage.setItem('sb-harvestpro-auth-e2e', JSON.stringify(sessionData));

        // Override sessionStorage tab ID so the supabase client uses our key
        sessionStorage.setItem('harvestpro_tab_id', 'e2e');
    }, { token: MOCK_ACCESS_TOKEN, userId: MANAGER_USER_ID });
}

/**
 * Click a sidebar/bottom-nav item by label, scoped to avoid matching content text.
 */
export async function clickNavItem(page: Page, label: string) {
    // Desktop: sidebar nav; Mobile: bottom nav
    // Use role-based selector to avoid matching icon text
    const navButton = page.locator(`nav button:has(span.truncate:text("${label}")), aside button:has(span.truncate:text("${label}")), nav button:has-text("${label}"), [role="navigation"] button:has-text("${label}")`).first();
    await navButton.click();
    await page.waitForTimeout(500);
}

/**
 * Navigate to the Manager dashboard after setting up the mock session.
 */
export async function loginAsManager(page: Page) {
    await setupManagerSession(page);
    await page.goto('/manager', { waitUntil: 'domcontentloaded' });
    // Wait for React to hydrate and the app to render
    await page.waitForTimeout(3_000);
}
