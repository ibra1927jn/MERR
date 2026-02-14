# 🚀 Deployment Guide — HarvestPro NZ

## Prerequisites

- Node.js 18+ and npm 9+
- A [Supabase](https://supabase.com) project
- A [Vercel](https://vercel.com) account (or any static host)
- Git repository access

---

## 1. Supabase Setup

### Create Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose a name (e.g., `harvestpro-nz`) and region close to NZ
4. Save the **Project URL** and **Anon Key** from Settings → API

### Run Database Migrations

In the Supabase SQL Editor, execute:

```sql
-- Run the consolidated schema
-- File: supabase/migrations/schema_v1_consolidated.sql
```

### Run Database Migrations (in order)

In the Supabase SQL Editor, execute each migration file:

```bash
# 1. Core schema (required first)
supabase/schema_v1_consolidated.sql

# 2. Incremental migrations (in order)
supabase/migrations/20260210_day_closures.sql
supabase/migrations/20260211_*.sql              # Auth, RLS, audit (11 files)
supabase/migrations/20260212_*.sql              # Roles, sync conflicts
supabase/migrations/20260213_timesheet_corrections.sql
supabase/migrations/20260213_phase2_tables.sql  # contracts, fleet, transport
supabase/migrations/20260213_daily_attendance.sql
supabase/migrations/20260213_payroll_rpc.sql
supabase/migrations/20260213_create_qc_photos_bucket.sql

# 3. Seed data
supabase/seeds/seed_season_simulation.sql       # Full season simulation data
scripts/seed_demo_hr_logistics.sql              # Demo accounts (HR, Logistics roles)
scripts/seed_phase2.sql                         # Demo data (contracts, vehicles, requests)
```

### Create Test Users

In Supabase Authentication → Users, create:

| Email | Password | Role |
|-------|----------|------|
| <manager@harvestpro.nz> | 111111 | Manager |
| <lead@harvestpro.nz> | 111111 | Team Leader |
| <runner@harvestpro.nz> | 111111 | Bucket Runner |
| <qc@harvestpro.nz> | 111111 | QC Inspector |
| <payroll@harvestpro.nz> | 111111 | Payroll Admin |
| <admin@harvestpro.nz> | 111111 | Admin |
| <hr@harvestpro.nz> | 111111 | HR Admin |
| <logistics@harvestpro.nz> | 111111 | Logistics |

Then sync profiles in the SQL Editor:

```sql
-- Sync all user profiles (repeat for each role)
INSERT INTO public.users (id, email, full_name, role, is_active)
SELECT id, email, 'Manager Demo', 'manager', true
FROM auth.users WHERE email = 'manager@harvestpro.nz'
ON CONFLICT (id) DO UPDATE SET role = 'manager', is_active = true;
-- ... repeat for each role (see README.md for full list)
```

---

## 2. Environment Variables

### Local Development (`.env.local`)

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
VITE_SENTRY_DSN=https://your-sentry-dsn (optional)
VITE_POSTHOG_KEY=your-posthog-key (optional)
VITE_POSTHOG_HOST=https://app.posthog.com (optional)
```

### Production (Vercel)

Add the same variables in Vercel → Project → Settings → Environment Variables.

> ⚠️ **Never commit `.env.local` to Git.** It's already in `.gitignore`.

---

## 3. Deploy to Vercel

### Option A: Via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B: Via GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Vercel auto-detects Vite — settings should be:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables
6. Click **Deploy**

---

## 4. Post-Deploy Verification

After deployment, verify these critical flows:

### Login Test

```
1. Go to https://your-app.vercel.app/login
2. Login as each role (Manager, Team Leader, Runner, QC, HR, Logistics, Payroll, Admin)
3. Verify correct dashboard loads for each role
```

### Manager 2FA

```
1. Login as manager@harvestpro.nz
2. Verify MFA setup screen appears
3. (If testing, can skip MFA temporarily)
```

### Offline Mode

```
1. Login as runner@harvestpro.nz
2. Open DevTools → Network → check "Offline"
3. Verify red "You are Offline" banner appears
4. Scan a bucket (should queue locally)
5. Uncheck "Offline"
6. Verify orange "Syncing..." then items sync
```

---

## 5. Troubleshooting

### Build Fails

```bash
# Check TypeScript errors
npx tsc --noEmit

# Check lint errors
npm run lint

# Common fix: clear node_modules
rm -rf node_modules && npm install
```

### "User profile not found" on Login

The user exists in `auth.users` but not in `public.users`. Run the profile sync SQL above.

### Supabase Connection Errors

1. Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
2. Verify the Supabase project is not paused (free tier pauses after inactivity)
3. Check RLS policies allow the operation

### Offline Data Not Syncing

1. Check browser Console for `[Bridge]` or `[SyncService]` errors
2. Verify IndexedDB has data: DevTools → Application → IndexedDB → HarvestProDB
3. Check `localStorage` for `harvest_sync_queue` key
4. Ensure the `online` event fires: toggle DevTools Network offline/online

### Blank Screen After Deploy

1. Check Vercel build logs for errors
2. Verify all env vars are set in Vercel
3. Check browser Console for errors
4. Try hard refresh (Ctrl+Shift+R)

---

## 6. Production Checklist

- [ ] Environment variables set in Vercel
- [ ] Supabase core schema migration executed
- [ ] Phase 2 migrations executed (contracts, fleet, transport)
- [ ] Seed data loaded (`seed_season_simulation.sql`)
- [ ] Test user profiles synced (`public.users` table)
- [ ] RLS policies enabled on all tables
- [ ] Sentry DSN configured for error tracking
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Login tested for all 8 roles
- [ ] Offline mode verified
- [ ] Accessibility verified (WCAG 2.1 AA)
- [ ] Bundle size checked (`npm run build` output)
- [ ] PWA manifest and service worker configured

## 7. Production Monitoring Setup

### Sentry (Error Tracking)

1. Create a project at [sentry.io](https://sentry.io) → **Create Project** → Select **React**
2. Copy the DSN (looks like `https://xxx@o123.ingest.sentry.io/456`)
3. Add to `.env.local` and Vercel:

```env
VITE_SENTRY_DSN=https://your-key@o123.ingest.sentry.io/456
```

1. Verify: trigger a test error in dev, confirm it appears in Sentry dashboard

**Recommended Alert Rules:**

- First occurrence of any new issue
- Error spike > 10 events/hour
- Unhandled promise rejections

### PostHog (Product Analytics)

1. Create a project at [posthog.com](https://posthog.com) → **New Project**
2. Copy the API key and host URL
3. Add to `.env.local` and Vercel:

```env
VITE_POSTHOG_KEY=phc_your_key_here
VITE_POSTHOG_HOST=https://app.posthog.com
```

1. Verify: log in to the app, check PostHog events dashboard for `$pageview`

**Key Events to Track:**

- Login success/failure by role
- Bucket scans per session
- Offline sync completion
- Payroll calculations

### Verifying Monitoring

```bash
# Check Sentry: trigger a test error
console.error(new Error('Sentry test'));

# Check PostHog: verify pageview events in dashboard
# Navigate between pages and confirm events appear
```

---

## 8. Backup Strategy

### Automatic Backups (Supabase Pro Plan)

- **Daily backups**: retained for 7 days (Pro) or 30 days (Enterprise)
- **Point-in-time recovery**: restore to any second within retention window
- Access via: Supabase Dashboard → Settings → Database → Backups

### Manual Backup via `pg_dump`

```bash
# Get connection string from Supabase Dashboard → Settings → Database → Connection String
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  --format=custom \
  --no-owner \
  --file=harvestpro_backup_$(date +%Y%m%d).dump
```

### Recovery Runbook

1. **Minor issue** (single table): Use Supabase Table Editor to restore from backup
2. **Major issue** (full restore):
   - Supabase Dashboard → Settings → Database → Backups → Restore
   - Or use `pg_restore` with the manual dump
3. **Point-in-time**: Dashboard → Backups → Point in Time Recovery → Select timestamp

### Backup Schedule Recommendation

| Method | Frequency | Retention | Responsibility |
|--------|-----------|-----------|---------------|
| Supabase auto | Daily | 7 days | Automatic |
| Manual pg_dump | Weekly | 90 days | DevOps/Manual |
| Pre-migration | Before each deploy | Permanent | Developer |

---

## 9. Health Check

### RPC Health Check

After running the `20260214_health_check.sql` migration, call:

```sql
SELECT health_check();
```

Returns JSON with DB status, table row counts, and RLS verification.

### Application Health

```bash
# Build check
npm run build

# TypeScript check
npx tsc --noEmit

# Unit tests
npm test

# PWA audit
npx lighthouse http://localhost:3002 --only-categories=pwa
```

---

_Last updated: 2026-02-14 | Sprint 7_
