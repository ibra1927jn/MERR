# ERRORES.md — Lo que no volvemos a hacer

## Formato
[Fecha] | [Archivo afectado] | [Error] | [Fix aplicado]

---

## Errores registrados (2026-04-13 — v2 post-revisión)

- [2026-04-13] | useLoginAnimations.ts | Typewriter se quedaba colgado en el último carácter: `return () => clearInterval(interval)` era el valor de retorno del callback de setTimeout, no la cleanup de useEffect. useEffect solo limpiaba clearTimeout pero no el interval que seguía corriendo | Fix: useRef para intervalRef + timeoutRef, cleanup borra ambos
- [2026-04-13] | PickerProfileDrawer.tsx | Pickers con buckets pero sin attendance record mostraban HOURS:0 EARNED:$0 — la tasa horaria se calculaba como 0/0 | Fix: derivedEarnings = todayBuckets * pieceRate cuando todayHours===0 && todayBuckets>0; mostrar "Not started yet" neutral en lugar de rojo
- [2026-04-13] | analytics.service.ts calculateETA | Hardcoded `endOfDay.setHours(17,0,0,0)` ignoraba shift_end_time configurado por el manager → ETA incorrecta y jitter por wall-clock re-renders | Fix: parámetro shiftEndTime='17:00', parseo HH:MM; DashboardView lo ancla en useMemo deps
- [2026-04-13] | DashboardView.tsx | `// eslint-disable-next-line react-hooks/exhaustive-deps` en el useMemo de ETA era redundante tras agregar shiftEndTime a deps → pre-commit hook falló (unused disable directive) | Fix: remover directiva; las deps son correctas
- [2026-04-13] | Manager.tsx + WageShieldPanel.tsx | Variables desestructuradas de hooks (removePicker, updatePicker, assignRow, handleSendMessage, onUserSelect) no usadas → pre-commit lint fallo | Fix: prefijo _ para vars sin uso
- [2026-04-13] | VelocityChart.tsx | Subtítulo cambiado a 'Last 8 hours · 24h format' rompió velocity-chart.test.tsx (buscaba 'Last 8 hours') | Fix: revertir subtítulo a 'Last 8 hours' exacto

## Errores registrados (2026-04-13 — Round 2 sprint)

- [2026-04-13] | mocks/data/index.ts | mockDailyAttendance usaba check_in/check_out pero picker-history.service lee check_in_time/check_out_time → hours=0 para todos los pickers activos | Fix: renombrar campos en mockDailyAttendance
- [2026-04-13] | mocks/data/index.ts | TLs y Runners (agregados vía push separado) no tenían rows en la tabla mockDailyAttendance → horas 0 en drawer | Fix: makeTLRunnerAttendance() + (mockDailyAttendance as unknown[]).push()
- [2026-04-13] | mocks/data/index.ts | row_assignments mock no tenía campo status:'active' → storeSync .eq('status','active') retornaba vacío → block progress 0/20 | Fix: agregar status:'active' a cada mockRowAssignment
- [2026-04-13] | analytics-trends.service.ts | c.total_cost undefined en mock (mock usa total_earnings) → NaN → dots SVG en y=0 (crammed top edge) | Fix: const cost = c.total_cost ?? c.total_earnings ?? 0
- [2026-04-13] | PickerProfileDrawer.tsx | Details section mostraba "Current Row" genérico para runners — debía ser "Current Route: Block A → Bin Station 1" | Fix: if(pickerInCrew.role === 'runner') usar getRouteLabel(current_row)

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

## P3 — Deuda tecnica (sesion 2026-04-11)

- [2026-04-11] | utils/weeklyReportSections.ts:10-13 | Importaba NZ_MINIMUM_WAGE_2024 (=23.15) para colorear pickers en reporte PDF — usaba tasa incorrecta para 2026-2027 | FIXED: Cambiado a NZ_MINIMUM_WAGE_2026 (23.95). Patron: al actualizar salario minimo revisar tambien archivos de reporte/export
- [2026-04-11] | services/__tests__/compliance.service.test.ts:131-134 | top-up assertion era 20.3 (calculo con $23.15×2h=$46.30) — se perdio en la actualizacion masiva de salario minimo de abril | FIXED: Actualizado a 21.9 ($23.95×2h=$47.90, top-up=$47.90-$26.00=$21.90). Registrado en ERRORES.md para evitar repeticion
- [2026-04-11] | services/__tests__/analytics.service.test.ts, export.service.test.ts | Importaban MINIMUM_WAGE y PIECE_RATE desde @/types/app.types (deprecated) | FIXED: Movidos a import desde @/constants/nz-law usando aliases (NZ_MINIMUM_WAGE_2026 as MINIMUM_WAGE)

