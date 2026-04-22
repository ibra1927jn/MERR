# 01 — Supabase Migrations & SQL

**Auditor:** Claude (DB slice)
**Fecha:** 2026-04-22
**Alcance:** 62 migraciones live en `supabase/migrations/` + `supabase/schema_v3_consolidated.sql` + `supabase/seeds/*` + `sql/*` + archives.
**Repo commit base:** posterior a `ec59f70 feat(hr): HR Documents upload/storage + Holidays Act s.60 payroll (#8)` (único commit tocando `supabase/` desde 2026-04-19).
**Regla aplicada:** Detectar y reportar. No refactor, no DB writes.
**Contexto:** Leído `AUDIT_2026_04_19_DEEP_REVIEW.md` (dimensión 1). No duplico findings ya resueltos; sí amplío / profundizo lo que quedó superficial.

---

## Summary

| Severidad | Conteo | Notas |
|-----------|--------|-------|
| CRITICAL  | 6      | Bugs latentes que rompen RPCs en runtime o permisos rotos |
| HIGH      | 9      | Drift serio schema↔migraciones, seeds incompatibles, triggers duplicados |
| MEDIUM    | 9      | Idempotencia, ordenación lex frágil, inconsistencias TZ |
| LOW       | 5      | Higiene, README desactualizado, nomenclatura |
| INFO      | 3      | Observaciones no accionables |

Total: **32 hallazgos nuevos / profundizados**.

> El audit previo (2026-04-19) cubrió RLS open policies, orphan user, duplicados bucket_records y SMTP fake. Este audit va más hondo en integridad de *migraciones, seeds y funciones RPC*, descubriendo **6 CRITICAL latentes** no reportados antes — entre ellos 3 funciones que fallan al ejecutarse (audit_logs columnas inexistentes + CHECK violation).

---

## Findings

### [CRITICAL] RPC `close_payroll_period` inserta en `audit_logs` con columnas inexistentes y viola CHECK

- **Location:** `supabase/migrations/2026021302_payroll_rpc.sql:85-101`
- **Detail:** La función `close_payroll_period` (filename 2026-02-13, aplicada DESPUÉS de schema_v3) hace:
  ```sql
  INSERT INTO public.audit_logs (action, table_name, record_id, old_data, new_data, performed_by)
  VALUES ('PAYROLL_CLOSE', 'payroll', p_orchard_id, NULL, v_result, auth.uid());
  ```
  - Columnas reales en `audit_logs` (schema_v3 línea 451): `user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at`. `old_data`, `new_data`, `performed_by` **no existen**.
  - CHECK en `action`: `action IN ('INSERT','UPDATE','DELETE','CUSTOM')`. El valor `'PAYROLL_CLOSE'` **viola el CHECK**.
- **Impact:** Cada cierre de payroll genera `42703 column does not exist` y/o `23514 check violation`. La transacción rollbackea. El cierre de payroll está **completamente roto en prod**. Silencioso porque la UI hace `catch` del error genérico. Conexo con el bug `mpi-export.service.ts:189 audit_log` (singular) del audit previo — hay un patrón sistémico de desalineación entre código y schema de `audit_logs`.
- **Recommendation:** Reescribir la INSERT a las columnas reales (`user_id, action, table_name, record_id, new_values`) y usar `action='CUSTOM'` + descripción en `new_values`. Añadir test de integración que invoque `close_payroll_period` contra DB real.

### [CRITICAL] RPC `correct_attendance` inserta en `audit_logs` con columnas inexistentes (fix 20260415 no arregló el bug)

- **Location:** `supabase/migrations/20260415000005_fix_correct_attendance_rpc.sql:40-58` (y 20260201000004 predecesor)
- **Detail:** La supuesta migration de "fix" del 15/04 corrige las columnas `check_in/check_out` en `daily_attendance` pero deja intacto el INSERT a `audit_logs (action, entity_type, entity_id, performed_by, new_values, notes)` — `entity_type, entity_id, performed_by, notes` **no existen**. Además `action='timesheet_correction'` también viola el CHECK `action IN ('INSERT','UPDATE','DELETE','CUSTOM')`.
- **Impact:** Toda corrección de timesheet (workflow HR común) falla silenciosa. El dato de la asistencia sí se actualiza si el INSERT a audit_logs falla DESPUÉS (pero está en la misma tx → rollback). Revisar si la función está siendo llamada desde la app y qué rutas hacen `.catch`.
- **Recommendation:** Reescribir el `INSERT INTO audit_logs` igual que en finding anterior. Test de regresión.

