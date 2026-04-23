# Seasonal / Ag HR + Contract Systems — Research vs HarvestPro HHRR Dashboard

**Date:** 2026-04-22
**Context:** HarvestPro NZ (orchard / packhouse) HHRR Admin manages employee directory, contract lifecycle (permanent / seasonal / casual), compliance alerts (expiring contracts, expiring visa), payroll overview, MFA enforcement. This doc maps what mature HR platforms offer versus what NZ seasonal horticulture actually needs.

**Scope of investigation:** BambooHR, Rippling, Deel, Justworks, ADP (Workforce Now + TotalSource), Workday HCM, Gusto, Employment Hero NZ/AU, MYOB PayGlobal, KeyPay (now Employment Hero Payroll), Breathe HR, Xero Me, Connecteam, When I Work, Deputy, Ehrly (not found — likely Seso/Harvust/Agri-Trak), Timerack, plus NZ-native AgriSmart, PayHero, iPayroll.

**Truth upfront:** Almost no global HR SaaS understands NZ Holidays Act 2003. BambooHR, Rippling, Gusto, Justworks, Deel, Workday HCM — none have a native NZ payroll engine that computes "otherwise working day" (OWD) for irregular pickers. The only systems that correctly ingest RSE + Holidays Act + payday filing are NZ-native (AgriSmart, PayHero, Employment Hero Payroll ex-KeyPay, MYOB PayGlobal, iPayroll). Everything else is "bring your own NZ payroll".

---

## 1. Comparative Matrix