## P3 — Deuda tecnica

- [2026-03-28] | context/AuthContext.tsx:282-285 | completeSetup era dead code (no-op stub) en la interfaz del context | FIXED (sesion anterior): Ya eliminado — no existe en el codigo actual
- [2026-03-28] | types/app.types.ts:226-229 | Constantes MINIMUM_WAGE=$23.50 y PIECE_RATE=$6.50 deprecated pero aun exportadas | FIXED [2026-03-28]: MINIMUM_WAGE corregido a $23.15 (NZ Minimum Wage 2025-2026). Marcado @deprecated con referencia a nz-law.ts y nz-tax-rates.ts
- [2026-03-28] | nz-payroll-deductions.service.ts | Tramos PAYE hardcodeados con valores 2024-25 ($14k/$48k/$70k) — incorrectos para 2025-26 ($15.6k/$53.5k/$78.1k). Minimum wage $23.50 en multiples archivos (deberia ser $23.15) | FIXED [2026-03-28]: Creado config/nz-tax-rates.ts con versionado por ano fiscal. Servicio de deducciones ahora lee tasas dinamicamente. Corregidos 15+ archivos con $23.50→$23.15. Corregido check-compliance edge function
- [2026-03-28] | compliance.config.json | minimumWage.hourlyRate era $23.50 — incorrecto para 2025-2026 ($23.15) | FIXED [2026-03-28]: Corregido a 23.15
- [2026-03-28] | repositories/baseRepository.ts:217-224 | 8 repos pre-built tipados como Record<string, unknown> — sin type safety | FIXED (sesion anterior): Ya tipados con Tables<'users'>, Tables<'daily_attendance'>, etc. de database.types.ts
- [2026-03-28] | context/AuthContext.tsx:332 | signOut() en auth state listener puede recursear si SIGNED_OUT event lo llama mientras ya esta en curso | FIXED [2026-04-11]: isSigningOutRef guard — early return si ya se esta ejecutando, reset en finally antes del reload

## P2 — Tests/DX

- [2026-03-28] | vitest.config.ts | Test workers OOM en 16GB RAM — pool por defecto (threads) comparte heap entre workers | FIXED [2026-03-28]: pool='forks' + maxForks=2 + fileParallelism=false — suite completa sin OOM (350/365 pass, 3742/3751 tests). Los 14 failures restantes son imports rotos (../types, ./sticker.service, etc.) — no OOM

## E2E / Playwright (sesion 2026-04-11 tarde)

- [2026-04-11] | playwright.config.ts | workers por defecto (8+) causa rate limit de Supabase auth — 225/278 tests fallan con TimeoutError en login | FIXED: workers=2 + global-setup storageState (autenticar 1 vez por rol, no 278 veces)
- [2026-04-11] | e2e/utils/sync-helper.ts:21 | Email teamleader@harvestpro.nz inexistente — seed usa lead@harvestpro.nz | FIXED: lead@harvestpro.nz
- [2026-04-11] | src/services/native-scanner.service.ts | Dynamic import('@capacitor-community/barcode-scanner') con string literal — Vite pre-transform lanza error overlay en dev mode aunque el paquete no esté instalado | FIXED: string concatenation `'@capacitor-community' + '/barcode-scanner'` previene análisis estático
- [2026-04-11] | scripts/seed-users.js | `"type": "module"` en package.json incompatible con require() | FIXED: renombrar a .cjs para CommonJS explícito
- [2026-04-11] | supabase/config.toml | major_version=15 pero proyecto remoto es PostgreSQL 17 → supabase link falla | FIXED: major_version=17

## TypeScript
- [2026-03-27] | global | Usar any en tipos → errores en runtime silenciosos | Tipar siempre explicitamente, especialmente payloads de DB
- [2026-03-29] | src/hooks/useRunnerData.ts | DisplayInventory.raw tipado como Record<string,unknown>[] en vez de Bin[] — incompatible con el store real (Bin[]). UseRunnerDataResult.crew tipado como Record<string,unknown>[] en vez de Picker[]. UseRunnerDataResult.orchard tipado como Record<string,unknown>|null en vez del tipo real del store — causaba que .id fuera unknown | FIXED: raw→Bin[], crew→Picker[], orchard→{id:string;name?:string;total_rows?:number}|null. Import de Bin y Picker desde @/types/app.types
- [2026-03-29] | src/hooks/useRealtimeSubscription.ts | channelConfig tipado como Record<string,unknown> — no satisface los overloads de Supabase .on('postgres_changes') que requieren tipos literales exactos | FIXED: channelConfig sin tipo explicito + cast as any para bypassear overload resolution
- [2026-03-29] | src/pages/Runner.tsx | orchardId={runner.orchard?.id || ''} producía tipo unknown porque orchard era Record<string,unknown>|null | FIXED indirectamente: corregido el tipo de orchard en UseRunnerDataResult