### [CRITICAL] `allowed_registrations` schema drift: `role` es GENERATED pero seeds/scripts intentan insertarlo

- **Location:** Tabla definida en dos migraciones incompatibles:
  - `supabase/migrations/20260101000000_schema_v3.sql:488-509` — `role TEXT GENERATED ALWAYS AS (assigned_role) STORED`
  - `supabase/migrations/20260223_allowed_registrations.sql:10-21` — `role TEXT NOT NULL CHECK (…)` (columna normal escribible)
  - Seed: `supabase/seeds/seed_production_admin.sql:29-34` — `INSERT INTO public.allowed_registrations (email, role, orchard_id, full_name) VALUES (…)`
- **Detail:** Como schema_v3 corre primero (filename 20260101 < 20260223) y la segunda es `CREATE TABLE IF NOT EXISTS`, la tabla queda con la definición GENERATED. Cualquier INSERT con columna `role` explícita falla: `42601 cannot insert into column "role" (is a generated column)`.
- **Impact:**
  - `seed_production_admin.sql` (bootstrap del primer manager) **falla** — impide onboarding de nuevo cliente usando la receta documentada.
  - `seed_test_accounts.sql:78` usa `assigned_role` (correcto), pero cualquier código frontend/backend que inserte `role` hardcoded también rompe.
- **Recommendation:** Unificar: o bien quitar el `GENERATED` de schema_v3 (y mantener la columna normal), o bien corregir todos los sitios de INSERT para usar `assigned_role`. Preferir la 2ª opción (mantener GENERATED asegura consistencia).

### [CRITICAL] Vista `pickers_performance_today` rota: filtra por `role='picker'` que no es un rol válido

- **Location:** `supabase/migrations/20260303_security_hardening.sql:50-99`
- **Detail:** La vista recreada el 2026-03-03 (override sobre la correcta de schema_v3 + la de `2026030100_fix_security_advisor_errors.sql`) usa `FROM public.users p` y `WHERE p.role = 'picker' AND p.is_active = true`. Pero `users_role_check` (schema_v3 línea 98-108 + 20260212) solo permite: `admin, manager, team_leader, runner, qc_inspector, hr_admin, payroll_admin, logistics` — **no existe 'picker'**. Pickers viven en `public.pickers`, no en `public.users`.
  - Como filename `20260303` > `2026030100`, la versión rota es la que queda aplicada.
- **Impact:** La vista **siempre devuelve 0 filas**. Rompe `attendance.service.ts` y `picker.service.ts` en prod (reportado en ERRORES.md:27 como "hours=0 para todos los pickers activos" — parcialmente mitigado en frontend pero la raíz DB sigue rota). Además el schema_v3 ya tenía una versión correcta de la vista que fue sobrescrita.
- **Recommendation:** Reemplazar la vista por la de `2026030100_fix_security_advisor_errors.sql` (joinea `public.pickers`). Eliminar la versión rota de `20260303_security_hardening.sql` en un nuevo migration fix.

### [CRITICAL] Seed `pilot_setup_cooper_lane.sql` viola CHECK `harvest_settings_min_wage_floor`

- **Location:** `sql/pilot_setup_cooper_lane.sql:12-22`
- **Detail:** Inserta `harvest_settings.min_wage_rate = 23.50` y on conflict también `UPDATE SET piece_rate = 6.50, target_tons = 40.0` (no toca min_wage_rate, pero si la fila se inserta new, el DEFAULT del schema_v3 original es 23.50 — ya corregido en 20260414 a 23.95).
  - CHECK `harvest_settings_min_wage_floor CHECK (min_wage_rate >= 23.95)` añadido en `supabase/migrations/20260412_orchards_min_wage_floor.sql:19-20`.
- **Impact:** Cualquier ejecución del setup script del pilot post-2026-04-12 falla con `23514 new row violates check constraint`. El cliente no puede ser provisionado.
- **Recommendation:** Actualizar el seed a `min_wage_rate=23.95`. Preferir `INSERT … ON CONFLICT (orchard_id) DO UPDATE SET min_wage_rate = EXCLUDED.min_wage_rate, piece_rate = EXCLUDED.piece_rate …`.

