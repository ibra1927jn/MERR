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

### Create Test Users

In Supabase Authentication → Users, create:

| Email | Password | Role |
|-------|----------|------|
| <man2@gmail.com> | 111111 | Manager |
| <tl@gmail.com> | 111111 | Team Leader |
| <br@gmail.com> | 111111 | Bucket Runner |

Then sync profiles in the SQL Editor:

```sql
INSERT INTO public.users (id, email, full_name, role, is_active)
SELECT id, email, 'Manager Demo', 'manager', true
FROM auth.users WHERE email = 'man2@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'manager', is_active = true;

INSERT INTO public.users (id, email, full_name, role, is_active)
SELECT id, email, 'TL Harvest', 'team_leader', true
FROM auth.users WHERE email = 'tl@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'team_leader', is_active = true;

INSERT INTO public.users (id, email, full_name, role, is_active)
SELECT id, email, 'Runner Pisa', 'runner', true
FROM auth.users WHERE email = 'br@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'runner', is_active = true;
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
2. Login as each role (Manager, Team Leader, Runner)
3. Verify correct dashboard loads for each role
```

### Manager 2FA

```
1. Login as man2@gmail.com
2. Verify MFA setup screen appears
3. (If testing, can skip MFA temporarily)
```

### Offline Mode

```
1. Login as br@gmail.com (Runner)
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
- [ ] Supabase schema migrations executed
- [ ] Test user profiles synced (`public.users` table)
- [ ] RLS policies enabled on all tables
- [ ] Sentry DSN configured for error tracking
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Login tested for all 3 roles
- [ ] Offline mode verified
- [ ] Bundle size checked (`npm run build` output)
