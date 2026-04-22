# HarvestPro NZ — Payroll / Labor Law Compliance Audit

- Date: 2026-04-22
- Auditor: Claude (read-only)
- Scope: `src/services/compliance/*`, `src/services/harvestMetrics/*`, `src/services/wage-rates.service.ts`, `src/services/payroll.service.ts`, `src/services/nz-payroll-deductions.service.ts`, `supabase/functions/calculate-payroll/*`, `supabase/migrations/*wage*|*payroll*|*holidays*|*audit*|*daily_attendance*|*bucket_records*`
- Statutes checked: Minimum Wage Order 2026 ($23.95/hr from 1 Apr 2026); Holidays Act 2003 s.49/50/60; Wages Protection Act 1983 s.5; Employment Relations Act 2000 s.69ZD & s.130A; Holidays Act 8% casual pay.
- Git since 2026-04-19: `ec59f70` (HR docs + s.60 alt holiday), `48b1822` (CI regex).

---

## Severity counts

| Severity | Count |
|---|---|
| CRITICAL | 4 |
| HIGH | 6 |
| MEDIUM | 5 |
| LOW | 3 |
| TOTAL findings | 18 |

Legal-exposure bar (material risk of Labour Inspectorate action, back-pay, or penalty): **finding #1, #2, #3, #5, #7**.

---

## Top 7 findings

### 1. [CRITICAL] Audit-log retention is 90 days — breaches ER Act 2000 s.130A (6 + 1 years)

`supabase/migrations/2026021101_audit_logging.sql:149-154`

```sql
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() ...
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
```

- **Statute:** Employment Relations Act 2000 **s.130 / s.130A** and Holidays Act 2003 **s.81** require wage-and-time records *and* holiday/leave records to be kept for **6 years** (and made available to a Labour Inspector on request). Hours Worked Regulations 2016 reinforce this for daily hours.
- **Impact:** After 90 days we cannot produce wage/hour/leave history for a Labour Inspector. Each record missing is a separate infringement (infringement fee up to **$1,000 per employee, per breach**, s.235A), and Labour Inspectorate has been litigating record-keeping against RSE/orchard employers.
- **Fix:** raise retention to ≥ 7 years OR stop scheduling `cleanup_old_audit_logs` for wage/attendance tables. Critically, `bucket_records`, `wage_rates`, and `attendance` corrections also need a forever-copy, not just an audit trigger row.

### 2. [CRITICAL] `bucket_records` has no audit trigger AND 30,464 known duplicates — direct wage-record liability

- No `log_audit_trail` trigger attached to `bucket_records` (migration `2026021101_audit_logging.sql:115-144` only covers pickers / harvest_settings / users / daily_attendance / orchards).
- Prior audit (`AUDIT_2026_04_19_DEEP_REVIEW.md:118`) confirms 30,464 duplicate `(picker_id, scanned_at)` pairs — ~63,107 extra rows. Migration `20260415000004_bucket_records_unique_scan.sql` cannot apply until they're removed; production is still accepting dupes.
- **Impact:**
  - Piece-rate earnings are double-counted => overpay for employer, under-pay claim possible if picker disputes ("those were my scans, not duplicates"). Both directions = legal exposure. `calculate-payroll/index.ts:151` queries `bucket_records` directly with no DISTINCT.
  - Without an audit trigger, wage records can be altered without a trail — s.130A breach.
- **Fix:**
  1. Dedupe: keep earliest row per `(picker_id, scanned_at)` (or per `(picker_id, bin_id, scanned_at rounded to 1s)` if bins differ), soft-delete the rest with an audit memo row.
  2. Apply migration `20260415000004`.
  3. Add trigger `audit_bucket_records` (all ops).
  4. In `calculate-payroll/index.ts` line 151, add a defensive `DISTINCT ON (picker_id, scanned_at)` until dupes are zero.

### 3. [CRITICAL] `wage_rates` CHECK constraint was dropped — rates below $23.95 are now legally insertable

`supabase/migrations/20260415000003_fix_wage_rates.sql:7-16`

```sql
ALTER TABLE public.wage_rates DROP CONSTRAINT IF EXISTS wage_above_nz_minimum;
...
ADD CONSTRAINT wage_rate_positive CHECK (hourly_rate > 0);
```

- Rationale in the migration is "permitir tasas historicas". Legitimate — historic rates below $23.95 must be storable. But the migration never adds an **effective-date-aware** constraint, so a rate of `$5.00` with `effective_date = 2026-04-20` is now accepted by the DB.
- The `wage-rates.service.ts:148-153` and `:171` clamps are defence-in-depth at app layer only; any direct SQL, edge-function, or migration bypasses them.
- **Statute:** Minimum Wage Act 1983 s.6 — employer must pay at least the minimum wage; per-employee per-pay-period infringement.
- **Fix:** add a trigger-level check: `IF NEW.effective_date >= '2026-04-01' AND NEW.hourly_rate < 23.95 THEN RAISE`. Same pattern for starting-out ($19.16).

