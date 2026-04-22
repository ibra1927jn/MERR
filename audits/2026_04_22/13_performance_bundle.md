# Performance & Bundle Audit — HarvestPro NZ

Date: 2026-04-22
Scope: runtime performance, bundle size, data-fetching patterns
Mode: READ-ONLY (no build, no install)
Repo: `/root/repos/harvestpro-nz`
Build artifacts inspected: `dist/assets/` (latest build 2026-04-22 06:28 UTC)

---

## Severity summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High     | 5 |
| Medium   | 7 |
| Low      | 5 |
| **Total**| **18** |

---

## Bundle headline

- **Total JS shipped: ~2,377 KB uncompressed** across 69 JS chunks.
- **CSS: 170 KB** in a single file (`index-BdsLCqJ4.css`). All Tailwind utility output ships eagerly; no route-level CSS split.
- **Initial load estimate (login page)**:
  - `index-BwB6s5vq.js` (**470 KB**) + `vendor-react` (96 KB) + `vendor-state` (109 KB) + `vendor-supabase` (167 KB) + `Login` (24 KB) + CSS (170 KB) ≈ **1.03 MB uncompressed / ~310 KB gzip estimate**.
  - `vendor-sentry` (436 KB) and `vendor-analytics` (171 KB) are deferred via `requestIdleCallback` in `src/index.tsx:103` — good.
- **Largest chunks** (top 6 by raw size):
  1. `index-BwB6s5vq.js` — **470 KB** (main entry; oversized; see F-01)
  2. `vendor-sentry-BGbusvO3.js` — 436 KB (deferred)
  3. `vendor-analytics-BIdvvprf.js` — 171 KB (deferred PostHog)
  4. `vendor-supabase-rHgJDrTE.js` — 167 KB (eager, needed)
  5. `Manager-BQXPTxL_.js` — 165 KB (manager role entry)
  6. `vendor-state-IAjO2TFS.js` — 109 KB (zustand + dexie + react-query)

Top dependency-size drivers observed via package.json: `@sentry/react` (436 KB chunk), `posthog-js` (171 KB chunk), `@supabase/supabase-js` (167 KB), `dexie` (inside vendor-state), `papaparse` (~50 KB but bundled inside a lazy modal chunk via TeamsView — see F-04). **No moment, no lodash, no full MUI, no recharts/d3, no xlsx** — the charting is a hand-rolled SVG `TrendLineChart` in `src/components/charts/TrendLineChart.tsx`. 

---

## Top findings (ordered)

### F-01 [HIGH] Main entry chunk is 470 KB — eager imports leaking into `index-*.js`

- File: `dist/assets/index-BwB6s5vq.js` (470 KB raw).
- The route file (`src/routes.tsx`) lazy-loads all 10 pages correctly via `React.lazy`, so pages are NOT in index. The bloat is from eager imports in `src/index.tsx` and `src/context/` (AppProvider) plus code reached through Zustand store initialisation.
- Evidence of heavy eager reach: `AppProvider` pulls the whole Zustand store, which registers 7 slices (`src/stores/slices/` totals 1,911 lines). The store imports repositories (Supabase already extracted) but also translations (`src/services/translations/{en,es,sm,to}.ts` ≈ 850 lines combined) via the `I18nProvider`.
- Also eager: `MFAGuard`, `HarvestSyncBridge`, `StoragePersistBanner`, `ErrorBoundary`, `useAuth` — collectively moderate but add up.
- **Impact:** LCP on the login page is blocked on a 470 KB main chunk even though the user only sees Login. Gzipped this is ~150 KB — still borderline for a field-worker PWA on 3G.
- **Recommendation:** Split translation locale files into per-locale dynamic `import('./translations/' + locale + '.ts')` (only `en` needs to be eager). Move `SyncStatusMonitor` out of idle path if it isn't used pre-auth. Consider lazy `I18nProvider` data.

### F-02 [CRITICAL] N+1 serial Supabase query in MPI batch export

- File: `src/services/mpi-export.service.ts:180`

