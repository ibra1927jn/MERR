# HarvestPro NZ — Deployment Runbook

**Versión:** 1.0 · **Fecha:** 2026-04-19
**Ámbito:** stack self-hosted en Hetzner (PG17 + Supabase docker compose)

Este runbook cubre deploy, verificación post-deploy y rollback para el
stack self-hosted. Complementa `docs/DEPLOYMENT.md` (orientado a Supabase
cloud) y `docs/RUNBOOK.md` (procedimientos operacionales).

---

## 1. Arquitectura actual

### 1.1 Stack self-hosted en Hetzner

Todo corre en un solo host Hetzner, en containers Docker:

```
Host: ct4-bot (Hetzner, Ubuntu 24.04)
├── /opt/supabase/supabase/docker/   ← docker compose Supabase oficial
│   ├── supabase-db           postgres 17.6.1 · internal 5432 · bind 127.0.0.1:5433
│   ├── supabase-kong         kong 3.9.1     · bind 127.0.0.1:8000 y 127.0.0.1:8443
│   ├── supabase-auth         gotrue v2.186.0
│   ├── supabase-rest         postgrest v14.8
│   ├── supabase-realtime     v2.76.5
│   ├── supabase-storage      v1.48.26
│   ├── supabase-studio       studio 2026.04.08
│   ├── supabase-edge-functions v1.71.2
│   ├── supabase-meta, supabase-pooler, supabase-vector, supabase-imgproxy, supabase-analytics
│
└── /root/ultra-system/ (independiente)
    ├── ultra_engine (ultra-system-engine) · bind 0.0.0.0:80
    ├── ultra_db (postgres:16-alpine)
    └── servicios P0-P7 (wger, grocy, mealie, fasten, etc. 127.0.0.1:800x)
```

**Expuesto al público:** solo 22 (SSH), 80 (ultra_engine) y Cloudflare tunnel
para Supabase kong.

**Backup del .env cloud:** `/root/repos/harvestpro-nz/.env.local-cloud-backup`
preserva la configuración de conexión al Supabase cloud previo — útil si
hay que revertir al proyecto cloud en caso de incidente severo.

### 1.2 Túneles SSH (desarrollo Windows)

Desde Windows, el desarrollador accede vía:
- `ssh -L 5432:127.0.0.1:5433 ct4-bot` → postgres directo
- `ssh -L 8000:127.0.0.1:8000 ct4-bot` → Supabase kong
- `ssh -L 3000:127.0.0.1:3001 ct4-bot` → Studio (si habilitado)

---

## 2. Procedure de deploy

### 2.1 Pre-flight checks (5 min)

1. **Heartbeat pause:** `touch /opt/heartbeat/.pause` — evita que crons
   interrumpan el deploy.
2. **Ventana de mantenimiento:** notificar en canal interno si el deploy
   tocará DB schema (migrations).
3. **Backup DB actual:**
   ```bash
   docker exec supabase-db pg_dumpall -U postgres \
     > /root/backups/pg_dumpall_$(date +%F_%H%M).sql
   ```
4. **Verificar espacio en disco:** `df -h /` — necesitas ≥ 5 GB libres.
5. **Verificar tests pasando en `main`** (CI verde en PR que se quiere
   mergear).

### 2.2 Aplicar migrations (orden estricto)

Las migrations se aplican en orden lexicográfico por nombre de archivo en
`supabase/migrations/`. El orden cronológico importa cuando hay
dependencias entre migrations (FK, funciones).

```bash
cd /root/repos/harvestpro-nz
# 1. Ver qué migrations están pendientes vs DB
docker exec supabase-db psql -U postgres -d postgres \
  -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10;"

# 2. Aplicar cada una manualmente
for f in supabase/migrations/20260419_*.sql; do
  echo "Aplicando: $f"
  docker exec -i supabase-db psql -U postgres -d postgres < "$f"
done

# 3. Verificar que la migration registró correctamente
docker exec supabase-db psql -U postgres -d postgres \
  -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 3;"
```

**Orden recomendado para migrations coexistentes:**
1. Funciones RLS helpers primero (si las hay)
2. Nuevas tablas
3. CREATE POLICY
4. DROP POLICY obsoletas
5. GRANT/REVOKE
6. Triggers
7. DATA migrations (UPDATE/INSERT de seed-like)

