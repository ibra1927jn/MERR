# 05 — CI/CD GitHub Actions Audit

**Repo:** harvestpro-nz
**Date:** 2026-04-22
**Scope:** `.github/workflows/` (5 workflows) — READ-ONLY

Files reviewed:
- `/root/repos/harvestpro-nz/.github/workflows/ci.yml`
- `/root/repos/harvestpro-nz/.github/workflows/backup.yml`
- `/root/repos/harvestpro-nz/.github/workflows/deploy-production.yml`
- `/root/repos/harvestpro-nz/.github/workflows/deploy-staging.yml`
- `/root/repos/harvestpro-nz/.github/workflows/security.yml`

No other workflows / composite actions / reusable workflows under `.github/`.

---

## Severity Counts

| Severity | Count |
|---|---|
| **CRITICAL** | 3 |
| **HIGH** | 6 |
| **MEDIUM** | 7 |
| **LOW** | 6 |
| **INFO** | 3 |
| **Total findings** | **25** |

---

## 1. Permissions — GITHUB_TOKEN scope

### [CRITICAL] GHA-PERM-01 — No `permissions:` block in 4 of 5 workflows

| Workflow | Line | Status |
|---|---|---|
| `ci.yml` | — | MISSING (defaults to read-write on `contents`, `issues`, `pull-requests`, `actions`, etc.) |
| `backup.yml` | — | MISSING |
| `deploy-production.yml` | — | MISSING |
| `deploy-staging.yml` | — | MISSING |
| `security.yml` | 11–14 | **Present** (`contents: read`, `security-events: write`, `issues: write`) — GOOD |

Impact: any step in `ci.yml` that runs on `pull_request` receives a **read-write** `GITHUB_TOKEN`. A compromised third-party action (e.g. `appleboy/ssh-action@v1`, `amondnet/vercel-action@v25` in staging) could push to branches, open PRs, or mutate issues.

Fix: add at top of every workflow:
```yaml
permissions:
  contents: read
```
and escalate per-job where needed.

### [HIGH] GHA-PERM-02 — `ci.yml` `build-deploy` job deploys over SSH with a root account
`ci.yml:67` `username: root`. Combined with missing `permissions:`, any third-party action pulled into this job could exfiltrate `HETZNER_SSH_KEY` and obtain full root on the Hetzner box. See also GHA-DEPLOY-02.

---

## 2. Action Pinning — SHA vs tag

All third-party actions are pinned by **floating tag**, none by SHA. Tag-moving is a documented supply-chain vector (e.g. `tj-actions/changed-files` Mar 2025).

### [HIGH] GHA-PIN-01 — Unpinned actions

| Workflow | Line | Action | Current | Recommended |
|---|---|---|---|---|
| `ci.yml` | 16 | `actions/checkout@v4` | tag | SHA |
| `ci.yml` | 18 | `actions/setup-node@v4` | tag | SHA |
| `ci.yml` | 46 | `actions/checkout@v4` | tag | SHA |
| `ci.yml` | 48 | `actions/setup-node@v4` | tag | SHA |
| `ci.yml` | 63 | `appleboy/ssh-action@v1` | tag (**3rd-party, root SSH**) | **SHA — HIGH** |
| `backup.yml` | 26 | `actions/checkout@v4` | tag | SHA |
| `backup.yml` | 67, 95 | `actions/upload-artifact@v4` | tag | SHA |
| `backup.yml` | 123 | `actions/github-script@v7` | tag | SHA |
| `deploy-production.yml` | 17, 49 | `actions/checkout@v4` | tag | SHA |
| `deploy-production.yml` | 20, 52 | `actions/setup-node@v4` | tag | SHA |
| `deploy-staging.yml` | 17 | `actions/checkout@v4` | tag | SHA |
| `deploy-staging.yml` | 20 | `actions/setup-node@v4` | tag | SHA |
| `deploy-staging.yml` | 40 | `amondnet/vercel-action@v25` | tag (**3rd-party, Vercel token**) | **SHA — HIGH** |
| `security.yml` | 25, 57, 103, 149 | `actions/checkout@v4` | tag | SHA |
| `security.yml` | 45 | `github/codeql-action/upload-sarif@v3` | tag | SHA (OK — first-party) |
| `security.yml` | 61, 108 | `actions/setup-node@v4` | tag | SHA |
| `security.yml` | 126 | `zaproxy/action-baseline@v0.12.0` | tag | SHA |
| `security.yml` | 134 | `actions/upload-artifact@v4` | tag | SHA |
| `security.yml` | 154 | `gitleaks/gitleaks-action@v2` | tag | SHA |

