# AgTech / Orchard / Harvest Management Software — Competitive Landscape

**Scope:** Research comparable systems to HarvestPro NZ (React PWA, Supabase + Dexie offline, 8 roles, piece-rate + NZ Holidays Act 2003, apple/kiwifruit). Purpose: identify *what mature products do differently and better*, not list own features.

**Date:** 2026-04-22. **Author:** Claude (agent). **Tags:** `confirmed` (from vendor site / primary source), `approximate` (secondary/derived), `deprecated` (dead or acquired).

---

## 1. Vendor-by-vendor findings

### 1.1 Hectre (Auckland, NZ) — *closest direct competitor*
- **Core features** `confirmed`: bucket/lug/bin real-time crediting; digital timesheets (hourly + piece-rate); waterproof on-the-go bin ticket creation; payroll with OT/DT, breaks, wage adjustments; spray plans; QC; task management; thinning/pruning; Spectre fruit-sizing AI (computer vision on bin photos). [hectre.com](https://hectre.com/)
- **Offline-first** `confirmed`: "operates without internet connection across timesheets, harvesting and mobile apps". [hectre.com](https://hectre.com/)
- **Pricing** `approximate`: annual subscription, **unlimited users**. No public price card — quote-based. [G2](https://www.g2.com/products/hectre/reviews)
- **Mobile**: native iOS + Android + web. NOT pure PWA.
- **Integrations** `confirmed`: Xero, PaySauce, MYOB, Famous/Radfords packhouse systems. [hectre.com](https://hectre.com/)
- **Data model** `approximate`: orchards → blocks → rows; bins and buckets with QR/waterproof tickets; pickers, crews, contractors; activity types (pick/prune/thin/spray).
- **Target crops** `confirmed`: apple, cherry, pear, kiwifruit, citrus, berry, stonefruit. 22 countries.
- **Traction**: 3.8 billion fruit scans processed; Washington Fruit & Produce, McClaskey, Honeybear as reference customers; Callaghan Innovation R&D support (NZ gov).
- **Killer feature**: **Spectre** — photo a bin, get size distribution + colour grade in seconds (98.7% accuracy claimed). Repack rate 10%→3%. Converts harvest data into pack-planning data.
- **Anti-pattern**: **unlimited-users-per-year pricing** — looks generous, but anchors expectation that seats are "free" and removes the per-employee signal that caps casual-labour sprawl. In NZ seasonal context where a pack-run can touch 400 people for 8 weeks, "unlimited" is both a feature and a way to hide cost in opaque enterprise quotes.

### 1.2 PickTrace (Glendale, CA) — *labor-heavy enterprise US*
- **Core features** `confirmed`: Bin Mode (tracks who picked which bin + where); Group Piece Rates (one scan → shared production); Unique Unit Mode (field-packed unique IDs); Pallet Mode (weighing whole pallets); Static Pieces Mode (pruning/spraying without physical units). Auto minimum-wage top-up, crew bonuses, piece-rate breaks, OT, 7th-day, unlimited pay rates keyed by individual/crew/SKU/variety/crop/job/location/H-2A contract. [picktrace.com](https://picktrace.com/harvest-management-2/)
- **Offline** `confirmed` (partial): **PickTrace Receiving** is a separate app advertised as "offline-ready". Main labor-tracking app relies on sync, not full offline. [Play Store](https://play.google.com/store/apps/details?id=com.picktrace.app)
- **Pricing** `deprecated/opaque`: quote only, enterprise-heavy. No public tier. NPS 80 claimed.
- **Mobile**: native iOS + Android. Multiple apps (Mobile / Receiving / Insights) — siloed.
- **Integrations** `confirmed`: payroll bulk export, PayCard Mastercard for workers. No native NZ payroll.
- **Compliance** `confirmed`: US-centric — H-2A contracts, I-9/W-4 digital storage. **Zero NZ Holidays Act support**.
- **Data model**: crews > employees; bins with scans; SKU/packstyle/variety axis for pay.
- **Target crops**: berries, tree fruit, citrus, hops. Primary market US + some LatAm.
- **Killer feature**: **Group Piece Rates with a single scan** — share production numbers across a crew without per-person scans. Reduces scan overhead during peak flow.
- **Anti-pattern**: **three separate apps** (Mobile / Receiving / Insights). Fragments mental model, forces re-auth, doubles offline-sync complexity. Also PayCard Mastercard lock-in — elegant for banked-nobody workers but a vendor-owned payment rail.

### 1.3 Croptracker (Picton, ON Canada) — *orchard-specific, open API*
- **Core features** `confirmed`: Punch Clock (piece-rate + hourly), Harvest module (bins/buckets), Production Practice module, Field Packing; 50+ reports; spray/irrigation/employee records; sizing/colour in-bin. Minimum-wage top-up + bonus auto-calc. [croptracker.com](https://www.croptracker.com/)
- **Offline**: `approximate` — not advertised prominently; mobile app is "field-ready" but no hard offline claim on marketing pages.
- **Pricing** `confirmed`: public pricing page exists — tiered (Basic / Professional / Enterprise). Module-based add-ons. [croptracker.com/pricing](https://www.croptracker.com/pricing.html)
- **Mobile**: native iOS + Android.
- **Integrations** `confirmed`: **open API with public documentation** — rare in this segment. Payroll export in multiple formats. No direct Famous/Radfords partnership confirmed.
- **Compliance**: GlobalGAP, CanadaGAP. No NZ-specific.
- **Data model**: orchards → blocks → rows; bin + bucket workflows split deliberately; activities typed.
- **Killer feature**: **public API + documented integration playbook**. Enterprise tier explicitly sells "custom workflow and SOP development" — productising the consulting.
- **Anti-pattern**: **50+ reports as a selling point** — reporting surface area breeds UI debt. Product surfaces too many pre-canned reports instead of a composable query model.

### 1.4 FieldClock (Pacific Northwest, US) — *simple, QR-first*
- **Core features** `confirmed`: QR-code time tracking on employee badges; piece-tracking by scanning fruit bins/boxes; geostamp down to individual picks; row-by-row productivity; QC reports associable to employee or fruit box. [fieldclock.com](https://www.fieldclock.com/)
- **Offline** `confirmed`: offline-sync mode — all data saved to device, syncs when online. [fieldclock.com/features/time-tracking](https://www.fieldclock.com/features/time-tracking)
- **Pricing** `confirmed`: **per clocked-in employee per month** — only billed when employee actually works. Farm Bureau discount: $8/additional-employee. Three tiers. [fieldclock.com/pricing](https://www.fieldclock.com/pricing)
- **Mobile**: native iOS + Android. Web admin.
- **Integrations** `approximate`: QuickBooks export, CSV; no NZ payroll.
- **Data model**: employee badge (QR) ↔ row ↔ piece scan ↔ geostamp. Flat, no blocks/bins hierarchy emphasised.
- **Killer feature**: **bill-per-actual-clock-in**. Pricing mirrors the seasonal labour curve — you pay when workers work. Brilliant for orchards that go 400 people peak → 15 off-season.
- **Anti-pattern**: **geostamp every pick** — privacy-heavy, creates data-retention liability, and on NZ unionised sites would face pushback. Also ties value to GPS quality which breaks in sheds/rainforests.

### 1.5 Agrivi (Zagreb, Croatia) — *broad FMS, shallow orchard*
- **Core features** `confirmed`: farm management, IoT+ERP interop, real-time monitoring, plug-and-play integrations. 360 Farm Enterprise / AI Engage / Food Traceability product lines. [agrivi.com](https://www.agrivi.com/)
- **Offline / piece-rate / bin-tracking**: **none advertised** on homepage. Not a labour-management product.
- **Pricing** `deprecated/opaque`: "book a meeting".
- **Mobile**: phone/tablet/desktop web.
- **Target**: broad-acre row crops + corporate agri/ESG. Orchard is a skin, not a core persona.
- **Killer feature**: **ESG/traceability chain** aimed at buyers (food brands) not growers — sells downstream.
- **Anti-pattern**: trying to be everything (satellites + IoT + ERP + traceability) — dilutes any single persona. A growth fallacy for HarvestPro to avoid.

### 1.6 Conservis (Minneapolis) — **ACQUIRED × 2, enterprise FMS**
- **Status** `deprecated`: acquired July 2021 by Rabobank + TELUS; re-acquired December 2023 by **Traction Ag**. Product still sold as "Conservis" under Traction. [PitchBook](https://pitchbook.com/profiles/company/83750-68), [Wikipedia](https://en.wikipedia.org/wiki/Conservis)
- **Core features** `confirmed`: planting/pruning/irrigation/pest/harvest scheduling; inventory; labour; finances; budget vs actual; grain contracts; FSA 578 reporting.
- **Orchard-specific** `approximate`: spray-activity automation for orchard compliance. Apple orchards cited as case study.
- **Pricing** `deprecated/opaque`: enterprise quote.
- **Integrations**: QuickBooks, John Deere Ops Center, Climate FieldView. No NZ payroll.
- **Killer feature**: **plan vs actual financial lens** — "audit readiness" framed as a CFO-facing feature not a compliance tax. Growers can see a cost-per-bin-per-block P&L.
- **Anti-pattern**: **two acquisitions in 30 months**. Roadmap churn, key people left, UI has consolidated-product decay smell (multiple dashboards for same data). Lesson: M&A fatigue is real in this sector.

### 1.7 Agworld (Perth AU, now US-owned) — *AU/NZ broad-acre*
- **Core features** `confirmed`: shared data ecosystem for grower ↔ agronomist ↔ advisor ↔ input-provider collaboration. Android + iOS + web. AU/NZ focus. [agworld.com](https://www.agworld.com/)
- **Orchard-specific**: minimal — row-crop + broadacre dominates. One orchard case study (McNab). No piece-rate or bin workflow.
- **Pricing** `confirmed` (Capterra): subscription, custom plans; agronomist tier separately priced.
- **Data model**: field-centric (recommendations, applications, jobs). **No bin/bucket primitives**.
- **Killer feature**: **multi-party collaboration model** — agronomist sees the same plan as grower sees as input-supplier sees. Role-based data sharing across organisational boundaries.
- **Anti-pattern**: cross-org sharing is the killer feature *and* the consent/GDPR nightmare. Don't copy this without a consent-ledger and data-retention audit trail.

### 1.8 Famous Software (US) / Radfords (NZ — FreshGrow/FreshPack/FreshQuality/FreshSales/FreshInsights) — *packhouse ERP, integration target*
- **Famous Software** `confirmed`: US packhouse ERP. Often cited alongside Radfords in the NZ-export kiwifruit/apple stack. [famoussoftware.com](https://www.famoussoftware.com/)
- **Radfords** `confirmed`: NZ-based, expanding US/CA/EU in apple, citrus, kiwifruit; customers DMS, Birchwood Packhouse, NZ Fruits, Mitolo (AU). Core modules FreshGrow (orchard), FreshPack (packhouse), FreshQuality, FreshSales (EDI with AU/NZ retailers), FreshInsights. **RFID bin validation** recently added. [radfords.global](https://www.radfords.global/)
- **Pricing**: enterprise quote only.
- **Integrations** `confirmed`: RFID bin validation, EDI to major AU/NZ retailers, finance-package link, add-on for packhouse-equipment integration.
- **For HarvestPro**: **these are not competitors — they are integration targets.** A grower running Radfords FreshPack wants the harvest app to dump bins with a matching ID. Winning = *being the picker-side sibling of Radfords/Famous*, not replacing them.
- **Killer feature (integration angle)**: **RFID bin validation at the weighbridge** — closes the chain-of-custody loop from orchard → packhouse. HarvestPro's QR bin ticket should be designed to coexist with/translate to Radfords RFID so no reconciliation is needed.

### 1.9 MyAgData — *not a fit*
- **Product** `confirmed`: electronic acreage reporting for **US FSA + crop insurance**. $120–$250 per filing season. [myagdata.com](https://myagdata.com/)
- **Relevance**: zero — US row-crop insurance compliance. Included only to confirm it's off-scope.

### 1.10 Wilbur-Ellis AgVerdict — *agronomy + precision*
- **Core features** `confirmed`: field mapping, scouting, plant nutrition, soil sampling, food safety compliance, application management, site-specific data, running-cost calc on fertiliser dropdowns. iOS app + desktop portal. Offline mode: "start task on one device, finish on another". [wilburellis.com](https://www.wilburellisagribusiness.com/)
- **Orchard-specific**: orchards mentioned but not primary.
- **Pricing**: bundled with Wilbur-Ellis retail customer relationship — not standalone SaaS.
- **Killer feature**: **real-time cost calc while choosing product** — price feedback at decision-time, not in end-of-month reports. Portable pattern.
- **Anti-pattern**: tied to input-reseller relationship. Growers who don't buy from Wilbur-Ellis can't really adopt it. Distribution-locked software.

### 1.11 FarmLogs — **DEPRECATED as independent product**
- **Status** `deprecated`: acquired by **Bushel** in June 2021. Brand lives on but team merged into Bushel. Focus shifted to grain supply chain + "grain passport" for identity preservation / crop insurance / sustainability. [agfundernews.com](https://agfundernews.com/bushel-acquires-farmlogs-to-integrate-farm-level-and-supply-chain-data)
- **Relevance**: row-crop grain only, US. Not a direct peer. Cautionary tale: once a "farmer-facing app" gets absorbed by a supply-chain platform, grower-centric UX decay is near-certain.

### 1.12 Secondary NZ/AU orchard tools worth naming
- **ABCgrower** (NZ) `confirmed`: cloud + offline mobile app; spray diary, quality, on-site log, **Bin Inventory Management** as separate module; explicit **minimum-wage management**. Direct NZ/AU packhouse+orchard. [abcsoftware.org](https://www.abcsoftware.org/)
- **eOrchard** (NZ/AU) `confirmed`: 4 tiers by orchard size; worker team mgmt, machinery/asset, pay-by-performance, public pricing page. [eorchardapp.com](https://www.eorchardapp.com/)
- **AgNote** (AU/NZ) `confirmed`: row + permanent crop; dashboards, multi-farm. [agnote.com](https://agnote.com/)
- **Tend** (US) `confirmed`: time-by-task labour.
- **Fruitometry** (NZ, Seeka-invested) `confirmed`: **AI drone/telemetry scan → heatmap of fruit density per m² per row within 24h**. Not a labour app but an adjacent layer HarvestPro could consume data from. [fruitnet.com](https://www.fruitnet.com/asiafruit/seeka-invests-in-fruitometry/185716.article)
- **Seeka's internal app** `confirmed`: orchard info, clearance tests, interim packing info by maturity area (bins tipped + trays packed), coolstore inventory + condition checks. Proves that the *largest NZ kiwifruit grower built in-house* rather than buy — the market has been underserved.

### 1.13 Open source: farmOS
- **Core** `confirmed`: Drupal-based server + Field Kit companion app. **PWA at farmOS.app** — works offline, installable to home screen, logs sync when online. Native iOS/Android available too. GPL. [farmOS.org](https://farmos.org/)
- **Relevance to HarvestPro**: farmOS Field Kit is the **closest open-source reference** for the offline-first PWA pattern HarvestPro is building. Their Field Kit architecture (client-side log store → background sync → server reconciliation) is what Dexie + Supabase is reimplementing. Worth studying their conflict-resolution model.
- **Killer feature**: **modular log type system** — any activity (harvest, spray, observation, purchase) is a typed "log" with a common envelope. Radically reduces schema drift.
- **Anti-pattern**: Drupal core. High cognitive load, slow velocity, hard to hire for. HarvestPro's Supabase stack is the right call.

---

## 2. Comparative table

| Vendor | Country | Piece-rate + NZ top-up | Offline | Mobile strategy | Pricing model | Integration stack | Status |
|---|---|---|---|---|---|---|---|
| **Hectre** | NZ | Yes `confirmed` | Yes | Native iOS/Android + web | Annual, unlimited users, quote | Xero, PaySauce, MYOB, Famous, Radfords | Active, well-funded |
| **PickTrace** | US | Yes (US wage rules) | Partial (receiving app only) | 3 native apps (siloed) | Quote, enterprise | Payroll CSV, PayCard Mastercard | Active |
| **Croptracker** | CA | Yes (incl. top-up auto) | Mobile, not offline-first | Native iOS/Android | **Public tiers** + modules | Open API, payroll CSV | Active |
| **FieldClock** | US | Yes (no NZ-specific) | Yes | Native iOS/Android | **Per-clocked-in-employee/month** | QuickBooks, CSV | Active |
| **Agrivi** | HR | No (no labour focus) | Partial | Web + native | Quote | IoT/ERP plug-and-play | Active |
| **Conservis** | US | Partial (no piece-rate focus) | No | Web-centric | Quote, enterprise | QuickBooks, John Deere, FieldView | **Acquired 2×** — Traction Ag 2023 |
| **Agworld** | AU | No | Partial | Native + web | Custom plans | Agronomist ecosystem | Active, AU/NZ |
| **Famous / Radfords** | US / NZ | N/A (packhouse) | N/A | Desktop packhouse + web | Enterprise | EDI, RFID, finance | Active — **integration target** |
| **ABCgrower** | NZ | Yes — **explicit min-wage mgmt** | **Yes (dedicated offline app)** | Web + offline app | Modular | Payroll, packhouse | Active, NZ/AU |
| **eOrchard** | NZ/AU | Yes (pay-by-performance) | `approximate` | Web | **Public tiers × 4** | Assets, teams | Active |
| **farmOS (Field Kit)** | OSS | Customisable | **Yes, PWA** | **PWA + native** | Free (GPL) | Drupal API, REST | Active OSS |
| **FarmLogs** | US | No | No | Native | Bundled with Bushel | Grain supply chain | **Deprecated as FMS** (Bushel 2021) |

---

## 3. Top 5 ideas portables a HarvestPro NZ

1. **Spectre-style bin photo → size/colour AI (from Hectre).** Take the bin photo HarvestPro already stores for QC and run a light sizing-estimate model. Even 80%-accuracy rough size distribution per block is enormously useful for pack-planning and convinces packhouses to integrate. It turns a passive QC artefact into an active supply-chain signal. This is *the* killer feature Hectre has and nobody else matches.

2. **Per-clocked-in-employee pricing (from FieldClock), not per-seat.** HarvestPro's workforce is 90% seasonal. If pricing is per named user, admins game it by sharing logins or under-provisioning. Bill per *actual* clock-in per month (e.g. NZ$4 per worker who clocked in at least once that month), and seats become honest. Mirrors the cost curve to the revenue curve (harvest season).

3. **Open API + public pricing page (from Croptracker).** Nobody else in this list has both. In the NZ mid-market, the buyer googles "orchard software pricing NZ" and bounces off "book a demo" walls. A public tier card + a documented REST API is a conversion moat and a procurement-friction remover. **Publish prices. Publish the OpenAPI.**

4. **Modular log-type system (from farmOS).** Every field action — pick, prune, QC, spray, break, scan — should be a typed log with a common envelope `{actor, time, geo?, block?, bin?, payload}`. HarvestPro's 8 roles × N activity types explodes into a schema mess unless you normalise now. farmOS's 10-year-old pattern is the proven way. Dexie makes it trivial client-side.

5. **RFID handoff to packhouse (from Radfords integration).** Don't replace Radfords/Famous — *be the picker-side sibling*. Design the bin QR ticket to carry an ID that can be translated to/from the packhouse RFID tag at the weighbridge. When the packhouse validates with RFID and the grower's block data is already there because HarvestPro pushed it via a tiny webhook, the grower doesn't do reconciliation. That's the chain-of-custody story that lets a Radfords customer say yes in 10 minutes.

---

## 4. Anti-patterns observed in the sector

1. **"Unlimited users"** (Hectre). Removes a cost signal that caps login sharing and hides the real per-worker unit economics from both customer and vendor. Looks generous; it isn't.

2. **Multiple siloed native apps** (PickTrace: Mobile + Receiving + Insights). Fragments auth, context, and offline state. Users re-learn navigation for each, and support burden triples. **HarvestPro's single-PWA stance is correct** — keep it.

3. **50+ canned reports as a feature** (Croptracker). Breeds UI debt and feature creep. Every report is a forever-maintained query + edge cases. A composable query/export model (pick axes, pick metrics, save as named view) scales better than a shipped taxonomy.

4. **Geostamp every pick** (FieldClock). Privacy liability in NZ/EU, breaks indoors, adds data-retention cost, creates a worker-surveillance optics problem. Record geolocation **per session** (clock-in / clock-out), not per scan.

5. **Hidden pricing / quote-only** (Conservis, Agworld, Agrivi, PickTrace, Hectre). Signals enterprise-only and slams the door on mid-size NZ growers (~30-200 ha) who are HarvestPro's sweet spot. Stealth-pricing works only when you've already won the market. You haven't.

6. **M&A churn** (Conservis 2× in 30 months, FarmLogs into Bushel). Once acquired by a supply-chain platform or bank, the grower-UX gets deprioritised. If HarvestPro ever entertains acquisition, prefer a horticulture-industrial buyer (Radfords, T&G, Zespri) over a fintech/telco that will treat the product as a channel. Don't be Conservis.

7. **Three-tier distribution dependency** (AgVerdict). Tying software adoption to a retail/reseller relationship means you can't sell to growers who use a different reseller. Stay channel-independent.

8. **Input-provider "collaboration"** (Agworld, AgVerdict). Cross-org data sharing without a consent ledger is a Privacy Act 2020 bomb (NZ) and GDPR bomb (EU). Don't build this until the consent model is designed.

9. **Trying to be the packhouse ERP** (Agrivi's ESG push, Conservis's finance push). The packhouse side is already owned by Radfords/Famous/Compac and integrates with 40-year-old sorting hardware. Stay orchard-side.

10. **US-centric payroll assumptions** (PickTrace H-2A, FieldClock QuickBooks). Even compliant-looking piece-rate logic fails silently on NZ Holidays Act s.50 (alternative holidays) and s.60 (public holiday pay rate). **Genuine NZ Holidays Act support is a moat** — Hectre has it, ABCgrower has it, nobody else really does.

---

## 5. Positioning takeaway for HarvestPro NZ

**Where Hectre is vulnerable** — opaque pricing, all-native-app stack, acquisition risk.
**Where PickTrace is vulnerable** — no NZ Holidays Act, siloed apps, US-only payroll.
**Where Croptracker is vulnerable** — no NZ sales/support presence, not offline-first.
**Where Conservis/FarmLogs/Agrivi are vulnerable** — acquired or broad-acre, not orchard-native.

**HarvestPro's defensible wedge:**
- Single PWA (not three apps), offline-first via Dexie (rare — only farmOS + ABCgrower match).
- NZ Holidays Act 2003 s.50 + s.60 baked in, min-wage $23.95 top-up.
- Public pricing + open API (nobody does both except Croptracker).
- Per-clocked-in-worker billing (nobody in NZ does this).
- 8 role model matches real NZ packhouse org charts (Manager/TL/Runner/QC/HR/Logistics/Payroll/Admin) — PickTrace flattens to ~4, Hectre to ~5.
- Integration-friendly to Radfords/Famous (via QR→RFID handoff), not competitive with them.

If HarvestPro executes on idea #1 (Spectre-style bin AI) within 12 months, it leapfrogs ABCgrower/eOrchard and becomes the only NZ-native product that matches Hectre on AI while beating it on pricing transparency and NZ-compliance depth.

---

## Sources

- [Hectre](https://hectre.com/) — primary product features
- [Hectre G2 reviews](https://www.g2.com/products/hectre/reviews) — pricing model, unlimited users
- [Hectre Spectre apple sizing](https://www.thepacker.com/news/packer-tech/20-million-pieces-fruit-sized-mobile-app) — AI traction
- [PickTrace harvest management](https://picktrace.com/harvest-management-2/) — bin/group piece-rate modes
- [PickTrace G2](https://www.g2.com/products/picktrace/reviews)
- [Croptracker pricing](https://www.croptracker.com/pricing.html) — public tiers
- [Croptracker bin tracking blog](https://www.croptracker.com/blog/croptracker-use-case-bucket-and-bin-productivity-and-inventory-tracking.html)
- [Croptracker piecerates](https://www.croptracker.com/product/farm-management-software/farm-labor-tracking/punch-clock-piecerates.html)
- [FieldClock features](https://www.fieldclock.com/features)
- [FieldClock pricing](https://www.fieldclock.com/pricing) — per-clocked-in-employee
- [FieldClock piece tracking](https://www.fieldclock.com/features/piece-tracking) — QR scans
- [FieldClock time tracking offline](https://www.fieldclock.com/features/time-tracking)
- [Agrivi](https://www.agrivi.com/)
- [Conservis](https://conservis.ag/) + [PitchBook Conservis](https://pitchbook.com/profiles/company/83750-68) — acquisition history
- [Conservis Wikipedia](https://en.wikipedia.org/wiki/Conservis) — Traction Ag 2023 acquisition
- [Agworld pricing](https://www.capterra.co.nz/software/173867/agworld)
- [Agworld McNab orchard case](https://www.agworld.com/us/customers/mcnab-orchards/)
- [Famous/Radfords FreshPlaza](https://www.freshplaza.com/europe/article/9529310/new-zealand-fresh-produce-software-provider-savours-surge-of-demand/)
- [Radfords software solutions](https://www.radfords.global/software-solutions)
- [MITech kiwifruit packhouse automation](https://www.mitech.nz/transforming-kiwifruit-packhouses-with-smart-automation-and-traceability/)
- [MyAgData](https://myagdata.com/) — US crop insurance, off-scope
- [Wilbur-Ellis AgVerdict](https://www.wilburellisagribusiness.com/)
- [FarmLogs acquired by Bushel](https://agfundernews.com/bushel-acquires-farmlogs-to-integrate-farm-level-and-supply-chain-data)
- [ABCgrower](https://www.abcsoftware.org/) + [Mobile App](https://play.google.com/store/apps/details?id=nz.abcsoftware.abcgrower)
- [ABCgrower min-wage](https://www.treefruit.com.au/shed/software/378-manage-the-minimum-wage-with-abcgrower)
- [eOrchard pricing](https://www.eorchardapp.com/pricing_and_plans)
- [AgNote](https://agnote.com/)
- [Seeka kiwifruit](https://www.seeka.co.nz/kiwifruit)
- [Seeka Fruitometry investment](https://www.fruitnet.com/asiafruit/seeka-invests-in-fruitometry/185716.article)
- [farmOS](https://farmos.org/) + [Field Kit GitHub](https://github.com/farmOS/farmOS-client)
- [Field Kit blog](https://jgaehring.com/projects/farmos/) — PWA + offline architecture
- [Holidays Act 2003](https://legislation.govt.nz/act/public/2003/0129/latest/DLM236893.html)
- [NZ min wage 2026 $23.95](https://www.employment.govt.nz/pay-and-hours/pay-and-wages/minimum-wage/minimum-wage-rates-and-types)
- [Crystal Payroll NZ piece-rate guide](https://crystalpayroll.com/informative/from-orchards-to-paychecks-payroll-for-piece-rate-workers/)
- [Good Fruit Grower labor apps review](https://www.goodfruit.com/labor-apps-on-tap/)
