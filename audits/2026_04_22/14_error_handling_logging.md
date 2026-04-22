# Audit 14 — Error Handling, Logging, Observability

**Date:** 2026-04-22
**Repo:** `/root/repos/harvestpro-nz`
**Scope:** async error handling, Supabase `{data,error}` patterns, loggers, Sentry, ErrorBoundary, Toast a11y, retry logic, PII in logs/analytics, edge function error responses.
**Method:** READ-ONLY static analysis.

---

## Severity summary

| Severity | Count |
|----------|-------|
| P0 (critical)   | 2  |
| P1 (high)       | 5  |
| P2 (medium)     | 6  |
| P3 (low/nit)    | 4  |
| **Total**       | **17** |

Metric baselines:
- `logger.error` call sites: 193 (non-test). `logger.warn`: 86. `logger.info`: 95.
- `await supabase.*` call sites: 127 in `src/repositories/**`, 28 in `src/services/**`.
- Empty/silent catches (`catch {`): 44 matches (many legitimate — localStorage quota, non-blocking optimisation — but several are load paths).
- `console.*` outside the `logger` module: 8 (acceptable).
- 11 Edge Functions, all routed through `_shared/security.ts` `errorResponse`.

---

## Top findings

### P0-1 — `row.repository.ts` still warn-instead-of-throw (regression risk)
File: `src/repositories/row.repository.ts:39-46`

```ts
const { error } = await supabase
  .from('row_assignments')
  .upsert(rows, { onConflict: 'id' });

if (error) {
  logger.warn('[RowRepo] Failed to upsert row_assignments:', error.message);
}
```

`ERRORES.md` (2026-04-14) explicitly flags this exact function: when a `status` CHECK constraint was violated, the UPSERT failed silently, the Team Leader never received realtime updates, and "Feature end-to-end rota en prod." The fix at that time renamed a status value — but the structural bug (warn without throw) was never addressed. If any future schema drift breaks this write, the caller (`stores/slices/rowSlice.ts`) assumes success, and the only signal is a dev-mode warning. **Fix:** `if (error) throw error;` matching sibling `updateProgress`/`completeRow`.

### P0-2 — PostHog receives un-scrubbed worker PII (NZ Privacy Act 2020 risk)
Files: `src/config/analytics.ts`, `src/hooks/useAuthSession.ts:106`.

`analytics.identify(userId, { role, orchard_id, email: userData?.email })` sends worker **email** to PostHog's cloud. Further, every bucket scan (`trackBucketScanned(pickerId, qualityGrade)`), check-in (`trackCheckIn(pickerId)`), and row assignment (`trackRowAssignment(pickerId, rowNumber)`) transmits an identifiable picker ID tied to the logged-in user. PostHog is initialised with `autocapture: false` (good) but there is no `sanitize_properties` hook or `$process_person_profile: false` toggle. NZ Privacy Act 2020 (IPP 5, 11) + potential RSE (Recognised Seasonal Employer) compliance concern: seasonal workers under immigration-attached employment are a sensitive class. Sentry does scrub (`maskAllText`, `beforeSend` strips cookies) — PostHog does not.

---

### P1-3 — Many repositories destructure `data` without checking `error` (22+ sites)
Every call below swallows Supabase errors and returns the empty-ish default, hiding schema drift, RLS failures, and network partitions behind an empty array / `null`:

| File | Line | Returns on error |
|------|------|-----------------|
| `auth.repository.ts` | 27 | (varies) |
| `payroll.repository.ts` | 39 | `{}` |
| `bucket-ledger.repository.ts` | 9 | `null` |
| `user.repository.ts` | 27, 17 | `{}`, `0` |
| `auth-context.repository.ts` | 76, 86, 92 | `null`, `[]`, `null` |
| `picker-crud.repository.ts` | 57 | — |
| `store-sync.repository.ts` | 9, 15, 48 | — |
| `logistics.repository.ts` | 42 | — |
| `picker.repository.ts` | 28 | — |
| `optimistic-lock.repository.ts` | 22 | — |
| `contract.repository.ts` | 61 | — |
| `attendance.repository.ts` | 36, 71, 81 | — |
| `picker-history.repository.ts` | 22, 32, 43, 54, 64 | — |
| `user-service.repository.ts` | 80, 116, 126 | — |
| `messaging.repository.ts` | 87, 108, 119 | — |
| `stores/storeSync.ts` | 103 | — |

Worst offender: `messaging.repository.ts:82` — `insertBroadcast(broadcast)` — entirely fire-and-forget (`await supabase.from('broadcasts').insert([broadcast])` with no destructure at all). A failed RLS check silently drops messages for the entire orchard.