## P3 — Tests (sesion 2026-04-12)

- [2026-04-12] | payroll.service.test.ts | MOCK_PAYROLL_RESULT usaba minimum_required=188.00 calculado con $23.50/hr pero min_wage_rate=23.95 — 11 tests fallaban. Patron: al cambiar el salario minimo, actualizar TAMBIÉN los mocks de test no solo el codigo de produccion. Checklist: minimum_required, top_up_required, total_earnings, summary.total_top_up, summary.total_earnings | FIXED [2026-04-12]: todos los valores actualizados a 8h*$23.95=$191.60
- [2026-04-12] | DaySettingsModal.test.tsx + compliance.deep.test.ts + compliance.service.test.ts + export.deep.test.ts | Tests con valor literal "23.15" hardcodeado no detectados en sweep inicial — buscamos por nombre de constante (NZ_MINIMUM_WAGE_2025) pero no por valor numerico ("23.15"). Requirió 3 runs de server para descubrirlos todos. REGLA: al actualizar un valor numerico de negocio, siempre grep por el valor literal además del nombre de constante | FIXED [2026-04-12]: Assertions actualizadas una a una en cada run

## P0 — 2026-04-12

- [2026-04-12] | supabase/functions/calculate-payroll/index.ts:85-95 | Edge function leia bucket_rate y min_wage_rate de tabla 'orchards' — columnas que NO existen. El schema real tiene estos datos en 'harvest_settings' (piece_rate + min_wage_rate). Error descubierto al intentar aplicar migración — la columna simplemente no existe | FIXED [2026-04-12]: Edge function actualizada para leer de harvest_settings con .eq('orchard_id', orchard_id). piece_rate mapeado a bucket_rate. Floor legal 23.95 añadido con Math.max(). 10 registros harvest_settings actualizados a $23.95 via service_role key. MFAGuard extendido a admin/payroll_admin/hr_admin
- [2026-04-12] | supabase/migrations/20260401_minimum_wage_2026.sql | Migración actualizaba tabla 'wage_rates' que está vacía — no tenía ningún efecto real. La tabla operativa es 'harvest_settings'. El audit no detectó esto porque las migraciones se ven correctas pero la tabla wage_rates no se usa en ningún Edge Function | LECCIÓN: siempre verificar que la tabla que modifica la migración tiene datos reales y que el código la usa

## P2 — Manager View bugs (sesion 2026-04-13)

- [2026-04-13] | src/mocks/data/index.ts | Timestamps UTC (`.toISOString()`) en bucket records no coincidían con `todayNZST()` (Pacific/Auckland). En NZ (UTC+12/+13) la fecha UTC es el día anterior → `filteredBucketRecords` devolvía vacío → Production=0, Active Crew=0, Block progress=0, Unknown names. PATRÓN: siempre generar timestamps mock en timezone NZ usando `Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' })` o `Date.now()-Xh` relativo | FIXED: `_nzFmt` + `toNZTimestamp()` helper + `TODAY`/`YESTERDAY`/`CHECK_IN` con offset `+12:00`

- [2026-04-13] | src/hooks/useSettings.ts:handleChange | `handleChange` para `piece_rate`/`min_wage_rate` no actualizaba `min_buckets_per_hour` cuando el floor *disminuía*. `useEffect` solo actualiza si `prev <= floor`, pero cuando piece_rate aumenta (floor baja) el valor viejo > nuevo floor → stays stuck → mostraba "(override)" falso. PATRÓN: al cambiar un valor derivado, comparar contra el floor ANTERIOR para detectar si el valor era floor-tracking | FIXED: calcular `oldFloor` y `newFloor` dentro de `handleChange`, actualizar si `prev.min_buckets_per_hour <= oldFloor`

## P2 — Mock handlers (sesion 2026-04-13 Phase 2)

- [2026-04-13] | src/mocks/handlers/functions.ts:18 | `const PIECE_RATE = 1.20` hardcodeado — cada balde valía $1.20 en vez de $6.50. Todos los pickers parecían violar el salario mínimo (piece_earnings << min_wage), y check-compliance devolvía siempre `compliant:true`. PATRÓN: nunca hardcodear tarifas económicas en handlers — leer siempre desde `mockDatabase['harvest_settings'][0].piece_rate` | FIXED [2026-04-13]: PIECE_RATE leído del store mock. check-compliance ahora calcula violaciones reales dinámicamente

