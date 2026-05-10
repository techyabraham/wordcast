#!/bin/sh
set -e

echo "[api] Running database migrations..."
npx prisma migrate deploy --schema ./prisma/schema.prisma

echo "[api] Starting server..."
exec node dist/main.js
