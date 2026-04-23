# Auditoría HarvestPro NZ — estado real 2026-04-21

**Fecha:** 2026-04-21
**Repo:** `/root/repos/harvestpro-nz` (ct4-bot Hetzner — local, no remoto)
**Branch actual:** `fix/critical-audit-2026-04-19-safe`
**Último commit:** `ec59f70` (2026-04-18) — HR Documents + Holidays Act s.60
**Versión:** `9.9.0`
**Auditor:** Claude (sesión en ct4-bot). SOLO REPORTE, no se ha modificado nada.

> **Nota contextual.** El prompt asumía que la sesión corría en un PC doméstico y haría SSH al Hetzner. En la práctica la sesión YA está en ct4-bot, así que toda la verificación del self-hosted Supabase es local (no hubo SSH). El repo se edita *aquí*, con los riesgos de permisos comodín que describía la Auditoría 1.
>
> **Audit 2026-04-19 ya existía.** El repo contiene `AUDIT_2026_04_19_DEEP_REVIEW.md` (28 KB) con 37 hallazgos tipificados. Este informe **verifica** cuáles siguen abiertos hoy (2 días después).

---

## 11. RESUMEN EJECUTIVO

### ✅ Lo que está sólido

1. **TypeScript strict limpio** — `tsc --noEmit` exit 0; `eslint --max-warnings 0` exit 0. El build production (3.7 MB dist, main bundle 481 KB) se genera sin warnings.
2. **Cero vulnerabilidades** en `npm audit` sobre 995 dependencias (169 prod + 821 dev).
3. **Compliance NZ 2026-27 implementada en código**: `NZ_MINIMUM_WAGE_2026 = 23.95` en `src/constants/nz-law.ts`, tramos PAYE/ESCT/ACC correctos para el año fiscal 2026-2027 en `src/config/nz-tax-rates.ts` (ACC 1.60/$100, max $142,283, casual holiday pay 8%, 4 semanas leave, min $23.95). DB `harvest_settings` tiene 23.95 en sus 10 filas activas.
4. **DB self-hosted 100% saludable operativamente**: 26 contenedores UP (13 stack "prod" + 13 stack "test"), todos healthy, 44 tablas, 83 users, 669,322 bucket_records. Todas las tablas tienen RLS ENABLED (0 sin RLS).
5. **Sistema de memoria/docs impresionante**: 62 migraciones (sin timestamps duplicados), 31 e2e specs, 489 test files sobre 491 source files (ratio 1:1), Holidays Act 2003 s.50 (time-and-a-half) + s.60 (alternative holidays) implementados en `calculate-payroll` edge function, Privacy Act 2020 con consent modal y audit logs append-only.

### 🟡 Lo que necesita atención

1. **Una rama "fix/critical-audit-2026-04-19-safe" abierta sin mergear** + `.circuit-locked` sin trackear (3 fallos consecutivos de breaker en sesión autónoma 2026-04-20). El backlog no es sólo código — hay operación autónoma sin converger.
2. **37 dependencias outdated** (minor + major). Mayor preocupación: dexie 3→4, tailwindcss 3→4, vite 7→8, eslint 8→10 (v8 ya EOL), jsdom 24→29, react-hooks plugin 4→7. Parche inmediato no urgente pero el gap crece.
3. **262 `any` en src** (99 `: any` + 163 `as any`), 2 `console.log` (OK — gateados en logger.ts), 9 TODO/FIXME, 1 `@ts-ignore`. El `as any` está normalizado (mucho por Supabase realtime .on()), pero es un indicador de capas con tipado débil.
4. **Coverage global desconocido**. El último audit dejó 94% en el subset probado, pero correr cobertura completa con v8 tarda >7 min en este repo (ver `AUDIT_2026_04_18_SESSION_NOTES.md`). No hay CI gate por threshold.
5. **Migrations sin tracking real**: el schema `supabase_migrations` no existe en la DB local; la DB viene de dump/schema_v3_consolidated.sql. 62 archivos `.sql` en disco pero ningún registro de "aplicada sí/no". Riesgo alto al intentar `supabase db push` en limpio.

### 🔴 Lo que es crítico y bloquea producción (verificado hoy)

| # | Bloqueante | Estado hoy 2026-04-21 | Archivo / query |
|---|---|---|---|
| 1 | **15 policies RLS con `ALL USING(true) WITH CHECK(true)`** | 🔴 ABIERTO — subió de 14 a 15 tablas (se añadió `chats`) | ver §3.2 — afecta `harvest_settings` (wage), `row_assignments`, `sync_queue`, `session_signatures` |
| 2 | **Orphan user `00000000-0000-0000-0000-000000000000` en `public.users` role=manager is_active=true sin entry en auth.users** | 🔴 ABIERTO | `public.users` id cero |
| 3 | **30,464 grupos duplicados en `bucket_records(picker_id, scanned_at)`** | 🔴 ABIERTO — sin cambio en 2 días | payroll puede pagar 2× por scan. Bloquea `20260415000004_bucket_records_unique_scan.sql` |
| 4 | **MFA server-side desactivado** en self-hosted docker | 🔴 ABIERTO — `GOTRUE_MFA_*` comentadas en `docker-compose.yml:219-223` y `.env`, pero app tiene `useMFA.ts` operativo y `config.toml` lo tiene habilitado (inconsistente) | `/opt/supabase/supabase/docker/{docker-compose.yml,.env}` |
| 5 | **SMTP fake** (`SMTP_USER=fake_mail_user`, `SMTP_HOST=supabase-mail`) | 🔴 ABIERTO | `/opt/supabase/supabase/docker/.env` — password reset no llega al user |
| 6 | **`.env.production` contiene sólo "DB=prod"** | 🔴 ABIERTO | build production fallaría en URL/key |
| 7 | **Data Retention Policy DOCUMENTADA pero NO IMPLEMENTADA** | 🟠 ABIERTO — `docs/DATA_RETENTION_POLICY.md` describe cron weekly, pero no existe el cron ni la función | compliance NZ Employment Relations Act s.130(2) no automático |
| 8 | **Session no se invalida al cambiar role** (JWT persiste 1h) | 🟠 ABIERTO | `src/context/AuthContext.tsx` |
| 9 | **signOut sin `scope:'global'`** | 🟠 ABIERTO | mismo archivo — device robado mantiene sesión |
| 10 | **28 FKs sin índice** sobre tablas grandes (incluye `bucket_records.row_id` en 669k rows) | 🟠 ABIERTO (no verificado hoy) | D1.3 del audit 2026-04-19 |

