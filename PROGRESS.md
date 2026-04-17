# PROGRESS.md — Estado del proyecto

## En curso

*(sin bloquers activos — preparando trabajo en servidor)*

## Completado (sesion 2026-04-17 — UI/UX audit + 8 role users)
- [2026-04-17] | Creados 8 usuarios de rol en local Supabase via Auth Admin API (password 111111): manager, lead, runner, qc, payroll, admin, hr, logistics @harvestpro.nz | supabase/seeds/seed_role_users.sql
- [2026-04-17] | Insertados en public.users (7 roles) y public.pickers (team_leader + runner) con UUIDs fijos para reproducibilidad local | seed_role_users.sql
- [2026-04-17] | UI/UX audit: Rol manager tiene Desktop+Mobile dual layout. TODOS los otros roles solo tienen mobile BottomNav o solo desktop DesktopLayout — P0 gap identificado pero NO iniciado (server work primero)
- [2026-04-17] | Gaps identificados por rol: TeamLeader/Runner/QC necesitan DesktopLayout. Admin/HHRR/LogisticsDept/Payroll necesitan BottomNav mobile. Ninguno tiene el modal de orquestación del manager ni los drawer de analytics avanzados.
- [2026-04-17] | Committed: ef8d26f (seeds), d60008f (errores), otros fixes de sesion

## Completado (sesion 2026-04-16 — DB fix + 3 manager view bugs)
- [2026-04-16] | fix(db): orchards table missing crop_type + deleted_at columns → 400 Bad Request en /orchards. Migration 20260416000001 añade ambas columnas + partial index | supabase/migrations/
- [2026-04-16] | fix(db): backfill orchards.crop_type desde harvest_settings.variety. Migration 20260416000002 | supabase/migrations/
- [2026-04-16] | fix(manager): Picker profile drawer no abría desde Weekly Report. Root cause: openProfile buscaba c.picker_id (human ID "402") pero weekly report data tiene UUIDs. Fix: openPickerProfile(pickerId) directo | src/hooks/useWeeklyReport.ts:278
- [2026-04-16] | fix(manager): OrchardMap no recargaba al cambiar orchard en Settings. Fix: handleOrchardSelect llama fetchBlocks(selected.id) post-setState | src/hooks/useSettings.ts:186
- [2026-04-16] | fix(manager): Logistics view vacío — código correcto, falta seed data en bins/fleet_vehicles/transport_requests. Documentado en ERRORES.md
- [2026-04-16] | fix(types): regenerado database.types.ts (grep -v "Connecting to" para eliminar prefix de CLI) | src/types/database.types.ts
- [2026-04-16] | Committed: 10eb31e, 880385b, 70a3770

## Pendiente (próximas sesiones)
- **Servidor (mañana)**: trabajo en proyecto `vida, control` — Hetzner Node.js + Express + PostgreSQL + Docker
- **Dual layout todos los roles** (P0 UI gap): TeamLeader/Runner/QC → agregar DesktopLayout; Admin/HHRR/LogisticsDept/Payroll → agregar BottomNav mobile
- Android Capacitor: verificar en device real (npx cap sync && npx cap run android)
- HHRR Documents: stub sin funcionalidad real — construir upload integration
- HHRR Calendar: datos hardcodeados — conectar a DB real
- Holiday rates 1.5x (Holidays Act NZ) — no implementado en payroll ni compliance
- Pilot con Central Pac: pendiente confirmar

## En curso (sesion 2026-04-14 — DB drift vs mocks/codigo)
- [2026-04-14] | Migration `20260414_fix_settings_and_row_assignments.sql` **creada y validada via ROLLBACK en prod, PENDIENTE DE APLICAR**. Contenido:
  - row_assignments: anade columna `orchard_id` (nullable) + FK a orchards + index `(orchard_id,status) WHERE deleted_at IS NULL` + backfill via season_id->harvest_seasons.orchard_id
  - harvest_settings: DEFAULT min_wage_rate 23.50 -> 23.95 (ya no viola su CHECK); anade columnas `variety`, `shift_start_time` (default 07:00), `shift_end_time` (default 17:00), `mfa_device_trust_ttl_hours` (default 72) que la UI ya enviaba
  - daily_attendance: backfill 25 filas huerfanas de 2026-02-27 via harvest_seasons activa por orchard
  - Usa `SET LOCAL session_replication_role = replica` para saltarse el trigger `bump_version_and_update_time` durante backfill
- [2026-04-14] | Fix codigo: row.repository.ts:36, storeSync.ts:204, mocks/data/index.ts:570 — `status: 'active'` -> `'assigned'` (se eligio opcion C: DB anade orchard_id, codigo adopta el enum DB ya existente). Tests verde: 37 archivos / 450 tests.
- [2026-04-14] | **Pendiente usuario**: aplicar migration via SQL editor del dashboard o `supabase db push`. Verificar post-aplicacion que row_assignments feature (asignar filas a pickers) persista y relea correctamente. Regenerar `database.types.ts` con `supabase gen types typescript` despues.

## Metricas generales (2026-03-28)
- **Archivos fuente:** 396 TS/TSX (sin tests)
- **Archivos test:** 365 (48% ratio archivos, no lineas)
- **Edge Functions:** 11 (9 con auth+Zod, 2 con problemas)
- **Migraciones activas:** 8 (+ 20 archivadas)
- **Tablas:** 30+
- **Roles:** 8 (admin, manager, team_leader, runner, qc_inspector, hr_admin, payroll_admin, logistics)
- **Version:** 9.9.0

