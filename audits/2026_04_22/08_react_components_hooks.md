# React Components, Hooks & UI Patterns Audit — HarvestPro NZ

**Date:** 2026-04-22
**Scope:** `src/components/**`, `src/pages/**`, `src/hooks/*`, `src/context/*`, `src/components/ui/*`
**Out of scope:** State management / Zustand stores / offline sync (other audit)
**Files reviewed:** ~200 tsx/ts (73 files use `useEffect`, 103 `useEffect` call sites, 158 `useMemo` sites, 27 modals, 7 role pages)

---

## Severity summary

| Severity | Count |
|----------|-------|
| **CRITICAL (P0)** — wrong behavior, security-adjacent, broken feature | **6** |
| **HIGH (P1)** — memory leaks, race conditions likely to fire in prod | **11** |
| **MEDIUM (P2)** — a11y breaches, minor leaks, perf hot-spots | **18** |
| **LOW (P3)** — style, nice-to-have, deprecation | **9** |
| **Total** | **44** |

---

## CRITICAL (P0)

### C1. `MessagingContext` never re-subscribes when orchard changes
**File:** `src/context/MessagingContext.tsx:411`
```ts
}, [orchardIdRef.current]); // Re-subscribe if orchard changes
```
Deps on `ref.current` — refs do **not** trigger re-renders or effect re-runs. `setOrchardId` mutates a ref, so the broadcast subscription is stuck with whatever value was in `orchardIdRef.current` on mount (initially `null`, so the effect's early return fires and there's **no subscription at all**). Only one case in the codebase uses `.current` in deps — confirmed bug.
**Fix:** promote `orchardId` to state (or select from Zustand) and depend on the value, not the ref.

### C2. `PickerDrawer` notFound logic bug (precedence)
**File:** `src/components/PickerDrawer/PickerDrawer.tsx:80`
```ts
const notFound = !picker && !history && !isHistoryLoading && !today.empty === false;
```
`!today.empty === false` parses as `(!today.empty) === false` → `today.empty === true`. Intent was likely `today.empty === false`. Net effect: `notFound` branch shows for pickers who *do* have scans today and no crew/history. UX contradictory.
**Fix:** parenthesize: `!(today.empty) === false` is meaningless; use `!today.empty` or `today.empty === false` per intent.

### C3. Stale demo data shipped as production logic
**File:** `src/hooks/useInspectionHistory.ts:75-116`
Hardcoded demo array returned by `loadInspections`. Comment says "In a real app, this would fetch from Supabase". `InspectionHistoryModal` is rendered from real user flows (PickerDetailsModal etc.) — users see fake records attributed to themselves. QC compliance risk.

### C4. `useLogisticsHealth` interval churn resets every render
**File:** `src/hooks/useLogisticsHealth.ts:132-143`
Effect deps include `currentRatio`, a number derived from store every render. Interval is destroyed + recreated on every change, so the 60-second tick may never fire to increment `sustainedRef`. The "sustained amber" telemetry that drives `health: 'red'` is effectively broken for active sites.
**Fix:** use `useRef` for `currentRatio` + single long-lived interval, or snapshot-based accounting with `performance.now()`.

### C5. Root render has no ErrorBoundary; `/login` and `/signup` lack boundaries
**Files:** `src/index.tsx:85-98`, `src/routes.tsx:107-121`
All 7 role routes are wrapped with `ErrorBoundary`, but the `RouterProvider` itself, `RootRedirect`, `MFAGuard`, and both `/login` + `/signup` lazy routes are not. Any render error during auth (most common failure surface) → white screen.

### C6. `usePwaInstall` leaks `appinstalled` listener forever
**File:** `src/hooks/usePwaInstall.ts:58,64`
Cleanup only removes `beforeinstallprompt`; `appinstalled` listener is orphaned. Navigation between routes that mount/unmount this hook accumulates handlers + closures (PWA banner lazy-loaded at root per `src/index.tsx:81`).

---

## HIGH (P1) — memory leaks + races

### H1. `useCounter` / `useAnimatedCounter` never cancel requestAnimationFrame
**Files:** `src/hooks/useLoginAnimations.ts:45-63`, `src/hooks/useAnimatedCounter.ts:16-35`
RAF loop continues after unmount, calling `setCount` on dead component. Recurring warning + wasted frames. No `cancelAnimationFrame` ref.

