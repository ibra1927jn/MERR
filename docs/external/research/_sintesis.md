# Síntesis round 1 — sistemas comparables a HarvestPro NZ

**Fecha:** 2026-04-22
**Input:** 7 agentes paralelos, 2471 líneas totales, 0 fallos.

Target: `/root/repos/harvestpro-nz` — React 19 + TypeScript strict + Vite 7 + Tailwind + Supabase (Postgres + 11 Edge Functions + RLS) + Capacitor 8 (Android native) + Dexie v3 (IndexedDB offline) + custom sync queue + AES-256-GCM + i18n 5 langs. ~92k LOC. 8 roles. 30+ tables. ~3800 tests (~50% stmt coverage). Target: NZ orchards (apple/kiwi/stonefruit), piece-rate pickers con Holidays Act 2003 + min wage $23.95/hr top-up.

- [`agtech_orchard_software.md`](agtech_orchard_software.md) — Hectre/Croptracker/FieldClock/PickTrace/Conservis/Famous Software/farmOS (233 L, 17 vendors)
- [`offline_first_pwa.md`](offline_first_pwa.md) — RxDB/PowerSync/ElectricSQL/Replicache/WatermelonDB/PouchDB/Automerge/Yjs/Loro/Jazz/Evolu/LiveStore/Workbox/TinyBase (368 L, 14 systems)
- [`payroll_compliance_nz.md`](payroll_compliance_nz.md) — Xero/PaySauce/Smartly/IMS/iPayroll/Ace/Deputy/Tanda/KeyPay/MYOB/AgriSmart + Crimes Act 2025 (305 L, 15 vendors)
- [`mobile_scan_fieldops.md`](mobile_scan_fieldops.md) — Scandit/Dynamsoft/Zebra/ZXing/Capacitor-MLKit/Logiwa/FoodLogiQ/QuickPick/Hectre/Tātou (446 L, 17 systems)
- [`supabase_rls_edge.md`](supabase_rls_edge.md) — Supabase vs Hasura/Firebase/Nhost/Appwrite + RLS patterns correctos (645 L)
- [`piece_rate_ag_labor.md`](piece_rate_ag_labor.md) — FieldClock/PickTrace/AgriSmart/Crystal Payroll/Tātou + NZ case law (244 L, 16 systems)
- [`seasonal_hr_compliance.md`](seasonal_hr_compliance.md) — BambooHR/Rippling/Deel/Employment Hero/PayHero/AgriSmart + vSure API (230 L, 19 vendors)

**Total: 2471 líneas con claims tagged `[confirmed]/[approximate]/[deprecated]`.**

---

## Tabla comparativa — ¿existe algo parecido a HarvestPro NZ?