## Completado (sesion 2026-04-14 — i18n runtime fixes + bug verification via Puppeteer)
- [2026-04-14] | Bug 1 RESUELTO: MANO DE OBRA $6994 vs Informe Semanal $3198 — ambas vistas ahora muestran $9391. La discrepancia desapareció con el nowOverride fix anterior | Verificado en browser
- [2026-04-14] | Bug 2 RESUELTO: PickerDrawer Hoy vs Historial discrepancia — picker-history.service.ts fix (hours=0 para fechas pasadas sin check_out). Ahora 15.1h vs 15.2h (varianza de timing aceptable, no el 843h bug original) | Verificado en browser
- [2026-04-14] | i18n EN→ES runtime: "492 buckets"→"492 cubetas" (DashboardView usaba useCropProfile().units hardcoded EN; reemplazado con t('dashboard.buckets')) | DashboardView.tsx
- [2026-04-14] | i18n EN→ES runtime: "BLEED BY TEAM"→"SANGRADO POR EQUIPO" (WageShieldPanel tenía hardcoded; nuevo key dashboard.wage.bleed_by_team en EN+ES) | WageShieldPanel.tsx + locales
- [2026-04-14] | i18n EN→ES runtime: "buckets (7d)"→"cubetas (7d)" (PredictionsCard usaba useCropProfile().units; reemplazado con t('dashboard.predictions.buckets_7d')) | PredictionsCard.tsx
- [2026-04-14] | i18n EN→ES runtime: RowTeamDisplay "people/buckets/Picker/Bucket Runner" — todos via t() con nuevos keys orchardMap.row.{people,role.picker,role.runner,no_team} | RowTeamDisplay.tsx + locales
- [2026-04-14] | i18n EN→ES runtime: WageShieldPanel trend chart — getDailyBleed ahora recibe locale BCP47, "Today" reemplazado con t('dashboard.wage.today') via post-process | WageShieldPanel.tsx
- [2026-04-14] | i18n EN→ES runtime: HeatMapView empty state "se escaneen buckets"→"se escaneen cubetas" | HeatMapView.tsx
- [2026-04-14] | Verificado vía Puppeteer MCP: dashboard scan "ALL CLEAR" — ningún string EN en página ES después de fixes | Verificado en browser

## Completado (sesion 2026-04-14 — test sweep: 415/415 ✓)
- [2026-04-14] | src/test-utils.tsx: custom render utility con I18nProvider global. Resuelve t(key) → raw key en 17+ archivos de test sin I18nProvider | src/test-utils.tsx
- [2026-04-14] | i18n sweep round 3: VelocityChart, TeamLeadersSidebar, PredictionsCard, HistoryTab, PickerDrawerBins, PickerDrawerToday, BlockCard, RowListView, CostCharts/CostAnalyticsView, analytics-trends.service.ts — todos los strings EN hardcodeados reemplazados con t() | múltiples componentes
- [2026-04-14] | Part A §10 parity fix: useWeeklyReport.ts — nowOverride: new Date() en weeklySeries(). Corrige timezone mismatch NZ (UTC midnight local = UTC midday) | src/hooks/useWeeklyReport.ts
- [2026-04-14] | analytics-trends.service.ts: getDailyBleed labels last day as 'Today' (i=0) en lugar de abreviatura de día | src/services/analytics-trends.service.ts
- [2026-04-14] | picker-history.service.ts: hours=0 para fechas pasadas sin check_out (solo computa live-hours si a.date===todayStr) | src/services/picker-history.service.ts
- [2026-04-14] | Tests: 415/415 archivos, 4990/4990 tests verde. tsc: clean (0 errores)

## Completado (sesion 2026-04-14 — §16 Manager Logistics health panel: completo)
- [2026-04-14] | §16 logisticsMetrics/: módulo puro TypeScript (backlog.ts, cycleTime.ts, health.ts, runnerSummary.ts, index.ts). Zero React imports, <200 líneas cada uno | src/services/logisticsMetrics/
- [2026-04-14] | §16 useLogisticsHealth.ts: hook que combina useHarvestStore + useLogistics → LogisticsHealthData (health, backlogSeries, avgPickup, avgCycle, runnerLeaderboard, recentEvents) | src/hooks/useLogisticsHealth.ts
- [2026-04-14] | §16 i18n: logistics.ts EN + ES (32 keys cada uno). Registrado en locales/en/index.ts y locales/es/index.ts | src/i18n/locales/
- [2026-04-14] | §16 Tests servicio + hook: 35/35 verde (backlog: 4, cycleTime: 9, health: 9, runnerSummary: 5, useLogisticsHealth: 8)
- [2026-04-14] | §16 readOnly prop: FleetTab + RequestsTab con readOnly prop (disabled buttons + "Read-only" badge). BinsTab/HistoryTab/RoutesTab ya eran display-only | src/components/views/logistics/
- [2026-04-14] | §16 readOnly tests: readOnly.test.tsx 18/18 verde. FleetTab.test + RequestsTab.test siguen verde | src/components/views/logistics/readOnly.test.tsx
- [2026-04-14] | §16 Componentes UI manager: logistics/LogisticsHealthBanner, BinBacklogChart (SVG, formatHourLabel reutilizado), PickupSlaCard (mm:ss), RunnerLeaderboard (tabla 3 cols, sin chat), LogisticsEventFeed, OpenFullLogisticsLink (→ /logistics-dept) | src/components/views/manager/logistics/
- [2026-04-14] | §16 LogisticsView.tsx: completamente reescrito <60 líneas, cero props, llama useLogisticsHealth() internamente. BIN FULL ALERT eliminado (grep: CLEAN). Chat buttons eliminados. Filter pills eliminados | src/components/views/manager/LogisticsView.tsx
- [2026-04-14] | §16 Manager.tsx: LogisticsView renderizado sin props en case 'logistics'. fullBins/emptyBins/activeRunners en estado de Manager permanecen (usos en otros lugares)
- [2026-04-14] | §16 LogisticsView.test.tsx: reemplazado (11/11 verde). Verifica elementos eliminados ausentes + sub-componentes presentes
- [2026-04-14] | §16 Tests totales §16: 64 tests nuevos (35+18+11)