| System | Seasonal contracts | Visa tracking | RSE pastoral care | NZ-specific (Holidays Act + payday filing) | Pricing (NZD/USD, per-empl) | Key integrations |
|---|---|---|---|---|---|---|
| **BambooHR** `[confirmed]` | Generic full-time / part-time / contract / freelance employee types. No native fixed-term end-date workflow beyond custom fields. | I-9 focused (US). No NZ VisaView. | None | No. Needs external NZ payroll. | USD $10 Core / $17 Pro / $25 Elite per empl/month, $250/mo floor, +5–15% implementation fee | Slack, Greenhouse, Workable, Xero (limited), Deputy |
| **Rippling** `[confirmed]` | Custom workflow expiry alerts via App Studio (no-code). 6-month lead visa flow. Auto Slack/email reminders. | Strong US I-9. Custom immigration dashboards (visa type, expiry, law firm, green card pipeline). **Does not sync with USCIS or INZ automatically.** | None | No native NZ payroll. Rippling Global EOR covers NZ but not RSE specifics. | ~USD $8 base + modules; Global EOR ~USD $500/empl/mo | Alma (immigration), 600+ apps |
| **Deel** `[confirmed]` | Strong contractor + EOR lifecycle. Local laws embedded (flags expiring visas, min wage). | In-house visa sponsorship, expiry alerts, right-to-work globally (150+ countries). | None specific | NZ EOR exists, IRD filing via local entity. Not a standalone NZ payroll. | EOR ~USD $599/empl/mo; Contractor ~USD $49/empl/mo; HRIS free under 200 | 100+ integrations, Slack, Greenhouse |
| **Justworks** `[confirmed]` | US-PEO model. Limited fixed-term concept beyond US at-will. | US I-9 only. | None | None. US-only. | USD $59–$109 PEPM | US-centric |
| **ADP Workforce Now / TotalSource** `[confirmed]` | Mid/enterprise. Supports worker classes, term end dates, requisition→onboarding. | Work authorization expiry tracking (US I-9). | None | ADP has a separate NZ/AU product (iHCM). Workforce Now is US. | TotalSource USD $200–$350 PEPM (50–500 empl band) | Extensive |
| **Workday HCM** `[confirmed]` | First-class contingent worker object, fixed-term end dates, auto-termination. VNDLY extended workforce module. | Global Worker Documents, expiry alerts, I-9 / right-to-work per-country. | None — enterprises build custom processes. | NZ payroll via partner (ADP GlobalView, CloudPay). | Enterprise pricing, ~USD $99/empl/mo+ (200+ empl floor) | Anything |
| **Gusto** `[confirmed]` | "Add and remove seasonal workers without long-term contracts." Unlimited payroll runs. 1099 contractor support. | US only. | None | US only. | USD $49 + $6 contractor; $40 + $6–$12 Simple/Plus | QuickBooks, Xero |
| **Employment Hero NZ/AU** `[confirmed]` | Full AU/NZ contract lifecycle including casual / part-time / fixed-term. Post-acquisition of KeyPay (Dec 2021, rebrand Mar 2023) → now includes Employment Hero Payroll. | Basic document expiry reminders. No INZ live check. | **Yes — RSE sick leave auto-accrual (max 10 days after 4 months), aligned with Oct 2023 INZ mandate.** | **Yes** — Holidays Act engine, payday filing, IRD integration. | NZD Lite $18 / Plus $32 / Unlimited $49 per empl/mo, $490/mo floor | Xero, MYOB, Deputy |
| **MYOB PayGlobal** `[confirmed]` | Enterprise NZ/AU (300–10,000 empl). Rostering, T&A, HR, workflow. Handles complex NZ award/agreement interpretation. | Document store with expiry reminders. | Not turnkey, but configurable. | **Yes** — purpose-built for NZ Holidays Act + payday filing. | Enterprise quote-based (typically $15–$30 NZD PEPM for larger orgs) | Xero, integration services |
| **KeyPay / Employment Hero Payroll** `[confirmed]` | Automatic IRD payday filing after each pay run via Gateway Services. | Basic document storage. | Limited — same as Employment Hero. | **Yes** — IRD integrated, Holidays Act. | Merged into Employment Hero pricing | Xero, Employment Hero |
| **Breathe HR** `[approximate]` | UK-origin SMB. Employee records, document library, probation tracking. | Generic document expiry reminders — not linked to government visa databases. | None | No native NZ payroll. | GBP £18–£167/mo tiers (up to ~200 empl, bands) | Limited NZ footprint |
| **Xero Me** `[confirmed]` | Employee self-service layer on Xero Payroll (NZ). Timesheets, payslips, leave, bank details, expenses. Not a full HRIS. | None | None | **Yes** — Xero Payroll covers NZ Holidays Act + payday filing. | Included with Xero Payroll subscription (NZD) | Xero |
| **Connecteam** `[confirmed]` | Deskless-first. Onboarding flows, forms, digital sign-off. Great for temporary crews. No contract-engine. | Document expiry via custom forms. | None native. | None | USD $29–$99/mo base for 30 empl (Small Business) + per-user tiers above | Gusto, QuickBooks |
| **When I Work** `[confirmed]` | Scheduling-first, light HR. | None | None | None | USD ~$2.50/user/mo Essentials → $8 advanced | Gusto, ADP |
| **Deputy** `[confirmed]` | Seasonal-friendly: availability, qualifications, shift preferences, per-worker notes. | Document storage with expiry reminders. | None | None. (AU/NZ entity exists, integrates with Xero Payroll NZ.) | USD $4.50–$6 per user/mo | Xero, ADP, Gusto, Employment Hero |
| **Seso / Harvust / Agri-Trak** `[confirmed, US equivalent of Ehrly]` | Purpose-built for H-2A. Housing, transport, piece-rate, bilingual ES/EN, wage & hour compliance. | H-2A visa filing built in. | US equivalent of RSE pastoral care. | US labor law only. | Quote-based, typically USD $10–$25/empl/mo | ADP, CenterPoint, QuickBooks |
| **Timerack** `[confirmed]` | Staffing-agency T&A. Facial / fingerprint biometrics. Anti-buddy-punching. | None specific | None | None | USD ~$5–$8/user/mo hardware+software bundles | ATS, payroll |
| **AgriSmart (NZ-native)** `[confirmed]` | **Best-in-class for NZ ag.** Bin ticketing, piece-rate, roster, mobile app, H&S, spray diary, digital inductions, payroll with Holidays Act + IRD/bank/Xero. | Basic visa fields, not auto. | **Yes — built for orchards/vineyards** | **Yes — native** | Quote-based (est. NZD $5–$10/empl/mo+base) | Xero, banks, IRD |
| **PayHero (NZ-native, FlexiTime)** `[confirmed]` | **Only charges active employees per month (no inactive charge during off-season).** Hourly/piece/casual/contract/shift. | None (payroll-focused) | None | **Yes — native**, Holidays Act stored in weeks, auto IRD filing once connected to myIR | NZD Origin $19+$4/empl (10 empl cap), Super $39+$5, Universe $59+$6 | Xero, Deputy, MYOB |
| **iPayroll (NZ-native)** `[approximate]` | NZ payroll, NZ-compliant. | None | Limited. | **Yes — native** | NZD from ~$30/mo + per-empl | Xero, MYOB |

