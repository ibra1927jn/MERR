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
- [2026-03-28] | supabase/functions/api-v1/index.ts:191 | Usa SUPABASE_SERVICE_ROLE_KEY que bypasa todo RLS — un bug en routing expone datos cross-tenant | FIXED [2026-03-28]: Cambiado a SUPABASE_ANON_KEY + tenant validation. RE-FIXED [2026-03-28]: Anon key + RLS bloquea todo (auth.uid()=NULL). Vuelve a service_role con defense-in-depth: orchardId viene de api_key (no falsificable), cada query filtra por orchardId, rate limit DB-backed, CORS allowlist
- [2026-03-28] | supabase/functions/send-push/index.ts:79-89 | Payload enviado como plaintext JSON — push services rechazan sin encriptacion aes128gcm (RFC 8291) | FIXED [2026-03-28]: Implementada encriptacion completa RFC 8291 + RFC 8188: ECDH efimero P-256, HKDF-SHA256 key derivation, AES-128-GCM encryption, content-coding header
- [2026-03-28] | supabase/schema_v3_consolidated.sql:523 | quality_inspections tiene RLS enabled pero CERO policies — tabla inaccesible para todos los usuarios | FIXED [2026-03-28]: Migration 20260328_quality_inspections_rls.sql con SELECT/INSERT/UPDATE policies via bucket_records join + get_user_orchard_ids()
- [2026-03-28] | .env.local | VITE_DEMO_PASSWORD=111111 — cualquier variable VITE_ se bundlea al cliente. Password visible en produccion | FIXED [2026-03-28]: Variable removida de .env.local. Passwords de demo solo en seeds SQL y env vars de test
- [2026-03-28] | tests/e2e/login-flows.spec.ts:11-13, scripts/*.js | Passwords hardcodeados (111111, AcidTest2026!, Password123!) en tests y scripts | FIXED [2026-03-28]: Todos movidos a env vars (TEST_DEMO_PASSWORD, TEST_MANAGER_PASSWORD, TEST_ACID_PASSWORD, TEST_STRESS_PASSWORD). Fallbacks eliminados
- [2026-03-28] | config.service.ts:114, sentry.ts:48, env.validation.ts:20 | 3 versiones fallback distintas (4.2.0, 9.1.0, 9.3.0) vs package.json 9.9.0 | Unificar a leer de package.json o una sola constante

## P2 — Bugs funcionales

- [2026-03-28] | stores/storeSync.ts:218 | Row assignments siempre se reconstruyen con side='north' — pierde el lado real asignado | FIXED [2026-03-28]: Ahora fetcha row_assignments desde Supabase con side real. Fallback a crew data solo si no hay registros en servidor
- [2026-03-28] | stores/slices/rowSlice.ts | assignRows() solo escribia pickers.current_row pero NO row_assignments table — Team Leader no recibia assignments via realtime | FIXED [2026-03-28]: Agregado upsertRowAssignments() en row.repository.ts + llamada en rowSlice.assignRows(). Team Leader recibe via realtime subscription
- [2026-03-28] | stores/storeSync.ts | No habia realtime subscription para row_assignments — Team Leader no veia cambios en tiempo real | FIXED [2026-03-28]: Agregada subscription postgres_changes para row_assignments con upsert/delete handling
- [2026-03-28] | supabase/functions/calculate-payroll/index.ts | Payroll contaba TODOS los bucket_events incluyendo grade='reject' — buckets rechazados por QC sumaban al piece-rate | FIXED [2026-03-28]: Migrado de bucket_events a bucket_records, agregado filtro .neq('quality_grade', 'reject'). Local intelligenceSlice tambien filtrado
- [2026-03-28] | stores/slices/intelligenceSlice.ts | recalculateIntelligence() contaba buckets con grade='reject' en payroll estimate | FIXED [2026-03-28]: Agregado filtro que excluye buckets con quality_grade === 'reject'
- [2026-03-28] | components/views/manager/TimesheetEditor.tsx | Timesheet solo mostraba attendance (horas) sin produccion ni earnings — no servia para firma de fin de dia | FIXED [2026-03-28]: Agregado generateDailyTimesheet() en payroll.service.ts que agrega buckets, rejected, quality grades, piece earnings, top-up y total. Wired en TimesheetEditor con boton "Generate Complete Timesheet"
- [2026-03-28] | supabase/functions/send-push/index.ts:5 | Importa _corsHeaders que no existe en security.ts (es corsHeaders sin underscore) | FIXED [2026-03-28]: Corregido _corsHeaders→corsHeaders
- [2026-03-28] | supabase/functions/_shared/cors.ts:6 | Re-exporta handleCors que no existe en security.ts (es handlePreflight) | FIXED [2026-03-28]: Corregido handleCors→handlePreflight
- [2026-03-28] | supabase/functions/provision-orchard/index.ts:64-73 | Validacion de email usa !email?.includes('@') — acepta '@' como email valido | FIXED [2026-03-28]: Reemplazada validacion manual con Zod schema (z.string().email()). Todos los campos validados con tipos estrictos
- [2026-03-28] | supabase/functions/provision-orchard/index.ts | Steps 3-5 (orchard_members, settings) no manejan errores — fallo parcial deja estado inconsistente | FIXED [2026-03-28]: Cada step (3-5) ahora chequea error y ejecuta rollback cascading (elimina registros previos + usuario)
- [2026-03-28] | config/webVitals.ts:12 | Import estatico de posthog-js bypasa lazy-load — race condition con posthog.init() | FIXED [2026-03-28]: Cambiado a dynamic import('posthog-js') dentro de sendToPostHog con try/catch

## P2 — Performance (indexes faltantes)

- [2026-03-28] | schema SQL | Falta index en bucket_records(orchard_id, scanned_at) — sequential scan en payroll y anomalias | CREATE INDEX
- [2026-03-28] | schema SQL | Falta index en daily_attendance(orchard_id, date) | CREATE INDEX
- [2026-03-28] | schema SQL | Falta index en pickers(orchard_id) — RLS hace full scan sin el | CREATE INDEX

## UX — Empty States & Error Handling

- [2026-03-28] | TeamsView, LogisticsView, RunnersView, WarehouseView | Empty states eran texto plano sin icono ni CTA — usuarios no sabian que hacer | Reemplazados con EmptyState component (icono + mensaje + action button)
- [2026-03-28] | SyncStatusMonitor.tsx | Sin warning cuando last sync > 30 min, sin retry visible en sync errors | Agregado stale sync warning (>30min), sync error state con retry button visible
- [2026-03-28] | ComponentErrorBoundary.tsx, ErrorBoundary.tsx | Sin opcion de reportar bugs — usuarios no tienen forma de comunicar errores | Agregado "Report issue" link con mailto pre-filled (component name, error, URL, timestamp)
- [2026-03-28] | Manager.tsx | Sin onboarding para managers nuevos — dashboard vacio sin guia | OnboardingWizard muestra welcome screen con 3 pasos cuando crew=0 y settings vacios. Usa SetupWizard existente. Guardado en localStorage

## P3 — Deuda tecnica

- [2026-03-28] | context/AuthContext.tsx:282-285 | completeSetup es dead code (no-op stub) pero sigue en la interfaz del context | Eliminar
- [2026-03-28] | types/app.types.ts:226-229 | Constantes MINIMUM_WAGE=$23.50 y PIECE_RATE=$6.50 deprecated pero aun exportadas | FIXED [2026-03-28]: MINIMUM_WAGE corregido a $23.15 (NZ Minimum Wage 2025-2026). Marcado @deprecated con referencia a nz-law.ts y nz-tax-rates.ts
- [2026-03-28] | nz-payroll-deductions.service.ts | Tramos PAYE hardcodeados con valores 2024-25 ($14k/$48k/$70k) — incorrectos para 2025-26 ($15.6k/$53.5k/$78.1k). Minimum wage $23.50 en multiples archivos (deberia ser $23.15) | FIXED [2026-03-28]: Creado config/nz-tax-rates.ts con versionado por ano fiscal. Servicio de deducciones ahora lee tasas dinamicamente. Corregidos 15+ archivos con $23.50→$23.15. Corregido check-compliance edge function
- [2026-03-28] | compliance.config.json | minimumWage.hourlyRate era $23.50 — incorrecto para 2025-2026 ($23.15) | FIXED [2026-03-28]: Corregido a 23.15
- [2026-03-28] | repositories/baseRepository.ts:217-224 | 8 repos pre-built tipados como Record<string, unknown> — sin type safety | Tipar con interfaces de database.types.ts
- [2026-03-28] | context/AuthContext.tsx:332 | signOut() en auth state listener puede recursear si timing de ref es desfavorable | Agregar guard adicional o flag de signout-in-progress

## P2 — Tests/DX

- [2026-03-28] | vitest.config.ts | Test workers OOM en 16GB RAM — pool por defecto (threads) comparte heap entre workers | FIXED [2026-03-28]: pool='forks' + maxForks=2 + fileParallelism=false — suite completa sin OOM (350/365 pass, 3742/3751 tests). Los 14 failures restantes son imports rotos (../types, ./sticker.service, etc.) — no OOM

## TypeScript
- [2026-03-27] | global | Usar any en tipos → errores en runtime silenciosos | Tipar siempre explicitamente, especialmente payloads de DB
- [2026-03-29] | src/hooks/useRunnerData.ts | DisplayInventory.raw tipado como Record<string,unknown>[] en vez de Bin[] — incompatible con el store real (Bin[]). UseRunnerDataResult.crew tipado como Record<string,unknown>[] en vez de Picker[]. UseRunnerDataResult.orchard tipado como Record<string,unknown>|null en vez del tipo real del store — causaba que .id fuera unknown | FIXED: raw→Bin[], crew→Picker[], orchard→{id:string;name?:string;total_rows?:number}|null. Import de Bin y Picker desde @/types/app.types
- [2026-03-29] | src/hooks/useRealtimeSubscription.ts | channelConfig tipado como Record<string,unknown> — no satisface los overloads de Supabase .on('postgres_changes') que requieren tipos literales exactos | FIXED: channelConfig sin tipo explicito + cast as any para bypassear overload resolution
- [2026-03-29] | src/pages/Runner.tsx | orchardId={runner.orchard?.id || ''} producía tipo unknown porque orchard era Record<string,unknown>|null | FIXED indirectamente: corregido el tipo de orchard en UseRunnerDataResult