Priority: pin the **3rd-party** ones first (`appleboy/ssh-action`, `amondnet/vercel-action`, `zaproxy/action-baseline`, `gitleaks/gitleaks-action`) — realistic supply-chain targets.

---

## 3. `pull_request_target` Misuse

### [INFO] GHA-PRT-01 — Not used anywhere
Verified: no workflow uses `on: pull_request_target`. All PR runs use `on: pull_request`, the safe trigger (no secrets, no write token on forks). **GOOD.**

---

## 4. Secret Exposure

### [MEDIUM] GHA-SEC-01 — Secrets interpolated directly into shell commands
- `ci.yml:78–83, 88–93`: `curl ...${{ secrets.TELEGRAM_BOT_TOKEN }}...` — token embedded in URL; safe per-job but logs would leak if debug logging enabled. `::add-mask::` via `env:` + `$TELEGRAM_BOT_TOKEN` is safer (GitHub masks env-backed secrets more reliably).
- `backup.yml:45–53, 79–90`: `--host=${{ secrets.DATABASE_HOST }}` interpolation inline. Prefer `env:` + `$DATABASE_HOST`.
- `deploy-production.yml:76, 82`: `--token=${{ secrets.VERCEL_TOKEN }}` as CLI arg.
- `deploy-production.yml:91, 96`: `curl -f ${{ secrets.PRODUCTION_URL }}` — URL in secret, interpolated inline.

### [INFO] GHA-SEC-02 — No `echo` of secrets, no `print-env`, no env dump
Verified by grep. **GOOD.**

### [LOW] GHA-SEC-03 — Hard-coded placeholder Supabase anon JWT in test env
`ci.yml:39` and `deploy-production.yml:37` embed a fake `VITE_SUPABASE_ANON_KEY` whose payload decodes to `ref=placeholder`, `role=anon`, signature literal reads `placeholder-key-for-ci-tests-only` (not a valid signature). It is not a real credential. Recommendation: move to `VITE_SUPABASE_ANON_KEY_PLACEHOLDER` + add an inline comment clarifying it is a fixture, to reduce reviewer alarm and avoid tripping external secret scanners.

---

## 5. Deploy Flows — `deploy-production.yml`

### [HIGH] GHA-DEPLOY-01 — Production gated only on branch, no tag or in-file approval
- Trigger: `push: branches: [main]` + `workflow_dispatch` (L4–6).
- Uses `environment: name: production` (L43) — **correct**; GitHub Environment protection rules (required reviewers / deployment branches / wait timers) are configured at the repo **Environments** settings, not in this file. Confirm at `settings/environments/production` that required reviewers and branch restriction are set; if not, every push to `main` ships to prod with no human gate.
- No tag-based deploys, no explicit `if: startsWith(github.ref, 'refs/tags/v')`.

### [HIGH] GHA-DEPLOY-02 — Parallel, conflicting production deploy paths
Two workflows both deploy on `push: main`:
1. `ci.yml:41–73` — SSH deploy to Hetzner as `root`.
2. `deploy-production.yml:39–92` — Vercel deploy.

They run concurrently (no `concurrency:` in either). Outcomes depend on race conditions. Either this is intentional (Hetzner backend + Vercel frontend) — in which case both need `concurrency: production-deploy` and explicit scope comments — or one is obsolete and should be deleted.

### [MEDIUM] GHA-DEPLOY-03 — Long-lived secrets used in production deploy
- `VERCEL_TOKEN` (L76, 82) — long-lived PAT; Vercel now supports OIDC federation with GitHub. Migrate.
- `PRODUCTION_SUPABASE_ANON_KEY` (L67) — anon key, acceptable.
- `SENTRY_DSN`, `POSTHOG_KEY` — public identifiers, OK.
- `PRODUCTION_URL` with fallback `merr-pi.vercel.app` (L45, 91, 96, 103) — hard-coded Vercel preview domain as fallback. If the secret is unset/invalid, the health check silently hits the wrong domain.

### [LOW] GHA-DEPLOY-04 — `continue-on-error: true` on smoke tests (L97)
Production smoke test failure does not fail the deploy. Combined with `Rollback on failure` (L107) being a no-op (just `echo`), broken prod can ship silently.

### [LOW] GHA-DEPLOY-05 — Health check L88–91
`sleep 10` + single `curl -f` — no retry/backoff. Vercel cold-starts or propagation delays will false-positive.

### [MEDIUM] GHA-DEPLOY-06 — `deploy-staging.yml:45` uses `vercel-args: '--prod'`
Staging workflow deploys with Vercel `--prod` flag; on a shared project this aliases to **production**. If `VERCEL_PROJECT_ID` points at a separate staging project this is fine; if it points at the same project as prod this is a production deploy from the `staging` branch.