---

## 2. NZ Legal Matrix

| Instrument | Rule (2026 state) | Implication for HarvestPro HR |
|---|---|---|
| **Employment Relations Act 2000 s67A (90-day trial)** `[confirmed]` | **Amended Feb 2026 (Employment Relations Amendment Act 2026)**: 90-day trial extended to **all employers**, no longer limited to <20 empl. Must be in writing, in good faith, agreed **before work starts**. | HarvestPro must ensure contract template captures trial clause pre-start date. Alerts should fire if trial period window (day-83 to day-90) approaches so managers can decide. |
| **ERA s66 (fixed-term)** `[confirmed]` | Fixed-term needs **genuine reason based on reasonable grounds**. Valid reasons: seasonal peak, leave cover, project end, increased demand. **Invalid**: testing suitability, visa expiry, generic "financial uncertainty". | Seasonal pickers qualify. HR system must store reason text on contract and expose it in audit. Do NOT auto-align fixed-term end with visa expiry — that's explicitly unlawful per Lane Neave guidance. |
| **Holidays Act 2003** `[confirmed]` | Daily rates for some leave, weekly for annual. "Otherwise working day" test is hard for irregular pickers. **Employment Leave Bill introduced March 2026** will move to **hours-based accrual from day 1** against standard hours. Not yet in force. | Payroll integration is where this happens, not HR. But HR must capture work pattern accurately (roster, hours) to enable OWD determination. Pro-rated annual leave on termination remains pain point. |
| **RSE scheme (INZ, Pastoral Care Guide Feb 2026 INZ 1391)** `[confirmed]` | Pacific workers from 10 eligible countries. Max 7 months (9 for Kiribati/Tuvalu). Employer must: accommodate to audit-standard with yearly self-audit form + photos, provide transport to/from work, onsite facilities (toilet/handwash/first aid/water), airport transport + half airfare on contract end, RSE sick leave (up to 10 days after 4 months), minimum guaranteed hours (30/week avg, Oct 2023 rules). Welfare + pastoral care mandatory. | HR system needs: cohort grouping (30 workers same flight same orchard), accommodation register with annual photo+form, transport roster, sick leave counter per worker, airport logistics, half-airfare payroll entry. HarvestPro's `check-compliance` EF should surface: accommodation audit overdue, sick leave threshold approached, flight/half-airfare pending. |
| **HSE — Health and Safety at Work Act 2015** `[confirmed]` | PCBU must keep record of workers who completed induction + site access. Every new worker/visitor must be inducted. Information, training, supervision provided. | Induction record per worker per site, per season. Re-induction when site changes. Digital sign-off with timestamp + trainer ID. Evidence auditable (WorkSafe NZ). |
| **IRD payday filing** `[confirmed]` | Employment info sent within **2 working days** of payday (electronic). Earnings, PAYE, KiwiSaver, student loan. Gateway Services or myIR file upload. | HR doesn't file, payroll does — but HR onboarding must capture IRD number + KiwiSaver opt-in + student loan status before first pay. HarvestPro onboarding wizard should enforce. |
| **Human Rights Act 1993 + HRC** `[confirmed]` | 13 prohibited grounds of discrimination (sex, race, age, disability, etc). Applies to hiring, terms, termination. | HR fields should not capture prohibited grounds *except where legally required* (e.g. passport for visa, but not race). Dashboards should not filter workers by protected characteristics. |
| **Immigration Act 2009 / VisaView** `[confirmed]` | Employer can check live visa status of current/prospective worker via VisaView (requires passport data). Also REST API via vSure (3rd party wrapper). | HarvestPro HR should cache visa snapshot per worker + schedule 30/60/90-day expiry alerts. Ideally integrate VisaView or vSure API for live check before each season. |
| **Minimum wage + piece-rate top-up** `[confirmed via Employment NZ]` | Piece-rate workers must still earn ≥ min wage per hour averaged per pay period. Employer calculates top-up. | Payroll side — but HR onboarding must flag "piece-rate" work pattern to enable payroll calculation. |

