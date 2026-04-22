# Audit 09 — State Management, Sync Queue, Offline/PWA, IndexedDB

**Date**: 2026-04-22
**Scope**: `src/stores/**`, `src/services/sync*`, `src/services/sync-processors/*`, `src/services/offline.service.ts`, `src/services/conflict.service.ts`, `src/services/db.ts`, `src/repositories/auth-context.repository.ts`, `vite.config.ts`, `public/sw-push.js`
**Mode**: READ-ONLY

---

## Severity summary

| Severity     | Count |
| ------------ | ----- |
| **CRITICAL** | 2     |
| **HIGH**     | 4     |
| **MEDIUM**   | 6     |
| **LOW**      | 3     |
| **INFO**     | 2     |
| **TOTAL**    | 17    |

---

## Architecture snapshot

- **Stores**: Zustand (`useHarvestStore`) composed of 7 slices. `persist` middleware writes partialize subset to `localStorage` via `safeStorage` (quota-aware). Crash recovery fallback → Dexie `recovery` table.
- **Queues**: TWO parallel queues exist:
  - `db.sync_queue` (typed PendingItem, multi-domain: ATTENDANCE/PICKER/QC/CONTRACT/TRANSPORT/TIMESHEET/MESSAGE/ASSIGNMENT/UNLINK, + SCAN case-branch).
  - `db.bucket_queue` (buckets only, driven by `HarvestSyncBridge` + `offlineService`, bypasses `sync.service`).
- **Processors**: 7 processors under `sync-processors/` (contract, transport, timesheet, attendance, picker, qc-inspection, unlink). SCAN + MESSAGE + ASSIGNMENT handled inline in `sync.service._doProcessQueue()`.
- **Conflict**: `withOptimisticLock` (`updated_at` guard) + `conflict.service.detect/resolve` stored in `sync_conflicts` Dexie table. Policy is **last-writer-wins** + a manual resolve path for `keep_local` re-enqueue. Attendance checkout force-resolves `keep_server` (payroll-authoritative).
- **Retry**: Counter in `QueuedSyncItem.retryCount`. Max 5 (validation) / 50 (other). No exponential back-off — queue is re-processed only on `online` event (+ 0–10s jitter) and page load (+5s). Inside processQueue it's a tight for-loop.
- **DLQ**: `db.dead_letter_queue` table; V28 fix preserves original item on DLQ insert failure.
- **PWA**: `vite-plugin-pwa` `registerType: 'autoUpdate'`, Workbox runtime cache (NetworkFirst 5s Supabase, StaleWhileRevalidate google-fonts). Separate non-Workbox `public/sw-push.js` for Web Push.
- **Dexie schema**: v3 → v8. v8 adds `auth_cache` (PII-adjacent profile, TTL 7d). `db.open()` auto-deletes DB on UpgradeError.

---

## Findings

### F1 — `SyncStatusBadge` reads from never-written `localStorage` keys [HIGH]

File: `src/components/common/SyncStatusBadge.tsx:27-29`
The header badge polls `localStorage.getItem('sync_queue_count' | 'dlq_count' | 'last_sync_at')`. Those keys are never written anywhere in `src/**` (grep → only reads, no writers). The counts are stored in IndexedDB (`db.sync_queue`, `db.dead_letter_queue`, `db.sync_meta`). Net effect: the badge always shows `Synced` (online branch, both counters 0) regardless of actual queue depth. The offline-UX story (queue depth visibility) is silently broken. Workers will not notice queued-locally state unless offline.
Note: a separate `SyncStatusMonitor` component exists and reads from the store — but the badge in the header does not.

### F2 — Two independent queues share bucket scans — inconsistent pipelines [HIGH]

`bucketSlice.addBucket()` writes to `db.bucket_queue` only via `offlineService.queueBucket` (slices/bucketSlice.ts:88). `HarvestSyncBridge` flushes `bucket_queue` directly via `bucketEventsRepository.insertBatch` (NOT through `sync.service`). Meanwhile `sync.service.ts:183` has a dedicated `case 'SCAN'` branch that calls `bucketLedgerService.recordBucket` (edge function `record-bucket`) — this server-side validation path is unreachable from the app's scan-flow because nothing calls `syncService.addToQueue('SCAN', ...)` outside tests.
Consequences: (a) the fraud-prevention edge function (`record-bucket`) is bypassed for real scans; (b) the sync-service DLQ, retry counter, optimistic lock, and conflict detection do NOT apply to buckets — only to non-bucket items; (c) divergence means a bug fix in one queue never reaches the other.

### F3 — `safeStorage` silently swallows errors after cleanup fails [HIGH]

File: `src/stores/safeStorage.ts:9-47`
`setItem` catches `QuotaExceededError` but the outer try has no final `throw`, and the recovery path writes to Dexie via a dynamic import with `.catch()` that only logs. If both retries fail, the caller (`zustand/persist`) believes the write succeeded. State mutations that should be persisted (user profile, orchard, row assignments) are dropped silently. ERRORES.md [2026-03-28] logs a similar class of silent-discard bugs.

