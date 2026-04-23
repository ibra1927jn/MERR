# Supabase RLS + Edge Functions + Migrations — Research for HarvestPro NZ

**Date:** 2026-04-22
**Context:** HarvestPro NZ audit found 14 tables with `USING(true) WITH CHECK(true)` policies (effectively open to any authenticated user), 11 Edge Functions with varying security hardening, ~40 migrations, and a `users` row `00000000-0000-0000-0000-000000000000` with `role='manager'` that has no matching `auth.users` entry. Plus MFA code in client but `GOTRUE_MFA_TOTP_*_ENABLED` unset on server. This doc compares Supabase with comparable stacks and lays out the fixes.

Tags: `[confirmed]` = documented by vendor or reproduced; `[approximate]` = inferred from community sources or partial docs; `[deprecated]` = legacy pattern, do not ship.

---

## 1. Anti-patterns — lead with the problem `[confirmed]`

### 1.1 The `USING(true) WITH CHECK(true)` anti-pattern

What it looks like in HarvestPro:

```sql
CREATE POLICY "allow_all" ON timesheets FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

Effect: **any authenticated user in the system can SELECT/INSERT/UPDATE/DELETE any row in that table.** In a multi-tenant system (per-orchard) this is a full cross-tenant breach. The only thing standing between tenant A and tenant B's data is the app layer — and the app layer cannot be trusted once anyone obtains an anon-key + a valid JWT.

Why it appears:

1. **Dev-velocity shortcut.** Supabase's quick-start docs sometimes show `USING(true)` for public reference tables (`countries`, `tax_brackets`). Copy-pasted into tenant data tables.
2. **RLS debugging.** When a legit policy fails mysteriously (the most common Supabase github discussion topic), devs widen to `true` "just to see if RLS is the problem" and forget to narrow again.
3. **Junction tables are forgotten.** People RLS the main table, skip the join tables (`orchard_members`, `timesheet_approvers`) assuming "no one queries them directly." PostgREST exposes every table in the `public` schema by default.
4. **Missing `TO authenticated`.** A policy with `USING(true)` and no role restriction grants access to `anon` too — worse still.

How to catch it before prod `[confirmed]`:

```sql
-- Audit query: find policies that are effectively open
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual IS NULL OR qual = 'true')
  AND (with_check IS NULL OR with_check = 'true');