### P1-4 — `ErrorBoundary` renders raw `error.toString()` to every user
File: `src/components/common/ErrorBoundary.tsx:84-88` (full-page) — unconditionally renders `this.state.error?.toString()` in a `<code>` block regardless of environment. The sibling `ComponentErrorBoundary.tsx:65` correctly gates the same rendering behind `import.meta.env.DEV`. The full-page boundary should do the same. Today, if a Supabase call throws a message like `duplicate key value violates unique constraint "users_email_key"` the SQL table/column names surface to pickers and Team Leaders. Also leaks `error.stack.substring(0, 500)` via the `mailto:` body to the user's email client (possibly shared/synced).

### P1-5 — `sync.service.ts` has no `auth` error category (401/403 retried 50×)
File: `src/services/sync.service.ts:375-410` — `categorizeError` distinguishes `network | server | validation | unknown`. A 401/403 (expired session, revoked RLS, user deactivated) falls into `unknown` and the same item is retried up to **50 times** with only linear backoff via the outer polling loop. Recommended: add an `auth` category triggered by messages containing `jwt`, `401`, `403`, `not authenticated`, `permission denied`, and force session refresh + pause sync (don't retry until AuthContext resolves). Prevents burning through tokens and flooding Sentry.

### P1-6 — `errorResponse` leaks internal message via `hint:` field
File: `supabase/functions/_shared/security.ts:181-203`

```ts
return new Response(JSON.stringify({
  error: isAuthError ? message : 'Request failed. Check parameters and try again.',
  ...(isAuthError ? {} : { hint: message }),
}), ...);
```

The generic message is a nice touch, but the `hint:` field forwards the raw error (which can contain `bucket_records_picker_id_fkey`, PG error codes, or whatever a caught library throws). Bucket insert for an unknown picker currently emits `"Unknown badge ID: \"XYZ\". No picker found with this exact ID in the orchard."` — acceptable. But `record-bucket/index.ts:55` also throws `Badge lookup failed: ${lookupErr.message}` which embeds Postgres error detail into `hint`. Recommendation: remove `hint` for non-AuthError, or map known error shapes to client-safe codes (`{ error, code: 'UNKNOWN_BADGE' | 'DUPLICATE' | ... }`).

### P1-7 — Raw `error.message` surfaced in user-facing toasts / modals (7 sites)
- `AddPickerModal.tsx:86` → `` `Failed to add: ${errorMessage}` ``
- `CreateGroupModal.tsx:62` → toast `err.message`
- `ImportCSVModal.tsx:70, 277` → toast + inline row errors show parser messages
- `ReAuthModal.tsx:53` → `setError(err.message)`
- `ScannerModal.tsx:89` → `msg = err.message`
- `TimesheetEditor.tsx:112` → `` `Error: ${err.message}` ``
- `DayClosureButton.tsx:194` → `` `Error closing day: ${err.message}` ``

Supabase errors and Edge Function messages propagate through unchanged. A worker seeing `relation "daily_attendance_v2" does not exist` is both a leak and a UX failure.

---

### P2-8 — Toast component lacks ARIA live region
File: `src/components/ui/Toast.tsx` — no `role="status"` / `role="alert"` / `aria-live`. Screen-reader users get silent success and silent error. The codebase already uses `role="alert" aria-live="assertive"` correctly elsewhere (`SyncStatusMonitor.tsx`), so the pattern is known — just not applied to the main Toast primitive.

### P2-9 — Form fields lack `aria-invalid` / `aria-describedby`
Repo-wide, only **one** `aria-describedby` hit (`WageRatesPanel.tsx:190`) and **zero** `aria-invalid`. Invalid zod-validated fields across `AddPickerModal`, `ImportCSVModal`, `TimesheetEditor`, `CreateGroupModal`, `ReAuthModal` rely on visual red borders only.

### P2-10 — Auth/PII in `logger.info` reaches Sentry breadcrumbs in prod
- `context/AuthContext.tsx:214` — `` `[Auth] User registered via whitelist: ${email} as ${authorizedRole}` ``
- `services/picker.service.ts:18` — `logger.info('[getPickersByTeam] Registered Picker IDs:', data.map(p => p.picker_id).join(', '))` — whole orchard roster.
- `services/wage-rates.service.ts:192` — `` `[WageRates] Updated ${wageRate.job_type} wage to $${wageRate.hourly_rate}/hr` ``
- `stores/slices/bucketSlice.ts:34, 42` — logs picker IDs on reject/checked-in mismatch (`logger.error`, so forwarded to Sentry).

`logger.info`/`warn` is currently dev-only, so the first three are fine *today*. But the `bucketSlice` lines hit Sentry in prod via `logger.error`. Sentry's `maskAllText` covers **Replay**, not event message bodies.

### P2-11 — `auth-context.repository.ts:86` — `getAllOrchards` returns `[]` on error
```ts
if (error) return [];
```
A failed RLS read (user's role was downgraded mid-session) looks identical to "you have no orchards" — the UI renders the empty-orchard state and the user can't even contact support from inside the app.

### P2-12 — Retry logic uses item's row count, not true backoff
`sync.service.ts:252-260` — on each failure, increments `retryCount` on the row but does not stamp a `next_retry_at`. The next drain tick retries instantly. Combined with P1-5 (no auth category) and `maxRetries = 50` for non-validation errors, a revoked user can generate 50 rapid requests per item before quieting down. `utils/jitter.ts` exists but is only wired to the reconnect storm — not per-item backoff.

### P2-13 — `insertBroadcast` (messaging) is fire-and-forget
`src/repositories/messaging.repository.ts:82` — entire write has no destructure, no await on return. Broadcasts (operational comms: "Rain incoming, pack down block 3") can be lost silently on RLS failure.

---

### P3-14 — `Sentry.beforeSend` does not scrub `event.extra` / `event.breadcrumbs`
`src/config/sentry.ts:61-66` strips `request.cookies` and `contexts.storage`, drops `'Invalid login credentials'`. Does not scrub `extra`, `breadcrumbs`, or `user.email`. `setSentryUser` stores user.email (line 83) — acceptable for support triage but worth documenting.

### P3-15 — Sentry lazy load loses errors in the first ~200 ms
Documented trade-off (`sentry.ts:6-9`). Recommendation: queue errors in a small in-memory ring buffer and flush once Sentry resolves.

### P3-16 — `DLQ_insert failed` logged but nothing alerts ops
`sync.service.ts:291-294` — "CRITICAL: DLQ insert failed. Item preserved in sync_queue" escalates to `logger.error` → Sentry — good — but there's no paging/alert rule wired. Sentry default project alerts are mentioned nowhere in docs.

### P3-17 — `useNotifications.ts:66` silently swallows push subscription errors
`catch { /* Silently handle — might not have SW registered yet */ }` — OK as a first-run guard, but should still `logger.debug` for diagnosis when users report "notifications never work".

---

## Positive notes

- Lightweight logger correctly no-ops info/warn/debug in prod (`src/utils/logger.ts:14`), avoiding chatty console in production.
- `logger.error` lazy-forwards to Sentry with Error/Message separation — sensible minimal coupling.
- Sentry Replay correctly hardened (`maskAllText: true`, `blockAllMedia: true`) — explicit NZ Privacy Act comment (`sentry.ts:53-55`).
- `sync.service.ts` DLQ pattern is well-designed: persists on max-retry, keeps items in `sync_queue` when DLQ insert itself fails ("better stuck than lost", line 290), and emits PostHog metric.
- Edge Function `errorResponse` never leaks stack traces, maps `AuthError` status codes, and logs full error server-side.
- `baseRepository.ts` demonstrates the correct `try/catch + check error + typed result` pattern — just 35% of repos actually extend it.

---

## Recommended remediation order

1. **P0-1** — 3-line fix on `row.repository.ts` (`throw` instead of `warn`).
2. **P0-2** — PostHog `sanitize_properties` hook; drop `email` from identify; replace `picker_id` with hashed/rotated token.
3. **P1-4** — Gate `error.toString()` behind `import.meta.env.DEV` in `ErrorBoundary.tsx` (mirror `ComponentErrorBoundary`).
4. **P1-5** — Add `auth` category to `sync.service.ts.categorizeError`; pause sync on auth errors; route to AuthContext session refresh.
5. **P1-3** — Sweep 22 repositories: enforce `{data,error}` destructure + `if (error) throw/return` via ESLint rule (custom `@typescript-eslint/no-unchecked-supabase-error`).
6. **P1-6** — Remove `hint:` from `errorResponse`, add structured `code:` enum instead.
7. **P1-7** — Introduce a `toUserMessage(err)` helper that maps known error shapes to i18n keys; forbid raw `.message` in toast calls via ESLint.
8. **P2-8, P2-9** — A11y pass on Toast + forms (`role="status"`, `aria-invalid`, `aria-describedby`).
9. **P2-12** — Add `next_retry_at` column to IndexedDB `sync_queue` + exponential backoff with jitter.