### [CRITICAL] Seed `sql/seed_orchards.sql` inserta columna `hectares` que no existe

- **Location:** `sql/seed_orchards.sql:5-23`
- **Detail:** `INSERT INTO public.orchards (id, name, location, total_rows, hectares) VALUES (…)` — la columna `hectares` no está definida ni en `schema_v3_consolidated.sql` ni en ninguna migration. Se confirma con `grep -rn "hectares" supabase/migrations/ supabase/schema_v3_consolidated.sql` → sin resultados.
- **Impact:** Seed falla con `42703 column "hectares" does not exist`. Si alguien intenta seed-ar orchards reales con este script en un ambiente limpio, no puede.
- **Recommendation:** Añadir `ALTER TABLE orchards ADD COLUMN IF NOT EXISTS hectares NUMERIC(6,2)` en una migración, o eliminar la columna del seed.

---

### [HIGH] Seed `supabase/seeds/seed_today_harvest_data.sql` inserta columna `check_in_time` que no existe

- **Location:** `supabase/seeds/seed_today_harvest_data.sql:197`
- **Detail:** `INSERT INTO public.daily_attendance (picker_id, orchard_id, date, status, check_in_time, hours_worked)` — la columna real es `check_in` (schema_v3:269), renombrada en `20260415000000_fix_check_in_rpc.sql`. El seed sigue usando el nombre viejo.
- **Impact:** Seed de datos del día para demo rompe con `42703`. Desarrolladores nuevos que intenten seed local se bloquean.
- **Recommendation:** `check_in_time` → `check_in`. Mismo cambio en `check_out_time`.

### [HIGH] Tres triggers superpuestos sobre UPDATE en `pickers`, `daily_attendance` y `harvest_settings`

- **Location:**
  - schema_v3 (`trg_pickers_version`, `trg_attendance_version`, `trg_row_assignments_version`) → fn `bump_version()`
  - `2026021703_optimistic_lock_trigger.sql` (`trg_pickers_occ`, `trg_attendance_occ`, `trg_settings_occ`) → fn `check_optimistic_lock()`
  - `20260226_verify_delta_sync_columns.sql` (`trg_bump_version_pickers`, `trg_bump_version_buckets`, `trg_bump_version_attendance`) → fn `bump_version_and_update_time()`
- **Detail:** En cada UPDATE a `pickers` o `daily_attendance` se disparan 2-3 triggers BEFORE UPDATE:
  1. `bump_version()` incrementa `version`, setea `updated_at`, lanza `40001` si OLD.version != NEW.version.
  2. `check_optimistic_lock()` verifica `OLD.updated_at != NEW.updated_at` y lanza `40001`, además resetea `updated_at=NOW()`.
  3. `bump_version_and_update_time()` hace lo mismo que bump_version (labels `expected/got` invertidos).
  
  ERRORES.md:14 ya reporta que backfills fallaron con P0001 por esto.
- **Impact:**
  - Lógica contradictoria: el check `OLD.updated_at != NEW.updated_at` en `check_optimistic_lock` es incorrecto (debería ser "esperado que cliente mande el OLD.updated_at y DB rechace si es diferente del actual"). Cualquier UPDATE que modifique `updated_at` falla con serialization_failure.
  - `40001` activa retries automáticos en algunos clientes PostgREST → loops.
  - `bump_version_and_update_time` tiene `expected v%, got v%` invertidos (dice OLD en "got" y NEW en "expected") — mensajes de error misleading.
- **Recommendation:** Consolidar en UN solo trigger por tabla. Borrar los duplicados. Corregir mensaje de error. Documentar contrato: "cliente pasa version cargada; DB incrementa".

### [HIGH] RLS policy "Check own registration" permite a cualquier authenticated leer TODO el whitelist

- **Location:** `supabase/migrations/20260223_allowed_registrations.sql:38-40`
- **Detail:**
  ```sql
  CREATE POLICY "Check own registration" ON public.allowed_registrations
  FOR SELECT USING (true);
  ```
  Cualquier JWT authenticated lee todos los emails, roles asignados, orchard_ids pre-autorizados.
  
  schema_v3 (20260101, aplicada ANTES) tiene la policy correcta: `USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))`. Pero 20260223 NO la dropea antes de crear la suya — y con nombre diferente, ambas coexisten. Supabase combina policies con OR, así que la permisiva gana.
