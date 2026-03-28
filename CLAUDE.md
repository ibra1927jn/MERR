# harvestpro-nz — PWA AgTech para Nueva Zelanda

## Stack
React 19 + TypeScript (strict, no `any`, allowJs: false) + Vite 7 + Tailwind 3
Supabase (PostgreSQL 15, Edge Functions, RLS) + Capacitor 8 (Android)
State: Zustand (7 slices) + Dexie v3-v7 (IndexedDB offline) + TanStack React Query
Validacion: Zod 4 | Monitoring: Sentry + PostHog (lazy) | i18n: 5 idiomas
Crypto: AES-256-GCM via Web Crypto API (PBKDF2 key derivation)

## Comandos
- `npm test` — Vitest (4GB heap, jsdom, timezone Pacific/Auckland)
- `npm run build` — tsc + vite build
- `npm run lint` — ESLint (0 warnings max)
- `npm run lint:fix` — ESLint autofix
- `npm run format` — Prettier
- `npm run test:e2e` — Playwright
- `npm run test:coverage` — Coverage (thresholds: 70/70/60/70)
- `npx cap sync && npx cap run android` — Build nativo Android

## Arquitectura real (auditada 2026-03-28)

### Entry point
- `src/index.tsx` → Provider hierarchy: I18n > AppProvider > MFAGuard > Router
- `src/routes.tsx` → 10 lazy pages con ProtectedRoute por rol

### Capas
- `src/pages/` — 10 paginas: Login, Signup, Manager, TeamLeader, Runner, QualityControl, Admin, HHRR, Logistics, Payroll
- `src/components/views/` — Vistas por dominio (manager/, hhrr/, logistics/, payroll/, qc/, runner/)
- `src/components/common/` — Shared: Header, BottomNav, messaging, setup-wizard, sync
- `src/components/modals/` — 25+ modales de CRUD
- `src/components/ui/` — Design system: Button, StatCard, FilterBar, VirtualList, Toast, etc.
- `src/services/` — Logica de negocio: auth, sync, offline, gateway, payroll, compliance, crypto
- `src/repositories/` — 25+ repos especializados + baseRepository generico
- `src/stores/` — Zustand: settings, crew, bucket, intelligence, row, orchardMap, ui
- `src/hooks/` — 40+ custom hooks
- `src/schemas/` — Zod: zod.schemas.ts (boundary validation) + api.schemas.ts (Edge Function responses)
- `src/types/` — app.types.ts + database.types.ts (auto-gen, 939 lineas) + result.ts (Result<T>)
- `src/config/` — env validation, sentry, analytics, queryClient, crop-profiles, navigation
- `src/context/` — AuthContext (session, refresh, MFA, privacy consent) + MessagingContext
- `src/utils/` — format (NZD), regionCheck (data sovereignty)
- `src/constants/` — nz-law.ts (compliance legal)

### Supabase
- `supabase/migrations/` — 8 activas (000_baseline + 7 incrementales)
- `supabase/functions/` — 11 Edge Functions (approve-timesheet, calculate-payroll, check-compliance, detect-anomalies, manage-admin, manage-attendance, provision-orchard, record-bucket, send-push, submit-audit-log, api-v1)
- `supabase/functions/_shared/` — cors.ts, security.ts (rate limit, Zod validation, CORS allowlist)
- `supabase/seeds/` — 6 seed files (test accounts, blocks, simulation data)
- 30+ tablas con RLS, optimistic locking, soft deletes

### Offline
- Dexie IndexedDB con sync queue (7 tipos procesados, 3 sin processor)
- Encrypt-before-write con AES-256-GCM
- Dead letter queue para items fallidos
- Cross-tab mutex via Web Locks API
- Delta sync con 2-min buffer

### Tests
- 365 test files (Vitest + Testing Library + fake-indexeddb)
- 20 E2E specs (Playwright) en tests/e2e/ y e2e/
- Storybook para componentes UI

## Reglas del proyecto
- TypeScript strict: nunca usar `any`, siempre tipar explicitamente
- Path alias: @ = ./src/
- Imports lazy para paginas (React.lazy + Suspense)
- PWA offline-first: toda operacion debe funcionar sin conexion
- Tests con fake-indexeddb para simular Dexie
- Supabase RLS activo: nunca bypass de seguridad a nivel de row
- No modificar migraciones existentes, solo crear nuevas
- .env y .env.local nunca se commitean (hay .env.example como referencia)
- Husky + lint-staged activo en pre-commit
- Codigo en ingles, comentarios en espanol
- Commits en ingles: tipo(scope): descripcion breve

## Variables de entorno (solo keys)
- VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- VITE_SENTRY_DSN, VITE_POSTHOG_KEY, VITE_POSTHOG_HOST
- VITE_VAPID_PUBLIC_KEY, VITE_GEMINI_API_KEY
- VITE_APP_VERSION, VITE_ENABLE_ANALYTICS, VITE_LOG_LEVEL

## Bugs conocidos (ver ERRORES.md para lista completa)
- P0: 3 sync queue types sin processor (PICKER, QC_INSPECTION, UNLINK)
- P0: provision-orchard no esta en config.toml (signup roto)
- P0: api-v1 rate limiter no funciona (campos no seleccionados)
- P0: Roles Edge Functions (owner/supervisor) no matchean DB (admin/team_leader)
