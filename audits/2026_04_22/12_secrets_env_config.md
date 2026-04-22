# Audit 12 — Secrets Handling, Env Var Structure & Config

**Scope**: HarvestPro NZ (`/root/repos/harvestpro-nz`)
**Mode**: READ-ONLY (file shapes inspected, no secret values echoed)
**Date**: 2026-04-22

---

## Severity Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2     |
| HIGH     | 3     |
| MEDIUM   | 4     |
| LOW      | 3     |
| INFO     | 2     |

---

## CRITICAL-01 — Production-style `service_role` JWT + DB password committed in `scripts/setup-db.cjs`

**File**: `scripts/setup-db.cjs` lines 10–12
**Status**: Still in HEAD of `main`. Tracked by git since commit `d5ce6e3` (2026-04-14).

Three hardcoded constants at module top level (values withheld from this report):
- `PROJECT_REF = 'bfglk...xddznucxf'`  (a real Supabase project ref, not a placeholder)
- `DB_PASSWORD = '…'` (16-char random-looking Postgres password)
- `SERVICE_ROLE_KEY = 'eyJ…'` (JWT whose payload decodes to `role: "service_role"`, `ref: "bfglk…"`, `iat≈2026-03`, `exp≈2036`)

The JWT is NOT a placeholder: it is signed (non-literal signature segment) and tied to a real project ref. `service_role` keys bypass RLS. If this project is still active, attackers with this file can:
- Read/write any row of any tenant in that Supabase DB.
- Connect directly to `db.<ref>.supabase.co:5432` as `postgres` with `DB_PASSWORD`.

`SECURITY_RULES.md` rules #4 ("NEVER hardcode credentials in code") and #7 ("If an exposed key is detected in history, report IMMEDIATELY") are currently violated.

**Action**:
1. Treat the JWT and DB password as **compromised regardless of whether they are still live**. Rotate service_role key and DB password for project `bfglk…` (Supabase Dashboard → Settings → API / Database). Rotation cannot be skipped even if the project is "abandoned" — anyone who forked or cloned the repo has the key.
2. Replace constants with `process.env.*` lookups and document in `.env.example`.
3. Scrub git history (`git filter-repo` or BFG) for commits `d5ce6e3`+ touching `scripts/setup-db.cjs`. Force-push coordinated with team.
4. Revoke any cached CI caches / artifacts.

---

## CRITICAL-02 — CI secret-scan regex has known blind spots

**File**: `.github/workflows/security.yml` lines 80–86 (updated in commit `48b1822` HP-INFRA-03).

The custom grep pattern only flags:
```
SUPABASE_SERVICE_ROLE_KEY[:=] '"eyJ...'"'
sk-<48 base62 chars>
```

Confirmed blind spots observed in this audit:
- Variable **named differently**, e.g. `const SERVICE_ROLE_KEY = 'eyJ…'` in `scripts/setup-db.cjs` — does NOT match because the literal token `SUPABASE_SERVICE_ROLE_KEY` is absent. This is exactly the real-world secret still in HEAD (see CRITICAL-01).
- Scope is `src/ --include="*.ts" --include="*.tsx"` only. `scripts/*.cjs`, `supabase/**`, `*.sh`, `*.sql`, root `.cjs` not scanned.
- Postgres password literals, Vercel tokens, VAPID private keys, generic `eyJ…` JWTs are not covered.

Gitleaks job IS present (lines 143–157) but is `continue-on-error: true` — so it only *reports*, never blocks a merge. And the gitleaks finding list is not surfaced in PR comments that I could confirm.

**Action**:
1. Remove `continue-on-error: true` from gitleaks once baseline is clean (or replace with a `.gitleaksignore` + fail-on-new).
2. Broaden custom regex to catch any `eyJ[A-Za-z0-9_.-]{40,}\.[A-Za-z0-9_.-]{40,}\.[A-Za-z0-9_.-]{20,}` literal in `*.ts *.tsx *.cjs *.js *.mjs *.sh *.sql`, excluding test/mocks directories by explicit suffix.
3. Add a pre-commit hook invoking `gitleaks protect --staged` in `.husky/pre-commit` (currently only `npm run lint`).

---

## HIGH-01 — `qc-photos` storage bucket is `public=true` with unscoped DELETE

**File**: `supabase/migrations/2026021300_create_qc_photos_bucket.sql`

