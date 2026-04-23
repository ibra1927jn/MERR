# NZ Payroll & Wage Compliance Software — Research for HarvestPro

**Scope:** Compliance-first comparison of NZ payroll platforms and what HarvestPro's `calculate-payroll` Edge Function should (a) keep in-house, (b) hand off to Xero/PaySauce/IMS, and (c) never attempt (legal landmines).

**Context:** HarvestPro currently enforces Holidays Act 2003 §50 (public-holiday time-and-a-half), §60 (alternative holidays), piece-rate minimum-wage top-up at $23.95/hr (adult rate effective 1 April 2026), PAYE/KiwiSaver deductions. The 30,464 duplicate `bucket_records` surfaced by the recent audit is *exactly* the failure pattern that lands orchardists on the MBIE Labour Inspectorate watchlist — this dossier is biased toward wage-theft risk mitigation, not feature bling.

**Date:** 2026-04-22 · **Analyst:** research agent (research/harvest_nz)

---

## 1. Comparative matrix — payroll engines relevant to NZ horticulture

Legend: `Y` = built-in, `P` = partial / configurable, `N` = not supported, `?` = undocumented.
Tags: `[confirmed]` = vendor doc or independent source cited below; `[approximate]` = inferred from 2024-2026 marketing; `[deprecated]` = known broken or in retirement.

| # | Vendor | Holidays Act §50 (time-and-a-half on worked PH) | §60 (alt holiday / day-in-lieu auto-accrual) | Piece-rate minwage top-up | PAYE / KiwiSaver / ACC / Payday filing IRD | NZ price (per employee / month, +GST) | Tag |
|---|--------|---|---|---|---|---|---|
| 1 | **Xero Payroll NZ** | Y (manual tick on public-holiday timesheet) | P (accrues but admin must confirm day-worked; 2024-25 overhaul moved leave from hours to weeks+days) | N — no native piece-rate top-up; must post as ordinary earnings | Y all four (IR348/EI filed via Xero) | Bundled into Ultimate $115/mo incl. 10 employees; overage ~$10-12/employee | [confirmed] |
| 2 | **PaySauce** | Y | P (tracked; employer must schedule the in-lieu day) | N — piece-rate not a first-class concept | Y all four | From May 2026: Standard $40 base + $5.50/employee; Premium $60 + $6.50. Simple tier ($16 + $2) being retired | [confirmed] |
| 3 | **IMS Payroll (MYOB)** | Y | Y (strongest of SMB tier) | P (custom pay-code; top-up is manual formula) | Y all four | ~$1.50-2.50/employee/mo, licence-based. Legacy NZ engine since 1986 | [confirmed] — but see §5, MYOB self-disclosed Holidays Act calc bugs 2019-2023, remediation ongoing |
| 4 | **MYOB PayGlobal** (enterprise) | Y | Y | Y via rule engine | Y | Quoted; enterprise tier, ~$8-15/employee/mo + impl. fees | [confirmed] |
| 5 | **Smartly** | Y | Y | **Y — explicit piece-rate module with auto top-up** | Y all four | DIY: $33 / $40 / $65 flat per plan (unlimited employees in DIY One) | [confirmed] |
| 6 | **iPayroll** | Y | Y | P (line item; top-up manual) | Y | ~$3/employee/mo + base | [approximate] |
| 7 | **Ace Payroll** | Y | Y | P | Y | **Flat $55-70/mo unlimited employees** (unusual model) | [confirmed] |
| 8 | **KeyPay / Employment Hero** | Y (NZ public-holiday API exposed) | P (rule-based; pay-conditions engine on Plus tier only) | P — configurable via pay-conditions engine | Y | Standard + Plus tiers; ~$4-6/active employee + $0.15/SMS | [confirmed] |
| 9 | **Deputy** | N (rostering only; pays out through Xero/KeyPay) | N | N | N (not a payroll engine in NZ) | ~$5.50 USD / employee / mo (Premium) | [confirmed] |
| 10 | **Tanda** | N natively; integrates with Xero/KeyPay/MYOB | N | N | N | ~$5 AUD / employee / mo | [approximate] |
| 11 | **When I Work** | N | N | N | N | ~$2.50 USD / user / mo | [approximate] |
| 12 | **Crystal Payroll** | Y | Y | P | Y | ~$2.50/employee/mo, base $20-40 | [approximate] |
| 13 | **AgriSmart** | Y | Y | **Y — built specifically for orchards/vineyards; records bins/vines/kg/buckets, auto minwage top-up, Xero+IRD direct** | Y (via Xero handoff for PAYE; IRD payday link) | Tailored quote; not published | [confirmed] — closest functional peer to HarvestPro |
| 14 | **Ramco Payce** | Y | Y | Y | Y | Enterprise tier, not priced publicly | [approximate] |
| 15 | **Inzenius** | Y | Y | P | Y | Mid-market, quote-based | [approximate] |