- **Impact:** PII leak (emails de futuros empleados, roles pre-asignados = estructura org). NZ Privacy Act 2020 violation. Sensible especialmente para managers/hr_admin pre-asignados.
- **Recommendation:** `DROP POLICY "Check own registration" ON public.allowed_registrations;` en nueva migration. Mantener la restrictiva de schema_v3.

### [HIGH] RLS policy `broadcasts_view_policy` sin filtro orchard_id — leak entre huertos

- **Location:** `supabase/migrations/20260403100000_create_broadcasts_table.sql:27-29`
- **Detail:**
  ```sql
  CREATE POLICY "broadcasts_view_policy" ON public.broadcasts FOR SELECT
      USING (auth.role() = 'authenticated');
  ```
  Cualquier user authenticated ve broadcasts de todos los huertos. Aun cuando el modelo es multi-tenant por orchard_id.
- **Impact:** Managers de huerto A ven broadcasts operacionales de huerto B. Breach de confidencialidad comercial y privacidad.
- **Recommendation:** Añadir `AND orchard_id = get_auth_orchard_id()` o `OR is_manager()`.

### [HIGH] RLS `no_insert_on_closed_days` usa timezone UTC; el trigger anti-fraude usa Pacific/Auckland

- **Location:**
  - Policy: `supabase/migrations/20260210_day_closures.sql:51-62` (`DATE(bucket_records.scanned_at)` → UTC)
  - Policy corregida: `2026021107_rls_offline_closed_days.sql:26` (añade `AT TIME ZONE 'Pacific/Auckland'`)
  - Trigger: `enforce_closed_day_bucket_records` en schema_v3:715 (Pacific/Auckland)
- **Detail:** La 20260210 quedó como la policy "base" (luego 2026021107 añade una condición pero no dropea la anterior — hay que verificar en pg_policies). Entre 11pm-12am Auckland, la fecha UTC y la fecha NZ divergen → la policy y el trigger discrepan sobre qué día es "hoy".
- **Impact:** Durante 1h diaria, posibles races: inserciones que el trigger acepta pero RLS rechaza (o viceversa). En NZ con pickers trabajando tardes de verano, casos reales.
- **Recommendation:** Estandarizar en `AT TIME ZONE 'Pacific/Auckland'` en todas las policies + triggers que comparan `scanned_at` con `day_closures.date`. Auditar `pg_policies` en DB live para ver qué combinación aplica.

### [HIGH] Storage bucket `qc-photos` es PÚBLICO y permite SELECT TO public (sin auth)

- **Location:** `supabase/migrations/2026021300_create_qc_photos_bucket.sql:12-14, 28-30`
- **Detail:** `INSERT INTO storage.buckets … VALUES ('qc-photos', 'qc-photos', true, …)` — `public=true`. Además:
  ```sql
  CREATE POLICY "Public can view QC photos" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'qc-photos');
  ```
- **Impact:** Fotos de inspección QC (que pueden capturar pickers trabajando, equipo, producto, location metadata en EXIF) son accesibles públicamente con la URL. NZ Privacy Act implications si aparecen caras o matrículas. Compárese con `hr-documents` que sí es `public=false` (bien).
- **Recommendation:** Bucket `public=false` + policy `TO authenticated USING (bucket_id='qc-photos' AND EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.orchard_id = …))`. Considerar strippear EXIF al upload via Edge Function.

### [HIGH] `role='team-leader'` (con guion) en policies cuando la DB usa `team_leader` (underscore)

- **Location:** Múltiples policies en `supabase/migrations/2026021103_complete_rls.sql` (líneas 137, 147, 189, 199, 232), `2026021701_fix_bucket_records_rls.sql:31`, y archive.
- **Detail:** CHECK constraint `users_role_check` (schema_v3:98) acepta solo `team_leader` (underscore). Las policies con `role IN ('manager', 'team-leader')` nunca matchean — filtran team leaders del acceso.
  - Posteriormente `2026030101_rls_consolidation.sql` (filename 2026-03-01) recrea las policies correctamente con `team_leader`. Como 2026030101 > 2026021103, en runtime las buenas ganan PARA LAS TABLAS QUE SE CONSOLIDARON (messages, broadcasts, pickers, daily_attendance, bucket_records, users). Pero `2026021701_fix_bucket_records_rls.sql` viene DESPUÉS (2026-02-17 > 2026-02-11) y antes de 2026030101; 2026030101 sí cubre bucket_records, OK.
  - Verificar en pg_policies live si residua alguna con "team-leader".
