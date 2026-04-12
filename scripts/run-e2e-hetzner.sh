#!/usr/bin/env bash
# run-e2e-hetzner.sh — Corre la suite E2E completa en el servidor Hetzner
# Uso desde el servidor: bash scripts/run-e2e-hetzner.sh
# Uso remoto desde portátil: ssh root@95.217.158.7 'bash -s' < scripts/run-e2e-hetzner.sh

set -euo pipefail

# ─── Configuración ────────────────────────────────────────────────────────────
REPO_DIR="/root/repos/harvestpro-nz"
REPORT_PORT=9323
SERVE_PORT=4173
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/e2e_run_${TIMESTAMP}.log"

# Variables requeridas (se pueden pasar como env vars al invocar el script)
# Ejemplo: VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... bash scripts/run-e2e-hetzner.sh
SUPABASE_URL="${VITE_SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# ─── Funciones ────────────────────────────────────────────────────────────────

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

cleanup() {
  log "Limpiando procesos..."
  # Matar servidor de preview si está corriendo
  if [[ -n "${SERVE_PID:-}" ]]; then
    kill "$SERVE_PID" 2>/dev/null || true
  fi
  # Matar servidor de reporte si está corriendo
  if [[ -n "${REPORT_PID:-}" ]]; then
    kill "$REPORT_PID" 2>/dev/null || true
  fi
  # Liberar puertos por si acaso
  fuser -k "${SERVE_PORT}/tcp" 2>/dev/null || true
  fuser -k "${REPORT_PORT}/tcp" 2>/dev/null || true
}

