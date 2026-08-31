#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding default roles and asset types..."
npx tsx prisma/seed.ts || true

echo "Starting app..."
exec "$@"