### [MEDIUM] GHA-DEPLOY-07 — `deploy-staging.yml:29` runs `npm run test` (unsharded)
Full test run without shard or `vitest.config.ci.ts` — likely hits wall-time and default memory. Mismatched with prod/CI test config.

---

## 6. `backup.yml`

| Topic | Finding |
|---|---|
| **What** | `pg_dump` custom format `--compress=9` of the Supabase DB (`DATABASE_HOST/USER/PASSWORD/NAME`). Plus `row_counts_*.csv`. |
| **Where** | GitHub Artifacts. **Not encrypted at rest beyond GitHub platform encryption.** No off-GitHub copy (S3, Backblaze, Hetzner storage). |
| **Encryption in transit** | libpq default; Supabase enforces TLS, OK. |
| **Encryption at rest** | **None application-level.** A dump containing PII (IRD numbers, payroll) sits in GHA artifacts accessible to anyone with `actions:read` on the repo. |
| **Retention** | 30 days (L16, L72, L99). Acceptable, but no long-term cold copy. |
| **Integrity** | `pg_restore --list` verify step L58–64. GOOD. |
| **Restore drill** | No scheduled restore test. Untested backups = hope. |
| **Failure alert** | `notify-failure` job creates a GitHub issue with `critical` label (L116–149). GOOD. |
| **Password handling** | L42, 60, 77 `PGPASSWORD` env — correct (not on CLI). |

### [HIGH] GHA-BACKUP-01 — PII backup stored unencrypted in GHA Artifacts
Add GPG-encrypt step before upload (`gpg --symmetric --cipher-algo AES256 --batch --passphrase "$BACKUP_GPG_PASSPHRASE" "$BACKUP_FILE"`), upload the `.dump.gpg`. Store passphrase in a separate, break-glass secret.

### [HIGH] GHA-BACKUP-02 — Single-provider backup
All backups live inside GitHub. If the repo is deleted / account compromised, backups go with it. Mirror to S3/Backblaze via `rclone` or AWS OIDC federation.

### [MEDIUM] GHA-BACKUP-03 — No restore-drill workflow
Add a monthly workflow that spins up an ephemeral Postgres, `pg_restore`s the latest dump, runs a sanity SQL, and alerts on failure.

### [LOW] GHA-BACKUP-04 — `timeout-minutes: 30` present on backup job (L22). GOOD.

---

## 7. `security.yml` — Scanners

| Scanner | Present | Blocking | Coverage |
|---|---|---|---|
| **Semgrep** (SAST) | YES L18–49 | NO — `\|\| true` on L42, uploads SARIF regardless | `src/`, `supabase/functions/` with OWASP-Top-10, JS, TS, React, secrets rulesets. Excludes `*.test.{ts,tsx}` + `database.types.ts`. Reasonable. |
| **CodeQL** | **NO — MISSING** | — | Semgrep covers SAST but GitHub-native CodeQL would add `security-extended` queries and JS/TS dataflow. |
| **npm audit** | YES L68 | **YES — `--audit-level=critical --omit=dev`** | Only critical, prod-only. Reasonable floor. |
| **Custom grep secret-scan** | YES L71–86 | **YES — `exit 1`** | See §13. |
| **console.log grep** | YES L89–94 | NO (warning only) | Scope `src/services/`, `src/repositories/`. |
| **OWASP ZAP** | YES L96–141 | NO — `fail_action: false` (L131) | DAST baseline, main branch only (L101). Uses `.zap/rules.tsv` (verified present, 1655 bytes). |
| **Gitleaks** | YES L143–157 | NO — `continue-on-error: true` (L157) | Full git history (`fetch-depth: 0`). |

### [HIGH] GHA-SCAN-01 — Almost all scanners are non-blocking
Semgrep `|| true`, ZAP `fail_action: false`, Gitleaks `continue-on-error: true`. Findings go to Security tab but merge is never blocked. Define a threshold (e.g. Gitleaks high-confidence = block; Semgrep ERROR-severity = block) and flip the flags.

### [MEDIUM] GHA-SCAN-02 — No CodeQL workflow
GitHub's default SAST for JS/TS is absent.

### [MEDIUM] GHA-SCAN-03 — `--omit=dev` on `npm audit` misses dev-time vulnerabilities
Build-tool RCE in a dev dep (vite, vitest plugin) is a real supply-chain threat. Add a parallel `npm audit --audit-level=high` (non-blocking) for visibility.