- `public = true` → Any URL returned by `getPublicUrl(path)` is readable by anyone on the internet who knows the path. `src/hooks/useQC.ts:93` uses `getPublicUrl` (no signed URLs).
- SELECT policy: `TO public USING (bucket_id = 'qc-photos')` — explicit unauthenticated read.
- DELETE policy: `TO authenticated USING (bucket_id = 'qc-photos')` — any logged-in user of any tenant can delete any other user's QC photo (no `owner = auth.uid()` guard, no orchard scoping).

QC inspection photos frequently contain worker identities, vehicle plates, or PII. NZ privacy law obligations apply.

**Action**:
- Switch bucket to `public = false`.
- Replace `getPublicUrl` with `createSignedUrl(path, ttl=300)`.
- Scope DELETE policy to `owner = auth.uid()` (or orchard-admin only).
- Add `orchard_id` path prefix + RLS on storage.objects referencing `public.users.orchard_id`.

`hr-documents` bucket is correctly `public = false` with role-scoped policy; use as template.

---

## HIGH-02 — Historical `anon` JWT for real project ref `mcbt…ydpy` in git history

**Commits**: `dda0b1c` (2026-02-11) and later commits touched `src/` with a JWT whose payload decodes to `ref: "mcbt…ydpy"`, `role: "anon"`.

Anon keys are meant to be public (shipped in client bundle) BUT:
- Combined with project ref leak, attackers know the precise Supabase project URL.
- If RLS coverage is incomplete OR if anon-callable RPCs exist with privileges, the key becomes weaponizable.
- A separate `scripts/seed-users.cjs` line 7–8 still references the SAME `mcbt…ydpy` ref as a fallback (though the secret itself is a placeholder `PEGAR_AQUI_…`).

**Action**: Confirm whether project `mcbt…ydpy` is decommissioned. If still active, rotate its anon key and audit all RPC functions for anon-callable surface.

---

## HIGH-03 — Demo password `111111` embedded across 9+ files; production guard is name-based only

**Files**: `scripts/seed-users.cjs`, `scripts/setup-db.cjs`, `scripts/reset_demo_accounts.sql`, `supabase/seeds/seed_test_accounts.sql`, `supabase/seeds/seed_role_users.sql`, `.env.local`, `scripts/run-e2e-hetzner.sh`.

Only `supabase/seeds/seed_test_accounts.sql` has a guard:
```sql
IF current_database() ILIKE '%prod%' OR current_database() ILIKE '%production%'
```
This is trivially bypassed if the production DB is named `postgres` (the Supabase default — which it IS: `database: 'postgres'` in `setup-db.cjs:34`). The guard does NOT fire on the default name.

`scripts/reset_demo_accounts.sql`, `seed_role_users.sql`, `scripts/setup-db.cjs` have NO production guard at all and will happily seed `111111` passwords into any DB they connect to. `setup-db.cjs` specifically targets the real project ref (see CRITICAL-01) with `111111` passwords for roles `manager/admin/hr_admin/payroll_admin/logistics`.

**Action**:
- Unify seed guards to check `app.settings.environment` or a mandatory `IF current_setting('app.allow_demo_seeds', true) IS NOT DISTINCT FROM 'yes'` pattern.
- Reject if ANY of `mcbt…`, `bfglk…` project refs or any URL not starting with `http://127.0.0.1` or `http://localhost` is the target.
- Move all demo-seed scripts under `supabase/seeds/dev/` and exclude that directory from deployment artifacts.

---

## MEDIUM-01 — `VITE_GEMINI_API_KEY` variable exposed via client-side prefix

**Files**: `.env.example:15`, `src/services/config.service.ts:130`, `src/config/env.validation.ts:19,36`.

Although `VITE_GEMINI_API_KEY` is currently unused (no Gemini SDK consumer in `src/`), its `VITE_` prefix means ANY value set by operators will be bundled into `dist/assets/*.js` and served publicly. Gemini API keys are billable — a leaked one is worth money to attackers.

**Action**: Either remove the variable entirely, or rename to a server-only name and proxy Gemini calls through a Supabase Edge Function (`send-push` pattern).

---

## MEDIUM-02 — `.env.local` contains real DB connection string + two real-looking JWTs

**File**: `.env.local` (NOT committed; gitignore correctly covers it).

Shape:
- `VITE_SUPABASE_URL=http://127.0.0.1:8000`  (local self-hosted Supabase — OK)
- `VITE_SUPABASE_ANON_KEY=eyJ…` (signed, iat=2026-03, exp=2031)
- `SUPABASE_SERVICE_ROLE_KEY=eyJ…` (signed, role=service_role)
- `DATABASE_URL=postgresql://postgres:<32-hex-chars>@127.0.0.1:5433/postgres`
- `TEST_DEMO_PASSWORD=111111`, `TEST_MANAGER_PASSWORD=111111`, `TEST_ACID_PASSWORD=<real test pwd>`