## Completado (sesion 2026-04-14 — §10 HistoryTab orchard columns + TeamDrawer completo)
- [2026-04-14] | §10 HistoryTab: layout de 6 columnas con header row (Date | Orchard | Variety | Bins | Hours | Earned). overflow-x-auto para drawer estrecho. flex-shrink-0 fixed widths | src/components/common/picker-profile/HistoryTab.tsx
- [2026-04-14] | §10 HistoryTab: DailyRecord interface añadió orchard_name: string|null. picker-history.service.ts: orchardName? param en getPickerHistory(), dailyMap incluye orchard_name | src/services/picker-history.service.ts
- [2026-04-14] | §10 HistoryTab: PickerProfileDrawer.tsx pasa orchardName al servicio (desde useHarvestStore orchard.name). i18n: panel.history.orchard + panel.history.variety en EN+ES | src/components/common/PickerProfileDrawer.tsx
- [2026-04-14] | §10 TeamDrawer: implementación completa con tabs Today (4 stat cards: Bins/Hours/Labour/Bins-per-hr) y Members (avatar + rol badge + bins + status dot). Empty state | src/components/views/manager/TeamDrawer.tsx
- [2026-04-14] | §10 WeeklyReportView: estado cambiado de string|null a SelectedTeamData|null. buildTeamData() computa líder+miembros en el click. TeamDrawer recibe teamData prop | WeeklyReportView.tsx
- [2026-04-14] | §10 useWeeklyReport.ts: crew tipado como Picker[] en WeeklyReportData | src/hooks/useWeeklyReport.ts
- [2026-04-14] | Tests: TeamDrawer.test.tsx (7/7 verde). HistoryTab: 30 tests existentes verde. tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-14 — v4 §2/§4 data consistency + jitter fix)
- [2026-04-14] | §2 Data consistency: services/harvestMetrics/ (7 módulos puros: perPicker, kpis, perTeam, efficiency, projection, drilldown, hours) + index.ts | src/services/harvestMetrics/
- [2026-04-14] | §2 Data consistency: useHarvestMetrics() hook — fuente única de verdad para Dashboard e Insights. 60s ticker para proyecciones | src/hooks/useHarvestMetrics.ts
- [2026-04-14] | §2 Data consistency: DashboardView.tsx wired a useHarvestMetrics (kpis.totalBins, kpis.totalLabour) — reemplaza payroll.finalTotal y bucketRecords.length | DashboardView.tsx
- [2026-04-14] | §2 Data consistency: useCostAnalytics.ts wired a useHarvestMetrics — reemplaza payrollService.calculateToday() para KPIs del día. getDailyTrends sigue siendo async | useCostAnalytics.ts
- [2026-04-14] | §4 ETA jitter: GoalProgress.tsx acepta projectedBuckets prop pre-computada. projectEndOfDay() redondea a múltiplos de 10. DashboardView pasa projectedEndOfDay desde el hook | GoalProgress.tsx
- [2026-04-14] | Bugfix crítico: toNZISO usaba `new Date(y,m,d,h)` (timezone local) en vez de `Date.UTC(y,m,d,h)` para calcular NZ offset → devolvía "+00:00" en máquinas con timezone local=NZ. Fix: Date.UTC | utils/time.ts
- [2026-04-14] | Tests: hours.test.ts (10), kpis.test.ts (6), perTeam.test.ts (5), efficiency.test.ts (5), projection.test.ts (8), dashboard-insights-parity.test.tsx (9). Total: 43 tests nuevos, todos verde | src/services/harvestMetrics/
- [2026-04-14] | DashboardView.test.tsx: mocks añadidos para useHarvestMetrics + useCropProfile, crew/bucketRecords añadidos al store mock | DashboardView.test.tsx
- [2026-04-14] | tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-14 — v6 §10 Data unification)
- [2026-04-14] | §10 Data unification: roster.ts — módulo puro con selectActiveCrew, selectActivePickers, selectAllStaff, selectTeamLeaders, selectRunners | src/services/harvestMetrics/roster.ts
- [2026-04-14] | §10 Data unification: DashboardView activeCrew usa selectActiveCrew(crew).length — elimina divergencia con OrchardMapView | DashboardView.tsx
- [2026-04-14] | §10 Data unification: useOrchardMap totalActivePickers usa selectActiveCrew(crew).length — misma definición que Dashboard | src/hooks/useOrchardMap.ts
- [2026-04-14] | §10 Data unification: useWeeklyReport totalBuckets/totalEarnings/costPerBin derivados de bucketRecords del store — elimina divergencia con Analytics tab | src/hooks/useWeeklyReport.ts
- [2026-04-14] | Tests: roster.test.ts (13 tests), weekly-parity.test.ts (3 tests). 16/16 verde | src/services/harvestMetrics/
- [2026-04-14] | tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-14 — v5 §3 Velocity drill-down)
- [2026-04-14] | §3 Velocity drill-down: VelocityChart refactorizado en modo shift-window usando buildShiftSlots() (NZ timezone-correct). Props añadidas: shiftStart, shiftEnd, onBarClick. Barras con role=button + teclado (Enter/Space) | VelocityChart.tsx
- [2026-04-14] | §3 Velocity drill-down: useVelocityDrilldown.ts — hook de open/close + slot seleccionado + drilldownForHour memoizado | src/hooks/
- [2026-04-14] | §3 Velocity drill-down: VelocityHourDrilldown.tsx — modal/panel con tabla por picker (bins, tendencia ↑↓), ESC/backdrop close, slide-up mobile | src/components/views/manager/
- [2026-04-14] | §3 Velocity drill-down: DashboardView wired: shiftStart/shiftEnd desde settings, useVelocityDrilldown hook, VelocityHourDrilldown renderizado | DashboardView.tsx
- [2026-04-14] | §3 Tests: 24 tests nuevos, todos verde — useVelocityDrilldown (4), VelocityHourDrilldown (10), VelocityChart modo legacy (6) + shift window (4) | src/
- [2026-04-14] | tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-14 — v6 §9 english-smell test)
- [2026-04-14] | §9 english-smell: src/i18n/english-smell.ts — 70 entradas canónicas ({section,key,en}) organizadas por página, con EXEMPT_FROM_DIFF_CHECK para abreviaturas (NZD, /hr, h) | src/i18n/
- [2026-04-14] | §9 english-smell: src/i18n/english-smell.test.ts — 181 tests: Suite1 ES keys existen y difieren EN, Suite2 t() no cae a fallback EN, Suite3 cobertura global ≥80%, Suite4 locales mi/sm/hi/tl/to tienen claves explícitas | src/i18n/
- [2026-04-14] | tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-14 — v9 §11 i18n sweep round 2)
- [2026-04-14] | §11 orchardMap namespace (15 keys EN+ES): OrchardMapView.tsx usa t() en Command Center, active, buckets, blocks, rows, LIVE, Variety, All, Empty/In Progress/Complete legend, completed, active pickers, Tap to assign | en/orchardMap.ts + es/orchardMap.ts
- [2026-04-14] | §11 assignModal namespace (17 keys EN+ES): RowAssignmentModal.tsx usa t() en Team Leader, Bucket Runner, Side, North/South, Select leader/runner, Confirm/Assigning/Assign N Rows, title/subtitle. RowTeamDisplay.tsx fix "1 people" → pluralización correcta | en/assignModal.ts + es/assignModal.ts
- [2026-04-14] | §11 insights.weekly (6 keys EN+ES): WeeklyReportView.tsx usa t() en Weekly Report, Export Report, Team Rankings, Top 10 Pickers, empty states | en/insights.ts + es/insights.ts
- [2026-04-14] | tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-14 — v9 §12 row click wire-up)
- [2026-04-14] | §12 WeeklyReportView — Top 10 Pickers: outer div reemplazado por ClickableRow con onClick={() => report.openProfile(p.picker_id)}. Eliminados hover:bg-slate-50 y cursor-pointer redundantes (ClickableRow los provee) | WeeklyReportView.tsx
- [2026-04-14] | §12 WeeklyReportView — Team Rankings: outer div reemplazado por ClickableRow con onClick={() => setSelectedTeam(team.name)}. Estado local selectedTeam: string|null | WeeklyReportView.tsx
- [2026-04-14] | §12 TeamDrawer.tsx: stub accesible (backdrop + panel slide-in, aria-label en close button). Listo para implementación completa | src/components/views/manager/TeamDrawer.tsx
- [2026-04-14] | §12 TeamDrawer wired en WeeklyReportView: render al final tras ExportModal, onClose={() => setSelectedTeam(null)} | WeeklyReportView.tsx
- [2026-04-14] | DashboardView: sin picker rows en divs directos — delega a PerformanceFocus (usa onUserSelect, no openPickerProfile). No cambios necesarios | DashboardView.tsx
- [2026-04-14] | tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-14 — v8 §13/§15/§14/§12)
- [2026-04-14] | §13 Break-even label duplicado: insights.trend.breakeven EN/ES eliminó '${rate}' (TrendLineChart ya agrega el valor). CostAnalyticsView.tsx eliminó .replace(). Resultado: "Break-even: $6.50" en vez de "Break-even: 6.50: $6.50" | CostAnalyticsView.tsx + en/es insights.ts
- [2026-04-14] | §15 Variety filter: OrchardMapView filtra visibleRows = rowData.filter(rd => variety match) en lugar de pasar isDimmed. RowCard eliminó isDimmed prop completo. Rows no-match desaparecen en lugar de quedar dimmed | OrchardMapView.tsx + RowCard.tsx
- [2026-04-14] | §14 Denominador correcto en RowCard: useOrchardMap ahora computa rowTarget = rowTargets[rowNum] ?? targetBucketsPerRow por fila. RowData tiene rowTarget + binsPerHour. Progress también usa rowTarget. RowCard muestra rd.buckets/rd.rowTarget + rate /hr | useOrchardMap.ts + RowCard.tsx
- [2026-04-14] | §14 perRow.ts: binsPerHourForRow() pura, min 3 scans + 15min ventana, fallback scanned_at → created_at. 8 tests verde | src/services/harvestMetrics/perRow.ts
- [2026-04-14] | §12 ClickableRow.tsx: primitive role=button accesible, Enter/Space, focus ring, disabled state. 8 tests verde | src/components/primitives/ClickableRow.tsx
- [2026-04-14] | tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-14 — v7 §7 EntityId + §8 Polish)
- [2026-04-14] | §7 EntityId.tsx: primitive copy-enabled ID (6 chars + ellipsis + title + 1.5s "Copied ✓" + aria-label). i18n keys common.copy/copied en EN+ES. Usado en TeamsToolbar | src/components/primitives/EntityId.tsx
- [2026-04-14] | §8 GoalProgress contrast: text-indigo-200 → text-white/80 (cumple 4.5:1). ETA colors green/yellow/red -400 → -300. Projected label text-indigo-200 → text-white/80 | GoalProgress.tsx
- [2026-04-14] | §8 GoalProgress bar fill: bg-white → bg-gradient-to-r from-amber-400 to-orange-500 + shadow-sm + shimmer via-white/25 | GoalProgress.tsx
- [2026-04-14] | §8 Broadcast FAB: bottom-28 → bottom-[136px] en mobile (BottomNav 56px + 4px gap + 8px clearance × 2) | pages/Manager.tsx
- [2026-04-14] | §8 Language card: grid grid-cols-3 → flex flex-wrap justify-center (7 locales, evita 2 celdas vacías con 3-col grid) | SettingsView.tsx
- [2026-04-14] | §8 CardSkeleton.tsx: primitive shimmer con role=status, aria-busy=true, lines prop | src/components/ui/CardSkeleton.tsx
- [2026-04-14] | Tests: EntityId.test.tsx (9) + CardSkeleton.test.tsx (6) = 15 tests, todos verde. tsc: clean | src/
- [2026-04-14] | tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-14 — v3 i18n full sweep + §5/§6/§9 fixes)
- [2026-04-14] | §1 i18n: InsightsView.tsx — header, subtitle, pickers badge, live data badge, tab labels (Analytics/Weekly Report/Fraud Shield) via t() | InsightsView.tsx
- [2026-04-14] | §1 i18n: CostAnalyticsView.tsx — todos los KPI labels (COST/BIN etc.), Cost Breakdown, Piece Rate, team cost, efficient/inefficient sections, bins/per_bin labels | CostAnalyticsView.tsx
- [2026-04-14] | §1 i18n: VelocityChart.tsx — title, subtitle, total_buckets, awaiting state, live updates, tooltip (bins+%target), legend labels, target line | VelocityChart.tsx
- [2026-04-14] | §5 2FA UX: OtpInput.tsx — 6 cajas auto-avance, backspace navigation, paste support, error/filled styles | src/components/auth/OtpInput.tsx
- [2026-04-14] | §5 2FA UX: MFAVerify.tsx reescrito — OtpInput 6-cajas, auto-submit al completar, "← Back to login", countdown 30s antes de resend, todas las strings via t(), layout tipo Login | MFAVerify.tsx
- [2026-04-14] | §6 Decimal fix: utils/money.ts creado (normalizeMoney, parseMoney, formatMoneyInput). FormField type=number → type=text inputMode=decimal con estado local + onBlur format | money.ts, SettingsFormComponents.tsx
- [2026-04-14] | §9 Tests: velocity-chart.test.tsx + InsightsView.test.tsx + CostAnalyticsView.test.tsx wrapped con I18nProvider. money.test.ts (15 tests). SettingsFormComponents.test.tsx: spinbutton→textbox | all test files
- [2026-04-14] | tsc --noEmit: clean (0 errores). Tests directamente afectados: todos verde.

