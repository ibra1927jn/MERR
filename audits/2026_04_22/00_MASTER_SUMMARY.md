# HarvestPro NZ — Master Audit Summary

**Fecha:** 2026-04-22
**Metodología:** 14 agentes paralelos, slices no solapados, read-only. Cada slice tiene informe dedicado (`01…14_*.md`).
**Base de comparación:** `AUDIT_2026_04_19_DEEP_REVIEW.md` (3 días antes; solo 2 commits intermedios: HR docs + secret-scan regex).
**Veredicto global:** 🔴 **NO-GO para release productiva.** 26 CRITICAL + 62 HIGH distribuidos en 9 slices distintos. Varios hallazgos previos sin resolver.

---

## Scorecard por dimensión

| # | Slice | CRIT | HIGH | MED | LOW | INFO | Total |
|---|---|---:|---:|---:|---:|---:|---:|
| 01 | Supabase Migrations & SQL | **6** | 9 | 9 | 5 | 3 | 32 |
| 02 | RLS & Auth Security | **5** | 9 | 7 | 4 | 6 | 31 |
| 03 | Edge Functions | **3** | 5 | 6 | 4 | 7 | 25 |
| 04 | Payroll NZ Compliance | **4** | 6 | 5 | 3 | — | 18 |
| 05 | CI/CD GitHub Actions | **3** | 6 | 7 | 6 | 3 | 25 |
| 06 | Vercel + Build Config | 0 | 5 | 5 | 4 | 4 | 18 |
| 07 | TypeScript Type Safety | 0 | 1 | 5 | 4 | 3 | 13 |
| 08 | React Components & Hooks | **6** | 11 | 18 | 9 | — | 44 |
| 09 | State / Sync / Offline | **2** | 4 | 6 | 3 | 2 | 17 |
| 10 | Testing Quality | **2** | 4 | 6 | 4 | — | 16 |
| 11 | Dependencies / Supply Chain | 0 | 0 | 3 | 5 | — | 8 |
| 12 | Secrets & Env Config | **2** | 3 | 4 | 3 | 2 | 14 |
| 13 | Performance & Bundle | **1** | 5 | 7 | 5 | — | 18 |
| 14 | Error Handling & Logging | **2** | 5 | 6 | 4 | — | 17 |
| — | **TOTAL** | **36** | **73** | **94** | **63** | **30** | **296** |

> Nota: los conteos CRITICAL incluyen algunos solapamientos cross-slice (p.ej. `audit_logs` schema drift aparece en 01 y 03; `qc-photos` PUBLIC en 02 y 12). El consolidado "must-fix" único son **~22 issues CRITICAL distintos** + **~50 HIGH distintos**.

---

## TOP 12 BLOQUEANTES DE RELEASE (ordenados por urgencia)

### 🔴 Top-priority (rotar secretos + parar deploy HOY)

**1. Service_role JWT vivo commiteado a git HEAD** — `scripts/setup-db.cjs:10-12` contiene el service_role JWT del proyecto `bfglk…xddznucxf` (exp ~2036) + password Postgres. En HEAD desde commit `d5ce6e3` (2026-04-14). Bypass total de RLS en cualquier tenant. → Rotar la key, scrubbear historial con `git filter-repo`, rotar password. Slice 12 CRITICAL-01.

**2. Privilege escalation trivial a tenant-admin** — Dos bugs combinados:
- `supabase/functions/_shared/security.ts:150` lee rol desde `user_metadata.role`, que es cliente-escribible vía `supabase.auth.updateUser`
- `public.users INSERT WITH CHECK (true)` (`2026021103_complete_rls.sql:281`) permite a cualquier signup insertar su propia row con `role='admin'`
→ Reescribir RBAC server-side sobre `app_metadata` (no cliente-escribible) o SECURITY DEFINER function. Slice 02 CRITICAL-02 + C-4.

**3. `audit_logs` schema drift rompe varias funciones clave** — `audit_logs` table definida en `schema_v3_consolidated.sql:451` tiene CHECK `action IN ('INSERT','UPDATE','DELETE','CUSTOM')` y columnas fijas, pero **ningún** RPC/Edge Function la respeta:
- `close_payroll_period` RPC (migración `2026021302`) usa columnas inexistentes — payroll close silencio
- `correct_attendance` RPC — timesheet correction falla
- 6 Edge Functions (`approve-timesheet`, `manage-admin`, `manage-attendance`, `provision-orchard`, `submit-audit-log`) insertan columnas no definidas + `action` values no permitidos
→ Migrar `audit_logs` a forma usada por código (o reescribir código). NZ s.130A requiere trazabilidad — ahora mismo está rota. Slices 01 CRIT-1/2 + 03 CRIT-2.

### 🔴 Bloqueantes adicionales

**4. `provision-orchard` roto — todo nuevo signup falla** — inserta en `orchard_settings` (tabla fantasma; no existe en el schema). La canonical es `harvest_settings` (usada por `calculate-payroll`). Self-signup falla en step 4 y rollback. Slice 03 CRIT-1.