| Pilar / capa | Equivalentes más cercanos | HarvestPro vs eso |
|---|---|---|
| **Orchard ops (bin/bucket + roles)** | **Hectre** (NZ) — #1 directo, **Croptracker** (CA), **PickTrace** (US), **FieldClock** (US) | Hectre es el peer más fuerte y tiene Spectre AI photo-size. HarvestPro **NO tiene visual AI**, pero **sí** NZ Holidays Act nativo, dual-layout PWA, 8 roles tipados |
| **Offline-first PWA sync** | RxDB + PowerSync + ElectricSQL + Replicache + WatermelonDB | HarvestPro custom stack es ~70% primitives estándar bien compuestos + ~30% gap genuino (DLQ + 8h JWT refresh). **No reinventa la rueda** |
| **NZ Payroll engine** | **Smartly**, **AgriSmart**, **MYOB PayGlobal** son los 3 con piece-rate nativo. **Xero Payroll** es el líder pero NO soporta piece-rate directo | HarvestPro debe **integrar Xero (OAuth2)**, no replicar. Su moat es el **front-end + compliance + wage-shield indicator**, no el payroll engine |
| **Mobile scan (QR/bucket)** | **Scandit** ($10k+/año, descartado), **@capacitor-mlkit/barcode-scanning** (likely lo que usa), **QuickPick/FairPick** (2ndSight, US) | QuickPick tiene el **lockout-min-interval pattern** exacto que resuelve los 30k duplicates. Hectre Spectre = next level. Croptracker pre-printed IDs elimina dupes by design |
| **Supabase RLS + Edge** | Hasura + Firebase Firestore + Nhost + Appwrite + PostgREST puro | Supabase es correcto para el caso, pero los **defaults matan**: RLS `USING(true)` es el footgun; self-host MFA env requiere explicit override; ghost user `00000000...` = attack precursor |
| **Piece-rate ag labor** | **FieldClock** (US, tiene 4 modos), **PickTrace** (US, rate resolution), **AgriSmart** (NZ-native), **Tātou** (ahora propiedad PaySauce) | HarvestPro compete directo con **AgriSmart** en NZ y con **Tātou** (ahora "field capture" de PaySauce). Moat real: **NZ MW top-up per pay period fortnight-max**, Holidays Act s.50 + s.60, Crimes Act 2025 audit-trail |
| **Seasonal HR + RSE** | **AgriSmart** (NZ-ag-native), **PayHero** ($19+$4/active), **Employment Hero NZ** (native RSE sick leave) | **RSE cohort-as-object es whitespace total**. Ningún global HR (BambooHR/Rippling/Deel/Workday) tiene Holidays Act NZ nativo |
| **Packhouse ERP (integration target)** | **Famous Software + Radfords** (FreshGrow/FreshPack, NZ) | HarvestPro debe posicionarse **sibling picker-side** del Radfords packhouse-side. NO competir — integrar |

**Conclusión**: HarvestPro tiene **5 moats defendibles** (NZ Holidays Act + Crimes Act 2025 audit trail, DLQ-first offline sync, single-PWA multi-role, public pricing contra Hectre opaque, integration-friendly con Famous/Radfords) y **3 pilares con equivalentes maduros** (Xero integration, AgriSmart/Tātou compete direct en NZ, BambooHR patterns a adoptar).

---

## Top 3 jugadas de mayor leverage (cross-research)

### 1. Idempotency key `(client_id, local_counter)` + DB-level UNIQUE constraint

**Origen:** `offline_first_pwa.md` (Replicache `lastMutationID` pattern) + `mobile_scan_fieldops.md` (QuickPick lockout-min-interval + Stripe idempotency) + `payroll_compliance_nz.md` (30k dupes = Crimes Act 2025 criminal exposure).

**Mecanismo concreto:**
- Cada `bucket_record` insert lleva header `Idempotency-Key: {client_uuid}:{local_counter}` generado en el dispositivo antes del scan.
- Edge Function `record-bucket` usa ese key como `UNIQUE (client_uuid, local_counter)` constraint en la tabla.
- Retry de network (Supabase gateway, Capacitor background fetch) con mismo key = `INSERT ... ON CONFLICT DO NOTHING` returns 200 sin duplicar.
- Cliente mantiene contador `localLastMutationID` en Dexie, persistido, incrementado atómicamente con Web Locks API.
- **Lockout min-interval** (QuickPick pattern): UI desactiva el botón scan 800ms tras cada bucket — previene double-tap en mobile UX.

**Fixes automáticos**: los 30,464 duplicados existentes no se vuelven a generar. Migration `20260415000004_bucket_records_unique_scan.sql` (referenciada en offline_sync review) debe estar aplicada en prod — **verificar urgente**.

**Riesgo legal removido**: Crimes (Theft by Employer) Amendment Act 2025 tipifica subpago deliberado como crimen — los dupes facturan al picker 2× pero el rebaja auto del top-up los facturaría a **otro** picker como deficit → exposición directa. Idempotency lo cierra.

**Esfuerzo**: 1 sprint (idem key en cliente + migration UNIQUE + backfill dedup SQL + test retry-scenarios).

### 2. Xero Payroll OAuth2 export + PaySauce CSV fallback — **no replicar payroll engine**