- **Impact:** Inconsistencia que podría reintroducirse al re-aplicar migraciones antiguas. Landmine para `supabase db reset` desde scratch en nuevos devs.
- **Recommendation:** `sed` masivo `team-leader → team_leader` en las migraciones source (aunque sean overridden luego). Reduce confusión y previene futuros `supabase db reset` fallidos.

### [HIGH] Drift: `schema_v3_consolidated.sql` vs migration `20260101000000_schema_v3.sql` — diverge en ordering y en políticas

- **Location:** Ambos archivos difieren en 283 líneas (bloque desde línea 544 hasta ~826 de `schema_v3_consolidated.sql`).
- **Detail:** El "consolidated" snapshot tiene las policies intercaladas entre las DROP y las helpers, mientras que la migration real las deja al final (después del `SELECT 'Schema V3…' AS result;`). Además el consolidated **añade** `DROP POLICY IF EXISTS "Read own orchard"` (línea 543) que la migración no tiene en la posición equivalente (línea 1090 de migración crea la policy sin drop previo).
  - Línea 1090 de `20260101000000_schema_v3.sql`: `CREATE POLICY "Read own orchard" ON public.orchards` **sin DROP inmediatamente arriba**. Si la migration se re-ejecuta, falla con `42710 policy already exists`.
- **Impact:** (1) Migration no idempotente — imposible re-run sobre DB ya aplicada. (2) Consolidated deja de ser "single source of truth" (desactualizado).
- **Recommendation:** Añadir `DROP POLICY IF EXISTS "Read own orchard" ON public.orchards;` antes de la línea 1090 del migration. Regenerar `schema_v3_consolidated.sql` con `pg_dump --schema-only` o script propio.

### [HIGH] `sql/audit_logs.sql` define `audit_logs` con schema INCOMPATIBLE con migrations

- **Location:** `sql/audit_logs.sql:7-21`
- **Detail:** Crea `audit_logs` con columnas `event_type VARCHAR(50), severity, orchard_id, entity_type, entity_id, details JSONB` — completamente diferente del schema de la migración (`user_id, user_email, action, table_name, record_id, old_values, new_values, …`). `CREATE TABLE IF NOT EXISTS` evita el error en DB existentes, pero si se aplica este archivo en un env limpio, queda con el schema viejo e incompatible.
- **Impact:** Landmine para deployments nuevos. Si alguien ejecuta los archivos de `sql/` por error (como indica el comentario al inicio "Run this migration in your Supabase SQL Editor"), crea un schema roto que todas las funciones posteriores no pueden llenar.
- **Recommendation:** Borrar `sql/audit_logs.sql` o renombrar a `.deprecated`. Añadir aviso en `CLAUDE.md`.

---

### [MEDIUM] Migration `20260101000000_schema_v3.sql` no idempotente (CREATE POLICY sin DROP previo)

- **Location:** `supabase/migrations/20260101000000_schema_v3.sql:1090` (y revisar otras CREATE POLICY iniciales en el bloque final)
- **Detail:** Ver finding HIGH anterior. Re-ejecución falla. Además `DROP POLICY IF EXISTS "Read own orchard" ON public.orchards;` está en línea 543 pero la CREATE correspondiente está 547 líneas después, sin otro DROP inmediato.
- **Impact:** Un `supabase db reset` funciona (DB limpia), pero `supabase db push` tras modificar la migración o re-apply manual rompe.
- **Recommendation:** Añadir DROP IF EXISTS antes de cada CREATE POLICY.

### [MEDIUM] Prefijos de timestamp mezclan 8, 10 y 14 dígitos — sort lex frágil

