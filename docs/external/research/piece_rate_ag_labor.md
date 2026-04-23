# Piece-Rate Agricultural Labor Tracking Systems — NZ Compliance Focus

**Research date:** 2026-04-22
**Purpose:** Competitive landscape for HarvestPro NZ (piece-rate picker tracking, NZ min-wage top-up at $23.95/hr, RSE-friendly).
**Bias:** What do competitors get *wrong* on NZ legal specifics? HarvestPro's moat = compliance correctness.

Tag legend: `[confirmed]` = vendor docs explicitly state it; `[approximate]` = inferred / marketing-speak; `[deprecated]` = legacy or unsupported.

---

## 1. Universe of systems (with niche relevance rating)

| System | HQ | Target | Piece-rate core | NZ-aware? | Notes |
|---|---|---|---|---|---|
| **AgriSmart** | NZ | Orchards / contractors NZ+AU | Native | Yes (built in NZ) | `[confirmed]` Auto min-wage top-up, block/row tracking, payroll export. [agrismart.com](https://agrismart.com/piece-rate-tracking-software-nz/) |
| **Tātou (PaySauce group)** | NZ | Vineyards / orchards | Native | Yes | `[confirmed]` Offline tablet, piece OR hourly OR mixed, bundled with PaySauce payroll. [tatou.app](https://www.tatou.app/horticulture-management-software), [PaySauce Tātou](https://smoothpay.paysauce.com/tatou/) |
| **PaySauce / SmoothPay** | NZ | Horticulture payroll | Hands off timesheet (uses Tātou); payroll engine supports piece+topup | Yes | `[confirmed]` MBIE-aligned: "units linked to time worked; if piece rates don't meet hourly minimum, top-ups must be automated and auditable." [paysauce.com](https://www.paysauce.com/payroll/horticulture/) |
| **Crystal Payroll** | NZ | General NZ payroll incl. horticulture | Yes | Yes | `[confirmed]` Auto-top-up to MW, contract-rate top-up option, paid 10-min break re-prorated at effective hourly rate. [crystalpayroll.com piece-rate](https://crystalpayroll.com/informative/from-orchards-to-paychecks-payroll-for-piece-rate-workers/), [integration with Hectre](https://support.crystalpayroll.co.nz/cs-integrationhectre.html) |
| **PayHero** | NZ | SMB payroll | Yes | Yes | `[confirmed]` Min-wage top-up pay-item; requires timesheet hours + piece units both recorded. [payhero.co.nz](https://www.payhero.co.nz/horticulture), [Min Wage Top Up article](https://support.payhero.co.nz/hc/en-us/articles/360002667136-Minimum-Wage-Top-Up) |
| **Hectre** | NZ | Apple / stone-fruit orchard + packhouse | Yes (bin tickets) | Yes | `[confirmed]` Digital bin tickets, QC ↔ picker linkage, integrates to Crystal for payroll. [hectre.com](https://hectre.com/) |
| **FieldClock** | US (CA) | West-coast US orchards | Yes | No (USD, H-2A) | `[confirmed]` QR-badge scan, offline, exports to 24+ payroll systems. [fieldclock.com/features/piece-tracking](https://www.fieldclock.com/features/piece-tracking) |
| **PickTrace** | US | Enterprise growers | Deep | Partial (H-2A not RSE) | `[confirmed]` Unlimited pay rates per individual/crew/SKU/variety/crop/job/location; auto MW, break, OT, 7th-day. [picktrace.com harvest-v2](https://picktrace.com/harvest-management-2/) |
| **Harvust** | US | H-2A farm labor compliance | No (complements FieldClock) | No | `[confirmed]` Onboarding, WhatsApp, injury logs — *not* piece-rate math. [harvust.com/fieldclock](https://www.harvust.com/fieldclock) |
| **Croptracker** | Canada | Multi-crop FMS | Yes | Partial | `[confirmed]` Bucket→picker attribution, QC templates, MW top-up auto. [croptracker.com labor](https://www.croptracker.com/product/farm-management-software/farm-labor-tracking.html) |
| **LaborSync** | US/CA | Generic time+GPS tracking | Weak (hours, not pieces) | No | `[approximate]` General time-and-attendance; not horticulture-specific. [laborsync.com](https://www.laborsync.com/labor-tracking-software) |
| **Famous HarvestMaster** | US | Packhouse ERP | Packing-side, not field piece | Limited | `[deprecated]` NZ presence is marginal; no direct NZ piece-rate MW top-up found in public docs. Search could not confirm a "HarvestMaster" product at famoussoftware.com with NZ piece-rate features. |
| **AgCode / AgBatt / AgriWebb** | AU/US | Vineyard mgmt, livestock, fleet | Adjacent (not piece) | AU-aware | `[approximate]` AgriWebb is livestock-first; doesn't solve pick-bucket problem. |
| **Yumi Labor (yumi.io)** | US | Ag staffing | H-2A-leaning | No | `[approximate]` US-first. |
| **QuickHarvest / Easy Fruit / Easy Apple / Wenda.io** | Various | Small-vendor niche | Varies | No | `[approximate]` Small footprint; not verified for NZ MW top-up. |
| **Farm Credit Canada AgriShield** | Canada | Risk mgmt tool | None | No | `[deprecated]` Risk-assessment, not payroll. |
| **Excel + Xero** | — | "The 50–200 NZ orchards today" | Manual | "Depends on user" | `[confirmed]` Real competitor. Manual end-of-week audit → wage-theft risk. |

---

## 2. Comparative matrix (feature x vendor)

| Vendor | Multi-rate (variety×worker×day) | Auto MW top-up | Paid 10-min break prorated at effective rate | QC→pay link | RSE-aware | Offline field capture | NZ data residency |
|---|---|---|---|---|---|---|---|
| AgriSmart | Yes `[confirmed]` | Yes `[confirmed]` | Yes (break pay handled) `[approximate]` | Partial | Yes (RSE guide) `[confirmed]` ([agrismart.com/rse-2024-2025](https://agrismart.com/rse-2024-2025/)) | Yes | Assumed AU/NZ region `[approximate]` |
| Tātou + PaySauce | Yes `[confirmed]` | Yes (via PaySauce) `[confirmed]` | Yes `[confirmed]` | No (Tātou field only) | Yes `[confirmed]` | Yes `[confirmed]` | NZ-hosted `[approximate]` |
| Crystal Payroll | Piece-item per rate `[confirmed]` | Yes (auto checkbox) `[confirmed]` | Yes (formula: piece$÷hours×break-qty) `[confirmed]` | Via Hectre integration | Yes `[confirmed]` | No (back-office) | NZ `[approximate]` |
| PayHero | Yes `[confirmed]` | Yes (requires hours recorded) `[confirmed]` | Yes `[confirmed]` | No | Yes | No (back-office) | NZ `[approximate]` |
| Hectre | Yes (bin variety + picker) `[confirmed]` | Delegates to Crystal/payroll `[confirmed]` | Delegates `[confirmed]` | Yes (QC↔picker direct) `[confirmed]` | Partial | Yes | NZ `[approximate]` |
| FieldClock | Yes (CA pay rules) `[confirmed]` | Yes (CA MW) `[confirmed]` | CA rest-break rule, **not NZ** | QC-via metadata tags | **No RSE** | Yes | US `[confirmed]` → data-sovereignty concern |
| PickTrace | Yes (unlimited) `[confirmed]` | Yes `[confirmed]` | US break logic, **not NZ 10/30** | Bin QC | **No RSE** | Yes | US |
| Croptracker | Yes `[confirmed]` | Yes `[confirmed]` | Not NZ-specific | Yes `[confirmed]` | No | Partial | Canada |
| Harvust | No | No (not a payroll) | N/A | N/A | No | No | US |
| Excel + Xero | Manually | **Manual end-of-week only** | Manually | No | Manual | N/A | User's choice |

**Reading of the matrix:** The NZ-built stack (AgriSmart / Tātou+PaySauce / Crystal+Hectre / PayHero) converges on the same compliance primitives. US/CA systems (FieldClock, PickTrace, Croptracker) are strong on piece math but **apply the wrong jurisdiction's break and MW rules** and **don't know what RSE is**. That is the compliance gap HarvestPro can own.

---

## 3. NZ-specific compliance matrix

| Law / regulator | Requirement | What a piece-rate system must do | Most-common failure mode |
|---|---|---|---|
| **Minimum Wage Act 1983** | $23.95/hr adult from 2026-04-01 ([MBIE](https://www.mbie.govt.nz/about/news/minimum-wage-set-for-2026), [employment.govt.nz](https://www.employment.govt.nz/pay-and-hours/pay-and-wages/minimum-wage/minimum-wage-rates-and-types)) — applies to piece-rate workers too | Compare (buckets × rate) vs (hours × MW) **per pay period, max fortnight**; top up shortfall. [employment.govt.nz / pay & MW PDF](https://www.employment.govt.nz/assets/uploads/documents/pay-and-hours/pay-and-the-minimum-wage.pdf) | Averaging over too long a window ("he'll make it up next week") is non-compliant. `[confirmed]` — MW top-up must be resolved within the pay period, fortnight max. |
| **Employment Relations Act 2000 (§69ZD)** | Paid 10-min rest break if work >2 hrs; unpaid 30-min meal break if work >4 hrs; for longer days: 2x10-min + 1x30-min. [legislation.govt.nz §69ZD](https://www.legislation.govt.nz/act/public/2000/0024/latest/DLM1940671.html) | Roster/enforce breaks, and pay the 10-min rest at employee's *effective* hourly rate (piece-rate workers still get paid for the break). | Many orchards quietly deduct break time from piece-rate earnings — creates an implicit sub-MW hour. |
| **Holidays Act 2003** | 8% holiday pay on gross, incl. piece-rate top-up amounts; public-holiday rate at "Relevant Daily Pay" | Payroll must include top-up $ in gross-for-holiday calc, not just base piece earnings. [Peninsula NZ Holidays Act guide](https://peninsulagrouplimited.co.nz/resources/guides/holidays-act-2003) | Systems that store top-up as a separate non-gross line item under-compute holiday pay. |
| **RSE (Recognised Seasonal Employer)** | Pastoral care, accommodation standards, deductions capped, written contracts in workers' language, MBIE audit readiness. [INZ RSE scheme](https://www.immigration.govt.nz/about-us/news-centre/recognised-seasonal-employer-rse-scheme/), [INZ pastoral-care guide (PDF)](https://www.immigration.govt.nz/assets/inz/documents/employer-resources/rse-employer-pastoral-care-guide.pdf) | Store contract-language copy, deduction audit trail (accommodation, transport, medical), MBIE export. | Systems designed for H-2A (US) don't map 1:1 — deduction rules differ, pastoral-care reporting doesn't exist in H-2A. |
| **Crimes (Theft by Employer) Amendment Act 2025** | Deliberate underpayment is now a criminal offence (indictable). [DLA Piper](https://knowledge.dlapiper.com/dlapiperknowledge/globalemploymentlatestdevelopments/2025/new-zealands-wage-theft-bill), [Dentons NZ](https://www.dentons.co.nz/en/insights/alerts/2025/march/19/crimes-act-charges-coming-for-underpayers) | Immutable audit log of rate applied, hours, units, top-up calc per pay period. | Spreadsheet-based payroll has no audit log → director personal liability exposure. |
| **Privacy Act 2020** | 13 Information Privacy Principles; data sovereignty strongly encouraged. [legislation.govt.nz Privacy Act](https://www.legislation.govt.nz/act/public/2020/0031/latest/LMS23223.html), [LegalVision data sovereignty](https://legalvision.co.nz/data-privacy-it/data-sovereignty/) | Preference for NZ-hosted data, esp. for RSE PII (passport, visa numbers). | US-hosted SaaS creates cross-border data transfer; lawful but adds disclosure burden. |
| **MBIE record-keeping** | 6-year retention of wage/time records (Wages Protection Act, ERA §130). | Export: per-worker, per-day, hours, units, rate, top-up, breaks, deductions. | Paper bin-tickets lost at end of season = inability to defend in Labour Inspectorate audit. |

---

## 4. Deep-dive answers to the 10 topics

### 4.1 Piece-rate math with multiple rates per worker per day
- **PickTrace** is the most flexible: rates keyed on (individual × crew × SKU/pack × variety × crop × job × location × H-2A contract). `[confirmed]` [picktrace harvest v2](https://picktrace.com/harvest-management-2/)
- **AgriSmart** supports task-switching mid-shift; worker can swap from piece job A ($6/bin Gala) to job B ($8/bin Braeburn) at 11:30am and both rates carry through to payroll. `[confirmed]`
- **Crystal Payroll** requires one pay-item per rate, piece quantity posted per item. `[confirmed]` [Crystal piece-rate processing](https://support.crystalpayroll.co.nz/pp-processpiecerates.html)
- **Excel** is where this breaks: a single weekly sheet rarely encodes hour-by-hour rate changes.

### 4.2 Minimum-wage top-up enforcement
- **Auto per-pay-period** (compliant): AgriSmart, PaySauce, Crystal, PayHero, PickTrace (US-MW), Croptracker.
- **Manual end-of-week** (risky): Excel + Xero — admin ticks min wage by eye.
- **Key NZ nuance**: top-up is per pay period, **fortnight max** — cannot be averaged across a season. `[confirmed]` ([ALWU minimum-wage compliance](https://www.alwu.org.nz/our-campaigns/minimum-wage-compliance))

### 4.3 Crew-leader attribution
- **PickTrace** — crew leader scans their own badge, then scans individual picker badges and associates bins/pieces per picker. `[confirmed]` ([PickTrace crew-leader guide](https://picktrace-help.helpscoutdocs.com/article/375-crew-leader-guide))
- **FieldClock** — checker/ticketer model: one device per crew leader, picker QR tags physical badges. `[confirmed]`
- **Hectre** — bin-ticket is pre-printed with picker ID or scanned at the bin. `[confirmed]`
- **Anti-pattern**: "crew pooling" where the leader splits a day's total by headcount — this hides individual under-performers and can mask individual MW breaches.

### 4.4 QC and grading tied to pay
- **Croptracker + Hectre** link defect rate at QC back to picker ID. Pay can be reduced for excess reject, but **in NZ this cannot take the worker below MW** — the top-up still applies. `[confirmed]` ([Croptracker QC module](https://www.croptracker.com/blog/streamline-quality-data-tracking-with-croptracker%E2%80%99s-new-qc-module.html))
- Contractual penalty for C-grade is legal if disclosed in the employment agreement, but MW floor is absolute.

### 4.5 Rain day / partial shift
- **No vendor documents a purpose-built "rain-day" workflow.** `[approximate]` — the common pattern is: worker clocks off early, hours posted are actual, piece-units posted are actual, MW top-up auto-triggers because hourly wage would be below $23.95. This correctly handles the rain day *if* hours are accurately recorded.
- **Risk**: orchards that pay piece-only without a timesheet have nothing to prove minimum hours to top-up against on a rain day → MBIE complaint bait.

### 4.6 Rest-break enforcement
- **Legal** (NZ ERA §69ZD): 2-4 hrs → 1x10min paid; 4-6 hrs → 1x10min + 1x30min unpaid; 6-8 hrs → 2x10min + 1x30min. ([legislation.govt.nz §69ZD](https://www.legislation.govt.nz/act/public/2000/0024/latest/DLM1940671.html), [employment.govt.nz rest & breaks](https://www.employment.govt.nz/pay-and-hours/hours-and-breaks/rest-and-breaks))
- **Crystal Payroll** implements the formula: break pay = (piece earnings ÷ hours worked) × break hours. `[confirmed]`
- **PickTrace / FieldClock** apply CA-style break rules — **wrong jurisdiction for NZ**. This is a HarvestPro wedge.
- **Anti-pattern**: "no breaks, just pick faster" — extremely common in seasonal work, and specifically called out by Labour Inspectorate in the Asad Horticulture case. See §4.9.

### 4.7 RSE / Pacific-Island worker compliance
- **MBIE requirements**: accredited employer, pastoral care plan, accommodation audit, deductions capped/itemised, worker contracts in language, airfares split-funded, medical insurance. ([INZ pastoral-care guide PDF](https://www.immigration.govt.nz/assets/inz/documents/employer-resources/rse-employer-pastoral-care-guide.pdf), [HortNZ RSE scheme](https://www.hortnz.co.nz/people-jobs-and-labour/rse-scheme))
- **AgriSmart's RSE 2024–2025 guide** is the most explicit vendor doc acknowledging the scheme. `[confirmed]`
- US piece-rate software has **zero awareness** of RSE — they have H-2A, which is different.

### 4.8 Data sovereignty
- Privacy Act 2020 does **not** mandate NZ-only storage, but data sovereignty is strongly preferred ([LegalVision](https://legalvision.co.nz/data-privacy-it/data-sovereignty/)).
- For RSE workers (passports, visa, health), a plausibly-NZ-hosted system is a material trust signal.
- US SaaS (FieldClock, PickTrace, Harvust) route data via US AWS — lawful but discloseable; HarvestPro claiming NZ-hosted (AWS ap-southeast-2 or local) is a differentiator.

### 4.9 Labour-dispute history (NZ orchard wage cases)
- **Asad Horticulture Ltd, Bay of Plenty, 2024** — kiwifruit contractor + director fined $100,000 total for underpaying 3 migrant workers. "Systemic record-keeping breaches." Co. into liquidation 2024-08-14. ([employment.govt.nz case](https://www.employment.govt.nz/news-and-updates/kiwifruit-labour-company-director-penalised-100000-for-underpaying-workers), [1News](https://www.1news.co.nz/2024/12/02/kiwifruit-labour-company-director-fined-100k-for-underpaid-workers/))
- **Ajaypal Singh-linked companies, 2024** — $57M unpaid-tax liquidation, kiwifruit labour. ([NZ Herald](https://www.nzherald.co.nz/nz/two-kiwifruit-labour-companies-run-by-ajaypal-singh-in-liquidation-allegedly-owing-57-million-to-inland-revenue-in-unpaid-tax/premium/4GTWUQVRBZDN3IPPEFVOUWLG2Y/))
- **Ex-kiwifruit contractor, 2020** — $256,000 fine for "blatant exploitation" of migrant workers. ([1News 2020](https://www.1news.co.nz/2020/12/08/ex-kiwifruit-contractor-fined-256000-for-blatant-exploitation-of-migrant-workers/))
- **MBIE 2024 sweep**: 12 kiwifruit-contractor investigations open simultaneously. ([Stuff](https://www.stuff.co.nz/nz-news/360576922/mbie-swoops-kiwifruit-contractors-12-investigations-exploitation-underway))
- Common threads: no per-pay-period MW check, no auditable hours, break time deducted from piece earnings, migrant workers on temp visas, paper-based or Excel record-keeping.

### 4.10 Seasonality
- **AgriSmart / Tātou / PickTrace** all support "active / inactive" worker statuses per season. `[confirmed]`
- Common gap: KiwiSaver and Holidays-Act accruals for returning seasonal workers across seasons (Year-over-year anniversary dates). Vendors rarely discuss this publicly.

---

## 5. Top 3 techniques portable to HarvestPro

### 5.1 PickTrace's rate-resolution engine (inspiration, not copy)
A lookup keyed on `(worker_id, date, crew_id, crop, variety, block, task)` returning the piece rate in force for that scan. This lets a worker legitimately earn $6/bucket on Gala before lunch and $8/bucket on Braeburn after — with audit trail. HarvestPro should do the same, plus an NZ-specific per-pay-period top-up sweep at pay run.

### 5.2 Crystal Payroll's break-pay formula
`break_pay = (sum_piece_earnings / sum_hours_worked) × paid_break_hours`. This is the NZ-legal way to pay the 10-min rest break at the worker's *effective* hourly rate rather than at bare MW. Clean, auditable, and US systems don't do it. `[confirmed]` ([Crystal piece rates](https://crystalpayroll.com/informative/from-orchards-to-paychecks-payroll-for-piece-rate-workers/))

### 5.3 Hectre's bin-ticket traceability
Physical bin → QC defect rate → picker ID, all digital. HarvestPro can couple this with QC→MW-floor enforcement (grade penalty applies but cannot take worker below $23.95/hr). Adds quality-and-compliance-in-one positioning; neither FieldClock (no NZ MW), Croptracker (no RSE), nor Excel (no integration) delivers the combo.

---

## 6. Anti-patterns — common wage-theft mechanisms in NZ piece-rate payroll

| # | Anti-pattern | How it shows up | Legal exposure |
|---|---|---|---|
| 1 | **Averaged top-up** | "Slow week is OK because next week is big" — MW top-up computed seasonally rather than per pay period | Breach of MW Act — pay-period cap is fortnight ([ALWU](https://www.alwu.org.nz/our-campaigns/minimum-wage-compliance)). New Crimes Act 2025 makes intentional breach criminal. |
| 2 | **Break-time theft** | Breaks are "on the clock" in hours worked but deducted from piece earnings without prorating rest pay at effective rate | ERA §69ZD breach; creates sub-MW hours |
| 3 | **Bucket rounding down** | 27 buckets counted as 25 "because the last two weren't full" without a disclosed QC grade | Record-keeping breach; wage theft |
| 4 | **Crew-pool obfuscation** | Leader records crew total, divides by headcount — hides individual under-performers below MW | MW Act breach for each individual below floor |
| 5 | **Unrecorded hours** | Piece-only pay with no timesheet → nothing to compare MW against on a slow day | No defence in Labour Inspectorate audit (cf. Asad Horticulture case) |
| 6 | **Delayed top-up** | MW top-up paid at season end ("bonus") instead of per pay period | MW Act breach per period |
| 7 | **Deduction stacking on RSE workers** | Accommodation + transport + medical stacked, pushing net take-home under MW | MW Act + RSE pastoral-care breach |
| 8 | **Holiday pay on base piece only** | 8% calculated on piece earnings excluding the MW top-up component | Holidays Act 2003 breach; systemic per-worker arrears |
| 9 | **C-grade penalty ignoring MW floor** | "Pay docked 50% for rejects" — lands worker below $23.95 | MW Act floor is absolute |
| 10 | **Paper bin-tickets lost at season end** | Claims of hours/pieces cannot be reconstructed | MBIE audit failure — 6-yr record-keeping breach |

HarvestPro's right to exist: encode every one of these as a **hard system constraint** (refuse to pay-run if any worker-period under MW; refuse to drop break-pay proration; immutable bin-ticket log). Competitors built elsewhere do not have NZ jurisdiction modelled this precisely.

---

## 7. Answers to the specific questions

**Q. Which systems support different piece rates per variety AND per worker AND per day?**
Confirmed: **PickTrace** (most dimensions), **AgriSmart**, **Tātou**, **Hectre** (via bin-ticket), **Crystal Payroll** (via pay-item per rate), **Croptracker**. Excel can in theory, in practice rarely does.

**Q. Which enforce minimum-wage top-up automatically vs manual?**
Automatic per pay period: **AgriSmart, PaySauce/Tātou, Crystal, PayHero, PickTrace (US-MW), Croptracker, FieldClock (CA-MW)**. Manual end-of-week: **Excel + Xero**, and any US tool applied to NZ without configuration.

**Q. Which handle RSE workers?**
Explicitly RSE-aware: **AgriSmart** (published RSE 2024-25 guide), **Tātou + PaySauce** (RSE compliance marketing), **Crystal Payroll** (RSE employer integrations). `[confirmed]`
Not RSE-aware: **FieldClock, PickTrace, Harvust, Croptracker, LaborSync** (US-first).

**Q. Open source / affordable for a new NZ orchard?**
No open-source project covers NZ piece-rate + MW top-up + RSE. Closest OSS is **farmOS** (Drupal) and **Ekylibre** (Rails), both general FMIS with no NZ payroll logic. [farmos.org](https://farmos.org/), [Ekylibre](https://github.com/ekylibre/ekylibre), [awesome-agriculture](https://github.com/brycejohnston/awesome-agriculture). Entry-priced NZ commercial: PayHero ($4/emp/mo) + Excel timesheet, or AgriSmart basic tier. HarvestPro at $X/picker/season is plausibly cheaper than AgriSmart for <30-picker orchards.

**Q. What does PaySauce's integration with piece-rate systems look like?**
PaySauce acquired/partnered with **Tātou** — Tātou is the field-capture layer (tablet, offline, piece units, breaks); PaySauce is the payroll engine (MW top-up, PAYE, KiwiSaver, Holidays Act). Data flow: worker scans in Tātou → units + hours → PaySauce runs payroll, computes top-up, files PAYE to IRD. `[confirmed]` ([PaySauce/Tātou page](https://smoothpay.paysauce.com/tatou/))
HarvestPro can position as a **Tātou alternative that feeds the same PaySauce payroll** — lower switching cost for orchards already on PaySauce.

---

## 8. Strategic read for HarvestPro

- Market size estimate: ~50–200 NZ orchards currently not on AgriSmart/Tātou. Most on Excel + Xero. TAM is bounded but recurring.
- Moat: **compliance correctness on NZ-specific rules** — MW top-up per pay period (fortnight max), 10-min paid break at effective rate, RSE deduction audit, Holidays Act 8% on top-up-inclusive gross, Crimes Act 2025 audit-log readiness.
- Direct threats: **Tātou + PaySauce** (already bundled, hard to unbundle), **AgriSmart** (incumbent NZ orchard vendor).
- Differentiation angles that competitors cannot copy quickly:
  1. **Anti-pattern detector**: pre-pay-run report flagging each of the 10 anti-patterns for this pay period ("Worker X has 4 sub-MW days unresolved; Worker Y's holiday accrual is missing top-up component").
  2. **RSE pastoral-care audit export**: one-click MBIE-ready PDF.
  3. **Per-pay-period immutable ledger**: hash-chained for Crimes Act 2025 defence.
- Don't try to beat PickTrace on enterprise-scale multi-rate engines; beat it on "we're the only system that refuses to ship a non-compliant pay run in NZ."

---

## 9. Sources (grouped)

**NZ legal / regulatory**
- [employment.govt.nz — Minimum wage rates](https://www.employment.govt.nz/pay-and-hours/pay-and-wages/minimum-wage/minimum-wage-rates-and-types)
- [MBIE — Minimum wage set for 2026 ($23.95)](https://www.mbie.govt.nz/about/news/minimum-wage-set-for-2026)
- [employment.govt.nz — Pay and the Minimum Wage (PDF)](https://www.employment.govt.nz/assets/uploads/documents/pay-and-hours/pay-and-the-minimum-wage.pdf)
- [legislation.govt.nz — Employment Relations Act §69ZD breaks](https://www.legislation.govt.nz/act/public/2000/0024/latest/DLM1940671.html)
- [employment.govt.nz — Rest and breaks](https://www.employment.govt.nz/pay-and-hours/hours-and-breaks/rest-and-breaks)
- [Peninsula — Holidays Act 2003 guide](https://peninsulagrouplimited.co.nz/resources/guides/holidays-act-2003)
- [ALWU — Minimum-wage compliance (per-pay-period, fortnight max)](https://www.alwu.org.nz/our-campaigns/minimum-wage-compliance)
- [INZ — RSE scheme overview](https://www.immigration.govt.nz/about-us/news-centre/recognised-seasonal-employer-rse-scheme/)
- [INZ — RSE Employer Pastoral Care Guide (PDF)](https://www.immigration.govt.nz/assets/inz/documents/employer-resources/rse-employer-pastoral-care-guide.pdf)
- [HortNZ — RSE scheme](https://www.hortnz.co.nz/people-jobs-and-labour/rse-scheme)
- [legislation.govt.nz — Privacy Act 2020](https://www.legislation.govt.nz/act/public/2020/0031/latest/LMS23223.html)
- [LegalVision NZ — Data sovereignty](https://legalvision.co.nz/data-privacy-it/data-sovereignty/)
- [DLA Piper — NZ Wage Theft Bill 2025](https://knowledge.dlapiper.com/dlapiperknowledge/globalemploymentlatestdevelopments/2025/new-zealands-wage-theft-bill)
- [Dentons NZ — Crimes Act underpayment charges](https://www.dentons.co.nz/en/insights/alerts/2025/march/19/crimes-act-charges-coming-for-underpayers)

**NZ vendors**
- [AgriSmart — piece-rate software](https://agrismart.com/piece-rate-tracking-software-nz/)
- [AgriSmart — RSE 2024-25 guide](https://agrismart.com/rse-2024-2025/)
- [Tātou — horticulture software](https://www.tatou.app/horticulture-management-software)
- [PaySauce — horticulture payroll](https://www.paysauce.com/payroll/horticulture/)
- [PaySauce/Tātou integration](https://smoothpay.paysauce.com/tatou/)
- [Crystal Payroll — orchard piece-rate](https://crystalpayroll.com/informative/from-orchards-to-paychecks-payroll-for-piece-rate-workers/)
- [Crystal Payroll — how to process piece rates](https://support.crystalpayroll.co.nz/pp-processpiecerates.html)
- [Crystal Payroll — Hectre integration](https://support.crystalpayroll.co.nz/cs-integrationhectre.html)
- [PayHero — horticulture](https://www.payhero.co.nz/horticulture)
- [PayHero — Minimum Wage Top Up](https://support.payhero.co.nz/hc/en-us/articles/360002667136-Minimum-Wage-Top-Up)
- [Hectre — product](https://hectre.com/)
- [Hectre — apples](https://www.hectre.co.nz/crops/apples/)

**International vendors**
- [FieldClock — piece tracking](https://www.fieldclock.com/features/piece-tracking)
- [FieldClock — labor tracking](https://www.fieldclock.com/features/labor-tracking)
- [PickTrace — harvest management v2](https://picktrace.com/harvest-management-2/)
- [PickTrace — workforce management](https://picktrace.com/workforce-management/)
- [PickTrace — crew leader guide](https://picktrace-help.helpscoutdocs.com/article/375-crew-leader-guide)
- [Croptracker — labor tracking](https://www.croptracker.com/product/farm-management-software/farm-labor-tracking.html)
- [Croptracker — QC module](https://www.croptracker.com/blog/streamline-quality-data-tracking-with-croptracker%E2%80%99s-new-qc-module.html)
- [Harvust — FieldClock integration](https://www.harvust.com/fieldclock)
- [LaborSync — tracking](https://www.laborsync.com/labor-tracking-software)

**Open source / ecosystem**
- [farmOS](https://farmos.org/)
- [Ekylibre on GitHub](https://github.com/ekylibre/ekylibre)
- [awesome-agriculture](https://github.com/brycejohnston/awesome-agriculture)

**NZ wage-theft cases**
- [employment.govt.nz — Asad Horticulture penalised $100k](https://www.employment.govt.nz/news-and-updates/kiwifruit-labour-company-director-penalised-100000-for-underpaying-workers)
- [1News — Asad Horticulture fine](https://www.1news.co.nz/2024/12/02/kiwifruit-labour-company-director-fined-100k-for-underpaid-workers/)
- [NZ Herald — Bay of Plenty kiwifruit fine](https://www.nzherald.co.nz/bay-of-plenty-times/news/bay-of-plenty-kiwifruit-firm-asad-horticulture-ltd-fined-100000-for-underpaying-workers/2MNXMDAJBBABHNHU6FXFYDIGBQ/)
- [Stuff — MBIE 12 kiwifruit investigations](https://www.stuff.co.nz/nz-news/360576922/mbie-swoops-kiwifruit-contractors-12-investigations-exploitation-underway)
- [1News 2020 — $256k fine for migrant exploitation](https://www.1news.co.nz/2020/12/08/ex-kiwifruit-contractor-fined-256000-for-blatant-exploitation-of-migrant-workers/)
- [NZ Herald — Ajaypal Singh $57m liquidation](https://www.nzherald.co.nz/nz/two-kiwifruit-labour-companies-run-by-ajaypal-singh-in-liquidation-allegedly-owing-57-million-to-inland-revenue-in-unpaid-tax/premium/4GTWUQVRBZDN3IPPEFVOUWLG2Y/)
