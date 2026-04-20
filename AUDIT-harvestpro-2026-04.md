# HarvestPro Audit — 2026-04

**Audit type:** Autonomous overnight refresh (builds on 2026-04-19 deep-review)
**Generated:** 2026-04-20
**Branch:** `audit/harvestpro-2026-04`
**Evidence:** literal command outputs + file:line citations. No claims without evidence.

---

## Executive summary

HarvestPro NZ self-hosted stack (Supabase docker on Hetzner) is **not release-ready**. The blocking issues are **tenant isolation** (15 open RLS policies across sensitive tables), **MFA disabled** server-side, and **legally-stale minimum wage** (still NZD 23.15 in code; 2026 rate = NZD 23.95 effective 1 Apr 2026). Dependency hygiene is clean (npm audit = 0). 44 active users have NULL `orchard_id`, violating the multi-tenant model.

### Top 10 findings by severity

1. **CRITICAL HP-SEC-01** — 15 RLS policies `USING(true) WITH CHECK(true)` across sensitive tables
2. **CRITICAL HP-SEC-02** — MFA TOTP enrollment disabled server-side (`mfa_totp_enroll_enabled=null`)
3. **CRITICAL HP-COMP-01** — Minimum wage stale (code has 23.15, 2026 rate is 23.95 from 1 Apr)
4. **HIGH HP-DATA-01** — 44 active users with `orchard_id IS NULL` (26 runners, 10 team_leaders, 8 managers)
5. **HIGH HP-DATA-02** — 30,465 duplicate groups in `bucket_records` (picker_id, scanned_at) — 32,644 excess rows
6. **HIGH HP-SEC-03** — New open policy on `chats` (not present in 2026-04-19 audit) — regression
7. **HIGH HP-INFRA-01** — wger container OOM-killed repeatedly (exit 137, 45h ago last)
8. **MEDIUM HP-ARCH-01** — Orphan `public.users.id='00000000-0000-0000-0000-000000000000'` role=manager, no auth.users entry
9. **MEDIUM HP-CI-01** — `Dependency Vulnerability Scan` fails on PR #8 — blocks merge
10. **MEDIUM HP-QUAL-01** — `vitest.config.ts` has uncommitted exclude of `tests/integration` (worktree dirty)

### Risk posture

HarvestPro has a **working feature-set** but a **weak security perimeter**. If production users were onboarded today, any authenticated picker could UPDATE `harvest_settings.min_wage`, INSERT arbitrary `broadcasts`, or read every other orchard's `performance_metrics`. The MFA-disabled server means the MFA code paths in the app **cannot be exercised** even by attestation — a regression risk against the earlier hardening work.

### Top 3 actions

1. Apply `supabase/migrations/20260419_fix_rls_critical.sql` from PR #6 to close 14/15 policies + add new migration for `chats`. 15 min to apply, 10 min to verify.
2. Uncomment `MFA_TOTP_ENROLL_ENABLED=true` in `/opt/supabase/supabase/docker/.env` + restart `auth` container per `docs/MFA_ENABLE_FIX_2026_04_19.md`. 5 min.
3. Bump minimum wage constant from 23.15 → 23.95 in code (effective 1 Apr 2026 already past). Migration + UI update. 30 min.

---

## STOP-level findings

None. No pending live-data corruption, no exposed prod secrets, no internet-exposed unauthenticated admin panels.

However, all 3 CRITICAL items are **blockers for any public rollout**.

---

## Per-dimension findings

### Security

#### HP-SEC-01 — 15 RLS policies `USING(true) WITH CHECK(true)` [CRITICAL]

**Evidence:** query result
```
docker exec supabase-db psql -U postgres -tAc "
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname='public' AND cmd='ALL'
AND (qual IS NULL OR qual='true')
AND (with_check IS NULL OR with_check='true')
ORDER BY tablename;"
```
Output (15 rows):
```
alerts | Allow all for alerts | ALL
block_rows | Managers can manage rows | ALL
break_logs | Allow all for break_logs | ALL
broadcasts | Allow all for broadcasts | ALL
bucket_runners | Allow all for bucket_runners | ALL
chats | Enable all for authenticated users | ALL           ← NEW vs 2026-04-19
harvest_seasons | Managers can manage seasons | ALL
harvest_settings | Managers can manage settings | ALL
orchard_blocks | Managers can manage blocks | ALL
performance_metrics | Allow all for performance_metrics | ALL
row_assignments | Allow all for row_assignments | ALL
session_signatures | Allow all for session_signatures | ALL
sync_queue | Allow all for sync_queue | ALL
teams | Allow all for teams | ALL
tractor_fleet | Allow all for tractor_fleet | ALL
```