---

## 3. Top 5 Ideas Portable to HarvestPro HR Dashboard

### Idea 1 — RSE Cohort Object (from AgriSmart + Employment Hero)
Treat "30 Pacific workers same flight same orchard" as a first-class entity, not 30 individual rows.
- `cohort_id`, `source_country`, `arrival_flight`, `accommodation_site_id`, `atr_id` (Agreement to Recruit), `cohort_start`, `cohort_end`.
- Bulk operations: bulk induction sign-off, bulk contract issue, bulk visa-expiry check.
- Dashboard pastoral-care widget: accommodation audit due date, sick-leave average across cohort, pending airport transport.

### Idea 2 — Pre-built Alerts Library + Severity (from Rippling App Studio)
Replace HarvestPro's custom `check-compliance` Edge Function with a catalog of named rules, each emitting alerts with severity. Ship with:
- `visa_expiry_30d` (amber) / `visa_expiry_7d` (red)
- `contract_end_30d` (amber) / `contract_ended_no_renewal` (red)
- `induction_missing` (red, blocks first-day work)
- `rse_accommodation_audit_due` (amber)
- `rse_sick_leave_90pct_of_cap` (amber)
- `ird_number_missing` (red, blocks first pay)
- `kiwisaver_status_unconfirmed` (amber)
- `trial_period_day_83` (amber — decide before 90)
- `fixed_term_reason_missing` (red — unlawful per s66)
- Rule engine fires into a single `compliance_alerts` table with `acknowledged_by` + `resolved_at`.

### Idea 3 — VisaView/vSure Integration for Live Visa Check (from Deel + Rippling)
Cache visa snapshot per worker with `last_checked_at`. Schedule a nightly job that re-validates via vSure VEVO API. Surface diff (e.g. visa revoked, conditions changed, expiry moved). This is a substantial differentiator: no competitor pre-validates daily. Legal constraint: can only store what INZ returns for **that** employer-employee pair (scope-limited).

### Idea 4 — Worker-History Timeline with Role Transitions (from Workday contingent worker object)
A picker who was team-leader last season is now a regular picker. Model as:
- `worker` (1) → `engagements` (N, one per season/contract). Each engagement has role, rate, cohort, start/end.
- `worker_history` view lets admin see prior seasons, prior roles, prior performance notes.
- Preserves continuity for returning RSE workers (years 2, 3, 4 arriving under same ATR).

### Idea 5 — Mobile Pastoral-Care Check-In (from Connecteam + Deputy)
RSE pastoral care is hard to evidence at audit. Build a mobile check-in where designated welfare officer does weekly wellness check per worker/accommodation and logs: accommodation condition, worker wellbeing note, incident flag. Timestamp + GPS + photo. INZ audit becomes self-service — ship an export pack.

---

## 4. Anti-Patterns in HR for Seasonal Ag

### AP1 — "One record per worker" with no season boundary
Forces overwrite of rate, role, cohort every season. Loses historical payroll basis. Breaks pro-rated final-pay calc when a worker returns in a new role.
**Fix:** workers + engagements model (Idea 4).

### AP2 — Using visa expiry as fixed-term end date
Directly unlawful under NZ s66 (Lane Neave 2021/2024 cases). Visa expiry is a "circumstance of the employee" not "of the position".
**Fix:** contract end date = season end (genuine reason). Visa expiry stored separately, triggers alerts but does not auto-terminate contract.

### AP3 — Capturing race/ethnicity/religion fields "for stats"
Human Rights Act 1993 — strict liability for discriminatory treatment. If the data doesn't exist, it can't be used unlawfully.
**Fix:** capture **only** country-of-origin for RSE reporting to INZ (mandatory) + DOB for payroll + passport # for visa. Nothing else protected.