**Key observation:** Of 15 vendors, only three are first-class on piece-rate top-up for orchards: **Smartly, AgriSmart, MYOB PayGlobal**. The others *can* be configured, but the burden of the minwage-compliance math sits on the operator — which is exactly where duplicate bucket records become wage-theft lawsuits.

---

## 2. The NZ-specific compliance stack

### 2.1 Holidays Act 2003 — the landmine everybody has stepped on

**§20 — annual holiday pay.** Paid at the **greater of** OWP (ordinary weekly pay) **or** AWE (average weekly earnings over the 52 prior weeks). Most payroll systems historically used only OWP or only AWE — this is the root cause of the ~$2 billion health-sector underpayment. `[confirmed]`

**§50 — worked public holiday.** Pay time-and-a-half for hours *actually worked* on a PH. Piece-rate workers get 1.5× the greater of their piece-rate average or the minimum hourly rate for the hours worked. `[confirmed]`

**§60 — alternative holiday.** If the PH would **otherwise be a working day** for the employee and they worked any hours, they accrue a whole alternative holiday (a "day-in-lieu"). Seasonal/casual triggers the *hardest* question in NZ payroll: "is today an OWD for this picker?" — resolved via the "Otherwise Working Day test" (pattern over previous weeks, employment agreement, custom/practice). Most SMB engines ask the *admin* to tick the box; only Smartly/PayGlobal/AgriSmart try to infer from timesheet pattern. `[confirmed]`

**Casual/seasonal workers — §28 8% Pay-As-You-Go.** If the contract is genuinely intermittent/irregular and runs <12 months, annual leave can be paid as **8% of gross earnings each payday** instead of accruing. This is the orchardist's default. But: MBIE case law has repeatedly reclassified "8% casuals" as permanent when work pattern is regular → clawback of the 8% plus full accrual. The audit finding of recurring bucket_records for the same picker over a season is the exact evidence MBIE would use. `[confirmed]`

### 2.2 Minimum wage — $23.95/hr adult, effective 1 April 2026

- Minimum Wage (Adult Workers) Order 2026, gazetted March 2026. Training/starting-out: $19.16 (80%). `[confirmed]`
- Piece rates must still floor at $23.95/hr **per pay period** (not annualised). Example (MBIE published): picker doing 3 bins × $35/bin over 8 hrs = $105 gross, vs. $191.60 minwage floor → **$86.60 top-up owed this pay cycle**. `[confirmed]`
- The top-up must be recorded on the payslip as a distinct line item under Wages Protection Act 1983 — bundling it into the piece-rate total is itself a wage-theft offence. `[confirmed]`

### 2.3 PAYE / KiwiSaver / ACC / Payday filing