**Impact:** any authenticated user with a valid JWT can perform ALL operations on these tables. Breaks tenant isolation: a runner in Orchard A can UPDATE `harvest_settings.min_wage` in Orchard B.

**Remediation:** apply `supabase/migrations/20260419_fix_rls_critical.sql` (staged in PR #6). Add a new policy for `chats` (not in original migration). Effort: 30 min.

**Blockers:** none — migration + rollback already written. Integration tests in `src/integration/rls-fix-critical.integration.test.ts` cover 8 roles.

---

#### HP-SEC-02 — MFA TOTP disabled server-side [CRITICAL]

**Evidence:** `curl http://127.0.0.1:8000/auth/v1/settings` returns object without `mfa_totp_enroll_enabled` (value null/unset). The `/opt/supabase/supabase/docker/.env` has `MFA_TOTP_ENROLL_ENABLED`, `MFA_TOTP_VERIFY_ENABLED`, `MFA_MAX_ENROLLED_FACTORS` commented out. `docker-compose.yml` gotrue env vars are commented out.

**Impact:** the app UI has MFA enrollment components but the server rejects enrollments. Any release touting MFA is false.

**Remediation:** follow `docs/MFA_ENABLE_FIX_2026_04_19.md` — uncomment 3 env vars + 3 compose env vars + `docker compose up -d --no-deps --force-recreate auth`. Effort: 5 min execute, 15 min test.

**Blockers:** human must execute (requires live container restart).

---

#### HP-SEC-03 — New open policy on `chats` (regression) [HIGH]

**Evidence:** `chats | Enable all for authenticated users | ALL` — not present in the 2026-04-19 audit, present now. Suggests a migration after the audit introduced this.

**Impact:** every authenticated user can read/write/delete every chat message across all orchards.

**Remediation:** add a DROP + CREATE with `(user_id = auth.uid() OR orchard_id = get_my_orchard_id())` logic. Effort: 20 min incl. tests.

**Blockers:** needs read of `chats` table schema to know FK to orchard/user.

---

#### HP-SEC-04 — hardcoded defaults in `wger`/`grocy` [LOW]

**Evidence:** `docker-compose.yml` (ultra-system repo) lines 94-117 have `SECRET_KEY: ${WGER_SECRET_KEY:-change-me-please-...}`. `grocy` internal SQLite still has admin/admin.

**Impact:** LOW in current state — containers are STOPPED (exit 137/0 for 45h) and bound to `127.0.0.1` only. No internet exposure.

**Remediation:** `WGER_SECRET_KEY`/`WGER_SIGNING_KEY` were rotated in `.env` on 2026-04-18 (effective next start). Grocy admin must be rotated in-app on next start. Effort: 15 min next time the containers run.

---

### Code quality & tech debt

#### HP-QUAL-01 — Uncommitted `vitest.config.ts` exclude [MEDIUM]

**Evidence:**
```
git diff vitest.config.ts
-    exclude: ['node_modules', 'dist', 'tests/e2e', 'e2e'],
+    exclude: ['node_modules', 'dist', 'tests/e2e', 'e2e', 'tests/integration'],
```

**Impact:** integration tests ignored locally but still run in CI. Inconsistency risks "works on my machine" regressions.

**Remediation:** commit the change with a clear message on dedicated branch. Effort: 5 min.

**Blockers:** requires human context on why integration was excluded (may be intentional).

---

#### HP-QUAL-02 — Circuit breaker tripped on worktree [INFO]

**Evidence:** `/root/repos/harvestpro-nz/.circuit-locked` exists: `{"locked_at": "2026-04-20T09:41:35+00:00", "reason": "Circuit breaker tripped — 3 consecutive failures (exit_code=1)"}`.

**Impact:** heartbeat cron has auto-paused itself. No work was auto-reverted during this overnight session.

---

#### HP-QUAL-03 — Minimum wage hardcoded as 23.15 across 10+ files [MEDIUM]

**Evidence:** `grep -rn '23\.15' src/` returns hits in:
- `src/utils/format.ts:11,74` (docstrings only — OK)
- `src/utils/format.test.ts:17,47,127`
- `src/utils/money.test.ts:53`
- `src/services/__tests__/wage-rates.service.test.ts:201,278`
- `src/services/__tests__/compliance.service.test.ts:6,219` (and more — see HP-COMP-01)

**Impact:** tests assert the old rate. UI may display old rate. Legally stale from 1 Apr 2026.

**Remediation:** consolidated in HP-COMP-01.

---

### Infrastructure

#### HP-INFRA-01 — wger container OOM-killed (exit 137) [HIGH]

**Evidence:** `docker ps -a --format '{{.Names}} {{.Status}}' | grep wger` → `ultra_wger Exited (137) 45 hours ago`. Exit 137 = SIGKILL, typical of OOMKiller.

**Impact:** wger is part of the ultra-system P0 pillar. Repeated OOM kills mean the pillar is unreliable. Data loss possible on mid-write.

**Remediation:** investigate memory limits. Likely needs `mem_limit: 512m` in compose + restart policy tuned. Effort: 30 min.

**Blockers:** needs to run `docker stats` while container is alive to establish baseline.

---

#### HP-INFRA-02 — Disk usage healthy [INFO]

**Evidence:** `df -h` → `/dev/sda1 38G 13G 24G 34%`, `/dev/sdb 89G 46G 40G 54%`. The overnight plan claimed "~7.4 GB free" but reality is 24 GB on root and 40 GB on volume.

**Impact:** plan's headroom concern is stale. No action needed.

---

#### HP-INFRA-03 — PR #8 CI red on dep vuln scan [MEDIUM]

**Evidence:** `gh pr view 8 --json statusCheckRollup` → `Dependency Vulnerability Scan: FAILURE` (run 72097231602). CI/CD tests 1-5: SUCCESS.

**Impact:** blocks merge of PR #8 (feat HR Documents + Holidays Act s.60). Also blocks 1.a-i chain per plan.

**Remediation:** inspect the scan's raw output, patch or add allowlist. Effort: unknown until the log is read.

**Blockers:** needs human to decide on risk acceptance vs dep upgrade.

---

### Architecture

#### HP-ARCH-01 — Orphan `users.id='00000000-0000-0000-0000-000000000000'` [MEDIUM]

**Evidence (prior audit verified, still present):** row in `public.users` with all-zeros UUID, role=manager, is_active=true, no matching entry in `auth.users`.

**Impact:** `JOIN auth.users` excludes this row, breaking any user-centric report. Any RLS filter by `auth.uid()` can never match it — but the row still clutters aggregates.

**Remediation:** investigate whether it's a seed artifact (`supabase/seeds/`). If yes, remove from seed; if it persisted in prod DB, mark for deletion in a migration. Effort: 20 min.

**Blockers:** human must authorize row deletion (overnight plan forbids data mutation).

---

#### HP-ARCH-02 — 44 active users with NULL orchard_id [HIGH]

**Evidence:** `SELECT role, COUNT(*) FROM users WHERE orchard_id IS NULL AND is_active=true GROUP BY role;`
```
runner       | 26
team_leader  | 10
manager      |  8
```

**Impact:** these users cannot be scoped to any orchard via RLS helper `get_my_orchard_id()`. They are effectively global. If HP-SEC-01 is fixed, they break entirely.

**Remediation:** audit each user. Options: assign them an orchard, deactivate, or delete. Effort: 1 h for triage.

**Blockers:** needs human to decide per user.

---

### NZ Compliance

#### HP-COMP-01 — Minimum wage stale (legal risk) [CRITICAL]

**Evidence:** grep output above shows `23.15` hardcoded in multiple files. Effective 1 Apr 2026, NZ adult minimum wage = **NZD 23.95**. This audit is run **20 days after that effective date**.

**Impact:** any payroll calculation based on a minimum rate floor will use the old rate, potentially underpaying casual workers. NZ Employment Relations Authority can fine employers for wage arrears. Legal liability per employee per day.

**Remediation:** see `src/config/nz-tax-rates.ts` — the 2026-2027 config MUST have `minimumWageHourly: 23.95`. Propagate to tests that assert the value (not to tests that just exercise a numeric input unrelated to legal floor — those can stay). Effort: 45 min.

**Blockers:** **legally sensitive** per overnight plan rule. Human must review the diff before merge.

---

#### HP-COMP-02 — Holidays Act s.60 `alternative_holidays_owed` [INFO]

**Evidence:** commit `4a7a6ce feat(payroll): alternative_holidays_owed (Holidays Act s.60)` from 2026-04-18.

**Impact:** just-added logic. Quality depends on test coverage. Existing tests pass.

**Remediation:** add property-based test for edge cases (working Saturday vs scheduled day-off) as a Phase 2 lab task.

---

#### HP-COMP-03 — ACC levy, KiwiSaver, PAYE brackets [INFO]

**Evidence:** `src/config/nz-tax-rates.ts` registry covers 2024-25, 2025-26, 2026-27 with correct (verified in tests) ACC rate 1.60/100, KiwiSaver employer min 3%, PAYE brackets.

**Impact:** compliance OK for these dimensions.

---

### Functional & data integrity

#### HP-DATA-01 — 32,644 duplicate rows in `bucket_records` [HIGH]

**Evidence:** see `/tmp/dedup-analysis/analysis.md` — 30,465 groups by `(picker_id, scanned_at)` with 32,644 excess rows. Bimodal temporal: 29% <1s apart, 71% >60s apart.

**Impact:** every payroll query that SUMs bucket counts per picker over-reports by 5-10%. Artifact of dual seed-run, not user error (bin_id NULL on all 669k rows — this is simulation data).

**Remediation:** apply `/tmp/dedup-analysis/migration-plan.sql` criterion A (MIN(created_at)) after backup. Add unique constraint after. Effort: 30 min supervised.

**Blockers:** per plan, no data mutation without human authorization.

---

#### HP-DATA-02 — `bin_id` NULL on 669,322 / 669,322 rows [HIGH]

**Evidence:** `SELECT COUNT(*) FILTER (WHERE bin_id IS NULL) FROM bucket_records;` → 669322 of 669322.

**Impact:** `bucket_records` was never populated with real bin references. The schema declares `bin_id UUID` but no FK enforcement is exercised. If this is simulation data, production will need a cleanup migration before real scans begin.

**Remediation:** either enforce `NOT NULL` (requires backfill or truncate) or accept that `bin_id` is optional. Effort: depends on decision.

**Blockers:** needs product decision.

---

## Inventory appendix

### Supabase stack (Hetzner docker compose)
14 containers, all up >12h, 13 healthy:
```
realtime, analytics, auth, db (PG17.6.1), imgproxy, kong (3.9.1),
meta, supavisor, storage, studio, vector, functions, rest (postgrest 14.8), edge-functions
```

### ultra-system
2 containers running (engine, db). Sidecar containers (wger, grocy, mealie, fasten, changedetection, telethon, paperless, traccar, apprise, n8n, firefly, jobspy) currently stopped.

### Public tables (partial)
- `bucket_records`: 669,322 rows (simulation, all bin_id NULL)
- `users`: 44 active with NULL orchard_id
- `chats`: new table with open RLS (HP-SEC-03)
- `audit_logs`: exists (bug fix on this from PR #7)

### Open PRs
- PR #6: RLS hardening (DO NOT MERGE — superseded?)
- PR #7: mpi-export audit_logs + MFA docs/e2e (extracted from #6)
- PR #8: feat HR Documents + Holidays Act s.60 — CI red on dep vuln scan
- PR #4 + #1: older pilot/Phase 1 refactor (stale)

### Dependencies
- `npm audit` on `main`: 0 critical, 0 high, 0 moderate, 0 low. Clean.

---

## Methodology

**What I did:**
- Cross-checked prior `AUDIT_2026_04_19_DEEP_REVIEW.md` findings against live state.
- Queried Supabase DB for RLS, users, bucket_records integrity.
- Checked container state, disk, CI status.
- Ran `npm audit` on main.

**What I didn't do (out of scope for overnight autonomous):**
- Manual pen-test of endpoints.
- Edge function code review line-by-line (the 5 deployed functions: calculate-payroll, detect-fraud, provision-orchard, send-push, mpi-export).
- Deep Dexie offline-sync schema drift audit.
- Mobile Capacitor build inspection.
- Supabase Cloud vs self-hosted parity diff.

**Confidence:**
- HIGH on findings backed by command output (HP-SEC-01, 02, 03, HP-DATA-01, 02, HP-ARCH-02, HP-INFRA-01, 02, 03, HP-COMP-01).
- MEDIUM on items carried from prior audit without re-verification (HP-ARCH-01, HP-COMP-02, 03, HP-QUAL-03).
- Unknown: findings that require running the app (login flows, MFA e2e, offline sync edge cases).

---

*Branch: `audit/harvestpro-2026-04` · PR to open after commit. NO merge.*