**Origen:** `payroll_compliance_nz.md` (Xero es el 70% NZ SME share) + `piece_rate_ag_labor.md` (PaySauce acquired Tātou, ahora propietario del campo).

**Mecanismo concreto:**
- HarvestPro produce **2 output paths** desde `calculate-payroll` Edge Function:
  - **Path A (primary)**: Xero Payroll API v2 OAuth2 — posts `{ordinary_hours, holiday_hours, piece_rate_topup}` como 3 earnings rates distintas al empleado. Tenant chooses which earning rate maps to which Xero paycode.
  - **Path B (cheap tier)**: PaySauce / MYOB / Ace CSV export con el schema estándar de la industria.
- HarvestPro **NO computa PAYE/KiwiSaver/ACC** — deja eso al receptor. Solo calcula: hours trabajadas, buckets × rate, top-up a min wage, s.50 time-and-a-half, s.60 alt holidays owed.
- **Holidays Act §20 (annual leave)** — HarvestPro **no intenta** el `max(AWE, OWP)` (el $2B health-sector bug). Lo delega a Xero.

**Por qué**: construir un payroll engine compliant Section 20 es el mismo error que hizo quebrar departamentos de IT en Te Whatu Ora ($657m+$175m) y MBIE ($237m). Xero/PaySauce ya lo tienen (con bugs conocidos, pero transferidos). HarvestPro se queda con el **wage-shield indicator** (visualizar top-up deficit antes de que el pay run se ejecute) — ese es el valor, no el cálculo final.

**Esfuerzo**: 2 sprints (Xero OAuth2 integration + paycode mapping UI + CSV exports + end-to-end test con Xero sandbox).

### 3. Public-schema security-definer helpers + expand-contract migrations + pg_policies CI audit

**Origen:** `supabase_rls_edge.md` (las 14 tablas `USING(true)` + ghost user + MFA env mismatch son **system defaults**, no one-offs).