```

Ship this as a migration test that FAILS CI if it returns any rows on tenant-scoped tables. Whitelist only truly public reference tables explicitly.

### 1.2 Other anti-patterns we've seen

| # | Anti-pattern | Why bad | Fix |
|---|---|---|---|
| A2 | `using (auth.uid() = user_id)` without wrapping in `(select …)` | Re-evaluates `auth.uid()` per-row. Supabase benchmark: 179 ms → 9 ms after wrap (94.97% faster). | `using ((select auth.uid()) = user_id)` |
| A3 | No `TO authenticated` | Policy is evaluated for every `anon` request too. 99.78% perf hit when anon hits the endpoint. | Add `TO authenticated`. |
| A4 | Policy column not indexed | Seq scan on every query. | `CREATE INDEX ... ON t(user_id)` + `orchard_id`. |
| A5 | Trusting `raw_user_meta_data` for role lookup | User can set their own `user_metadata` via `supabase.auth.updateUser()`. Privilege escalation. | Use `app_metadata` (admin-only) OR a `public.users.role` column with restrictive UPDATE policy. |
| A6 | `SELECT` policy missing on tables that have `UPDATE` policies | UPDATE silently returns 0 rows when user can't SELECT the row. App thinks it "worked." | Always define both SELECT and the mutation policies. |
| A7 | `security definer` helper in `public` schema | If it's grantable to `authenticated`, it becomes an RLS-bypass primitive. | Move to `private` or `auth` schema, `REVOKE ALL FROM PUBLIC`. |
| A8 | Recursive policy (policy on table `t` queries `t`) | Query hangs or errors. | Use a `security definer` function so the inner query runs without RLS. |
| A9 | Join in policy: `auth.uid() IN (SELECT user_id FROM team_user WHERE team_id = t.team_id)` | Join per row. | Flip to: `t.team_id IN (SELECT team_id FROM team_user WHERE user_id = (select auth.uid()))`. 9,000 ms → 20 ms. |
| A10 | Client-writable `created_at`, `id`, `verified` columns | Users can forge timestamps, collide UUIDs, self-promote to `verified=true`. | Column-level grants + BEFORE-INSERT triggers that overwrite these columns from JWT. (Supabase issue #32816 documents this gap in the official docs.) |
| A11 | Ghost users — `public.users(id)` with no `auth.users(id)` match | See section 7 — attack vector. | FK with `ON DELETE CASCADE` + audit trigger. |

---

## 2. Comparative table — Supabase vs alternatives `[confirmed]`

| Dimension | Supabase (PostgREST+GoTrue) | Hasura | Firebase Firestore | Nhost (Hasura-based) | Appwrite | Custom PostgREST |
|---|---|---|---|---|---|---|
| **Authorization engine** | Postgres RLS (SQL) | GraphQL layer permissions + session vars | Declarative rules DSL (separate file) | Same as Hasura | Resource-level ACL (JSON) | Postgres RLS |
| **Multi-tenant model** | RLS policies on `tenant_id` + membership table | Session vars (`X-Hasura-Org-Id`) + boolean expr | `request.auth.token.org_id` in rules | Session vars | Teams + team roles per-resource | RLS + GUCs |
| **Role model** | Postgres roles (`anon`, `authenticated`, `service_role`) + app-defined roles in `public.users.role` | Named roles with permission rules; role sent via header | Custom claims in ID token | Hasura roles | Built-in `any`/`users`/`guests` + team roles | Postgres roles |
| **Column-level security** | Yes (GRANT/REVOKE + view) but manual | Yes, first-class | Partial (via rules) | Yes | No (document-level only) | Yes |
| **Write-time validation** | `WITH CHECK` clause + triggers | Pre/post-update check constraints | `allow write: if …` | Same as Hasura | Limited | Same as Supabase |
| **Realtime + authz** | RLS re-applied per message, cached per connection | Subscriptions honor permissions | Rules evaluated per change | Honored | Realtime honors ACL | Manual via `LISTEN/NOTIFY` |
| **Migration tooling** | `supabase migration new` + `db push` (young; v2 stabilized ~2024) | Hasura migrations (YAML + SQL, mature) | No schema migrations (schemaless) | Hasura migrations | Appwrite migrations (limited) | Use `sqitch`, `dbmate`, `flyway` |
| **Audit trail built-in** | No — roll your own (`audit_logs` table + triggers or `pgaudit`) | No (Hasura Enterprise has event triggers) | Via Cloud Audit Logs (paid) | No | Limited | `pgaudit` extension |
| **MFA** | Native TOTP + Phone (AAL claim in JWT); self-hosted needs explicit env vars | Delegated to Auth provider | Built-in (SMS/TOTP) | Delegated | Native | Roll your own |
| **Maturity (2026)** | RLS stable; CLI v2 maturing; Edge Functions still evolving | Mature (7+ yrs), enterprise-proven | Very mature, locked to Google | Younger, thin layer on Hasura | Mature BaaS, not relational | PostgREST mature, glue is DIY |
| **OSS / self-host** | Fully OSS, docker-compose | OSS CE + paid Cloud/Enterprise | Closed, Google-hosted only | OSS, self-hostable | OSS, self-hostable | OSS |
| **Strength for HarvestPro** | Native fit for 8-role per-orchard model | Would need rewrite to GraphQL | Not relational → poor fit for payroll/compliance joins | Same as Hasura | Would lose SQL power | Most control, most toil |

Takeaway for HarvestPro: staying on Supabase is correct; the bugs are in the RLS policies and the MFA config, not in the platform choice.

---

## 3. RLS patterns correctly for HarvestPro (per-orchard + 8 roles) `[confirmed]`

HarvestPro's roles (inferred from Edge Function names): `owner`, `admin`, `manager`, `supervisor`, `team_leader`, `runner`, `auditor`, `viewer`.

### 3.1 Foundation: tenant table + memberships

```sql
-- Tenants
CREATE TABLE orchards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users: public mirror of auth.users (never the source of truth for identity)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Memberships: scope a user to an orchard with a role
CREATE TYPE orchard_role AS ENUM
  ('owner','admin','manager','supervisor','team_leader','runner','auditor','viewer');

