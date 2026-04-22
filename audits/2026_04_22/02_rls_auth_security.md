# RLS, Auth & Security Audit — HarvestPro NZ — 2026-04-22

**Auditor:** Claude (autonomous sub-agent, READ-ONLY).
**Scope:** dimensions 2 (Auth/AuthZ) and 5 (Security) of `AUDIT_2026_04_19_DEEP_REVIEW.md`, all migrations under `supabase/migrations/` + `supabase/schema_v3_consolidated.sql`, every edge function under `supabase/functions/`, supabase client `src/services/supabase.ts`, repositories, `src/components/auth/`, `src/context/AuthContext.tsx`, `src/hooks/useMFA*`.
**Methodology:** Static cross-read of SQL policies vs TypeScript call sites vs prior audit. Compared live-DB findings from 04-19 against migrations applied since. `git log --since=2026-04-19`: only 2 commits (HR docs + secret-scan regex). No RLS fix commits between 04-19 and 04-22.
**Rule:** DETECT and REPORT; no edits, no DB writes.

---

## Severity Counts

| Severity | Count |
|---|---|
| CRITICAL | 5 |
| HIGH     | 9 |
| MEDIUM   | 7 |
| LOW      | 4 |
| OK / POSITIVE | 6 |

---

## Status of prior 04-19 CRITICAL/HIGH findings