```ts
for (const binId of uniqueBinIds) {
  const trace = await this.generateBinTrace(binId, orchardId);
  if (trace) records.push(trace);
}
```

Each `generateBinTrace` issues 2 queries (`bucket_records` + `orchard_blocks`). A peak-season export touching 500 bins = **~1,000 serial round-trips to Supabase**. At 100 ms/query that's 100 seconds of blocking time.
- **Recommendation:** Batch via one `.in('bin_id', uniqueBinIds)` query with a Supabase view or RPC; or at minimum `Promise.all()` with a concurrency limit (e.g., 10).
- Other loops inspected (`predictions.service.ts:135, 210`, `services/harvestMetrics/perPicker.ts:42`, `services/harvestMetrics/hours.ts:59`, `services/harvestMetrics/perTeam.ts`, `services/rest-break-compliance.service.ts:120`) are in-memory reductions over already-fetched arrays — **safe**.

### F-03 [HIGH] Unbounded `SELECT *` on `bucket_records` in the storeSync hot path

- File: `src/repositories/store-sync.repository.ts:34`

```ts
getBucketRecordsQuery(orchardId: string, since: string) {
  return supabase
    .from('bucket_records').select('*').eq('orchard_id', orchardId)
    .gte('scanned_at', since).order('scanned_at', { ascending: false });
}
```

No `.limit()`, no column projection. In peak harvest a single orchard generates ~2,000 bucket_records/day. If the client has been offline for a week the delta-sync returns 14k rows, every column (including potentially large jsonb/quality_photos). Combined with `.select('*')` on `pickers` + `daily_attendance` join (line 24), boot payload can exceed 5 MB on a phone.
- **Related:** `src/repositories/baseRepository.ts:37` — the generic `findAll()` uses `.select('*')` by default; **40 call-sites across `src/` use `.select('*')`** (grep count).
- **Recommendation:** Project only columns the UI consumes (e.g., `id, picker_id, scanned_at, quality_grade, bin_id, row_number`). Add a hard `.limit(5000)` with pagination/cursor.

### F-04 [HIGH] Heavy modals imported eagerly by Manager & TeamsView

- `src/pages/Manager.tsx:41-44` eagerly imports `DaySettingsModal`, `AddPickerModal`, `BroadcastModal`, `RowAssignmentModal` (all live in the Manager chunk but render only when a boolean state flips).
- `src/components/views/manager/TeamsView.tsx:9` eagerly imports `ImportCSVModal` (398 lines + papaparse) → papaparse ends up bundled into Manager's reachable graph even for users who never import CSV.
- `src/components/views/team-leader/TeamView.tsx:4-5` eagerly imports `AddPickerModal` + `PickerDetailsModal`.
- **Impact:** Manager chunk 165 KB could shed ~30–40 KB by lazy-loading modals.
- **Recommendation:** Convert all modal imports to `React.lazy` + `<Suspense fallback={null}>` — modals only render on demand, fallback can be invisible.

### F-05 [HIGH] List components without `React.memo` on large collections

- `src/components/views/team-leader/TeamView.tsx` — maps up to ~450 pickers to JSX with 8 nested divs each. No row-level component, no `React.memo`. Any state change in the parent (search input, modal open) rerenders every card.
- `src/components/views/team-leader/AttendanceView.tsx:73` — same pattern on `mergedList.map(...)`, no key-level memo.
- Only 4 components in `views/manager/` use `React.memo` (DashboardStatCard, LiveFloor, TeamsView, PerformanceFocus). Total repo uses of `React.memo` = 14 across components, most on leaf cards.
- Good: `EmployeesTab.tsx` uses `Virtuoso` for virtualisation; `PayrollTabs.tsx` uses `TableVirtuoso`.
- **Missing virtualisation** on: `TeamView`, `AttendanceView`, `RunnersView`, `BinsTab`, `ContractsTab`, `DocumentsTab`, `AuditLogViewer` rows (28 KB chunk — likely table of logs).
- **Recommendation:** Extract `<PickerCard>` / `<AttendanceRow>` as `React.memo` leaves with stable key props; wrap lists > 100 items in `VirtualList` (already exists at `src/components/ui/VirtualList.tsx`).

