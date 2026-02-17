# 🏗️ Architecture — HarvestPro NZ

## System Overview

```text
┌─────────────────────────────────────────────────────────┐
│                    React 19 + Vite 7                    │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Pages(9) │  │  Components  │  │   Context/Hooks  │  │
│  │ Manager  │  │ Views/Modals │  │ AuthContext       │  │
│  │ TeamLead │  │ Common       │  │ MessagingContext  │  │
│  │ Runner   │  │ Chat/MFA     │  │ useHarvestStore   │  │
│  │ QC       │  │ qc/ hhrr/    │  │                   │  │
│  │ HHRR     │  │ logistics/   │  │                   │  │
│  │ Logistics│  │              │  │                   │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘  │
│       └───────────────┼────────────────────┘            │
│                       ▼                                 │
│  ┌─────────────── Service Layer (37 files) ──────────┐ │
│  │ bucket-ledger │ attendance │ compliance │ payroll  │ │
│  │ validation    │ messaging  │ analytics  │ audit    │ │
│  │ picker        │ user       │ sticker    │ export   │ │
│  │ hhrr          │ logistics  │ qc         │ config   │ │
│  │ i18n          │ conflict   │ feedback   │ sync     │ │
│  │ authHardening │ calculations │ notification │      │ │
│  └───────┬──────────────────────────────┬────────────┘ │
│          ▼                              ▼              │
│  ┌──────────────┐              ┌────────────────────┐  │
│  │  Supabase    │              │  Dexie (IndexedDB) │  │
│  │  PostgreSQL  │◄────sync────►│  Offline Queue     │  │
│  │  + RLS + Auth│              │  + User Cache      │  │
│  └──────────────┘              └────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow: Offline → Online Sync

The system uses a dual-queue architecture for offline resilience:

```text
                    ┌─ Queue 1: Dexie (IndexedDB) ─┐
Bucket Scan ───────►│ offline.service.ts             │
                    │ • queueBucket()                │
                    │ • getPendingBuckets()           │
                    └────────────┬───────────────────┘
                                 │
                    HarvestSyncBridge.tsx
                    • Polls pending buckets every 5s–5min
                    • Batch inserts to Supabase
                    • Exponential backoff on failure
                    • Handles duplicates (23505)
                                 │
                                 ▼
                    ┌── Supabase (bucket_events) ──┐
                    │ INSERT rows on success        │
                    │ markAsSynced() in Dexie       │
                    └──────────────────────────────┘


                    ┌─ Queue 2: localStorage ──────┐
Messages / ────────►│ sync.service.ts                │
Attendance          │ • addToQueue('SCAN'|'MSG'|...) │
                    │ • processQueue() on 'online'   │
                    │ • 50 retry cap per item         │
                    └────────────┬───────────────────┘
                                 │
                    Auto-triggered by:
                    • window 'online' event
                    • 5s after page load
                                 │
                                 ▼
                    ┌── Supabase (various tables) ─┐
                    │ bucket_events                 │
                    │ attendance_records             │
                    │ messages                       │
                    └──────────────────────────────┘