### 2.3 Deploy edge functions

```bash
cd /root/repos/harvestpro-nz/supabase/functions
# Cada función en su directorio. Deploy individual:
for fn in calculate-payroll detect-fraud provision-orchard send-push mpi-export; do
  docker cp "./$fn" supabase-edge-functions:/home/deno/functions/
done
# Reload del runtime para que lea las nuevas versiones
docker compose -f /opt/supabase/supabase/docker/docker-compose.yml \
  restart edge-functions
```

### 2.4 Verificación post-deploy (smoke tests)

1. **DB health:**
   ```bash
   docker exec supabase-db psql -U postgres -c "SELECT NOW(), current_database();"
   ```
2. **Auth health:** `curl http://127.0.0.1:8000/auth/v1/health`
   — esperado `{"status":"ok"}`
3. **REST endpoint:** `curl -H "apikey: $ANON_KEY" http://127.0.0.1:8000/rest/v1/orchards?select=id&limit=1`
4. **Login con seed users:** ejecutar e2e de smoke
   ```bash
   cd /root/repos/harvestpro-nz
   npx playwright test e2e/smoke.spec.ts --reporter=line
   ```
5. **RLS respetado:** login como runner y verificar que NO puede hacer
   `UPDATE harvest_settings SET min_wage = 0`:
   ```bash
   curl -X PATCH -H "apikey: $ANON_KEY" -H "Authorization: Bearer $RUNNER_TOKEN" \
     'http://127.0.0.1:8000/rest/v1/harvest_settings?id=eq.xxx' \
     -d '{"min_wage": 0}'
   # Esperado: 403 o 0 rows updated
   ```
6. **Edge functions respondiendo:**
   ```bash
   curl -X POST -H "apikey: $ANON_KEY" -H "Authorization: Bearer $MANAGER_TOKEN" \
     -H "Content-Type: application/json" \
     'http://127.0.0.1:8000/functions/v1/calculate-payroll' \
     -d '{"orchard_id": "xxx", "date_range": {...}}'
   ```
7. **Heartbeat resume:** `rm /opt/heartbeat/.pause`

---

## 3. Procedure de rollback

### 3.1 Rollback de migration fallida

Si una migration rompe la app o aplica cambios erróneos:

```bash
# 1. Identificar la migration culpable
docker exec supabase-db psql -U postgres -d postgres \
  -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;"

# 2. Aplicar la migration de rollback correspondiente (si existe)
# Ejemplo: supabase/migrations/20260419_rollback_rls_critical.sql
docker exec -i supabase-db psql -U postgres -d postgres \
  < supabase/migrations/20260419_rollback_rls_critical.sql

# 3. Desregistrar de schema_migrations
docker exec supabase-db psql -U postgres -d postgres \
  -c "DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260419_fix_rls_critical';"
```

Si NO hay migration de rollback y el daño es severo:
```bash
# Restaurar desde dump pre-deploy
docker exec supabase-db psql -U postgres -d postgres \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
cat /root/backups/pg_dumpall_XXXX.sql | \
  docker exec -i supabase-db psql -U postgres
```

### 3.2 Rollback de edge functions

Las edge functions son stateless — rollback = volver a la versión anterior:
```bash
cd /root/repos/harvestpro-nz
git checkout HEAD~1 -- supabase/functions/
bash ./deploy-edge-functions.sh  # o el loop del 2.3
```

### 3.3 Rollback si el stack no arranca

```bash
# 1. Container crashed en loop
docker compose -f /opt/supabase/supabase/docker/docker-compose.yml logs --tail=100 \
  | grep -iE 'error|fatal'

# 2. Última opción: revertir a commit previo y rebuild
cd /opt/supabase/supabase/docker
git log --oneline -5
git reset --hard <previous-good-commit>
docker compose up -d --force-recreate

# 3. Si postgres no arranca (ej. corrupción):
docker compose down
docker volume ls | grep supabase_db
# Restaurar volumen desde snapshot Hetzner (si hay)
docker compose up -d
```

### 3.4 Rollback al Supabase cloud (emergencia total)

Si el self-hosted es irrecuperable y la app está caída:

