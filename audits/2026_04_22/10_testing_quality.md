# Audit 10 — Testing Quality (HarvestPro NZ)

**Date**: 2026-04-22
**Scope**: vitest (unit + integration), playwright (e2e), MSW mocks
**Method**: static read-only (no tests run, no coverage generated)

---

## Severity roll-up

| Severity | Count |
|---|---|
| CRITICAL | 2  (integration config mostly unused; coverage unknown — no `coverage/` data) |
| HIGH     | 4  (e2e `waitForTimeout` flakiness; edge-function code has no unit tests; weak assertions overload; `dbCrypto` crypto service untested) |
| MEDIUM   | 6  (MFA e2e mostly skipped; MSW ≠ test mocks; no a11y tests; no perf/lighthouse; "integration" folder misnamed; mock drift risk unchecked for most tables) |
| LOW      | 4  (3 admin pages w/o component tests; 3 utility services untested; `industrial-edge-cases` SW suite fully skipped; weak assertions in routes/hooks) |

**Skipped / todo tests** (in `*.test.ts` / `*.spec.ts`): **13 occurrences** across 5 files. None use `it.only` / `test.only` / `describe.only` — good.

**Inventory**: 530 test files total (489 unit/component in `src/`, 10 tests/integration+parity, 31 e2e).

---

## Top 6 findings

