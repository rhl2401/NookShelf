#!/bin/sh
# Backs up the database and uploaded files to backups/<timestamp>/.
# Run this before upgrading — see README.md "Upgrading an existing instance".
set -e

cd "$(dirname "$0")/.."
[ -f .env ] && { set -a; . ./.env; set +a; }

TIMESTAMP=$(date +%Y%m%d%H%M%S)
OUT_DIR="backups/${TIMESTAMP}"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"

echo "Backing up database..."
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-assetmgmt}" "${POSTGRES_DB:-assetmgmt}" > "$OUT_DIR/database.sql"

echo "Backing up uploaded files..."
docker compose exec -T app tar czf - -C /app/uploads . > "$OUT_DIR/uploads.tar.gz"

echo "Backup written to $OUT_DIR/"
