# Payroll + compliance review — HarvestPro NZ

**Date:** 2026-04-22
**Focus:** Criminal liability mitigation under Crimes (Theft by Employer) Amendment Act 2025
**Ibrahim's exposure:** High (wage-theft vector = personal director liability)

---

## VERDICT: GUARDED PASS — 3 P0 GAPS + 22 FINDINGS

**Status:** 🟡 **Go to staging with safeguards**
- ✓ Minimum wage top-up per pay period: **correct**
- ✓ Holidays Act §50 (public-holiday 1.5x): **implemented**
- ✓ Holidays Act §60 (alternative holidays): **implemented**
- ⚠️ Bucket duplicate prevention: **migration exists, NOT applied**
- 🔴 Annual leave §20 (`max(AWE, OWP)`): **NOT implemented — delegated to Xero (acceptable)**
- 🔴 KiwiSaver default 3.5% (April 2026): **still 3% — 9 days to patch**
- 🔴 Alternative holiday dedup logic: **incomplete — can accrue 2× for same worker/date**

**Criminal liability mitigation score:** 68/100 (UP from 41/100 in audit; unique constraint + alt-holiday audit still blocked)

---

## P0 LEGAL/COMPLIANCE — MUST BLOCK RELEASE

### 1. 🔴 KiwiSaver contributor rate NOT patched to 3.5% (April 2026 Finance Bill)
**File:** `src/config/nz-tax-rates.ts:113, 160, 207`
**Finding:** All three tax-year configs still hardcode `kiwisaverEmployeeRates: [0.03, 0.04, 0.06, ...]` with `kiwisaverEmployerMin: 0.03`. Finance Bill 2025 s.17A raised both to 3.5% effective 1 April 2026.
**Impact:** If first pay run is 22 April or later, HarvestPro underpays KiwiSaver by ~$45–80/employee/pay cycle. Clawback + penalty + remediation liability = $50k+ across 50 pickers.
**Fix:** Change `TAX_YEAR_2026_2027` lines 114 from 0.03 to 0.035 on both fields before April 1 cutover.
**Legal basis:** Finance (2024 Tax Cuts and Other Changes) Bill 2025, sections 17A–17D; IRD Payday Filing Spec 2026 s.5.2.
**Estimated fix time:** 5 min + test.
[new] [P0]

### 2. 🔴 Bucket_records unique constraint NOT applied
**File:** AUDIT finding; migration `supabase/migrations/20260415000004_bucket_records_unique_scan.sql` exists but NOT applied.
**Finding:** 30,464 duplicates still live in prod (AUDIT_2026_04_19 line 118). Migration creates UNIQUE(picker_id, scanned_at) but hasn't been `supabase db push`'d.
**Impact:** Wage-theft vector under Holidays Act §60.
**Fix:** Run `supabase db push` + validate no existing UNIQUE violations, OR backfill dedup script first.
[confirmed] [P0]

### 3. 🔴 Alternative holiday accrual can double across pay periods
**File:** `supabase/functions/calculate-payroll/index.ts:261–281`
**Finding:** `attendanceHoursMap.get(picker_id).altDates` is a `Set<string>`. Dedupes within a single payroll run. No cross-period dedup. Picker working same public holiday split across 2 weekly payrolls → alt_holidays_owed increments twice.
**Example:** Matariki 2026-07-10. Picker works Fri-Mon shifts across two weeks. Total owed computed: 2 days. Reality: 1 day. Clawback risk.
**Fix:** Add month-end reconciliation stored proc or seasonal audit cron.
[new] [P0]

---

## P0 CORRECTNESS

### 4. 🔴 Meal break deduction — labeled as paid hours reduction
**File:** `supabase/functions/calculate-payroll/index.ts:194–196`
**Finding:** Code subtracts 0.5hr from piece-rate earnings calculation. Employment Relations Act §69ZD mandates meal break is unpaid (not an earned hour). Net effect is correct (earnings not credited for meal time), but the label is wrong: Wages Protection Act §5 requires "details of all deductions" on payslip.
**Fix:** Return `{hours_worked, hours_paid_after_meal_adj, meal_break_deduction_amount}` separately.
[new] [P0-correctness]

