# Edge Functions Audit — HarvestPro NZ — 2026-04-22

**Scope:** 11 functions under `supabase/functions/` + `_shared/` + `config.toml`.
**Methodology:** Static review of each `index.ts`. Cross-checked with `schema_v3_consolidated.sql`, recent migrations, `AUDIT_2026_04_19_DEEP_REVIEW.md` §3.5, and `ERRORES.md`. Git log since 2026-04-19: 1 merge (HR Documents + Holidays Act s.60 payroll).
**Rule:** DETECT and REPORT; no mutation.

---

## Severity Counts

| Severity | Count |
|---|---|
| CRITICAL | 3 |
| HIGH     | 5 |
| MEDIUM   | 6 |
| LOW      | 4 |
| OK / POSITIVE | 7 |

---

## Top Findings

### C-1 — `provision-orchard` writes to non-existent `orchard_settings` table (CRITICAL, signup-breaking)
- **File/line:** `supabase/functions/provision-orchard/index.ts:138` (insert), `:146,165` (log/rollback).
- Schema defines `public.harvest_settings` (`schema_v3_consolidated.sql:407`). Column set `{piece_rate, target_tons, min_buckets_per_hour}` is also inconsistent with the `harvest_settings` schema used by `calculate-payroll:124` and `api-v1:136`.
- **Impact:** every self-signup fails at step 4, rolls back user+orchard+membership. New customers cannot complete onboarding.
- **Fix:** insert into `harvest_settings` with the columns that `calculate-payroll` reads (`piece_rate`, `min_wage_rate`).

### C-2 — Every `audit_logs` INSERT from Edge Functions violates schema (CRITICAL, compliance-breaking)
- **Files:** `approve-timesheet/index.ts:69-76`, `manage-admin/index.ts:54-61,84-90,115-121`, `manage-attendance/index.ts:219-229`, `provision-orchard/index.ts:173-179`, `submit-audit-log/index.ts:63-81`.
- Table definition (`schema_v3_consolidated.sql:451-465`) exposes `{user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at}` with `CHECK (action IN ('INSERT','UPDATE','DELETE','CUSTOM'))`.
- Edge functions write unsupported columns (`entity_type, entity_id, performed_by, event_type, severity, details, notes`) and non-whitelisted `action` values (`'timesheet_approved'`, `'user_role_changed'`, `'orchard_provisioned'`, ...). No migration under `supabase/migrations/` adds these columns.
- **Impact:** `approve-timesheet:78` and `manage-attendance:231` explicitly throw if the audit insert errors, so the entire operation fails even when the data write succeeded. `submit-audit-log` will drop every incoming batch.
- **Fix:** migration to extend `audit_logs` (nullable columns + drop/loosen CHECK to allow CUSTOM event labels), or normalise inserts to use `action='CUSTOM'` + `table_name` + payload in `new_values`.

### C-3 — Role source out of sync after `manage-admin.update_role` (CRITICAL, auth drift)
- **File/line:** `_shared/security.ts:150` reads role from `user.user_metadata.role` (JWT claim).  `manage-admin/index.ts:43-49` updates `public.users.role` only — not `auth.users.user_metadata`.
- **Impact:** after admin changes a user's role, the JWT still encodes the old role until the user re-logs in. Either (a) elevated user keeps old lower role until token refresh (acceptable) or (b) demoted user **retains elevated role** for the full JWT TTL — privilege-escalation window for up-to-1h (default). Also means `manage-admin` never updates `user_metadata`, so Edge-Function RBAC is permanently decoupled from the `users` table.
- **Fix:** in `manage-admin`, additionally call `supabase.auth.admin.updateUserById(user_id, { user_metadata: { role: new_role }})`, and optionally force-revoke refresh tokens.

### H-1 — `provision-orchard` wage_rates seeded at $23.95 but `harvest_settings` is never set (HIGH)
- **File:** `provision-orchard/index.ts:155-160` inserts into `wage_rates` (table currently unused in code per `ERRORES.md:118`).
- No row is created in `harvest_settings`, so `calculate-payroll:123-131` throws `Harvest settings not found for orchard …` for every newly-provisioned orchard until manual SQL.
- Combined with C-1: self-signup is end-to-end non-functional.