CREATE TABLE orchard_members (
  orchard_id UUID NOT NULL REFERENCES orchards(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  role       orchard_role NOT NULL,
  team_id    UUID, -- optional crew scoping for team_leader/runner
  PRIMARY KEY (orchard_id, user_id)
);

CREATE INDEX ON orchard_members (user_id);
CREATE INDEX ON orchard_members (orchard_id, role);
CREATE INDEX ON orchard_members (team_id) WHERE team_id IS NOT NULL;
```

The FK `users.id REFERENCES auth.users(id) ON DELETE CASCADE` closes the ghost-user attack vector (section 7). Current HarvestPro schema appears to lack this FK — first thing to add.

### 3.2 Security-definer helpers in a private schema

```sql
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.current_user_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY INVOKER AS
$$ SELECT auth.uid() $$;

-- Does caller have ANY role in this orchard?
CREATE OR REPLACE FUNCTION private.is_member(p_orchard UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, pg_temp AS
$$
  SELECT EXISTS (
    SELECT 1 FROM public.orchard_members m
    WHERE m.orchard_id = p_orchard
      AND m.user_id = auth.uid()
  )
$$;

-- Does caller hold AT LEAST this role in this orchard? (uses enum ordering)
CREATE OR REPLACE FUNCTION private.has_role(p_orchard UUID, p_min public.orchard_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, pg_temp AS
$$
  SELECT EXISTS (
    SELECT 1 FROM public.orchard_members m
    WHERE m.orchard_id = p_orchard
      AND m.user_id = auth.uid()
      AND m.role <= p_min  -- enum value: 'owner' < 'admin' < ... < 'viewer'
  )
$$;

-- Is caller in the same team as the row? (for runners/team_leaders)
CREATE OR REPLACE FUNCTION private.in_team(p_orchard UUID, p_team UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, pg_temp AS
$$
  SELECT EXISTS (
    SELECT 1 FROM public.orchard_members m
    WHERE m.orchard_id = p_orchard
      AND m.user_id = auth.uid()
      AND (m.role <= 'supervisor' OR m.team_id = p_team)
  )
$$;

REVOKE ALL ON FUNCTION private.is_member, private.has_role, private.in_team FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_member(UUID), private.has_role(UUID, public.orchard_role),
  private.in_team(UUID, UUID) TO authenticated;
```

`STABLE` enables the initPlan caching. `SECURITY DEFINER` + `SET search_path` prevents schema-injection privilege escalation.

### 3.3 Policies — the canonical shape

**Per-orchard data (e.g. `timesheets`)**:

```sql
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- READ
CREATE POLICY ts_select ON timesheets FOR SELECT TO authenticated
USING (
  private.is_member(orchard_id) AND (
    private.has_role(orchard_id, 'supervisor') OR   -- mgrs see all
    worker_id = (SELECT auth.uid()) OR              -- own rows
    private.in_team(orchard_id, team_id)            -- team_leader for their crew
  )
);

-- WRITE (runner can create own, supervisor can create for crew, manager anywhere)
CREATE POLICY ts_insert ON timesheets FOR INSERT TO authenticated
WITH CHECK (
  private.is_member(orchard_id) AND (
    worker_id = (SELECT auth.uid()) OR
    private.has_role(orchard_id, 'supervisor')
  )
);

CREATE POLICY ts_update ON timesheets FOR UPDATE TO authenticated
USING ( private.has_role(orchard_id, 'supervisor')
        OR (worker_id = (SELECT auth.uid()) AND status = 'draft') )
WITH CHECK ( private.has_role(orchard_id, 'supervisor')
        OR (worker_id = (SELECT auth.uid()) AND status = 'draft') );

CREATE POLICY ts_delete ON timesheets FOR DELETE TO authenticated
USING ( private.has_role(orchard_id, 'admin') );

CREATE INDEX ON timesheets (orchard_id, worker_id);
CREATE INDEX ON timesheets (orchard_id, team_id);
CREATE INDEX ON timesheets (worker_id);
```

**Role hierarchy via enum ordering** — Postgres enum values have a defined order (declaration order). `m.role <= 'supervisor'` matches owner/admin/manager/supervisor. Cleaner than 8 separate policies.

**Restrictive MFA policy on sensitive tables** (`audit_logs`, `payroll_runs`):

```sql
CREATE POLICY aal2_required ON payroll_runs AS RESTRICTIVE
FOR ALL TO authenticated
USING ( (SELECT auth.jwt()->>'aal') = 'aal2' );
```

Restrictive policies compose with AND over permissive ones — perfect for layered requirements.

### 3.4 Column-level hardening for Supabase issue #32816 gaps

Client-writable columns are a separate layer from RLS. Solve with BEFORE triggers and `GRANT` minus the column:

```sql
-- Strip ability to write server-managed columns
REVOKE UPDATE(id, created_at, orchard_id, role) ON orchard_members FROM authenticated;

-- Overwrite timestamp on write regardless of what client sends
CREATE OR REPLACE FUNCTION private.set_timestamps() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.created_at := COALESCE(OLD.created_at, now());
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER set_timestamps_trg BEFORE INSERT OR UPDATE ON timesheets
FOR EACH ROW EXECUTE FUNCTION private.set_timestamps();
```

### 3.5 Testing pattern (pgTAP)

```sql
BEGIN;
SELECT plan(4);

-- Impersonate runner in orchard A
SELECT tests.authenticate_as('runner_a_uuid'::uuid);
SELECT results_eq(
  'SELECT count(*) FROM timesheets WHERE orchard_id = ''orchard_b''',
  ARRAY[0::bigint],
  'Runner in A cannot see orchard B timesheets');

SELECT is_empty(
  'UPDATE timesheets SET hours = 999 WHERE orchard_id = ''orchard_b'' RETURNING *',
  'UPDATE across orchards returns nothing (silent filter)');

-- Critical: RLS failures on SELECT/UPDATE/DELETE return empty, not error
-- Use is_empty() or results_eq(), NOT throws_ok()
SELECT throws_ok(
  'INSERT INTO timesheets(orchard_id, worker_id) VALUES (''orchard_b'', auth.uid())',
  '42501',
  'INSERT across orchards raises');

SELECT * FROM finish();
ROLLBACK;
```

Run this via `supabase test db` in CI on every PR. This is the single biggest leverage move HarvestPro can make.

---

## 4. Service role vs anon role — when to use which `[confirmed]`

| Path | Key | RLS | Use for |
|---|---|---|---|
| Browser → PostgREST | `anon` / `publishable` | Enforced | User-initiated CRUD that an RLS policy can express (most of the app) |
| Browser → Edge Function → supabase-js (user JWT forwarded) | `anon` + `Authorization: Bearer <user JWT>` | Enforced (as the user) | Business logic that belongs in a function but still acts as the caller |
| Edge Function → supabase-js with service role | `service_role` / `secret` | **Bypassed** | Cross-tenant reads (admin dashboards), trigger side-effects, operations the schema disallows to any single role (e.g. `manage-admin`, `calculate-payroll`) |
| Server job (cron) | `service_role` | **Bypassed** | Batch work, cleanup, scheduled exports |

**Hard rule:** service role key never ships to the browser, never appears in `PUBLIC_*` / `NEXT_PUBLIC_*` env vars, never leaves `_shared/service.ts` in the Edge Function bundle. In Edge Functions reference it as `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` (or new `SB_SECRET_KEY`) — the Edge Functions runtime exposes secrets prefixed appropriately.

**For each of the 11 HarvestPro functions**, decide explicitly:

| Function | Should use | Why |
|---|---|---|
| `approve-timesheet` | user JWT | Approval is the user acting as themselves; RLS already scopes to orchard. |
| `calculate-payroll` | service role | Reads many employees across role boundaries, writes to payroll table that no individual user should write directly. |
| `check-compliance` | service role (read-only) + audit log | Needs cross-tenant data for MBIE reports; audit every invocation. |
| `detect-anomalies` | service role | Background analytics. |
| `manage-admin` | service role, but behind a restrictive `has_role('admin')` check inside the function | Privilege escalation surface. |
| `manage-attendance` | user JWT | Scoped to caller's orchard/team. |
| `provision-orchard` | service role | Creates new tenant; no tenant exists yet. |
| `record-bucket` | user JWT | Runner recording own work. |
| `send-push` | service role (only to recipients caller has access to — validate in function) | Must not become a spam primitive. |
| `submit-audit-log` | user JWT, plus server-side validation | Caller identifies themselves; function appends with server timestamp/IP. |
| `api-v1` | depends on endpoint; default user JWT, escalate per route | External API surface — most careful. |

---

## 5. Edge Function security checklist `[confirmed]`

Every function should import a shared `_shared/security.ts` and call it first thing. Minimum contents:

```ts
// _shared/security.ts
import { z } from "npm:zod@3.23";

const ALLOWED_ORIGINS = new Set([
  "https://app.harvestpro.nz",
  "https://staging.harvestpro.nz",
  // add explicit dev origin; NEVER "*"
]);

export function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new HttpError(401, "no_auth");
  const token = auth.slice(7);
  const { data, error } = await supabase.auth.getClaims(token); // v2.95+
  if (error || !data?.claims?.sub) throw new HttpError(401, "invalid_jwt");
  return data.claims; // { sub, role, aal, app_metadata, ... }
}

// Simple per-user sliding window via Postgres
export async function rateLimit(userId: string, bucket: string, limit: number, windowSec: number) {
  const { data } = await admin.rpc("rate_limit_hit", { p_user: userId, p_bucket: bucket, p_limit: limit, p_window: windowSec });
  if (!data?.allowed) throw new HttpError(429, "rate_limited");
}

export function parseBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<T> {
  return req.json().then((b) => {
    const r = schema.safeParse(b);
    if (!r.success) throw new HttpError(400, "bad_request", r.error.issues);
    return r.data;
  });
}
```

Then every function is:

```ts
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });

  try {
    const claims = await requireUser(req);
    await rateLimit(claims.sub, "approve-timesheet", 30, 60);
    const input = await parseBody(req, ApproveTimesheetSchema);

    // ... business logic ...

    await logAudit(claims.sub, "approve-timesheet", input.timesheetId, { before, after });
    return json(200, { ok: true }, corsHeaders(origin));
  } catch (e) {
    return errorResponse(e, corsHeaders(origin));
  }
});
```

**Checklist per function:**

- [ ] CORS origin is an explicit allowlist, not `*` `[confirmed: Supabase default templates use * — HarvestPro must override]`
- [ ] OPTIONS preflight returns 200 with headers, no body processing
- [ ] JWT verified via `auth.getClaims()` (not the deprecated `verify_jwt=true` implicit flag)
- [ ] Request body validated by Zod schema at boundary; reject unknown fields (`.strict()`)
- [ ] Rate-limited per user+bucket (Postgres table with window, or upstash, or Supabase rate-limits when GA)
- [ ] Service-role client only in functions that justify it (see table in section 4)
- [ ] Every mutation writes to `audit_logs` with `{ user_id, action, resource_id, diff, ip, user_agent, created_at }`
- [ ] Errors do NOT leak internal details (stack, SQL text, service-role key echoes)
- [ ] Timeouts: set `Deno.serve({ onListen })` and wrap DB calls with a `Promise.race` against a ~5s timeout
- [ ] MFA-sensitive actions check `claims.aal === 'aal2'` and reject otherwise
- [ ] Idempotency key accepted on mutating endpoints (prevents double-submit on flaky 4G)
- [ ] Structured log line on entry and exit (observable in Supabase dashboard + Sentry)

Apply this to all 11 HarvestPro functions. `api-v1` and `manage-admin` get extra scrutiny.

---

## 6. Migration discipline `[confirmed]` + `[approximate]`

### 6.1 The Supabase CLI reality

Supabase CLI v2 is genuinely young (stabilized 2024). The migration story is improving but has sharp edges:

- `supabase migration new <name>` generates a timestamped file. `[confirmed]`
- `supabase db reset` tears down local DB and re-applies all migrations + `seed.sql`. `[confirmed]`
- `supabase db diff --schema public` diffs remote vs local, generates SQL. `[confirmed]`
- `supabase db push` applies new migrations to the linked remote project. `[confirmed]`
- **Branching / preview DBs** exist on Supabase Cloud (paid tier). Self-hosted users simulate with a second stack. `[approximate]`
- **No built-in shadow DB like Prisma.** The "shadow" is your local Docker stack. If your migration depends on production data shape you didn't capture in seed, you'll discover it only at `db push` time.
- **Down migrations: not a first-class concept.** Supabase expects forward-only. If you need a down, you author an explicit compensating migration.

### 6.2 Rules for HarvestPro's ~40 migrations

1. **Never edit a migration that has been deployed.** Even locally committed — commit a new one that compensates. Existing teammates and CI have already applied the old hash.
2. **Migrations must be idempotent-safe where possible.** Use `CREATE TABLE IF NOT EXISTS`, `CREATE POLICY IF NOT EXISTS` (PG 15+), `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Reduces the "I ran `db push` twice by accident" blast radius.
3. **Transactional migrations.** Supabase wraps each migration in an implicit transaction. **Do not put your own `BEGIN`/`COMMIT`** — Postgres transactions are flat (see memory: Supabase migration dry-run safety 2026-04-21). If you need a savepoint, use `SAVEPOINT` explicitly.
4. **Ship breaking changes in 3 phases:**
   - Phase A: add new column/table (nullable, default), deploy app reading old+new.
   - Phase B: backfill data; flip app to write new.
   - Phase C: drop old column/table.
   This is the **expand-contract** pattern. Attempting a single-migration rename on a live DB will cause writes to drop between `ALTER` and the app deploy.
