# Test Coverage Audit — harvestpro-nz (2026-04-23)

## Executive Summary
**530 unit tests (499 src/) | 31 e2e (Playwright) | 10 integration (real Supabase)**

Critical workflows are heavily tested in unit + e2e, but **leave/holiday accrual has zero dedicated tests**, and **RLS security relies on e2e only**. All CI configs (vitest.config.ci.ts, unit+e2e) execute properly. Significant gaps in mutation-sensitivity (boundary conditions) for piece-rate calculations and leave accruals.

---

## Test Inventory

| Category | Count | Coverage |
|----------|-------|----------|
| Unit tests (src/**/*.test.ts) | 499 | High in payroll, auth, sync; sparse in HR, leave |
| Integration tests (real Supabase) | 10 | Payroll pipeline, analytics, auth session, RLS |
| E2E (Playwright) | 31 | All critical flows + offline, RLS cross-tenant |
| Service tests (src/services/__tests__) | 83 | Deep: payroll, auth, sync, compliance, QC |
| Hook tests (src/hooks) | ~40 | usePayroll, useAttendance, useOfflineQueue, useQC |
| Total test files (~) | 530 | **Solid baseline — see gaps below** |

---

## Critical Flow Coverage Map

| Flow | Test Files | Status |
|------|-----------|--------|
| **Login + role-based redirect** | e2e/login.spec.ts, e2e/login-flows.spec.ts, src/integration/auth-session-lifecycle.integration.test.tsx | ✓ Unit+E2E; role routing tested |
| **Clock-in / clock-out + offline sync** | e2e/offline-sync.spec.ts, e2e/offline-attendance.spec.ts, src/services/__tests__/sync.service.test.ts, src/hooks/useAttendance.test.ts | ✓ Full e2e; queue persistence verified |
| **Piece-rate entry + min-wage top-up calc** | e2e/payroll-accuracy.spec.ts, src/services/__tests__/payroll.service.test.ts, src/services/__tests__/nz-payroll-deductions.service.test.ts | ✓ Unit+E2E; $23.95/hr boundary tested |
| **Timesheet approval** | e2e/payroll-approval.spec.ts, src/services/__tests__/payroll.service.test.ts (approveTimesheet) | ✓ E2E flow; optimistic locking tested |
| **Payroll run (gross → tax → KiwiSaver → net)** | e2e/payroll-accuracy.spec.ts, src/services/__tests__/nz-payroll-deductions.service.test.ts (60+ test cases) | ✓ Deep unit tests; PAYE, ACC, KiwiSaver all covered |
| **Public holiday worked (1.5× + alt day accrual)** | **NONE** | ✗ **CRITICAL GAP** |
| **Annual leave accrual + BAPS payout** | **NONE** | ✗ **CRITICAL GAP** |
| **Meal-break-paid flag** | src/services/__tests__/compliance.full.test.ts, src/services/__tests__/break-verification-deep.test.ts (meal-break intervals) | ⚠ Partial: compliance logic tested, not UI flag |
| **Leave request + approval** | **NONE** | ✗ **CRITICAL GAP** |
| **HR doc upload + download with RLS** | e2e/hr-documents.spec.ts, src/integration/hr-documents-supabase.integration.test.ts (upload modal, RLS negation) | ✓ E2E + RLS tested |
| **QC photo upload + privacy** | e2e/qc-inspection.spec.ts, src/hooks/useQC.test.ts, src/repositories/qc.repository.test.ts | ✓ E2E; RLS via qc role |
| **Invite flow + role escalation prevention** | **NONE** | ✗ **CRITICAL GAP** |
| **Logout clears all caches** | src/config/analytics.test.ts (trackLogout), src/services/__tests__/audit.service.test.ts | ⚠ Partial: audit log only, not full cache clear |
| **Bucket record creation + RLS** | e2e/rls-cross-tenant.spec.ts (IDOR INSERT test), src/integration/bucket-pipeline.integration.test.ts (clock-skew boundary) | ✓ RLS breach attempt blocked; boundary @ 5min |

---

## Test Quality Analysis

### Strengths
1. **Payroll precision**: 60+ deduction test cases; boundary @ $23.95/hr explicitly verified (not >= comparison)
2. **Offline-first**: Full e2e coverage (SW caching, IndexedDB queue, exponential backoff, DLQ, page reload)
3. **RLS security**: e2e/rls-cross-tenant.spec.ts tests INSERT/SELECT IDOR; e2e/rls-archived-blocking.spec.ts prevents soft-delete bypass
4. **Mocking discipline**: vi.mock() used correctly; integration tests (10 files) hit **real Supabase** (not mocked)
5. **Auth hardening**: AuthProvider mocked in unit tests; real Supabase session lifecycle tested in integration
6. **Memory & CI**: vitest.config.ci.ts uses pool:'forks' + 5 shards on 7GB GitHub runners; no OOM issues in past runs

### Critical Weaknesses
1. **Holiday / Leave accrual = ZERO tests**
   - No test for 1.5× public holiday rate
   - No alt-day accrual tracking (NZ Employment Relations Act Holidays)
   - No BAPS (Breaks, Annual leave, Public holidays, Sick leave) payout logic
   - **Legal exposure**: Wage audits will fail

