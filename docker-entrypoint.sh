#!/bin/sh
set -e

# Build DATABASE_URL from the individual POSTGRES_* parts, URL-encoding the
# user/password so special characters (e.g. from `openssl rand -base64`,
# which can produce '/', '+', '=') can't corrupt the connection string —
# a raw `/` in the password, for example, gets read as a path separator and
# breaks parsing further down the URL (surfaces as Prisma's P1013 "invalid
# port number"). Skipped if DATABASE_URL is already set directly (e.g. for
# an external/managed Postgres not named "db" on the compose network).
if [ -z "$DATABASE_URL" ] && [ -n "$POSTGRES_PASSWORD" ]; then
  ENC_USER=$(node -e "process.stdout.write(encodeURIComponent(process.env.POSTGRES_USER || 'assetmgmt'))")
  ENC_PASS=$(node -e "process.stdout.write(encodeURIComponent(process.env.POSTGRES_PASSWORD))")
  ENC_DB=$(node -e "process.stdout.write(encodeURIComponent(process.env.POSTGRES_DB || 'assetmgmt'))")
  export DATABASE_URL="postgresql://${ENC_USER}:${ENC_PASS}@${POSTGRES_HOST:-db}:${POSTGRES_INTERNAL_PORT:-5432}/${ENC_DB}?schema=public"
fi

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding default roles and asset types..."
npx tsx prisma/seed.ts || true

echo "Starting app..."
exec "$@"