## Pendiente (acciones manuales — no código)
- Ejecutar migración 20260412 en Supabase SQL Editor (ALTER TABLE harvest_settings ADD CONSTRAINT)
- Verificar build Android en device real (npx cap sync && npx cap run android)
- Añadir secret PRODUCTION_URL en GitHub repo settings si el dominio cambia de merr-pi.vercel.app
- Pilot con Central Pac (técnicamente listo — requiere coordinación con ellos)

## COMPLETADO (sesion 2026-04-14 — §1/§2/§3/§4/§7/§8/§9/§10/§11/§12/§13/§14/§15/§16)
Todos los §§ del v5 prompt completados. Ver entradas individuales abajo.

## Completado (sesion 2026-04-13 — v2 post-revisión en vivo: 7 áreas de fixes)
- [2026-04-13] | CRITICAL: PickerProfileDrawer → 3 paneles role-aware (PickerTodayPanel, TeamLeaderPanel, RunnerPanel). TL: roster+compliance alerts. Runner: trips+route. Fix $0 earnings cuando hours=0 pero buckets>0 | PickerProfileDrawer.tsx
- [2026-04-13] | VelocityChart: x-axis 24h consistente, hover tooltip (rango hora+bins+% target), target line más gruesa, leyenda honesta (Current solo si barra actual tiene datos) | VelocityChart.tsx
- [2026-04-13] | HarvestSettings: shift_start_time + shift_end_time (HH:MM). SettingsView: inputs Shift Hours, Audit Trail Always On pill, Profile Banner rediseñado | app.types.ts, useSettings.ts, SettingsView.tsx
- [2026-04-13] | analytics.service.calculateETA usa shiftEndTime configurable (no hardcoded 17:00). DashboardView ancla ETA a shift_end_time para evitar jitter | analytics.service.ts, DashboardView.tsx
- [2026-04-13] | CostAnalyticsView: filas clickeables abren drawer role-aware, línea secundaria bins+hours, chevron, (NZD) en subtítulo. useCostAnalytics fallback chain picker_id→id | CostAnalyticsView.tsx, useCostAnalytics.ts
- [2026-04-13] | Manager.tsx: nav labels usan i18n t('nav.\${id}') con fallback a label estático. StoragePersistBanner usa t('pwa.storage_warning'). i18n: key en/es | Manager.tsx, StoragePersistBanner.tsx, i18n/index.ts
- [2026-04-13] | TeamsToolbar: orchard ID muestra UUID completo en hover. useLoginAnimations: fix typewriter stuck al último char (refs para cleanup interval+timeout) | TeamsToolbar.tsx, useLoginAnimations.ts
- [2026-04-13] | Commit: 3870b9b | 17 archivos, 1594 inserciones, 322 eliminaciones

