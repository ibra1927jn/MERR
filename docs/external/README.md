# External research & audits — harvestpro-nz

Compendio de material externo generado durante sesiones de investigación nocturnas (`/root/lab_journal/`) que vive fuera del repo. Se copia aquí para que cualquiera con acceso al proyecto tenga el contexto completo en un solo lugar.

**Fecha de compilación:** 2026-04-23
**Branch:** `docs/research-and-audits-2026-04-23`
**Fuente original:** `/root/lab_journal/` en el entorno de trabajo (no versionado).

## Estructura

```
docs/external/
├── README.md                      ← este archivo
├── research/                      ← 2 rondas de investigación (~5 000 L)
│   ├── _sintesis.md               ← round 1 síntesis + 15 anti-patterns + roadmap 7 sprints
│   ├── agtech_orchard_software.md ← Hectre / Croptracker / FieldClock / PickTrace / Famous / farmOS
│   ├── offline_first_pwa.md       ← RxDB / PowerSync / ElectricSQL / Replicache / Yjs / Automerge
│   ├── payroll_compliance_nz.md   ← Xero / PaySauce / Smartly / IMS / AgriSmart + Crimes Act 2025
│   ├── mobile_scan_fieldops.md    ← Scandit / Zebra / Capacitor-MLKit / QuickPick / Tātou
│   ├── supabase_rls_edge.md       ← Supabase vs Hasura/Firebase/Nhost + patrones RLS correctos
│   ├── piece_rate_ag_labor.md     ← FieldClock / PickTrace / Crystal Payroll + NZ case law
│   ├── seasonal_hr_compliance.md  ← BambooHR / Deel / PayHero / AgriSmart + vSure API
│   └── review/                    ← round 2: review por pilares del código actual
│       ├── _sintesis.md           ← 15 P0 cross-pillar + 8 sprints priorizados
│       ├── auth_security.md
│       ├── frontend_roles.md
│       ├── offline_sync.md
│       ├── payroll_compliance.md
│       ├── repos_stores_hooks.md
│       ├── supabase_rls_edge.md
│       └── tests_observability.md
├── audits/
│   └── audit_harvestpro_2026_04_21.md  ← auditoría manual 2026-04-21 (password fragment redactado)
└── lab/
    └── baseline.sql               ← schema baseline de Supabase (DDL, sin datos) para reproducir stack local
```

La auditoría más reciente (**2026-04-23**, 7 agentes en paralelo) no está aquí sino en `AUDIT_2026_04_23_DEEP/` en la raíz del repo — que esta branch también incluye.

## Cómo usar

- Antes de tomar una decisión de diseño: leer el `_sintesis.md` relevante.
- Antes de tocar un pilar (payroll / offline / auth / etc.): leer el review correspondiente.
- Para reproducir la DB local: aplicar `lab/baseline.sql` sobre una Supabase limpia.
- Los archivos `research/` y `audits/` son **snapshots inmutables**. Cualquier update va en archivos nuevos o en `AUDIT_2026_04_23_DEEP/`.

## Estado de las fixes mencionadas (al 2026-04-23)

Las auditorías identifican P0 que ya tienen branch abierta pero **NO mergeada** a `main`:

- `fix/kiwisaver-rate-2026-04-22` — 3.5% statutory desde 2026-04-01
- `fix/alt-holiday-cross-period-2026-04-22` — Holidays Act s.60 double-count
- `fix/signout-global-and-requirerole-db-2026-04-22` — privilege escalation window
- `fix/logout-clear-caches-2026-04-22` — React Query cache leak BYOD
- `fix/meal-break-paid-flag-2026-04-22` — hardcoded 0.5 h
- + ~15 más bajo `fix/*-2026-04-22`

Ver `AUDIT_2026_04_23_DEEP/00_SUMMARY.md` para el merge-train recomendado.

## Secretos

Todos los archivos fueron escaneados antes del commit:
- Referencias conceptuales a `service_role` / `SUPABASE_SERVICE_ROLE_KEY` → **documentación**, no secretos reales.
- Un prefijo de password en `audits/audit_harvestpro_2026_04_21.md:188` → **redactado a `[REDACTED]`** antes de commit.
- `baseline.sql` contiene únicamente DDL/GRANT (sin filas de datos).

Si encuentras algo que deba sacarse, abre PR contra esta branch o avisa.