### 4. [HIGH] s.60 "alternative holiday" logic assumes every picker-with-hours had the public holiday as an "otherwise working day"

`supabase/functions/calculate-payroll/index.ts:62-66` and `:203-205,263`:

```ts
// Simplificación MVP: contamos fechas únicas con horas > 0; el flag "otherwise working
// day" lo asumimos true para pickers estacionales.
alternative_holidays_owed = attendanceSplit.altDates.size
```

- **Statute:** Holidays Act 2003 **s.60(1)(a)** — the alt-day entitlement exists ONLY if the public holiday would *otherwise* have been a working day for that employee. For seasonal / casual RSE workers on irregular rosters the "OWD test" (s.12) is non-trivial and requires looking at historic working pattern / agreement.
- **Impact direction: over-paying**. Granting alt-days where no entitlement exists increases cost, but is not illegal; however it becomes a contractual entitlement once granted. The *real* risk is the inverse: **we never short-grant** (current code is over-inclusive, not under), so the material risk is commercial, not statutory. Still, an auditor reviewing our s.60 claim will see the blanket assumption and flag it.
- **Fix:** compute OWD per worker from past 4 weeks of attendance; or store `is_owd` on `daily_attendance` when manager approves timesheet. Document the MVP-over-grant decision in the policy doc so it's defensible as "good-faith interpretation".

### 5. [HIGH] Meal-break deduction is applied blindly — no check that a break was actually taken; and the comment lies about paid vs unpaid

`supabase/functions/calculate-payroll/index.ts:174-196`

```ts
// NZ Employment Relations Act 2000, s.69ZD:
// 30-minute paid meal break mandatory for shifts > 4 hours
const MEAL_BREAK_HOURS = 0.5
...
const dayHours = rawDayHours > MEAL_BREAK_THRESHOLD
    ? rawDayHours - MEAL_BREAK_HOURS
    : rawDayHours
```

- **Two issues.**
  - (a) s.69ZB **does not make the meal break paid** (rest breaks 10min are paid, meal 30min unpaid by default unless agreement says otherwise). The in-code comment "30-minute paid meal break" is wrong and the deduction is consistent with **unpaid** treatment — comment should be corrected. Minor documentation risk.
  - (b) The bigger problem: hours are reduced by 0.5h whether or not the break was actually taken. If the picker worked a continuous shift without a break (a s.69ZD breach by the employer), we under-pay them by 0.5h × min-wage. That's a **wages shortfall claim** on top of the break breach.
- **Statute:** s.69ZD (breaks) and s.131 (wages recovery).
- **Fix:** only deduct meal break when a corresponding row exists in a `breaks` table (the app has `rest-break-compliance.service.ts` logic but no DB persistence of breaks taken). Interim: deduct only for shifts > 5h where company policy assumes a break was taken; log a compliance warning when no break record exists.

### 6. [HIGH] `attendanceGap.ts` reads `daily_attendance.hours_worked` but `payroll.service.ts:187-194` says that column does not exist

- `src/services/compliance/attendanceGap.ts:45,61` SELECT `hours_worked`.
- `src/services/payroll.service.ts:187`: `// CRIT-1 FIX COMPLETE: hours_worked column does NOT exist in daily_attendance`.
- But schema migration `2026021301_daily_attendance.sql:23` defines `hours_worked DECIMAL(4,2) DEFAULT 0` and never drops it.
- **Impact:** Inconsistency — either `attendanceGap` reads a stale (or 0) field and mis-flags "attendance without scans", or the comment in payroll.service is obsolete and we're ignoring authoritative stored hours in favour of recomputing from check_in/check_out. Since payroll calculates on-the-fly from timestamps, the stored `hours_worked` can drift. Record-keeping-wise, NZ Labour Inspectorate will look at the *stored* field first; if it doesn't match the payslip, that's a red flag on top of a s.130A query.
- **Fix:** decide one source of truth. Recommendation: drop the stored `hours_worked` column and keep only `check_in/check_out` + computed view; update `attendanceGap` to derive from timestamps.

### 7. [HIGH] Payroll does not persist — no stored payslip record, no "sealed" version

