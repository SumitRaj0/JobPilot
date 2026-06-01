#!/bin/sh
set -e

echo "[docker] Waiting for Redis at redis:6379..."
until nc -z redis 6379 2>/dev/null; do
  sleep 1
done

echo "[docker] Waiting for backend at backend:3001..."
until nc -z backend 3001 2>/dev/null; do
  sleep 1
done

echo "[docker] Building @aiapply/shared..."
pnpm --filter @aiapply/shared build

mkdir -p /app/worker/sessions /app/worker/screenshots

if [ "$1" = "--prep-only" ]; then
  exit 0
fi

exec "$@"