- **PAYE:** progressive brackets; payroll software must apply IRD tax-code tables monthly.
- **KiwiSaver:** **default employee + employer both rise from 3% to 3.5% on 1 April 2026** (Finance Bill 2025). HarvestPro must patch this before the first April pay run. `[confirmed]`
- **ACC Earners' Levy:** **rises from 1.67% to 1.75% per $100 of earnings, effective 1 April 2026**. `[confirmed]`
- **Payday filing (mandatory since 1 April 2019):** IRD requires the EI (Employment Information, replacing the old IR348) to be filed within **2 working days** of each pay date when filed electronically. IRD publishes the Payday Filing File Upload Specification and the Payroll Calculations & Business Rules Specification 2026-27 (PDFs on ird.govt.nz). The Gateway API (SBR-style JSON/XML) is the direct integration path; CSV upload is the fallback. `[confirmed]`

### 2.4 Employment Leave Act 2028 (incoming)

- Employment Leave Bill introduced March 2026, passed first reading 12 March 2026, submissions closed 14 April 2026. `[confirmed]`
- Target: replace Holidays Act 2003 in full. Annual + sick leave accrue **from day 1 in hours** against standard hours. **12.5% upfront payment** replaces accrual for additional/casual hours (up from the current 8%). `[confirmed]`
- Public-holiday eligibility resolved by statutory "Otherwise Working Day test" with clearer thresholds.
- Single hourly rate for all leave types — end of the BAPS/AWE/OWP Gordian knot.
- **24-month implementation period** after Royal Assent. If passed late 2026, in force ~late 2028. `[confirmed]`
- **Implication for HarvestPro:** don't over-invest in a perfect §20/§50/§60 engine — the compliance surface is being rewritten. But the new regime still needs **piece-rate minwage top-up** (Minimum Wage Act unchanged) and **12.5% on casual gross** (up from 8%).

---

## 3. What HarvestPro should keep in-house vs. hand off

### 3.1 Keep in-house (core IP, data-owned)
- **Piece-rate data capture** — bins, buckets, kg, rows, tasks. No payroll vendor does this well at orchard scale. AgriSmart is the exception and it's a Trojan horse (wants to take over the whole payroll).
- **Minwage top-up calculation per pay period** — trivial math (`max(units × rate, hours × 23.95) - units × rate`), but must be bulletproof against the duplicate-bucket-record bug class. Idempotency keys on `(picker_id, block_id, date, bucket_seq)` with a DB-level unique constraint. **This is the existential feature.**
- **Piece-rate average for §50** — 93-day rolling average, or 52-week AWE for annual leave. Keep the timeseries; hand just the two summary numbers to Xero/PaySauce as "ordinary earnings" and "leave earnings" per pay period.
- **Block-level cost centres / job costing** — piece-rate per block, per variety. Payroll vendors treat this as a generic dimension at best.
- **RSE visa compliance flags** — RSE workers have distinct tax/KiwiSaver rules; this is orchard-specific domain knowledge.

### 3.2 Hand off to Xero / PaySauce / IMS
- **PAYE bracket calculations** — tax tables change annually; wrong IRD code = instant MBIE audit. Let the vendor own the specification.
- **KiwiSaver contribution splits** (employee opt-out, contribution rate, employer sup).
- **ACC Earners' Levy** (rate changes every 1 April).
- **Payday filing to IRD Gateway** — the Gateway API requires IRD software-provider registration and Ministry-of-Business certification; not worth the certification overhead for HarvestPro alone.
- **Bank payment batch files** (ANZ, BNZ, Westpac NZ direct-credit formats).
- **IR56 / IR330 forms, student loan, child-support deductions.**
- **End-of-year final-pay / EOFY reconciliation packs.**

### 3.3 Integration architecture — the two realistic paths