### H-2 — `send-push` external fetch has no timeout / retry / circuit breaker (HIGH)
- **File/line:** `send-push/index.ts:225` `await fetch(subscription.endpoint, …)` inside per-subscriber loop with no `AbortSignal.timeout` and no concurrency cap.
- **Impact:** a single slow push-service endpoint (FCM/APNs/Mozilla) blocks the whole broadcast for the worker's wall-time budget (~60 s Supabase default). DoS-amplification risk: one bad subscriber stalls broadcasts for the whole tenant.
- **Fix:** `AbortSignal.timeout(5_000)`, `Promise.allSettled` with a concurrency limit (e.g. 10), short-retry on 5xx.

### H-3 — `provision-orchard` does not require email verification (HIGH)
- **File/line:** `provision-orchard/index.ts:82-84` — `email_confirm: true` bypasses Supabase's email verification flow. `user_metadata.role = 'admin'` is set atomically.
- **Impact:** anyone with an email they control (typo, burner, competitor) immediately becomes tenant admin. Combined with the 5-signup-per-IP rate-limit, this is too permissive for a B2B compliance product.
- **Recommendation:** `email_confirm: false` + `redirect_to` via Supabase magic-link; only flip `role='admin'` after verification callback.

### H-4 — In-memory rate limiter still ephemeral (HIGH, carry-over from 2026-04-19 M-1)
- **File/line:** `_shared/security.ts:73-106` (`rateLimitStore = new Map`). Also `provision-orchard/index.ts:25-36` (separate `ipAttempts`). Both reset per cold-start and per-worker.
- Only `api-v1` has DB-backed rate limit (`api-v1/index.ts:60-77`). Every other function is effectively unprotected under load across workers. `provision-orchard`'s 5/h is trivially bypassed by hitting a cold worker.
- **Fix:** migrate to Postgres sliding-window table or Upstash Redis, as already recommended in the prior audit.

### H-5 — CORS allowlist lets any `*.vercel.app` subdomain call every function (HIGH)
- **File/line:** `_shared/security.ts:20` `origin.endsWith('.vercel.app')`.
- **Impact:** a malicious fork deployed to `evil-fork.vercel.app` can read responses (and therefore exfiltrate tenant data via a hijacked session token).  Carry-over from prior audit, still unfixed.
- **Fix:** allow only `harvestpro.vercel.app` + a specific staging subdomain.

### M-1 — `detect-anomalies` uses local-time `.getHours()` + midnight-boundary bug
- **File/line:** `detect-anomalies/index.ts:86-87` `todayStart.setHours(0,0,0,0)` runs in the edge runtime's local TZ (UTC). At UTC evening (NZ morning), `todayStart` excludes scans that happened **earlier that NZ day**. `:125` `scanTime.getHours()` compares UTC hours against the NZ shift window (6-19).
- **Impact:** false off-hours flags for morning NZ scans; duplicate-proximity window aligned to UTC midnight.
- **Fix:** mirror the pattern already used by `check-compliance:88-90` and `calculate-payroll:13-27` (`Intl.DateTimeFormat` with `timeZone: 'Pacific/Auckland'`).

### M-2 — `calculate-payroll` fallback path silently skips s.60 alternative-day for attendance-less days
- **File/line:** `calculate-payroll/index.ts:264-282` — when no `daily_attendance` record exists, hours are derived from `last_scan - first_scan`. If a picker spans midnight locally (shift ending next day), s.60 `alternative_holidays_owed` is attributed to the `first_scan` date only, potentially missing the holiday.
- Also at `:193-196`: meal-break subtracts 0.5 h flat; a 4.01 h shift is reduced to 3.51 h, under-counting wage floor. Minor but biased toward underpayment.
- The Monday-ised dates list at `:34-43` hardcodes 2026 and 2027 only (comment acknowledges manual maintenance). High-risk audit gap once 2028 calendars arrive; no test asserts that both lists stay in sync with `src/constants/nz-law.ts`.

### M-3 — `manage-admin` writes `reactivated_at`/`reactivated_by` columns that don't exist in schema
- **File/line:** `manage-admin/index.ts:104-109` sets `reactivated_at`, `reactivated_by`. `schema_v3_consolidated.sql:~112` defines only `is_active`, no reactivation columns (grep shows only `is_active`, `deactivated_at`, `deactivated_by` would also need verification; only `is_active` is confirmed).
- **Impact:** reactivation action throws 400 `column … does not exist`. Requires schema extension or field removal.

