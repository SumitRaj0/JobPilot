#!/bin/sh
set -e

echo "[docker] Waiting for Redis at redis:6379..."
until nc -z redis 6379 2>/dev/null; do
  sleep 1
done

exec "$@"