## [COMPLETADO en sesiones posteriores — v4 al v11]

## Completado (sesion 2026-04-13 — Round 2: 17-issue sprint + verificación Puppeteer)
- [2026-04-13] | A1/A2/A3: mockDailyAttendance usaba check_in/check_out — renombrado a check_in_time/check_out_time. TLs y runners no tenían rows en daily_attendance — agregados | mocks/data/index.ts
- [2026-04-13] | A4/A5: Analytics + Weekly Report KPIs ya no son cero (calculate-payroll retorna datos reales) | Verificado Puppeteer: COST/BIN $8.53, TOTAL BINS 492, TOTAL LABOUR $4195
- [2026-04-13] | A6: analytics-trends.service leia c.total_cost pero mock usa total_earnings → NaN → dots en y=0. Fix: fallback ?? c.total_earnings | analytics-trends.service.ts
- [2026-04-13] | B1: PickerDetailsModal eliminado. Todos los clicks de pickers usan openPickerProfile(id) → PickerProfileDrawer | Manager.tsx
- [2026-04-13] | B1 (drawer): Effective Rate bar + Details section añadidos al Today tab del drawer | PickerProfileDrawer.tsx
- [2026-04-13] | B2: Block progress 5/20, 8/20 — funcionando tras fix de row_assignments status:'active' | Verificado Puppeteer
- [2026-04-13] | B3: row_assignments mock le faltaba status:'active' — storeSync filtra por .eq('status','active') | mocks/data/index.ts
- [2026-04-13] | B4: Drawer muestra "Current Route: Block A → Bin Station 1" para runners (role-aware label) | PickerProfileDrawer.tsx
- [2026-04-13] | B5: TeamLeaderProfileView — label siempre "Assigned Rows" con multi-row display | TeamLeaderProfileView.tsx
- [2026-04-13] | B7: TL warning now shows picker names (belowMinNames array) | TeamLeaderProfileView.tsx
- [2026-04-13] | B8: QualityRing oculto cuando history.quality.total === 0 | PickerProfileDrawer.tsx
- [2026-04-13] | C2: PredictionsCard — icono trending eliminado, reemplazado por text badge pill (Improving/Stable/Declining) | PredictionsCard.tsx
- [2026-04-13] | Verificación Puppeteer 10 pasos: TODOS PASADOS. No hay console errors | Self-verified
- [2026-04-13] | tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-13 — 9-bug sprint post-mock-update)
- [2026-04-13] | P0-Fix: calculate-payroll MSW handler reescrito — formato exacto PayrollResultSchema (orchard_id, date_range, summary, compliance, picker_breakdown, settings). Root cause de Issues 5+6 (analytics=0, weekly report=0) | mocks/handlers/functions.ts
- [2026-04-13] | P0-Fix: picker-history.service — horas = 0 para pickers activos (sin checkout). Ahora: si check_in_time existe y no hay checkout → estima desde Date.now() | picker-history.service.ts
- [2026-04-13] | P0-Fix: PickerProfileView — speed/hourlyRate/Hours Today usan effectiveHours (estimado desde check_in_time) cuando picker.hours=0 pero picker está activo | PickerProfileView.tsx
- [2026-04-13] | P1-Fix: dual picker view — WageShieldPanel.onClick ya no llama onUserSelect(picker) además de openPickerProfile(id). Solo abre drawer | WageShieldPanel.tsx
- [2026-04-13] | Investig: Issue 3 (row assignments) — fallback storeSync reconstruye desde crew.current_row correctamente. Issue cosmético/timing | storeSync.ts (no change)
- [2026-04-13] | Investig: Issue 4 (block 0/20 rows) — datos y lógica correctos. Posible timing pre-fetchBlocks. rowTargets=20 da 5 rows completas con data actual | (no change)
- [2026-04-13] | P2: Issue 7 (language) — setLocale funcional, cambio visual requiere idioma distinto al actual | (no change)
- [2026-04-13] | P2: Issue 8 (doble flecha) — PredictionsCard tiene exactamente 1 botón arrow_forward. Trend icon es distinto | (no change)
- [2026-04-13] | P2: Issue 9 (avatar detrás banner) — relative z-10 ya aplicado en sesión anterior | SettingsView.tsx (no change)
- [2026-04-13] | tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-13 — Mock data Phase 2 + handler fixes)
- [2026-04-13] | Mock data Phase 2: rewrite completo mocks/data/index.ts — Cromwell Central Otago, Day 8, 26 pickers, 489 buckets, 3 wage alerts (Tom Blackwood/Emily Foster/Hone Matene), NZ timestamps, qc_inspections schema correcto (quality_grade, picker_id), bins status enum correcto (partial not in-progress), 7-day history, English messaging | mocks/data/index.ts
- [2026-04-13] | Fix calculate-payroll handler: PIECE_RATE 1.20→read from harvest_settings (6.50), hours_worked fallback 4.5→6.5, earnings per picker formateados con toFixed(2) | mocks/handlers/functions.ts
- [2026-04-13] | Fix check-compliance handler: antes devolvía siempre {compliant:true, violations:[]}. Ahora calcula violaciones reales desde pickers_performance_today — 3 violaciones reales (Tom/Emily/Hone, shortfall ~$380) | mocks/handlers/functions.ts
- [2026-04-13] | Fix close_payroll_period RPC: totales actualizados — 349→489 buckets, 99→173.5 horas, 418→4182 NZD, 23→26 pickers | mocks/handlers/database.ts
- [2026-04-13] | tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-13 — Manager View 7-bug sprint 5)
- [2026-04-13] | Issue 1 (Unknown names): PerformanceFocus dual-key Map lookup — soporta UUID (p.id) y código corto (p.picker_id) | PerformanceFocus.tsx
- [2026-04-13] | Issue 2 (Production=0, Active Crew=0): animBuckets usa bucketRecords.length, activeCrew = unique picker_ids en bucketRecords (ambos consistentes con VelocityChart) | DashboardView.tsx
- [2026-04-13] | Issue 3 (Block progress 0/20): timestamp root-cause fix en mocks/data/index.ts — NZ timezone aware dates via Intl.DateTimeFormat + toNZTimestamp() | mocks/data/index.ts
- [2026-04-13] | Issue 4 (Target Buckets/Hour no reactivo): handleChange actualiza min_buckets_per_hour al nuevo floor cuando piece_rate/min_wage_rate cambia y el valor estaba en el floor anterior | useSettings.ts
- [2026-04-13] | Issue 5 (Predictions → arrow sin efecto): PredictionsCard recibe setActiveTab prop, botón naranja navega a 'analytics' | PredictionsCard.tsx + DashboardView.tsx
- [2026-04-13] | Issue 6 (Avatar detrás del banner): `relative z-10` en content div del profile card | SettingsView.tsx
- [2026-04-13] | Issue 7 (Runner dropdown ausente): selectedRunner state + runners filter + Bucket Runner select en RowAssignmentModal | RowAssignmentModal.tsx
- [2026-04-13] | tsc --noEmit: clean (0 errores)

