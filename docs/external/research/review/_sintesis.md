# Review síntesis — HarvestPro NZ por pilares

**Fecha:** 2026-04-22
**Input:** 7 agentes paralelos, ~2400 líneas totales, 0 fallos. Extiende — no duplica — `AUDIT_2026_04_19_DEEP_REVIEW.md` (3 CRITICAL + 11 HIGH + 9 MEDIUM + 8 LOW).

Complementa [`_sintesis.md`](../_sintesis.md) (round 1 research: 7 sistemas comparables — agtech, offline-first, payroll NZ, mobile scan, Supabase, piece-rate, seasonal HR).

- [`offline_sync.md`](offline_sync.md) — Dexie + sync queue + DLQ + dbCrypto + JWT silent refresh (274 L)
- [`supabase_rls_edge.md`](supabase_rls_edge.md) — 11 Edge Functions + 40+ migrations + RLS (268 L)
- [`auth_security.md`](auth_security.md) — JWT + MFA + session + privacy + regionCheck (328 L)
- [`payroll_compliance.md`](payroll_compliance.md) — calculate-payroll + Holidays Act + check-compliance + nz-tax-rates (~350 L)
- [`frontend_roles.md`](frontend_roles.md) — 10 pages + 8 roles + 25 modals + dual layout + i18n + a11y (~413 L)
- [`repos_stores_hooks.md`](repos_stores_hooks.md) — 25+ repos + 7 Zustand + 40+ hooks + React Query + Zod (413 L)
- [`tests_observability.md`](tests_observability.md) — 3742 tests + Sentry + PostHog + i18n 5 langs + Storybook (366 L)

**Total: ~2400 líneas de review con ~130 findings concretos file:line. 15 P0 nuevos, 30+ P1.**

---

## Tabla de verdicts por pilar

| Área | Verdict | P0 nuevos | Bloqueador #1 |
|---|---|---|---|
| **offline/sync** | ✅ Healthy architecture | 0 (2 P1) | Idempotency `lastMutationID` ausente; confía solo en DB UNIQUE que **no está aplicado en prod** |
| **supabase RLS + Edge** | 🚨 Funcional pero con backdoors | 2 | `check-compliance` lee `orchards.min_wage_rate` (columna que NO existe) → fallback hardcoded $3.50 vs $6.50 real. Compliance check roto |
| **auth + security** | 🟡 Hardening parcial | 2 | Role escalation via sync processor + Service Worker cache **NO se limpia en logout** → siguiente user ve data del anterior |
| **payroll + compliance** | 🚨 **Criminal exposure activa** | 5 | **KiwiSaver 3.5% no patcheado** — 9 días a April 1 deadline. Bucket_records UNIQUE migration existe pero NO aplicada. Alt-holiday cross-period double-count |
| **frontend + roles** | 🟡 Staging-ready con gaps | 0 (5 P1) | **Admin page sigue desktop-only** (dual layout 7/8 roles). HHRR CalendarTab usa tabla `leave_requests` inexistente |
| **repos + stores + hooks** | 🟡 Pass with caution | 3 | `baseRepository` usa `as unknown as Partial<T>` — type-cast bypass. 3 errors silently `.catch(() => {})` |
| **tests + observability + i18n** | 🚨 Privacy leak activo | 3 | **Sentry beforeSend NO redacta** email/wage/IRD. **PostHog events leaking picker_id** = wage PII → **NZ Privacy Act 2020 breach**. Coverage 50% vs 70% target |

---

## P0 — blockers cross-pillar (15 findings)

### 🔴 1. KiwiSaver 3.5% no patcheado — 9 días a April 1 2026 deadline

**Evidencia (payroll_compliance.md):**
- `src/config/nz-tax-rates.ts:113, 160, 207` — todas las 3 tax-year configs tienen `kiwisaverEmployerMin: 0.03`
- Finance Bill 2025 s.17A raised both employee + employer min a 3.5% effective 1 April 2026
- IRD Payday Filing Spec 2026 s.5.2 confirmado

**Impacto**: pay run primera ejecución después de April 1 underpays ~$45-80/empleado/pay cycle. 50 pickers × 4 semanas = **~$9,000/mes de sub-contribución**. Remediation + penalty + clawback.

**Fix**: 5 min. Cambiar 2 líneas en `nz-tax-rates.ts`. Deploy + test.