5. **Every migration adds indexes for the RLS columns it touches.** RLS without indexes is the #1 Supabase perf pitfall.
6. **Every migration that alters a policy ships an accompanying pgTAP test.** Diff vs baseline in CI.
7. **Never run `db push` from a local machine directly against prod.** Push to a branch, CI runs `db reset` + pgTAP + `db push --dry-run`, only then a protected action applies to prod.
8. **Backup before every push.** `supabase db dump` to S3 with timestamp. Cloud has PITR; self-host does not unless you set up `wal-g`/`pgbackrest`.
9. **Seed data for reference tables only.** Never seed test user data into anything that might accidentally run against prod.
10. **Audit the migration directory periodically** — drift between `schema.sql` snapshot and the migration chain is how `USING(true)` policies sneak in years later.

### 6.3 Specific HarvestPro migration risks

- **40+ migrations with RLS already deployed means any RLS fix is a new migration, not an edit.** The 14 `USING(true)` policies need: migration that `DROP POLICY` + `CREATE POLICY` with correct scoping. Test with pgTAP locally, dry-run, deploy off-peak.
- **MFA toggle**: changing `GOTRUE_MFA_TOTP_*_ENABLED=true` on a live GoTrue container requires a restart. If users have factors enrolled on the client but server was disabled, enrollments may have been silently dropped — audit `auth.mfa_factors` before flipping.