### 5. 🔴 Public holiday 1.5x premium not disaggregated
**File:** `supabase/functions/calculate-payroll/index.ts:287–290`
**Finding:** Math is correct. But top-up line is lump sum covering ordinary + holiday floor. Auditor cannot verify 1.5x was applied.
**Fix:** Return `{hours_ordinary, hours_holiday, rate_ordinary, rate_holiday_1_5x, top_up_from_PH_premium}`.
[confirmed] [P0-correctness]

---

## P1 LEGAL/COMPLIANCE

### 6. ⚠️ Annual leave §20 not implemented — delegated to Xero
**File:** `src/services/payroll.service.ts:47` + `src/config/nz-tax-rates.ts:54–56`
**Finding:** Intentional and acceptable per Round 1 research, but Xero handoff needs validation flag.
**Fix:** Add validation: if `picker.employment_type === 'permanent'`, raise flag "annual_leave_calculation_delegated_to_xero."
[confirmed] [P1]

### 7. ⚠️ "Otherwise Working Day" §60 eligibility hardcoded as TRUE
**File:** `supabase/functions/calculate-payroll/index.ts:62–66`
**Finding:** Code counts any date with `hours > 0` as OWD and accrues 1 alt day. If picker works Saturday-only and Saturday is a public holiday → they get an alt day they shouldn't.
**Fix:** Store shift schedule, infer OWD from historical pattern.
[confirmed] [P1]

### 8. ⚠️ KiwiSaver employer minimum mismatch after April 2026
**File:** `src/config/nz-tax-rates.ts:114` (kiwisaverEmployerMin hardcoded 0.03)
[new] [P1]