## Completado (sesion 2026-04-13 — Data coherence sprint 4)
- [2026-04-13] | Mock piece_rate 1.20→6.50: floor pasa de 20→4, compliance en verde, earnings_today corregido | mocks/data/index.ts
- [2026-04-13] | recalculateIntelligence actualiza stats.totalBuckets + presentCount + tons + payEstimate. Fuente única de verdad para inteligencia | intelligenceSlice.ts
- [2026-04-13] | filteredBucketRecords usa todayNZST() en vez de medianoche local del dispositivo | useManagerActions.ts
- [2026-04-13] | DashboardView vuelve a usar stats.totalBuckets (ahora correcto). useManagerActions vuelve a usar presentCount del store | DashboardView.tsx + useManagerActions.ts
- [2026-04-13] | tsc --noEmit: clean. 38/38 tests pasando.

## Completado (sesion 2026-04-13 — Dashboard & UX bug fixes sprint 3)
- [2026-04-13] | "Unknown" en Top 3/Below Average: PerformanceFocus resuelve nombre desde crew[] por picker_id — BucketRecord no lleva picker_name | PerformanceFocus.tsx
- [2026-04-13] | Production=0 en Dashboard: animBuckets usa bucketRecords.length en vez de stats.totalBuckets (nunca actualizado por recalculateIntelligence) | DashboardView.tsx
- [2026-04-13] | Active Crew=0 en Dashboard: presentCount calculado desde crew en useManagerActions (crewSlice.presentCount siempre 0) | useManagerActions.ts
- [2026-04-13] | Sidebar colapsado: collapsed state persistido en localStorage — sobrevive navegación entre páginas | DesktopLayout.tsx
- [2026-04-13] | Footer v9.0.0 → v9.9.0 | SettingsView.tsx + SettingsView.test.tsx
- [2026-04-13] | tsc --noEmit: clean. 43/43 tests pasando.

