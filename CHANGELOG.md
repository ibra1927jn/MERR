# Changelog

All notable changes to HarvestPro NZ will be documented in this file.

## [9.5.0] - 2026-03-09

### Added

- **Integration test layer** — 89 tests across 5 files testing real cross-cutting flows:
  - `bucket-pipeline.integration.test.ts` (15 tests): Scan → validation → state → payroll recalc
  - `intelligence.integration.test.ts` (11 tests): Payroll math → NZ min wage top-up → idempotency
  - `crew-compliance.integration.test.ts` (13 tests): Crew CRUD → compliance → day lifecycle → persistence
  - `export-validation.integration.test.ts` (28 tests): Payroll → CSV + custom rates + formula injection + validation
  - `sync-offline.integration.test.ts` (22 tests): Error categorization + queue management + offline bucket flow
- **488 new unit tests** across 15 files covering utils, repos, services, stores, and components

### Changed

- Test coverage: **43% → 49.9%** statements, **44.8% → 49.9%** lines
- Test count: **1,737 → 2,400+** across **177 → 202** test suites
- Integration tests use real Zustand store + real compliance.service, mocking only external boundaries (Supabase, Dexie)

### Tests

- 202 test files, 2,400+ tests — ALL PASSING (zero regressions)

## [9.4.0] - 2026-03-08

### Added

- **Storybook** — 19 UI component stories with autodocs (`.storybook/` config + 7 story files)
- **Playwright E2E** — 5 critical user flow tests: login, dashboard, attendance, payroll, admin
- `npm run test:e2e` and `npm run storybook` scripts

### Changed

- **God file refactoring** — 5 files reduced from 1,801 to 990 LOC (45% reduction):
  - `SetupWizard.tsx` 408→185 LOC → `setup-wizard/` (OrchardStep, TeamsStep, RatesStep, SummaryStep)
  - `AnomalyDetectionView.tsx` 346→195 LOC → `anomaly/` (AnomalyCard, SmartDismissals, anomaly.constants)
  - `Admin.tsx` 355→145 LOC → `admin/` (AdminOrchardsTab, AdminUsersTab, AdminComplianceTab)
  - `DashboardView.tsx` 380→265 LOC → DashboardStatCard, DashboardEmptyState
  - `RowAssignmentModal.tsx` 312→200 LOC → RowTeamDisplay, RowGrid
- `push.service.ts` migrated to repository pattern (`push.repository.ts`)
- Vitest config excludes `e2e/` directory
- Playwright config updated to port 5173 with screenshot-on-failure

### Tests

- 177 test files, 1,737 tests — ALL PASSING (zero regressions)

## [9.3.0] - 2026-03-07

### Changed

- Eliminated all `eslint-disable @typescript-eslint/no-explicit-any` from production code
- `storeSync.ts`: 12 `any` → proper `Picker`, `PickerWithAttendance`, `AttendanceRecord` types
- `sentry.ts`: 3 `Record<string, any>` → `Record<string, unknown>`
- `native-scanner.service.ts`: `window as any` → typed `CapacitorWindow` interface
- `conflict.service.ts`: `as any` → `SyncPayload` with proper import
- `useRealtimeSubscription.ts`: `channelConfig: any` → typed config object
- `html5-qrcode.d.ts`: `decodedResult: any` → typed result interface
- `GoalProgress.tsx`: removed dead `velocity` prop and `void velocity` suppression

### Removed

- Dead feature flags from `.env.example` (VITE_FEATURE_DARK_MODE, VITE_FEATURE_PUSH_NOTIFICATIONS)
- `eslint-disable` comments across 7 files (19 instances removed)

### Fixed

- `check_in_time` type mismatch (`null` vs `undefined`) in `storeSync.ts` realtime handler
- Missing `deleted_at` property on `PickerWithAttendance` type for delta sync

## [9.2.0] - 2026-03-06

### Added

- API Gateway pattern with 9 Edge Functions
- Rate limiting infrastructure (60 req/min)
- Push notification service with VAPID keys
- JWT verification on all Edge Functions

## [9.1.0] - 2026-03-05

### Added

- Repository pattern: 30 repositories abstracting data access
- Dark mode integration (Header + DesktopLayout + CSS)
- ThemeToggle UI component

### Changed

- Fraud detection service: removed 130+ LOC of mock data
- AnomalyDetectionView: empty state instead of fake data fallback

### Fixed

- matchMedia polyfill in test-setup.ts for JSDOM

## [9.0.0] - 2026-03-03

### Added

- Initial audited release
- 8 RBAC roles: manager, team_leader, runner, qc_inspector, payroll_admin, admin, hr_admin, logistics
- Offline-first with IndexedDB (9 tables) + sync queue
- Realtime dashboard via Supabase channels
- NZ Labour Law compliance (check-compliance Edge Function)
- Fraud/anomaly detection (ML Edge Function)
- Dead Letter Queue for retry resilience
- i18n support (EN/ES)
- 1,697 passing tests