### AP4 — Generic "employment type" dropdown (FT / PT / Contract)
Misses NZ-specific distinctions. A "casual" in NZ is legally distinct from "fixed-term seasonal" — casuals get paid 8% rolled-up holiday pay, seasonal fixed-term accrue annual leave normally after 12 months.
**Fix:** explicit enum: `permanent_ft`, `permanent_pt`, `fixed_term_seasonal`, `casual`, `rse_limited_visa`, `whv` (working holiday visa worker). Each has distinct leave accrual + contract template.

### AP5 — Email-only visa expiry alerts
Nobody reads emails in the middle of harvest. Alerts get buried.
**Fix:** in-app badge on HR dashboard + daily digest + SMS for red-severity (visa expires in 7d).

### AP6 — Password-only auth for HR admin
HR holds IRD numbers, passport scans, bank accounts. If compromised, every worker is at risk. HarvestPro already does MFA — keep doing it, and enforce on all admin roles (not just owner).

### AP7 — Storing signed contracts in the same bucket as marketing PDFs
Signed contracts, passports, visas, IRD letters need: encryption at rest, signed-URL access (≤15 min TTL), per-worker ACL, audit log of every access. Most global HRIS use S3 with long-lived URLs — dangerous.
**Fix:** Supabase storage with per-worker RLS policy + signed URL helper that logs `document_access_log(doc_id, user_id, at)`.

### AP8 — No offboarding final-pay checklist
Pro-rated annual leave, outstanding alt holidays, unpaid piece-rate bonuses, KiwiSaver final contribution, half-airfare for RSE — all must be reconciled. Most systems leave this to payroll and it falls through the cracks.
**Fix:** offboarding wizard with checklist per worker type (permanent / seasonal / RSE), each item blocking until payroll confirms.

### AP9 — Treating fixed-term reason as free-text
If reason isn't recorded structurally, you can't audit for s66 compliance across the workforce.
**Fix:** dropdown of valid reasons (seasonal harvest, project cover, leave replacement, short-term demand) + free-text elaboration. Disallow "work visa expiry" as a reason (show warning).

---

## 5. Key Questions — Answered

**Q: Which HR systems support pure seasonal workforce (everyone casual/seasonal, no permanents)?**
A: AgriSmart (NZ-native, horticulture), PayHero (per-active-employee pricing saves ~70% in off-season), Seso/Harvust/Agri-Trak (US H-2A equivalents). Deputy and Connecteam scale OK but lack NZ payroll. Everyone else assumes a permanent baseline.

**Q: Which integrate with NZ IRD directly for payday filing?**
A: PayHero `[confirmed]`, KeyPay / Employment Hero Payroll `[confirmed]`, Xero Payroll `[confirmed]`, MYOB PayGlobal `[confirmed]`, iPayroll `[confirmed]`, AgriSmart `[confirmed]`. BambooHR / Gusto / Rippling / Justworks / ADP Workforce Now — **no direct IRD integration**.

**Q: Which track visa expiry and contract renewal automatically?**
A: Rippling (custom), Deel (built-in + in-house visa team), Workday (enterprise). None pre-validate against INZ VisaView automatically — that's a gap HarvestPro could fill via vSure VEVO API.

**Q: Which handle RSE cohort management?**
A: **None** of the global vendors. Employment Hero NZ addresses RSE sick leave accrual only. AgriSmart is the closest NZ-native, but cohort-as-object is not fully modelled there either. HarvestPro has whitespace opportunity here.

**Q: Pricing for a small NZ orchard (30–100 workers, 5-month season)?**
- AgriSmart: quote-based, estimated NZD 30–50/empl/mo during active months
- PayHero (best off-season economics): $19+$4×30 = $139/mo peak, $19 off-season base
- Employment Hero Lite: $490/mo floor regardless → expensive for 30 empl
- BambooHR: $250/mo floor + $10×30 = $550 peak, $250 off-season
- Deel HRIS: free under 200 empl + $49/contractor/mo → $1,470/mo for 30 contractors
- Gusto: US only, not viable in NZ
- Deputy (scheduling only, plus Xero Payroll separate): $4.50×30 = $135 + Xero payroll

