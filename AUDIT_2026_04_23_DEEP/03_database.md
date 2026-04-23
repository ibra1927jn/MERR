# Database / Supabase audit — harvestpro-nz
**Date:** 2026-04-23  •  **Branch:** improve/heartbeat-2026-04-22  •  **Schema:** V3 consolidated

## Verdict
Overall strong multi-tenant isolation. **Two critical RLS gaps** and minor design inconsistencies. No active cross-tenant leaks detected in current config.

## RLS coverage table

| Table | RLS | Policies | Tenant-scoped | Verdict |
|---|---|---|---|---|
| orchards | ✅ | 1 | via `get_my_orchard_id()` | OK |
| harvest_seasons | ✅ | 2 | orchard_id | OK |
| orchard_blocks | ✅ | 2 | orchard_id | OK |
| block_rows | ✅ | 2 | block→orchard FK | OK |
| users | ✅ | 3 | role-aware self+manager | OK |
| pickers | ✅ | 2 | orchard_id | OK |
| day_setups | ✅ | 2 | orchard_id | OK |
| bucket_records | ✅ | 2 | orchard_id | OK |
| bins | ✅ | 2 | orchard_id | OK |
| row_assignments | ✅ | 2 | orchard_id | OK |
| **quality_inspections** | ✅ | **0** | N/A | 🔴 **CRITICAL** |
| qc_inspections | ✅ | 2 | orchard_id + role | OK |
| conversations | ✅ | 2 | participant membership | OK |
| chat_messages | ✅ | 2 | via conversation | OK |
| daily_attendance | ✅ | 2 | orchard_id | OK |
| day_closures | ✅ | 2 | orchard_id | OK |
| fleet_vehicles | ✅ | 2 | orchard_id | OK |
| transport_requests | ✅ | 3 | orchard_id | OK |
| contracts | ✅ | 2 | orchard_id + role | OK |
| harvest_settings | ✅ | 2 | orchard_id | OK |
| messages | ✅ | 2 | receiver/sender, **no orchard** | ⚠️ Review |
| login_attempts | ✅ | 2 | audit-only `INSERT WITH CHECK (true)` | ⚠️ Permissive |
| account_locks | ✅ | 2 | auth (not tenant) | Appropriate |
| audit_logs | ✅ | 2 | `INSERT WITH CHECK (true)` | ⚠️ Permissive |
| sync_conflicts | ✅ | 2 | user_id | OK |
| allowed_registrations | ✅ | 2 | email-based, no orchard on HR | ⚠️ Review |

## Critical findings

### 🔴 P0 — quality_inspections data exposure
- Legacy table (coexists with `qc_inspections`). RLS enabled, **zero policies** → any authenticated user can SELECT/INSERT/UPDATE/DELETE.
- **Fix:** add policies or migrate data to `qc_inspections` and `DROP TABLE quality_inspections`.

### 🟠 P1 — login_attempts / audit_logs overly permissive INSERT
- `INSERT WITH CHECK (true)` lets any authenticated user forge audit rows.
- Works today because inserts are via SECURITY DEFINER triggers, but assumption is undocumented.
- **Fix:** add comment / restrict INSERT to `service_role` or trigger-only, and document.

### 🟠 P1 — messages table tenant isolation
- Scoped only by receiver/sender IDs, not `orchard_id`. If a user belongs to multiple orchards, cross-orchard messaging is possible.
- **Fix:** add `orchard_id` column + policy, or document intentional cross-orchard design.

### 🟡 P2 — allowed_registrations HR policy is tenant-agnostic
- `is_hr_manager_or_admin()` can create registrations for any orchard.
- Likely intentional (central HR), but should be explicit.

## Migrations — hygiene

✅ All idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`).
✅ Consolidated schema `20260101_schema_v3.sql` is single source of truth.
✅ Seed guards (`current_database() ILIKE '%prod%'`).
⚠️ `archive/` folder has duplicates (low-pri cleanup).
⚠️ Post-hoc column patches (`orchards.crop_type`, `orchards.deleted_at`) suggest drift discovered during dev.

## Soft-delete — coverage

✅ 14 tables have `deleted_at TIMESTAMPTZ` with partial indexes `WHERE deleted_at IS NULL`.
✅ RLS respects `deleted_at` (harvest_seasons, pickers, bucket_records, daily_attendance).
✅ Repositories filter `.is('deleted_at', null)`.
⚠️ `baseRepository.ts` soft-delete uses `is_active: false` instead of `deleted_at = now()`. Specialized repos override, but base is inconsistent.

## Indexes — performance

✅ 30+ indexes including composite + partial.
✅ Sync indexes `(season_id, created_at)` for delta sync.
✅ Attendance `(orchard_id, date)` and `(picker_id, date)`.
✅ Login rate-limit `(email, attempt_time DESC)`.
✅ GIN on `conversations.participant_ids`.

⚠️ Possible full-scans (low pri):
- No index on `conversations.type`.
- No index on `pickers.status` (partially mitigated by soft-delete filter).
- `row_assignments.assigned_pickers` UUID[] — no multi-key index.

## Realtime publication

Published: `chat_messages`, `conversations`, `bucket_records`, `users`, `transport_requests`, `fleet_vehicles`, `daily_attendance`.
All orchard-scoped via RLS. Supabase Realtime respects RLS on subscribe → **no obvious cross-tenant leak**.

## Data types & constraints

✅ `DECIMAL(10,2)` for money (not float).
✅ `TIMESTAMPTZ` standard; `TIMESTAMPTZ(3)` on some `updated_at` for ms precision.
✅ CHECK constraints on enum-like fields (status, role, type).
✅ NOT NULL on required columns.
✅ FK with explicit ON DELETE (CASCADE / RESTRICT / SET NULL).
✅ Unique constraints guarded with `WHERE deleted_at IS NULL`.

## Auth & audit

✅ Account lockout: 5 failed attempts / 15-min window, trigger-driven.
✅ Comprehensive audit triggers on pickers, users, daily_attendance.
✅ Immutable `day_closures` for payroll auditability.
✅ Sync conflicts logged for offline resolution.
⚠️ Test seeds guard against prod DB name; passwords `111111` labelled test-only.

## Punchlist

1. **P0** — Add RLS policies to `quality_inspections` or drop the table.
2. **P1** — Restrict INSERT on `login_attempts` / `audit_logs` to trigger/service_role only; document assumption.
3. **P1** — Decide on `messages.orchard_id`: add scoping or document cross-orchard design.
4. **P2** — Add indexes on `pickers.status` and `conversations.type` if perf testing reveals scans.
5. **P2** — Standardize `baseRepository` soft-delete to `deleted_at` column.
6. **P3** — Archive/clean duplicate migration files under `archive/`.
7. **P3** — Document that `allowed_registrations` HR policy is intentionally tenant-agnostic.