---

## 7. The `00000000-0000-0000-0000-000000000000` ghost user — attack vectors `[confirmed]` + `[approximate]`

Observed state in HarvestPro:
- `public.users(id='00000000-...', role='manager', is_active=true)` exists.
- No corresponding `auth.users(id='00000000-...')` row.

What this enables:

1. **RLS bypass via owner-assignment.** [approximate] If any table has a trigger like `NEW.owner_id = COALESCE(NEW.owner_id, '00000000-...'::uuid)` (a common "system" default), rows created by a background job get the ghost's ownership. If other policies grant `manager` role broad access (`private.has_role(..., 'manager')`), anyone who can become the ghost can see those rows. Check all `DEFAULT` clauses on `owner_id`/`created_by` columns.

2. **JWT-forgery reach.** [confirmed] Any actor that obtains/guesses the JWT signing secret can mint a JWT with `sub='00000000-...'`. That token now claims `authenticated` role with a valid `public.users` row *and* `role='manager'` — full manager access to every orchard that has the ghost in `orchard_members`. If the ghost isn't a member of any orchard, blast radius depends on whether helper functions check membership before role. This is why `private.has_role()` must always `is_member()` first.

3. **Service-role foot-gun.** [approximate] If any Edge Function or cron job calls `admin.from('X').insert({ created_by: '00000000-...' })` as a "system" user, it creates records that no real user can audit against — breaks the audit trail. The audit log now has actions attributed to a user that "does not exist."