- [2026-04-13] | src/mocks/handlers/database.ts:62 | `close_payroll_period` RPC devolvía totales del sprint anterior (349 buckets, 23 pickers, $418). PATRÓN: al reescribir datos mock, actualizar también los handlers RPC que hardcodean totales | FIXED [2026-04-13]: 489 buckets, 173.5h, $4182, 26 pickers

## P2 — MSW mock mode (sesion 2026-04-13)

- [2026-04-13] | src/mocks/data/index.ts:38 | MORNING_START_MS usaba UTC fijo `${TODAY}T07:30:00Z`. En NZ (UTC+12) a cualquier hora local del día, la medianoche local es el mediodía UTC → timestamps 07:30-11:30Z caen ANTES de la medianoche local → filteredBucketRecords devuelve 0 buckets. PATRÓN: en datos mock, nunca usar horas UTC fijas cuando el filtro es por fecha local. Usar siempre Date.now()-Xh | FIXED [2026-04-13]: MORNING_START_MS=Date.now()-4h, generateBuckets startMs/endMs relativos

- [2026-04-13] | src/mocks/data/index.ts:298-316 | mockPickers solo tenía role='picker' para los 24 cosechadores. James Wilson y Sarah Ngapo existían en mockUsers pero no en la tabla pickers → crew.filter(p=>p.role==='team_leader') devolvía [], RunnersSection mostraba 0 runners. PATRÓN: en la app real los TLs/runners también tienen registro en tabla pickers (son parte del crew) | FIXED [2026-04-13]: Añadidos TLs y runners a mockPickers con sus roles correctos via mockPickers.push()

- [2026-04-13] | src/mocks/data/index.ts:622-650 | Mock broadcasts solo tenían campos message/priority/sent_at. Faltaban title, content, acknowledged_by (array), target_roles → crash al hacer acknowledged_by.includes() sobre undefined | FIXED [2026-04-13]: Añadidos todos los campos requeridos por el tipo Broadcast

## P0 — MSW handler format mismatch (sesion 2026-04-13 sprint 9-bugs)

- [2026-04-13] | src/mocks/handlers/functions.ts (calculate-payroll) | Handler devolvía `{ success: true, data: { breakdown: [{wage_shield_applied, final_earnings}] } }`. PayrollResultSchema (Zod) espera exactamente `{ orchard_id, date_range, summary, compliance, picker_breakdown: [{piece_rate_earnings, hourly_rate, minimum_required, top_up_required, is_below_minimum}], settings }`. validateResponse() lanzaba excepción → catch silencioso → pickers=[] → TODAS las analíticas en 0 (CostAnalyticsView, WeeklyReportView). PATRÓN CRÍTICO: cuando el MSW handler cambia de formato, cualquier componente que use validateResponse() + Zod fallará silenciosamente → revisar siempre que el handler mock coincida exactamente con el schema Zod de la Edge Function real | FIXED [2026-04-13]: Handler reescrito para devolver el formato exacto de PayrollResultSchema. Los campos se calculan dinámicamente desde mockDatabase['pickers_performance_today']

- [2026-04-13] | src/services/picker-history.service.ts:109-112 | hours = 0 cuando check_out_time = null (picker activo sin checkout). Todos los pickers activos en turno mostraban 0h en PickerProfileDrawer (drawer lateral), velocidad=0, effective rate=0. PATRÓN: workers activos no tienen check_out_time — siempre estimar desde check_in_time cuando check_out_time es null | FIXED [2026-04-13]: `a.check_in_time ? Math.max(0, (Date.now() - new Date(a.check_in_time).getTime()) / 3600000) : 0` como fallback

- [2026-04-13] | src/components/modals/picker-details/PickerProfileView.tsx:28-31 | picker.hours=0 para los 23 pickers sin wage-alert (no tracked para compliance). Modal mostraba 0.0h, speed=0/hr, effective rate=$0/hr. picker.check_in_time estaba disponible pero no se usaba. PATRÓN: picker.hours es un flag de compliance, no el contador de horas real — para display usar check_in_time como estimador cuando hours=0 | FIXED [2026-04-13]: effectiveHours = picker.hours > 0 ? picker.hours : picker.check_in_time ? estimado desde Date.now() : 0

- [2026-04-13] | src/components/views/manager/WageShieldPanel.tsx:221-223 | Click en picker del WageShieldPanel llamaba TANTO openPickerProfile(id) (abre drawer lateral) COMO onUserSelect(picker) (abre modal PickerDetailsModal). Ambos componentes se abrían simultáneamente con datos diferentes (modal del store, drawer del picker-history service). PATRÓN: al agregar openPickerProfile() a un click handler, verificar si onUserSelect() ya está registrado en el mismo handler | FIXED [2026-04-13]: Eliminado onUserSelect?.(result.picker) del click handler — solo abre drawer