### 1. CRITICAL — Integration config effectively orphaned; "integration" directory is not what it says
`vitest.config.integration.ts` only matches `tests/integration/**/*.test.ts` — that path contains **exactly one file** (`analytics.supabase.test.ts`). Meanwhile the bulk of files named `*.integration.test.ts` live under `src/integration/` (11 files) and are picked up by the **default** `vitest.config.ts` (jsdom + `test-setup.ts` + `fake-indexeddb`), not the integration config. 7 of those 11 files mock Supabase entirely (`vi.mock('@/services/supabase', …)`), so they are really component/service tests wearing an "integration" label. Only 3 files actually hit real Supabase (`payroll-real-supabase`, `hr-documents-supabase`, `role-flows-sanity`) and all three are `describe.skipIf(!URL || !SERVICE_KEY)` — silently skipped in any environment that forgot to set `VITE_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. This directly violates the user's `feedback_rules_no_fake_done` rule (no DONE without real DB data) because every CI run sees "pass" with zero DB coverage. There is **no npm script** that invokes `vitest.config.integration.ts` — `package.json` only has `test` / `test:watch` / `test:coverage` / `test:e2e`. The integration suite must be run by hand or not at all.

**Files**: `/root/repos/harvestpro-nz/vitest.config.integration.ts`, `/root/repos/harvestpro-nz/src/integration/*.integration.test.ts`, `/root/repos/harvestpro-nz/tests/integration/analytics.supabase.test.ts`, `/root/repos/harvestpro-nz/package.json` (lines 15–20).

### 2. CRITICAL — No coverage artifact; true blind spots cannot be verified
`/root/repos/harvestpro-nz/coverage/` exists but contains only `.tmp/` — no `lcov.info`, no `coverage-summary.json`, no HTML report. The `test:coverage` script is defined but evidently not run in CI or checked in. All coverage claims in memory notes ("92 tests passing", etc.) are unverifiable. Vitest config excludes `src/**/index.ts` from coverage — that silently hides barrel re-export defects.

### 3. HIGH — 129 `waitForTimeout(...)` calls across Playwright specs
Playwright's own docs flag `waitForTimeout` as a flakiness anti-pattern. Concentrated in `orchard-switching.spec.ts` (11 calls, up to 3000 ms each), `industrial-edge-cases.spec.ts` (entire suite also `test.describe.skip`-ped), `rls-archived-blocking.spec.ts` (3000–5000 ms sleeps mid-test), and `payroll-accuracy.spec.ts` (`waitForTimeout(200)` inside a 20-iteration scan loop = cumulative 4 s that can race Supabase round-trips on a slow runner). These should be replaced with `expect(locator).toBeVisible({ timeout })`, `waitForResponse`, or `waitForLoadState('networkidle')`.

### 4. HIGH — Edge functions (Supabase/Deno) have zero unit tests
10 edge functions under `supabase/functions/` (`calculate-payroll`, `check-compliance`, `detect-anomalies`, `manage-admin`, `manage-attendance`, `provision-orchard`, `record-bucket`, `send-push`, `submit-audit-log`, `api-v1`) — `find ... -name "*.test.ts"` returns empty. Payroll calculation (Holidays Act s.50/s.60 math, min-wage supplement) runs exclusively inside `calculate-payroll` and is only exercised end-to-end via `e2e/payroll-accuracy.spec.ts` (1 test) and the skipped `payroll-real-supabase.integration.test.ts`. A regression in the Deno function body is not caught by the Vitest suite — the service-layer payroll tests mock `edgeFunctionsRepository.invoke`.

### 5. HIGH — 1 699 weak assertions (`toBeTruthy` / `toBeDefined` / `toBeFalsy`) vs 202 bare `toHaveBeenCalled`
Breakdown:
- `toBeTruthy`: 1 242
- `toBeDefined`: 457
- `toBeFalsy`: 0
- Bare `toHaveBeenCalled` (no `With` / `Times`): 202 — vs 427 that do specify args/count.

Representative offenders:
- `src/routes.test.tsx` — seven asserts are `expect(screen.getByTestId('login-page')).toBeDefined()` (line 76, 113, 129, 151, 172, 214, 230). `getByTestId` throws if the element is missing, so `toBeDefined` is tautological. Rename to `.toBeInTheDocument()` once and audit the pattern.
- `src/utils/orchardMapUtils.test.ts:116–118` — `expect(style.bg).toBeTruthy()` etc. (should assert the actual colour).
- `src/hooks/useOfflineQueue.test.ts:46` — `expect(result).toBeDefined()` immediately after `renderHook`, which can only fail if the hook throws.

### 6. MEDIUM — MSW mock drift risk is mitigated for `daily_attendance` but not for most other tables
Historical bug (ERRORES.md 2026-04-13): `mockDailyAttendance` used `check_in`/`check_out` while `picker-history.service` read `check_in_time`/`check_out_time` — fixed. Spot-check today: mock uses `check_in` and repo `attendance.repository.ts` uses `check_in` → consistent. BUT: MSW handlers (`src/mocks/handlers/database.ts`) are **only used by `vite --mode mock`** (dev UI), not by unit tests (`test-setup.ts` never calls `setupServer`/`server.listen`). Tests mock Supabase either via `vi.spyOn(supabase, 'from')` with ad-hoc chainables (e.g. `attendance.repository.test.ts`) or via `vi.mock('@/services/supabase', …)` with a minimal stub. No automated shape check ties the 985-line `mocks/data/index.ts` to `src/types/database.types.ts`. Any table beyond the ones historically burned can drift silently. Recommendation: add a `parity.seed.test.ts`-style schema compare for every mocked table.

---

## Secondary findings (condensed)

- **Skipped tests list** (13 total; none are `.only`):
  1. `e2e/industrial-edge-cases.spec.ts:16` — `test.describe.skip('PWA Cold Start - Offline Asset Caching')` (entire suite, SW headless limitation)
  2–7. `e2e/mfa-flow.spec.ts:54, 59, 77, 126, 138, 144` — six `test.skip` guards that disable most of the MFA suite ("Auth /settings endpoint no accesible", "manager@ no tiene MFA enrolled todavía"); MFA hardening is effectively untested in e2e.
  8. `e2e/qc-inspection.spec.ts:156` — graceful skip when no pickers in env.
  9. `e2e/smoke.spec.ts:34` — conditional skip if Supabase creds missing.
  10. `src/integration/payroll-real-supabase.integration.test.ts:21` — `describe.skipIf(SKIP)`.
  11. `src/integration/hr-documents-supabase.integration.test.ts:18,99` — two `describe.skipIf`.
  12. `src/integration/role-flows-sanity.integration.test.ts:18` — `describe.skipIf`.
- **Accessibility tests**: zero. No `@axe-core/playwright`, no `jest-axe`, no `vitest-axe`. Only `eslint-plugin-jsx-a11y` for lint-time rules — no runtime a11y assertions. Given the scanner/offline-first UX, missing keyboard-navigation + contrast tests is a real regression risk.
- **Performance / Lighthouse**: zero. No `@lhci/cli`, no `web-vitals`-based assertions (the runtime dep exists but only reports to Sentry). No benchmark suite, no bundle-size budget.
- **Snapshots**: zero `toMatchSnapshot` / `toMatchInlineSnapshot`. Clean on this axis.
- **Security-adjacent e2e** (good):
  - `rls-cross-tenant.spec.ts` — proper multi-tenant RLS + IDOR INSERT attack.
  - `rls-archived-blocking.spec.ts` — archived-picker PGRST116 verification.
  - `mfa-flow.spec.ts` — exists but mostly `test.skip`-ed (see above).
  - Rate-limit only tested at the `gateway.service` classifier level (treating a 429 string as a retryable error). No test exercises the `check_rate_limit` RPC under actual burst.
- **Test isolation**: `src/test-setup.ts` resets Zustand + `localStorage` in `afterEach`, mocks `safeStorage`, fake-indexeddb, `Pacific/Auckland` TZ lock → good. But `test-setup.ts` imports `useHarvestStore` at module scope, capturing initial state via `JSON.stringify`; any store field holding non-serialisable data (Date, Map, Set) would round-trip wrong. Spot check recommended.
- **Flaky patterns in unit tests**: 139 `setTimeout`/`sleep` references and 144 `waitFor` calls across unit tests. Not all are problematic (timers may be faked), but combined with `pool: 'threads'` + `fileParallelism: false` + `maxWorkers: 2` in the default config, and a separate CI config (`forks`, `isolate: false`) specifically tuned to avoid OOMs, the suite is obviously memory-fragile (documented in the config comments: "jsdom location errors", "mass accumulation"). That's a smell in itself.
- **Repository coverage**: all 27 repositories under `src/repositories/` have a matching `*.test.ts`. Untested only: `admin.repository.ts`, `bucket-ledger.repository.ts`, `edge-functions.repository.ts`, `optimistic-lock.repository.ts`, `store-sync.repository.ts` — covered indirectly by `remaining-repos.test.ts` / `uncovered-repos.test.ts` (catch-all files).
- **Service coverage**: of 79 top-level service sources, only **2 are untested**: `services/dbCrypto.ts` (crypto wrapper — HIGH risk) and `services/supabase.ts` (client bootstrap, arguably out of scope). Everything else has a `.test.ts` and most have additional `.deep.test.ts` / `.e2e.test.ts` siblings.
- **Page coverage**: untested pages — `AdminComplianceTab.tsx`, `AdminOrchardsTab.tsx`, `AdminUsersTab.tsx`. Admin CRUD is security-sensitive (role assignment, orchard provisioning) — recommend component + e2e coverage.
- **Hook coverage**: all hooks tested except `src/hooks/index.ts` (barrel, fine).
- **`playwright.production.config.ts`** points at `https://merr-pi.vercel.app` as the fallback — looks like a leftover from a previous project. Should be `https://harvestpro.vercel.app` to match `playwright.config.ts:27`.