4. **MFA bypass for ghost.** [confirmed] `auth.mfa_factors` is keyed by `user_id → auth.users(id)`. A ghost that lives only in `public.users` has no MFA factors and cannot have any — any AAL2-enforced policy that trusts `public.users.role` without checking `auth.users` + `auth.mfa_factors` will admit the ghost at AAL1.

5. **Password reset / takeover path.** [approximate] If an attacker can induce GoTrue to create `auth.users(id='00000000-...')` (e.g., via a signup flow that honors a client-supplied `id`, or a restored backup), the `public.users` row — with `role='manager'` — is now *attached to a real, attacker-controlled credential*. Instant account takeover with manager role in every orchard where the ghost is a member.

**Immediate fixes:**

```sql
-- 1. Block any further divergence
ALTER TABLE public.users
  ADD CONSTRAINT users_id_matches_auth
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

-- (the ALTER will itself fail if ghosts exist — which is the point.
-- Resolve with the cleanup below first.)

-- 2. Find all ghosts
SELECT u.id, u.role, u.created_at
FROM public.users u
LEFT JOIN auth.users a ON a.id = u.id
WHERE a.id IS NULL;

-- 3. Decide per-row: either delete, or reassign owned rows to a real admin then delete.
--    For the 00000000 ghost: almost certainly delete + investigate who created it.

-- 4. Audit every table with a DEFAULT or trigger that could produce '00000000'
SELECT table_schema, table_name, column_name, column_default
FROM information_schema.columns
WHERE column_default LIKE '%00000000%';

-- 5. Tighten helper: never grant role without active membership
-- (already shown in section 3.2: has_role joins orchard_members)
```

---

## 8. MFA configuration for self-hosted `[confirmed]`