send_telegram() {
  local message="$1"
  if [[ -n "$TELEGRAM_BOT_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
    curl -s -X POST \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${message}" \
      -d "parse_mode=HTML" \
      > /dev/null 2>&1 || true
  fi
}

send_telegram_file() {
  local file_path="$1"
  local caption="$2"
  if [[ -n "$TELEGRAM_BOT_TOKEN" && -n "$TELEGRAM_CHAT_ID" && -f "$file_path" ]]; then
    curl -s -X POST \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" \
      -F "chat_id=${TELEGRAM_CHAT_ID}" \
      -F "document=@${file_path}" \
      -F "caption=${caption}" \
      > /dev/null 2>&1 || true
  fi
}

# ─── Validaciones previas ─────────────────────────────────────────────────────
trap cleanup EXIT

log "=== HarvestPro NZ — E2E Run en Hetzner (${TIMESTAMP}) ==="

# Verificar directorio del repo
if [[ ! -d "$REPO_DIR" ]]; then
  log "ERROR: Directorio no existe: $REPO_DIR"
  log "Clonando repo..."
  mkdir -p /root/repos
  # Ajusta la URL del repo según tu configuración
  git clone git@github.com:tu-usuario/harvestpro-nz.git "$REPO_DIR"
fi

# Verificar credenciales Supabase
if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
  # Intentar leer de .env en el servidor
  if [[ -f "${REPO_DIR}/.env.local" ]]; then
    log "Cargando credenciales desde .env.local del servidor..."
    set -a
    # shellcheck source=/dev/null
    source "${REPO_DIR}/.env.local"
    set +a
    SUPABASE_URL="${VITE_SUPABASE_URL:-}"
    SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}"
  fi
fi

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" || "$SUPABASE_ANON_KEY" == *"PEGAR_AQUI"* ]]; then
  log "ERROR: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son requeridas."
  log "Pásalas como env vars o asegúrate de que .env.local está configurado en el servidor."
  exit 1
fi

# Verificar Node.js
if ! command -v node &>/dev/null; then
  log "ERROR: Node.js no encontrado. Instala Node.js 20+ primero."
  exit 1
fi
NODE_VERSION=$(node --version)
log "Node.js: ${NODE_VERSION}"

# ─── 1. Pull del repo ─────────────────────────────────────────────────────────
log ""
log "1️⃣  Actualizando repositorio..."
cd "$REPO_DIR"
git fetch origin
git pull origin main --rebase 2>&1 | tee -a "$LOG_FILE"
log "Commit actual: $(git rev-parse --short HEAD) — $(git log -1 --format='%s')"

# ─── 2. Instalar dependencias ─────────────────────────────────────────────────
log ""
log "2️⃣  Instalando dependencias..."
HUSKY=0 npm ci --prefer-offline 2>&1 | tail -5 | tee -a "$LOG_FILE"
log "Dependencias instaladas."

# ─── 3. Instalar Playwright browsers ──────────────────────────────────────────
log ""
log "3️⃣  Instalando Playwright browsers..."
npx playwright install --with-deps chromium 2>&1 | tail -10 | tee -a "$LOG_FILE"
log "Playwright listo."

# ─── 4. Generar .env para build ───────────────────────────────────────────────
log ""
log "4️⃣  Configurando .env para build..."
cat > "${REPO_DIR}/.env.local" << EOF
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
VITE_SENTRY_DSN=
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://app.posthog.com
TEST_DEMO_PASSWORD=111111
TEST_MANAGER_PASSWORD=111111
TEST_ACID_PASSWORD=AcidTest2026!
EOF
log ".env.local configurado."

# ─── 5. Build de producción ───────────────────────────────────────────────────
log ""
log "5️⃣  Building app..."
npm run build 2>&1 | tail -10 | tee -a "$LOG_FILE"
log "Build completado."

# ─── 6. Levantar servidor de preview ──────────────────────────────────────────
log ""
log "6️⃣  Levantando servidor de preview en puerto ${SERVE_PORT}..."
fuser -k "${SERVE_PORT}/tcp" 2>/dev/null || true
npx serve dist -l "${SERVE_PORT}" -s &
SERVE_PID=$!
# Esperar a que el servidor esté listo
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${SERVE_PORT}" > /dev/null 2>&1; then
    log "Servidor listo (intento ${i})."
    break
  fi
  sleep 1
done

# ─── 7. Seed de usuarios de test ─────────────────────────────────────────────
if [[ -n "$SUPABASE_SERVICE_KEY" ]]; then
  log ""
  log "7️⃣  Seeding usuarios de test..."
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_KEY" \
    node scripts/seed-users.cjs 2>&1 | tee -a "$LOG_FILE" || \
    log "⚠️  Seed falló (puede que los usuarios ya existan, continuando...)"
else
  log ""
  log "7️⃣  Skipping seed (SUPABASE_SERVICE_ROLE_KEY no configurada)"
fi

# ─── 8. Correr E2E ────────────────────────────────────────────────────────────
log ""
log "8️⃣  Corriendo suite E2E..."
send_telegram "🚀 <b>harvestpro-nz</b> — E2E iniciado en Hetzner
Commit: $(git rev-parse --short HEAD)
$(git log -1 --format='%s')"

E2E_EXIT=0
CI=true ENV=ci npx playwright test \
  --reporter=list,html \
  --workers=4 \
  2>&1 | tee -a "$LOG_FILE" || E2E_EXIT=$?

# ─── 9. Resultados ────────────────────────────────────────────────────────────
log ""
PASSED=$(grep -oP '\d+ passed' "$LOG_FILE" | tail -1 || echo "? passed")
FAILED=$(grep -oP '\d+ failed' "$LOG_FILE" | tail -1 || echo "")
SKIPPED=$(grep -oP '\d+ skipped' "$LOG_FILE" | tail -1 || echo "")

if [[ $E2E_EXIT -eq 0 ]]; then
  STATUS="✅ PASSED"
  EMOJI="✅"
else
  STATUS="❌ FAILED"
  EMOJI="❌"
fi

log "${STATUS} — ${PASSED} ${FAILED} ${SKIPPED}"

# ─── 10. Servir reporte HTML ──────────────────────────────────────────────────
log ""
log "🌐 Sirviendo HTML report en http://95.217.158.7:${REPORT_PORT}"
log "   (disponible por 30 minutos)"
fuser -k "${REPORT_PORT}/tcp" 2>/dev/null || true

# Servir el reporte en background
if [[ -d "${REPO_DIR}/playwright-report" ]]; then
  cd "${REPO_DIR}/playwright-report"
  python3 -m http.server "${REPORT_PORT}" &
  REPORT_PID=$!
  cd "$REPO_DIR"
else
  log "⚠️  playwright-report no encontrado, saltando servidor de reporte"
fi

# Comprimir reporte para Telegram
REPORT_TAR="/tmp/e2e_report_${TIMESTAMP}.tar.gz"
if [[ -d "${REPO_DIR}/playwright-report" ]]; then
  tar -czf "$REPORT_TAR" -C "${REPO_DIR}" playwright-report/ 2>/dev/null || true
fi

# ─── 11. Notificación Telegram ────────────────────────────────────────────────
RESULT_MSG="${EMOJI} <b>harvestpro-nz E2E ${STATUS}</b>
Commit: <code>$(git rev-parse --short HEAD)</code>
${PASSED} ${FAILED} ${SKIPPED}
Reporte: http://95.217.158.7:${REPORT_PORT}
Log: ${LOG_FILE}"

send_telegram "$RESULT_MSG"

# Enviar resumen de fallos si los hay
if [[ $E2E_EXIT -ne 0 ]]; then
  FAILURES=$(grep -E "^  ✘|FAILED|●" "$LOG_FILE" | head -20 || true)
  send_telegram "Fallos E2E:
<pre>${FAILURES}</pre>"
fi

# Enviar archivo de log comprimido si es pequeño
if [[ -f "$LOG_FILE" && $(wc -c < "$LOG_FILE") -lt 50000000 ]]; then
  send_telegram_file "$LOG_FILE" "E2E log ${TIMESTAMP}"
fi

log ""
log "=== Run completo ==="
log "Reporte: http://95.217.158.7:${REPORT_PORT} (30 min)"
log "Log: ${LOG_FILE}"
log "Exit code: ${E2E_EXIT}"

# Mantener el servidor de reporte activo 30 minutos
if [[ -n "${REPORT_PID:-}" ]]; then
  log "Esperando 30 minutos antes de cerrar el servidor de reporte..."
  sleep 1800
fi

exit $E2E_EXIT
