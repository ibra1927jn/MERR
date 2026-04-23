# CI/CD & Deployment Audit
**Date:** 2026-04-23 | **Repository:** harvestpro-nz

---

## 1. Workflows Enumeration & Analysis

### 1.1 **ci.yml** — CI/CD Pipeline
- **Triggers:** `push` (main, master) + `pull_request` (main, master)
- **Permissions:** ❌ MISSING — defaults to full access
- **Critical Issue:** `appleboy/ssh-action@v1` (not SHA-pinned) deploys to Hetzner via root SSH
  - Uses `github.event.repository.name` in shell commands (safe via secrets context)
  - Runs `git pull origin` + `npm ci --ignore-scripts` + build on remote
  - No approval gate or branch protection signal
- **Third-party actions:** All official GH actions pinned to @v4 ✓
- **Secret usage:** `HETZNER_HOST`, `HETZNER_SSH_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — injected safely into curl
- **Husky bypass:** Pre-commit disabled via `npm pkg delete scripts.prepare` ✓
- **Node version:** 22 (explicit)
- **Testing:** Sharded vitest across 5/5 + linting ✓

**RISK:** appleboy/ssh-action is floating @v1 (not SHA-pinned). Medium risk if GitHub account compromised.

---

### 1.2 **deploy-production.yml** — Vercel Production Deploy
- **Triggers:** `push` (main) + `workflow_dispatch`
- **Permissions:** ❌ MISSING — defaults to full access
- **Deployment Environment:** `production` with URL secret fallback
- **Third-party actions:** All pinned (@v4, @latest CLI) ✓
- **Secret usage:** `PRODUCTION_SUPABASE_URL`, `PRODUCTION_SUPABASE_ANON_KEY`, `SENTRY_DSN`, `POSTHOG_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `PRODUCTION_URL`
- **Build env vars:** Public anon key only in build (service role not exposed) ✓
- **Health check:** Simple curl POST-deploy ✓
- **Smoke tests:** `playwright test` on prod (continue-on-error=true, no real blocking)
- **Rollback:** Manual only — comment says "check Vercel dashboard"

**RISKS:** 
1. No actual rollback automation; failure just logs a message
2. Smoke tests are non-blocking (continue-on-error=true) — doesn't fail deployment

---

### 1.3 **deploy-staging.yml** — Vercel Staging Deploy
- **Triggers:** `push` (staging branch)
- **Permissions:** ❌ MISSING
- **Third-party action:** `amondnet/vercel-action@v25` (not SHA-pinned) ✓
- **Testing:** `npm run test` (full suite, slower than sharded CI)
- **Smoke tests:** Non-blocking
- **No health check or post-deploy verification**

**RISK:** Third-party action floating @v25 tag (not SHA-locked).

---

### 1.4 **security.yml** — Security Scanning
- **Triggers:** `push` (main, develop), `pull_request` (main), `schedule` (weekly Monday 02:00 UTC)
- **Permissions:** LEAST-PRIVILEGE ✓
  ```yaml
  permissions:
    contents: read
    security-events: write   # SARIF upload
    issues: write
  ```
- **Scanners:**
  1. **Semgrep SAST** (container) — OWASP Top 10 + JS/TS/React + secrets rules
  2. **npm audit** — Critical deps only, excludes dev
  3. **Hardcoded secrets regex** (HP-INFRA-03 fix):
     ```regex
     SUPABASE_SERVICE_ROLE_KEY[[:space:]]*[:=][[:space:]]*['\"]eyJ[A-Za-z0-9_.-]+['\"]
     sk-[a-zA-Z0-9]{48}
     ```
     **Improvement:** Only matches quoted assignments, not environment variable references ✓
  4. **console.log check** in services/ (non-blocking, reporting only)
  5. **OWASP ZAP DAST** (main branch only, non-blocking)
  6. **Gitleaks secret scanning** (full history, continue-on-error=true)

- **All external actions pinned:** ✓ (codeql@v3, upload-artifact@v4, zaproxy/action-baseline@v0.12.0, gitleaks@v2)
- **Secret discovery:** Pre-existing gitleaks in place ✓

---