2. **Mutation-sensitivity failures**
   - Piece-rate: boundary test at $23.95 exists, but NO off-by-one catches for min-wage formula `if (earnings < min_required)` vs `if (earnings <= min_required - 0.01)`
   - Holiday accrual: NO tests for `8% casual` vs `0% permanent` edge case
   - Meal breaks: interval logic tested, but NO test for "paid vs unpaid" flag change

3. **Leave/invite flows unmapped**
   - No RLS test for leave_requests (manager can see team's requests, not other orchards)
   - No invite validation test (can't escalate runner → manager)
   - No leave request approval flow

4. **Logout cache clarity**
   - Zustand store mock in test-setup.ts prevents actual cache test
   - Sentry + PostHog user context cleared in real code, but mocked in tests
   - **Result**: Cache-clearing bugs would slip through CI

5. **Flaky test markers**
   - 4 files with `.skipIf(SKIP)` (integration tests conditional on env var)
   - No observable `xit` / `it.skip` in committed code (good)
   - However: offline tests timeout at 90s; no retry logic

### Supabase Mocking: Safe or Risky?
- **Unit tests**: vi.mock() repositories → payroll service logic verified independently ✓
- **Integration tests**: Explicitly avoid jsdom, use Node env, hit `http://127.0.0.1:54321` (local Supabase) ✓
- **E2E tests**: Hit real Supabase (staging/demo tenant via storageState) ✓
- **Risk**: RLS bugs in production queries not caught if schema differs locally. Mitigation: e2e tests use ACID orchard constants (cross-tenant isolation).

---

## Top 10 Gaps to Close

1. **Holiday Accrual Tests** (Legal Risk ★★★★★)
   - Add unit tests for public holiday rate (1.5×) + alt-day accrual
   - Test edge case: holiday on weekend

2. **Leave Request Flow** (Operational Risk ★★★★)
   - E2E test: employee POST leave_request → manager email → manager APPROVE/REJECT → leave_balance updated
   - RLS: employee can only read own requests; manager can only approve own orchard

3. **Annual Leave BAPS Payout** (Legal Risk ★★★★)
   - Unit test: $0 if untaken (accrual), $X if taken (payout, subject to tax)
   - Casual worker 8% holiday pay vs permanent annual leave

4. **Invite Flow + Role Escalation** (Security Risk ★★★★)
   - E2E: runner cannot invite self as manager
   - RLS: only admins can INSERT to user_roles table

5. **Logout Cache Drain** (Functional Risk ★★★)
   - Unmock safeStorage in unit test; verify Zustand persist cleared, Sentry user = null

6. **Piece-Rate Off-By-One** (Mutation Risk ★★★)
   - Boundary test: earnings = min_required - $0.01 → should trigger supplement
   - Current test @ $23.95/hr exact; needs `≤` vs `<` validation

7. **Meal Break Paid Flag** (Compliance Risk ★★)
   - UI test: toggle meal_break_paid → hourly_rate calculation changes

8. **Soft-Delete Bypass RLS** (Security Risk ★★★)
   - Existing e2e/rls-archived-blocking.spec.ts; add unit test for `deleted_at IS NULL` in WHERE clause

9. **Flaky Offline Test Hardening** (Reliability ★★)
   - offline-sync.spec.ts @ 90s timeout; add retry logic or split into smaller tests

10. **Coverage Report Gap** (Visibility ★)
    - No coverage/coverage-summary.json in repo; add to CI, track target (80% → 85% in 2026-Q3)

---

## Execution & CI Status

**Scripts (package.json):**
- `npm test` → vitest run (unit, src/**/*.test.ts)
- `npm test:coverage` → HTML report (reportsDirectory: ./coverage, disabled in CI to avoid OOM)
- `npm test:e2e` → npx playwright test (e2e/*.spec.ts, global-setup.ts pre-auth 5 roles)
- **CI config**: vitest.config.ci.ts (pool:forks, maxWorkers:1, fileParallelism:false, testTimeout:30s)

**Integration tests** (separate suite):
```
npx vitest run --config vitest.config.integration.ts
```
Uses Node env, no jsdom, hits real Supabase local via VITE_SUPABASE_URL.

**Playwright Global Setup** (e2e/global-setup.ts):
Pre-authenticates 5 roles (manager, runner, team_leader, qc, admin) via Supabase demo account; saves storageState to e2e/.auth/*.json. Avoids rate-limit on repeated login.

---

## Recommendations

1. **Immediate** (P0): Add holiday accrual + leave request tests (legal audit requirement)
2. **This sprint** (P1): Unmock safeStorage, add invite RLS test, close piece-rate off-by-one
3. **Next quarter** (P2): Enable coverage reporting in CI, add mutation testing (stryker)
4. **Ongoing**: Maintain ≥ 80% statements coverage (current state unknown; coverage/ empty)

---

## Conclusion

**Payroll calculations & offline-first**: A+ (comprehensive boundary tests, real Supabase integration)
**Login & Auth**: A (session lifecycle tested in integration + e2e)
**RLS Security**: B+ (cross-tenant test exists, but leave/invite RLS unmapped)
**Leave/Holiday Compliance**: F (zero tests; wage audits at risk)
**Overall Grade: B** (critical flows covered, but legal exposure on leave/holiday accrual)

Recommend: **Do not release v10.0 without holiday accrual tests.**
