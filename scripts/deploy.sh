#!/usr/bin/env bash
# deploy.sh — Despliega migraciones y Edge Functions a Supabase production
# Uso: bash scripts/deploy.sh
# Prerequisito: npx supabase link --project-ref <ref> (una sola vez)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "=== HarvestPro NZ — Supabase Deploy ==="
echo ""

# 1. Verificar que Supabase CLI esta disponible
if ! npx supabase --version &>/dev/null; then
  echo "ERROR: Supabase CLI no encontrado. Ejecuta: npm i supabase --save-dev"
  exit 1
fi

# 2. Verificar que el proyecto esta linkeado
if [ ! -f "supabase/.temp/project-ref" ] 2>/dev/null; then
  echo "WARN: No se encontro project-ref. Asegurate de haber ejecutado:"
  echo "  npx supabase link --project-ref <tu-project-ref>"
  echo ""
fi

# 3. Push de migraciones a la base de datos remota
echo "[1/3] Pushing database migrations..."
npx supabase db push
echo "  OK — Migraciones aplicadas"
echo ""

# 4. Deploy de todas las Edge Functions
echo "[2/3] Deploying Edge Functions..."
FUNCTIONS_DIR="supabase/functions"
DEPLOYED=0
FAILED=0

for func_dir in "$FUNCTIONS_DIR"/*/; do
  func_name="$(basename "$func_dir")"
  # Saltar directorio _shared (no es una funcion)
  if [ "$func_name" = "_shared" ]; then
    continue
  fi
  echo "  Deploying $func_name..."
  # verify_jwt se configura en config.toml, no hace falta flag aqui
  if npx supabase functions deploy "$func_name"; then
    DEPLOYED=$((DEPLOYED + 1))
  else
    echo "  FAIL: $func_name"
    FAILED=$((FAILED + 1))
  fi
done

echo "  Deployed: $DEPLOYED | Failed: $FAILED"
echo ""

# 5. Status final
echo "[3/3] Checking project status..."
npx supabase status 2>/dev/null || echo "  (status solo disponible con proyecto local corriendo)"
echo ""

echo "=== Deploy completado ==="
echo "Funciones desplegadas: $DEPLOYED"
if [ "$FAILED" -gt 0 ]; then
  echo "ATENCION: $FAILED funciones fallaron. Revisa los errores arriba."
  exit 1
fi
