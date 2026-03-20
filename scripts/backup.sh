#!/usr/bin/env bash
# =============================================================================
# backup.sh — Manual database backup script for HarvestPro NZ
#
# Usage:
#   ./scripts/backup.sh                    # Backup production DB
#   ./scripts/backup.sh --restore FILE     # Restore from a backup file
#   ./scripts/backup.sh --list FILE        # List contents of a backup
#
# Prerequisites:
#   - PostgreSQL client installed (sudo apt install postgresql-client)
#   - DATABASE_URL environment variable set
#     OR individual vars: DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
#
# To get your Supabase direct connection string:
#   Supabase Dashboard → Project Settings → Database → Connection string (URI mode)
#   Use the "Direct connection" URL, NOT the pooler URL for pg_dump
# =============================================================================

set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_FILE="${BACKUP_DIR}/harvestpro_${TIMESTAMP}.dump"

# ── Colours ──────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

# ── Parse args ───────────────────────────────────────────
ACTION="backup"
TARGET_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --restore) ACTION="restore"; TARGET_FILE="$2"; shift 2 ;;
    --list)    ACTION="list";    TARGET_FILE="$2"; shift 2 ;;
    *) error "Unknown argument: $1. Use --restore FILE or --list FILE" ;;
  esac
done

# ── Connection config ─────────────────────────────────────
if [[ -n "${DATABASE_URL:-}" ]]; then
  info "Using DATABASE_URL connection"
  CONN_ARGS="$DATABASE_URL"
else
  : "${DATABASE_HOST:?DATABASE_HOST not set}"
  : "${DATABASE_USER:?DATABASE_USER not set}"
  : "${DATABASE_PASSWORD:?DATABASE_PASSWORD not set}"
  : "${DATABASE_NAME:?DATABASE_NAME not set}"
  export PGPASSWORD="$DATABASE_PASSWORD"
  CONN_ARGS="--host=$DATABASE_HOST --port=5432 --username=$DATABASE_USER --dbname=$DATABASE_NAME"
fi

# ── Actions ───────────────────────────────────────────────

do_backup() {
  mkdir -p "$BACKUP_DIR"
  info "Starting backup → $BACKUP_FILE"
  
  if [[ -n "${DATABASE_URL:-}" ]]; then
    pg_dump "$DATABASE_URL" \
      --format=custom \
      --compress=9 \
      --no-acl \
      --no-owner \
      --file="$BACKUP_FILE"
  else
    pg_dump $CONN_ARGS \
      --format=custom \
      --compress=9 \
      --no-acl \
      --no-owner \
      --file="$BACKUP_FILE"
  fi

  # Verify integrity
  pg_restore --list "$BACKUP_FILE" > /dev/null
  
  SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
  info "✅ Backup complete: $BACKUP_FILE ($SIZE)"
  info "   Integrity: verified (pg_restore --list passed)"
  info "   Restore with: $0 --restore $BACKUP_FILE"
}

do_restore() {
  [[ -f "$TARGET_FILE" ]] || error "File not found: $TARGET_FILE"
  
  warn "⚠️  This will restore from: $TARGET_FILE"
  warn "⚠️  Target database: ${DATABASE_NAME:-from DATABASE_URL}"
  warn ""
  read -rp "Type 'RESTORE' to confirm: " CONFIRM
  [[ "$CONFIRM" == "RESTORE" ]] || error "Aborted."
  
  info "Restoring from $TARGET_FILE..."
  if [[ -n "${DATABASE_URL:-}" ]]; then
    pg_restore "$DATABASE_URL" \
      --format=custom \
      --no-acl \
      --no-owner \
      --clean \
      --if-exists \
      "$TARGET_FILE"
  else
    pg_restore $CONN_ARGS \
      --format=custom \
      --no-acl \
      --no-owner \
      --clean \
      --if-exists \
      "$TARGET_FILE"
  fi
  
  info "✅ Restore complete"
}

do_list() {
  [[ -f "$TARGET_FILE" ]] || error "File not found: $TARGET_FILE"
  info "Contents of $TARGET_FILE:"
  pg_restore --list "$TARGET_FILE"
}

case "$ACTION" in
  backup)  do_backup ;;
  restore) do_restore ;;
  list)    do_list ;;
esac