- `calculate-payroll/index.ts` computes and returns JSON on every request; nothing writes to a `payslips` / `payroll_runs` table.
- `supabase/migrations/2026021302_payroll_rpc.sql` only logs a "payroll close" into `audit_logs` (free-text). There is no `payslips` table.
- **Statute:** Employment Relations Act s.130A, Wages Protection Act 1983 s.4 (employee's right to a record of gross wages, deductions, net pay). Holidays Act s.81 for leave balances.
- **Impact:** Auditor asks "show me Manu's week-ending 7 April payslip". Current system can only *re-compute*, which will re-pull `bucket_records` (with duplicates — see #2) and potentially produce different numbers than what the employee was actually paid. If rates changed between pay-day and audit-day, the recomputation lies.
- **Fix:** create `payroll_runs` and `payslips` tables. Store an immutable snapshot (including `min_wage_rate`, `piece_rate`, bucket count, hours_ordinary/holiday, top-up, alt-days, deductions breakdown from `nz-payroll-deductions.service.ts`, net pay). Freeze on manager sign-off.

---

## Additional findings (summary — not in top 7)

- **MEDIUM** — `calculate-payroll/index.ts:268-276` fallback path (no attendance): infers hours from first/last scan. Sleepers (picker forgot phone at 7am, scanned 4pm) will be mis-hour'd. Also breaks meal-break deduction logic (scans 4h apart ≠ 4h worked).
- **MEDIUM** — `payroll.service.ts:290`: `settings?.min_wage_rate ?? 23.5` fallback to **$23.50** (below $23.95 floor) if harvest_settings is missing. Dead code today because migration 20260412 back-fills all orchards, but any new orchard inserted without setting defaults to $23.50.
- **MEDIUM** — No ACC earner-levy / PAYE actually wired into `calculate-payroll` edge function. `nz-payroll-deductions.service.ts` exists client-side only; the UI in `PayrollTabs.tsx:48-56` shows Buckets / Hours / Piece Rate / Top-Up / Total — no PAYE, KiwiSaver, ACC, net-pay columns. So what the UI labels "Total" is **gross, not net**. Worker-facing payslips must show deductions (Wages Protection Act s.24, IRD requirements).
- **MEDIUM** — No Wages Protection Act s.5 written-consent record. `nz-payroll-deductions.service.ts` subtracts KiwiSaver + student loan + ACC without referencing a `deduction_consents` table. PAYE / KS / ACC are statutory so consent is not required — but the architecture has no hook for *voluntary* deductions (uniform, accommodation, transport deduct) which DO require written consent.
- **MEDIUM** — Rounding is `parseFloat(x.toFixed(2))` everywhere (`calculate-payroll` lines 305-312, `payroll.service.ts:321-324`, `nz-payroll-deductions.service.ts:85` uses `Math.round(x*100)/100`). `toFixed` does banker-rounding in some JS engines; `Math.round` is half-up. Summing rounded per-picker lines can diverge from the rounded total by 1-2c. Minor, but IR-Filer will flag. Recommend single rounding policy (Math.round half-up at line level + recompute totals from rounded lines).
- **LOW** — `NZ_PUBLIC_HOLIDAYS_SET` in edge function (`index.ts:34-43`) is duplicated from `src/constants/nz-law.ts:103-129`. Deno/Vite boundary means no shared import, per the comment. Accepted risk — but no runtime parity test exists. A CI diff test comparing both lists would catch drift.
- **LOW** — Regional anniversary days (Auckland, Wellington, etc.) are not implemented. `nz-law.ts:100-102` flags as TODO. Orchards in Hawke's Bay, Nelson, Marlborough will under-pay on anniversary days (same s.50 / s.60 risk, limited blast radius).
- **LOW** — `harvestMetrics/hours.ts:38` uses `Math.min/max(...timestamps)` with spread operator. On a picker with >100k scans (improbable but not impossible after the duplicate problem) this throws `RangeError: Maximum call stack size exceeded`. Use reduce.

---

## s.60 commit `ec59f70` verification

- Mechanics correct (lines 262-281): `altDates.size` counts distinct public-holiday dates with `clamped > 0` hours. Fallback path (no attendance) grants 1 alt-day if first-scan falls on a public holiday.
- **Is it correct?** **Partially** — see finding #4. The s.50 time-and-a-half is implemented right (line 288-290). The s.60 alt-day count is right *assuming* OWD test passes for every seasonal picker. The code's own comment (lines 62-66) acknowledges the shortcut.
- **Test coverage** (`src/integration/payroll-real-supabase.integration.test.ts:89-142`) only verifies the *schema* contains the new fields. No unit test exercises the two OWD branches, the meal-break-on-holiday interaction, or rate composition. Coverage is shallow.

---

## Recommendation ranking (immediate → 30-day)

1. **Today:** stop the 90-day audit-log cleanup cron. One-line fix, unblocks s.130A liability.
2. **This week:** dedupe `bucket_records` + apply unique constraint + add audit trigger.
3. **This week:** add effective-date-aware trigger on `wage_rates` (finding #3).
4. **2 weeks:** create `payroll_runs` + `payslips` tables with immutable snapshots (finding #7).
5. **2 weeks:** break tracking table + wire `rest-break-compliance.service.ts` to persist and feed calculate-payroll (finding #5).
6. **30 days:** unify `daily_attendance.hours_worked` story (finding #6), drop column or make it authoritative; add OWD computation for s.60 (finding #4).

---

*End of audit.*