### F4 — Processors lack exactly-once / idempotency keys on the DB side [CRITICAL]

File: `src/services/sync.service.ts:244-297`
Processing logic is: execute processor → if no throw, push to `processedIds` → after the loop, `bulkDelete(processedIds)`. Crash or page-refresh between processor success and `bulkDelete` → on next run, the item is processed AGAIN. Only `processPicker` actively de-dupes by reading existing rows first (`find by id || picker_id`). Others do raw INSERT:
- `qc-inspection.processor.ts` → `qcRepository.insert(...)` with no unique constraint check (creates duplicate inspections).
- `transport.processor.ts` action=create → duplicate transport requests.
- `contract.processor.ts` action=create → duplicate contracts (and Holidays-Act accrual contamination).
Only bucket inserts are protected, via `HarvestSyncBridge`'s 23505 handling — and only because there's a UNIQUE index on `bucket_events.id`. The sync-service queue has no server-side idempotency key plumbing (e.g. `client_op_id`).

### F5 — No exponential back-off; retry loop runs full queue on every trigger [MEDIUM]

`_doProcessQueue` iterates the entire queue sequentially (for-of). On a failure (non-network), it bumps `retryCount` and moves on — then the next `online` event immediately reprocesses. With 50-retry ceiling and no delay between retries per item, a transient server error on 200 devices triggers a tight retry burst consuming bandwidth (jitter only applies to the INITIAL online trigger, not per-item). Validation errors max at 5 retries — reasonable — but still no back-off window between them.

### F6 — `sync_queue` items stuck in FIFO by insertion order — old items block new ones [MEDIUM]

Items are processed in insertion order via `db.sync_queue.toArray()`. A single poison record that hits 50-retry keeps consuming attempts, and during that window fresh, healthy items behind it are never attempted unless the loop reaches them. `network`-category errors `break` the entire loop (line 250-254), abandoning later healthy items too. No priority lane for time-sensitive ops (ATTENDANCE checkout vs. MESSAGE).

### F7 — Attendance conflict auto-resolves `keep_server` silently (policy vs. bug-risk) [MEDIUM]

`attendance.processor.ts:53-68` returns cleanly on lock conflict and removes the item from the queue. This is documented as the payroll policy, but there is no user-facing signal — the TL sees `Synced`, yet their correction was never applied. `conflictService.resolve(id, 'keep_server')` is called, but no worker UI surfaces `sync_conflicts` for review (the only reader is `getPendingConflicts` which is not wired into the badge). Aligns with ERRORES rule on silent-discard regressions.

### F8 — `keep_local` re-enqueue can loop forever when server keeps winning [MEDIUM]

`conflict.service.ts:145-160` re-enqueues the local values via `syncService.addToQueue(actionType, { ...local, id })`. It does NOT pass `updated_at`, so the re-queued item will go through the non-locked code path (e.g. `contract.processor.ts:41-43` raw `contractRepo.update`) — this overwrites whatever the server now has, without conflict detection. For tables where both paths are guarded (attendance), the new queued item will hit the same conflict → auto-resolve `keep_server` → re-detect → storage overflow pressure on `sync_conflicts` (capped by `MAX_STORED_CONFLICTS = 50` with force-evict).

### F9 — `partialize` persists `crew` and other server-owned collections to `localStorage` [MEDIUM]

`useHarvestStore.ts:106-115` persists `settings`, `orchard`, `crew`, `currentUser`, `rowAssignments`. `crew` can be 450+ pickers per ERRORES notes. Serialized JSON of the full crew roster repeatedly written on every state mutation pushes `localStorage` near quota quickly on shared tablets. Combined with no pre-check, `safeStorage` quota fallback will start firing. Also: persisted `currentUser` survives logout only partially — `db.delete()` + `localStorage.clear()` in signOut covers it, but if logout fails mid-flow the next user may see previous user's `currentUser` briefly before reload.

### F10 — Dexie cache tables have NO TTL enforcement except `auth_cache` [MEDIUM]

`user_cache`, `settings_cache`, `runners_cache` all keyed by `id` with no eviction. `useRunnerManagement` uses `runners_cache.clear()` + `bulkPut` on refresh, which is OK, but user/settings caches grow with every orchard switch. No `navigator.storage.estimate()` guard, no periodic cleanup cron. Only `bucket_queue` has `cleanupSynced` (7-day retention) — called opportunistically from `HarvestSyncBridge` after a successful batch, not on a schedule. If `HarvestSyncBridge` is offline for days, no cleanup happens.

### F11 — Dexie `db.open()` catch destroys local data on ANY upgrade error [CRITICAL]

