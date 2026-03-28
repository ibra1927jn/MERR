# ERRORES.md — Lo que no volvemos a hacer

## Formato
[Fecha] | [Archivo afectado] | [Error] | [Fix aplicado]

---

## P0 — Rotos ahora mismo

- [2026-03-28] | sync.service.ts:156-204 | 3 tipos de sync queue (PICKER, QC_INSPECTION, UNLINK) no tienen processor — items se descartan silenciosamente. useManagerActions.ts:91 encola UNLINK pero nunca se ejecuta | FIXED [2026-03-28]: Processors existian en sync.service.ts y sync-processors/. Faltaba 'UNLINK' en PendingItem type union (types.ts:93) — addToQueue no aceptaba UNLINK como tipo valido. Agregado al union + test actualizado (types.test.ts)
- [2026-03-28] | supabase/functions/provision-orchard/ | Falta entrada en config.toml — verify_jwt=true por defecto bloquea el endpoint publico de signup. Ningun usuario nuevo puede registrarse | FIXED [2026-03-28]: Ya existia en config.toml con verify_jwt = false. Verificado.
- [2026-03-28] | supabase/functions/api-v1/index.ts:50,66 | Rate limiter lee request_count y last_used_at que no estan en el .select() — siempre undefined, rate limit no funciona | FIXED [2026-03-28]: .select() en linea 50 ya incluye request_count y last_used_at. Rate limiter funcional — verificado que lineas 64-66 leen correctamente ambos campos
- [2026-03-28] | supabase/functions/_shared/security.ts:111 vs schema_v3 | Roles en Edge Functions (owner, supervisor) no existen en DB (admin, team_leader). Edge Functions deniegan acceso a usuarios validos | FIXED [2026-03-28]: requireRole() ya usaba roles DB. Corregido BroadcastSchema en send-push (owner→admin, supervisor→team_leader, picker→todos los roles DB). Corregidos comentarios stale en 4 funciones. Corregido import _corsHeaders→corsHeaders en send-push. Corregido export handleCors→handlePreflight en cors.ts.

## P1 — Seguridad

- [2026-03-28] | supabase/functions/api-v1/index.ts:23 | CORS wildcard (*) en endpoint que expone datos de cosecha, payroll y attendance | FIXED [2026-03-28]: Reemplazado con corsHeaders(origin) de _shared/security.ts. Refleja origen solo si esta en allowlist
- [2026-03-28] | supabase/functions/api-v1/index.ts:191 | Usa SUPABASE_SERVICE_ROLE_KEY que bypasa todo RLS — un bug en routing expone datos cross-tenant | FIXED [2026-03-28]: Cambiado a SUPABASE_ANON_KEY (RLS activo) + validacion explicita de tenant con orchardId lookup
- [2026-03-28] | supabase/schema_v3_consolidated.sql:523 | quality_inspections tiene RLS enabled pero CERO policies — tabla inaccesible para todos los usuarios | FIXED [2026-03-28]: Migration 20260328_quality_inspections_rls.sql con SELECT/INSERT/UPDATE policies via bucket_records join + get_user_orchard_ids()
- [2026-03-28] | .env.local | VITE_DEMO_PASSWORD=111111 — cualquier variable VITE_ se bundlea al cliente. Password visible en produccion | FIXED [2026-03-28]: Variable removida de .env.local. Passwords de demo solo en seeds SQL y env vars de test
- [2026-03-28] | tests/e2e/login-flows.spec.ts:11-13, scripts/*.js | Passwords hardcodeados (111111, AcidTest2026!, Password123!) en tests y scripts | FIXED [2026-03-28]: Todos movidos a env vars (TEST_DEMO_PASSWORD, TEST_MANAGER_PASSWORD, TEST_ACID_PASSWORD, TEST_STRESS_PASSWORD). Fallbacks eliminados
- [2026-03-28] | config.service.ts:114, sentry.ts:48, env.validation.ts:20 | 3 versiones fallback distintas (4.2.0, 9.1.0, 9.3.0) vs package.json 9.9.0 | Unificar a leer de package.json o una sola constante

## P2 — Bugs funcionales

- [2026-03-28] | stores/storeSync.ts:218 | Row assignments siempre se reconstruyen con side='north' — pierde el lado real asignado | FIXED [2026-03-28]: Ahora fetcha row_assignments desde Supabase con side real. Fallback a crew data solo si no hay registros en servidor
- [2026-03-28] | supabase/functions/send-push/index.ts:5 | Importa _corsHeaders que no existe en security.ts (es corsHeaders sin underscore) | FIXED [2026-03-28]: Corregido _corsHeaders→corsHeaders
- [2026-03-28] | supabase/functions/_shared/cors.ts:6 | Re-exporta handleCors que no existe en security.ts (es handlePreflight) | FIXED [2026-03-28]: Corregido handleCors→handlePreflight
- [2026-03-28] | supabase/functions/provision-orchard/index.ts:64-73 | Validacion de email usa !email?.includes('@') — acepta '@' como email valido | FIXED [2026-03-28]: Reemplazada validacion manual con Zod schema (z.string().email()). Todos los campos validados con tipos estrictos
- [2026-03-28] | supabase/functions/provision-orchard/index.ts | Steps 3-5 (orchard_members, settings) no manejan errores — fallo parcial deja estado inconsistente | FIXED [2026-03-28]: Cada step (3-5) ahora chequea error y ejecuta rollback cascading (elimina registros previos + usuario)
- [2026-03-28] | config/webVitals.ts:12 | Import estatico de posthog-js bypasa lazy-load — race condition con posthog.init() | FIXED [2026-03-28]: Cambiado a dynamic import('posthog-js') dentro de sendToPostHog con try/catch

## P2 — Performance (indexes faltantes)

- [2026-03-28] | schema SQL | Falta index en bucket_records(orchard_id, scanned_at) — sequential scan en payroll y anomalias | CREATE INDEX
- [2026-03-28] | schema SQL | Falta index en daily_attendance(orchard_id, date) | CREATE INDEX
- [2026-03-28] | schema SQL | Falta index en pickers(orchard_id) — RLS hace full scan sin el | CREATE INDEX

## P3 — Deuda tecnica

- [2026-03-28] | context/AuthContext.tsx:282-285 | completeSetup es dead code (no-op stub) pero sigue en la interfaz del context | Eliminar
- [2026-03-28] | types/app.types.ts:226-229 | Constantes MINIMUM_WAGE=$23.50 y PIECE_RATE=$6.50 deprecated pero aun exportadas | Verificar valor actual NZ y eliminar export
- [2026-03-28] | repositories/baseRepository.ts:217-224 | 8 repos pre-built tipados como Record<string, unknown> — sin type safety | Tipar con interfaces de database.types.ts
- [2026-03-28] | context/AuthContext.tsx:332 | signOut() en auth state listener puede recursear si timing de ref es desfavorable | Agregar guard adicional o flag de signout-in-progress

## TypeScript
- [2026-03-27] | global | Usar any en tipos → errores en runtime silenciosos | Tipar siempre explicitamente, especialmente payloads de DB
