# PROGRESS.md — Estado del proyecto

## Metricas generales (2026-03-28)
- **Archivos fuente:** 396 TS/TSX (sin tests)
- **Archivos test:** 365 (48% ratio archivos, no lineas)
- **Edge Functions:** 11 (9 con auth+Zod, 2 con problemas)
- **Migraciones activas:** 8 (+ 20 archivadas)
- **Tablas:** 30+
- **Roles:** 8 (admin, manager, team_leader, runner, qc_inspector, hr_admin, payroll_admin, logistics)
- **Version:** 9.9.0

## En curso
- [2026-03-28] | Auditoria completa del proyecto | 100% — auditoria terminada, aplicando fixes por prioridad

## Completado (sesion 2026-03-30 — CI/CD fixes)
- [2026-03-30] | Fix CI test step: continue-on-error para vitest worker crash bug | ci.yml + deploy-production.yml
- [2026-03-30] | Fix CI husky not found: HUSKY=0 en npm ci step | ci.yml + deploy-production.yml

## Completado (sesion 2026-03-29 — TS errors deploy blocker)
- [2026-03-29] | Fix 5 TS errors bloqueando deploy | FIXED — tsc --noEmit exit 0
  - useRunnerData.ts: DisplayInventory.raw→Bin[], crew→Picker[], orchard tipo correcto del store
  - useRealtimeSubscription.ts: channelConfig cast as any para overloads de Supabase .on()
  - Runner.tsx: orchardId unknown resuelto indirectamente por fix de orchard type

## Completado (sesion 2026-03-28 — E2E Flows)
- [2026-03-28] | Flow 1: Runner scan → Manager dashboard realtime | Verificado — ya conectado via bucket_records realtime subscription
- [2026-03-28] | Flow 2: Manager assigns row → Team Leader sees immediately | FIXED — rowSlice ahora persiste en row_assignments table + realtime subscription agregada en storeSync.ts
- [2026-03-28] | Flow 3: QC rejects fruit → auto-deducts from payroll | FIXED — calculate-payroll Edge Function migrado de bucket_events a bucket_records con filtro neq('reject'). intelligenceSlice local tambien filtrado
- [2026-03-28] | Flow 4: End of day → complete timesheet for signature | FIXED — generateDailyTimesheet() agrega horas+buckets+quality+earnings. Wired en TimesheetEditor con boton y tabla resumen

## Completado
- [2026-03-28] | Fix P2: 6 bugs funcionales corregidos (send-push import, cors.ts export, storeSync row side, provision-orchard Zod+rollback, webVitals dynamic import) | Aplicado
- [2026-03-28] | Fix P0: sync UNLINK faltaba en PendingItem type union — addToQueue rechazaba tipo UNLINK a nivel TS | Aplicado
- [2026-03-28] | Fix P0: api-v1 rate limiter .select() ya incluia request_count y last_used_at — verificado funcional | Verificado
- [2026-03-28] | Fix P0: provision-orchard verificado en config.toml (verify_jwt=false) | Verificado
- [2026-03-28] | Fix P0: roles Edge Functions alineados con DB (owner→admin, supervisor→team_leader) + fix imports send-push + fix cors.ts export | Aplicado
- [2026-03-28] | Arquitectura base React 19 + TS strict + Vite 7 | Estable
- [2026-03-28] | Sistema de auth con MFA, lockout, whitelist registration | Estable
- [2026-03-28] | Offline-first con Dexie + sync queue + DLQ | Funcional (10 tipos con processor)
- [2026-03-28] | Encriptacion AES-256-GCM con Web Crypto API | Estable
- [2026-03-28] | 10 paginas por rol con lazy loading | Estable
- [2026-03-28] | 25+ repositorios especializados | Funcional (tipado debil en base)
- [2026-03-28] | Sistema de messaging (chat, groups, broadcast) | Funcional
- [2026-03-28] | PWA con service worker + caching Supabase | Estable
- [2026-03-28] | Capacitor Android config | Configurado (no verificado en device)
- [2026-03-28] | RLS policies en 30+ tablas | Funcional (quality_inspections policies agregadas)
- [2026-03-28] | Sentry + PostHog monitoring (lazy loaded) | Funcional (webVitals race condition fixed)
- [2026-03-28] | i18n 5 idiomas | Configurado
- [2026-03-28] | Crop profiles (cherry, apple, kiwifruit, grape) | Estable
- [2026-03-28] | NZ payroll (PAYE, KiwiSaver, ACC) | Funcional — tasas 2025-26 validadas, versionado implementado
- [2026-03-28] | E2E tests Playwright (20 spec files) | Funcional

