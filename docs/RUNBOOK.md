# HarvestPro NZ — Production Runbook

> **INF-3 FIX:** This runbook was identified as missing in the external audit.  
> Update it whenever a new failure mode is discovered and resolved.

**Last updated:** 20 March 2026

---

## 1. Edge Function Failure

**Symptoms:** API calls 500, picker scanning fails, payroll returns error.

```bash
# Check logs
supabase functions logs calculate-payroll --tail
# Redeploy all functions
supabase functions deploy --all
```

**Fallback:** Workers can continue scanning offline — records queue to IndexedDB. Payroll falls back to direct DB queries.

---

## 2. Sync Queue Overflow

**Symptoms:** Persistent "Syncing…" indicator, growing bucket count.

1. DevTools → Application → IndexedDB → `harvestpro-offline` → `dead_letter_queue`
2. From browser console: `await syncService.forceFlush()`
3. Clear stale DLQ items: `await deadLetterQueueService.clearStale()`

---

## 3. Database Incident

> [!CAUTION]
> PITR restores the ENTIRE database. Export payroll data first.

- Supabase Dashboard → Settings → Database → Backups → Point-in-time restore
- Emergency export: `pg_dump $DATABASE_URL -F c -f backup_$(date +%Y%m%d).dump`

---

## 4. Offline Data Recovery

1. Reconnect device — app auto-syncs on reconnect
2. Watch "Syncing…" → "Synced" badge
3. If sync fails: **Settings → Sync Now**

> [!WARNING]
> If worker's device is replaced, AES key (from localStorage salt) is lost. Unsynced data on that device cannot be recovered. Synced Supabase data is unaffected.

---

## 5. Emergency Wage Rate Update

1. Admin → Settings → Wage Rates
2. Update affected roles, set **Effective From** to government mandate date
3. Historical payroll is NOT retroactively recalculated

```sql
-- Direct DB update if UI unavailable
UPDATE wage_rates
SET hourly_rate = 23.15, notes = 'Emergency update', updated_at = NOW()
WHERE job_type = 'picker' AND hourly_rate < 23.15;
```

---

## 6. Account Lock

```sql
-- Unlock a locked user account
DELETE FROM user_lockouts WHERE user_id = '<user_id>';
```

---

## 7. Escalation

| Severity | Response | Who |
|---|---|---|
| P0 Production down | 15 min | CTO + Lead Dev |
| P1 Payroll affected | 1 hour | Lead Dev + HR |
| P2 Feature degraded | 4 hours | Lead Dev |
| P3 Minor issue | Next sprint | Dev team |
