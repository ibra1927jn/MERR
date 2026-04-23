# SECURITY AUDIT 2026-04-23 — HarvestPro NZ
## Independent Deep Review Post-PR Merge

**Branch**: improve/heartbeat-2026-04-22  
**Date**: 2026-04-23  
**Auditor**: Claude Haiku  
**Scope**: Auth/session, RLS coverage, secrets, input validation, file upload, headers, supply-chain

---

## P0: CRITICAL — MUST FIX BEFORE RELEASE

### 1. requireRole() Reads JWT Metadata, Not DB
- **File**: `supabase/functions/_shared/security.ts:150`
- **Finding**: Function checks `user.user_metadata?.role` (frozen at token issuance, ~3600s TTL). When admin demotes user, old JWT still grants access until refresh or expiry.
- **Fix**: Merge `fix/signout-global-and-requirerole-db-2026-04-22` which queries `public.users` via service_role client + checks `is_active = true` at boundary.
- **Impact**: Closes 1h privilege escalation window post-demotion.

### 2. AuthContext.signOut() Missing Global Scope
- **File**: `src/context/AuthContext.tsx:264`
- **Current**: `await supabase.auth.signOut()` (default scope='local')
- **Finding**: On shared/BYOD tablet, logout in Tab A leaves Tab B authenticated until JWT expires (1h window).
- **Fix**: `await supabase.auth.signOut({ scope: 'global' })` + add device trust revocation. Commit `a612906` has fix but NOT merged to current branch.
- **Impact**: Closes device-theft vector on field tablets.

### 3. CSP Allows 'unsafe-inline' for Scripts & Styles
- **File**: `vercel.json:8`
- **Current**: `script-src 'self' 'unsafe-inline' ... blob:; style-src 'self' 'unsafe-inline'`
- **Finding**: Inline scripts/styles bypass CSP. Codebase has zero `dangerouslySetInnerHTML` but defense-in-depth weakened.
- **Fix**: Remove `'unsafe-inline'` from both directives (Vite/Tailwind already external). Test `npm run build` for no inline violations.
- **Impact**: Hardens against third-party-XSS (unlikely but possible via Sentry/PostHog client library injection).

---

## P1: HIGH — SHIP-BLOCKING

### 4. @xmldom/xmldom <=0.8.12 (4 CVEs: XML Injection, DoS)
- **File**: `node_modules/@xmldom/xmldom` (transitive: @capacitor/cli → plist → xmldom)
- **CVEs**: GHSA-2v35, GHSA-f6ww, GHSA-x6wf, GHSA-j759 (all HIGH)
- **Actual Risk**: Very low — xmldom only active in CLI during Capacitor build, not in bundle.
- **Fix**: `npm audit fix` (bumps plist 3.1.0 → 4.1.1).
- **Recommendation**: Run before release to clear audit report.

### 5. Edge Function Rate Limiting is Ephemeral
- **File**: `supabase/functions/_shared/security.ts:73-106`
- **Finding**: Rate limit stored in-memory, resets on function cold-start. Distributed attack can bypass by spreading requests across Deno workers.
- **Workaround**: Functions stay warm ~1h in production; per-instance limits provide some protection.
- **Post-Launch Fix**: Implement persistent rate limit (Upstash Redis or Postgres).
- **Current Risk**: Low (functions warm most of the time; audit M-1 documented).

---

## P2: MEDIUM (Post-Launch)

### 6. Logout Missing Cache Invalidation
- **File**: `src/context/AuthContext.tsx:269-279`
- **Finding**: Clears Dexie + localStorage but not TanStack Query cache. Stale cached data persists until tab close.
- **Fix**: Add `queryClient.clear()` before `db.delete()`.
- **Risk**: Low (all queries are auth-gated; stale cache triggers refetch on navigation).

### 7. Service Worker Cache Not Cleared on Logout
- **File**: `src/context/AuthContext.tsx:269`
- **Finding**: PWA service worker cache persists after logout if app is installed.
- **Fix**: Emit logout event to SW, implement `skipWaiting()` + cache clear on logout.
- **Risk**: Low (PWA is optional; web-only deployment unaffected).

---

## VALIDATIONS — PRIOR AUDIT FINDINGS CONFIRMED CLOSED

✅ **14 Open RLS Policies (ALL USING(true))**: Dropped in `20260422000007_harvest_settings_rls_lockdown.sql` + harvest_settings now reads `orchard_id` for multi-tenant isolation.

✅ **Audit Log Bug (audit_log vs audit_logs)**: Fixed in `ec59f70` (mpi-export now targets `audit_logs`).

✅ **Orphan User 00000000-0000...**: Removed in commit `7d15726`.

✅ **Hardcoded Secrets (sk_live_, API keys)**: All removed in `5b8468a`; pre-commit hook expanded to catch credentials.

✅ **QC Photos Bucket World-Readable**: Private + RLS scoped to same-orchard in `75d1304`.

✅ **No DOMPurify Missing**: Zero `dangerouslySetInnerHTML` found; no sanitization needed (Supabase/API data is never raw HTML).

---

## SCHEMA INTEGRITY

- ✅ RLS **enabled** on all PII tables (users, pickers, harvest_settings, bucket_records, daily_attendance).
- ✅ **Role-based policies** (manager, team_leader, qc_inspector, etc.) restrict via `users.role` or `orchard_id` match.
- ✅ **Foreign key indexes** added to 28 previously-missing FKs.
- ✅ **Soft-delete triggers** active on pickers, orchards, teams (archived_at → RLS filters).
- ✅ **Audit triggers** log all mutations to audit_logs (immutable INSERT-only).

---

## ACTION ITEMS

| Priority | Item | Branch/Commit | Owner |
|----------|------|---------------|-------|
| P0 | Merge `fix/signout-global-and-requirerole-db-2026-04-22` (7 commits) | a612906 | Team |
| P0 | Verify `20260422000007_harvest_settings_rls_lockdown.sql` applied to DB | - | DBA |
| P0 | Run `npm audit fix` to patch xmldom | - | DevOps |
| P0 | Apply CSP 'unsafe-inline' removal + test build | vercel.json | Frontend |
| P2 | Add queryClient.clear() to logout flow | - | Post-launch |
| P2 | Implement persistent rate limit (Redis) | - | Post-launch |

---

**Status**: 🟡 **WAIT** — Code ready but auth hardening branch must merge before release. All other P0s are straightforward fixes (1-2h total).

**Recommendation**: Merge signout branch today, re-test login/logout/MFA on staging, release tomorrow.

---

*Generated by independent audit (2026-04-23). Previous audit: 2026-04-19.*