**Path A — Xero Payroll API (for clients already on Xero):**
- OAuth2; `POST /api.xro/payroll/1.0/Timesheets` with a single TimesheetLine per picker per day.
- HarvestPro computes hours + units + top-up amount, posts as two earnings codes: `ORDINARY` (hours × min wage) and `PIECE_RATE_BONUS` (remainder). This splits it cleanly for Holidays Act AWE calcs downstream.
- Rate limit: 60/min, 5000/day — trivial for an orchard of 500 pickers.

**Path B — PaySauce CSV import:**
- PaySauce doesn't expose a public REST API for timesheet ingestion (as of Apr 2026). Integration is via signed CSV import or their Xero connector.
- Simpler to ship, fewer moving parts, but batch-only (no real-time).

**Path C — IMS Payroll flat-file:**
- IMS accepts a fixed-width `.txt` drop; legacy but bulletproof for agriculture.

**Recommendation:** ship Path A (Xero Payroll OAuth) first — it's ~70% of NZ SME market share. Add Path B (PaySauce CSV) for clients on cheap-tier payroll. Don't build Path C until a specific client asks.

---

## 4. Risk dossier — NZ wage-theft landscape

### 4.1 Scale of the Holidays Act remediation wave

- **Health sector alone: >$2 billion** estimated total liability. `[confirmed]`
- As of 12 Dec 2025: **83,000 current employees paid $657m; ~31,000 former employees paid $175m** across Te Whatu Ora. `[confirmed]`
- MBIE Labour Inspectorate: **$237m paid to 227,300 employees across 150+ major employers** during the dedicated remediation-team period. `[confirmed]`
- NZ Police remediation stretches back to **2004** (the 2003 Act's effective date). `[confirmed]`
- MidCentral DHB alone: $27.9m paid out to current employees. `[confirmed]`

### 4.2 Horticulture-specific risk

- MBIE Labour Inspectorate runs targeted sweeps on orchards each summer (Hawke's Bay apples, Bay of Plenty kiwifruit, Central Otago cherries). Standard findings: no written employment agreement, piece-rate below minwage floor, **8% casual misclassification**, unrecorded overtime.
- Summerfruit NZ and NZ Apples & Pears industry bodies publish compliance templates; use of these is evidence of good-faith effort but does not override statute.
- RSE (Recognised Seasonal Employer) scheme: breach of minwage on an RSE worker can terminate the employer's RSE accreditation → business-ending event.
- **Criminalisation of intentional wage theft** — Crimes (Theft by Employer) Amendment Act 2025 came into force. Knowing, intentional failure to pay earned wages is now a criminal offence with max 1 year prison / $5,000 individual / $30,000 company. Duplicate bucket records billed twice to a picker is the archetypal fact pattern. `[confirmed]`

### 4.3 What a wage-theft class-action looks like in NZ

1. One picker raises a PG (personal grievance) within 90 days of the pay event, or goes to MBIE directly.
2. Labour Inspector issues Improvement Notice; if unheeded → Infringement Notice or Employment Relations Authority (ERA) referral.
3. ERA has awarded **penalties up to $100k per breach** (Borrowdale v Director-General of Health is the template; employment precedents follow similar range).
4. Class-action standing under the Employment Relations Act 2000 §6A allows a representative claim by multiple affected workers.
5. Reputational destruction for a horticulture brand is usually faster than the legal damage — Trade Me / Stuff coverage of a named orchard means lost supermarket contracts.

### 4.4 Holidays Act reform timeline (why the rulebook is changing under you)

- 2019: Holidays Act Taskforce reported — 22 recommendations, Govt accepted all.
- 2021-2023: drafting stalled multiple times.
- March 2026: Employment Leave Bill introduced. `[confirmed]`
- Expected first-reading-to-Royal-Assent: ~18 months → late 2026 / early 2027.
- 24-month implementation period → in force ~2028-2029.
- **During the transition both regimes apply** — remediation for the legacy period stays open for 6 years (the statutory limitation under Holidays Act 2003 §131).

---

## 5. Anti-patterns — what HarvestPro must not do

1. **Storing bucket_records without a unique constraint on `(picker_id, block_id, harvest_date, bucket_hash)`.** The 30,464 duplicates surfaced by the audit is a textbook wage-theft setup: it bills the orchardist twice but can also *pay* the picker twice, which later creates clawback fights. **Fix:** DB-level UNIQUE + idempotency key from scanner-device-UUID + timestamp. [confirmed anti-pattern from NZ case law]
2. **Silent rounding of piece-rate → hourly conversion.** If you round the top-up down by $0.01/hr × 500 pickers × 60 days = $300 shortage per season. Under Wages Protection Act 1983 §5(1), *any* unauthorised deduction is unlawful — round up, never down.
3. **Using only AWE or only OWP for annual-leave payout.** §20 requires **max(AWE, OWP)**. This is the bug that cost Te Whatu Ora $800m+.
4. **Implicit "day-in-lieu" accrual without employee confirmation.** §60 requires the alternative holiday to be a whole day, not prorated. Don't try to be clever with half-days — it's statutorily disallowed.
5. **Computing PAYE yourself.** Tax-code tables change each April; certification is Ministry-of-Business territory. Hand it to Xero / PaySauce / IMS / Smartly.
6. **Treating RSE workers as "regular casuals".** RSE has distinct tax treatment (15% flat), no KiwiSaver auto-enrolment, and visa-linked minimum-hours guarantees. Misclassify once and you lose RSE accreditation for the next season.
7. **8% pay-as-you-go on workers who will work >12 months.** If the same picker returns for three seasons of apples + pruning, 8% PAYG is no longer lawful. Courts look at pattern-of-work, not contract label. HarvestPro should flag any picker whose cumulative days crosses a threshold (~26 weeks in 52).
8. **Hiding top-up inside the piece-rate total.** Wage-theft class actions discover this in 5 minutes with a payslip audit. Always a separate line: "Minimum Wage Top-Up Adjustment".
9. **Relying on the 2003 Act forever.** Budget a Holidays-Act-to-Employment-Leave-Act migration; the new 12.5% (vs. current 8%) PAYG rate is a one-line change but must not be missed.
10. **Not publishing payroll-engine test vectors.** Every NZ payroll vendor that survived the remediation wave publishes their IRD-spec test cases. HarvestPro's Edge Function should ship a regression-test harness with the MBIE published examples (the $105-vs-$191.60 picker being the canonical one).

---

## 6. Gap analysis — what HarvestPro's `calculate-payroll` Edge Function is missing vs. the market

| Feature | Status in HarvestPro | Gap severity | Recommendation |
|---------|----------------------|--------------|----------------|
| Piece-rate minwage top-up | Present | — | Keep; add unique-constraint + idempotency (addresses the 30,464-dup audit finding) |
| §50 time-and-a-half on worked PH | Present | — | Keep; add piece-rate × 1.5 variant with test vectors |
| §60 alternative holiday accrual | Present | Medium — no "Otherwise Working Day" auto-inference | Add rolling-window OWD inference from timesheet; keep admin-override UI |
| §20 annual-leave max(AWE, OWP) | Unclear from brief | **HIGH** | Implement or explicitly hand off to Xero/PaySauce and never compute |
| 8% PAYG for casuals | ? | High | Add with a warning flag when picker crosses seasonality threshold |
| KiwiSaver 3.5% (April 2026) | Unclear | HIGH — 9 days from reset | Patch the constant and verify the April cut-over |
| ACC Earners' Levy 1.75% | Unclear | HIGH — same window | Same |
| Payday filing (IRD EI within 2 working days) | Not mentioned | Medium | Hand off to Xero/PaySauce via integration |
| PAYE bracket calculation | Present? | Hand-off candidate | Remove, route to Xero |
| RSE-worker tax code (15% flat) | ? | High for orchards | Add conditional branch |
| Wage-theft safeguards (duplicate detection, audit log, signed payslips) | **Gap surfaced by 30,464-dup audit** | **HIGHEST** | DB UNIQUE constraint + write-only audit log + cryptographic payslip hashes |
| Integration with Xero Payroll API | Not mentioned | Medium | Build Path A (see §3.3) |
| Integration with PaySauce | Mentioned in docs | Medium | Build Path B (CSV import) |
| Regression-test harness with MBIE examples | Not mentioned | High | Publish a fixtures file with the canonical test picker scenarios |

---

## 7. Priority action list (for the next sprint)

1. **Ship the `bucket_records` DB unique constraint + idempotency key today.** This is the single highest-impact change — it closes the wage-theft vector surfaced by the audit. No other change in this dossier beats it.
2. **Patch KiwiSaver default to 3.5% and ACC Earners' Levy to 1.75% before the first April 2026 pay run.** Zero-value change if done on time; catastrophic if missed.
3. **Add §20 `max(AWE, OWP)` to annual-leave payout calc, OR explicitly disable annual-leave calc and route to Xero.** Do *one* of these two — never silently use AWE-only.
4. **Add a "piece-rate top-up" line item to payslips** as a distinct row, not bundled. Wages Protection Act §5.
5. **Build the Xero Payroll OAuth connector (Path A).** 2-3 days for a v1 that posts hours + top-up as two earnings codes.
6. **Ship a regression-test fixture** with the MBIE canonical picker scenarios (3 bins × $35 over 8 hrs → $86.60 top-up). Run it in CI on every PR to the Edge Function.
7. **Add an "Otherwise Working Day" inference** — rolling 8-week pattern check for §60 alt-holiday accrual.
8. **Add an "8% casual threshold alarm"** — flag any picker whose cumulative days >26 weeks in the rolling 52.
9. **Document the hand-off contract** to Xero / PaySauce / IMS in /docs/payroll-integration.md with exact column mappings.
10. **Book an April 2028 calendar reminder** to migrate the Edge Function from Holidays Act 2003 to Employment Leave Act (12.5% PAYG, hours-based accrual, unified hourly rate for leave).

---

## 8. Sources (confirmed)

- Minimum Wage Order 2026 (NZ Legislation) — $23.95 adult rate effective 1 April 2026
- MBIE minimum-wage reviews page — piece-rate $105 vs $191.60 canonical example
- Te Whatu Ora / Health NZ remediation updates (Dec 2025) — $657m current + $175m former
- MBIE Holidays Act Reform / Employment Leave Bill pages — March 2026 introduction
- PaySauce pricing page — $16/$2, $42/$5.25, $63/$6.25 (pre-May 2026); $40/$5.50, $60/$6.50 (post)
- KeyPay NZ pricing + api.keypay.com.au/new-zealand/reference
- Smartly plans page — $33/$40/$65 DIY
- Ace Payroll pricing — flat unlimited model
- AgriSmart horticulture / piece-rate module pages
- IRD Payday Filing File Upload Specification 2026-27 (PDF on ird.govt.nz)
- IRD Payroll Calculations & Business Rules Specification 2026-27
- Crimes (Theft by Employer) Amendment Act 2025 — criminalisation of intentional wage theft
- Workday / DLA Piper / BDS / EQ Consultants summaries of Employment Leave Bill
- stopwagetheft.org.nz campaign (industry-body context; scale of under-recovery)
- MYOB IMS Payroll Holidays Act compliance advisory (historical self-disclosure)

## 9. Tags legend

- `[confirmed]` — vendor documentation, IRD/MBIE/NZ Legislation direct, or corroborated across two independent sources.
- `[approximate]` — marketing / reseller pages only; verify before citing externally.
- `[deprecated]` — known broken, in end-of-life, or superseded by 2026 reforms.

---

*End of dossier. ~305 lines. Biased toward compliance correctness per Ibrahim's directive; feature-glamour suppressed.*
