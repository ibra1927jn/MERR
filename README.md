# 🌿 HarvestPro NZ — Industrial Orchard Management Platform

![Version](https://img.shields.io/badge/version-6.1.0-green)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-127%20passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Lint](https://img.shields.io/badge/lint-0%20errors-brightgreen)
![a11y](https://img.shields.io/badge/a11y-WCAG%202.1-blue)

> Real-time harvest tracking, wage compliance, and offline-first operations for New Zealand orchards.

---

## 🚀 What It Does

HarvestPro NZ bridges the gap between field and office with four core pillars:

| Pillar | Description |
| ------ | ----------- |
| **Real-Time Ledger** | Immutable record of every bin and bucket via mobile scanning — no paper, no human error |
| **Wage Shield** | Built-in payroll audit and minimum wage compliance to prevent legal disputes |
| **Offline-First** | Dual-queue sync engine (Dexie + localStorage) lets crews work 100% disconnected |
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
| **Styling** | Tailwind CSS 3.4 (high-contrast outdoor design) |
| **State** | Zustand 5 (global) + React Context (auth, messaging) |
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **Offline Storage** | Dexie.js (IndexedDB) — bucket queue, message queue, user cache |
| **Sync Engine** | Dual-queue: Dexie (bulk scans) + localStorage (messages, attendance, contracts, transport) |
| **Auth** | Supabase Auth + MFA (TOTP) for managers |
| **PWA** | Service Workers via vite-plugin-pwa |
| **CSV Parsing** | PapaParse (bulk import with flexible column aliases) |
| **Monitoring** | Sentry (errors) + PostHog (analytics) |
| **Testing** | Vitest + Testing Library + Playwright |
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

# 3. Seed data
scripts/seed_demo_hr_logistics.sql              # Demo accounts (HR, Logistics roles)
scripts/seed_phase2.sql                         # Demo data (contracts, vehicles, requests)
```

### 4. Start Dev Server

```bash
npm run dev
# → http://localhost:3000
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
├── components/              # ~105 total components
│   ├── common/              # 17 shared components (SyncBridge, ErrorBoundary, SetupWizard, etc.)
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
├── hooks/                   # 17 custom hooks (15 hooks + 2 test files)
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
├── services/                # 37 service files + 10 test files
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
├── stores/                  # 8 files — Zustand (useHarvestStore) + tests
├── types/                   # TypeScript interfaces + database.types.ts
└── utils/
    ├── nzst.ts               → NZST timezone utilities
    ├── csvParser.ts           → CSV parsing with column aliases
    └── logger.ts              → Structured logging
```

---

## 🧪 Scripts

```bash
npm run dev            # Start development server (→ localhost:3000)
npm run build          # TypeScript check + Vite production build
npm run lint           # ESLint check (0 errors, 0 warnings)
npm run lint:fix       # ESLint auto-fix
npm run format         # Prettier formatting
npm test               # Run unit tests (Vitest) — 127 tests, 12 suites
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
  - Last-write-wins conflict resolution
  - Auto-retry with 50 attempt cap

---

## 🔒 Security

- **Row Level Security (RLS)**: Users only access data from their assigned orchard
- **Role-Based Access**: 8 granular roles with per-table policies
- **MFA**: Managers require TOTP-based two-factor authentication
- **Audit Logs**: Every data change generates an immutable audit trail
- **Auth Hardening**: Rate limiting, session management, brute-force protection
- **Validation Layer**: `validation.service.ts` ensures data integrity
- **Soft Delete**: Pickers are archived, never permanently deleted

---

## ♿ Accessibility (WCAG 2.1 Level AA)

All form components audited and compliant:

- **Labels**: Every `<input>`, `<select>`, and `<textarea>` linked via `htmlFor`/`id`
- **ARIA attributes**: Switches use `role="switch"` with proper `aria-checked` string values
- **Screen readers**: Dynamic selects include `aria-label` for assistive context
- **No inline styles**: CSS moved to Tailwind utility classes
- **Keyboard navigation**: All interactive elements keyboard-accessible

Audited components: `NewContractModal`, `AddVehicleModal`, `SetupWizard`, `InlineSelect`, `InlineEdit`, `InspectTab`, `SettingsView`, `NewTransportRequestModal`, `Payroll`

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

### Migrations (18 files)

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

---

## 🗺️ Roadmap — Next Steps

### Phase 3: Real-Time & Production Ready

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| 1 | **Apply Phase 2 migrations** — Execute pending SQL migrations in Supabase | 🔴 Critical | Pending |
| 2 | **Seed data** — Run `seed_season_simulation.sql` for realistic test data | 🔴 Critical | Pending |
| 3 | **Auth flow verification** — Full signup → email verify → role assign → login | 🔴 Critical | Pending |
| 4 | **PWA configuration** — Service worker, manifest.json, offline caching | High | Pending |
| 5 | **Realtime dashboard** — Supabase Realtime subscriptions for live updates | High | Pending |
| 6 | **Push notifications** — Web Push for urgent transport requests | Medium | Pending |
| 7 | **Contract action buttons** — Renew, terminate from ContractsTab UI | Medium | Pending |
| 8 | **Transport dispatch UI** — Accept/assign/complete in RequestsTab | Medium | Pending |

### Phase 4: Analytics & Reporting

| # | Feature | Priority |
|---|---------|----------|
| 1 | **Weekly/monthly reporting** — Automated email reports for managers | High |
| 2 | **Cost analytics** — Labour cost per bin, per zone, per team | High |
| 3 | **Seasonal workforce planning** — Contract expiry forecast dashboard | Medium |
| 4 | **Export history** — Log all payroll exports with download links | Medium |

### Phase 5: Production Hardening

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| 1 | **E2E tests** — Playwright tests for all critical flows | High | ✅ Framework ready |
| 2 | **Unit test coverage** — Increase from 127 to 200+ tests | High | 12 test suites |
| 3 | **Error boundaries** — React error boundaries per route | Medium | ✅ Done |
| 4 | **Accessibility audit** — WCAG 2.1 compliance | Medium | ✅ Done |
| 5 | **Rate limiting** — Client-side throttle for scan operations | Medium | Pending |
| 6 | **Performance monitoring** — Web Vitals + Lighthouse CI | Low | Pending |

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

_Last updated: 2026-02-13 | Sprint 7 — Quality Assurance & Accessibility_