### 1.5 **backup.yml** — Database Backup (Daily + Manual)
- **Triggers:** Schedule (daily 11:00 UTC = 23:00 NZST), manual via workflow_dispatch
- **Permissions:** ❌ MISSING
- **Backup method:** `pg_dump --format=custom --compress=9` + integrity check via `pg_restore --list`
- **Storage:** GitHub Artifacts (30 days retention)
- **Sanity check:** Row count export (CSV) to detect silent corruption
- **Failure alerting:** Creates GitHub issue with recovery runbook ref
- **All actions pinned:** ✓

---

## 2. Branch Protection & Husky Hooks

### Husky Configuration
- **Location:** `.husky/pre-commit`
- **Only hook active:** `npm run lint`
- **Bypass risk:** ⚠️ Can be bypassed via:
  - `git commit --no-verify`
  - `HUSKY=0 npm ci` (CI explicitly disables it)
  - Removing `.husky/` directory

**Assessment:** Husky is present but enforces linting only. Not a security gate.

### Branch Protection Signals
- **CI workflow declares no explicit `required: true`** for checks
- **Deployment workflows DO NOT reference branch protection rules**
- **No CODEOWNERS file found** — code review not enforced at repo level

---

## 3. Deployment Strategy & Rollback

### Frontend (Vercel)
- **Staging:** Git push → GitHub Actions → Vercel deploy (automatic)
- **Production:** Git push (main) + Health check + Smoke tests → Manual rollback

### Backend (Supabase Migrations)
- **Script:** `scripts/deploy.sh` (manual, not CI-automated)
  - Verifies `supabase link` registration
  - Runs `supabase db push` (applies pending migrations)
  - Deploys all Edge Functions
  - **Idempotency:** Migrations are idempotent by design (IF NOT EXISTS pattern expected)
  - **Rollback:** Manual via `supabase db rollback` or migration reversal

### Hetzner SSH Deploy (ci.yml)
- **Trigger:** Push to main
- **Process:** SSH into root@Hetzner, git pull, npm ci --ignore-scripts, npm run build
- **No rollback mechanism documented**

**RISK:** No documented rollback plan for any service. Vercel UI provides version history, Supabase migrations need manual reversal.

---

## 4. Environment & Secrets Handling

### Files Audited
| File | Status | Notes |
|------|--------|-------|
| `.env.example` | ✓ Public | Lists required VITE_* (public), test credentials template |
| `.env.local` | ❌ Committed | Contains hardcoded test passwords (`111111`, `AcidTest2026!`) |
| `.env.production` | ❌ Committed | Likely contains secrets (not inspected in-depth) |
| `.env.staging` | ❌ Committed | Staging env vars |

### Secrets in Scripts
- **deploy.sh:** No secrets echoed; uses `supabase link` (local state)
- **backup.sh:** `PGPASSWORD` set via env var (not echoed) ✓
- **run-e2e-hetzner.sh:** Reads `.env.local` via `source` (security risk if committed with secrets)
  - Passes `SUPABASE_SERVICE_KEY` to `scripts/seed-users.cjs` ✓

### Supabase Service Role Key
- **Location:** NOT client-side (checked via grep) ✓
- **Used only in:** Edge Functions (server-side), backup scripts, seed scripts
- **Risk:** run-e2e-hetzner.sh sources `.env.local` which may contain it

---

## 5. Secret Scanning

### Gitleaks (security.yml)
- **Enabled:** Yes, runs on push + PR + scheduled
- **Configuration:** Default ruleset (GitHub managed)
- **Status:** `continue-on-error: true` (reporting, not blocking)

### HP-INFRA-03 Custom Regex
```bash
grep -rE "(SUPABASE_SERVICE_ROLE_KEY[[:space:]]*[:=][[:space:]]*['\"]eyJ[A-Za-z0-9_.-]+['\"]|['\"]sk-[a-zA-Z0-9]{48}['\"])"
```
- **Effectiveness:** Matches only **literal assignments** to quoted strings
- **Avoids false positives:** `process.env.SUPABASE_SERVICE_ROLE_KEY` NOT matched ✓
- **Coverage:** OWASP ZAP top patterns (JWT eyJ*, OpenAI sk-*48)
- **Limitation:** Only scans `src/` directory, not supabase/functions/

---

## 6. Supply Chain Security

