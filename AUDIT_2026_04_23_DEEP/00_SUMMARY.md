# Deep Audit — Executive Summary
**Date:** 2026-04-23  •  **Branch:** `improve/heartbeat-2026-04-22`  •  **Method:** 7 parallel Explore agents, one per axis.

## Overall verdict

🟠 **YELLOW — not release-ready.** Core architecture is sound (B+ / 79-85), security fundamentals are in place, but **three streams of fixes exist as branches that are NOT merged to the working branch**, and there are legal-exposure gaps (holiday accrual tests missing; KiwiSaver rate incorrect for 2026-04-01).

Do NOT cut v10.0 without closing the P0 list below.

## Reports

| # | Axis | File | Grade |
|---|---|---|---|
| 01 | Security (RLS, auth, secrets, uploads, CSP, deps) | `01_security.md` | 🟡 |
| 02 | NZ legal/payroll compliance | `02_nz_compliance.md` | 🟠 |
| 03 | Database / Supabase | `03_database.md` | 🟡 |
| 04 | Frontend (React, perf, a11y) | `04_frontend.md` | B+ |
| 05 | CI/CD & deployment | `05_cicd.md` | 🟡 |
| 06 | Test coverage | `06_tests.md` | B |
| 07 | Architecture / code quality | `07_architecture.md` | B+ (79/100) |

## Top findings — cross-axis punchlist

### 🔴 P0 — BLOCK release

1. **KiwiSaver rate wrong** — stuck at 3% min; statutory minimum is **3.5% from 2026-04-01**. Fix branch `fix/kiwisaver-rate-2026-04-22` exists but not merged. [02]
2. **Alt-holiday (Holidays Act s.60) double-counts** on recalculation of same period — in-memory only, no ledger. Fix branch `fix/alt-holiday-cross-period-2026-04-22` exists but not merged. [02]
3. **`quality_inspections` table: RLS enabled, ZERO policies** → any authenticated user can read/write. Either add policies or drop the legacy table (migrate to `qc_inspections`). [03]
4. **`requireRole()` reads JWT metadata, not live `public.users`** → up to 1-hour privilege-escalation window after admin demotes a user. Fix branch `fix/signout-global-and-requirerole-db-2026-04-22` exists but not merged. [01]
5. **`signOut()` uses local scope only** → on shared tablets, other tabs/users stay authenticated. Same unmerged branch as #4. [01]
6. **Zero tests for holiday accrual** — no 1.5× public-holiday pay, no alt-day accrual, no BAPS leave payout. **Wage audit will fail.** [06]

### 🟠 P1 — fix before pilot expansion

7. **CSP weakened** by `'unsafe-inline'` for scripts AND styles in `vercel.json` → negates XSS protection. [01]
8. **xmldom CVEs** (4 HIGH) transitive via Capacitor → plist → xmldom ≤0.8.12. `npm audit fix` resolves. [01]
9. **React Query cache not cleared on logout** (`AuthContext.tsx:269`) → PII leak on shared tablets. Fix branch `fix/logout-clear-caches-2026-04-22` exists but not merged. [04]
10. **Meal-break paid-flag hardcoded 0.5h** → not configurable per orchard. Fix branch `fix/meal-break-paid-flag-2026-04-22` exists but not merged. [02]
11. **4/5 GH workflows lack `permissions:` block** → default is full write. [05]
12. **Third-party actions not SHA-pinned** (`appleboy/ssh-action@v1`, `amondnet/vercel-action@v25`) → supply-chain exposure. [05]
13. **Prod smoke tests non-blocking** (`continue-on-error=true`) → broken deploys can ship. [05]
14. **`.env*` files committed with secrets** → should be GH Secrets. [05]
15. **`login_attempts` / `audit_logs` overly-permissive INSERT** (`WITH CHECK (true)`) → any authenticated user can forge audit rows. Restrict to trigger/`service_role`. [03]
16. **Modal focus trap incomplete** (`ModalOverlay.tsx`) → Tab-escape a11y/security issue. Use `focus-trap-react`. [04]
17. **RSE accommodation cap not enforced** — only stub references. If workers are billed accommodation, deductions-cap logic must exist. [02]
18. **No E2E test for logout cache invalidation, leave-request, invite/role-escalation** → legal-exposure flows untested. [06]
19. **No documented rollback** for Supabase migrations or Hetzner deploy. [05]
20. **`messages` table lacks `orchard_id` scoping** → cross-orchard messaging possible if users span orchards. [03]

### 🟡 P2 — post-release hygiene

- `baseRepository` soft-delete uses `is_active` instead of `deleted_at` (inconsistent with schema). [03]
- Main bundle 470 KB — role-specific code-splitting would reduce for pickers. [04]
- Large service files (439–454 LOC): split `sync.service.ts`, `compliance.service.ts`, `AuthContext.tsx`. [07]
- 15 unsafe casts (target <10). [07]
- Missing indexes on `pickers.status`, `conversations.type` (if perf testing shows scans). [03]
- Secret-scan regex only scans `src/`, not `supabase/functions/`. [05]
- Archive/clean duplicate migrations under `supabase/migrations/archive/`. [03]
- `allowed_registrations` HR policy tenant-agnostic — document or add scoping. [03]
- No React Hook Form — vanilla form state lacks instant validation feedback. [04]
- 985 LOC `mocks/data/index.ts` — reduce test-mock bulk. [07]

## Recurring meta-finding

**Three critical fix branches exist on the repo but are NOT merged to `improve/heartbeat-2026-04-22`:**

- `fix/kiwisaver-rate-2026-04-22`
- `fix/alt-holiday-cross-period-2026-04-22`
- `fix/signout-global-and-requirerole-db-2026-04-22`
- `fix/logout-clear-caches-2026-04-22`
- `fix/meal-break-paid-flag-2026-04-22`

Several P0 items collapse to "merge these branches, retest, release." Recommended next action: open a merge train in that order, gate with a ci workflow that requires all five checks green, then ship.

## Green signals (keep investing)

- ✅ RLS enabled on all 26 operational tables; tenant-scoping via `orchard_id` consistent (except `quality_inspections` and `messages`).
- ✅ Strong payroll precision tests (60+ cases) — piece-rate, min-wage top-up at $23.95, PAYE/ACC.
- ✅ Offline-first coverage (clock-in/out sync, IndexedDB queue, backoff, DLQ, reload resilience).
- ✅ Integration tests hit real Supabase, not mocked — consistent with memory-recorded policy.
- ✅ i18n covers 7 languages including Māori.
- ✅ Soft-delete respected via partial indexes `WHERE deleted_at IS NULL`.
- ✅ Account lockout after 5 failed attempts in 15 min; audit triggers on sensitive tables.
- ✅ Sentry + PostHog lazy-loaded; PII scrubbing in error replays; AES-256 on IndexedDB.
- ✅ Money as `DECIMAL(10,2)`, timestamps as `TIMESTAMPTZ`.
- ✅ Type-safe: strict mode, 0 lint errors, Zod at boundaries.

## Recommended release path

1. **Merge train** (order): kiwisaver-rate → alt-holiday → signout/requireRole → logout-cache → meal-break.
2. **Close P0 #3** (quality_inspections) and **P0 #6** (holiday accrual tests).
3. **npm audit fix** + tighten CSP (remove `'unsafe-inline'`).
4. **Harden CI**: add `permissions: read-all` to all workflows, SHA-pin third-party actions, remove `continue-on-error` from prod smoke.
5. **Rotate any secret found in committed `.env*`** and move to GH Secrets.
6. Re-run full audit on merged branch before tagging v10.0.