This file is file-permission `644` (world-readable on a shared host). For a single-user laptop this is fine; on the ct4-bot multi-tenant host it is not.

**Action**: `chmod 600 .env.local`. Confirm `root`-only ownership. Keep file out of any tarball or backup that leaves the host.

---

## MEDIUM-03 — `.env.production` is effectively empty / misleading

**File**: `.env.production` (content: `DB=prod` — a 7-byte marker file, tracked by gitignore so NOT in git).

Real production config is injected via GitHub Actions secrets in `.github/workflows/deploy-production.yml` lines 66–69:
`PRODUCTION_SUPABASE_URL`, `PRODUCTION_SUPABASE_ANON_KEY`, `SENTRY_DSN`, `POSTHOG_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. That is the correct pattern.

However the stale `DB=prod` file on disk is confusing and could be mistaken for a real config stub during onboarding. Also line 37 of the deploy workflow uses a CLEARLY-labeled placeholder JWT for the test job (`ref: "placeholder"`, signature `placeholder-key-for-ci-tests-only`) — that is safe, good practice.

**Action**: Delete or replace `.env.production` contents with a comment pointing to GH Secrets.

---

## MEDIUM-04 — Husky pre-commit does no secret scan

**File**: `.husky/pre-commit` — single line `npm run lint`.

If CRITICAL-01 had been caught at pre-commit time, it would not have reached `main`.

**Action**: Add `gitleaks protect --staged --redact` (or `npx secretlint '**/*'`) as a second line. Keep a `.gitleaks.toml` baseline for known test fixtures (mock JWTs, `placeholder-key-for-ci-tests-only`).

---

## LOW-01 — `.env.staging` shape audit

**File**: `.env.staging` (6 lines, NOT committed). Only `VITE_`-prefixed variables. Anon key literal contains `.staging-mock-key` signature — clearly a fake. URL is `https://staging-mock.supabase.co`. No server-only vars leaked. OK.

## LOW-02 — Mock JWTs in `src/services/config.service.ts:88` and `src/mocks/data/index.ts:49`

Both are labeled "mock" in the signature segment and the surrounding code is mock-mode-gated. Not a real secret. Consider making the string obviously non-functional (`MOCK.NOT_A_REAL_JWT`) so future grep-based secret scanners don't flag them and get trained to ignore real ones.

## LOW-03 — `src/integration/*.ts` reference `process.env.SUPABASE_SERVICE_ROLE_KEY`

Three integration-test files read `process.env.SUPABASE_SERVICE_ROLE_KEY`. This is correct (server/test side, not `import.meta.env`). They do not hardcode values. Safe. Confirms the earlier HP-INFRA-03 regex tightening was needed for a real reason (false-positives on these files).

## INFO-01 — Supabase Edge Functions secret injection

All edge functions (`supabase/functions/*/index.ts`) use `Deno.env.get('SUPABASE_URL' | 'SUPABASE_ANON_KEY' | 'SUPABASE_SERVICE_ROLE_KEY' | 'VAPID_PUBLIC_KEY' | 'VAPID_PRIVATE_KEY' | 'VAPID_SUBJECT')`. Proper Supabase Vault / `supabase secrets set` pattern, as documented in `.env.example:36-39`. Good.

## INFO-02 — `verify_jwt` settings correct

`supabase/config.toml` has `verify_jwt = true` on 9 functions. Only `provision-orchard` (public signup) and `api-v1` (API-key-based REST) have `verify_jwt = false`, with documented rationale. Sensible.

---

## Recommended remediation order

1. **Today (hard block on any further prod deploy)**: Rotate `bfglk…` project's service_role key AND Postgres password. Scrub git. (CRITICAL-01)
2. **Today**: Broaden CI secret-scan regex + scope; make gitleaks a blocker. (CRITICAL-02)
3. **This week**: Flip `qc-photos` bucket to private + signed URLs + owner-scoped DELETE. (HIGH-01)
4. **This week**: Verify `mcbt…ydpy` project status; rotate anon if live. (HIGH-02)
5. **This week**: Harden demo-seed production guards beyond DB-name check. (HIGH-03)
6. **Sprint**: Add `gitleaks protect --staged` to husky pre-commit. (MEDIUM-04)
7. **Sprint**: Remove or server-ify `VITE_GEMINI_API_KEY`. (MEDIUM-01)
8. **Cleanup**: `chmod 600 .env.local`; clean up `.env.production`; relabel mock JWTs. (MEDIUM-02, -03, LOW-02)