### H2. Pervasive fetch race — no AbortController anywhere
**Scan result:** zero `AbortController` / `signal:` usage across `src/components/**`, `src/hooks/**`, `src/context/**`.
Hot spots:
- `src/hooks/usePayroll.ts:14-28` — orchardId swap mid-request lets stale response clobber fresh.
- `src/hooks/useWeeklyReport.ts:85-232` — 2 parallel awaits, no cancel; stale `crew`/`settings` acknowledged via eslint-disable.
- `src/components/PickerDrawer/usePickerDrawerData.ts:52-63` — picker switch race on `getPickerHistory`.
- `src/components/views/manager/WageShieldPanel.tsx:41-46` — `getDailyBleed` race on orchardId.
- `src/components/views/manager/HeatMapView.tsx:115-153` — `getRowDensity` race on dateRange/block.
- `src/hooks/useHHRR.ts:32-54` — multiple `reload()` invocations can arrive out-of-order.
- `src/components/modals/TeamLeaderSelectionModal.tsx:51-78` — no mount guard on fetchStaff.
- `src/components/MFAGuard.tsx:42-83` — **security-adjacent**: late-resolving check can set `hasVerifiedFactor: true` for a different user.

### H3. Untracked `setTimeout` that fires setState on unmount
- `src/components/ui/Toast.tsx:12` (tracked — OK)
- `src/hooks/useGatewayStatus.ts:39` (not tracked — 3s window)
- `src/components/views/manager/TimesheetEditor.tsx:109`
- `src/components/views/payroll/PayrollTabs.tsx:115`
- `src/components/views/manager/TeamLeaderCard.tsx:51` and `src/components/views/manager/teams/RunnersSection.tsx:53` and `src/components/modals/TeamLeaderSelectionModal.tsx:147` — confirm-flow auto-reset
- `src/hooks/useQC.ts:114`, `src/hooks/useSettings.ts:235`
- `src/components/modals/ScannerModal.tsx:67,73` — setShowSuccess on unmount
- `src/components/MFASetup.tsx:56`, `src/components/primitives/EntityId.tsx:26`
- `src/components/common/messaging/ChatWindow.tsx:235` — typing timeout cleared on next keystroke but **not on unmount**.

Pattern is ~12 sites; each is low probability individually but collectively common. Wrap with `useRef` + cleanup, or derive cooldowns from timestamps.

### H4. `usePhotoCapture` leaks object URL + DOM input
**File:** `src/hooks/usePhotoCapture.ts` (no useEffect cleanup)
No effect to `URL.revokeObjectURL(photoPreview)` on unmount, and the `document.body.appendChild(input)` file input is never removed when the component unmounts while the native file picker is open. Cumulative leak on QC workflows.

### H5. `useRunnerData` 5s poller has no mount guard around async
**File:** `src/hooks/useRunnerData.ts:72-83`
`poll()` awaits `offlineService.getPendingCount()` then calls `setPendingUploads`. If the runner page unmounts mid-await, fires setState on dead component. Existing pattern in `UnifiedMessagingView.tsx:83-107` shows correct `isMounted` guard — copy it.

### H6. Runner `LogisticsView` rebuilds sun-exposure interval every render
**File:** `src/components/views/runner/LogisticsView.tsx:38-64`
Effect deps `[inventory]` — inventory reference churns on every Zustand update. 1-second interval teardown+setup cascade. Should depend on `inventory?.raw` length or ref-stash.

### H7. `LiveFloor` uses `key={idx}` on rotating feed
**File:** `src/components/views/manager/LiveFloor.tsx:28-40`
`bucketRecords.slice(0,10)` with `key={idx}` — new scans prepend to list, causing React to reuse wrong DOM nodes for the underlying records. Confirm animations flicker, focus/state misalign. Use `key={record.id}` or `record.scanned_at`.

### H8. `useLoginAnimations.useParallax` attaches listener to stale `el`
**File:** `src/hooks/useLoginAnimations.ts:71-85`
Captures `ref.current` at mount (`const el = ref.current`). Works here because effect runs on mount and ref is set synchronously, but patterns like this are fragile in StrictMode (double-invoke) — safer to use the ref inside the event callback.