- **Location:** `supabase/migrations/*.sql` — 9 migraciones con 14 dígitos, ~28 con 10, ~10 con 8.
- **Detail:** Ej: `20260210_day_closures.sql` (8), `2026021100_add_archived_at.sql` (10), `20260101000000_schema_v3.sql` (14). El orden lex actual *casualmente* coincide con el orden cronológico porque no hay colisiones en día. Pero si alguien añade `20260211_X.sql` (8 dígitos), ordenará DESPUÉS de `2026021100_…` (porque `"_"` (0x5F) > `"0"` (0x30)) aunque la intención fuese al inicio del día.
- **Impact:** Alto riesgo de bug en futuras migraciones — orden no-cronológico silencioso. Supabase CLI usa sort lex sobre el filename completo.
- **Recommendation:** Estandarizar a 14-dígitos (`YYYYMMDDHHMMSS_`) para todas las nuevas migraciones. Renombrar las existentes sería destructivo (rompe tracking de `schema_migrations`). Mínimo: añadir check en CI que rechace formatos mezclados.

### [MEDIUM] 10 scripts en `sql/` son "migrations huérfanas" no trackeadas

- **Location:** `sql/03_secure_rls.sql`, `sql/audit_logs.sql`, `sql/bucket_ledger.sql`, `sql/fix_runtime_errors.sql`, `sql/fix_runtime_errors_v2.sql`, `sql/pilot_setup_cooper_lane.sql`, `sql/scanned_stickers.sql`, `sql/seed_orchards.sql`, `sql/seed_scale_test.sql`. Más 14 en `supabase/archive/`.
- **Detail:** Ninguno está bajo `supabase/migrations/` pero varios contienen DDL (tablas, policies, funciones) que podrían aplicarse por error. Archivos en `supabase/archive/` incluyen `full_database_reset_v1.sql` con DROP TABLE CASCADE y `reset_database_v1.sql`/`reset_personal.sql` — matasistemas si se corren.
- **Impact:** Alta probabilidad de aplicación errónea. Desalineación con `supabase_migrations.schema_migrations`.
- **Recommendation:** Mover `sql/` a `sql/deprecated/` con header `-- DO NOT RUN` o borrar. Renombrar `supabase/archive/` a `supabase/archive_do_not_run/`. Añadir pre-commit hook que rechace ejecución manual.

### [MEDIUM] `ALTER PUBLICATION supabase_realtime ADD TABLE` sin guard en `20260403100000`

- **Location:** `supabase/migrations/20260403100000_create_broadcasts_table.sql:63`
- **Detail:** `ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;` — sin `DO $$ … EXCEPTION WHEN duplicate_object THEN NULL;`. Otras migraciones sí tienen el guard (schema_v3:1062, 2026021301:80, 2026021303:235).
- **Impact:** Re-run falla con `42710 relation "broadcasts" is already member of publication "supabase_realtime"`.
- **Recommendation:** Wrappear en DO block con EXCEPTION handler.

### [MEDIUM] `CREATE POLICY` en `20260331_create_wage_rates.sql` sin DROP previo

- **Location:** `supabase/migrations/20260331_create_wage_rates.sql:21-41`
- **Detail:** Dos `CREATE POLICY` ("Managers can manage wage rates", "Staff can read wage rates") sin `DROP POLICY IF EXISTS` antes. No idempotente.
- **Impact:** Re-run falla con `42710 policy already exists`.
- **Recommendation:** Añadir DROP IF EXISTS.

### [MEDIUM] `CREATE POLICY` en `20260403000000_privacy_consent.sql` sin DROP previo

- **Location:** `supabase/migrations/20260403000000_privacy_consent.sql:30, 33`
- **Detail:** Similar al anterior: 2 policies sin DROP.
- **Impact:** Re-run falla.
- **Recommendation:** Añadir DROP IF EXISTS.

### [MEDIUM] `20260226_verify_delta_sync_columns.sql` recrea `harvest_seasons` con CHECK distinto si no existe

- **Location:** `supabase/migrations/20260226_verify_delta_sync_columns.sql:13` (`status IN ('active','closed','archived')`)
- **Detail:** Schema_v3 tiene `status IN ('planning','active','closed','archived')` (4 valores). Esta migration `CREATE TABLE IF NOT EXISTS` skipea si la tabla ya existe, pero en DB limpia donde esta corriera antes de schema_v3, quedaría un CHECK restrictivo. Supabase CLI ordena por filename → schema_v3 (2026-01-01) siempre corre primero, así que en práctica no pasa. Aún así es deuda de código.
- **Impact:** Bajo en runtime, pero frágil ante reshuffles.
- **Recommendation:** Borrar la redefinición de la tabla en 20260226 (ya existe en schema_v3). Dejar solo ALTER COLUMN.