**Winner for small NZ orchard economics:** PayHero + AgriSmart combo, or AgriSmart standalone. HarvestPro competes in this band.

---

## 6. Anti-discrimination + HRC notes

- **HRC guidance (confirmed):** hiring decisions and contract terms cannot differ based on 13 prohibited grounds. Specific to ag: avoid "we prefer Pacific workers" or "men only" language in seasonal postings — even where crew has historically been 90% Pacific men.
- **RSE exemption:** INZ-mandated country-of-origin capture for RSE is lawful because it's a regulatory requirement. But that field should **not** leak into general HR reporting/filters.
- **Language accessibility:** RSE workers may have limited English. Contract + H&S induction in worker's primary language (Samoan, Tongan, Ni-Vanuatu, etc.) is expected practice. AgriSmart and Harvust both do this bilingually.

---

## 7. Tags summary

**[confirmed]** — BambooHR pricing, Rippling App Studio visa, Deel EOR, ADP tiers, Gusto seasonal, Employment Hero RSE sick leave, PayHero pricing, ERA s67A 2026 amendment, ERA s66 genuine reason, RSE Pastoral Care Guide Feb 2026, HSWA induction duty, IRD payday filing 2-day window.

**[approximate]** — Breathe HR NZ footprint (UK-origin, limited marketing in NZ), iPayroll RSE-specific features (docs generic), AgriSmart pricing (not public).

**[deprecated]** — Pre-2026 90-day trial rule (was <20 empl only, now all employers). Pre-Oct 2023 RSE rules (lower pay floor, no 10-day sick leave cap).

**[not found]** — "Ehrly" as a vendor — no such company surfaced; closest analogues are Seso, Harvust, Agri-Trak (all US H-2A focused).

---

## Sources

