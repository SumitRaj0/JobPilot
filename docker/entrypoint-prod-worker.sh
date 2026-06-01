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

mkdir -p /app/worker/sessions /app/worker/screenshots

exec "$@"