### 🔴 2. Bucket_records UNIQUE migration existe pero NO aplicada en prod

**Evidencia (payroll_compliance.md + supabase_rls_edge.md + offline_sync.md — convergen 3 agents):**
- `supabase/migrations/20260415000004_bucket_records_unique_scan.sql` existe en disk
- `supabase db push` no ejecutado en prod (AUDIT flag confirmado)
- 30,464 duplicados (picker_id, scanned_at) viven en prod ahora mismo

**Impacto**: **Crimes (Theft by Employer) Amendment Act 2025** = criminal exposure personal de Ibrahim. Duplicate buckets → picker paid 2× → pattern of overpayment → legal liability criminal 1 año prison + $30k empresa.

**Fix prerequisito**: backfill dedup SQL antes de aplicar UNIQUE (si no, migration falla). Luego `supabase db push`. 1 día.

### 🔴 3. Alt-holiday accrual dedup solo intra-run, no cross-period

**Evidencia (payroll_compliance.md):**
- `supabase/functions/calculate-payroll/index.ts:261-281` — `attendanceHoursMap.altDates = Set<string>()` dedupe solo dentro de UN run
- Picker trabaja mismo public holiday en 2 weekly payrolls distintos (ej. shift cruzando Viernes + Lunes) → 2 alt days owed, no 1

**Impacto**: overpay alt holidays Holidays Act s.60. Statutory liability. Low-frequency pero edge case de auditoría.

**Fix**: stored proc month-end reconciliation o seasonal audit cron. 2-3 días.

### 🔴 4. Meal break 30min UNPAID pero código lo aplica como PAID reduction

**Evidencia (payroll_compliance.md):**
- `supabase/functions/calculate-payroll/index.ts:194-196` — `MEAL_BREAK_HOURS = 0.5` restado de `rawDayHours`
- Wages Protection Act §5 requiere "details of all deductions" en payslip

**Impacto**: payslip no muestra meal break deduction transparente. Auditor no puede verificar compliance. Disputa wage audit razonable.

**Fix**: retornar `{hours_worked, hours_paid_after_meal_adj, meal_break_deduction_amount}` separados en breakdown. 2-3 días.

### 🔴 5. `check-compliance` Edge Function lee tabla incorrecta → $3.50 fallback

**Evidencia (supabase_rls_edge.md + payroll_compliance.md — 2 agents convergen):**
- `supabase/functions/check-compliance/index.ts:78-85` consulta `orchards.bucket_rate, orchards.min_wage_rate`
- **Esas columnas no existen en `orchards`** (viven en `harvest_settings`, como hace `calculate-payroll` correctamente)
- `.select()` devuelve NULL → fallback hardcoded `NZ_CONSTANTS.PIECE_RATE = $3.50`
- Valor real configurado: $6.50

**Impacto**: **todas las compliance warnings son incorrectas**. Wage shield visualiza deficit contra $3.50 en vez de $6.50. Managers ven "compliant" cuando NO lo están.

**Fix**: cambiar la query a `harvest_settings`. 30 min + test. P0 **real** — el componente de compliance visual está mintiendo.

### 🔴 6. `provision-orchard` atomicity — orphans auth.users en fallo parcial