**5. RLS previa CRITICAL solo 50% arreglada** — 10 tablas siguen con `FOR ALL USING(true) WITH CHECK(true)`: `harvest_seasons`, `orchard_blocks`, `block_rows`, `break_logs`, `bucket_runners`, `performance_metrics`, `session_signatures`, `sync_queue`, `teams`, `tractor_fleet`. Cualquier user autenticado puede modificar wage calc settings, assignments y payroll queue. Slice 02 CRIT-1.

**6. Audit retention 90 días viola NZ ER Act 2000 s.130A + Holidays Act s.81** — `2026021101_audit_logging.sql:149-154` hard-deletes wage/attendance history. La ley exige 6 años. Multa hasta $1,000/empleado. Slice 04 CRIT-1.

**7. Doble-cobro de piece-rate + sin audit** — `bucket_records` sigue con 30,464 duplicados `(picker_id, scanned_at)` sin deduplicar + `calculate-payroll/index.ts:151` consulta sin `DISTINCT` + la tabla no tiene audit trigger. Pagos duplicados + sin trazabilidad para disputa legal. Slice 04 CRIT-2.

**8. `$23.95` floor dropped** — `20260415000003_fix_wage_rates.sql:7-8` eliminó el CHECK `wage_above_nz_minimum` sin reemplazo fecha-aware. La DB acepta rates bajo el mínimo legal (Minimum Wage Act 1983 s.6). Slice 04 CRIT-3.

**9. Dexie wipe en UpgradeError destruye scans pendientes** — `db.ts:206-224` llama `Dexie.delete('HarvestProDB')` en error de upgrade. El comment dice "data is on Supabase" pero el `sync_queue`/`bucket_queue`/`dead_letter_queue` solo vive local. **Un mal deploy = 200 scans perdidos por cada tablet de campo.** Slice 09 CRIT-F11.

**10. Sin idempotency de sync queue** — `sync.service._doProcessQueue` borra items DESPUÉS del loop (bulk-delete). Crash entre success y bulk-delete reprocesa en el siguiente load. QC inspections / contracts / transport-create hacen `.insert()` sin unique key → duplicados silenciosos. Solo `processPicker` deduplica. Slice 09 CRIT-F4.

**11. `qc-photos` bucket PÚBLICO + DELETE abierto** — `2026021300_create_qc_photos_bucket.sql:33`. Cualquier user autenticado puede borrar cualquier foto QC. Evidencia MPI compliance tamperable. `useQC.ts:93` usa `getPublicUrl` sin signed URLs → PII exposure. Slice 02 CRIT-5 + 12 HIGH-01.

**12. Deploys prod racing** — `ci.yml` y `deploy-production.yml` ambos triggerean en `push: main` sin `concurrency:` block, ni `permissions:` restringidas. Dos pushes seguidos = dos pipelines pisándose (uno SSH a Hetzner como root, otro Vercel). Slice 05 CRIT-GHA-CONC-01 + GHA-PERM-01.

---

## HIGH NOTABLES (20 a resolver pre-release)

| # | Slice | Issue | File |
|---|---|---|---|
| 13 | 01 | `pickers_performance_today` view filtra rol inexistente → 0 filas siempre | `20260303_security_hardening.sql` |
| 14 | 02 | Access/refresh tokens en `localStorage` → 1 XSS = multi-device takeover | `src/services/supabase.ts:30` |
| 15 | 02 | Edge Fns `calculate-payroll`, `detect-anomalies`, `check-compliance` aceptan `orchard_id` del body sin manager-owns-orchard check → cross-tenant | `supabase/functions/*` |
| 16 | 03 | `send-push` broadcast filters `role`/`orchard_id` ignorados → push a TODOS cross-tenant | `send-push/index.ts:415-421` |
| 17 | 04 | No existe tabla `payslips`/`payroll_runs` → payroll se recomputa cada request | `src/services/payroll*` |
| 18 | 04 | Meal-break deduction ciega (resta 0.5h sin verificar que break se tomó) | `calculate-payroll/index.ts:174-196` |
| 19 | 05 | Backup PII (payroll/IRD) sin cifrar en GHA Artifacts, 30d retention | `backup.yml:67` |
| 20 | 05 | Security scanners (Semgrep/ZAP/Gitleaks) todos non-blocking | `security.yml` |
| 21 | 06 | Sentry ingest (`*.ingest.sentry.io`) falta en CSP → error reporting bloqueado en prod | `vercel.json` |
| 22 | 06 | `VITE_GEMINI_API_KEY` en `.env.example` → key facturable bundled a cliente | `.env.example` |
| 23 | 07 | 38 repositories destructuran `data` sin chequear `error` (misma clase bug 2026-04-14) | `src/repositories/*.ts` |
| 24 | 08 | `useInspectionHistory.ts:75-116` devuelve DEMO HARDCODED data — QC page muestra ficción | — |
| 25 | 08 | `MessagingContext.tsx:411` useEffect dep sobre `.current` → canal Supabase stuck null | — |
| 26 | 08 | `MFAGuard` fail-open en catch → race identity-swap puede conceder acceso al user equivocado | — |
| 27 | 09 | `SyncStatusBadge` lee localStorage keys que nadie escribe → siempre dice "Synced" | — |
| 28 | 10 | `vitest.config.integration.ts` es fachada: 11 integration tests mockean `supabase`, violan regla "real DB" | — |
| 29 | 10 | 0 unit tests para 10 edge functions Deno (incluye `calculate-payroll` math) | — |
| 30 | 12 | Regex secret-scan solo matchea literal `SUPABASE_SERVICE_ROLE_KEY` → renombrarlo lo bypass | `security.yml:80-86` |
| 31 | 13 | N+1 serial en `mpi-export.service.ts:180` — 500 bins = 1000 round-trips | — |
| 32 | 14 | `ErrorBoundary.tsx:84-88` renderiza `error.toString()` crudo a prod users → leak SQL/RLS constraint names | — |
| 33 | 14 | PostHog recibe PII sin scrubear (email, picker_id) → NZ Privacy Act exposure | — |
| 34 | 14 | `row.repository.ts:44` bug no arreglado desde 2026-04-14 (warn en vez de throw) | — |

