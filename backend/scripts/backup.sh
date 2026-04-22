#!/bin/bash
# Daily PostgreSQL backup script for CRM Connecteed
# Usage: ./backup.sh [retention_days]

RETENTION_DAYS=${1:-30}
BACKUP_DIR="/backups/crm-connecteed"
DB_NAME="${DB_DATABASE:-crm_connecteed}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USERNAME:-postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Run pg_dump
echo "[$(date)] Starting backup of ${DB_NAME}..."
PGPASSWORD="${DB_PASSWORD}" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "[$(date)] Backup completed: ${BACKUP_FILE} ($(du -h "$BACKUP_FILE" | cut -f1))"
else
  echo "[$(date)] ERROR: Backup failed!"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Cleanup old backups
echo "[$(date)] Removing backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup process complete."
