# HarvestPro Audit — 2026-04 Round 2 (post-PR-#8-merge re-classification)

**Audit type:** Delta pass vs round 1 + re-classification after PR #8 merged to main.
**Generated:** 2026-04-21 (re-classified 2026-04-21 post-merge)
**Branch:** `audit/harvestpro-2026-04-round2`
**Main HEAD at re-classification:** `ec59f70 feat(hr): HR Documents upload/storage + Holidays Act s.60 payroll (#8)`

---

## Classification table (13 findings)

| ID | Severity | Category | Notes |
|---|---|---|---|
| HP-INFRA-03 | MEDIUM | 🟢 **OBSOLETO** | Fixed by `48b1822` (PR #11 regex) + `f3d41bd` (analytics flake cherry-pick, squashed into `ec59f70`). CI green on main. |
| HP-R2-01 | MEDIUM | 🟡 **PARCIAL** | #7 auto-CLOSED on #8 merge (shared branch). #8 MERGED. #6 `[DO NOT MERGE]` still open. Overlap 2/3 resolved; #6 remains in limbo. |
| HP-SEC-01 | CRITICAL | 🔴 **VIGENTE** | DB re-queried post-merge: still **15 open `USING(true) WITH CHECK(true)` ALL policies**. Merge did not include the 14-policy RLS migration (it was in the dropped PR #6). |
| HP-SEC-02 | CRITICAL | 🔴 **VIGENTE** | `curl /auth/v1/settings` → `mfa_totp_enroll_enabled: None`. Server-side env still not patched. |
| HP-SEC-03 | HIGH | 🔴 **VIGENTE** | `chats.Enable all for authenticated users` still in the 15-open list. PR #10 still OPEN, not merged, not applied. |
| HP-ARCH-02 | HIGH | 🔴 **VIGENTE** | DB re-queried: 44 active users NULL orchard_id (26 runners, 10 team_leaders, 8 managers). Unchanged. |
| HP-DATA-01 | HIGH | 🔴 **VIGENTE** | DB re-queried: 32,644 duplicate excess rows in `bucket_records`. Unchanged. |
| HP-INFRA-01 | MEDIUM | 🔴 **VIGENTE** (demoted) | wger container still `Exited (137)` 3+ days ago. Dormant risk, not active exploit. |
| HP-ARCH-01 | MEDIUM | 🔴 **VIGENTE** | Orphan `users.id='00000000-0000-0000-0000-000000000000'` still in DB. No deletion authorized. |
| HP-QUAL-01 | MEDIUM | 🔴 **VIGENTE** | Live worktree still has `M vitest.config.ts` + `?? .circuit-locked`. Human WIP preserved (per merge rule). |
| HP-COMP-01 | INFO | 🔴 **VIGENTE** (demoted) | Already corrected in original round 2: code at `src/config/nz-tax-rates.ts:121` has 23.95. No legal risk. |
| HP-R2-02 | LOW | 🔴 **VIGENTE** | PR #10 test at `src/integration/chats-rls-hp-sec-03.integration.test.ts` still uses non-existent `exec_sql` RPC. PR #10 open. |
| HP-R2-03 | INFO | 🔴 **VIGENTE** | `chats` insert policy behavior documented. Still applies. |
| **HP-R2-04** | **HIGH** | ⚪ **NUEVO** | `hr_documents` RLS **no scoping by orchard_id** — multi-tenant break. See below. |
| **HP-R2-05** | MEDIUM | ⚪ **NUEVO** | `hr_documents_self_read` effectively unreachable for pickers (no `auth.users` linkage). See below. |
| **HP-R2-06** | HIGH | ⚪ **NUEVO** | Storage policy `hr_docs_hr_manage` on `storage.objects` has same orchard-scope gap as HP-R2-04. |

**Count:** 1 OBSOLETO · 1 PARCIAL · 11 VIGENTES · 3 NUEVOS

---

## 🔴 VIGENTES — filtered actionable list (ordered by severity)

### HP-SEC-01 — 15 RLS `USING(true) WITH CHECK(true)` [CRITICAL]
**Code/DB evidence (post-merge):**
```
docker exec supabase-db psql -U postgres -c "SELECT tablename||'.'||policyname FROM pg_policies WHERE schemaname='public' AND cmd='ALL' AND (qual IS NULL OR qual='true') AND (with_check IS NULL OR with_check='true') ORDER BY 1;"
```
15 rows: alerts, block_rows, break_logs, broadcasts, bucket_runners, **chats**, harvest_seasons, harvest_settings, orchard_blocks, performance_metrics, row_assignments, session_signatures, sync_queue, teams, tractor_fleet.
**Severity unchanged.** The RLS migration was in the orphaned PR #6.

### HP-SEC-02 — MFA TOTP disabled server-side [CRITICAL]
**Evidence:** `curl http://127.0.0.1:8000/auth/v1/settings | jq .mfa_totp_enroll_enabled` → `null`.
**Severity unchanged.** Server env patch documented at `docs/MFA_ENABLE_FIX_2026_04_19.md` (this file merged into main via PR #8), but not yet applied.

### HP-R2-04 — `hr_documents` RLS has no orchard scoping [HIGH] ⚪ NUEVO
**Evidence (file `supabase/migrations/20260418000000_hr_documents.sql:36-37`, now on main):**
```sql
CREATE POLICY hr_documents_hr_manage ON public.hr_documents
  USING (EXISTS (SELECT 1 FROM public.users u
                 WHERE u.id = auth.uid()
                   AND u.role IN ('hr_admin','admin','manager')));
```
No filter on `orchard_id`. An `hr_admin` or `manager` from Orchard A can SELECT/INSERT/UPDATE/DELETE `hr_documents` of Orchard B (contracts, visas, passports, driver licenses, health certs).
**Current data at risk:** 0 rows (table just created). Surface exists; risk is live the moment the first HR upload happens.
**Severity:** HIGH. Tenant isolation break for the most sensitive PII in the app.

### HP-R2-06 — Storage policy same gap [HIGH] ⚪ NUEVO
**Evidence (file `supabase/migrations/20260418000000_hr_documents.sql:49-51`):**
```sql
CREATE POLICY "hr_docs_hr_manage" ON storage.objects
  USING (bucket_id = 'hr-documents' AND EXISTS (SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role IN ('hr_admin','admin','manager')));
```
Same missing `orchard_id` scope. Any cross-tenant `hr_admin` can download any document blob from the private bucket.
**Severity:** HIGH. Paired with HP-R2-04 — both the metadata row and the file bytes are equally leaky.

### HP-SEC-03 — `chats` open policy [HIGH]
**Evidence:** still in the 15-row dump above.
**Severity unchanged.** PR #10 ready to apply; 0 rows in `chats`, 0 code refs.

### HP-ARCH-02 — 44 active users NULL orchard_id [HIGH]
**Evidence:** `SELECT role, COUNT(*) FROM users WHERE orchard_id IS NULL AND is_active=true GROUP BY role;`
```
runner       | 26
team_leader  | 10
manager      |  8
```
**Severity unchanged.** If HP-SEC-01 is fixed, these users break.

### HP-DATA-01 — 32,644 duplicate rows in `bucket_records` [HIGH]
**Evidence:** DB query, 30,465 groups, 32,644 excess. Unchanged.
**Severity unchanged.** Analysis + migration plan in `/tmp/dedup-analysis/`.

### HP-R2-05 — `hr_documents_self_read` unreachable for pickers [MEDIUM] ⚪ NUEVO
**Evidence (file `supabase/migrations/20260418000000_hr_documents.sql:40-41`):**
```sql
CREATE POLICY hr_documents_self_read ON public.hr_documents FOR SELECT
  USING (user_id = auth.uid());
```
Schema at line 9-10: `picker_id UUID REFERENCES pickers(id)` and `user_id UUID REFERENCES auth.users(id)`. Most HR documents for pickers will be stored with `picker_id` set and `user_id` NULL (pickers don't usually have `auth.users` entries — they're scanned by team leaders). Effect: picker-owned documents cannot be self-read by the owning picker — only HR/admin/manager. Might be intentional but it's worth confirming.
**Severity:** MEDIUM. Ambiguous intent; see QUESTIONS FOR HUMAN.

### HP-INFRA-01 — wger OOM (dormant) [MEDIUM]
**Evidence:** `docker ps -a | grep wger` → `Exited (137) 3 days ago`.
**Severity:** MEDIUM (demoted from HIGH in round 1 because container is stopped).

### HP-ARCH-01 — Orphan all-zeros user [MEDIUM]
**Evidence:** `SELECT id FROM users WHERE id='00000000-0000-0000-0000-000000000000'` returns 1 row. No `auth.users` entry. Still there.
**Severity unchanged.**

### HP-QUAL-01 — Uncommitted worktree change [MEDIUM]
**Evidence:** `git status` in live worktree still shows `M vitest.config.ts`.
**Severity unchanged.** Preserved through merge per user instruction.

### HP-R2-02 — PR #10 test uses non-existent RPC [LOW]
**Evidence:** `src/integration/chats-rls-hp-sec-03.integration.test.ts:20` uses `svc.rpc('exec_sql', ...)`. No `exec_sql` function in DB.
**Severity unchanged.**

### HP-COMP-01 — Historical rate references in docstrings [INFO]
**Severity unchanged.** Cosmetic only.

### HP-R2-03 — `chats` insert policy behavior [INFO]
**Severity unchanged.**

---

## 🟡 PARCIAL — HP-R2-01 (PR overlap) recalculated

**Before merge:** PR #6 (full RLS) + PR #7 (extracted safe items) + PR #8 (HR+s.60) all shared scope or branch.

**After merge:**
| PR | Status now | Resolution |
|---|---|---|
| #7 | **CLOSED** 2026-04-21T00:44:15Z | Auto-closed when sibling PR #8 merged (same head branch). |
| #8 | **MERGED** as `ec59f70` | Clean merge, CI green. |
| #6 | **OPEN** `[DO NOT MERGE]` | Unchanged. Still holds the full RLS migration. |

**Residue:** #6 is the only PR with the full 14-policy RLS migration. Its branch `fix/critical-audit-2026-04-19` is orphaned (`fix/critical-audit-2026-04-19-safe` was deleted, but this is a different branch — this one is intact). The migration needs to move into a mergeable PR.

**Severity downgraded:** MEDIUM → LOW. 2/3 of the overlap resolved by the merge; only #6 decision remains.

---

## 🟢 OBSOLETO — HP-INFRA-03

**Evidence of fix:**
- `main` commit `48b1822 [LAB] HP-INFRA-03: fix secret-scan regex false-positive in CI (#11)` — the core regex tightening.
- PR #8 included cherry-pick `f3d41bd test(analytics-trends): fix date-drift flake` (squashed into `ec59f70`), which fixed the follow-on test failure the regex fix exposed.
- CI on main now runs clean (11 SUCCESS, 2 SKIPPED, 0 FAILURE at merge time).

---

## Post-merge priority ranking

| Rank | Finding | Severity | Why now |
|---|---|---|---|
| 1 | HP-R2-04 + HP-R2-06 | HIGH×2 | **Regression from the merge itself.** `hr_documents` is brand-new and already multi-tenant leaky. Fix before first real upload. |
| 2 | HP-SEC-01 | CRITICAL | 15 open policies, same tables that handle payroll + sync + session sigs. |
| 3 | HP-SEC-02 | CRITICAL | MFA promised in UI, not real in server. |
| 4 | HP-SEC-03 | HIGH | `chats` is one of the 15 — may be rolled into HP-SEC-01 fix. |
| 5 | HP-ARCH-02 | HIGH | 44 NULL-orchard users will break post HP-SEC-01. Cleanup first. |
| 6 | HP-DATA-01 | HIGH | 32k dups block unique constraint. |
| 7 | HP-R2-05 | MEDIUM | Ambiguous; gate on your decision. |
| 8 | HP-ARCH-01 | MEDIUM | Single orphan row. |
| 9 | HP-R2-01 residue | LOW | #6 PR hygiene. |
| 10 | HP-INFRA-01, HP-QUAL-01, HP-R2-02, COMP-01, R2-03 | MEDIUM/LOW/INFO | Opportunistic. |

---

## Proposed next PRs (NOT created — proposal only)

### Proposal A — `lab/hp-r2-04-hr-documents-orchard-scope` (HIGH, blocker on sensitive data)
Rewrite both `hr_documents_hr_manage` and storage `hr_docs_hr_manage` to include `orchard_id = get_my_orchard_id()`. Single migration file. Integration test: seed two orchards, assert HR of A cannot read HR of B. Effort: 45 min.

### Proposal B — `lab/hp-sec-01-rls-consolidated` (CRITICAL, 14 tables + chats)
Take the RLS migration from PR #6, refresh it to include the new `chats` policy fix (PR #10 scope) and fix the `hr_documents` overlap. One canonical mergeable migration. Effort: 2h (mostly review against per-table existing helpers).

### Proposal C — `lab/hp-arch-02-null-orchard-cleanup` (HIGH)
Read-only audit script: for each of the 44 NULL-orchard users, list last login, last activity, and recommended action (assign orchard, deactivate, archive). Output as migration comments; human executes. Effort: 30 min.

### Proposal D — `lab/hp-sec-02-mfa-apply` (CRITICAL)
Not a code PR — an apply-runbook PR. Adds a one-page `OPS_APPLY_MFA.md` with the exact sequence, a go/no-go checklist, and a rollback. Effort: 20 min.

### Proposal E — `lab/hp-data-01-bucket-dedup` (HIGH)
Refresh `/tmp/dedup-analysis/migration-plan.sql` into a proper lab branch migration with dry-run + COMMIT gate. Effort: 30 min.

### Proposal F — `lab/hp-r2-01-rls-migration-canonical` (LOW)
Replace PR #6's RLS migration with a fresh branch; close #6. Subsumed by proposal B if approved. Effort: 15 min (just branch hygiene).

---

## QUESTIONS FOR HUMAN

1. **HP-R2-05 — pickers reading own documents:** was it intentional that pickers cannot self-read their uploaded HR docs (because they lack `auth.users` linkage)? Or was the expectation that all document access goes through HR staff only?
2. **Proposal B vs A:** is the preference to fix `hr_documents` alone first (small, urgent) or bundle it with the 14-policy RLS consolidation (larger, riskier merge)?
3. **PR #6 disposition:** keep as reference, or close and replace via Proposal F?
4. **HP-R2-02 `exec_sql` RPC:** does the self-hosted Supabase have a plan to expose a generic SQL RPC, or should I rewrite the test to not depend on it?
5. **HP-COMP-01:** do you want me to clean up the 2024-25 / 2025-26 historical rate references in docstrings (cosmetic), or leave them as legal-history breadcrumbs?

---

## Round 1 PR/artifact inventory (post-merge)

| Artifact | Status |
|---|---|
| PR #6 (RLS full, `[DO NOT MERGE]`) | OPEN, orphaned |
| PR #7 (safe subset) | **CLOSED** on #8 merge |
| PR #8 (HR+s.60) | **MERGED** (`ec59f70`) |
| PR #9 (round 1 audit) | OPEN, unreviewed |
| PR #10 (chats RLS lab) | OPEN, unmerged |
| PR #11 (CI regex) | **MERGED** (`48b1822`) |
| PR #12 (this round 2 audit) | OPEN, being updated now |
| PR #13 (analytics flake fix → staging) | OPEN, flake fix now on main via #8 squash — **candidate for close-as-obsolete** |
| `/root/AUDIT-ultra-2026-04.md` | unchanged |
| `/root/AUDIT-ultra-2026-04-round2.md` | unchanged |
| ultra-system PR #1 | OPEN, unapplied |

---

*No data modified. No secrets rotated. No rebases. Live worktree WIP untouched.*