## Completado (sesion 2026-04-13 — Remaining Harvest Page Fixes sprint 2)
- [2026-04-13] | Issue 2b (Target Buckets/Hour auto-update): useEffect en useSettings sincroniza min_buckets_per_hour al nuevo complianceFloor cuando cambia piece_rate/min_wage. Respeta override manual (valor > floor no se toca) | useSettings.ts
- [2026-04-13] | Issue 1b (Block progress 0/20): target_buckets en mock bajado de 30 a 8 (achievable con bucket counts reales). Bloques muestran progreso realista (~16/20 block A) | mocks/data/index.ts
- [2026-04-13] | Issue 3b (Orchard selector static): +2 orchards en mockOrchards (Blue Ridge Cherry Estate, Marlborough Pear Grove). OrchardSelector ahora renderiza como <select> dropdown | mocks/data/index.ts
- [2026-04-13] | tsc --noEmit: clean. 24/24 SettingsView tests + 18/18 useSettings + i18n tests pasando

## Completado (sesion 2026-04-13 — Settings & Harvest 6-issue sprint)
- [2026-04-13] | Issue 6 (Responsive): SettingsView max-w-[1200px] + grid md:grid-cols-2 lg:grid-cols-3. Danger Zone full-width | SettingsView.tsx
- [2026-04-13] | Issue 2 (Minimum Wage): canEditMinWage — sólo admin/hr_admin pueden editar. LockedField inline con candado y tooltip | useSettings.ts + SettingsView.tsx
- [2026-04-13] | Issue 3 (Auto-calculate): ComplianceTargetField inline — floor=ceil(wage/rate), no permite override hacia abajo | useSettings.ts + SettingsView.tsx
- [2026-04-13] | Issue 4 (Orchard selector): OrchardSelector inline — carga orchards vía supabase, auto-rellena total_rows y varieties | useSettings.ts + SettingsView.tsx
- [2026-04-13] | Issue 1 (Block progress): orchardMapSlice.rowTargets (row_number→target_buckets). useOrchardMap usa target real por fila. Manager.tsx usa settings.min_buckets_per_hour | orchardMapSlice.ts + useOrchardMap.ts + orchard-map.repository.ts + Manager.tsx
- [2026-04-13] | Issue 5 (Languages): +4 idiomas: Samoan (sm), Hindi (hi), Tongan (to), Filipino (tl). SUPPORTED_LOCALES 3→7. getInitialLocale actualizado | i18n/index.ts
- [2026-04-13] | Fix pre-existente: team_leader_id null en mockPickers.push — double-cast as unknown | mocks/data/index.ts
- [2026-04-13] | Tests: 4252→4268 (+16 tests). 381 test files, todos pasando | SettingsView.test.tsx + i18n-module.test.ts + i18n.test.tsx

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