### F-06 [HIGH] Blocking Google Fonts `@import` in CSS kills LCP

- `src/index.css:2`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
```

- `@import` inside CSS is **render-blocking and chained** (CSS fetch → parse → discover @import → fetch fonts). The `index.html` already has `preconnect` to `fonts.googleapis.com` (line 37), but the actual Inter stylesheet `<link>` is missing — only Material Symbols is linked (line 39).
- 6 font weights loaded (400/500/600/700/800/900) — most codebases use 3-4.
- `display=swap` is good (FOIT prevention), but the @import cascade delays LCP 150–400 ms on 3G.
- **Recommendation:** Replace the CSS `@import` with an `index.html` `<link rel="stylesheet" href="...Inter...">` tag (parallel fetch) or self-host 2-3 Inter weights. Drop unused weights.

---

## Medium findings

### F-07 [MEDIUM] `mockServiceWorker.js` + `stats.html` shipped in production `dist/`

- `dist/mockServiceWorker.js` (9 KB) and `dist/stats.html` (702 KB!) are precached by the service worker (see `sw.js` `precacheAndRoute` list above — both appear).
- **702 KB of bundle-visualizer HTML** is pushed to every user via `include-assets` pattern `**/*.{js,css,html,ico,png,svg}` in `vite.config.ts:52`.
- **Recommendation:** Add `stats.html` and `mockServiceWorker.js` to `globIgnores` in VitePWA config, or emit stats.html outside `dist/`.

### F-08 [MEDIUM] React Query `refetchOnReconnect: 'always'` + polling intervals may stampede

- `src/config/queryClient.ts:19`: `refetchOnReconnect: 'always'` triggers simultaneous refetch of every mounted query when the network returns. On an orchard WiFi dropout with 15-20 mounted queries, Supabase gets a burst.
- Polling intervals observed:
  - `useRunnerData.ts:81` — `setInterval(poll, 5000)` — 5 s poll on a mobile device is aggressive.
  - `useHarvestMetrics.ts:47` — 60 s (fine, but re-renders tree).
  - `useCompliance.ts:159`, `notification.service.ts:190`, `useLogisticsHealth.ts:133`, `SyncStatusBadge.tsx:51` — 5–60 s intervals.
- **Recommendation:** Use React Query's `refetchInterval` instead of raw `setInterval` to benefit from dedup; stagger reconnect refetches; raise runner poll to 15–30 s with visibilitychange-aware pausing.

### F-09 [MEDIUM] Two QR scanner worker bundles shipped

- `qr-scanner-worker.min-D85Z9gVD.js` (43 KB) and `qr-scanner-worker.min-PJMWJc5V.js` (43 KB) — same lib emitted twice with different hashes (likely from both web and capacitor scanner paths including via different import shapes).
- **Recommendation:** Deduplicate by importing the web worker from a single location; `@capacitor-community/barcode-scanner` is already externalised in `vite.config.ts:84`, so check `ScannerModal` / `native-scanner.service.ts` for redundant `qr-scanner` imports.

### F-10 [MEDIUM] Three `MessagingView` chunks with 284 bytes each

- `MessagingView-CyEZoTTV.js`, `-D4NqJRUa.js`, `-DKJmt_zv.js` — all 284 B. Likely re-exports from three call-sites (manager/runner/team-leader all lazy-import `./MessagingView` producing triplicate re-export chunks). Not a size concern, but signals a chunking misconfig.
- **Recommendation:** Centralise `MessagingView` lazy import; or add to `manualChunks` as a shared chunk.

### F-11 [MEDIUM] Inline date formatting inside render

- 48 occurrences of `toLocaleDateString`/`toLocaleTimeString`/`toLocaleString` across view components (grep count), e.g., `EmployeesTab.tsx:122`, `AttendanceView.tsx:92`. `Intl.DateTimeFormat` is expensive (~0.3–1 ms/call); in a 450-row list that's 150–450 ms per render.
- **Recommendation:** Memoise formatters at module scope: `const fmt = new Intl.DateTimeFormat('en-NZ', {...}); fmt.format(date)`. Saves ~10–20x per call.

### F-12 [MEDIUM] Full-column `.select('*')` on 40 query sites

- Grep: 40 `.select('*')` call-sites (down from 48 if we exclude tests). Includes `baseRepository.findAll`, `user.repository.ts`, `picker.repository.ts`, `bucket-ledger.repository.ts`, `hr-documents.repository.ts`, `messaging.repository.ts`, etc.
- Egress + client parse cost is real on mobile.
- **Recommendation:** Per-repository column lists; update `baseRepository.findAll` to accept `select` param.

### F-13 [MEDIUM] `Header` imports still eager inside each page

- `src/pages/Manager.tsx:38` imports `Header` eagerly (6.8 KB chunk already split), but it's used in mobile layout only after `isDesktop` check — effectively always dominant.
- Not a size issue; more a tree-shaking opportunity: `BottomNav` + `DesktopLayout` are both eagerly imported in all role pages (each ships both layouts regardless of breakpoint).

---

## Low findings

### F-14 [LOW] `orchard-hero.png` is 123 KB PNG

- `public/orchard-hero.png` (123 KB) — used only on login's `HeroPanel.tsx:18`. Could be 25–40 KB as WebP/AVIF. `sharp` is already a devDep.

### F-15 [LOW] CSS single chunk 170 KB (no per-route CSS)

- Tailwind purge is active (Tailwind 3.4), so 170 KB is already minimal for the surface area, but no CSS-splitting means every route downloads all styles. Vite supports CSS code-split automatically for lazy routes — verify `build.cssCodeSplit` default is active (it is, by default in Vite 7).

### F-16 [LOW] Material Symbols loaded with variable-font axes spanning full range

- `index.html:39`: `family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap` — loads all weights 100..700 across FILL axis. If the app uses only weight 400, restrict to `@400,400` for ~60% smaller font file.

### F-17 [LOW] `React.memo` missing on `DashboardView` and `HeatMapView`

- `DashboardView.tsx` (349 LOC, eager import in Manager) receives `crew`, `bucketRecords`, `stats` — every Manager rerender rerenders the full dashboard subtree. Not memo'd.

### F-18 [LOW] LRU cache mentioned in memory note — not present here

- User memory references `LRU cache 300x speedup` from the ultra-engine project. No `lru-cache` / `quickLru` in `harvestpro-nz/src/`. Reliance on React Query's 5-min `staleTime` (`queryClient.ts:15`) is the only client cache. Not a bug — just confirming scope boundaries.

---

## Appendix — evidence quick reference

| Finding | File | Line |
|---------|------|------|
| F-01 | `dist/assets/index-BwB6s5vq.js` | 470 KB raw |
| F-02 | `src/services/mpi-export.service.ts` | 180 |
| F-03 | `src/repositories/store-sync.repository.ts` | 34 |
| F-04 | `src/pages/Manager.tsx` | 41-44 |
| F-04 | `src/components/views/manager/TeamsView.tsx` | 9 |
| F-04 | `src/components/views/team-leader/TeamView.tsx` | 4-5 |
| F-05 | `src/components/views/team-leader/TeamView.tsx` | 98-179 |
| F-05 | `src/components/views/team-leader/AttendanceView.tsx` | 73 |
| F-06 | `src/index.css` | 2 |
| F-07 | `dist/stats.html` + `dist/sw.js` precache | — |
| F-08 | `src/config/queryClient.ts` | 19 |
| F-08 | `src/hooks/useRunnerData.ts` | 81 |
| F-09 | `dist/assets/qr-scanner-worker.min-*.js` | 2 copies |
| F-10 | `dist/assets/MessagingView-*.js` | 3 copies |
| F-11 | `src/components/views/hhrr/EmployeesTab.tsx` | 122 |
| F-12 | 40 `.select('*')` sites | grep-wide |
| F-14 | `public/orchard-hero.png` | 123 KB |

---
