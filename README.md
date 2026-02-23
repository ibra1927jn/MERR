# 🌿 HarvestPro NZ — Industrial Orchard Management Platform

![Version](https://img.shields.io/badge/version-7.0.0-green)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-291%20pass-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Lint](https://img.shields.io/badge/lint-0%20errors-brightgreen)
![LOC](https://img.shields.io/badge/LOC-~35k-informational)
![Security](https://img.shields.io/badge/adversarial%20audit-24%20fixes-critical)
![a11y](https://img.shields.io/badge/a11y-WCAG%202.1-blue)

> Real-time harvest tracking, wage compliance, and offline-first operations for New Zealand orchards.

---

## 🚀 What It Does

HarvestPro NZ bridges the gap between field and office with four core pillars:

| Pillar | Description |
| ------ | ----------- |
| **Real-Time Ledger** | Immutable record of every bin and bucket via mobile scanning — no paper, no human error |
| **Wage Shield** | Built-in payroll audit and minimum wage compliance to prevent legal disputes |
| **Offline-First** | Dexie-based sync engine with DLQ, conflict resolution, and atomic retry — crews work 100% disconnected |
| **Central Command** | CSV imports, timesheet corrections, multi-platform payroll exports (Xero, PaySauce) |
| **HR & Contracts** | Employee management, contract lifecycle tracking, compliance alerts |
| **Fleet & Logistics** | Vehicle tracking, transport request dispatch, zone-based bin inventory |

---

## 👥 Role-Based System (8 Roles)

The platform uses a hierarchical role system. Each role sees a dedicated dashboard:

```text
┌───────────────────────────────────────────────────────┐
│                    MANAGER                            │
│  • Strategic dashboard (velocity, cost, earnings)     │
│  • Productivity heatmaps                              │
│  • Broadcast messaging                                │
│  • CSV bulk import / Payroll export                    │
│  • Timesheet correction (audit trail)                 │
│  • 2FA enforced                                       │
├───────────────────────────────────────────────────────┤
│               TEAM LEADER                             │
│  • Attendance & check-in/out                          │
│  • Row assignments                                    │
│  • Crew management                                    │
│  • Transport request submission                       │
├───────────────────────────────────────────────────────┤
│              BUCKET RUNNER                            │
│  • QR / sticker code scanning                         │
│  • Bin delivery tracking                              │
│  • Warehouse management (works fully offline)         │
├───────────────────────────────────────────────────────┤
│              QC INSPECTOR                             │
│  • Quality grading (A/B/C/Reject)                     │
│  • Grade distribution analytics                       │
│  • Inspection history                                 │
├───────────────────────────────────────────────────────┤
│              HR ADMIN                                 │
│  • Employee directory with search                     │
│  • Contract management (permanent/seasonal/casual)    │
│  • Payroll overview with Wage Shield indicators       │
│  • Compliance alerts (expiring contracts, visa)       │
├───────────────────────────────────────────────────────┤
│           LOGISTICS COORDINATOR                       │
│  • Fleet management (tractor/vehicle tracking)        │
│  • Zone map with real-time asset positions             │
│  • Transport request dispatch & assignment            │
│  • Bin inventory (fill status, transit tracking)      │
├───────────────────────────────────────────────────────┤
│             PAYROLL ADMIN                             │
│  • Timesheet approval workflow                        │
│  • Payroll calculations & exports                     │
│  • Wage Shield compliance monitoring                  │
├───────────────────────────────────────────────────────┤
│                 ADMIN                                 │
│  • Full system administration                         │
│  • Dead letter queue management                       │
│  • Security dashboard                                 │
└───────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
| ----- | ---------- |
| **Frontend** | React 19 + TypeScript 5.3 + Vite 7 |
| **Styling** | Tailwind CSS 3.4 + CSS Custom Properties (dynamic theming) |
| **State** | Zustand 5 (global) + React Query 5 (server) + React Context (auth, messaging) |
| **Validation** | Zod 4 (runtime schema validation) |
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **Offline Storage** | Dexie.js (IndexedDB) — sync queue, dead-letter queue, conflict store, user cache |
| **Sync Engine** | Unified Dexie queue (8 types) with DLQ, conflict resolution, optimistic locking |
| **Auth** | Supabase Auth + MFA (TOTP) for managers |
| **PWA** | Service Workers via vite-plugin-pwa (43 precached entries) |
| **Virtual Scrolling** | react-virtuoso for large lists |
| **CSV Parsing** | PapaParse (bulk import with flexible column aliases) |
| **Testing** | Vitest + Testing Library (291 tests across 21 suites) |
| **i18n** | Custom i18n service with EN/ES/MI translations |

---

## 📦 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/ibra1927jn/harvestpro-nz.git
cd harvestpro-nz
npm install
```

### 2. Environment Variables

Create `.env.local` in the project root:

```env
# Supabase (required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Sentry (optional)
VITE_SENTRY_DSN=https://your-sentry-dsn

# PostHog (optional)
VITE_POSTHOG_KEY=your-posthog-key
VITE_POSTHOG_HOST=https://app.posthog.com
```

### 3. Database Setup

Run migrations in Supabase SQL Editor **in order**:

```bash
# 1. Core schema (required first)
supabase/schema_v1_consolidated.sql

# 2. Incremental migrations (in order)
supabase/migrations/20260210_day_closures.sql
supabase/migrations/20260211_*.sql              # Auth, RLS, audit (11 files)
supabase/migrations/20260212_*.sql              # Roles, sync conflicts
supabase/migrations/20260213_timesheet_corrections.sql
supabase/migrations/20260213_phase2_tables.sql  # ← Phase 2: contracts, fleet, transport
supabase/migrations/20260213_rls_remediation.sql # ← RLS fixes: day_closures, bins, qc_inspections

# 3. Seed data
scripts/seed_demo_hr_logistics.sql              # Demo accounts (HR, Logistics roles)
scripts/seed_phase2.sql                         # Demo data (contracts, vehicles, requests)
```

### 4. Start Dev Server

```bash
npm run dev
# → http://localhost:5173
```

### 5. Test Accounts

| Role | Email | Password |
| ---- | ----- | -------- |
| Manager | <manager@harvestpro.nz> | 111111 |
| Team Leader | <lead@harvestpro.nz> | 111111 |
| Bucket Runner | <runner@harvestpro.nz> | 111111 |
| QC Inspector | <qc@harvestpro.nz> | 111111 |
| Payroll Admin | <payroll@harvestpro.nz> | 111111 |
| Admin | <admin@harvestpro.nz> | 111111 |
| HR Admin | <hr@harvestpro.nz> | 111111 |
| Logistics | <logistics@harvestpro.nz> | 111111 |

---

## 📁 Project Structure

```text
src/
├── components/              # ~145 TSX components
│   ├── common/              # Shared components (SyncBridge, ErrorBoundary, VirtualList, etc.)
│   ├── modals/              # 25 modals (AddPicker, ImportCSV, Export, Scanner, etc.)
│   ├── views/
│   │   ├── manager/         # 16 components
│   │   │   ├── DashboardView   → KPIs, velocity, cost, earnings
│   │   │   ├── TeamsView       → Crew management + CSV import
│   │   │   ├── TimesheetEditor → Admin correction with audit trail
│   │   │   ├── HeatMapView     → Row productivity visualization
│   │   │   ├── SettingsView    → Harvest config + compliance toggles
│   │   │   ├── WageShieldPanel → Compliance alerts
│   │   │   └── DayClosureButton → End-of-day lockdown
│   │   ├── team-leader/     # 11 components
│   │   ├── runner/          # 4 components
│   │   ├── qc/              # 4 components (Phase 2)
│   │   │   ├── InspectTab      → Picker search + grade entry (Turbo Mode)
│   │   │   ├── HistoryTab      → Recent inspections list
│   │   │   ├── StatsTab        → Grade distribution analytics
│   │   │   └── DistributionBar → Shared visualization
│   │   ├── hhrr/            # 5 components (Phase 2)
│   │   │   ├── EmployeesTab    → Employee directory + search
│   │   │   ├── ContractsTab    → Contract lifecycle management
│   │   │   ├── PayrollTab      → Payroll overview + wage shield
│   │   │   ├── DocumentsTab    → Document management
│   │   │   └── CalendarTab     → Calendar view
│   │   └── logistics/       # 5 components (Phase 2)
│   │       ├── FleetTab        → Vehicle tracking + zone map
│   │       ├── BinsTab         → Bin inventory + fill status
│   │       ├── RequestsTab     → Transport request cards
│   │       ├── RoutesTab       → Route planning
│   │       └── HistoryTab      → Transport log
│   ├── AuditLogViewer.tsx   # Immutable audit trail viewer
│   ├── SecurityDashboard.tsx # Admin security overview
│   └── MFASetup.tsx         # TOTP 2FA enrollment
├── context/                 # AuthContext, MessagingContext
├── hooks/                   # 20+ custom hooks (useToast, useInspectionHistory, etc.)
├── pages/                   # 9 pages
│   ├── Manager.tsx          → Orchard manager dashboard (7 tabs)
│   ├── TeamLeader.tsx       → Team leader dashboard
│   ├── Runner.tsx           → Bucket runner dashboard
│   ├── QualityControl.tsx   → QC inspector (decomposed → 3 tabs)
│   ├── HHRR.tsx             → HR department (5 tabs)
│   ├── LogisticsDept.tsx    → Logistics department (5 tabs)
│   ├── Payroll.tsx          → Payroll admin dashboard + wage calculator
│   ├── Admin.tsx            → System admin dashboard
│   └── Login.tsx            → Authentication (email/password + MFA)
├── services/                # ~55 service files + test files
│   ├── hhrr.service          → Employee/contract queries (Supabase)
│   ├── logistics-dept.service → Fleet/transport queries (Supabase)
│   ├── payroll.service       → Payroll calculations + timesheets
│   ├── qc.service            → Quality inspections
│   ├── sync.service          → Offline queue (6 types: SCAN, MSG, ATTENDANCE, CONTRACT, TRANSPORT, TIMESHEET)
│   ├── offline.service       → Dexie IndexedDB queue
│   ├── bucket-ledger.service → Immutable scan ledger
│   ├── attendance.service    → Check-in/out + corrections
│   ├── compliance.service    → Wage law alerts + NZ Employment Standards
│   ├── export.service        → CSV/Xero/PaySauce/PDF
│   ├── picker.service        → CRUD + bulk import + soft delete
│   ├── audit.service         → Immutable audit logging
│   ├── authHardening.service → Rate limiting, brute-force protection
│   ├── i18n.service          → EN/ES/MI translations
│   └── ...
├── stores/                  # 8 files — Zustand (useHarvestStore) + React Query + tests
├── types/                   # TypeScript interfaces + database.types.ts
└── utils/
    ├── nzst.ts               → NZST timezone utilities
    ├── csvParser.ts           → CSV parsing with column aliases
    └── logger.ts              → Structured logging
```

---

## 🧪 Scripts

```bash
npm run dev            # Start development server (→ localhost:5173)
npm run build          # TypeScript check + Vite production build
npm run lint           # ESLint check (0 errors)
npm run lint:fix       # ESLint auto-fix
npm run format         # Prettier formatting
npm test               # Run unit tests (Vitest) — 291 tests
npm run test:watch     # Tests in watch mode
npm run test:coverage  # Tests with coverage report
```

---

## ✨ Features by Phase

### Phase 1: Central Command ✅

- **CSV Bulk Import** — Drag & drop upload, flexible column aliases (EN/ES), duplicate detection
- **Timesheet Correction** — Inline edit with mandatory reason, full audit trail
- **Payroll Export** — 4 formats: Generic CSV, Xero, PaySauce, PDF
- **Productivity Heatmap** — Row-level visualization with intensity scaling
- **Broadcast Messaging** — Manager → all crew, real-time delivery
- **Day Closure** — End-of-day lockdown with archive

### Phase 2: Department Services ✅

- **HR Department** (HHRR.tsx)
  - Employee directory with role badges, status, visa info
  - Contract lifecycle: draft → active → expiring → expired → terminated
  - Compliance alerts: expiring contracts, visa monitoring
  - Payroll overview with Wage Shield indicators

- **Logistics Department** (LogisticsDept.tsx)
  - Fleet management: tractor/vehicle status (active/idle/maintenance/offline)
  - Zone map: real-time vehicle positions across orchard zones
  - Transport requests: team leaders request pickups, logistics dispatch vehicles
  - Bin inventory: fill percentage, transit tracking

- **Quality Control** (QualityControl.tsx)
  - Decomposed architecture: InspectTab, HistoryTab, StatsTab
  - Grade entry: A (Export) / B (Domestic) / C (Process) / Reject
  - Distribution analytics with visual bar

- **Payroll Admin** (Payroll.tsx)
  - Timesheet approval workflow
  - Attendance-based calculations

- **Offline-First Sync** (sync.service.ts)
  - 6 queue types: SCAN, MESSAGE, ATTENDANCE, CONTRACT, TRANSPORT, TIMESHEET
  - Conflict resolution with `keep_local` / `keep_remote` (re-queues properly)
  - Auto-retry with 50 attempt cap → Dead Letter Queue
  - DLQ admin editor: edit payload JSON and retry
  - Atomic DLQ persistence (V28 — no data loss on DLQ insert failure)

---

## 🔒 Security

- **Row Level Security (RLS)**: Users only access data from their assigned orchard (22 tables audited, 6 gaps fixed across Sprints 8-10)
- **Role-Based Access**: 8 granular roles with per-table policies
- **MFA**: Managers require TOTP-based two-factor authentication
- **Audit Logs**: Every data change generates an immutable audit trail
- **Auth Hardening**: Rate limiting, session management, brute-force protection
- **Session Lifecycle**: Sign-out wipes Dexie DB, blocks if unsynced data, forces page reload (U6+V26+V27)
- **Conflict Resolution**: `keep_local` properly re-queues via table→type mapping (U7+V25)
- **Dead Letter Queue**: Atomic persistence — items only removed from sync_queue on DLQ success (V28)
- **Financial Guards**: Negative hour prevention (`Math.max(0, ...)`) in payroll + HHRR (U10+U11)
- **Realtime Anti-Squash**: QC/timesheet events append to capped list, not overwrite (U9)
- **Validation Layer**: `validation.service.ts` ensures data integrity
- **Soft Delete**: Pickers are archived, never permanently deleted
- **Error Logging**: All catch blocks log to structured logger (17 silent catches fixed in Sprint 8)

---

## ♿ Accessibility (WCAG 2.1 Level AA)

All form components audited and compliant:

- **Labels**: Every `<input>`, `<select>`, and `<textarea>` linked via `htmlFor`/`id` or `aria-label`
- **ARIA attributes**: Switches use `role="switch"` with proper `aria-checked` string values
- **Screen readers**: Dynamic selects include `aria-label` for assistive context
- **CSS architecture**: Dynamic styles use CSS Custom Properties pattern (no raw inline styles)
- **Keyboard navigation**: All interactive elements keyboard-accessible

Audited components: `NewContractModal`, `AddVehicleModal`, `SetupWizard`, `InlineSelect`, `InlineEdit`, `InspectTab`, `SettingsView`, `NewTransportRequestModal`, `Payroll`, `TeamView`, `ProfileView`, `AddRunnerModal`, `DayConfigModal`, `PickerDetailsModal`, `ProfileModal`, `RowAssignmentModal`, `SettingsFormComponents`

---

## 🗃️ Database Tables

### Core Schema (v1)

| Table | Purpose |
| --- | --- |
| `users` | User profiles linked to auth.users |
| `orchards` | Orchard locations with row count |
| `pickers` | Picker workforce registry |
| `bucket_events` | Immutable scan ledger |
| `daily_attendance` | Check-in/out + timesheet corrections |
| `messages` | Direct + broadcast messaging |
| `audit_logs` | Immutable change history |
| `day_closures` | End-of-day lockdown records |

### Phase 2 Tables

| Table | Purpose |
| --- | --- |
| `contracts` | Employee contracts (permanent/seasonal/casual) with expiry tracking |
| `fleet_vehicles` | Tractor/vehicle fleet with zone, fuel, WOF/COF dates |
| `transport_requests` | Pickup requests from field to warehouse |

### Migrations (30 files)

All in `supabase/migrations/`, idempotent with `IF NOT EXISTS`:

| Migration | Purpose |
| --------- | ------- |
| `schema_v1_consolidated.sql` | Core tables, RLS, helper functions |
| `20260210_day_closures.sql` | Day closure/lockdown functionality |
| `20260211_audit_logging.sql` | audit_logs table with triggers |
| `20260211_auth_hardening.sql` | Rate limiting, login attempts |
| `20260211_complete_rls.sql` | Comprehensive RLS policies |
| `20260211_add_archived_at.sql` | Soft delete support |
| `20260211_idempotent_buckets.sql` | Duplicate bucket prevention |
| `20260211_rls_block_archived_pickers.sql` | RLS for soft-deleted pickers |
| `20260211_rls_offline_closed_days.sql` | RLS for day closures |
| `20260211_row_assignments_columns.sql` | Row assignment schema updates |
| `20260211_timestamptz_audit.sql` | Timestamp corrections |
| `20260211_day_closures_role_restriction.sql` | Role-restricted closures |
| `20260212_add_qc_payroll_roles.sql` | QC/Payroll role additions |
| `20260212_sync_conflicts.sql` | Offline sync conflict table |
| `20260213_timesheet_corrections.sql` | Correction columns on attendance |
| `20260213_phase2_tables.sql` | **contracts, fleet_vehicles, transport_requests** |
| `20260213_daily_attendance.sql` | Daily attendance schema |
| `20260213_payroll_rpc.sql` | Payroll RPC functions |
| `20260213_create_qc_photos_bucket.sql` | QC photo storage bucket |
| `20260213_rls_remediation.sql` | **RLS fixes**: day_closures, bins, qc_inspections |
| `20260214_schema_alignment.sql` | Schema alignment — adds missing columns, ensures consistency |
| `20260214_health_check.sql` | Health check RPC function |
| `20260214_rate_limit_rpc.sql` | Rate limiting RPC function |
| `20260215_add_updated_at.sql` | `updated_at` column for optimistic locking |
| `20260215_bucket_records_updated_at.sql` | `updated_at` on bucket_records |
| `20260217_fix_rls_recursion.sql` | **Sprint 10**: Fix infinite recursion in RLS policies |
| `20260217_fix_bucket_records_rls.sql` | **Sprint 10**: Bucket records RLS hardening |
| `20260217_closed_day_trigger.sql` | **Sprint 10**: Closed-day enforcement trigger |
| `20260217_optimistic_lock_trigger.sql` | **Sprint 10**: Optimistic locking trigger for attendance |
| `001_atomic_rpcs.sql` | **Sprint 11**: Atomic RPC functions for roster, attendance, bins, fleet |

---

## 📊 Sprint History

| Sprint | Focus | Key Results |
| ------ | ----- | ----------- |
| **1** | Architecture & Base | Role routing, Supabase integration, component structure |
| **2** | Security Hardening | MFA, auth flows, destructor audit, sync bridge fixes |
| **3** | Clean-Sheet Protocol | 201→0 lint errors, type guards, PATTERNS.md |
| **4** | Warning Reduction | 115→0 warnings, catch block refactoring, profile sync |
| **5** | Central Command (Phase 1) | CSV bulk import, timesheet corrections, Xero/PaySauce export |
| **6** | Department Services (Phase 2) | HR/Logistics/Payroll wiring to Supabase, QC decomposition, 3 new DB tables, offline sync expansion |
| **7** | Quality Assurance & a11y | 40-point browser audit (all passed), WCAG 2.1 accessibility compliance across 10 components, Playwright E2E tests |
| **8** | Code Quality & Performance | Silent catch fixes (17), RLS remediation (3 tables), `fetchGlobalData` refactor (217→15 lines), DashboardView split (338→190 lines), React.memo on heavy lists, comments standardized to English |
| **9** | Visual Polish & UX | CSS inline styles refactored to CSS Custom Properties + utility classes, `window.alert()` → toast system, double Inter font load eliminated, `max-w-md` constraint removed across 9 files, virtual scrolling (VirtualList), OrchardMapView visual overhaul, animation system (slide-up, breathe, fade-in), demo mode re-enabled in production, 17 accessibility fixes (aria-label, aria-checked), schema alignment migration |
| **10** | Adversarial Hardening (6 rounds) | **24 fixes**: Dexie migration (sync queue, DLQ, conflict store), session sign-out hardening (wipe + reload), conflict resolution `keep_local` re-queue, DLQ edit & retry, atomic DLQ persistence, negative hours guards, realtime anti-squash, RLS recursion fix, bucket_records RLS, closed-day trigger, optimistic locking, NZST-safe calculations |
| **11** | Code Quality & Modernization | React Query integration, Zod validation layer, lint cleanup (0 errors, 0 warnings), atomic RPCs for roster/attendance/bins/fleet, optimistic lock trigger, setupWizard service, Result<T> type pattern |

---

## 🗺️ Roadmap — Next Steps

### Pre-Pilot (Deployment)

| # | Feature | Priority | Status |
| --- | ------- | -------- | ------ |
| 1 | **Apply migrations in Supabase** — Execute all SQL files in production DB | 🔴 Critical | Pending |
| 2 | **Auth flow verification** — Full signup → email verify → role assign → login | 🔴 Critical | Pending |
| 3 | **Monitoring setup** — Configure Sentry DSN + PostHog for production visibility | High | Pending |

### Feature Enhancements

| # | Feature | Priority | Status |
| --- | ------- | -------- | ------ |
| 1 | **Push notifications** — Web Push for urgent transport requests | Medium | Planned |
| 2 | **Contract action buttons** — Renew, terminate from ContractsTab UI | Medium | Planned |
| 3 | **Transport dispatch UI** — Accept/assign/complete in RequestsTab | Medium | Planned |
| 4 | **Weekly/monthly reporting** — Automated email reports for managers | Medium | Planned |
| 5 | **Cost analytics** — Labour cost per bin, per zone, per team | Medium | Planned |
| 6 | **Rate limiting** — Client-side throttle for scan operations | Low | Planned |
| 7 | **Performance monitoring** — Web Vitals + Lighthouse CI | Low | Planned |

### Already Completed ✅

| Feature | Sprint |
| ------- | ------ |
| PWA (Service Worker + manifest.json + offline caching via `vite-plugin-pwa`) | 7 |
| Realtime dashboard (Supabase channels in `useHarvestStore` + `MessagingContext`) | 6 |
| Seed data (`seed_season_simulation.sql` + `seed_demo_hr_logistics.sql`) | 6 |
| Error boundaries — React boundaries per route + ComponentErrorBoundary | 7–9 |
| Accessibility audit — WCAG 2.1 AA compliance across 17+ components | 7–9 |
| Silent catch fixes (17) + structured logging | 8 |
| RLS remediation (22 tables audited, 3 gaps fixed) | 8 |
| `fetchGlobalData` refactor (217→15 lines) + DashboardView split (338→190 lines) | 8 |
| React.memo on heavy list components | 8 |
| CSS Custom Properties system (20+ utility classes for dynamic styles) | 9 |
| Toast notification system (replaces all `window.alert()`) | 9 |
| VirtualList component (`@tanstack/react-virtual`) | 9 |
| OrchardMapView visual overhaul (animated row cards, gradient fills) | 9 |
| Animation system (slide-up, breathe, fade-in, micro-interactions) | 9 |
| Demo mode available in production | 9 |
| Schema alignment migration (`20260214_schema_alignment.sql`) | 9 |
| Unit test coverage — 279 tests across 21 suites | 3–10 |
| Dexie-based sync with DLQ + conflict store (replaces localStorage queues) | 10 |
| Session sign-out hardening (Dexie wipe + sync guard + hard reload) | 10 |
| Conflict resolution `keep_local` → re-queue with table→type map | 10 |
| DLQ admin editor (edit payload JSON + retry) | 10 |
| Atomic DLQ persistence (V28) | 10 |
| Negative hours financial guards (Math.max in payroll + HHRR) | 10 |
| Realtime anti-squash (QC/timesheet → capped list) | 10 |
| RLS recursion fix + bucket_records RLS + closed-day trigger | 10 |
| React Query integration (`@tanstack/react-query` + `queryClient.ts`) | 11 |
| Zod runtime schema validation | 11 |
| Lint cleanup — 0 errors, 0 warnings | 11 |
| Atomic RPCs for roster, attendance, bins, fleet operations | 11 |
| Optimistic lock trigger for attendance records | 11 |
| Result<T> type pattern for type-safe error handling | 11 |

---

## 📚 Additional Docs

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System architecture, data flow, sync pipeline
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Production deployment guide
- [`PATTERNS.md`](./PATTERNS.md) — React & TypeScript patterns reference
- [`MANUAL_OPERACIONES.md`](./MANUAL_OPERACIONES.md) — Operations manual (Spanish)
- [`SETUP_SECRETS.md`](./SETUP_SECRETS.md) — Environment variable configuration
- [`docs/DEMO_SCRIPT.md`](./docs/DEMO_SCRIPT.md) — Demo walkthrough script
- [`docs/FUNCTIONAL_AUDIT.md`](./docs/FUNCTIONAL_AUDIT.md) — Functional audit report

---

## 📝 License

Proprietary — Harvest NZ Merr. All rights reserved.

---

_Last updated: 2026-02-23 | Sprint 11 — Code Quality & Modernization (React Query, Zod, atomic RPCs, lint cleanup)_