```

### Why Two Queues?

| Queue                      | Storage      | Purpose                                              |
| -------------------------- | ------------ | ---------------------------------------------------- |
| **Dexie (Queue 1)**        | IndexedDB    | Bucket scans — large volume, needs persistent storage |
| **localStorage (Queue 2)** | localStorage | Messages, attendance — smaller items, simpler API    |

---

## State Management

```text
┌──────────────────────────────────────────┐
│            Zustand Store                 │
│         useHarvestStore.ts               │
│                                          │
│  • buckets[]     (scanned buckets)       │
│  • settings      (harvest config)        │
│  • roster[]      (picker list)           │
│  • addBucket()   → auto-queues offline   │
│  • markAsSynced()                        │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│          React Context                   │
│                                          │
│  AuthContext.tsx                          │
│  • user, appUser, currentRole            │
│  • signIn(), signOut(), signUp()         │
│  • loadUserData() from 'users' table     │
│                                          │
│  MessagingContext.tsx                     │
│  • conversations, unreadCount            │
│  • Real-time Supabase subscriptions      │
└──────────────────────────────────────────┘
```

---

## Component Hierarchy by Role

### Manager (`/manager`)

```text
Manager.tsx (7 tabs in bottom nav)
├── DashboardView      → KPIs, velocity, cost, earnings metrics
├── TeamsView           → Crew management + CSV bulk import
│   └── ImportCSVModal  → 4-step wizard (Upload → Preview → Import → Done)
├── TimesheetEditor     → Admin timesheet correction with audit trail
├── LogisticsView       → Bin tracking, runner dispatch, pickup requests
├── MessagingView       → Broadcast + direct messaging
├── RowListView         → Row-by-row assignment overview + HeatMap
├── AuditLogViewer      → Immutable audit trail viewer
├── WageShieldPanel     → Real-time compliance alerts
├── VelocityChart       → Harvest velocity over time
├── DayClosureButton    → End-of-day lockdown
├── ExportModal         → 4-format export (CSV/Xero/PaySauce/PDF)
└── MFAGuard            → Enforces 2FA before dashboard access
```

### Team Leader (`/team-leader`)

```text
TeamLeader.tsx
├── HomeView            → Daily overview, stats, earnings
├── AttendanceView      → Check-in/out management
├── TasksView           → Daily tasks, row assignments
├── TeamView            → Crew roster & picker details
├── RunnersView         → Runner status & location
├── ProfileView         → Personal settings
└── MessagingView       → Team messaging
```

### Bucket Runner (`/runner`)

```text
Runner.tsx
├── LogisticsView       → Bin scanning, delivery tracking
├── WarehouseView       → Bin inventory management
├── RunnersView         → Runner coordination
├── QR Scanner          → html5-qrcode integration
└── SyncStatusMonitor   → Offline/online status bar
```

### QC Inspector (`/quality-control`)

```text
QualityControl.tsx (thin router → 130 lines)
├── InspectTab          → Picker search, grade buttons (A/B/C/Reject), notes
├── HistoryTab          → Recent inspections list with grade badges
├── StatsTab            → Grade distribution analytics
└── DistributionBar     → Shared stacked bar visualization
```

### HR Admin (`/hhrr`)

```text
HHRR.tsx (DesktopLayout + 5 tabs)
├── EmployeesTab        → Directory with search, role badges, visa/status
├── ContractsTab        → Contract list with type badges, renewal warnings
├── PayrollTab          → Weekly summary, wage shield indicators
├── DocumentsTab        → Document management
└── CalendarTab         → Calendar view
```

### Logistics Coordinator (`/logistics`)

```text
LogisticsDept.tsx (DesktopLayout + 5 tabs)
├── FleetTab            → Zone map + tractor cards (active/idle/maintenance)
├── BinsTab             → Bin inventory with fill progress bars
├── RequestsTab         → Transport request cards with priority/status
├── RoutesTab           → Route planning
└── HistoryTab          → Transport log (trips, duration, bins moved)
```

---

## Database Schema (Supabase)

### Core Tables

| Table | Purpose | Key Fields |
| --- | --- | --- |
| `users` | User profiles linked to auth | id, email, full_name, role, is_active |
| `orchards` | Orchard locations | id, name, total_rows |
| `pickers` | Picker workforce registry | id, name, picker_id, team_leader_id, status |
| `bucket_events` | Immutable scan ledger | id, picker_id, orchard_id, quality_grade, recorded_at |
| `daily_attendance` | Daily check-in/out | picker_id, orchard_id, check_in/out_time, correction_reason, corrected_by, corrected_at |
| `messages` | Messaging system | sender_id, content, channel_type, created_at |
| `audit_logs` | Immutable change history | action, entity_type, entity_id, performed_by, new_values, notes |
| `day_closures` | End-of-day lockdown records | orchard_id, date, closed_by, closed_at |

### Phase 2 Tables

| Table | Purpose | Key Fields |
| --- | --- | --- |
| `contracts` | Employee contracts | employee_id, type (permanent/seasonal/casual), start_date, end_date, hourly_rate, status |
| `fleet_vehicles` | Fleet management | name, type, driver_id, zone, status, fuel_level, wof_expiry, cof_expiry |
| `transport_requests` | Transport dispatch | requester_id, zone, bins_count, priority, status, assigned_vehicle_id |

### Security

- All tables have **Row Level Security** (RLS) policies
- Users can only access data for their assigned orchard
- Audit trail entries are insert-only (immutable)
- Phase 2 tables use role-based helpers: `is_hr_manager_or_admin()`, `is_logistics_or_manager()`

---

## Service Layer Map

| Service | Responsibility | Key Functions |
| --- | --- | --- |
| `bucket-ledger` | Record bucket scans | `recordBucket()`, `getTodayBuckets()` |
| `attendance` | Picker check-in/out + corrections | `checkInPicker()`, `checkOutPicker()`, `getAttendanceByDate()`, `correctAttendance()` |
| `compliance` | Wage law compliance (NZST) | `checkMinimumWage()`, `detectViolations()`, `isBreakOverdue()` |
| `payroll` | Edge Function payroll calc | `calculatePayroll()` via `supabase.functions.invoke`, `fetchTimesheets()`, `approveTimesheet()` |
| `validation` | Data integrity | `validateBucketScan()`, `validatePicker()` |
| `analytics` | Performance metrics | `getHarvestVelocity()`, `getProductivityStats()` |
| `audit` | Audit trail | `logAction()`, `getAuditHistory()` |
| `offline` | Dexie queue mgmt | `queueBucket()`, `getPendingCount()` |
| `sync` | localStorage queue (6 types) | `addToQueue()`, `processQueue()` — SCAN, MSG, ATTENDANCE, CONTRACT, TRANSPORT, TIMESHEET |
| `simple-messaging` | Chat system | `sendMessage()`, `getConversations()` |
| `picker` | Picker CRUD + bulk | `addPicker()`, `addPickersBulk()`, `softDeletePicker()` |
| `user` | User management | `getUsers()`, `assignUserToOrchard()` |
| `sticker` | QR/sticker resolution | `resolveSticker()`, `createSticker()` |
| `export` | Data export (configurable rates) | `exportToCSV()`, `exportToXero()`, `exportToPaySauce()`, `exportToPDF()`, `preparePayrollData(crew, date, { pieceRate, minWage, unpaidBreakMinutes })` |
| `i18n` | Internationalization | `translate()`, `setLocale()` (EN/ES/MI) |
| `conflict` | Sync conflict resolution | `detectConflict()`, `resolveConflict()` |
| `config` | App configuration | `getConfig()`, environment validation |
| `feedback` | User feedback | `submitFeedback()` |
| `hhrr` | HR department (Phase 2) | `fetchHRSummary()`, `fetchEmployees()`, `fetchPayroll()`, `fetchComplianceAlerts()`, `fetchContracts()`, `createContract()` |
| `logistics-dept` | Logistics department (Phase 2) | `fetchLogisticsSummary()`, `fetchFleet()`, `fetchTransportRequests()`, `createTransportRequest()`, `assignVehicleToRequest()` |
| `qc` | Quality control | `logInspection()`, `getInspections()`, `getGradeDistribution()` |

---

## Offline Storage (Dexie/IndexedDB)

Database name: `HarvestProDB` (version 3)

| Table | Key | Purpose |
| --- | --- | --- |
| `bucket_queue` | id, picker_id, orchard_id, synced | Offline bucket scan queue |
| `message_queue` | id, recipient_id, synced | Offline message queue |
| `sync_queue` | id, type, payload, retryCount, timestamp | Unified sync queue (6 types) |
| `dead_letter_queue` | id, type, payload, error, movedAt | Failed items after 50 retries |
| `sync_conflicts` | id, table, record_id, local_values, remote_values | Conflict pairs for resolution |
| `user_cache` | id | Cached user profiles for offline |
| `settings_cache` | id | Cached harvest settings |
| `runners_cache` | id | Cached runner data |

Field `synced`: `0` = pending, `1` = synced, `-1` = error.

---

_Last updated: 2026-02-17 | Sprint 10 — Deep Logic & Math Audit (16 fixes)_

### Round 3 Audit (2026-02-17)

| ID | Severity | Fix |
|----|----------|-----|
| L1 | 🔴 | NZST week calculation → `Intl.DateTimeFormat` (DST-safe) |
| L2 | 🔴 | `settingsSlice` OCC → `count:'exact'` |
| L3 | 🔴 | Payroll `fetch()` → `supabase.functions.invoke()` (JWT refresh) |
| L5/L10 | 🟠 | `useCalculations` → `totalEarnings`, `topUp` fields |
| L6/L15 | 🟠 | PaySauce no fake hours, no `Math.max(h,1)` distortion |
| L7 | 🟠 | Compliance break check → `nowNZST()` |
| L8 | 🟠 | Live picker hours from `check_in_time` (was 0) |
| L9 | 🟠 | Export accepts configurable `pieceRate`/`minWage` |
| L12 | 🟡 | Sticker `extractPickerIdFromSticker` → consistent normalize |
| L13 | 🔴 | Sticker Supabase queries → NZST offset (no lost morning scans) |
| L14 | 🔴 | Removed 12h hour cap → flags `>14h` for manager review |
| L16 | 🟠 | Configurable unpaid break deduction (`unpaidBreakMinutes`) |

### Round 5 Audit — Dexie Migration & Logic Hardening (2026-02-16)

| ID | Severity | Fix |
|----|----------|-----|
| Fix 1-4 | 🔴 | Migrated sync queue from localStorage to Dexie (IndexedDB) |
| Fix 5-6 | 🔴 | DLQ (Dead Letter Queue) + conflict store in Dexie |
| Fix 7-8 | 🔴 | Mutex for sync processing + retry count tracking |
| Fix 9 | 🟠 | Optimistic locking for attendance records |
| Fix 10 | 🟠 | Reconnection sync jitter → immediate (users lock phones) |
| Fix 12 | 🟠 | Realtime events stored in Zustand (not window.dispatchEvent) |

### Round 6 Audit — Session Lifecycle Hardening (2026-02-17)

| ID | Severity | Fix |
|----|----------|-----|
| U6+V26+V27 | 🔴 | Sign-out: sync guard → Dexie wipe → hard reload |
| U7+V25 | 🔴 | Conflict `keep_local` re-queues via TABLE_TO_SYNC_TYPE map |
| V28 | 🔴 | DLQ insert atomic — item only deleted from sync_queue on success |
| U8 | 🟠 | DLQ Edit & Retry capability for admin payload fixing |
| U9 | 🟠 | QC/timesheet realtime events → append-to-list (capped 10) |
| U10 | 🟠 | `hhrr.service` negative hours guard (`Math.max(0, ...)`) |
| U11 | 🟠 | `payroll.service` negative hours guard (`Math.max(0, ...)`) |

_Last updated: 2026-02-17 | Sprint 10 — Adversarial Hardening (24 fixes across 6 rounds)_
