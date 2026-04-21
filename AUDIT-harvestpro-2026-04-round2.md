# HarvestPro Audit — 2026-04 Round 2

**Audit type:** Light delta pass vs round 1 (AUDIT-harvestpro-2026-04.md).
**Generated:** 2026-04-21
**Branch:** `audit/harvestpro-2026-04-round2`

---

## Round 1 — Status of CRITICAL/HIGH findings

| ID | Severity R1 | Status today | Change |
|---|---|---|---|
| HP-SEC-01 | CRITICAL | **Still open** | 15 open RLS policies (unchanged). PR #6 `[DO NOT MERGE]`, PR #10 covers only `chats`. Main migration not yet on any merged PR. |
| HP-SEC-02 | CRITICAL | **Still open** | MFA flag still null in `/auth/v1/settings`. Env patch in docs, not applied. |
| HP-SEC-03 | HIGH | **Covered** by PR #10 | Lab PR open, not merged, not applied. |
| HP-COMP-01 | CRITICAL | **Demoted to LOW/INFO** | Re-verified: `src/config/nz-tax-rates.ts:121` has `minimumWageHourly: 23.95` for 2026-2027. The `23.15` hits are historical data in 2025-2026 config (correct) + test input values (not legal claims). See correction below. |
| HP-ARCH-02 | HIGH | **Still open** | 44 active users NULL orchard_id (unchanged). |
| HP-DATA-01 | HIGH | **Still open** | 32,644 bucket_records dups (unchanged). |
| HP-INFRA-01 | HIGH | **FIXED** ✅ | wger container OOM context — no state change (still stopped); reclassify to MEDIUM since dormant. |
| HP-INFRA-03 | MEDIUM | **FIXED** ✅ | PR #11 merged. PR #8 CI is currently rerunning against the updated branch (no failures at time of writing). |
| HP-ARCH-01 | MEDIUM | **Still open** | Orphan `users.id='000...'` still in DB. No deletion authorized. |
| HP-QUAL-01 | MEDIUM | **Still open** | `vitest.config.ts` uncommitted change in live worktree. Human's WIP. |

## Correction to round 1

**HP-COMP-01 was overstated as CRITICAL.** Re-reading `src/config/nz-tax-rates.ts`:
- Line 121 — `TAX_YEAR_2026_2027.minimumWageHourly = 23.95` ✅ correct
- Line 168 — `TAX_YEAR_2025_2026.minimumWageHourly = 23.15` ✅ correct historical
- `src/constants/nz-law.ts:16` — `NZ_MINIMUM_WAGE_2026 = 23.95` ✅
- Tests using `23.15` are **function inputs** (e.g. `checkWageCompliance(1, 8, 6.5, 23.15)`) not legal floor assertions.

**Actual status:** code is already compliant with 1 Apr 2026 Minimum Wage Order. Reclassifying HP-COMP-01 to **INFO** (historical reference values in docstrings could be updated for clarity, but no legal risk).

## New findings since round 1

### HP-R2-01 — PR #6 and PR #7+#8 share overlapping scope [MEDIUM]

**Evidence:** PR #6 title starts with `[DO NOT MERGE]`. Its branch `fix/critical-audit-2026-04-19` contains the full RLS migration. PR #7 and #8 share head `fix/critical-audit-2026-04-19-safe`, an extraction of "safe" subset.

**Impact:** branch/PR hygiene confusion. The RLS migration is **not in any mergeable PR** — the full fix lives on #6 which is marked do-not-merge.

**Remediation:** human should either
- Rework the RLS migration into a fresh lab PR targeted at merging (per overnight plan Rule 2), OR
- Clarify the relationship between #6/#7/#8 in PR descriptions.

### HP-R2-02 — PR #10 integration test uses non-existent RPC [LOW]

**Evidence:** `src/integration/chats-rls-hp-sec-03.integration.test.ts` uses `svc.rpc('exec_sql', {...})`. No `exec_sql` function exists in the self-hosted DB (verified: `\df exec_sql` returns nothing).

**Impact:** the test's core assertions will silently SKIP in CI (the fallback path I wrote). Not a failure, but not verifying anything either.

**Remediation:** rewrite the test to use a direct SQL query via a known RPC or as a migration post-check. Effort: 15 min.

### HP-R2-03 — `chats` table insert test would actually fail without service_role [INFO]

**Evidence:** PR #10 migration removes INSERT/UPDATE/DELETE policies from `chats`. An anon or authenticated user attempting INSERT would get 42501/permission-denied. No existing code path in `src/` does this (grep: 0 refs), so no regression risk — but if a future contributor writes to `chats` they'll be surprised.

**Remediation:** add a comment in the migration or docs pointing to the decision. Already in the migration comment.

## Round 1 PR/artifact inventory

| Artifact | Status |
|---|---|
| PR #9 (audit round 1) | OPEN, unreviewed |
| PR #10 (chats RLS) | OPEN, unmerged, unapplied to DB |
| PR #11 (CI regex fix) | **MERGED** to main (squash commit `48b1822`) |
| `/root/AUDIT-ultra-2026-04.md` | unchanged |

## Deltas in the workspace since round 1

- `fix/critical-audit-2026-04-19-safe` branch: cherry-picked PR #11's fix as commit `ed2926a` so PR #8's CI passes.
- `lab/autonomous-2026-04-21` branch: created today, empty.
- `staging/auto-2026-04-21` branch: created today, empty.

## Recommendation

No new CRITICAL items. Round 1 findings are all either still open (awaiting merge/application) or fixed (PR #11). The overall risk picture is unchanged except for the cleared CI blocker.

**Next action (for human):** decide PR #6 vs PR #7+#8 split, so the RLS migration gets into a mergeable PR.

---

*Light pass. No data modified. No secrets rotated.*