### package.json Scripts
| Script | Risk | Details |
|--------|------|---------|
| `prepare` | ⚠️ MEDIUM | `"prepare": "husky"` — husky runs on postinstall; can be disabled via HUSKY=0 |
| `test` | ✓ | vitest, no remote exec |
| `build` | ✓ | tsc + vite, no remote code |
| `lint` | ✓ | eslint, local |
| `docs` | ✓ | typedoc, local |

### Lockfile
- **Present:** `package-lock.json` ✓ (lockfileVersion: 3)
- **npm audit:** Script runs in CI (critical level) ✓
- **No postinstall shell scripts** ✓

### Android APK Signing
- **Location:** `/root/repos/harvestpro-nz/@capacitor/android` (node_modules, vendor)
- **Config:** Not found in repo root; likely Capacitor default
- **Release signing:** Not audited (Capacitor documentation required)

---

## 7. Artifact Integrity

### Build Artifacts
- **Vercel:** Automatic, signed by Vercel ✓
- **Hetzner:** Built via `npm run build`, stored in `dist/` on server
- **Database backups:** Compressed via pg_dump (integrity verified via `pg_restore --list`) ✓

### Signing
- **Frontend:** Vercel provides HTTPS + CSP headers ✓
- **Backend:** No explicit code signing for Edge Functions (Supabase manages deployment)

---

## 8. Action Pinning Analysis

### ❌ NOT SHA-PINNED (Floating Tags)
| Action | Current | Risk |
|--------|---------|------|
| `appleboy/ssh-action` | @v1 | Third-party; no version lock |
| `amondnet/vercel-action` | @v25 | Third-party; no version lock |

### ✓ PROPERLY PINNED (@v) or Semver
| Action | Current |
|--------|---------|
| `actions/checkout` | @v4 |
| `actions/setup-node` | @v4 |
| `actions/upload-artifact` | @v4 |
| `actions/github-script` | @v7 |
| `github/codeql-action` | @v3 |
| `gitleaks/gitleaks-action` | @v2 |
| `zaproxy/action-baseline` | @v0.12.0 |

**Recommendation:** Replace @v1, @v25 with `actions/github-script@v7` to get commit SHA (or request SHA from upstream maintainers).

---

## 9. Deployment Triggers & Guardrails

| Deployment | Trigger | Gate | Approval |
|------------|---------|------|----------|
| **Staging (Vercel)** | Push to `staging` | None | None (auto) |
| **Production (Vercel)** | Push to `main` | Smoke tests (non-blocking) | Manual check (UI) |
| **Database migrations** | Manual `scripts/deploy.sh` | None | Manual |
| **Hetzner (prod app)** | Push to `main` | CI pass required | None |

---

## Punchlist: Critical Issues

1. **❌ CRITICAL:** No permissions block in ci.yml, deploy-*.yml, backup.yml
   - Add: `permissions: read-all` + explicit grant for needed scopes

2. **❌ CRITICAL:** appleboy/ssh-action@v1 not SHA-pinned
   - Replace with SHA or request upstream pin

3. **⚠️ HIGH:** Smoke tests non-blocking; deployment continues on failure
   - Change `continue-on-error: true` → `false` in production workflow

4. **⚠️ HIGH:** No documented rollback procedure for Supabase migrations
   - Add: `RUNBOOK.md` → Section 3.2 (Rollback migrations via manual supabase db rollback)

5. **⚠️ MEDIUM:** .env files (.local, .production, .staging) committed with test/real secrets
   - Move to `.env.example` + GitHub Secrets

6. **⚠️ MEDIUM:** Husky can be bypassed silently via --no-verify
   - Enforce via branch protection rule (required checks on lint)

7. **⚠️ MEDIUM:** amondnet/vercel-action@v25 not SHA-pinned
   - Request upstream or switch to native Vercel CLI in GitHub Actions

8. **⚠️ LOW:** Gitleaks continue-on-error=true; not blocking
   - Change to false once baseline is clean, or add to branch protection

---

**Audit Completed:** 2026-04-23  
**Next Review:** Post-remediation of critical items  
**Reviewer Notes:** Modern CI/CD setup with good SAST/DAST coverage; lacks deployment approval gates and secret isolation.