`db.ts:206-224` on UpgradeError/DatabaseClosedError: `await Dexie.delete('HarvestProDB')` and `window.location.reload()`. This wipes every pending `sync_queue`, `dead_letter_queue`, `sync_conflicts`, and `bucket_queue` item. If a field worker has 200 unsynced scans (end of day, no connection), a faulty Dexie version bump in a deploy causes TOTAL DATA LOSS with no export/backup. The comment claims "los datos reales están en Supabase" — they are not; pending-queue data only exists locally.

### F12 — No service-worker update-prompt; silent activation may leave stale tabs [LOW]

`VitePWA({ registerType: 'autoUpdate' })` installs the new SW and takes control without user confirmation. No `needRefresh` hook or "Reload to get the latest version" banner. Field tablets keep the old app running until reload; DB client version mismatch possible if a Supabase-client version upgrade landed in the new SW. No `skipWaiting` control point visible in the code.

### F13 — Workbox cache has no versioned bust / `cleanupOutdatedCaches` [LOW]

Workbox config (`vite.config.ts:51-72`) does not set `cleanupOutdatedCaches: true` or `clientsClaim`. Runtime `supabase-api-cache` uses NetworkFirst but there is no `expiration` plugin — cached Supabase responses are retained until the cache is evicted by quota pressure. Stale orchard/picker lookups can persist for days.

### F14 — Push SW's `pushsubscriptionchange` reposts to a nonexistent endpoint [LOW]

`public/sw-push.js:84-95` posts the new subscription to `/api/push-subscription`. The app has no such Next/Express route — only Supabase edge functions. On browser-initiated re-subscription (rare but real), the resubscription silently 404s and the device drops off the push list.

### F15 — Store has no shallow-selector discipline [INFO]

0 hits for `shallow` or `useShallow` across the codebase. Many components select object-returning properties (`useHarvestStore()` destructured, e.g. `AddPickerModal.tsx:37 const { orchard } = useHarvestStore()`). This subscribes to the ENTIRE store and re-renders on any mutation. On a 450-picker crew with real-time bucket inserts, this is a performance footgun even if not a correctness one. Individual-selector pattern is present elsewhere (`useHarvestStore(s => s.crew)`) — inconsistent.

### F16 — User-scope cross-contamination possible if `signOut` throws before `db.delete()` [MEDIUM]

`AuthContext.tsx:230-280` — `signOut` runs a hard-gate with `window.confirm` that can hang on unsynced items. If the user hits cancel, `isSigningOutRef.current` is reset, but `supabase.auth.signOut()` / `removeAllChannels()` may have already run in another branch of the flow depending on the state machine. The `finally` block does run `db.delete()` + `localStorage.clear()` + reload — but only for the path that passes the confirm. On the cancel path (line 244 `return`), Dexie is NOT wiped. If auth state transitions to unauthenticated through onAuthStateChange while the confirm was open, next user's session starts on user A's Dexie cache.

### F17 — Processor test suite covers happy path + some conflicts but no crash / idempotency [INFO]

Test matrix: `picker.processor.test.ts` (5 tests), `qc-inspection.processor.test.ts` (3 tests — insert + nulls + throw), `unlink.processor.test.ts` (2 tests), `attendance.processor.test.ts` (~6 tests, incl. keep_server auto-resolve), `contract.processor.test.ts` (zero/empty branches), `transport.processor.test.ts` (create/assign/complete), `timesheet.processor.test.ts` (approve). Missing: (a) mid-processing crash → exactly-once verification; (b) re-processing after `processedIds.push` but before `bulkDelete`; (c) partial DLQ-insert failure (V28 path); (d) `keep_local` re-enqueue loop protection; (e) Dexie delete + reopen recovery; (f) cross-tab Web Locks contention. Fix `[2026-03-28]` in ERRORES.md (missing 'UNLINK' in type union) was about silent drops — but no regression test specifically exercises "unknown type reaches default case" with an assertion.

---

## Recommendations (short form)

1. Wire `SyncStatusBadge` to the actual IndexedDB counts via a small hook (or surface via the existing `sync-status` store selector). [F1]
2. Collapse bucket queue into the typed `sync_queue` pipeline OR make the two-queue split explicit + documented + both protected by DLQ. [F2]
3. Add a DB-level idempotency key (`client_op_id UUID UNIQUE`) on `qc_inspections`, `contracts`, `transport_requests`, `row_assignments`; include it in every payload. Processors treat 23505 on that key as success. [F4]
4. On UpgradeError: EXPORT `sync_queue` + `bucket_queue` + `dead_letter_queue` to a JSON blob in localStorage or download before `Dexie.delete`. [F11]
5. Add a per-item retry cooldown (`next_attempt_at` column) + priority field so network errors don't block the full loop. [F5, F6]
6. Add `cleanupOutdatedCaches: true`, `skipWaiting: false`, and a "new version available → Reload" toast. [F12, F13]
7. Add `useShallow` selectors for object-shaped selections; enable the Zustand lint rule. [F15]
8. Unit test the "crash between success and bulkDelete" path with a vi.fn that throws after `processedIds.push`. [F17]