### [MEDIUM] `bump_version_and_update_time()` tiene mensaje de error con parámetros invertidos

- **Location:** `supabase/migrations/20260226_verify_delta_sync_columns.sql:77-81`
- **Detail:** `RAISE EXCEPTION 'Conflict: record modified by another user (expected v%, got v%)', NEW.version, OLD.version` — debería ser `OLD.version, NEW.version` (expected=lo que hay en DB, got=lo que cliente mandó). Compárese con `bump_version()` de schema_v3:596 que usa `OLD.version, NEW.version` correctamente.
- **Impact:** Mensaje misleading en logs — developers debuggean con valores invertidos. No afecta comportamiento funcional.
- **Recommendation:** Swap de argumentos.

### [MEDIUM] Seeds con hardcoded password `111111` carecen de guard robusto

- **Location:** `supabase/seeds/seed_test_accounts.sql:11-17`, `supabase/seeds/seed_role_users.sql:9-14`
- **Detail:** Guard: `IF current_database() ILIKE '%prod%' OR ILIKE '%production%' THEN RAISE EXCEPTION …`. Falla si el DB name es `app-main`, `live`, `customer-xyz`, `staging`, etc. Password `111111` no satisface política `GOTRUE_PASSWORD_MIN_LENGTH=8` → si se habilita, el seed también rompe.
- **Impact:** Posible creación de cuentas con credenciales triviales en ambientes no-prod-pero-shared. Aunque el audit previo lo mencionó indirectamente, no lo clasificó como finding. PII de los 8 roles base también está hardcoded.
- **Recommendation:** Guard adicional: `IF current_setting('app.environment', true) != 'local' THEN RAISE …`. Documentar en `SECURITY_RULES.md`.

---

### [LOW] `README.md` de migrations describe un `000_baseline.sql` que no existe

- **Location:** `supabase/migrations/README.md`
- **Detail:** README dice "Apply the single baseline: `000_baseline.sql`". No existe tal archivo. El inicial es `20260101000000_schema_v3.sql`. El README además menciona `audit_log` (singular) en lugar de `audit_logs`.
- **Impact:** Devs nuevos leen el README, ejecutan comandos que no aplican el baseline esperado, se frustran.
- **Recommendation:** Regenerar README (único fichero de doc en `migrations/`).

### [LOW] Prefijo duplicado: `20260223_` existe en `migrations/` y `migrations/archive/`

- **Location:** `supabase/migrations/20260223_allowed_registrations.sql` y `supabase/migrations/archive/20260223_allowed_registrations.sql` (nombres idénticos).
- **Detail:** Hay varias parejas: `20260223`, `20260226`, `20260227`, `20260303`, `20260414` están en ambos. Otras están solo en archive (`2026021101` vs `20260211`, etc.).
- **Impact:** Confusión. `archive/` no es picked up por Supabase CLI (siempre que se llame "archive"), pero nadie documentó que ésa sea la convención.
- **Recommendation:** Clarificar en README: "archive/ = referencia histórica; NO se aplica".

### [LOW] Migrations sin prefijo `public.` en referencias a tablas

- **Location:** `2026021103_complete_rls.sql` usa `users` sin `public.`, similar en `2026021101_audit_logging.sql`, etc. Schema_v3 sí usa `public.users`.
- **Detail:** Si `search_path` cambia (posible en entornos multi-schema o con extensions), las referencias sin prefijo resuelven mal. SECURITY DEFINER functions críticas pegadas a `search_path=public` mitigan esto, pero las migrations top-level no.
- **Impact:** Frágil ante configuraciones no-default.
- **Recommendation:** Lint regla: todas las referencias a objetos de `public.` deben calificar el schema. Añadir CI check.

### [LOW] `SECURITY DEFINER` funciones sin `SET search_path` todavía existen

- **Location:** `supabase/migrations/20260201000000_func_setup_orchard.sql:9`, `20260201000001_func_check_in.sql:6`, `20260201000002_func_check_out.sql:3`, `20260201000004_func_correct_attendance.sql:8`
- **Detail:** El audit previo (D1.5) mencionó 6 funciones con `proconfig IS NULL`. Las 4 anteriores se confirman desde source. Las versiones "fix" del 20260415 las reescriben pero TAMPOCO añaden `SET search_path`.
- **Impact:** CVE-2018-1058 class risk (ya reportado en audit previo).
- **Recommendation:** Añadir `SET search_path = public, pg_catalog` en las 4 funciones.