```bash
cd /root/repos/harvestpro-nz
# 1. Restaurar .env cloud
cp .env.local-cloud-backup .env.local

# 2. Rebuild + redeploy frontend (ej. Vercel o local preview)
npm run build

# 3. Notificar al equipo que se está en cloud temporal, no self-hosted.
```
Este rollback asume que el proyecto Supabase cloud sigue activo. Verificar
antes del deploy self-hosted que el plan cloud no se pausó.

---

## 4. Matriz de riesgos

| Componente | Si falla | Impacto | RTO | RPO |
|---|---|---|---|---|
| **supabase-db** (PG17) | App completa caída; no hay lecturas ni escrituras | CRÍTICO | 15 min (desde dump) — 2 h (desde snapshot) | Hasta el último dump |
| **supabase-auth** (gotrue) | Usuarios no pueden login; sesiones activas siguen | ALTO | 5 min (restart container) | 0 (stateless) |
| **supabase-kong** | Todos los endpoints /rest /auth /realtime caen | CRÍTICO | 5 min | 0 |
| **supabase-rest** (postgrest) | REST API caído; cliente offline sigue funcional vía Dexie | ALTO | 5 min | 0 |
| **supabase-realtime** | Notificaciones/broadcasts no llegan en tiempo real | MEDIUM | 10 min | 0 |
| **supabase-storage** | Uploads fallan; downloads de fotos rotos | MEDIUM | 10 min | 0 (S3-backed) |
| **supabase-edge-functions** | calculate-payroll, detect-fraud, send-push caídos | ALTO | 5 min | 0 (stateless) |
| **ultra_engine** (P1-P7) | Pilares personales caídos (independiente de HarvestPro) | BAJO | 10 min | 0 |
| **Migration rota con data loss** | DB en estado inconsistente | CRÍTICO | 30 min–2 h (restore desde dump) | Hasta el último dump (horario recomendado) |
| **RLS policy bloquea legítimos** | Usuarios no pueden ver datos aunque sean auth | ALTO | 5 min (aplicar migration rollback) | 0 |
| **Kong tunnel Cloudflare caído** | Acceso remoto perdido, local sigue funcional | MEDIUM | 10 min (cloudflared restart) | 0 |
| **Disco Hetzner lleno** | DB write-error, containers en read-only | CRÍTICO | Depende (cleanup ≥ 30 min) | Posible data loss si crashes |

**Estrategia de mitigación general:**
- Dumps automáticos diarios en `/root/backups/` con retention 14 días.
- Cron `pg_dumpall` en horario bajo uso (04:00 NZT).
- Monitoreo de disco vía `monit` o cron simple con alerta Telegram.
- Snapshots Hetzner semanales del volumen sdb.

---

## 5. Pre-release checklist

Antes de cada release mayor (ej. cuando se cierre el audit 2026-04-19):

- [ ] PR #6 (CRITICAL fixes) revisado y mergeado
- [ ] Migration RLS aplicada en self-hosted + verificada con suite de 24 tests
- [ ] Bug `audit_log` → `audit_logs` verificado con test integración
- [ ] MFA server-side habilitado (`docs/MFA_ENABLE_FIX_2026_04_19.md`)
- [ ] Dedup bucket_records decidido (criterio A o B, ver `/tmp/dedup-analysis/`)
- [ ] Backup pg_dumpall ejecutado y verificado (lee correctamente)
- [ ] Smoke tests post-deploy todos verdes (§2.4)
- [ ] Heartbeat resumido (`rm /opt/heartbeat/.pause`)
- [ ] Monitoreo en Hetzner confirma containers healthy por 30 min
- [ ] `CHANGELOG.md` actualizado con release notes

---

## 6. Contacto y escalación

| Severidad | Acción inicial | Ventana respuesta |
|---|---|---|
| CRÍTICO (app caída) | Aplicar rollback más cercano § 3.3 | < 15 min |
| ALTO (feature rota) | Feature flag off si posible; notificar canal | < 1 h |
| MEDIUM (degradación) | Crear issue GitHub con logs + reproducer | < 24 h |
| LOW (cosmético) | Crear issue con priority:low | Mejor esfuerzo |

Dump de logs para reporte:
```bash
docker compose -f /opt/supabase/supabase/docker/docker-compose.yml logs \
  --tail=500 > /tmp/supabase-logs-$(date +%F_%H%M).txt
```

---

*Documento generado: 2026-04-19. Revisión: cada release mayor o tras incidente.*