### M-4 — `send-push.broadcast` has no role/orchard filter actually implemented
- **File/line:** `send-push/index.ts:415-421` — the `BroadcastSchema` accepts `role` and `orchard_id` filters, but the query body ignores them (comment: "role filtering TBD with user_metadata join"). Any manager can push to **every subscriber globally**, cross-tenant.
- **Impact:** tenant isolation break in a push feature. Critical if real multi-tenant usage is live.
- **Fix:** join `push_subscriptions.user_id` against `orchard_members` filtered by caller's orchard, plus role filter via `auth.users.raw_user_meta_data`.

### M-5 — `errorResponse` still leaks DB messages via `hint`
- **File/line:** `_shared/security.ts:181-202`. Non-AuthError branch returns `hint: message` where `message` is the raw `Error.message` — which in many places is `` `Failed to …: ${dbError.message}` `` (e.g. `calculate-payroll:131`, `manage-admin:51`, `manage-attendance:90`, `record-bucket:86`). This surfaces PostgREST/RLS errors to the client.
- **Fix:** drop `hint` in production or restrict to zod validation messages.

### M-6 — Public `api-v1` returns raw PostgREST `error.message`
- **File/line:** `api-v1/index.ts:101,122` — `return { error: error.message, status: 500 }` surfaces SQL/RLS text to any third-party API client.

### L-1 — `record-bucket` requires `team_leader`+ even for field scanning
- **File/line:** `record-bucket/index.ts:29`. Matches policy but means pickers cannot self-scan; fine if all scans flow through the foreman app, but the comment at top ("badge ID spoofing prevention") implies broader usage.

### L-2 — `submit-audit-log` uses user's JWT (anon key) to insert, relies on RLS `INSERT WITH CHECK (true)`
- File: `submit-audit-log/index.ts:38-42,79-81`. Combined with C-2, these inserts never succeed anyway.

### L-3 — `AttendanceCheckInSchema` accepts `orchard_id` from client without verifying membership
- **File/line:** `_shared/security.ts:232-237` + `manage-attendance:76-86`. A team_leader scoped to orchard A can `check_in` a picker_id at orchard B if RLS on `daily_attendance` INSERT doesn't enforce orchard membership. Should be cross-checked in the RLS audit.

### L-4 — `calculate-payroll._warmup` bypass is post-auth but unauthenticated warmups would be cheaper
- File: `calculate-payroll:112-115`, same in `manage-attendance:33-37`, `record-bucket:34-38`, `check-compliance:70-73`. Not a bug (auth happens first); just noting that warmup cost is non-trivial.

---

## Positive Findings (keep)

1. Every function parses body with zod (`PayrollInputSchema`, `AttendanceInputSchema`, `PushInputSchema`, `AuditLogBatchSchema`, etc.).
2. No string-concat SQL: all queries go through the Supabase JS client / builder.
3. No hardcoded secrets; `VAPID_*` and `SUPABASE_SERVICE_ROLE_KEY` come from `Deno.env`.
4. `send-push` implements full RFC 8291 aes128gcm encryption (previously flagged P1, now correct).
5. `api-v1` tenant extraction from API-key (not request body) is solid (`api-v1:82`).
6. `config.toml` correctly sets `verify_jwt=false` only for `provision-orchard` and `api-v1`; all 9 other functions are gated at the gateway.
7. `calculate-payroll` applies Minimum Wage 2026 floor defensively via `Math.max(stored_min_wage, 23.95)` (`calculate-payroll:138-145`).
8. Meal break subtraction (`calculate-payroll:176-178`) and time-and-a-half s.50 (`:287-290`) present.

---

## Recommended P0 (this sprint)

1. C-1 + H-1 — fix `provision-orchard` to insert into `harvest_settings` with the correct columns (one commit).
2. C-2 — migration to extend `audit_logs` schema (nullable columns + relaxed CHECK) or refactor all edge-function inserts to canonical schema.
3. C-3 — `manage-admin.update_role` must also update `user_metadata.role` via `auth.admin.updateUserById`.
4. H-2 — add 5 s timeout + `Promise.allSettled` with concurrency limit to `send-push`.
5. M-4 — implement role + tenant filter in `send-push.broadcast`.

## Recommended P1 (next sprint)

- H-3 email verification gate; H-4 DB-backed rate limit; H-5 drop wildcard `*.vercel.app`; M-1 NZ-TZ in `detect-anomalies`; M-3 verify `users` reactivation columns.

---

*Read-only audit. No code or data was modified.*
