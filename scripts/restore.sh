#!/bin/sh
# Restores a backup created by scripts/backup.sh.
# DESTRUCTIVE: permanently replaces the current database and uploaded files. Cannot be undone.
# Usage: scripts/restore.sh backups/<timestamp>
set -e

cd "$(dirname "$0")/.."
[ -f .env ] && { set -a; . ./.env; set +a; }

BACKUP_DIR="$1"
if [ -z "$BACKUP_DIR" ] || [ ! -f "$BACKUP_DIR/database.sql" ]; then
  echo "Usage: scripts/restore.sh backups/<timestamp>"
  exit 1
fi

echo "This will PERMANENTLY REPLACE the current database and uploaded files"
echo "with the contents of $BACKUP_DIR. This cannot be undone."
printf "Type 'yes' to continue: "
read -r CONFIRM
[ "$CONFIRM" = "yes" ] || { echo "Aborted."; exit 1; }

echo "Stopping app..."
docker compose stop app

echo "Restoring database..."
docker compose exec -T db psql -U "${POSTGRES_USER:-assetmgmt}" -d postgres -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB:-assetmgmt}\";"
docker compose exec -T db psql -U "${POSTGRES_USER:-assetmgmt}" -d postgres -c "CREATE DATABASE \"${POSTGRES_DB:-assetmgmt}\";"
docker compose exec -T db psql -U "${POSTGRES_USER:-assetmgmt}" -d "${POSTGRES_DB:-assetmgmt}" < "$BACKUP_DIR/database.sql"

if [ -f "$BACKUP_DIR/uploads.tar.gz" ]; then
  echo "Restoring uploaded files..."
  # --entrypoint overrides docker-entrypoint.sh so this doesn't also run migrate/seed.
  docker compose run --rm --no-deps --entrypoint sh -v "$(pwd)/$BACKUP_DIR:/backup:ro" app \
    -c "rm -rf /app/uploads/* && tar xzf /backup/uploads.tar.gz -C /app/uploads"
fi

echo "Restore complete. Starting app..."
docker compose up -d app