There is a known defect (supabase/cli#3737) where `supabase init` generates `config.toml` with `auth.mfa.totp.enroll_enabled = false` and `auth.mfa.totp.verify_enabled = false`, contradicting the docs which state both default to `true`. For self-hosted docker-compose, the equivalent env vars must be set explicitly.

**Required env vars** on the GoTrue (auth) container:

```env
GOTRUE_MFA_ENABLED=true
GOTRUE_MFA_TOTP_ENROLL_ENABLED=true
GOTRUE_MFA_TOTP_VERIFY_ENABLED=true
# Optional — phone factor (SMS TOTP). Usually off unless you run Twilio.
GOTRUE_MFA_PHONE_ENROLL_ENABLED=false
GOTRUE_MFA_PHONE_VERIFY_ENABLED=false
GOTRUE_MFA_MAX_ENROLLED_FACTORS=10

# Password hardening (not MFA but same config block)
GOTRUE_PASSWORD_MIN_LENGTH=12
GOTRUE_PASSWORD_REQUIRED_CHARACTERS=abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789:!@#$%^&*()

# JWT
GOTRUE_JWT_EXP=3600   # 1h; refresh token does the heavy lifting
GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED=true
GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL=10

# Reauth for sensitive changes
GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION=true
```

**What breaks if MFA is on in client but off on server** (HarvestPro's current state):

1. `supabase.auth.mfa.enroll()` calls the `/factors` endpoint. GoTrue with enroll disabled returns **422 Unprocessable Entity**. The app's "Enable MFA" button fails mysteriously for every user.
2. Users who already enrolled (before the server flip) still have rows in `auth.mfa_factors` but cannot `challenge`/`verify` — they're effectively locked out of AAL2 but the JWT still issues at AAL1, so they silently *lose* the protection they thought they had without any audit event.
3. Any RLS policy `USING ((select auth.jwt()->>'aal') = 'aal2')` now denies *everyone*, because no one can climb to aal2. If HarvestPro has such policies on `payroll_runs` / `audit_logs`, those tables become entirely inaccessible until either MFA is enabled server-side or the policy is widened.
4. Compliance risk: MBIE / audit trail expectations for payroll systems in NZ assume MFA on financial and compliance data. Disabling at the server while claiming MFA in the product is a misrepresentation.

**Rollout plan**:
1. Audit current `auth.mfa_factors`: `SELECT user_id, factor_type, status, created_at FROM auth.mfa_factors;` — any rows here while server MFA is off = zombie factors.
2. Enable env vars, restart GoTrue, verify `/auth/v1/factors` returns 200 for an enrolled test user.
3. Prompt all admin/manager users to enroll within 14 days.
4. After deadline, apply restrictive AAL2 policies on the sensitive tables.

---

## 9. Audit logging `[confirmed]`

Target shape of `audit_logs`:

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID REFERENCES auth.users(id),
  actor_ip INET,
  actor_ua TEXT,
  orchard_id UUID,
  action TEXT NOT NULL,              -- e.g. 'timesheet.approve'
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  before JSONB,
  after  JSONB,
  metadata JSONB
);
CREATE INDEX ON audit_logs (orchard_id, occurred_at DESC);
CREATE INDEX ON audit_logs (actor_id, occurred_at DESC);
CREATE INDEX ON audit_logs (action, occurred_at DESC);

-- Append-only: revoke UPDATE/DELETE even from service_role via a revoke migration
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC, authenticated;
-- For service_role, use a trigger that raises on UPDATE/DELETE.
```

Two complementary mechanisms:

1. **Application-level** via `submit-audit-log` Edge Function and direct calls inside mutating functions. Advantage: rich context (intent, user-facing action name, before/after diff). Disadvantage: can be skipped if dev forgets.
2. **Database-level** via generic triggers on sensitive tables that auto-append to `audit_logs`. Advantage: cannot be forgotten. Disadvantage: lacks intent (can't tell "timesheet rejected" from "timesheet edited").

Ship both. They cross-check each other.

---

## 10. Realtime + RLS interaction `[confirmed]`

- `realtime.messages` has its own RLS; set it up for any private channel.
- `postgres_changes` subscriptions are filtered by the subscriber's RLS on the underlying table — but note the policy is evaluated **at connection time** and cached for the connection's lifetime. Revoking a user's membership doesn't disconnect them until they reconnect or push a new `access_token`.
- **Implication for HarvestPro**: when an admin revokes a user from an orchard, push a `supabase.realtime.setAuth(null)` from server → client (or force-disconnect) to avoid 1–24h of lingering real-time access.
- Realtime with many private channels + complex RLS = connection latency. Budget for it.

---

## 11. Storage RLS `[confirmed]`

If HarvestPro stores signed timesheets, QR labels, or compliance PDFs, the same rules apply to `storage.objects`:

```sql
CREATE POLICY orchard_scoped_read ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'harvestpro-docs'
  AND private.is_member( (storage.foldername(name))[1]::uuid )
);