---

## Recommendations (ordered)

1. Add `"test:integration": "vitest run --config vitest.config.integration.ts"` to `package.json` and wire it into CI (nightly, with the real Supabase credentials). Rename `src/integration/*` that mock everything to `src/<feature>/*.pipeline.test.ts` to stop pretending.
2. Fix the three `describe.skipIf(SKIP)` blocks to `describe.runIf(process.env.CI === 'true' && HAS_CREDS)` + fail the CI job if credentials are missing instead of silently skipping.
3. Enable `test:coverage` in CI, commit `coverage-summary.json` to the audit trail, set a per-directory floor (>80 % for `src/services/`, `src/repositories/`).
4. Replace `waitForTimeout` with `waitForResponse` / `expect().toBeVisible({ timeout })` across the e2e suite; start with `orchard-switching.spec.ts` (11 occurrences).
5. Write Deno test files for each edge function under `supabase/functions/*/test.ts` — at minimum for `calculate-payroll` (Holidays Act math) and `manage-admin` (role-assignment path).
6. Add `@axe-core/playwright` to the top 3 user flows (login, scanner, payroll-approval) and a `@lhci/cli` budget file (`lighthouserc.js`) with a score floor.
7. Strengthen `toBeTruthy` / `toBeDefined` assertions (1 699 occurrences) — start with `src/routes.test.tsx` and the shared util tests.
8. Fix `playwright.production.config.ts` fallback URL (`merr-pi.vercel.app` → `harvestpro.vercel.app`).
9. Add a schema-parity test: for each mocked table in `src/mocks/data/index.ts`, assert its keys ⊆ `database.types.ts` column set, to prevent a recurrence of the `check_in` / `check_in_time` drift on other tables.

---

**Summary line (for memory)**: 530 test files, strong repo/service breadth, but (a) integration config is a façade — only 1 file actually uses it, (b) no coverage artifact, (c) 129 `waitForTimeout` in e2e, (d) 0 edge-function unit tests, (e) 0 a11y / 0 perf tests, (f) 1 699 weak asserts vs 202 bare `toHaveBeenCalled`. 13 skipped/todo, none `.only`.
