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
- [2026-03-28] | NZ payroll (PAYE, KiwiSaver, ACC) | Funcional (necesita mas tests)
- [2026-03-28] | E2E tests Playwright (20 spec files) | Funcional

## Completado (sesion 2026-03-28 - P1 Security)
- [2026-03-28] | Fix CORS wildcard en api-v1 → corsHeaders(origin) dinamico | api-v1/index.ts
- [2026-03-28] | Fix service_role key bypass → SUPABASE_ANON_KEY + tenant validation | api-v1/index.ts
- [2026-03-28] | Fix RLS quality_inspections → SELECT/INSERT/UPDATE policies | 20260328_quality_inspections_rls.sql
- [2026-03-28] | Fix VITE_DEMO_PASSWORD expuesta → removida de .env.local | .env.local
- [2026-03-28] | Fix passwords hardcodeados en 12 archivos → env vars | tests/e2e/*, scripts/*

## Pendiente
- Tests: schemas Zod, routes.tsx, MFAGuard, payroll.repository | Prioridad: alta
- Tests: formato NZD, wage-rates, data-export | Prioridad: media
- E2E: Team Leader workflow, Runner scanning, QC inspection | Prioridad: media
- Indexes: bucket_records, daily_attendance, pickers | Prioridad: media
- Cleanup: dead code, version mismatch, deprecated constants | Prioridad: baja

## Bloqueado
- Verificar si .env/.env.local fueron commiteados alguna vez (git log --all -- .env .env.local)
- npm audit para vulnerabilidades de dependencias