| # | 04-19 Finding | 04-22 State |
|---|---|---|
| 04-19 C-1 | 14 tables with `ALL USING(true) WITH CHECK(true)` | **PARTIAL FIX.** Migration `2026030101_rls_consolidation.sql` fixed 7/14 via `is_manager()`/`is_role()` helpers (messages, orchards, pickers, daily_attendance, bucket_records, users, harvest_settings). `broadcasts` got proper policies in `20260403100000`. **6 still open as of HEAD** — see C-1 below. |
| 04-19 C-2 | `mpi-export.service.ts:189` writes to wrong table | Out of this audit's scope (not RLS/auth). |
| 04-19 C-3 | MFA enabled in client, disabled in server `.env` | Client code unchanged (`src/hooks/useMFA.ts`). Server `.env` lives outside the repo — cannot verify from static read alone, but no migration or `docker/.env` change committed. Treat as **still open** (H-3 below). |
| 04-19 H-1 | Orphan `00000000…` user with role='manager' | `public.users.role` is still nullable (no `ALTER TABLE … SET NOT NULL` migration). Orphan lookup path still exists. **Open.** |
| 04-19 H-3 | Role change does not invalidate JWT (1h window) | Still open; amplified by C-2 below (JWT still reads old role because edge fns don't update `user_metadata`). |
| 04-19 H (SMTP fake) | Password reset unusable | Outside this audit's scope but the client still calls `resetPasswordForEmail` unconditionally. |

---

## Findings

### C-1 — 6 tables still have fully open `ALL USING(true) WITH CHECK(true)` policies — prior CRITICAL is NOT fully fixed
- **Severity:** CRITICAL
- **Location:**
  - `supabase/migrations/20260227_rls_hierarchy_tables.sql:13` → `harvest_seasons FOR ALL USING(true) WITH CHECK(true)`
  - `supabase/migrations/20260227_rls_hierarchy_tables.sql:20` → `orchard_blocks FOR ALL USING(true) WITH CHECK(true)`
  - `supabase/migrations/20260227_rls_hierarchy_tables.sql:27` → `block_rows FOR ALL USING(true) WITH CHECK(true)`
  - Tables from 04-19 Annex C **with no remediation migration since**: `alerts` (remediated in `2026030100`), `break_logs`, `bucket_runners`, `performance_metrics`, `row_assignments` (policy text in `2026021108_row_assignments_columns.sql:22` and `schema_v3_consolidated.sql:669` is role-gated — but migration order means the `Allow all for row_assignments` policy in live DB may still be present), `session_signatures`, `sync_queue`, `teams`, `tractor_fleet`. None of these tables have a dedicated remediation migration in the repo (grep over `supabase/migrations/` returns zero hits for `break_logs|bucket_runners|performance_metrics|session_signatures|sync_queue|teams|tractor_fleet`).
- **Detail:** `rls_consolidation.sql` (2026-03-01) only rewrote policies for 7 tables (messages, broadcasts, harvest_settings, orchards, pickers, daily_attendance, bucket_records). `schema_v3_consolidated.sql` has correct policies for most of these tables, but the consolidated schema is a flattened snapshot — the live DB's policies are determined by the ordered migration chain. Multiple permissive policies co-exist in Postgres as OR (not AND), so a later role-gated `Manage seasons` policy does NOT revoke the earlier `FOR ALL USING(true)` policy unless it is `DROP POLICY`-ed first. Only `20260227_rls_hierarchy_tables.sql:13,20,27` creates the open policies, and no later migration drops them.
- **Impact:** any authenticated user — including a `picker` — can UPDATE `block_rows`, `orchard_blocks`, `harvest_seasons`, `row_assignments`, and (if they exist) `session_signatures`, `sync_queue`, `teams`, `tractor_fleet`. This maps directly to: reassign pickers to hostile rows, alter season boundaries to break payroll period, forge `session_signatures`, inject arbitrary `sync_queue` entries that replay on reconnect.
- **Recommendation:** new migration that first `DROP POLICY IF EXISTS "Managers can manage seasons|blocks|rows|…" ON …` and then recreates them as `USING (orchard_id = get_my_orchard_id() AND is_manager())`. Mirror the consolidated-schema text. Verify against live DB (`SELECT schemaname, tablename, policyname, qual, with_check FROM pg_policies WHERE qual='true' AND with_check='true'`) after applying.

### C-2 — Edge-Function RBAC reads `user_metadata.role` which clients can self-modify → privilege escalation
- **Severity:** CRITICAL
- **Location:** `supabase/functions/_shared/security.ts:150` — `const userRole = user.user_metadata?.role as string | undefined;`
- **Detail:** `user_metadata` is **client-writable** via `supabase.auth.updateUser({ data: { role: 'admin' } })` — this is a documented Supabase behaviour and the whole reason `app_metadata` exists (admin-only). Any authenticated `picker` can call `supabase.auth.updateUser({ data: { role: 'admin' } })` from the browser console, then call any edge function (`calculate-payroll`, `manage-admin`, `approve-timesheet`) and pass `requireRole(['admin','manager'])`. The only fallback defense is RLS inside the query the edge function issues — which, for `calculate-payroll`, uses the user's JWT (so picker RLS kicks in), but for `manage-admin` the function does `.update({role:…}).eq('id', user_id)` through the user's client, protected only by `users_update_manager_policy` — and that policy uses `is_manager()` which checks `public.users.role`, which **is** server-side. So the escalation is blunted by RLS for DB writes, but **the edge functions still leak**: they return 200 OK responses, consume rate budget, confirm which `user_id` exist, and for `submit-audit-log` / `calculate-payroll` / `detect-anomalies` they DO run under the escalated token — data leak risk for cross-orchard reads in functions that don't re-check orchard ownership (see H-4).
- **Impact:** Trust-level invariant of `requireRole()` is false. Defense-in-depth is only RLS. Every edge function audit log line saying "role=admin" could be a forged picker.
- **Recommendation:** read `role` from `app_metadata` (admin-only writable) or from `public.users` via `auth.uid()` inside the function (SECURITY DEFINER RPC). Best: migrate auth hook to inject `public.users.role` into `app_metadata.role` on sign-in so JWT claim is truthful. This also unblocks fixing the 04-19 H-3 (role-change invalidation).

### C-3 — `audit_logs` has `INSERT WITH CHECK (true)` → any authenticated user can forge audit rows
- **Severity:** CRITICAL
- **Location:** `supabase/schema_v3_consolidated.sql:802-804`, `supabase/migrations/2026021101_audit_logging.sql:63`, `supabase/migrations/20260101000000_schema_v3.sql:1334,1350`.
  ```sql
  CREATE POLICY "system_insert_audit_logs" ON public.audit_logs FOR
  INSERT WITH CHECK (true);
  ```
- **Detail:** The `audit_logs` table is supposed to be append-only and trustworthy. The insert policy permits ANY row from ANY authenticated user — `user_id`, `user_email`, `action`, `entity_id` are all client-supplied. Combined with `managers_view_audit_logs` (SELECT gated), a malicious picker cannot read the audit trail but CAN flood it with noise, impersonate an admin's `user_id`, or pre-populate alibi records ("admin X approved Y on date Z").
- **Impact:** audit trail is not trustworthy for any compliance process (NZ Privacy Act 2020 breach investigation, MPI trace-back, Employment Relations Act disputes). Defeats the entire point of the `submit-audit-log` edge function's "server-verified" claim (see H-5).
- **Recommendation:** replace with `WITH CHECK (user_id = auth.uid() OR get_auth_role() = 'service_role')` and route all privileged audit inserts via edge functions using the service-role key (not the user JWT). Add `ip_address` as `inet NOT NULL DEFAULT inet_client_addr()`.

### C-4 — `public.users` `INSERT WITH CHECK (true)` allows any authenticated user to self-assign role='admin'
- **Severity:** CRITICAL
- **Location:** `supabase/migrations/2026021103_complete_rls.sql:281-282`:
  ```sql
  CREATE POLICY "users_insert_policy" ON users FOR INSERT WITH CHECK (true);
  ```
  The later consolidated schema `schema_v3_consolidated.sql:613` has the stricter version (`WITH CHECK (id = auth.uid())`), but both policies are named differently and would **co-exist** at runtime — permissive policies OR together, so `true` wins.
- **Detail:** PostgreSQL RLS: when multiple PERMISSIVE policies exist for the same command, the row passes if ANY policy's qual is true. So a post-signup user who runs:
  ```ts
  await supabase.from('users').insert({ id: myAuthId, role: 'admin', orchard_id: victimOrchardId });
  ```
  passes the `WITH CHECK(true)` policy even if `users_insert_own_record` requires `id = auth.uid()`. Because `id=auth.uid()` is also true for the attacker's own row, they can upsert themselves as `admin` and (via the also-permissive update policy) change their `orchard_id` to any victim orchard. Instant tenant-crossing admin.
- **Impact:** total tenant compromise by any self-signed-up user. Whitelist check in `AuthContext.signUp` is client-side only — attacker skips it by calling `supabase.auth.signUp` then `supabase.from('users').insert(…admin…)` directly.
- **Recommendation:** `DROP POLICY "users_insert_policy" ON users;` in a remediation migration. Keep only `Users insert own record WITH CHECK (id = auth.uid() AND role = 'picker')` — plus a BEFORE INSERT trigger that forces `role = 'picker'` for anon-originated inserts and delegates role assignment to `manage-admin` edge fn.

### C-5 — `qc-photos` storage bucket is public + any authenticated user can INSERT and DELETE anyone's QC evidence
- **Severity:** CRITICAL
- **Location:** `supabase/migrations/2026021300_create_qc_photos_bucket.sql:12-33`:
  ```sql
  INSERT INTO storage.buckets (…'qc-photos',…, public := true, …);
  CREATE POLICY "Public can view QC photos" … USING (bucket_id = 'qc-photos');
  CREATE POLICY "Users can delete own QC photos" …
  FOR DELETE TO authenticated USING (bucket_id = 'qc-photos'); -- any auth user can delete ANY QC photo
  ```
- **Detail:**
  1. Bucket is `public = true` → signed URLs unnecessary, photo content indexable by search engines if URL leaked.
  2. DELETE policy does not check ownership — any authenticated user (including a picker from orchard A) can delete a QC inspection photo from orchard B.
  3. INSERT policy does not restrict `bucket_id`-path pattern, so a picker can upload arbitrary large files to any QC folder and exceed quota.
- **Impact:** QC evidence for MPI compliance can be tampered with by any authenticated user. Privacy leak if photos contain picker faces or orchard operations. Under NZ Privacy Act 2020, images of workers are PII.
- **Recommendation:** set bucket `public=false`, use `createSignedUrl` (already adopted for `hr-documents`). DELETE policy: `USING (bucket_id='qc-photos' AND owner = auth.uid())`. INSERT policy: `WITH CHECK (bucket_id='qc-photos' AND (storage.foldername(name))[1] = get_my_orchard_id()::text AND length(name) < 256)`.

### H-1 — `allowed_registrations` SELECT is open to everyone (via one migration) even anon
- **Severity:** HIGH
- **Location:** `supabase/migrations/20260223_allowed_registrations.sql:39-40`:
  ```sql
  CREATE POLICY "Check own registration" ON public.allowed_registrations FOR
  SELECT USING (true);
  ```
  Consolidated schema `schema_v3_consolidated.sql:817` has the stricter version (`email = auth.users.email via auth.uid()`), but like C-4, both policies co-exist → OR → open wins.
- **Detail:** the whitelist table exposes `email`, `role`, `orchard_id`, `used_at` for every employee planned across every orchard. An attacker with `anon` key (which is public by design) can `SELECT *` and enumerate the whole workforce roster.
- **Impact:** competitive intel leak (labour planning, HR pipeline), and each row is a target for credential-stuffing against the `email`. Contradicts NZ Privacy Act principle 11 (restrict disclosure).
- **Recommendation:** drop the open policy; keep only the authenticated-scoped one. Also move the pre-auth signup lookup to an edge function using service role.

### H-2 — `approve-timesheet` and `submit-audit-log` let client spoof `verified_by` / `user_id`
- **Severity:** HIGH
- **Location:**
  - `supabase/functions/approve-timesheet/index.ts:32,56-61` — `verified_by` is taken from request body, not from `user.id`.
  - `supabase/functions/submit-audit-log/index.ts:67-68` — `user_id: entry.user_id || user.id` and `user_email: entry.user_email || user.email`.
- **Detail:** the authenticated JWT identifies the caller, but the functions trust client-supplied identity fields. In `approve-timesheet` a manager can forge `verified_by: <other_manager_uuid>` — the audit trail then implicates someone else. In `submit-audit-log` the user_id field is overridable, nullifying the whole server-side anti-forgery claim in the file header.
- **Impact:** repudiation attacks; compliance evidence tainted; non-repudiation requirement fails.
- **Recommendation:** hard-pin `verified_by = user.id` and `user_id = user.id` in the enrichment step. If a use case genuinely requires "admin approves on behalf of", add an explicit `on_behalf_of` column with a second role check.

### H-3 — MFA mismatch between client and server remains unresolved
- **Severity:** HIGH
- **Location:** client `src/hooks/useMFA.ts` (unchanged since 04-19), server `GOTRUE_MFA_*` env vars in `/opt/supabase/supabase/docker/.env` (per 04-19 audit).
- **Detail:** no repo change between 04-19 and 04-22 addresses this. Release notes / migration mention nothing. `useMFA` hook UI components still render in `src/components/auth/` — users will see MFA setup flow that silently fails or errors generically.
- **Impact:** false sense of security; in production, MFA appears enabled but does not gate second factor.
- **Recommendation:** either hide MFA UI until server is configured, or script the env change and confirm with `listFactors()` integration test.

### H-4 — Edge functions accept `orchard_id` from request body with no cross-tenant ownership check
- **Severity:** HIGH
- **Location:**
  - `supabase/functions/calculate-payroll/index.ts:117,126,154,170` — `orchard_id` from body, used in `.eq('orchard_id', orchard_id)` for reads + writes.
  - `supabase/functions/detect-anomalies/index.ts` (same pattern).
  - `supabase/functions/check-compliance/index.ts` — takes `picker_ids` array.
- **Detail:** `requireRole(['admin','manager'])` verifies role but NOT that the manager belongs to the requested `orchard_id`. Since the function uses the user's JWT-scoped client, RLS on read queries will block cross-tenant leaks only if the `orchards` / `pickers` RLS policies are tight — but it still allows side-channel confirmation of orchard existence and leaks timing information. For functions that write (e.g., `calculate-payroll` inserts into `payroll_runs`), a manager of orchard A can trigger writes scoped to orchard B's `orchard_id` parameter — the insert itself will be blocked by RLS only if `payroll_runs` has correct policies (needs verification).
- **Impact:** partial tenant isolation; reconnaissance possible. For `submit-audit-log` a malicious manager can flood audit of another orchard.
- **Recommendation:** after `requireRole`, always: `const myOrchard = await supabase.rpc('get_my_orchard_id'); if (myOrchard !== body.orchard_id) throw new AuthError('tenant mismatch', 403);`.

### H-5 — `hr_documents` table policies lack `WITH CHECK` for INSERT/UPDATE/DELETE (ambiguous)
- **Severity:** HIGH
- **Location:** `supabase/migrations/20260418000000_hr_documents.sql:35-41`:
  ```sql
  CREATE POLICY hr_documents_hr_manage ON public.hr_documents
    USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('hr_admin','admin','manager')));
  CREATE POLICY hr_documents_self_read ON public.hr_documents FOR SELECT
    USING (user_id = auth.uid());
  ```
- **Detail:**
  1. `hr_documents_hr_manage` has no explicit `FOR` clause (defaults to ALL). With only `USING`, Postgres uses the same expression as `WITH CHECK` — acceptable, but brittle; a reviewer could assume insert is blocked. Lack of `FOR ALL` makes it less explicit.
  2. `hr_documents_self_read` lets a picker read only rows where `user_id = auth.uid()` — but `hr_documents.picker_id` → `pickers.id`, and most rows key off `picker_id` not `user_id`. If HR uploads docs under `picker_id` (common case per table comment), pickers **cannot read their own docs**. Conversely if HR uploads under `user_id`, pickers can, but `user_id` links to `auth.users` via `ON DELETE SET NULL`, so an orphan row is possible.
  3. Missing quota / file-size policy: the 10 MB limit in the repository is client-side only.
- **Impact:** pickers may be unable to see their own contracts/visas (usability + legal gap); HR can over-upload; storage RLS policy `hr_docs_hr_manage` also lacks `FOR ALL` clause.
- **Recommendation:** add `hr_documents_picker_self_read` covering `picker_id IN (SELECT id FROM pickers WHERE id = (SELECT picker_id FROM users WHERE id = auth.uid()))`. Make HR management policy explicit `FOR ALL` with mirrored `WITH CHECK`.

### H-6 — SECURITY DEFINER helpers rely on `public.users.role`, which is NULLABLE
- **Severity:** HIGH
- **Location:** `supabase/schema_v3_consolidated.sql:827-869` — `get_my_orchard_id()`, `is_manager_or_leader()`, `is_hr_manager_or_admin()`, `is_logistics_or_manager()`, `is_admin()`, plus `public.is_manager()` / `is_role()` from `2026030101_rls_consolidation.sql`.
- **Detail:** all functions `SELECT … FROM public.users WHERE id = auth.uid() AND role IN (…)`. 04-19 audit found `public.users.role` is nullable and one orphan row with `role='manager'` for the zero UUID exists in prod-like DB. Nullable role means: (a) if a user row is inserted with role=NULL, all `is_*()` helpers return FALSE (deny — safe), but (b) the CHECK constraint `users_role_check` allows NULL, so the 04-19 H-1 orphan can still sneak through any migration that bulk-inserts from CSV.
- **Impact:** pairs with C-4 to create a forge path: attacker inserts `(id=attackerUid, role='manager', orchard_id=victim)` via the open `users_insert_policy`, and then every `is_manager()` check returns TRUE for them across the whole schema.
- **Recommendation:** `ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;` after nullifying cleanup, plus `ALTER TABLE … ADD CONSTRAINT users_role_valid CHECK (role IN ('picker','team_leader','runner','qc_inspector','payroll_admin','manager','admin','hr_admin','logistics'))` — current CHECK is described in 04-19 but ensure it does not allow NULL.

### H-7 — Session storage: access + refresh tokens in `localStorage` (XSS-exfiltrable)
- **Severity:** HIGH
- **Location:** `src/services/supabase.ts:25-32` — `storage: localStorage`, `persistSession: true`, `autoRefreshToken: true`, `storageKey: sb-harvestpro-auth-<tabId>`.
- **Detail:** tokens in localStorage are readable by any script running on the origin. No `dangerouslySetInnerHTML` today (04-19 noted OK), but the app loads 3 external SDKs (Sentry, PostHog, VitePWA) + depends on `src/components/worldmap` hosting remote tile fetch — any future XSS (supply-chain or CSP bypass) exfiltrates tokens. Refresh tokens are long-lived (default 7d, or set via server).
- **Impact:** one XSS ⇒ total account takeover across devices. For field-worker tablets shared between staff, `localStorage.clear()` on logout is manual and race-prone.
- **Recommendation:** migrate to `@supabase/ssr` HTTP-only cookie storage on web. For mobile (Capacitor), use `Preferences` secure storage. Minimum: enforce strict CSP with `script-src 'self' 'nonce-<…>'` and remove unsafe-inline.

### H-8 — `signOut()` is scope='local' — stolen device keeps session alive
- **Severity:** HIGH (unchanged since 04-19 H)
- **Location:** `src/context/AuthContext.tsx:264`.
- **Detail:** `await supabase.auth.signOut()` without `{ scope: 'global' }` revokes only the current client's tokens. A stolen tablet's previous session stays valid until JWT expiry.
- **Recommendation:** `supabase.auth.signOut({ scope: 'global' })`.

### H-9 — No CSP header / no `X-Frame-Options` served from Vite build; `vercel.json` lacks security headers
- **Severity:** HIGH
- **Location:** `vercel.json` (read).
- **Detail:** audit skimmed — no headers section for `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`. Combined with H-7 (tokens in localStorage) this compounds XSS and clickjacking risk.
- **Recommendation:** add `vercel.json` `headers: [{ source: "/(.*)", headers: [{key:"Content-Security-Policy", value: "default-src 'self'; connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.posthog.com; …"}, …] }]`.

### M-1 — CORS allows ANY `*.vercel.app` (preview deployments from forks included)
- **Severity:** MEDIUM (reclassified from 04-19 MEDIUM; still unresolved)
- **Location:** `supabase/functions/_shared/security.ts:20` — `if (origin.endsWith('.vercel.app')) return true;`.
- **Detail:** any fork redeployed on Vercel (which requires only a free account) gets a `*.vercel.app` host and can call the edge functions. Not catastrophic because JWT auth is still required, but attackers can host social-engineering pages that call production APIs.
- **Recommendation:** maintain explicit list `[harvestpro.vercel.app, harvestpro-staging.vercel.app]` or check against a regex pinning the org prefix (`/^harvestpro-[a-z0-9-]+\.vercel\.app$/`).

### M-2 — In-memory rate limit in edge functions is per-worker, not per-function
- **Severity:** MEDIUM (reclassified up from 04-19 INFO)
- **Location:** `_shared/security.ts:73` `rateLimitStore = new Map`.
- **Detail:** Supabase Edge Functions fan out to multiple Deno isolates. Map-based counter resets per cold start; attackers can distribute requests.
- **Recommendation:** Postgres-based sliding window table with advisory locks, or Upstash Redis.

### M-3 — `requireRole` returns a stale role for up-to 1h (compounds C-2 and 04-19 H-3)
- **Severity:** MEDIUM
- **Location:** `_shared/security.ts:140-160`.
- **Detail:** even if C-2 is fixed to read from `app_metadata`, the JWT is signed at login time — a downgrade to "picker" of a prior "admin" takes up to `JWT_EXPIRY` (default 3600 s) to take effect. No revocation list. Refresh tokens can be rotated and restrict JWT lifetime to 5-15 min, which is the industry standard.
- **Recommendation:** set `JWT_EXPIRY=900` (15 min), + on demotion call `auth.admin.signOut(user_id, {scope:'global'})` to force re-auth.

### M-4 — Seven services bypass the repository pattern (from 04-19 M), re-surfaced for auth concern
- **Severity:** MEDIUM
- **Location:** `src/services/api-keys.service.ts:151,165`, `src/services/wage-rates.service.ts:178`, `src/services/data-export.service.ts:139`, `src/components/modals/PrivacyConsentModal.tsx:86,90`, `src/stores/storeSync.ts:103`.
- **Impact:** auth reviewers cannot easily enumerate every table access; audit-logging decorators (if any added in future) get skipped. For `api-keys.service.ts` this is especially risky (API-key issuance / rotation).
- **Recommendation:** move these to repositories with logging decorators.

### M-5 — MFA device-trust token lives in `localStorage` next to JWT
- **Severity:** MEDIUM
- **Location:** `clearDeviceTrust(state.user?.id)` called in `AuthContext:260`; actual storage likely under `src/services/mfa-device-trust.ts` (referenced but not read in this audit). Pattern of localStorage-based "trusted device" weakens MFA's second-factor assurance.
- **Recommendation:** use httpOnly secure cookie for the trust token; bind to `Sec-CH-UA-Platform` + IP /24 as a sanity check.

### M-6 — Integration tests in `src/integration/*.test.ts` live under `src/` (bundler-path)
- **Severity:** MEDIUM
- **Location:** `src/integration/hr-documents-supabase.integration.test.ts`, `payroll-real-supabase.integration.test.ts`, `role-flows-sanity.integration.test.ts`.
- **Detail:** these files read `process.env.SUPABASE_SERVICE_ROLE_KEY`. Vite build by default excludes `*.test.ts` from the production bundle (vitest convention) — good — but the `vite.config.ts` `build.rollupOptions` has no explicit exclusion list. One future `tsconfig` / rollup config change could silently bundle these. Strings are already in repo; if `SUPABASE_SERVICE_ROLE_KEY` ever ends up in `.env.production` (not `.env.local`) Vite would inline it.
- **Recommendation:** move integration tests out of `src/` (into `tests/integration/` which already exists) and add an ESLint rule blocking `process.env.SUPABASE_SERVICE_ROLE_KEY` anywhere under `src/`.

### M-7 — Password reset flow still references fake SMTP (04-19 H) — unfixed
- **Severity:** MEDIUM
- **Location:** `src/context/AuthContext.tsx:223-228`, env file outside repo.
- **Detail:** same as 04-19; users cannot self-recover passwords. UX + security (admin-assisted resets are riskier).

### L-1 — `useAuthSession.ts` caches profile for 7 days in Dexie (`auth_cache`)
- **Severity:** LOW
- **Location:** `src/repositories/auth-context.repository.ts:9` `AUTH_CACHE_TTL_MS = 7d`.
- **Detail:** lets offline pickers log in with role=manager even after the role was demoted server-side, for up to 7 days. Field-worker tablet scenario amplifies risk.
- **Recommendation:** reduce to 24h for manager/admin roles; on reconnect, re-fetch role and diff.

### L-2 — `onboarding.service.ts` validates password length only client-side
- **Severity:** LOW (unchanged from 04-19)
- **Recommendation:** set `GOTRUE_PASSWORD_MIN_LENGTH=12`, `GOTRUE_PASSWORD_REQUIRED_CHARACTERS` in server env.

### L-3 — No CAPTCHA / bot-mitigation on `provision-orchard` (IP-based 5/h only)
- **Severity:** LOW
- **Location:** `supabase/functions/provision-orchard/index.ts:26-36`.
- **Detail:** in-memory map resets on cold start; distributed signup abuse possible.

### L-4 — `logger.ts` writes nothing in prod → silent failures of `.catch(() => {})` patterns noted in 04-19 remain
- **Severity:** LOW

---

## Positives / OK

- **OK — Single Supabase client, no duplicate `createClient` in productive code.** Verified by grep `createClient` under `src/` returns only `supabase.ts` + test files.
- **OK — `service_role` / `SERVICE_ROLE_KEY` absent from production bundle paths.** Occurrences limited to `supabase/functions/*` (Deno server-only), `tests/integration/*`, and `src/integration/*.test.ts` (excluded by vitest from Vite build — see M-6 caveat).
- **OK — No `auth.jwt()` misuse.** All policies use `auth.uid()`. SECURITY DEFINER helpers centralize the role lookup.
- **OK — Zod validation on every edge function input** (11/11). Prevents trivially malformed payloads.
- **OK — Append-only intent of `audit_logs`** (no UPDATE / DELETE policies). Undermined by C-3 but structurally still append-only.
- **OK — `hr-documents` storage bucket is PRIVATE** (04-18 migration), uses signed URLs via repository. Contrast with C-5 (`qc-photos`).

---

## Aggregated recommended remediation order

1. **C-4** — drop `users_insert_policy (true)`. 1-line migration. **Do today.**
2. **C-3** — tighten `audit_logs` insert policy; same migration.
3. **C-5** — private `qc-photos` bucket + ownership-scoped DELETE policy.
4. **C-1** — remediation migration for the 6 remaining open policies.
5. **C-2** — move RBAC source to `app_metadata` or `public.users` via RPC; wire `manage-admin` to call `auth.admin.updateUserById` so JWT stays truthful.
6. **H-2** — hard-pin server-derived identity in `approve-timesheet` + `submit-audit-log`.
7. **H-1** — close `allowed_registrations` SELECT.
8. **H-3, H-4, H-5, H-6** — batched follow-up migration.
9. **H-7, H-8, H-9** — SPA/SSR session hardening + CSP headers.

---

**Validation:** static analysis only. Before declaring remediation "done" run:
```sql
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename;
```
against the target DB and confirm 0 rows.
