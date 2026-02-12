# 🏗️ Architecture — HarvestPro NZ

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React 19 + Vite 7                    │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Pages   │  │  Components  │  │   Context/Hooks  │  │
│  │ Manager  │  │ Views/Modals │  │ AuthContext       │  │
│  │ TeamLead │  │ Common       │  │ MessagingContext  │  │
│  │ Runner   │  │ Chat/MFA     │  │ useHarvestStore   │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘  │
│       └───────────────┼────────────────────┘            │
│                       ▼                                 │
│  ┌─────────────── Service Layer ──────────────────────┐ │
│  │ bucket-ledger │ attendance │ compliance │ payroll  │ │
│  │ validation    │ messaging  │ analytics  │ audit    │ │
│  │ picker        │ user       │ sticker    │ export   │ │
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

```
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

| Queue | Storage | Purpose |
|-------|---------|---------|
| **Dexie (Queue 1)** | IndexedDB | Bucket scans — large volume, needs persistent storage |
| **localStorage (Queue 2)** | localStorage | Messages, attendance — smaller items, simpler API |

---

## State Management

```
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

```
Manager.tsx
├── DashboardView      → KPIs, velocity, cost metrics
├── TeamsView           → Crew management, add/remove pickers
├── HeatMapView         → Row-by-row productivity visualization
├── SecurityDashboard   → MFA stats, auth hardening metrics
├── AuditLogViewer      → Immutable audit trail viewer
├── SimpleChat          → Messaging (broadcast + direct)
└── MFAGuard            → Enforces 2FA before dashboard access
```

### Team Leader (`/team-leader`)

```
TeamLeader.tsx
├── TasksView           → Daily tasks, row assignments
├── RunnersView         → Runner status & location
├── ProfileView         → Personal settings
├── SimpleChat          → Team messaging
└── Attendance widget   → Check-in/out pickers
```

### Bucket Runner (`/runner`)

```
Runner.tsx
├── LogisticsView       → Bin scanning, delivery tracking
├── QR Scanner          → html5-qrcode integration
└── SyncStatusMonitor   → Offline/online status bar
```

---

## Database Schema (Supabase)

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | User profiles linked to auth | id, email, full_name, role, is_active |
| `orchards` | Orchard locations | id, name, total_rows |
| `pickers` | Picker workforce registry | id, full_name, badge_id, team_leader_id |
| `bucket_events` | Immutable scan ledger | id, picker_id, orchard_id, quality_grade, recorded_at |
| `attendance_records` | Daily check-in/out | picker_id, orchard_id, check_in_time, check_out_time |
| `messages` | Messaging system | sender_id, content, channel_type, created_at |
| `audit_trail` | Immutable change history | table_name, record_id, action, old_data, new_data |

### Security

- All tables have **Row Level Security** (RLS) policies
- Users can only access data for their assigned orchard
- Audit trail entries are insert-only (immutable)

---

## Service Layer Map

| Service | Responsibility | Key Functions |
|---------|---------------|---------------|
| `bucket-ledger` | Record bucket scans | `recordBucket()`, `getTodayBuckets()` |
| `attendance` | Picker check-in/out | `checkInPicker()`, `checkOutPicker()` |
| `compliance` | Wage law compliance | `checkMinimumWage()`, `detectViolations()` |
| `payroll` | Earnings calculation | `calculateDailyPay()`, `getBonusRate()` |
| `validation` | Data integrity | `validateBucketScan()`, `validatePicker()` |
| `analytics` | Performance metrics | `getHarvestVelocity()`, `getProductivityStats()` |
| `audit` | Audit trail | `logAction()`, `getAuditHistory()` |
| `offline` | Dexie queue mgmt | `queueBucket()`, `getPendingCount()` |
| `sync` | localStorage queue | `addToQueue()`, `processQueue()` |
| `simple-messaging` | Chat system | `sendMessage()`, `getConversations()` |
| `picker` | Picker CRUD | `addPicker()`, `softDeletePicker()` |
| `user` | User management | `getUsers()`, `assignUserToOrchard()` |
| `sticker` | QR/sticker resolution | `resolveSticker()`, `createSticker()` |
| `export` | Data export | `exportToCSV()`, `generateReport()` |

---

## Offline Storage (Dexie/IndexedDB)

Database name: `HarvestProDB` (version 3)

| Table | Key | Purpose |
|-------|-----|---------|
| `bucket_queue` | id, picker_id, orchard_id, synced | Offline bucket scan queue |
| `message_queue` | id, recipient_id, synced | Offline message queue |
| `user_cache` | id | Cached user profiles for offline |
| `settings_cache` | id | Cached harvest settings |
| `runners_cache` | id | Cached runner data |

Field `synced`: `0` = pending, `1` = synced, `-1` = error.