---

## REGRESIONES DETECTADAS (fixes previos incompletos)

| Finding previo | Estado 2026-04-22 |
|---|---|
| `ERRORES.md` 2026-04-14: `row.repository.ts:44` silent-fail | 🔴 Solo se arregló el string value, el `logger.warn` en vez de `throw` sigue ahí |
| AUDIT 2026-04-19 C-1: 14 tablas `USING(true)` | 🟡 7 arregladas, 10 siguen abiertas (parcial) |
| AUDIT 2026-04-19 C-2: bug `audit_log` vs `audit_logs` singular | 🔴 Ahora hay bug más grave: columnas del `audit_logs` no existen en el schema |
| AUDIT 2026-04-19 C-3: MFA config comentado | 🔴 Sigue comentado; código cliente llama pero servidor falla |
| AUDIT 2026-04-19 H-1: orphan user `00000000…` | 🔴 Sin tocar |
| AUDIT 2026-04-19 H-5: 30,464 duplicados en `bucket_records` | 🔴 Sin tocar |
| CVE `dompurify`/`protobufjs` (commit 66e1d85) | ✅ Resueltos |
| Type guards en `database.types.ts` regenerado | ✅ Intactos |
| Drift `HarvestSettings` fields | ✅ Resuelto |
| Regex secret-scan HP-INFRA-03 | 🟡 Regex correcto para `SUPABASE_SERVICE_ROLE_KEY` literal pero bypasseable con rename |

---

## PLAN DE TRIAGE SUGERIDO (3 fases)

### Fase 1 — Freeze + rotar secretos (HOY, ~4h)
1. Rotar service_role key del proyecto `bfglk…` en Supabase dashboard
2. Rotar password Postgres
3. `git filter-repo` para scrubbear `scripts/setup-db.cjs:10-12` del historial (coordinar porque reescribe SHAs)
4. Deshabilitar signup hasta arreglar #2 (privilege escalation)
5. Revocar todas las sesiones activas (`auth.users` logout masivo)

### Fase 2 — Fixes críticos (3-5 días)
- CRITs #2, #3, #4, #5 (seguridad + signup + audit_logs)
- CRITs #7, #8 (payroll doble-cobro + wage floor)
- CRITs #9, #10 (queue robustness)
- CRIT #11 (qc-photos privacy + DELETE)
- CRIT #12 (CI concurrency + permissions)
- Fase 1 de payroll compliance: crear tabla `payslips` inmutable

### Fase 3 — Pre-release (1-2 semanas)
- Arreglar los ~20 HIGH notables de la tabla anterior
- Añadir `noUncheckedIndexedAccess` en tsconfig y arreglar el fallout
- Backfill audit retention a 6 años
- Dedup 30k buckets + añadir UNIQUE constraint
- Arrancar integration tests reales (no mocks) en CI
- Añadir unit tests para edge functions (especial `calculate-payroll`)
- Añadir AbortController a los 8 hot-spots de race + focus trap real en modales

### Fase 4 — Re-audit
- Pasar los mismos 14 slices otra vez tras Fase 2
- Release a staging con 5-7 días beta internos antes de prod

---

## ANEXOS

- `01_supabase_migrations_sql.md` — 32 findings + validation queries
- `02_rls_auth_security.md` — 31 findings
- `03_edge_functions.md` — 25 findings
- `04_payroll_nz_compliance.md` — 18 findings + statute references
- `05_cicd_github_actions.md` — 25 findings
- `06_vercel_build_config.md` — 18 findings
- `07_typescript_safety.md` — 13 findings
- `08_react_components_hooks.md` — 44 findings
- `09_state_sync_offline.md` — 17 findings
- `10_testing_quality.md` — 16 findings
- `11_dependencies_supply_chain.md` — 8 findings (CVE: 0)
- `12_secrets_env_config.md` — 14 findings
- `13_performance_bundle.md` — 18 findings
- `14_error_handling_logging.md` — 17 findings

Total: **296 findings** documentados en **~15 MB de análisis estático**.