CREATE POLICY orchard_scoped_write ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'harvestpro-docs'
  AND (storage.foldername(name))[1]::uuid = ANY(
    SELECT orchard_id FROM orchard_members WHERE user_id = (select auth.uid())
  )
);
```

Convention: `bucket/<orchard_id>/<resource_type>/<file>`. Makes RLS tractable.
For signed URLs (e.g. emailing a PDF link), generate via service role with a short TTL; never make the bucket public.

---

## 12. Summary action list for HarvestPro

| # | Action | Owner | Effort | Priority |
|---|---|---|---|---|
| 1 | Remove ghost user `00000000-…` after investigation; add FK `users.id → auth.users.id ON DELETE CASCADE` | DB | S | P0 |
| 2 | Replace all 14 `USING(true)` policies with scoped ones (section 3.3 pattern) | DB | L | P0 |
| 3 | Add CI check: fail build if any `pg_policies` row has `qual='true'` on tenant tables | CI | S | P0 |
| 4 | Enable `GOTRUE_MFA_TOTP_*_ENABLED=true` server-side + audit zombie factors | Infra | S | P0 |
| 5 | Add pgTAP test suite — at minimum 1 positive + 1 negative case per policy | DB | L | P1 |
| 6 | Apply `_shared/security.ts` pattern (CORS allowlist, Zod, rate-limit, audit) to all 11 functions | Backend | M | P1 |
| 7 | Add indexes on every column used in USING/WITH CHECK | DB | S | P1 |
| 8 | Replace `USING(auth.uid()=x)` with `USING((select auth.uid())=x)` and add `TO authenticated` everywhere | DB | M | P2 |
| 9 | Implement generic audit-log triggers on sensitive tables to backstop app-level logging | DB | M | P2 |
| 10 | Document service-role vs user-JWT decision for each of 11 functions; flag exceptions | Backend | S | P2 |

---

## 13. Honest caveats

- Supabase is still young as a platform (GoTrue MFA GA 2023, Edge Functions runtime still evolving toward 2026 stability, CLI v2 only recent). Expect breaking changes between minor CLI versions; pin exactly in CI.
- RLS is hard. The Supabase docs themselves have acknowledged gaps (issue #32816). Treat "my policies are correct" as a claim that needs pgTAP proof, not a default.
- OSS best practices for Supabase are still crystallizing — Makerkit, Supabase's own troubleshooting page, and community discussions are the current truth. This doc synthesizes 2025–2026 state; revisit in 12 months.
- The 14 open policies in HarvestPro are embarrassing but not unique — it's the *default failure mode* of Supabase adoption. The cure is automation (CI check, pgTAP, audit query) not just a one-time fix, because this class of bug will reappear.

---

## Sources

- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase — Securing Edge Functions (JWT)](https://supabase.com/docs/guides/functions/auth)
- [Supabase — Edge Functions CORS](https://supabase.com/docs/guides/functions/cors)
- [Supabase — Auth MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase — Password Security](https://supabase.com/docs/guides/auth/password-security)
- [Supabase — Auth Rate Limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase — Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase — Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Supabase CLI — Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Supabase — AI Prompt: Create RLS Policies](https://supabase.com/docs/guides/getting-started/ai-prompts/database-rls-policies)
- [Supabase issue #32816 — RLS documentation gaps leading to vulnerabilities](https://github.com/supabase/supabase/issues/32816)
- [Supabase CLI issue #3737 — MFA config.toml defaults mismatch](https://github.com/supabase/cli/issues/3737)
- [Makerkit — Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [DEV — Supabase RLS in Production: Patterns That Actually Work](https://dev.to/whoffagents/supabase-row-level-security-in-production-patterns-that-actually-work-2l78)
- [AntStack — Multi-Tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [Hasura — Permissions Docs](https://hasura.io/docs/latest/auth/authorization/permissions/index/)
- [Firebase — Firestore Rules Structure](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Appwrite — Permissions](https://appwrite.io/docs/advanced/platform/permissions)
- [supabase-cache-helpers (psteinroe)](https://github.com/psteinroe/supabase-cache-helpers)
- [Supabase — RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) (referenced via search; URL returned 404 at fetch time)