### H9. Broadcast modal + 11 other modals missing focus trap
**File:** `src/components/ui/ModalOverlay.tsx:28-78`
Comment line 4 promises "focus trap" — only initial `focus()` + Escape are implemented. Tab escapes to backdrop/body. `src/components/ui/Drawer.tsx:37-109` same story, plus no Portal focus restoration.

### H10. `PickerDrawer` lacks dialog semantics + focus trap
**File:** `src/components/PickerDrawer/PickerDrawer.tsx:82-226`
No `role="dialog"`, no `aria-modal`, no `aria-labelledby`, no Escape key handler, no focus trap, no focus restoration to trigger. Large panel with tabs + nested data. Close button (line 93) lacks aria-label.

### H11. `AudioContext` created per scan, never `close()`
**File:** `src/components/modals/ScannerModal.tsx:42-52`
Each success feedback instantiates a new `AudioContext` + oscillator + gain; browsers cap simultaneous contexts (~6 on Chrome, 4 on Safari). Heavy scanning sessions will hit the cap → silent failures.

---

## MEDIUM (P2) — a11y + perf + patterns

### M1. 85 labels not associated with inputs (22%+ coverage)
Count: **109 `<label>` elements, only 24 use `htmlFor`** across `src/components/**`.
Worst offenders: `LoginForm.tsx:36,60`, `RegisterForm.tsx`, `AddPickerModal.tsx:103,110,116,124,129`, all of `components/modals/*`, `components/views/manager/settings/*`. Screen readers read placeholders only; label clicks don't focus input.

### M2. 10 modals use `window.confirm()`
`src/components/common/Header.tsx:54`, `src/components/views/payroll/ExportHistoryTab.tsx:55`, `src/components/views/manager/APIKeysView.tsx:56`, `src/components/views/manager/DeadLetterQueueView.tsx:145`, `src/components/SecurityDashboard.tsx:59`, `src/components/modals/PickerDetailsModal.tsx:64`, `src/components/modals/RunnerDetailsModal.tsx:122`, `src/components/views/hhrr/DocumentsTab.tsx:61`, `src/components/views/team-leader/TeamView.tsx:44`, `src/components/modals/ProfileModal.tsx:134`. Native dialog blocks the React tree, ignored on some PWAs/iOS Capacitor shells, and a11y inconsistent with rest of the design system (Toast, ModalOverlay).

### M3. Icon-only buttons with no `aria-label`
`src/components/common/messaging/ChatWindow.tsx` — 13 `<button>`s, **0 aria-labels**. Other hot spots: `src/components/ui/Toast.tsx:38` close button, `src/components/modals/*` close buttons (most), `src/components/auth/LoginForm.tsx:77` password-visibility toggle, `src/components/modals/ScannerModal.tsx:178`. Screen readers announce "button" with no context.

### M4. Toast has no `role="status"` / `aria-live`
`src/components/ui/Toast.tsx:33-44` — toasts are visual-only, SR users miss success/error feedback. `SyncStatusBadge.tsx` does it right (line 81-82).

### M5. `key={index}` in 30 rendering sites
Most are fine (fixed-size arrays / skeletons), but these are real bugs where the list reorders or rows enter/exit:
- `src/components/views/manager/LiveFloor.tsx:30` (see H7)
- `src/components/views/manager/WageShieldPanel.tsx:190` — team bleed (sort order depends on deficits; teams re-rank during day)
- `src/components/views/manager/RowTeamDisplay.tsx:46`
- `src/components/views/manager/weekly-report/DayDetailPanel.tsx:66`
- `src/components/views/qc/TrendsTab.tsx:202`
- `src/components/views/hhrr/CalendarTab.tsx:71`
- `src/components/views/team-leader/HomeView.tsx:55,166`
- `src/components/modals/PrivacyConsentModal.tsx:136`
- `src/components/modals/ImportCSVModal.tsx:255,276,297,338`

Skeletons / decorative strips OK: `CardSkeleton.tsx:30`, `PageHeader.tsx:50`, `APIKeysView.tsx:189`, `PredictionsCard.tsx:41`.