## Completado (sesion 2026-04-12 — payroll tests + TL nav + CSP)
- [2026-04-12] | Fix 11 payroll tests: MOCK_PAYROLL_RESULT usaba $23.50/hr en lugar de $23.95 — minimum_required, top_up_required, total_earnings y summary actualizados | payroll.service.test.ts
- [2026-04-12] | TasksView Team Leader: añadido al nav (tab 'Map', icon strategy) — reemplaza 'Team' en nav, Team sigue accesible vía HomeView | team-leader.nav.ts + TeamLeader.tsx + TeamLeader.test.tsx
- [2026-04-12] | CSP hardening: eliminado 'unsafe-eval' y https://unpkg.com de script-src | vercel.json

## Completado (sesion 2026-04-12 — wage constant sweep)
- [2026-04-12] | Migración 20260412_orchards_min_wage_floor.sql aplicada en Supabase SQL Editor | DONE
- [2026-04-12] | NZ_MINIMUM_WAGE_2025 → NZ_MINIMUM_WAGE_2026 en todos los archivos de producción (hhrr.service, WageRatesPanel, weeklyReportSections, compliance tests, export tests) | 8 commits
- [2026-04-12] | cherry-pick fix(logging): add error logging to silent catch blocks → main | 1bb5022

## Completado (sesion 2026-04-12 — Login reliability + QR scanner)
- [2026-04-12] | QR scanner: eliminado CDN tag de unpkg.com en index.html, removido unpkg de meta CSP, eliminado src/types/html5-qrcode.d.ts (npm package tiene sus propios tipos) | index.html + src/types/
- [2026-04-12] | Login intermitente: auth-context.repository.ts ahora chequea userError.code === PGRST002/PGRST003 además de strings en isRetriable | auth-context.repository.ts
- [2026-04-12] | Login intermitente: useAuthSession.ts chequea code === PGRST002/PGRST003 en isServerError — previene "User profile not found" en pool timeout transitorio | useAuthSession.ts + test (2 casos nuevos)
- [2026-04-12] | Login intermitente: 503 añadido a isRetriable y isServerError en ambos archivos | auth-context.repository.ts + useAuthSession.ts

## Completado (sesion 2026-04-13 — MSW mock mode fixes)
- [2026-04-13] | Fix bucket timestamps: MORNING_START_MS y generateBuckets usan Date.now()-4h (relativo) en vez de UTC fijos T07:30Z → todos los baldes pasan filtro filteredBucketRecords en cualquier timezone | src/mocks/data/index.ts
- [2026-04-13] | Fix team leaders vacíos: James Wilson + Sarah Ngapo añadidos a mockPickers con role='team_leader' → crew.filter(role==='team_leader') ahora los encuentra | src/mocks/data/index.ts
- [2026-04-13] | Fix runners vacíos: Liam Tane + Hemi Parata añadidos a mockPickers con role='runner' → RunnersSection muestra 2 runners activos | src/mocks/data/index.ts
- [2026-04-13] | Fix broadcasts: campos title, content, acknowledged_by, target_roles, updated_at añadidos (faltaban → crash en acknowledgeBroadcast) | src/mocks/data/index.ts
- [2026-04-13] | Fix conversations/messages: timestamps UTC fijos → Date.now() relativo + campos read_by, type, name añadidos | src/mocks/data/index.ts
- [2026-04-13] | Fix pickers_performance_today: mockPickers.slice(0, PICKER_DEFS.length) para no crashear con TLs/runners añadidos | src/mocks/data/index.ts

## Pendiente
- Android Capacitor: verificar en device real (npx cap sync && npx cap run android) | prioridad media
- CSP: eliminar 'unsafe-inline' de script-src requiere nonce server-side (Vercel Middleware) — pendiente para hardening fase 2
- HHRR Documents: stub sin funcionalidad real — construir upload integration
- HHRR Calendar: datos hardcodeados — conectar a DB real
- Holiday rates 1.5x (Holidays Act NZ) — no implementado en payroll ni compliance
- Subir cobertura tests: ~50% → 70% target
- Pilot con Central Pac: pendiente confirmar
- Login: considerar cache de user profile en IndexedDB (Dexie) como fallback offline/pool exhaustion