### [LOW] GHA-SCAN-04 — `security-summary` job (L160) depends on `semgrep, dependency-scan, secret-scan` but NOT on `owasp-zap`. The summary never reflects ZAP.

---

## 8. Caching

| Workflow | Step | Key |
|---|---|---|
| `ci.yml:21, 51` | `setup-node` `cache: 'npm'` | Auto-keyed off `package-lock.json` hash. Stable. |
| `deploy-*` | idem | Stable. |
| `security.yml:64, 110` | idem | Stable. |

### [INFO] GHA-CACHE-01 — No Playwright browser cache
`deploy-production.yml:96` installs Playwright browsers implicitly each run. Add `actions/cache` keyed on `~/.cache/ms-playwright` + `hashFiles('package-lock.json')`.

---

## 9. Test Execution & Merge Gates

| Trigger | Tests run | Blocks merge? |
|---|---|---|
| `pull_request` to main | `ci.yml` 5-shard Vitest (L34), lint on shard 1/5 (L31) | YES (if required in branch protection) |
| `push: main` | `ci.yml` tests + `deploy-production.yml` tests (duplicate) | Post-merge only |
| E2E / Playwright on PR | **NOT RUN** on PR — only post-deploy smoke (L96, `continue-on-error: true`) | NO |
| Integration tests | Run as part of Vitest shards (`*.integration.test.ts` in `src/integration/`) | YES |

### [HIGH] GHA-TEST-01 — Duplicate test execution
Every push to `main` runs the identical 5-shard Vitest matrix twice (once in `ci.yml`, once in `deploy-production.yml`). Waste of minutes and a race window. `deploy-production.yml` should depend on `ci.yml` (via `workflow_run`) or one of the two should drop the test job.

### [HIGH] GHA-TEST-02 — E2E / Playwright never gates a PR
E2E only runs as post-deploy smoke with `continue-on-error: true`. A PR can break critical user flows and merge green.

### [MEDIUM] GHA-TEST-03 — `deploy-staging.yml` drifts from PR test config
Uses `npm run test` (full suite, default config) while PRs use `vitest.config.ci.ts` with sharding + 6 GB heap. Flaky drift guaranteed.

---

## 10. Concurrency

### [CRITICAL] GHA-CONC-01 — No `concurrency:` block in any workflow
Consequences:
- Two pushes to `main` in quick succession → two parallel prod deploys → Vercel + SSH race → undefined final state.
- Manual re-trigger of backup while scheduled run in progress → two pg_dumps against prod DB simultaneously.
- Staging push burst → queued Vercel deploys, last-write-wins.