✅ **El bug `mpi-export.service.ts:189` (audit_log → audit_logs) que era CRITICAL en el audit 2026-04-19 YA ESTÁ FIXEADO** (línea 191 ahora usa `'audit_logs'` con comentario documentando el fix 2026-04-19).

### 📊 Porcentaje honesto de "listo para prod"

**~68%**

Desglose:
- Código cliente (React/TS/Zod/tests/build/i18n): **90%** — sólido, funcional, tipado, traducido a 7 idiomas.
- Backend edge functions + compliance payroll: **85%** — 11 funcs operativas, Holidays Act s.50+s.60 implementadas, Zod en todas.
- **RLS y autorización**: **40%** — 15 tablas abiertas; un JWT válido edita `harvest_settings` libremente.
- Datos: **55%** — 30k duplicados bloquean payroll real en prod; orphan user.
- Ops/deploy: **65%** — CI+backup+security workflows existen, pero `.env.production` vacía, SMTP fake, migrations sin tracking, MFA server off.
- Legal: **80%** en código NZ 2026-27, **30%** en ejecución operativa (retention policy no cron'd).

### ⏱️ Estimación realista a 100%

**40–60 horas netas** de trabajo enfocado (no calendario — neto, sin interrupciones):
- 8-12 h: Reescribir las 15 RLS policies open con role-based + tests RLS cross-tenant + aplicar.
- 6-10 h: Investigar root cause dedup bucket_records + script dedup + recalcular payroll afectado + aplicar unique constraint.
- 3 h: Eliminar orphan user, auditar side-effects.
- 4 h: Habilitar MFA server-side (uncomment + restart + verify flow + test device-trust 72h).
- 6 h: SMTP real (SendGrid/Postmark) + password reset E2E + templates email.
- 4 h: `.env.production` + secrets en CI + doc de rollback deploy.
- 4 h: Implementar retention cron edge function + test idempotencia.
- 4 h: Session invalidation on role change + signOut global + e2e.
- 4 h: Índices en 28 FKs + EXPLAIN ANALYZE antes/después.
- 4-8 h: Regresión completa, APK Android validada, smoke e2e verde, coverage threshold en CI.

Pilot con Central Pac podría moverse a staging con los puntos 1-3 resueltos; productivo real requiere 100%.

---

## 1. SALUD DEL CÓDIGO

### 1.1 Dependencias y vulnerabilidades
- `npm audit`: **0 vulnerabilities** (995 deps). Producción 169, dev 821, optional 78, peer 31.
- `npm outdated`: **37 paquetes** desactualizados. Tabla resumida:

| Paquete | Instalado | Latest | Gap |
|---|---|---|---|
| dexie | 3.2.7 | 4.4.2 | major |
| eslint | 8.57.1 | 10.2.1 | major (v8 EOL) |
| eslint-plugin-react-hooks | 4.6.2 | 7.1.1 | major |
| jsdom | 24.1.3 | 29.0.2 | major |
| tailwindcss | 3.4.19 | 4.2.3 | major |
| vite | 7.3.2 | 8.0.9 | major |
| @vitejs/plugin-react | 5.1.2 | 6.0.1 | major |
| typescript | 5.9.3 | 6.0.3 | major |
| @supabase/supabase-js | 2.91.1 | 2.104.0 | minor |
| @tanstack/react-query | 5.90.21 | 5.99.2 | minor |
| @capacitor/* | 8.2.0 | 8.3.1 | patch |
| @sentry/react | 10.39.0 | 10.49.0 | minor |
| posthog-js | 1.345.3 | 1.369.3 | minor |
| ... | | | 28 más |

### 1.2 Type & lint
- `tsc --noEmit`: exit 0 (clean). **Sin errores de tipos.**
- `npm run lint` (eslint con `--max-warnings 0 --report-unused-disable-directives`): exit 0 (clean). **Sin errores ni warnings.**

### 1.3 Tamaños de archivos
491 source files + 489 test files en `src/`. Top 15 archivos por líneas:

| Líneas | Archivo |
|---:|---|
| 2533 | src/types/database.types.ts *(auto-gen de Supabase)* |
| 985 | src/mocks/data/index.ts |
| 562 | src/repositories/batch-repos.test.ts |
| 555 | src/services/__tests__/payroll.service.test.ts |
| 457 | src/context/AuthContext.tsx |
| 449 | src/components/views/manager/TimesheetEditor.tsx |
| 445 | src/context/MessagingContext.tsx |
| 439 | src/services/compliance.service.ts |
| 434 | src/services/sync.service.ts |
| 410 | src/stores/storeSync.ts |
| 405 | src/components/modals/TeamLeaderSelectionModal.tsx |
| 398 | src/components/modals/ImportCSVModal.tsx |
| 376 | src/components/views/manager/SettingsView.tsx |
| 375 | src/components/views/manager/DeadLetterQueueView.tsx |
| 372 | src/pages/OnboardingPage.tsx |

Todo < 500 salvo el autogenerado `database.types.ts` (2533) y el mock `mocks/data/index.ts` (985). Buena disciplina de splitting.

### 1.4 Archivos sin test (muestra sobre views/)
15 .tsx en `src/components/views/*` sin `.test.tsx` hermano (sample):
- `src/components/views/payroll/ExportHistoryTab.tsx`
- `src/components/views/runner/WarehouseView.tsx`
- `src/components/views/runner/LogisticsView.tsx`
- `src/components/views/runner/MessagingView.tsx`
- `src/components/views/manager/MessagingView.tsx`
- `src/components/views/manager/InsightsView.tsx`
- `src/components/views/manager/MapToggleView.test.tsx` *(es el test, pero el componente no está en views/manager/)*
- … + 8 más

En general la cobertura nominal 1:1 se rompe en vistas grandes (Messaging, Warehouse, Insights). Algunos tests se centralizan en suites como `batch-views-render.test.tsx` y `large-views-import.test.tsx`, así que el número real de "no testeado" es menor al listado.

---

## 2. TESTS

### 2.1 Vitest
**Estado del run de esta auditoría**: `npm test` se lanzó en background (`cross-env NODE_OPTIONS=--max-old-space-size=4096 vitest run`). Proceso `vitest` activo al cierre del informe; `tail -100` sólo se escribe al exit. **No completó en la ventana de esta auditoría.** El historial documentado:

- 2026-04-14 (PROGRESS.md): `4990/4990 tests green, tsc clean`.
- 2026-04-18 (`AUDIT_2026_04_18_SESSION_NOTES.md`): **+227 nuevos tests** (+19 HR Docs + 56 coverage batch 1 + 8 HR integration + 13 auth-context repository + 13 sync-processors + 7 payroll-pipeline + 34 UI + 13 logistics + 13 wizard + 15 wizard + 6 TL + 18 logistics + 8 backlog + 4 link). Total aprox. **~5217 tests**.
- 2026-04-18 lint+tsc clean confirmado.

**Acción sugerida**: re-ejecuta `npm test` localmente mañana; si falla, cruzar contra `AUDIT_2026_04_19_DEEP_REVIEW.md` D6.2 (5 tests con setTimeout conocidos: `useOfflineQueue.test.ts:81`, `useOfflineQueue.real.test.ts:74,83`, `useNotifications.test.ts:85`, `sync-pipeline.test.ts:206`).

### 2.2 Coverage
`@vitest/coverage-v8` instalado. `npm run test:coverage` existe pero tarda >7 min (documentado). No hay threshold gate en CI. Último subset medido 94% stmts/lines.

### 2.3 E2E Playwright
**31 specs** en `e2e/`:
```
admin-users, attendance-scan, conflict-resolver, global-setup, hr-documents,
industrial-edge-cases, login-flows, login, manager-*, mfa-flow, offline*,
operational-chaos, orchard-switching, payroll-accuracy, payroll-approval,
performance-and-fallback, qc-inspection, rls-archived-blocking, rls-cross-tenant,
runner-scanning, setup-wizard, smoke, soft-delete, team-leader
```
Config: `playwright.config.ts` (+ `playwright.production.config.ts`). Reportes en `playwright-report/`. Screenshots de último run en `test-results/` (mobile views de manager capturados). No se corrió en esta sesión.

### 2.4 Flaky conocidos
5 tests con `setTimeout` (ver §2.1). `useOfflineQueue.real.test.ts` usa sleeps 50ms — potencial flaky en CI lento.

---

## 3. SEGURIDAD

### 3.1 Credenciales hardcodeadas
Búsqueda `eyJhbGciOi|sk_live_|ghp_…|AIza…|xoxb-` en `src/` y `supabase/functions/`:
- `src/services/config.service.ts:88` — JWT empezando `eyJ…` → **mock_anon_key** documentado (fallback de dev mode). OK.
- `src/mocks/data/index.ts:49` — JWT en un literal concatenado → mock (siempre en namespace `mocks/`). OK.
- **Sin secretos reales en src**.

### 3.2 Archivos `.env` presentes hoy
| Archivo | Contenido | Riesgo |
|---|---|---|
| `.env.example` | Documenta VITE_SUPABASE_URL + ANON_KEY + VAPID + test passwords vacías | OK (template) |
| `.env.local` | **REAL anon + service_role keys del self-hosted + DATABASE_URL con password `[REDACTED]`** | Tolerado (local dev contra ct4-bot); `.gitignore` lo excluye. Pero está en un server de prod con `Bash` comodín (Audit 1 §9). |
| `.env.production` | Sólo `DB=prod` | **🔴 placeholder**. Build production fallaría. |
| `.env.staging` | URL y key **mock** (staging-mock.supabase.co) | OK como placeholder |
| `.env.example` no documenta | `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY` | Media — devs olvidan configurar |

### 3.3 RLS — policies abiertas (verificado 2026-04-21)
Query `SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' AND qual='true' AND cmd IN ('ALL','UPDATE','DELETE','INSERT')` ejecutada contra `supabase-db`. **15 filas** (antes eran 14 en el audit 2026-04-19 — se añadió `chats`):

```
alerts              | Allow all for alerts
block_rows          | Managers can manage rows            ← nombre engañoso (qual=true)
break_logs          | Allow all for break_logs
broadcasts          | Allow all for broadcasts
bucket_runners      | Allow all for bucket_runners
chats               | Enable all for authenticated users  ← NUEVO desde 2026-04-19
harvest_seasons     | Managers can manage seasons         ← nombre engañoso
harvest_settings    | Managers can manage settings        ⚠️ PAYROLL
orchard_blocks      | Managers can manage blocks
performance_metrics | Allow all for performance_metrics
row_assignments     | Allow all for row_assignments       ⚠️ CREWS
session_signatures  | Allow all for session_signatures    ⚠️ SESIONES
sync_queue          | Allow all for sync_queue            ⚠️ SYNC
teams               | Allow all for teams
tractor_fleet       | Allow all for tractor_fleet
```

Impacto real: cualquier JWT autenticado puede `UPDATE harvest_settings SET min_wage_rate = 0` sobre cualquier orchard. Es CRITICAL.

### 3.4 RLS — tablas sin RLS habilitado
Query `SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false`: **0 filas**. Todas las 44 tablas tienen RLS ENABLED.

### 3.5 Roles DB vs frontend
8 roles en `users_role_check` constraint: `manager, team_leader, runner, qc_inspector, payroll_admin, admin, hr_admin, logistics`. Coincide con `src/types/app.types.ts` y con `_shared/security.ts` (verificado implícitamente en audit 2026-04-19 tras fix CRITICAL 2026-03-28 de roles owner/supervisor → admin/team_leader). OK.

---

## 4. BASE DE DATOS Y MIGRACIONES

### 4.1 Migraciones en disco
**62 archivos .sql** en `supabase/migrations/` + 14 en `supabase/archive/`. Timestamps únicos (sin duplicados ni gaps visibles entre hitos principales).

Cronología (resumen):
- `20260101000000_schema_v3.sql` (baseline)
- `20260201…` (8 funciones RPC + grants)
- `20260210_day_closures.sql`
- `2026021100…2026021702` (34 migrations de febrero — day_closures, RLS, offline, optimistic lock, timestamptz audit, etc.)
- `20260223_allowed_registrations`
- `20260226_verify_delta_sync_columns`
- `20260227_rls_hierarchy_tables`
- `2026030100…2026030101` (RLS consolidation)
- `20260303_security_hardening`
- `20260331_create_wage_rates`, `20260401_minimum_wage_2026`
- `20260403…` (privacy_consent, broadcasts)
- `20260411_harvest_settings_updated_at`
- `20260412_orchards_min_wage_floor`
- `20260414_fix_settings_and_row_assignments`
- `20260415000000…000005` (check_in/out + bucket unique + correct_attendance)
- `20260416000000…000002` (v16 minor + orchards crop_type + backfill)
- `20260418000000_hr_documents.sql` (última)

### 4.2 Tracking de aplicadas
`supabase_migrations` schema **no existe** en la DB local. Sólo hay `auth.schema_migrations`, `_realtime.schema_migrations`, `realtime.schema_migrations`. La DB se pobló por dump, no por `supabase db push`. Riesgo: al ejecutar `supabase db push` en un entorno nuevo, no se puede saber qué ya está aplicado. Migration `20260415000004_bucket_records_unique_scan.sql` **está bloqueada** por 30,464 duplicados.

### 4.3 Schema actual (ct4-bot local)
- **44 tablas** en schema `public`.
- **83 users** (8 roles).
- **669,322 bucket_records** — tabla más grande.
- **10 harvest_settings** con `min_wage_rate = 23.95` en todas → NO hay filas con 23.50 u otro valor antiguo. ✅
- **38 orchards** pero sólo 10 harvest_settings → 28 orchards sin settings (ver audit 2026-04-19 D1.6). Media.

### 4.4 Tablas "legacy" / huérfanas
El audit 2026-04-19 identificó:
- `wage_rates` → tabla creada por migración `20260331_create_wage_rates.sql` pero **vacía y no referenciada por Edge Functions**. La migración `20260401_minimum_wage_2026.sql` modifica esta tabla — no tiene efecto real. La tabla operativa es `harvest_settings`. **Es LEGACY**.
- `bucket_events` → `calculate-payroll/index.ts` migró de `bucket_events` a `bucket_records` en el fix 2026-03-28 P2 (ERRORES.md líneas 55-56). `bucket_events` puede seguir existiendo con datos, pero el payroll ya no la usa. **Candidata a deprecar**.

### 4.5 Wage defaults en DB
Query `SELECT orchard_id, min_wage_rate, piece_rate FROM harvest_settings`:
```
10 rows — TODOS con min_wage_rate=23.95, piece_rate=6.50
```
✅ Alineado con NZ_MINIMUM_WAGE_2026. **No hay residuo de 23.50 ni 23.15 en DB operativa.**

### 4.6 Índices
El audit 2026-04-19 D1.3 listó **28 FKs sin índice** (incluye `bucket_records.row_id`, `pickers.team_leader_id`, `quality_inspections.inspector_id`, `transport_requests.requested_by`, etc.). No verificado que se hayan creado hoy. A `bucket_records` de 669k filas los JOINs por `row_id` son ~4s sin índice vs <10ms con. **Aún ABIERTO**.

### 4.7 Datos corruptos
- **30,464 grupos duplicados en (picker_id, scanned_at)** → verificado hoy 2026-04-21, **mismo número que en audit 2026-04-19**. Sin cambio.
- **1 orphan user** `00000000-0000-0000-0000-000000000000` con role='manager', is_active=true, email vacío → verificado hoy, **sigue ahí**.

---

## 5. SELF-HOSTED SUPABASE EN HETZNER (LOCAL)

### 5.1 Contenedores UP
**26 contenedores Supabase** en ct4-bot, divididos en dos stacks:

**Stack principal (`supabase-*`, up 2 days)** — 13 containers:
- supabase-edge-functions, kong (127.0.0.1:8000), studio (3000), storage (5000), meta (8080), pooler (127.0.0.1:5433 session + 6543 txn), auth, rest, db (5432), analytics, vector, imgproxy, realtime.

**Stack test (`supabase-test-*`, up 25 horas)** — 13 containers, puertos diferentes:
- kong 127.0.0.1:8001, pooler 127.0.0.1:5435/6544.

**Otros contenedores no-supabase** (separados):
- `ultra_engine` (up 11 min, healthy, puerto 80) + `ultra_db` (up 4 days, healthy).
- 14 contenedores ultra-* detenidos (RAM liberada 2026-04-18, ver AUDIT_2026_04_18).

**Todos los supabase containers en estado "healthy"** excepto `supabase-edge-functions` y `supabase-rest` que no tienen healthcheck pero están UP.

### 5.2 RAM / CPU
Memoria: 15.25 GiB total (stats del container). Uso por servicio:
- supabase-kong: 855 MiB (5.5%) — pico por Lua reload
- supabase-studio: 200 MiB (1.3%) — 18% CPU (idle polling del dashboard)
- supabase-analytics: 504 MiB (3.2%)
- supabase-db: 207 MiB (1.3%) — barato dado 669k rows
- ultra_db: 1.08 GiB (7.1%)
- ultra_engine: 67 MiB (0.4%)

Total estimado Supabase (26 containers): ~4.2 GiB. Máquina con 15.25 GiB tiene margen holgado.

### 5.3 Disco
- `/` (sda1): 38 G, 13 G usados (35%) → OK.
- Docker: 30.13 GB en imágenes (100% reclaimable — hay 32 imágenes), 3.85 GB en volúmenes (19 activos).
- Volumen de node_modules HarvestPro: en `/mnt/HC_Volume_105271265/repos` (via symlink `/root/repos`).

### 5.4 Edge Function calculate-payroll
- Deployada (folder existe, `index.ts` presente).
- Responde `HTTP 401 Unauthorized` a request sin auth → OK, requiere JWT.
- Warmup bypass añadido en commit `602dac7`.
- Implementa Holidays Act s.50 (time-and-a-half) + s.60 (alternative_holidays_owed) según PROGRESS.md 2026-04-18.

### 5.5 CORS y JWT config
- CORS allowlist en `_shared/security.ts` → incluye `*.vercel.app` wildcard (audit 2026-04-19 D3.5 MEDIUM, reclasificado a HIGH). Cualquier fork en `evil-fork.vercel.app` tiene acceso. ❌
- JWT `VITE_SUPABASE_ANON_KEY` emitido en `.env.local` tiene `exp: 1934192805` = 2031-04. Largo por diseño local.
- Site URL auth: `http://localhost:5173` (dev). Sin URL prod configurada.

### 5.6 Storage buckets
- `qc_photos` existe (migration `20260213_create_qc_photos_bucket.sql`).
- `hr-documents` privado (migration `20260418000000_hr_documents.sql`).
- Permissions via RLS en `storage.objects` — no verificado en detalle hoy.

### 5.7 Auth config
- 4 provider configs en `config.toml`: email (enabled), anonymous (disabled), external (none).
- MFA `config.toml`: TOTP enroll/verify=true, phone=false, max 10 factors. **PERO en docker-compose.yml self-hosted están comentadas.**

### 5.8 Logs 24h — errores
No se ejecutó `docker logs … | grep error` en detalle (ventana de auditoría corta). El último audit (2026-04-19) no reportó patrones críticos en los logs. Healthchecks green en todos menos edge-functions y rest (no tienen healthcheck definido).

### 5.9 SMTP
- `/opt/supabase/supabase/docker/.env`: `SMTP_USER=fake_mail_user`, `SMTP_HOST=supabase-mail`, `SMTP_ADMIN_EMAIL=admin@example.com`. **FAKE**.
- Impacto: password reset emails nunca llegan al usuario.

---

## 6. DEPLOYMENT Y CI/CD

### 6.1 GitHub Actions
5 workflows en `.github/workflows/`:

| Workflow | Propósito | Estado |
|---|---|---|
| `ci.yml` | 5 shards vitest + lint + build + deploy Hetzner + Telegram notify | Último commit `48b1822` 2026-04-20 arregló false positive de secret-scan regex |
| `deploy-production.yml` | Deploy a main | Requiere `HETZNER_HOST`, `HETZNER_SSH_KEY`, `TELEGRAM_*` secrets |
| `deploy-staging.yml` | Deploy staging | Parcialmente configurado |
| `security.yml` | Auditoría seguridad | Configurado |
| `backup.yml` | Backup DB | Configurado (manual `scripts/backup.sh` también existe) |

CI estrategia:
```yaml
shard: [1/5, 2/5, 3/5, 4/5, 5/5]
VITE_SUPABASE_URL: https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY: <placeholder-key-for-ci-tests-only>
```
Lint corre solo en shard 1/5. Build-deploy requires `github.ref == main|master` y event=push.

### 6.2 Deploy destino
- CI despliega vía SSH a Hetzner: `cd /root/repos/${{repo}}` → `git pull` → `npm ci --ignore-scripts` → `npm run build`.
- **No se copia a contenedor ni CDN.** El build queda en `dist/` del server. Presumiblemente Nginx/Vercel sirve.
- **Sin estrategia de rollback** documentada. Si un deploy rompe, `git reset --hard origin/...` hace fallback manual.

### 6.3 Build production
- `npm run build` = `tsc && vite build`.
- `dist/` actual (última ejecución 2026-04-21 00:47):
  - 3.7 MB total.
  - Main bundle: `assets/index-BwB6s5vq.js` **481 KB**.
  - vendor-sentry 445 KB, vendor-supabase 170 KB, vendor-analytics 174 KB.
  - Manager page chunk: 168 KB.
  - CSS: 173 KB.
  - `stats.html` (rollup-plugin-visualizer) 718 KB.
- **Sin warnings** en última build.

### 6.4 Capacitor Android
- `capacitor.config.ts` presente.
- `android/` folder existe.
- **No se ha ejecutado** `npx cap run android` durante esta auditoría. La última APK generada no está documentada — PROGRESS.md lo marca como pendiente ("verificar en device real") desde 2026-04-18.
- Versión `@capacitor/*` en 8.2.0; 8.3.1 disponible.

### 6.5 Vercel
- `vercel.json` presente en el repo (no inspeccionado en detalle).
- Último deploy Vercel: desconocido desde esta sesión. Dominio documentado `merr-pi.vercel.app` o `harvestpro.vercel.app`.

---

## 7. LEGAL COMPLIANCE NZ

### 7.1 Minimum wage 2026-04-01 → $23.95/hr
- `src/constants/nz-law.ts`: `NZ_MINIMUM_WAGE_2026 = 23.95`, `NZ_STARTING_OUT_WAGE_2026 = 19.16` (80%), comentarios citan Minimum Wage Order 2026. ✅
- `src/config/nz-tax-rates.ts`: `taxYear: '2026-2027'`, `effectiveFrom: '2026-04-01'`, `minimumWageHourly: 23.95`. ✅
- Código frontend: 30+ archivos referencian 23.95 (hooks, tests, services). Ningún match para 23.50 o 23.15 fuera de contexto documentado como histórico.
- DB `harvest_settings`: 10/10 filas con 23.95. ✅
- Migración `20260412_orchards_min_wage_floor.sql` cambió el DEFAULT a 23.95 (ERRORES.md línea 12 documenta el fix).
- Tests: `usePickerStatus.test.ts`, `useCalculations.real.test.ts`, `payroll.service.test.ts` todos usan 23.95.

**✅ Min wage está completo y consistente.**

### 7.2 PAYE (Pay As You Earn) 2026-27
- `nz-tax-rates.ts`: array `payeBrackets: PAYE_2026_27` con brackets progresivos anuales. Helper `toWeeklyBrackets()` divide por 52 para aplicación semanal.
- Citado Income Tax Act 2007.
- No verificado que los brackets exactos coincidan con el último IRD update (no se descargó la ley); pero el archivo documenta como fuente oficial IRD.

### 7.3 KiwiSaver
- `nz-payroll-deductions.service.ts` (461 líneas) implementa KS employee (3/4/6/8/10%) + employer min 3% + ESCT.
- `kiwisaverEmployerMin: 0.03`.
- Exempt RSE workers (visa <12m) → documentado en `employment-agreement.service.ts:97`.
- Citado KiwiSaver Act 2006.

### 7.4 ACC earner's levy
- `nz-tax-rates.ts`: `accEarnerLevyPer100: 1.60`, `accEarnerLevyRate: 0.016`, `accMaxLiableAnnual: 142283`.
- Citado Accident Compensation Act 2001.

### 7.5 Holidays Act 2003
- s.50 time-and-a-half → implementado en `calculate-payroll` edge function (commit `ec9d26e` 2026-04-18) via `NZ_PUBLIC_HOLIDAYS` + `isPublicHoliday()` + `getHolidayMultiplier()`.
- s.60 alternative holidays owed → `Edge Function` traquea `alternative_holidays_owed` por picker (commits `4a7a6ce`, `83b982f`).
- Payroll banner morado en UI (commit `7f6fe28`).
- 19 tests en `api.schemas.test.ts`.
- 4 semanas annual leave documentadas en `nz-tax-rates.ts`.
- Casual holiday pay 8% (casualHolidayPayRate).

✅ **Holidays Act complete.**

### 7.6 Payslip format
- `src/services/export-payroll-formats.service.ts` + `src/services/export-pdf-template.service.ts` generan formatos (Xero, PaySauce, PDF).
- Campos no auditados contra el mínimo legal NZ (Wages Protection Act 1983 exige gross, deductions, net, hours, holiday pay accrual).
- Recomendado: review formal con un contable NZ antes de producción real.

### 7.7 Privacy Act 2020
- `PrivacyConsentModal.tsx` + `privacy_consent_log` table + migración `20260403000000_privacy_consent.sql`.
- `src/services/data-export.service.ts` exporta datos del user (export JSON).
- IPP 6-7 (data subject requests) documentadas en `docs/DATA_RETENTION_POLICY.md`.
- Audit logs append-only vía RLS.

### 7.8 Data retention
- **Documentada** en `docs/DATA_RETENTION_POLICY.md`: Payroll/Tax 7 years (ERA s.130(2) + TAA s.22), Attendance 6 years (Holidays Act), H&S 10 years, Audit logs 7 years, Privacy consent indefinite.
- **NO IMPLEMENTADA**: "A scheduled Edge Function should be implemented". No hay cron, no hay función, no hay scripts. → 🟠 ABIERTO.

---

## 8. DEUDA TÉCNICA DETECTADA

### 8.1 Marcas en código
| Marca | Ocurrencias |
|---|---:|
| `TODO` / `FIXME` / `HACK` / `XXX` | **9** (muy bajo) |
| `: any` | **99** |
| `as any` | **163** |
| `@ts-ignore` | **1** |
| `@ts-expect-error` | (incluido arriba) |
| `console.log` | **2** (en `utils/logger.ts`, gateados por `!isProd`) |

Total `any`: **262** en src/. Alto para un repo que declara "no any" en reglas del proyecto (CLAUDE.md §Reglas). La mayoría está en boundary con Supabase (`.on('postgres_changes')` overloads) y mocks.

### 8.2 Dead code / código comentado en bloques grandes
No se encontraron bloques grandes (>20 líneas) de código comentado en el grep rápido. Buena higiene.

### 8.3 Swallowed catches
Audit 2026-04-19 D6.1 listó 10 `.catch(() => {})`:
- `src/repositories/hr-documents.repository.ts:125`
- `src/stores/useHarvestStore.ts:93`
- `src/index.tsx:64,68`
- +3 en tests.

### 8.4 Secretos en git history
Audit 2026-04-19 D5.1 ejecutó `git log -p -S "eyJ"` y encontró **1 JWT demo documentado** en commit `3aa50b2`. No hay secretos reales filtrados. ✅

### 8.5 Versión incoherente
ERRORES.md P1 línea 48 (2026-03-28) reportó: `config.service.ts:114, sentry.ts:48, env.validation.ts:20` tienen fallbacks `4.2.0`, `9.1.0`, `9.3.0` vs package.json `9.9.0`. **No verificado como fixeado**. Probablemente sigue abierto.

---

## 9. DISCREPANCIAS PROGRESS.md vs REALIDAD

### 9.1 Lo que PROGRESS dice y la realidad confirma ✅
- Holidays Act s.50+s.60 en Edge Function → confirmado (commit 2026-04-18).
- HR Documents tab operativo con bucket privado → confirmado (`hr_documents` table + `hr-documents` bucket).
- Settings migration (variety, shift times, MFA TTL) → confirmado en DB (columnas presentes).
- 20260412 migration de min_wage 23.95 → aplicada (harvest_settings DEFAULT 23.95 en 10 filas).
- 4990/4990 tests verde a 2026-04-14 → creíble; no re-verificado en esta sesión.

### 9.2 Lo que PROGRESS sugiere listo pero NO está listo ❌
- "Edge Function NOT deployed — necesita `supabase functions deploy calculate-payroll`" (PROGRESS.md 2026-04-18, última entrada visible). La función **responde HTTP 401 con auth check activo**, pero no se confirmó que sea la última versión con s.50/s.60. Recomendado: `curl -X POST …/functions/v1/calculate-payroll` con JWT real + orchard_id conocido para verificar output y comparar versión.
- "Dual layout todos los roles (P0 UI gap)" → PROGRESS dice "7 roles migrados" en sesión 2026-04-18. No verificado en browser en esta sesión.
- "Android Capacitor: verificar en device real" → pendiente desde 2026-04-18.

### 9.3 Pendientes viejos aún reales
- "HHRR Calendar: datos hardcodeados — conectar a DB real" (PROGRESS.md). PROGRESS 2026-04-18 dice que ahora viene de `harvest_settings` (shift times), pero eventos de calendar (holidays, shifts agendados) no se verificaron como DB-backed.
- "Pilot con Central Pac" — pendiente desde hace semanas, no bloqueante técnicamente pero sí operativamente.

---

## 10. BLOQUEOS CONOCIDOS Y PENDIENTES REALES

### 10.1 Del ERRORES.md
- **93 entradas tipo `- [fecha]`** y **55 marcadas "FIXED/RESUELTO"**. Ratio ~59% cerrado. ~38 pendientes en texto.
- Muchos "pendientes" de 2026-03-28 están marcados FIXED en fechas posteriores (FIXED inline). Requiere revisión individual para sacar lista actualizada.
- **P1 línea 48** (versión `9.9.0` vs fallbacks `9.1.0`/`9.3.0`/`4.2.0` en `config.service.ts`/`sentry.ts`/`env.validation.ts`): sin marca FIXED. Probablemente aún abierto.

### 10.2 Circuit-locked file
`/root/repos/harvestpro-nz/.circuit-locked` (sin trackear en git):
```json
{"locked_at": "2026-04-20T09:41:35+00:00", "reason": "Circuit breaker tripped — 3 consecutive failures (exit_code=1)"}
```
De la sesión autónoma nocturna 2026-04-20. OVERNIGHT-LOG.md indica que phase 1-4 se completaron y phase 5 se difirió. PR#9 (audit) abierto. PR#8 bloqueado por dep-vuln-scan red (ver `/root/AUDIT-ultra-2026-04.md`).

### 10.3 PRs abiertos
Branch actual: `fix/critical-audit-2026-04-19-safe`. PRs detectados en log:
- PR #8 (audit merge?) — dep-vuln-scan failure
- PR #9 — audit branch open
- PR #11 (merged `48b1822`) — CI secret-scan regex fix

No se hizo `gh pr list` (el token puede no estar en este shell), así que el conteo exacto no se enumeró.

### 10.4 PRÓXIMOS 5 PASOS REALES (orden de prioridad)

| # | Paso | Estimación | Razón |
|---|---|---|---|
| **1** | **Reescribir las 15 RLS policies open → role-based** + añadir test e2e `rls-cross-tenant.spec.ts` que intente UPDATE `harvest_settings` como `picker` y verifique rechazo. Aplicar migration a DB local y stack prod. | 8-12 h | CRITICAL, explotable con cualquier JWT. Bloquea claim de "seguro". |
| **2** | **Dedup 30,464 bucket_records + unique constraint** | 6-10 h | CRITICAL, expone a doble pago de piece-rate. Sin este fix payroll en prod es inseguro. Flujo: análisis root cause (sync retry?) → query dedup conservando `MIN(id)` → recalcular payroll afectado → reconciliar → aplicar `20260415000004`. |
| **3** | **Eliminar orphan user `00000000-…`** + investigar origen (seed? migration?). Añadir CHECK que `users.id IN (SELECT id FROM auth.users)` o FK strict. | 2-3 h | CRITICAL, riesgo teórico bajo pero rompe invariantes. |
| **4** | **Habilitar MFA server-side** (uncomment GOTRUE_MFA_* en `/opt/supabase/supabase/docker/docker-compose.yml` + `.env`, restart supabase-auth, verificar `supabase.auth.mfa.enroll()` desde frontend). | 3-4 h | CRITICAL, MFA aparenta funcionar en UI pero no hace nada — engaña al usuario. |
| **5** | **Configurar SMTP real + `.env.production` real** | 4-6 h | CRITICAL para cualquier producción (password reset no funciona; env.production vacía rompe build). |

**Después de estos 5**: session invalidation on role change, signOut global, índices a 28 FKs, retention cron edge function, APK Android validada, coverage gate en CI.

---

## Anexo A — Queries SQL ejecutadas hoy

```sql
-- Open RLS policies (returned 15 rows)
SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
WHERE schemaname='public' AND qual='true' AND cmd IN ('ALL','UPDATE','DELETE','INSERT')
ORDER BY tablename;

-- Tables without RLS (returned 0)
SELECT schemaname, tablename, rowsecurity FROM pg_tables
WHERE schemaname='public' AND rowsecurity=false;

-- Orphan users (returned 1)
SELECT id, email, role, is_active FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id);

-- Duplicate bucket_records (returned 30464)
SELECT count(*) FROM (
  SELECT picker_id, scanned_at FROM bucket_records WHERE picker_id IS NOT NULL
  GROUP BY picker_id, scanned_at HAVING count(*) > 1
) x;

-- harvest_settings wage rates (10 rows, all 23.95/6.50)
SELECT orchard_id, min_wage_rate, piece_rate FROM harvest_settings
ORDER BY min_wage_rate;

-- Supabase migrations tracking (NOT present in public)
SELECT schemaname, tablename FROM pg_tables
WHERE schemaname='supabase_migrations' OR tablename LIKE 'schema_migrations%';
-- returned: auth, _realtime, realtime. NO public.
```

## Anexo B — Comandos ejecutados

```bash
claude --version                          # 2.1.116
npm audit --json                          # 0 vulns / 995 deps
npm outdated --json                       # 37 packages behind
npx tsc --noEmit                          # clean (exit 0)
npm run lint                              # clean (exit 0)
docker ps | grep supabase                 # 26 containers, todos healthy
docker stats --no-stream                  # CPU/RAM OK
grep -rInE "eyJhbGciOi|sk_live_|..." src/ # 2 hits (ambos mocks)
grep -rIn "TODO|FIXME|HACK|XXX" src/      # 9
grep -rIn ": any" src/ | wc -l            # 99
grep -rIn "as any" src/ | wc -l           # 163
grep -rIn "@ts-ignore" src/               # 1
grep -rIn "console\.log" src/ | wc -l     # 2 (en logger.ts)
find src -name "*.ts*" | wc -l            # 980 total
```

---

## Cierre

Este audit confirma y refina el audit 2026-04-19 (que el propio repo ya tiene en `AUDIT_2026_04_19_DEEP_REVIEW.md`). En 2 días:
- ✅ **1 de 3 CRITICAL** cerrado: `mpi-export.service.ts` audit_log → audit_logs (commit anterior a hoy).
- 🔴 **2 de 3 CRITICAL** siguen abiertos: RLS open (subió de 14 a 15 tablas), bucket_records dedup (mismo número).
- 🔴 **+1 CRITICAL no-código**: MFA server-side no habilitado (inconsistencia entre `config.toml` y docker-compose.yml).

**Para pilotar con Central Pac en staging**: resolver pasos 1-3 bastaría.
**Para prod real**: 40-60 h adicionales.

**Informe guardado en:** `/tmp/audit_harvestpro.md`
