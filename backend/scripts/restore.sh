#!/bin/bash
# PostgreSQL restore script for CRM Connecteed
# Usage: ./restore.sh <backup_file>
#
# Examples:
#   ./restore.sh /backups/crm-connecteed/backup_crm_connecteed_20260415_020000.sql.gz
#   DB_DATABASE=crm_staging ./restore.sh /backups/crm-connecteed/backup_crm_connecteed_20260415_020000.sql.gz

set -e

BACKUP_FILE="$1"
DB_NAME="${DB_DATABASE:-crm_connecteed}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USERNAME:-postgres}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh /backups/crm-connecteed/backup_*.sql.gz 2>/dev/null || echo "  No backups found in /backups/crm-connecteed/"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "[$(date)] WARNING: This will DROP and recreate database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}"
echo "[$(date)] Backup file: ${BACKUP_FILE}"
read -p "Are you sure? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 0
fi

echo "[$(date)] Terminating existing connections to ${DB_NAME}..."
PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" 2>/dev/null || true

echo "[$(date)] Dropping database ${DB_NAME}..."
PGPASSWORD="${DB_PASSWORD}" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME"

echo "[$(date)] Creating database ${DB_NAME}..."
PGPASSWORD="${DB_PASSWORD}" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

echo "[$(date)] Restoring from ${BACKUP_FILE}..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --quiet

if [ $? -eq 0 ]; then
  echo "[$(date)] Restore completed successfully."
else
  echo "[$(date)] ERROR: Restore failed!"
  exit 1
fi