### M6. `div onClick` without keyboard affordances
13 instances. Representative: `src/components/views/manager/LiveFloor.tsx:29-41`, `src/components/views/team-leader/HomeView.tsx:34,92`, `src/components/views/team-leader/TasksView.tsx:153`, `src/components/common/PickerProfileDrawer.tsx` (backdrop is fine; inner handlers aren't). Missing `role="button"` + `tabIndex` + `onKeyDown` (Enter/Space).

### M7. Forms without `<form onSubmit>` wrapper
Most modals render naked buttons — Enter key doesn't submit. Only **5 of 27 modals** use a `<form>` element. Examples: `AddPickerModal.tsx`, `AddRunnerModal.tsx`, `ReAuthModal.tsx`, `NewContractModal.tsx`, `ProfileModal.tsx`. Users filling forms on a mobile keyboard cannot tap "Done/Go" to submit.

### M8. `ModalOverlay` body-scroll lock is global, not stacked
`src/components/ui/ModalOverlay.tsx:37-43` sets `document.body.style.overflow = 'hidden'` and restores to `''` on unmount. If two modals stack (common: Picker details → Re-auth), inner unmount restores scroll while outer is still open.

### M9. `TeamDrawer` status indicator is color-only
`src/components/views/manager/TeamDrawer.tsx:204-207` — emerald vs slate dot is the only signal for `active`/`away`. `title={member.status}` helps hover but colorblind users + touch devices get nothing visible.

### M10. `useOrchardMap` O(N*M*R) per-render loops
`src/hooks/useOrchardMap.ts:110-129,132-148` — `bucketRecords.filter(br => br.row_number === row)` per row per block; at 10 blocks × 20 rows × 1000 records = 200k ops every time crew or bucketRecords change. Pre-index: `Map<rowNum, BucketRecord[]>` from `bucketRecords` once, then O(1) lookup per row.

### M11. `PredictionsCard` recomputes max inside `.map`
`src/components/views/manager/PredictionsCard.tsx:104-118` — `Math.max(...yield_predictions.map(...))` inside the outer `.map` → O(n²). Lift above.

### M12. `HeatMapView` / `TrendsTab` sequential awaits instead of parallel
`src/components/views/qc/TrendsTab.tsx:31-41` — 7 day-by-day awaits in a for-loop ≈ 7× latency. Use `Promise.all` over `Array.from({length:7})`.

### M13. `NotificationPanel` listener delayed with `setTimeout`
`src/components/common/NotificationPanel.tsx:79-85` — 100ms race window before click-outside is active. Works, but rapid open+close within 100ms leaks the attach (the cleanup timeout won't have fired yet, so `removeEventListener` targets a handler never added). Small leak per rapid toggle.

### M14. Async subscription callback via fire-and-forget setTimeout in useGatewayStatus
See H3; additionally callback reads stale `setStatus` via closure only through the prev fn (OK) but no cleanup on unmount.

### M15. `Drawer` `useEffect` cleanup resets `body.overflow` to `originalOverflow` instead of stacking
`src/components/ui/Drawer.tsx:45-56` — same stacking issue as M8.

### M16. `usePayroll` duplicates settings defaults across places
`src/hooks/usePayroll.ts:33` hardcodes `{ bucket_rate: 0, min_wage_rate: 23.95 }`; other modules read from `@/constants/nz-law`. Drift risk — see ERRORES.md 2026-04-11 entry about wage-rate divergence.

### M17. `PickerDrawer` `<button>` close has no aria-label
`src/components/PickerDrawer/PickerDrawer.tsx:93-98` — also no keyboard shortcut (Esc) to close.

### M18. `ScannerModal` root container missing `role="dialog"` + aria-modal
`src/components/modals/ScannerModal.tsx:162` — this is a fullscreen modal but not announced as one. ESC key not wired (Capacitor users cannot back out easily if native scan hangs).

---

## LOW (P3)

### L1. `useHarvestMetrics` time tick deps OK but rebuilds interval on every setting change
`src/hooks/useHarvestMetrics.ts:47` — acceptable; just call out.

### L2. Global `QrScanner.WORKER_PATH` set at module scope
`src/components/modals/ScannerModal.tsx:9` — fine for singleton but won't tree-shake if the modal is never opened.

### L3. `SetupWizard.removeTeam(idx)` mutates by index with `key` stability relying on array order
`src/components/common/setup-wizard/TeamsStep.tsx:11` uses `key={idx}`; dropping middle team reindexes all.

### L4. `useLoginAnimations.useParallax` attaches to `ref.current` cached in effect
Already flagged in H8; filed here too for style.

### L5. `MFAVerify` auto-submit effect `// eslint-disable-next-line`
`src/components/MFAVerify.tsx:54-59` — handleVerify omitted from deps; intentional but fragile if dependencies of handleVerify change identity.

### L6. `CreateGroupModal` / `SendDirectMessageModal` likely share duplicated picker-search logic (not cross-checked; spotted via naming).

### L7. Drawer `children` + header gap styling uses `!title && 'pt-4'` — simpler prop.

### L8. `DashboardView` `currentTime` state triggers full `useMemo` recompute of `remainingHours` every minute — minor churn; could debounce or floor to 5-min grid.

### L9. `Toast` icon mapping uses Material Symbols text strings in buttons → requires font load; if deferred, screen readers may announce "close" garbled during FOIT.

---

## No issues found in these categories

- **Direct DOM manipulation**: only 2 safe sites (`src/components/auth/LoginForm.tsx:28-29`, `RegisterForm.tsx:29-30`) setting CSS custom properties on own button for ripple effect — appropriate use of ref.
- **IntersectionObserver / ResizeObserver / MutationObserver**: **zero** usage. (Could be an opportunity, not a bug.)
- **Conditional hooks**: scanned — none detected inside `if`/loops.
- **`<img>` without `alt`**: all 4 `<img>` usages have meaningful alt text.
- **`useLayoutEffect` miss**: `scrollIntoView` cases use `behavior:'smooth'`, so `useEffect` is fine.
- **Console logs in app code**: zero (all via `@/utils/logger`). CLAUDE.md compliance good.

---

## Recommended ordering (by ROI)

1. **C1 (MessagingContext)** — trivial fix (promote to state), unlocks realtime broadcasts.
2. **C5 + C6 (ErrorBoundary + PWA leak)** — 5-min changes, high protective value.
3. **H9/H10 + M3 + M1 (focus traps, aria-labels, label associations)** — a11y sprint; likely a WCAG 2.1 AA compliance story.
4. **H2 (AbortController across 7+ async effects)** — introduce a tiny `useAbortableEffect` helper or adopt React Query / SWR in Phase 6.
5. **C4 (useLogisticsHealth)** — single-site fix that unblocks the amber-to-red health escalation.
6. **C2 (PickerDrawer logic)** — 1-line typo fix but user-visible.
7. **C3 (useInspectionHistory demo data)** — wire to real Supabase query or remove feature.
8. **H3/H4/H11 (setTimeout + URL + AudioContext leaks)** — shared util + refactor pass.
9. **M5/M6/M7 (keys + keyboard nav + form submit)** — component sprint.
10. **M10/M11/M12 (perf hot-spots)** — indexable once bucketRecords grow past 5k rows.

---

**Top 8 findings — file:line**

1. `src/context/MessagingContext.tsx:411` — `ref.current` in deps ≡ subscription never re-runs; orchard change → no broadcasts.
2. `src/hooks/useLogisticsHealth.ts:132-143` — interval recreated every render; "sustained amber" counter never ticks → red health threshold unreachable in practice.
3. `src/index.tsx:85-98` + `src/routes.tsx:107-121` — no top-level ErrorBoundary; `/login` + `/signup` unprotected from render throws → white screen.
4. `src/components/MFAGuard.tsx:42-83` — async MFA check with fail-open on error + no mount guard → race can grant access to wrong identity on fast user-swap.
5. `src/hooks/useInspectionHistory.ts:75-116` — hardcoded demo inspection data in production; QC audit trail is fictitious.
6. `src/components/PickerDrawer/PickerDrawer.tsx:80` — `!today.empty === false` precedence bug produces inverted notFound branch.
7. `src/hooks/usePwaInstall.ts:58,64` — `appinstalled` listener never removed; accumulates across navigation.
8. `src/components/ui/ModalOverlay.tsx:28-78` + `src/components/PickerDrawer/PickerDrawer.tsx:82-226` + `src/components/ui/Drawer.tsx:37-109` — comments promise a focus trap; only initial focus + Escape implemented. No WAI-ARIA dialog semantics on PickerDrawer. Tab escapes the modal.

---
*Audit produced read-only; no files modified.*