### [LOW] Documentación inline inconsistente: duración retention audit_logs

- **Location:** `2026021101_audit_logging.sql:150` (`INTERVAL '90 days'`) vs `schema_v3:810` (`INTERVAL '365 days'`).
- **Detail:** Dos definiciones de `cleanup_old_audit_logs()` con retention diferente. Como schema_v3 (20260101) corre primero y 2026021101 (2026-02-11) corre después, el final es **90 días**, contrario al comentario en schema_v3.
- **Impact:** Expectativa vs realidad: docs/ERRORES dicen 365d, DB hace 90d. Compliance (NZ Privacy Act — audit trail por *reasonable* period) podría requerir más tiempo.
- **Recommendation:** Decidir retention oficial, unificar en migration fresca. Considerar 7 años para registros payroll por NZ IRD law.

---

### [INFO] Estructura FK sólida: 73 FKs, 1 orphan (ya reportado)

- El audit previo confirmó 73 FKs con solo 1 row orphan (`users` UUID zero). La estructura es sólida. Sin nuevos hallazgos.

### [INFO] Todos los `CREATE TABLE` usan `IF NOT EXISTS`

- Confirmado: `grep -L "CREATE TABLE IF"` no devuelve resultados para ningún archivo con `CREATE TABLE`. Idempotencia base a nivel tabla está garantizada.

### [INFO] Migración `20260415000004_bucket_records_unique_scan.sql` bloqueada por data

- Ya reportado en audit previo (30,464 duplicados). La migration está escrita correctamente (DO block checks if constraint exists before adding). Pendiente: dedup + re-run. Sin acción nueva.

---

## Anexo: Queries recomendadas para validar hallazgos en DB live

```sql
-- Validar CRITICAL: policies duplicadas en allowed_registrations
SELECT policyname, qual FROM pg_policies WHERE tablename='allowed_registrations' ORDER BY policyname;

-- Validar CRITICAL: audit_logs columnas reales
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='audit_logs' AND table_schema='public' ORDER BY ordinal_position;

-- Validar CRITICAL: pickers_performance_today filtra sobre role='picker'
SELECT pg_get_viewdef('public.pickers_performance_today'::regclass, true);

-- Validar HIGH: triggers superpuestos
SELECT tgname, tgrelid::regclass AS tabla, tgfoid::regproc AS funcion
FROM pg_trigger WHERE tgrelid IN ('public.pickers'::regclass, 'public.daily_attendance'::regclass, 'public.harvest_settings'::regclass)
AND NOT tgisinternal ORDER BY tabla, tgname;

-- Validar HIGH: broadcasts RLS tenant leak
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename='broadcasts';

-- Validar MEDIUM: realtime publications
SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname='supabase_realtime';
```

## Anexo: Checklist de prioridad

### P0 (antes de release)
1. Fix `close_payroll_period` y `correct_attendance` audit_logs INSERT (2 CRITICAL — payroll + timesheet workflows rotos).
2. Fix `pickers_performance_today` view (bug vivo reportado en ERRORES.md).
3. Fix `allowed_registrations` schema collision (seed_production_admin falla).
4. Fix `broadcasts_view_policy` tenant leak.
5. Fix `seed_today_harvest_data.sql` y `sql/pilot_setup_cooper_lane.sql` (seeds rotos).

### P1 (1-2 semanas)
6. Consolidar triggers optimistic-locking (3 → 1 por tabla).
7. TZ consistency en RLS policies sobre day_closures.
8. `qc-photos` bucket a privado + EXIF strip.
9. Sustituir `sql/audit_logs.sql` por `.deprecated`.
10. Añadir guard `ALTER PUBLICATION` + `DROP POLICY IF EXISTS` en 3 migraciones.

### P2 (deuda)
11. Actualizar `README.md` migrations.
12. Estandarizar prefijos 14 dígitos para nuevos filenames.
13. Decidir retention `audit_logs` (90 vs 365 vs 7y).
14. Lint schema-qualification en CI.