- [BambooHR Pricing 2026 — Pin](https://www.pin.com/blog/bamboohr-pricing/)
- [BambooHR FAQ](https://www.bamboohr.com/faq)
- [Rippling HRIS Review 2026](https://www.rippling.com/blog/rippling-hris-review)
- [Rippling Immigration + Alma Guide](https://www.tryalma.com/learn/rippling-immigration-integration-guide)
- [Rippling Work Authorization Glossary](https://www.rippling.com/glossary/work-authorization)
- [Deel HR Compliance](https://www.deel.com/hr-platform/compliance/)
- [Deel Employee Immigration](https://www.deel.com/hr-services/employee-immigration/)
- [Deel Pricing](https://www.deel.com/pricing/)
- [Gusto Pricing 2026](https://gusto.com/product/pricing)
- [Gusto Seasonal Workers Review (DianaHR)](https://www.getdianahr.com/blog/gusto-payroll-review-features-pricing-use-cases)
- [Employment Hero NZ — RSE Changes](https://employmenthero.com/nz/blog/changes-to-the-rse-scheme/)
- [Employment Hero NZ Pricing](https://employmenthero.com/nz/pricing/)
- [Employment Hero — Holidays Act Compliance](https://employmenthero.com/nz/blog/holidays-act-2003-managing-compliance/)
- [MYOB PayGlobal](https://www.myob.com/nz/enterprise/products/myob-payglobal)
- [MYOB PayGlobal — Fusion5](https://www.fusion5.com/au/people-management/myob-payglobal)
- [KeyPay NZ Pricing](https://nz.keypay.com/pricing)
- [Workday — Contingent Workforce](https://www.workday.com/en-us/topics/hr/contingent-workforce.html)
- [Workday VNDLY](https://www.workday.com/en-us/products/vndly-vms/overview.html)
- [ADP TotalSource vs Workforce Now](https://www.softwareadvice.com/hr/adp-totalsource-profile/vs/adp-workforce-now/)
- [ADP vs Justworks](https://www.adp.com/what-we-offer/hr-outsourcing-and-peo/professional-employer-organization/compare/adp-vs-justworks.aspx)
- [Xero Me — NZ](https://www.xero.com/nz/xero-me/)
- [Connecteam](https://connecteam.com/)
- [Deputy — Agriculture](https://www.deputy.com/industry/agriculture)
- [PayHero Pricing](https://www.payhero.co.nz/pricing)
- [PayHero + IRD Payday Filing](https://www.payhero.co.nz/payday-filing)
- [iPayroll](https://ipayroll.co.nz/)
- [AgriSmart — Horticulture](https://agrismart.com/horticulture-workforce-software/)
- [AgriSmart — Farm Payroll NZ](https://agrismart.com/farm-payroll-software-new-zealand/)
- [Seso Labor](https://www.sesolabor.com/)
- [Harvust](https://www.harvust.com)
- [Agri-Trak](https://www.agri-trak.com/)
- [Timerack](https://timerack.com/)
- [ERA 2000 s66 — Fixed term](https://www.legislation.govt.nz/act/public/2000/0024/latest/DLM59161.html)
- [ERA 2000 s67A — Trial period](https://www.legislation.govt.nz/act/public/2000/0024/latest/DLM1867204.html)
- [Employment Relations Amendment Act 2026 — Dentons](https://www.dentons.co.nz/en/insights/alerts/2026/february/27/the-employment-relations-amendment-act-2026)
- [90-day trial extended to all employers (Employment NZ)](https://www.employment.govt.nz/news-and-updates/90-day-trial-periods-extended-to-include-all-employers)
- [Holidays Act 2003](https://www.legislation.govt.nz/act/public/2003/0129/latest/DLM236387.html)
- [Holidays Act Reform (MBIE)](https://www.mbie.govt.nz/business-and-employment/employment-and-skills/employment-legislation-reviews/holidays-act-reform)
- [RSE Pastoral Care Guide Feb 2026 (INZ 1391 PDF)](https://www.immigration.govt.nz/assets/inz/documents/employer-resources/rse-employer-pastoral-care-guide.pdf)
- [RSE scheme overview (INZ)](https://www.immigration.govt.nz/about-us/news-centre/recognised-seasonal-employer-rse-scheme/)
- [RSE status requirements (INZ)](https://www.immigration.govt.nz/work/for-employers/getting-accreditation-or-approval-to-hire/employing-workers-through-the-recognised-seasonal-employer-scheme/applying-and-reapplying-for-recognised-seasonal-employer-status-process-steps/recognised-seasonal-employer-status-requirements-for-employers/)
- [Horticulture NZ — RSE](https://www.hortnz.co.nz/people-jobs-and-labour/rse-scheme)
- [HSWA 2015 — Legislation](https://www.legislation.govt.nz/act/public/2015/0070/latest/DLM5976660.html)
- [WorkSafe — HSWA](https://www.worksafe.govt.nz/laws-and-regulations/acts/hswa/)
- [WorkSafe — Inductions](https://www.worksafe.govt.nz/topic-and-industry/road-and-roadside/keeping-healthy-safe-working-road-or-roadside/part-d/29-0-inductions/)
- [IRD — Payday filing](https://www.ird.govt.nz/employing-staff/payday-filing)
- [IRD — Payday filing for digital providers](https://www.ird.govt.nz/digital-service-providers/services-catalogue/returns-and-information/payday-filing)
- [IRD — RSE worker tax](https://www.ird.govt.nz/roles/non-residents/working-in-new-zealand-as-a-recognised-seasonal-employer-rse-worker)
- [INZ — VisaView for employers](https://www.immigration.govt.nz/work/for-employers/resources-services-and-information-to-help-employers/visaview-for-employers/)
- [INZ — VisaView Guide PDF](https://www.immigration.govt.nz/assets/inz/documents/online-systems/visaviewguideforemployers.pdf)
- [vSure NZ Visa API](https://vsure.zendesk.com/hc/en-us/articles/360047135591-New-Zealand-Visa-Check-API-Documentation)
- [Lane Neave — s66 genuine reason](https://www.laneneave.co.nz/news-events/fixed-term-agreements-what-is-a-genuine-reason-based-on-reasonable-grounds/)
- [Community Law — Fixed-term agreements](https://communitylaw.org.nz/community-law-manual/test/different-types-of-employment-agreements/fixed-term-agreements/)