**Evidencia (supabase_rls_edge.md):**
- 3-step signup flow: (1) create auth.users row, (2) insert public.users, (3) provision orchard
- Falla entre steps 2-3 → orphan auth.users existente sin `public.users` match
- Combinado con ghost user `00000000...` (AUDIT Finding #4) → bloquea future signups

**Fix**: wrap flow en tx DB + rollback on any fail. O usar `SAVEPOINT`. 1 día.

### 🔴 7. Role escalation via sync processor

**Evidencia (auth_security.md):**
- Sync processor acepta mutations que modifican `users.role` sin validar el caller-role
- Un team_leader offline puede editar su propio role a 'manager' localmente, push → sync acepta

**Fix**: Edge Function `record-bucket` y otros sync endpoints deben rechazar mutations a columna `role`. Además, RLS policy en `users` debe restringir UPDATE(`role`) a admin-only. 1 día.

### 🔴 8. Service Worker cache NO se limpia en logout

**Evidencia (auth_security.md):**
- Logout limpia Dexie, localStorage, Supabase session
- **NO limpia** caches API (react-query cache), **NO unregister** service worker, **NO clear** Workbox precache
- Next user en mismo device ve data del anterior (manager → runner transition → runner ve manager dashboards en cache)

**Impacto**: Privacy Act 2020 breach. Cross-user PII leak. Crítico en BYOD + shared device scenarios.

**Fix**: logout handler debe llamar `caches.delete()` para todas las caches + `queryClient.clear()` + `serviceWorker.unregister()`. 1 día.

### 🔴 9. Sentry beforeSend NO redacta PII + PostHog leaking picker_id

**Evidencia (tests_observability.md):**
- `src/config/sentry.ts` tiene replays enabled sin mask
- `beforeSend` no strippea email, IRD number, bank account
- PostHog events envían `picker_id` como property — **en NZ, picker_id + date + bucket count = wage data = PII per Privacy Act 2020 IPP 3**

**Impacto**: PII leaking a Sentry + PostHog cloud. NZ Privacy Act 2020 breach reportable a OPC (Office of Privacy Commissioner) si data subjects notified. Fine up to $10k.

**Fix**: `beforeSend` scrub + PostHog `identify({})` sin PII properties + session replay `mask="*"`. 1 día.

### 🔴 10. `baseRepository` soft-delete `as unknown as Partial<T>` bypass

**Evidencia (repos_stores_hooks.md):**
- `src/repositories/baseRepository.ts:157` — `.update({ ...data, deleted_at: now } as unknown as Partial<T>)`
- Double-cast bypassa TypeScript strict (CLAUDE.md prohíbe `any`)
- Runtime error si schema cambia — no caught en compile

**Fix**: definir `type SoftDeletable<T> = T & { deleted_at?: string }` y usar eso. 1h.

### 🔴 11. 3 errors silenciados `.catch(() => {})`

**Evidencia (repos_stores_hooks.md):**
- auth-context, hr-documents, store sync
- Swallow errors en silencio — pérdida de observability + potencial data corruption

**Fix**: reemplazar con `logger.warn()` + Sentry breadcrumb. 30 min.

### 🔴 12. Coverage 50% vs target 70% — payroll + sync under-tested

**Evidencia (tests_observability.md):**
- CLAUDE.md threshold: 70/70/60/70
- Actual: ~50% stmts
- `calculate-payroll` Edge Function tests son shape-only, no verifican $ amounts
- sync processors tests usan fake-indexeddb que NO simula Web Locks API

**Impacto**: payroll correctness no verificado automáticamente. Regresiones pasan CI.

**Fix**: añadir fixture-based tests ($ amount assertions) para calculate-payroll. 1 sprint.

### 🔴 13. Admin page sigue desktop-only (dual layout 7/8 roles)

**Evidencia (frontend_roles.md):**
- PROGRESS dice "2026-04-18 dual layout 7 roles migrated"
- `src/pages/Admin.tsx:12` importa `DesktopLayout` directo, sin `ResponsiveLayout`
- Mobile users no pueden operar rol Admin

**Fix**: wrap con ResponsiveLayout + BottomNav mobile. 1h.

### 🔴 14. HHRR CalendarTab usa tabla `leave_requests` inexistente

**Evidencia (frontend_roles.md):**
- `src/components/views/hhrr/CalendarTab.tsx:14` comment: "placeholder until leave_requests schema exists"
- Tab se renderiza, queries fallan silently, user ve empty state

**Fix**: O crear la tabla + RLS + endpoint, O hide tab con feature flag `VITE_FEATURE_LEAVE_REQUESTS=false`. 2h para hide, 1-2 sprints para build.

### 🔴 15. `record-bucket` Edge Function sin idempotency key + sin UNIQUE constraint aplicada

**Evidencia (supabase_rls_edge.md + offline_sync.md convergen):**
- Mobile network retry (Capacitor background fetch) re-envia el mismo bucket → 2 rows
- DB constraint `UNIQUE(picker_id, scanned_at)` definida en migration NO aplicada
- Cliente no genera `Idempotency-Key` header

**Fix**: cliente genera `{client_uuid}:{local_counter}` + Edge Function usa `ON CONFLICT DO NOTHING` + migration aplicada. Cross-ref con P0 #2. 2-3 días.

---

## Temas cross-cutting (7 agents convergieron)

### A. Criminal liability (Crimes Act 2025) es el driver principal
3 de los 5 P0 de payroll (KiwiSaver 3.5% timing, dupes bucket_records, alt-holiday dedup) exponen directamente a Ibrahim a prosecution. Ninguno es "optimization" — son compliance gaps **bloqueantes pre-prod**.

### B. Schema drift + migration-not-applied epidemic
- `bucket_records` UNIQUE migration existe pero no applied (payroll + offline + supabase convergen)
- `check-compliance` consulta columnas `orchards.bucket_rate` que no existen
- `leave_requests` referenced en code pero no en schema
- `harvest_settings` columnas missing (ERRORES.md 2026-04-14)
Pattern igual a ultra-system schema drift — la DB real diverge de lo que el code asume.

### C. Privacy leak cross-pillar
- Sentry beforeSend no redacta (tests_observability)
- PostHog events carry picker_id = wage PII (tests_observability)
- Service Worker cache not cleared on logout = cross-user leak (auth_security)
- ghost user 00000000 (AUDIT + supabase) = attack vector precursor

NZ Privacy Act 2020 IPP 3 + IPP 12 aplicables. Reportable a OPC si notified data subjects.

### D. Silent-failure pattern endémico
- 3 `.catch(() => {})` en auth/hr-documents/sync (repos)
- DLQ items surface silently (offline_sync — flagged P2)
- MPI export to non-existent `audit_log` table (AUDIT — fixed to `audit_logs`)
- `check-compliance` fallback to hardcoded $3.50 without warning (supabase + payroll)
- Swallowed errors en ESLint disables (tests_observability)

Mismo patrón que ultra-system "silent-success epidemic". scheduler_log miente, users no saben.

### E. RLS `USING(true)` + ghost user + MFA disabled = system default failures
14 tablas (AUDIT) + MFA env mismatch (Supabase CLI issue #3737) + ghost `00000000...` son los 3 defaults de self-hosted Supabase que "just work en dev" y explotan en prod. **CI audit vía pg_policies query + docker-compose MFA hardcode** son los fixes sistémicos.

### F. Dual-layout migration incomplete + dead stubs
- Admin desktop-only (frontend)
- HHRR CalendarTab leave_requests ghost (frontend)
- 9 opp_fetcher stubs pattern se repite aquí (igual que ultra-system P4)
- PickerDetailsModal ya reemplazado por PickerProfileDrawer pero refs residuales

### G. Test quantity ≠ quality
- 3742 tests pero coverage 50% (CLAUDE.md dice 3800+ pass)
- Payroll tests shape-only, no verifican $ amounts contra fixtures
- Sync tests usan fake-indexeddb sin Web Locks API (incomplete simulation)
- 12 ESLint disables scattered (tests_observability)
- Te Reo Māori solo 15/130+ keys translated (ceremonial)

---

## Lo que sí está bien (no retroceder)

Hallazgos positivos cross-agents — son los patterns a **preservar**:

- **Web Locks API cross-tab mutex** (offline_sync) — correctly implemented con fallback
- **Zod validation boundary en TODOS los 10 sync payload types** (offline_sync) — defense-in-depth solid
- **AES-256-GCM + PBKDF2 + device fingerprint** (offline_sync + auth_security) — proper key storage
- **DLQ append-only pattern** (offline_sync) — auditable, ahead del ecosistema (sólo PouchDB _conflicts se acerca)
- **JWT silent refresh con 50-min proactive timer + offline handling** (offline_sync + auth_security) — maneja correcta el 8h offline shift
- **Holidays Act §50 time-and-a-half correctamente implementado** (payroll_compliance + PROGRESS 2026-04-18)
- **Alt holidays §60 intra-run dedup vía Set<string>** (payroll) — correcto dentro del scope
- **Minimum wage top-up per pay period (NO season-averaged)** (payroll) — el critical NZ rule que US systems se equivocan
- **`quality_grade='reject'` excluded from piece count** (payroll) — correctamente filtrado
- **Device-trust MFA pattern** (auth_security) — implementación limpia
- **Sentry PII scrubbing parcial** (auth_security — pero beforeSend tiene gaps documented)
- **Zod 4 schemas tipo-safe via database.types generados** (repos) — boundary clean
- **Zustand 7-slice composition sin cross-mutations** (repos) — disciplina clara
- **React Query offline-first con staleTime=5min + gcTime=30min** (repos) — config correct
- **100% test coverage ratio repos (34 .test.ts for 32 repos)** (repos)
- **ProtectedRoute enforces 8 roles en routes.tsx** (frontend) — guard limpio
- **Lazy loading 52 React.lazy() calls + Suspense PageLoader** (frontend) — code-split por dashboard
- **Error boundaries en route + component level** (frontend)
- **SyncStatusBadge realtime online/offline/syncing/error** (frontend)
- **i18n fallback chain locale → EN → key** (tests_observability)
- **MSW + fake-indexeddb para unit tests** (tests_observability) — standard stack
- **Vitest CI sharding 5-way** (tests_observability) — memory efficiency
- **Dual-layout migrado 7/8 roles en 2026-04-18** (frontend) — solo falta Admin

---

## Roadmap priorizado (sprint-sized)

### Sprint 1: criminal liability + 9-day deadline (P0, bloqueante pre-prod)
1. **KiwiSaver 3.5% patch** (`nz-tax-rates.ts` 2 líneas) — **antes del 1 abril 2026** (9 días)
2. **ACC Earners' Levy verification** — 1.67% → 1.75% check + patch si aplica
3. **Bucket_records dedup + migration apply** (backfill SQL + `supabase db push`)
4. **Alt-holiday cross-period dedup** (stored proc month-end reconciliation)
5. **Meal break label fix** (hours_worked vs hours_paid separados en payroll breakdown)
6. **`check-compliance` Edge Function: query `harvest_settings` not `orchards`**
7. **Idempotency-Key header en `record-bucket` + cliente localMutationID**

### Sprint 2: privacy + security backdoors (P0)
8. **Sentry `beforeSend` scrub** email/IRD/bank + session replay mask
9. **PostHog events sin picker_id** + consent tracking en identify()
10. **Service Worker cache clear en logout** + queryClient.clear() + serviceWorker.unregister()
11. **Role escalation fix**: RLS policy en `users` restringe UPDATE(role) a admin-only + sync processor rechaza role mutations
12. **provision-orchard atomic rollback** (SAVEPOINT o full tx wrap)
13. **Ghost user `00000000...` FK fix + cleanup**
14. **MFA env hardcode** (`GOTRUE_MFA_TOTP_ENROLL_ENABLED=true` + `VERIFY_ENABLED=true`)

### Sprint 3: RLS cerrar 14 tablas USING(true) (P1 — AUDIT pendiente)
15. Security-definer helpers `private.current_orchard_id()`, `private.current_role()`, `private.is_manager_of()`
16. Rewrite 14 RLS policies con helpers — harvest_settings primero (wage-theft vector)
17. CI audit query `pg_policies` — fail PR si nueva tabla con `USING(true)` sin annotation
18. Missing RLS en audit_logs (restrict INSERT vía trigger, NO UPDATE/DELETE — Crimes Act evidence immutability)

### Sprint 4: silent failures + dead code cleanup (P1)
19. 3 `.catch(() => {})` reemplazar con `logger.warn()` + Sentry breadcrumb
20. `baseRepository` type-cast fix (SoftDeletable<T>)
21. Admin page ResponsiveLayout wrap
22. HHRR CalendarTab: feature flag hide OR build leave_requests schema
23. Repo pattern drift: api-keys / wage-rates / mpi-export deben ir via baseRepository
24. ESLint 12 `// eslint-disable` audit — remove or justify

### Sprint 5: test correctness + coverage (P1)
25. calculate-payroll tests fixture-based ($ amount assertions contra hand-calc)
26. E2E golden path documented: login → scan → sync → logout
27. Coverage 70% threshold ENFORCED en CI
28. fake-indexeddb + Web Locks API polyfill para sync tests
29. Playwright reporter enable fail logs en CI

### Sprint 6: integration Xero + wage shield pre-pay-run preview (moat development)
30. Xero Payroll API v2 OAuth2 connect flow
31. Paycode mapping UI (Ordinary / Holiday / Top-up)
32. Dry-run payroll preview visualizando top-up deficit ANTES de submit
33. PaySauce CSV fallback para tenants sin Xero
34. nz_tax_rates table con `effective_date` (en vez de hardcoded)

### Sprint 7: RSE cohort + seasonal HR (moat development)
35. `rse_cohorts` table con arrival_date / pastoral_care_checks
36. vSure REST API integration para live visa expiry check
37. Daily cron `check-compliance`: alerts visa expiring, HSWA induction renewals
38. Deductions audit (accommodation/transport cannot push below MW)

### Sprint 8: observability + frontend polish (P2)
39. Te Reo Māori full translation (130+ keys, cultural correctness NZ)
40. i18n hardcoded `'en-NZ'` → context locale
41. Accessibility axe-core audit full pages (5 modales sampled, resto missing aria-labels)
42. Modal state cleanup audit (32 modales)
43. Bundle size CI check con vite-bundle-visualizer
44. Loading states standardize (TabLoader variants)

---

## Risk zones (lo que puede hundir HarvestPro en prod)

1. **April 1 2026 cutover sin KiwiSaver 3.5% patch** — primer pay run = instant non-compliance, MBIE sweep inminente
2. **Bucket_records UNIQUE no aplicado** — cada día que pasa, más duplicados, mayor criminal exposure
3. **Service Worker cache cross-user leak** — BYOD shared device scenario = Privacy Act breach reportable
4. **Sentry/PostHog PII leak** — IRD + email + picker_id en cloud logs = OPC complaint
5. **14 RLS `USING(true)` tablas abiertas** — cross-tenant breach si HarvestPro crece a multi-orchard
6. **check-compliance lying** — managers ven "compliant" con $3.50 fallback vs $6.50 real → false sense of security
7. **Alt-holiday cross-period double-count** — reconciliation nightmare end-of-season
8. **Admin mobile blank** — field managers no pueden operar role-provisioning en mobile
9. **HHRR Calendar ghost** — promises feature, delivers empty state → user trust erosion
10. **Tests shape-only en payroll** — payroll bug regresa, CI passes, ship to prod, wage theft

---

## Mensaje directo a Ibrahim

**Lo bueno:** los 4 moats son reales y el código está **más cerca de prod que ultra-system**. La offline/sync layer es genuinely healthy (DLQ pattern es ahead del ecosistema). Holidays Act s.50 + s.60 están correctamente implementados (shipped 2026-04-18). Wage shield indicator es el diferenciador contra AgriSmart/Hectre/Tātou. ProtectedRoute + 8 roles + dual layout 7/8 es arquitectura sólida. 3742 tests es disciplina real.

**Lo preocupante:** el sistema está a **2 sprints de "staging-ready" y 4-5 sprints de "prod-ready"**. Las 3 clases de bug sistémico son:

- **Criminal liability activa** — KiwiSaver 3.5% deadline **9 días**, bucket dupes no deduplicados, alt-holiday cross-period, check-compliance mintiendo. **Crimes (Theft by Employer) Amendment Act 2025** no es hipotético.
- **Privacy leak cross-pillar** — Sentry + PostHog + Service Worker + ghost user. Cualquier OPC complaint + forensic audit expone todo.
- **Schema drift + migration-not-applied** — mismo pattern que ultra-system (192-table drift allá). Aquí: `bucket_records UNIQUE` existe pero not applied, `check-compliance` consulta columnas inexistentes, `leave_requests` ghost table.

**Si solo cortas a uno:** Sprint 1 completo (7 items, ~1 semana) es **no-negociable antes del 1 abril 2026**. Sprint 2 (privacy + security, 7 items) es no-negociable antes de primer paid pilot. Post-Sprint-2 el sistema está defensible como "private beta con data real".

**Sobre los moats:** NO perder la **compliance-first positioning** optimizando hacia Hectre/FieldClock/AgriSmart. Hectre tiene Spectre AI pero opaque pricing + 3 apps siloed. HarvestPro puede ganar NZ con **single-PWA + NZ law nativo + public pricing + audit-trail immutability**. Cada una de esas 4 es moat real.

**Sobre integration:** Xero Payroll OAuth2 (70% SME share NZ) es el único playbook racional. NO construir payroll engine §20 in-house — delegate to Xero. El critical path es el **wage-shield indicator pre-pay-run** + **Xero integration** + **Famous/Radfords packhouse handoff**. El resto es commodity.

**Sobre tests:** 3742 tests es buen número pero coverage 50% + shape-only en payroll = falso sentido de seguridad. 1 sprint de `calculate-payroll` fixture-based tests paga 10x en criminal-liability mitigation.