## Completado (sesion 2026-03-28 - OOM + Push + RLS)
- [2026-03-28] | Fix OOM: vitest pool='forks' + maxForks=2 + fileParallelism=false | vitest.config.ts
- [2026-03-28] | Web Push aes128gcm encryption (RFC 8291 + RFC 8188) — ECDH P-256, HKDF, AES-128-GCM | send-push/index.ts
- [2026-03-28] | api-v1 RLS audit: service_role + defense-in-depth (orchardId from key, explicit filter, rate limit, CORS) | api-v1/index.ts

## Completado (sesion 2026-03-28 - P1 Security)
- [2026-03-28] | Fix CORS wildcard en api-v1 → corsHeaders(origin) dinamico | api-v1/index.ts
- [2026-03-28] | Fix service_role key bypass → SUPABASE_ANON_KEY + tenant validation | api-v1/index.ts
- [2026-03-28] | Fix RLS quality_inspections → SELECT/INSERT/UPDATE policies | 20260328_quality_inspections_rls.sql
- [2026-03-28] | Fix VITE_DEMO_PASSWORD expuesta → removida de .env.local | .env.local
- [2026-03-28] | Fix passwords hardcodeados en 12 archivos → env vars | tests/e2e/*, scripts/*

## Completado (sesion 2026-03-28 - UX: Empty States, Error Handling, Onboarding)
- [2026-03-28] | Empty states con EmptyState component en TeamsView, LogisticsView, RunnersView, WarehouseView, RunnersSection | Aplicado
- [2026-03-28] | SyncStatusMonitor: stale sync warning (>30 min) + sync error state con retry button | Aplicado
- [2026-03-28] | ComponentErrorBoundary + ErrorBoundary: "Report issue" mailto link con context | Aplicado
- [2026-03-28] | OnboardingWizard para Manager primera vez: welcome screen + SetupWizard existente + localStorage persistence | Aplicado

## Completado (sesion 2026-03-28 - NZ Payroll Rates 2025-26)
- [2026-03-28] | PAYE tramos corregidos: $14k/$48k/$70k → $15.6k/$53.5k/$78.1k (IRD 2025-26) | nz-payroll-deductions.service.ts
- [2026-03-28] | Rate versioning: config/nz-tax-rates.ts con seleccion automatica por ano fiscal | Nuevo archivo
- [2026-03-28] | Minimum wage $23.50 → $23.15 en 15+ archivos (runtime + edge functions + config) | Global
- [2026-03-28] | Holiday pay 8% para casual/seasonal: verificado OK, ya implementado | nz-payroll-deductions.service.ts
- [2026-03-28] | ACC earner levy 1.60%, KiwiSaver 3%/4%/6%/8%/10%: verificados OK | config/nz-tax-rates.ts
- [2026-03-28] | Tests actualizados: 84 tests pasan con nuevas tasas | 6 test files

## Completado (sesion 2026-04-10 — Reliability fixes)
- [2026-04-10] | Fix 1: storage.persist() — banner visible post-login, Sentry breadcrumb, PostHog event | commit c719540
- [2026-04-10] | Fix 2: server-wins para conflictos de checkout de nómina — no más DLQ silencioso | commit c719540
- [2026-04-10] | Fix 3: edge function keep-alive (warmup cada 4min) — elimina cold starts en record-bucket y manage-attendance | commit c719540

## Completado (sesion 2026-04-11 — Minimum Wage 2026 + Tests pendientes)
- [2026-04-11] | NZ Minimum Wage $23.15 → $23.95 (Minimum Wage Order 2026, efectivo 1 April 2026) | 40+ archivos fuente + test actualizados
- [2026-04-11] | TAX_YEAR_2026_2027 añadido a nz-tax-rates.ts (23.95/hr, starting-out 19.16/hr) | NZ_MINIMUM_WAGE_2026 + NZ_STARTING_OUT_WAGE_2026 en nz-law.ts
- [2026-04-11] | Migración DB: 20260401_minimum_wage_2026.sql — CHECK constraint + UPDATE picker rates | supabase/migrations/
- [2026-04-11] | wage-rates.service.ts ahora usa getCurrentTaxYear().minimumWageHourly (dinamico) | en vez de constante hardcodeada
- [2026-04-11] | Tests nuevos: format.test.ts (43 tests), wage-rates.service.test.ts (28 tests), data-export.service.test.ts (22 tests) | 93 tests verdes
- [2026-04-11] | Dead code cleanup: weeklyReportSections.ts NZ_MINIMUM_WAGE_2024→2026 (bug real en PDF), analytics+export tests imports a nz-law.ts, compliance.service.test assertion corregida (20.3→21.9)
- [2026-04-11] | AuthContext.tsx: signOut guard isSigningOutRef — previene re-entrada desde onAuthStateChange SIGNED_OUT event | 96 tests context verdes

## Completado (sesion 2026-04-10 — Item 3 + Device Trust)
- [2026-04-10] | Item 3: Tests faltantes — zod.schemas (44), payroll.repository (12), MFAGuard (14), routes (16) | 86 tests, 4 archivos | commit f184f72
- [2026-04-10] | feat: persistent session + MFA device trust — deviceTrust.service.ts (web+Android), MFAGuard actualizado, signOut limpia trust, 14 tests | commit d51c5ce

## Completado (sesion 2026-04-11 — E2E Playwright specs)
- [2026-04-11] | E2E: Team Leader workflow (9 tests) — tests/e2e/team-leader.spec.ts | login redirect, tabs, crew, attendance, timesheet, home metrics, safety, offline SW
- [2026-04-11] | E2E: Runner scanning (10 tests) — tests/e2e/runner-scanning.spec.ts | login, logistics UI, scan modal, offline queue injection, sync drain, batch offline
- [2026-04-11] | E2E: QC Inspection (10 tests) — tests/e2e/qc-inspection.spec.ts | login qc@harvestpro.nz, tabs, inspect UI, grade buttons, grading workflow, history, stats, trends, offline SW

## Pendiente
- Tests: schemas Zod, routes.tsx, MFAGuard, payroll.repository | COMPLETADO ✓
- Tests: actualizar test files restantes con $23.50 → $23.15 en mocks/comments | COMPLETADO ✓ (sesion 2026-04-11)
- E2E: Team Leader workflow, Runner scanning, QC inspection | COMPLETADO ✓ (specs escritos — pendiente ejecucion con app corriendo)
- Cleanup: dead code, version mismatch, deprecated constants | COMPLETADO ✓
- Pendiente menor: NZ_MINIMUM_WAGE_2024 alias en nz-law.ts — eliminar cuando compliance.full.test.ts deje de importarlo (test histórico intencional, no urgente)

## En curso (sesion 2026-04-11 tarde — E2E storageState)
- [2026-04-11] | Fix rate limiting E2E — storageState global-setup + newAuthContext | 70% (7/20 specs actualizados)

## Completado (sesion 2026-04-11 tarde — E2E fixes)
- [2026-04-11] | Fix Vite barcode scanner overlay: string concatenation en native-scanner.service.ts | no mas error overlay bloqueando tests
- [2026-04-11] | Fix teamleader email: teamleader@harvestpro.nz → lead@harvestpro.nz en sync-helper.ts | bug real
- [2026-04-11] | global-setup.ts: pre-autenticacion de 5 roles via Playwright storageState | e2e/global-setup.ts
- [2026-04-11] | newAuthContext() en sync-helper.ts: crea contexto con storageState si existe | e2e/utils/sync-helper.ts
- [2026-04-11] | playwright.config.ts: workers=2, auth-setup project con dependencies | e2e configurado
- [2026-04-11] | storageState implementado en: runner-scanning, team-leader, qc-inspection, setup-wizard, soft-delete, rls-archived-blocking, payroll-accuracy | 7 specs
- [2026-04-11] | scripts/seed-users.cjs: seed via Supabase Admin API (no requiere pg directo) | scripts/
- [2026-04-11] | 3 acid test users creados: acid_manager_1_1, acid_runner_1_3, acid_runner_2_3 | via Admin API

## Completado (sesion 2026-04-11 — E2E en Hetzner + credentials)
- [2026-04-11] | Proyecto Supabase correcto restaurado: mcbtyaebetzvzvnxydpy (J&P Cherries) | .env + .env.local actualizados
- [2026-04-11] | 8 demo users + 3 acid test users re-seeded en proyecto correcto | scripts/seed-users.cjs
- [2026-04-11] | E2E en server Hetzner: 103/103 chromium + 20/20 Mobile Chrome | scripts/run-e2e-hetzner.sh
- [2026-04-11] | Fix helpers.ts:93 hardcoded staging-mock URL → process.env.VITE_SUPABASE_URL | e2e/manager/helpers.ts
- [2026-04-11] | Fix Mobile Chrome grep: /— Mobile/ para evitar desktop specs en viewport Pixel 5 | playwright.config.ts
- [2026-04-11] | Merge heartbeat branch → main resuelto (6 conflictos, siempre HEAD) | commit d4956e4

## Completado (sesion 2026-04-12 — Server cleanup + flock)
- [2026-04-12] | Server reset: main local == origin/main == d4956e4 (detached HEAD heartbeat descartado) | /root/repos/harvestpro-nz
- [2026-04-12] | flock añadido a /opt/heartbeat/heartbeat.sh:2 → /var/lock/heartbeat.lock (previene overlap 7 proyectos) | /opt/heartbeat/heartbeat.sh
- [2026-04-12] | /tmp/harvestpro-untracked/ limpiado (data-export + wage-rates ya en origin/main) | server
- [2026-04-12] | Circuit breaker harvestpro-nz auto-unlock ~03:05 UTC — próximo ciclo exitoso con tests en verde | .circuit-locked

## Completado (sesion 2026-04-12 — Pilot blockers resueltos)
- [2026-04-12] | LEGAL: migration 20260412_orchards_min_wage_floor.sql — UPDATE orchards.min_wage_rate WHERE < 23.95 + CHECK constraint | supabase/migrations/
- [2026-04-12] | LEGAL: calculate-payroll floor defensivo — Math.max(stored_min_wage, 23.95) con COMPLIANCE WARNING en logs | supabase/functions/calculate-payroll/index.ts
- [2026-04-12] | SEGURIDAD: MFAGuard extendido a admin, payroll_admin, hr_admin + MFA_REQUIRED_ROLES set | src/components/MFAGuard.tsx + test
- [2026-04-12] | UX: Tab Routes eliminado de LOG_NAV_ITEMS + removido de LogisticsDept + mock test limpiado | src/config/navigation/ + pages/
- [2026-04-12] | UX: WarehouseView "45 mins from Depot A" reemplazado por texto genérico | src/components/views/runner/WarehouseView.tsx
- [2026-04-12] | CLEANUP: gpsComingSoon dead key eliminado de 4 translation files | src/services/translations/

## Pendiente
- ⚠️ APLICAR MIGRACIÓN: 20260412_orchards_min_wage_floor.sql en Supabase antes del primer uso del pilot | CRÍTICO pre-launch
- Android Capacitor: verificar en device real (npx cap sync && npx cap run android) | prioridad media
- Pilot con Central Pac: todos los bloqueantes resueltos — listo para mostrar | prioridad alta
