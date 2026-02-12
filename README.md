# 🌿 HarvestPro NZ — Industrial Orchard Management Platform

![Version](https://img.shields.io/badge/version-5.0.0-green)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-127%20passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Lint](https://img.shields.io/badge/lint-0%20errors-brightgreen)

> Real-time harvest tracking, wage compliance, and offline-first operations for New Zealand orchards.

---

## 🚀 What It Does

HarvestPro NZ bridges the gap between field and office with four core pillars:

| Pillar | Description |
| ------ | ----------- |
| **Real-Time Ledger** | Immutable record of every bin and bucket via mobile scanning — no paper, no human error |
| **Wage Shield** | Built-in payroll audit and minimum wage compliance to prevent legal disputes |
| **Offline-First** | Advanced dual-queue sync engine lets crews work 100% disconnected, auto-syncing when signal returns |
| **Central Command** | CSV imports, timesheet corrections, and multi-platform payroll exports (Xero, PaySauce) |

---

## 👥 Role-Based System

The platform uses a hierarchical role system. Each role sees a different dashboard:

```text
┌───────────────────────────────────────────────────┐
│                  MANAGER                          │
│  • Strategic dashboard (velocity, cost, earnings) │
│  • Productivity heatmaps                          │
│  • Broadcast messaging                            │
│  • CSV bulk import                                │
│  • Timesheet correction (audit trail)             │
│  • Xero / PaySauce payroll export                 │
│  • 2FA enforced                                   │
├───────────────────────────────────────────────────┤
│               TEAM LEADER                         │
│  • Attendance & check-in/out                      │
│  • Row assignments                                │
│  • Quality control & inspection history           │
│  • Crew management                                │
├───────────────────────────────────────────────────┤
│              BUCKET RUNNER                        │
│  • Logistics Hub (scan & deliver bins)            │
│  • QR / sticker code scanning                     │
│  • Warehouse management                           │
│  • Works fully offline                            │
└───────────────────────────────────────────────────┘
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

Run the consolidated schema first, then apply incremental migrations:

```bash
# 1. Core schema
supabase/migrations/schema_v1_consolidated.sql

# 2. Incremental migrations (in order)
supabase/migrations/20260210_day_closures.sql
supabase/migrations/20260211_*.sql          # Auth, RLS, audit
supabase/migrations/20260212_*.sql          # Roles, sync conflicts
supabase/migrations/20260213_timesheet_corrections.sql
```

See [`supabase/migrations/README.md`](./supabase/migrations/README.md) for details.

### 4. Start Dev Server

```bash
npm run dev
# → http://localhost:3000
```

### 5. Test Accounts

| Role | Email | Password |
| ---- | ----- | -------- |
| Manager | <man2@gmail.com> | 111111 |
| Team Leader | <tl@gmail.com> | 111111 |
| Bucket Runner | <br@gmail.com> | 111111 |

---

## 📁 Project Structure

```text
src/
├── components/
│   ├── common/              # SyncStatusMonitor, HarvestSyncBridge, LoadingSkeleton
│   ├── modals/              # 22 modals (AddPicker, ImportCSV, Export, Scanner, etc.)
│   │   ├── ImportCSVModal    → 4-step wizard for bulk picker import
│   │   └── ExportModal       → 4-format payroll export (CSV/Xero/PaySauce/PDF)
│   ├── views/
│   │   ├── manager/          # 16 components
│   │   │   ├── DashboardView   → KPIs, velocity, cost, earnings
│   │   │   ├── TeamsView       → Crew management + CSV import
│   │   │   ├── TimesheetEditor → Admin correction with audit trail
│   │   │   ├── HeatMapView     → Row productivity visualization
│   │   │   ├── WageShieldPanel → Compliance alerts
│   │   │   ├── LogisticsView   → Bin tracking & runner dispatch
│   │   │   ├── RowListView     → Row-by-row assignment overview
│   │   │   └── DayClosureButton → End-of-day lockdown
│   │   ├── team-leader/      # 11 components
│   │   │   ├── HomeView        → Daily overview & stats
│   │   │   ├── AttendanceView  → Check-in/out management
│   │   │   ├── TasksView       → Row assignments & progress
│   │   │   └── TeamView        → Crew roster & details
│   │   └── runner/           # 4 components
│   │       ├── LogisticsView   → Scan & deliver workflow
│   │       └── WarehouseView   → Bin inventory management
│   ├── AuditLogViewer.tsx    # Immutable audit trail viewer
│   ├── MFASetup.tsx          # TOTP two-factor authentication
│   └── SecurityDashboard.tsx
├── context/                 # AuthContext, MessagingContext
├── hooks/                   # 15 custom hooks
│   ├── useAttendance         → Check-in/out management
│   ├── useCalculations       → Piece rate & minimum wage math
│   ├── useCompliance         → Real-time wage compliance
│   ├── useMFA                → Multi-factor auth flow
│   ├── usePickerManagement   → CRUD + soft delete
│   ├── useRowAssignments     → Row ↔ picker mapping
│   └── useTranslation        → i18n hook
├── pages/                   # Manager.tsx, TeamLeader.tsx, Runner.tsx
├── services/                # 29 service files (business logic layer)
│   ├── attendance.service    → Check-in/out + timesheet corrections
│   ├── bucket-ledger.service → Immutable scan ledger
│   ├── compliance.service    → Minimum wage violation detection
│   ├── export.service        → CSV/Xero/PaySauce/PDF export
│   ├── offline.service       → Dexie-based IndexedDB queue
│   ├── sync.service          → localStorage queue + auto-process
│   ├── picker.service        → Picker CRUD + bulk import
│   ├── validation.service    → Data integrity layer
│   ├── audit.service         → Immutable audit logging
│   ├── i18n.service          → EN/ES/MI translations
│   └── ...
├── stores/                  # Zustand store (useHarvestStore)
├── types/                   # TypeScript interfaces & database types
└── utils/
    ├── nzst.ts               → NZST timezone utilities
    ├── csvParser.ts           → CSV parsing with column alias mapping
    └── logger.ts              → Structured logging
```

---

## 🧪 Scripts

```bash
npm run dev            # Start development server (→ localhost:3000)
npm run build          # TypeScript check + Vite production build
npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm test               # Run unit tests (Vitest) — 127 tests, 9 suites
npm run test:watch     # Tests in watch mode
npm run test:coverage  # Tests with coverage report
```

---

## ✨ Key Features (Phase 1: Central Command)

### CSV Bulk Import

Upload a CSV file with picker data (name, email, phone, picker ID) to onboard workers in bulk.

- **Drag & drop** or file browser upload
- **Flexible column aliases** — supports English and Spanish headers (Name/Nombre/Worker)
- **Duplicate detection** against existing database records
- **Batch processing** in chunks of 50 rows with per-row error fallback
- **Template download** for users who need the format

### Timesheet Correction

Admins can edit past attendance records with a mandatory audit trail.

- Select any past date and view all attendance records
- Inline edit check-in / check-out times
- **Mandatory reason** field for every correction
- Visual indicators: ⚠️ missing check-outs, 🔴 shifts > 12 hours
- Full audit trail: `corrected_by`, `corrected_at`, `correction_reason`
- Immutable log entry in `audit_logs` table

### Payroll Export (Xero / PaySauce / CSV / PDF)

One-click payroll export in 4 formats:

| Format | Use Case | Structure |
| ------ | -------- | --------- |
| **Generic CSV** | Excel / Google Sheets | Employee ID, Name, Buckets, Hours, Earnings |
| **Xero** | Xero Payroll import | 3 line items per picker (Ordinary Hours, Piece Rate Bonus, Wage Top-Up) |
| **PaySauce** | PaySauce import | Aggregated single line per picker |
| **PDF** | Print / records | Branded report with summary grid |

---

## 🔒 Security

- **Row Level Security (RLS)**: Users only access data from their assigned orchard/team
- **MFA**: Managers require TOTP-based two-factor authentication
- **Audit Logs**: Every data change generates an immutable audit trail
- **Auth Hardening**: Rate limiting, session management, brute-force protection
- **Validation Layer**: `validation.service.ts` ensures data integrity before persistence
- **Soft Delete**: Pickers are archived, never permanently deleted

---

## 🗃️ Database Migrations

All migrations are in `supabase/migrations/` and use `IF NOT EXISTS` for idempotency:

| Migration | Purpose |
| --------- | ------- |
| `schema_v1_consolidated.sql` | Core tables: orchards, pickers, bucket_events, daily_attendance, etc. |
| `20260210_day_closures.sql` | Day closure/lockdown functionality |
| `20260211_audit_logging.sql` | audit_logs table with triggers |
| `20260211_auth_hardening.sql` | Rate limiting, login attempts tracking |
| `20260211_complete_rls.sql` | Comprehensive Row Level Security policies |
| `20260212_sync_conflicts.sql` | Offline sync conflict resolution table |
| `20260213_timesheet_corrections.sql` | Correction columns + index on daily_attendance |

---

## 📊 Sprint History

| Sprint | Focus | Key Results |
| ------ | ----- | ----------- |
| **1** | Architecture & Base | Role routing, Supabase integration, component structure |
| **2** | Security Hardening | MFA, auth flows, destructor audit, sync bridge fixes |
| **3** | Clean-Sheet Protocol | 201→0 lint errors, type guards, PATTERNS.md |
| **4** | Warning Reduction | 115→0 warnings, catch block refactoring, profile sync |
| **5** | Central Command (Phase 1) | CSV bulk import, timesheet corrections, Xero/PaySauce export |

---

## 📚 Additional Docs

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System architecture, data flow, sync pipeline
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Production deployment guide
- [`PATTERNS.md`](./PATTERNS.md) — React & TypeScript patterns reference
- [`MANUAL_OPERACIONES.md`](./MANUAL_OPERACIONES.md) — Operations manual (Spanish)
- [`SETUP_SECRETS.md`](./SETUP_SECRETS.md) — Environment variable configuration
- [`supabase/migrations/README.md`](./supabase/migrations/README.md) — Migration guide

---

## 📝 License

Proprietary — Harvest NZ Merr. All rights reserved.