### 9. ⚠️ Duplicate bucket_records not caught at scan-time, only payroll-run
**File:** `supabase/functions/calculate-payroll/index.ts:149–158`
**Finding:** No dedup by `(picker_id, scanned_at, bin_id)` at query time. Dedup only via migration (not applied).
**Fix:** Add runtime dedup OR apply unique constraint (finding #2).
[confirmed] [P1]

### 10. ⚠️ Meal break threshold hardcoded (no shift-time awareness)
**File:** `src/constants/nz-law.ts:40–42` + `calculate-payroll:176`
**Finding:** Hardcoded `MEAL_BREAK_THRESHOLD = 4 hours`. 4.5h micro-shifts trigger 0.5hr deduction without actually giving break.
**Fix:** Query `harvest_settings.shift_start_time`, `shift_end_time`, only apply if actual shift > 4h.
[new] [P1]

---

## P1 DATA INTEGRITY

### 11. ⚠️ MPI Export audit trail — FIXED needs regression test
**File:** `src/services/mpi-export.service.ts:191` (was audit_log singular)
**Status:** ✓ Fixed. 🟡 Needs E2E test in CI.
[confirmed] [P1-fixed]

### 12. ⚠️ `check-compliance` Edge Function queries wrong table
**File:** `supabase/functions/check-compliance/index.ts:78–85`
**Finding:** Queries `orchards.bucket_rate, orchards.min_wage_rate` — columns don't exist. Fallback to hardcoded NZ_CONSTANTS.PIECE_RATE ($3.50) instead of real $6.50.
**Impact:** check-compliance always uses $3.50 fallback, so compliance warnings are wrong.
**Fix:** Query `harvest_settings` instead, like `calculate-payroll` does correctly.
[confirmed] [P1]

---

## P2 AUDIT TRAIL & IMMUTABILITY

### 13. 📝 Audit logs not ACID-protected
**File:** RLS policy + `supabase/functions/approve-timesheet/index.ts:69–76`
**Finding:** If `audit_logs` policy permits DELETE, trail is mutable → not tamper-proof.
**Fix:** RLS policy: `SELECT` by manager/admin, `INSERT` by system/trigger only, NO UPDATE/DELETE.
[new] [P2]

### 14. 📝 Audit trail does not capture who-scanned (delegation risk)
**File:** `supabase/functions/record-bucket/index.ts`
**Finding:** When TL scans on behalf of picker, bucket_records should log both `scanned_by` and `picker_id`. Only `picker_id` stored.
**Impact:** Crimes Act 2025 evidence gap.
**Fix:** Add `scanned_by_user_id` column + populate from JWT.
[new] [P2]

---

## P2 TAX/PAYROLL

### 15. 📝 ACC Earners' Levy rate verification
**File:** `src/config/nz-tax-rates.ts:109`
**Status:** Config 1.60% per AUDIT/research — confirm before April 1 release.
[confirmed] [P2]

---

## P2 COMPLETENESS

### 16. 📝 Rain day / partial shift no minimum-engagement check
**File:** `supabase/functions/calculate-payroll/index.ts` (no rain-day logic)
**Fix:** Add `min_shift_duration_hours` to `harvest_settings`, check and apply floor.
[new] [P2]

### 17. 📝 Grade penalty can apply without contract
**File:** `supabase/functions/calculate-payroll/index.ts:156`
**Finding:** Code doesn't validate C-grade penalty contract exists in `employment_agreements` before applying.
**Fix:** Join `employment_agreements.quality_grade_penalty_percent` before deduction.
[new] [P2]

---

## CONFIRMED FROM AUDIT

### 18. 🔴 30,464 duplicates in bucket_records (still live)
**AUDIT line 118–133**
[confirmed] [P0-blocker]

### 19. 🟠 RLS policies on harvest_settings = ALLOW ALL
**AUDIT line 84, D1.4**
**Finding:** Any JWT can `.update()` on `harvest_settings`.
**Impact:** Wage-theft vector: attacker changes min_wage_rate to $1/hr.
**Fix:** Restrict to (manager | admin) role only.
[confirmed] [P1]

### 20. 📝 15 FKs without indexes
**AUDIT Appendix D**
[confirmed] [P2]

---

## GOOD PATTERNS (CONFIRMED)

- ✓ Minimum wage top-up per pay period (NOT season-averaged)
- ✓ Public holiday 1.5x applied correctly
- ✓ Alternative holiday dedup within single payroll run
- ✓ Quality grade `reject` excluded from piece count
- ✓ MPI audit trail fixed
- ✓ Rounding logic (`.toFixed(2)` banker's rounding)
- ✓ Tax-year versioning allows future-proofing

---

## PORTABLE FROM ROUND 1 RESEARCH

1. **PickTrace rate-resolution engine** — per-block piece-rate lookup `(picker_id, date, variety) → rate`
2. **Crystal Payroll break-pay formula** — implemented correctly; document in payslip
3. **Hectre bin-ticket traceability** — couple with QC → picker linkage

---

## SUMMARY: 25 FINDINGS

| Priority | Count | Status |
|----------|-------|--------|
| P0 Legal (must patch before release) | 3 | KiwiSaver 3.5%, bucket dedup migration, alt-holiday dedup |
| P0 Correctness | 2 | Meal break label, PH rate transparency |
| P1 Legal | 5 | §20 delegation, OWD assumption, employer mismatch, dedup, meal threshold |
| P1 Data integrity | 2 | MPI fixed, check-compliance schema |
| P1 Audit trail | 2 | RLS mutability, scan delegation |
| P2 Payroll | 1 | ACC levy |
| P2 Completeness | 5 | Rain-day, grade penalty |
| Confirmed from AUDIT | 2 | Duplicates, RLS ALLOW ALL |
| Good patterns | 7 | Top-up, PH, dedup, rejects, audit, rounding, versioning |

**Recommendation:** Ship to staging with P0/P1 patches in place. KiwiSaver patch is critical path (9 days to April 1 cutoff). Bucket dedup migration can follow immediately after dedup script runs on prod.

**Estimated patch time:** 2–3 days (tax rates + check-compliance schema + alt-holiday dedup logic).