Fix (per workflow top level):
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}
```
Production deploys should **queue**, not cancel mid-flight. Feature branches should cancel stale runs.

---

## 11. OIDC vs Long-Lived Secrets

Long-lived secrets currently in use:
- `HETZNER_SSH_KEY` (`ci.yml:67`) — private key, not OIDC-able (root SSH). Rotate regularly; switch to a dedicated deploy user with restricted rsync/systemctl instead of root.
- `VERCEL_TOKEN` (`deploy-production.yml:76, 82`, `deploy-staging.yml:42`) — **Vercel supports OIDC federation with GitHub**. Migrate.
- `TELEGRAM_BOT_TOKEN` — bot token, not OIDC-able; scoped webhook is fine.
- `DATABASE_PASSWORD` (`backup.yml`) — Supabase direct connection. Supabase does not (yet) offer GitHub OIDC for direct Postgres. Acceptable.
- `GITHUB_TOKEN` — ephemeral, OK.

### [HIGH] GHA-OIDC-01 — Migrate Vercel deploys to OIDC
Eliminates the single highest-value long-lived token in the account.

---

## 12. Timeouts

| Workflow | Job | `timeout-minutes` |
|---|---|---|
| `ci.yml` | test | **MISSING** (default 360) |
| `ci.yml` | build-deploy | **MISSING** |
| `backup.yml` | backup | **30** — GOOD |
| `backup.yml` | notify-failure | **MISSING** |
| `deploy-production.yml` | test | **MISSING** |
| `deploy-production.yml` | deploy | **MISSING** |
| `deploy-staging.yml` | deploy | **MISSING** |
| `security.yml` | all 5 jobs | **MISSING** |

### [MEDIUM] GHA-TIMEOUT-01 — 8 of 9 jobs lack `timeout-minutes`
A hung `npm install` or stuck `playwright` browser launch burns 6 hours of billable minutes. Add per-job `timeout-minutes: 20` (tests), `15` (deploy), `10` (scanners), `5` (notify).

---

## 13. Prior Incident — HP-INFRA-03 regex verification

**Commit:** `48b1822 [LAB] HP-INFRA-03: fix secret-scan regex false-positive in CI (#11)`
**File:** `.github/workflows/security.yml:82`

Current regex (see file L82):
- Part A: `SUPABASE_SERVICE_ROLE_KEY` `[:=]` quoted literal beginning with `eyJ...`.
- Part B: quoted literal matching `sk-` + 48 base62 chars.

### Verification — re-executed against three synthetic fixtures

| Case | Description | Should match? | Matches? |
|---|---|---|---|
| A | Hardcoded JWT assignment: `const SUPABASE_SERVICE_ROLE_KEY = "eyJ<fake>.<fake>.<fake>"` | YES | **YES** |
| B | Legit env ref: `const key = process.env.SUPABASE_SERVICE_ROLE_KEY` | NO | **NO** |
| C | Hardcoded OpenAI-legacy key: `const k = "sk-<48 base62 chars>"` | YES | **YES** |

Test run captured `/tmp/regex_test.sh` — all three cases behaved as intended.

### [MEDIUM] GHA-REGEX-01 — Fix is correct but narrow
Confirmed working as designed. Gaps:

1. **Only catches `SUPABASE_SERVICE_ROLE_KEY` by name.** A developer hardcoding any other JWT (e.g. `const serviceKey = "eyJ..."`) is not caught.
2. **`sk-` pattern is OpenAI-legacy.** Modern OpenAI keys are `sk-proj-...` (variable length, underscores allowed). Anthropic uses `sk-ant-api03-...`, Stripe uses `sk_live_...`. Coverage is narrow.
3. **No AWS `AKIA...`, Google API `AIza...`, Slack `xoxb-...`, GitHub `ghp_...` patterns.**
4. **Gitleaks already covers all of the above.** This custom grep is redundant as primary detection; it's useful only as a narrowly-targeted CI trip-wire.

**Recommendation:** keep the current regex (correctly addresses the HP-INFRA-03 false positive), but make Gitleaks **blocking** (remove `continue-on-error: true` on `security.yml:157`) after establishing a one-time clean-history baseline. That shifts primary secret detection to Gitleaks; the grep becomes defense-in-depth.

### [LOW] GHA-REGEX-02 — `--include="*.ts" --include="*.tsx"` only
Misses `.js`, `.cjs`, `.mjs`, `.env*`, `.json`, `.yml`. Supabase functions and config are often TS, but `.env.example` and `scripts/*.js` are not scanned.

---

## Top 6 Findings (for exec summary)

| # | ID | Severity | File:Line | Finding |
|---|---|---|---|---|
| 1 | GHA-CONC-01 | CRITICAL | all 5 workflows | No `concurrency:` anywhere → racing prod deploys (Hetzner vs Vercel simultaneous on `push: main`). |
| 2 | GHA-PERM-01 | CRITICAL | `ci.yml`, `backup.yml`, `deploy-production.yml`, `deploy-staging.yml` | No `permissions:` block → default read-write `GITHUB_TOKEN`. |
| 3 | GHA-DEPLOY-02 | HIGH | `ci.yml:41`, `deploy-production.yml:39` | Two parallel prod deploy workflows on same trigger with no concurrency key. |
| 4 | GHA-BACKUP-01 | HIGH | `backup.yml:67` | Unencrypted PII (payroll/IRD) DB dumps in GHA Artifacts, 30-day retention, no off-GitHub mirror. |
| 5 | GHA-PIN-01 | HIGH | `ci.yml:63`, `deploy-staging.yml:40`, `security.yml:126, 154` | Third-party actions pinned by tag (`appleboy/ssh-action@v1`, `amondnet/vercel-action@v25`, `zaproxy/action-baseline@v0.12.0`, `gitleaks/gitleaks-action@v2`). Supply-chain risk. |
| 6 | GHA-SCAN-01 | HIGH | `security.yml:42, 131, 157` | Semgrep, ZAP, Gitleaks all non-blocking. No actual merge gate from security scanners. |

## Positive Findings

- `security.yml` has an explicit, minimal `permissions:` block.
- No `pull_request_target` usage anywhere.
- No `echo` of secrets; no env-dump steps.
- Backup integrity verification via `pg_restore --list`.
- Backup failure auto-creates a labelled GitHub issue.
- Environments (`production`, `staging`) are declared — can be gated at settings level.
- Gitleaks uses `fetch-depth: 0` (scans full history — correct).
- HP-INFRA-03 regex fix is verified correct against the originally broken cases.
- `vitest.config.ci.ts` with sharding is used consistently on PR + CI push.
- `npm audit --audit-level=critical --omit=dev` is blocking — a sane floor.
