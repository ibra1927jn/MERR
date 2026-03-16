# Supabase Migrations

## Structure

```
migrations/
├── 000_baseline.sql          # Consolidated baseline (all 35 migrations)
├── archive/                  # Original individual migrations (for reference)
│   ├── 001_atomic_rpcs.sql
│   ├── 20260210_day_closures.sql
│   ├── ... (35 files)
│   └── 20260303_security_hardening.sql
└── README.md
```

## For New Deployments

Apply the single baseline:

```bash
supabase db reset          # Applies 000_baseline.sql automatically
```

## For Existing Deployments

The original 35 migrations in `archive/` are already tracked by Supabase's
migration system. **Do not re-apply them**. New migrations should be added
as new files with timestamp prefixes (e.g., `20260307_new_feature.sql`).

## Adding New Migrations

```bash
supabase migration new <name>
# Edit the generated file in migrations/
supabase db push
```

## Schema Overview

The baseline covers:

| Area | Tables |
|------|--------|
| Core | `users`, `orchards`, `blocks`, `rows`, `shift_configs` |
| Operations | `attendance`, `bucket_records`, `daily_closures` |
| Admin | `allowed_registrations`, `audit_log`, `sync_conflicts` |
| Security | RLS policies, rate limiting, auth hardening |
| Performance | Indexes, triggers, RPCs |