**Mecanismo concreto:**
- Crear schema `private` con funciones `SECURITY DEFINER`: `private.current_orchard_id()`, `private.current_role()`, `private.is_manager_of(orchard_uuid)`. Estas funciones usan `auth.uid()` para lookup en `public.users`, cached via `pg_stat_statements`.
- Todas las 30+ RLS policies llaman a estos helpers en vez de repetir `auth.jwt() ->> 'role'` (que es stale hasta 1h).
- **CI audit**: query `pg_policies` en cada PR: si hay `using(true)` en una tabla nueva sin `-- @allow-public` annotation → CI falla.
- **Expand-contract migrations**: nunca `DROP COLUMN` en un release — marca deprecated, release N+1 elimina en prod después de verificar no-uses.
- **MFA env**: `GOTRUE_MFA_TOTP_ENROLL_ENABLED=true` + `GOTRUE_MFA_TOTP_VERIFY_ENABLED=true` hardcoded en `supabase/config.toml` y en docker-compose — sin depender del CLI defaults (Supabase CLI issue #3737 confirmado).
- **Ghost user `00000000...`** fix: `ALTER TABLE public.users ADD CONSTRAINT fk_auth_users FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE` + nueva migration que elimina el row huérfano dentro de tx savepoint.

**Por qué los 3 juntos**: los 3 son add-ons a infra existente, no refactor. Cada uno cierra un vector P0 ya identificado. Implementables en 1-2 sprints por 1 ingeniero con experiencia Supabase.

**Esfuerzo**: 1 sprint para helpers+CI, medio para expand-contract discipline, medio para ghost user cleanup = **2 sprints**.

---

## Temas cross-research (patrones que se repiten)

### A. Compliance-first como moat (no feature engineering)
- NZ Holidays Act s.50 + s.60 + Minimum Wage top-up per-period: ningún sistema internacional lo hace bien (payroll_compliance_nz + piece_rate_ag_labor)
- Crimes (Theft by Employer) Amendment Act 2025: subpago deliberado = crimen (max 1 año prisión + $30k empresa) (payroll_compliance_nz)
- Employment Leave Bill March 2026 (first reading): Holidays Act 2003 será reemplazado ~2028-29. No sobre-optimizar engines s.20/s.50/s.60 porque cambiarán
- 90-day trial universal desde Feb 2026 (seasonal_hr_compliance)
- RSE cohort management: 30 Pacific workers arriving same week, same orchard — **NINGÚN vendor lo modela como first-class object**

**Lección**: HarvestPro's derecha a existir = compliance correctness, NO feature parity con Hectre/PickTrace.

### B. Offline-first como arquitectura de ingest
- DLQ surface (HarvestPro tiene, PouchDB tiene, resto no) — **HarvestPro ahead del ecosistema aquí**
- Idempotency key cliente-generado (Replicache pattern, Stripe pattern) — **HarvestPro atrás aquí según review offline**
- Field-level dirty tracking (WatermelonDB) vs row-level LWW (HarvestPro) — HarvestPro pierde data en conflictos multi-editor
- JWT silent refresh para 8h offline: HarvestPro lo hace. Supabase default 1h lo rompe

**Lección**: el stack custom se justifica en ~30% (DLQ + 8h JWT). Los otros ~70% son Replicache/WatermelonDB patterns que HarvestPro puede adoptar granularmente.

### C. Integration-first frente a Famous Software + Xero + PaySauce
- Famous Software (NZ packhouse ERP) ya tiene RFID bin validation — HarvestPro es el picker-side sibling (agtech_orchard_software)
- Xero NZ Payroll = 70% SME share. PaySauce acquired Tātou, ahora dueño del field-capture layer (piece_rate_ag_labor)
- Radfords/FreshPack: MPI traceability `bucket → bin → packhouse → export_lot` es el chain of custody estándar (mobile_scan_fieldops + piece_rate_ag_labor)

**Lección**: HarvestPro compete con Tātou y Hectre; integra con Xero + Famous/Radfords. Esta distinción debe ser explícita en product strategy.

### D. Hardware realism (BYOD phone, not rugged Zebra)
- Zebra DataWedge / rugged scanners: $1000-2000/unit, NZ orchards no pagan
- Capacitor 8 + @capacitor-mlkit/barcode-scanning: funciona bien en mid-range Android, con guantes, con sol directo
- Scandit: $10k+/año, descartado por economics SMB

**Lección**: HarvestPro ya eligió bien (Capacitor native camera + ML Kit). No sobre-invertir en custom scanner SDK.

### E. Pricing model = per-clocked-in-employee (seasonal-aligned)
- FieldClock: cobra solo por worker clocked-in ese mes. Off-season = $0 (agtech_orchard_software)
- PayHero: $19 base + $4/active empl. Mejor fit NZ SMB que Employment Hero floor $490/mo
- Hectre: opaque pricing — HarvestPro puede ganar market trust con public tiers

**Lección**: pricing model **per-active-picker-month** es la única estructura que encaja con 5-month NZ harvest season (pickers ramp 30→100→0).

### F. Anti-pattern: Monolithic "do everything" vendor lock-in
- Conservis dead (acquired 2× en 2 años — Rabobank+TELUS, Traction Ag)
- FarmLogs acquired Bushel 2021, focus shifted
- Homarr v1.0 migration pain (dashboards research ultra-system, applicable)
- Ukuku/Odoo WMS = monolito, solo adoptar modelo lot/serial

**Lección**: HarvestPro que haga **una cosa muy bien** (NZ orchard picker ops + compliance) y integre, no que intente ser agtech ERP completo.

---

## Moats reales de HarvestPro (lo que NO existe en ningún comparado)

Importante para no "optimizar hacia la competencia" y perder lo único:

1. **NZ Holidays Act + Crimes Act 2025 audit trail** — ningún sistema global (BambooHR/Rippling/Deel/Workday/Xero) tiene compliance nativa NZ + immutable audit log que satisfaga criminal-law burden of proof. **AgriSmart + Smartly lo intentan pero no tienen el wage-shield indicator pre-pay-run**.

2. **Single-PWA multi-role arquitectura** — Hectre usa 3 apps nativas siloed. PickTrace 3 apps. FieldClock 2 apps. HarvestPro 1 PWA con 8 roles = ops simplifica training + deploy + update.

3. **DLQ-first offline sync** — de los 14 sistemas offline-first analizados, solo PouchDB `_conflicts` array se acerca. HarvestPro tiene DLQ real.

4. **Public pricing + open API** — Hectre opaque, PickTrace opaque, Tātou ahora PaySauce-bundled. HarvestPro puede ganar trust con `pricing.html` + OpenAPI spec.

5. **RSE cohort-as-object** — whitespace total. 30 Pacific workers arriving together, same accommodation, mandatory pastoral care check-ins, 7-month max stay, 10-day sick cap after 4 months (INZ Oct 2023). Ningún vendor lo modela.

**Implicación**: antes de adoptar "best practices" de Hectre/FieldClock/AgriSmart, preguntar si rompe uno de estos 5 moats. La compliance NZ en particular se pierde si se copia el piece-rate engine de FieldClock (US rules no aplican).

---

## Anti-patterns a evitar (sintetizados de los 7 research files)

1. **Season-averaged minimum wage top-up** (agtech + piece_rate) — NZ ley exige **per pay period, max fortnight**. US systems lo promedian temporada.
2. **Silent MFA downgrade** (supabase + round 2 auth_security) — cliente llama `mfa.enroll`, server GOTRUE disabled, user loguea sin MFA silently.
3. **RLS `USING(true)` como default dev** (supabase) — 14 tablas en HarvestPro ahora mismo. CI audit + security-definer helpers es el fix.
4. **Ghost users sin FK a auth.users** (supabase) — `00000000...` vector de escalación si backup restore materializa el id.
5. **Hardcoded compliance rates en source code** (payroll) — NZ min wage cambia abril cada año. KiwiSaver 3%→3.5% abril 2026. ACC Earners' Levy 1.67%→1.75% abril 2026. Debe ser `nz_tax_rates` table con `effective_date`.
6. **Holidays Act §20 (annual leave) custom engine** — el $2B bug en Te Whatu Ora. Si HarvestPro no lo calcula perfectamente, NO lo calcule — delegue a Xero/PaySauce.
7. **Visa expiry como fixed-term end date** (seasonal_hr) — ilegal bajo ERA s.66. Lane Neave case law explicit.
8. **Monolithic rugged-scanner dependency** (mobile_scan) — Zebra lock-in, $2k/unit, no escala a 30 pickers NZ.
9. **Enterprise Scandit pricing for SMB** (mobile_scan) — $10k+/año, descartable.
10. **Native app siloing per role** (agtech) — Hectre/PickTrace/FieldClock hacen 2-3 apps nativas. HarvestPro 1 PWA es estrictamente mejor para NZ ops.
11. **html5-qrcode / ZXing-js** en producción (mobile_scan) — `[deprecated]`, no mantenidos. Usar Capacitor MLKit.
12. **Row-level LWW without field-level merge** (offline_first) — picker A edit + supervisor edit = data loss. PowerSync / Automerge CRDT es overkill, pero field-level dirty tracking (WatermelonDB) es el sweet spot.
13. **Opaque pricing** (agtech) — Hectre/PickTrace no publican precios. HarvestPro puede ganar market trust con public tiers.
14. **Input-reseller distribution** (agtech) — AgVerdict tied to Wilbur-Ellis; Conservis died after multiple acquisitions. HarvestPro debe ser direct-sell + channel partners, no lock-in con distributor.
15. **Raw `as any` casts en TypeScript strict** (stack) — CLAUDE.md prohíbe `any`. Grep en round 2 para ver cuánto sneaked.

---

## Roadmap sugerido (synthesizing research + review findings)

**Sprint 1 — kill the criminal-exposure triangle (P0, legal no-negotiable)**
1. Idempotency key `(client_id, local_counter)` en cliente + UNIQUE constraint DB + backfill dedup SQL (resuelve 30k dupes → Crimes Act 2025 exposure)
2. RLS audit: cerrar las 14 tablas `USING(true)` con per-orchard × per-role policies usando `private.current_orchard_id()` security-definer helpers
3. MFA env hardcode + ghost user FK cleanup
4. Migration CI check: fail PR si init schema no reproduce prod

**Sprint 2 — Holidays Act + Min Wage correctness**
5. Verificar `calculate-payroll` Edge Function: top-up per pay period fortnight-max, NO season-averaged (review round 2 flagged)
6. Break pay formula: `(piece_earnings ÷ hours) × break_hours` (Crystal Payroll pattern)
7. `check-compliance` Edge Function reads correct `harvest_settings` table, not `orchards` (review round 2 P0)
8. nz_tax_rates table con effective_date (NO hardcoded) + seed data for April 2026 updates (KiwiSaver 3.5%, ACC 1.75%)

**Sprint 3 — offline correctness + DLQ UX**
9. Field-level dirty tracking (WatermelonDB pattern) para evitar conflict data loss
10. DLQ UI badge (bottom nav showing unresolved items)
11. Apply missing migration `20260415000004_bucket_records_unique_scan.sql` si no está en prod (review round 2)
12. `provision-orchard` rollback atomicity fix (review round 2 P0)

**Sprint 4 — Xero integration (primary payroll path)**
13. Xero Payroll API v2 OAuth2 connect flow
14. Paycode mapping UI (Ordinary / Holiday / Top-up)
15. Dry-run payroll preview antes de submit
16. PaySauce CSV fallback para tenants sin Xero

**Sprint 5 — RSE cohort + seasonal HR (moat development)**
17. `rse_cohorts` table con arrival_date / pastoral_care_checks / welfare_contacts
18. vSure REST API integration para live visa expiry check
19. `check-compliance` Edge Function: daily cron alerting expiring visas, upcoming HSWA induction renewals
20. Deductions audit (accommodation/transport cannot push below MW)

**Sprint 6 — integration targets (Famous Software + Hectre gap-closing)**
21. MPI traceability export: `bucket_record → bin_record → packhouse_event → export_lot`
22. Radfords/FreshPack handoff spec (coordinate con NZ ag industry)
23. Hectre-style bin-photo size/color (optional AI; Spectre competitive pressure, not must-have)
24. Public pricing page + OpenAPI spec (market trust play)

**Sprint 7 — dashboards + observability**
25. Wage-shield indicator pre-pay-run (visualiza top-up deficit antes de ejecutar)
26. Manager dashboard: pickers offline count, DLQ per picker, compliance alert feed
27. Sentry PII scrub audit (email/IRD/bank stripped)
28. PostHog feature flag hygiene

---

## Qué sigue (Round 2: review por pilares — en curso)

El review del código HarvestPro se hace en round 2 (7 agentes paralelos sobre /root/repos/harvestpro-nz):
- Offline/sync layer (Dexie + sync queue + DLQ + dbCrypto)
- Supabase RLS + Edge Functions + migrations (extender AUDIT_2026_04_19_DEEP_REVIEW)
- Auth + security (JWT + MFA + privacy + role escalation)
- **Payroll + compliance engine (the critical pillar — Crimes Act 2025 exposure)**
- Frontend + 10 pages + 8 roles + 25 modals + dual layout
- Repositories (25+) + Zustand stores (7) + hooks (40+)
- Tests + observability + i18n 5 langs

Output: `/root/lab_journal/research/harvest_nz/review/*.md` + `review/_sintesis.md`.

Pattern: extender AUDIT_2026_04_19 (3 CRITICAL + 11 HIGH + 9 MEDIUM + 8 LOW), no duplicar. Tagged `[new]` vs `[confirmed from AUDIT]`. File:line evidence required.
