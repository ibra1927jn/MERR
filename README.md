# 🌿 HarvestPro NZ — Industrial Orchard Management Platform

![Version](https://img.shields.io/badge/version-4.2.1-green)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)

> Real-time harvest tracking, wage compliance, and offline-first operations for New Zealand orchards.

---

## 🚀 What It Does

HarvestPro NZ solves the gap between field and office with three core pillars:

| Pillar | Description |
|--------|-------------|
| **Real-Time Ledger** | Immutable record of every bin and bucket via mobile scanning — no paper, no human error |
| **Wage Shield** | Built-in payroll audit and minimum wage compliance to prevent legal disputes |
| **Offline-First** | Advanced sync engine lets crews work 100% disconnected, auto-syncing when signal returns |

---

## 👥 Role-Based System

The platform uses a hierarchical role system. Each role sees a different dashboard:

```
┌───────────────────────────────────────────┐
│              MANAGER                      │
│  • Strategic dashboard (velocity, cost)   │
│  • Productivity heatmaps                  │
│  • Financial reports & payroll            │
│  • Broadcast messaging                    │
│  • 2FA enforced                           │
├───────────────────────────────────────────┤
│           TEAM LEADER                     │
│  • Attendance & check-in/out              │
│  • Row assignments                        │
│  • Quality control                        │
│  • Crew management                        │
├───────────────────────────────────────────┤
│          BUCKET RUNNER                    │
│  • Logistics Hub (scan & deliver bins)    │
│  • QR code scanning                       │
│  • Works fully offline                    │
└───────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript 5.3 + Vite 7 |
| **Styling** | Tailwind CSS 3.4 (high-contrast outdoor design) |
| **State** | Zustand 5 (global) + React Context (auth, messaging) |
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **Offline Storage** | Dexie.js (IndexedDB) — bucket queue, message queue, user cache |
| **Auth** | Supabase Auth + MFA (TOTP) for managers |
| **PWA** | Service Workers via vite-plugin-pwa |
| **Monitoring** | Sentry (errors) + PostHog (analytics) |
| **Testing** | Vitest + Testing Library + Playwright |

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

Run the migration scripts in Supabase SQL Editor:

```bash
# Located in:
supabase/migrations/schema_v1_consolidated.sql
```

### 4. Start Dev Server

```bash
npm run dev
# → http://localhost:3000
```

### 5. Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Manager | <man2@gmail.com> | 111111 |
| Team Leader | <tl@gmail.com> | 111111 |
| Bucket Runner | <br@gmail.com> | 111111 |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── common/          # Shared: SyncStatusMonitor, HarvestSyncBridge, LoadingSkeleton
│   ├── modals/          # AddPickerModal, BroadcastModal, etc.
│   ├── views/
│   │   ├── manager/     # DashboardView, HeatMapView, TeamsView
│   │   ├── team-leader/ # TasksView, RunnersView, ProfileView
│   │   └── runner/      # LogisticsView
│   ├── SimpleChat.tsx   # Unified messaging component
│   ├── MFASetup.tsx     # Two-factor authentication setup
│   └── SecurityDashboard.tsx
├── context/             # AuthContext, MessagingContext
├── hooks/               # useAttendance, useMFA, useCalculations, etc.
├── pages/               # Manager.tsx, TeamLeader.tsx, Runner.tsx
├── services/            # Business logic layer
│   ├── offline.service.ts    # Dexie-based offline queue
│   ├── sync.service.ts       # localStorage sync queue + auto-process
│   ├── bucket-ledger.service.ts
│   ├── compliance.service.ts # Wage compliance checks
│   ├── validation.service.ts # Data integrity layer
│   └── ...
├── stores/              # Zustand store (useHarvestStore)
├── types/               # TypeScript interfaces & database types
└── utils/               # NZST timezone utilities
```

---

## 🧪 Scripts

```bash
npm run dev          # Start development server
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm test             # Run unit tests (Vitest)
npm run test:watch   # Tests in watch mode
npm run test:coverage # Tests with coverage report
```

---

## 🔒 Security

- **Row Level Security (RLS)**: Users only access data from their assigned orchard/team
- **MFA**: Managers require TOTP-based two-factor authentication
- **Audit Logs**: Every data change generates an immutable audit trail
- **Auth Hardening**: Rate limiting, session management, brute-force protection
- **Validation Layer**: `validation.service.ts` ensures data integrity before persistence

---

## 📊 Sprint History

| Sprint | Focus | Key Results |
|--------|-------|-------------|
| **1** | Architecture & Base | Role routing, Supabase integration, component structure |
| **2** | Security Hardening | MFA, auth flows, destructor audit, sync bridge fixes |
| **3** | Clean-Sheet Protocol | 201→0 lint errors, type guards, PATTERNS.md |
| **4** | Warning Reduction | 115→86 warnings (-25%), catch block refactoring, profile sync |
| **5** | Docs + Offline Mode | ← **Current** |

---

## 📚 Additional Docs

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System architecture, data flow, sync pipeline
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Production deployment guide
- [`PATTERNS.md`](./PATTERNS.md) — React & TypeScript patterns reference
- [`MANUAL_OPERACIONES.md`](./MANUAL_OPERACIONES.md) — Operations manual (Spanish)

---

## 📝 License

Proprietary — Harvest NZ Merr. All rights reserved.
