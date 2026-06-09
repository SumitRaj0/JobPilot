#!/bin/sh
set -e

sharp_ok() {
  node -e "require('sharp')" >/dev/null 2>&1
}

if [ -f node_modules/.docker-deps-done ] && [ -f shared/dist/index.js ] && sharp_ok; then
  # Reinstall if Playwright npm package drifted from the Docker image browsers
  pw_ver=$(node -p "require('playwright/package.json').version" 2>/dev/null || echo "")
  if [ "$pw_ver" = "1.60.0" ]; then
    echo "[docker] Dependencies already installed, skipping."
    exit 0
  fi
  echo "[docker] Playwright version changed ($pw_ver) — refreshing deps..."
  rm -f node_modules/.docker-deps-done
fi

echo "[docker] Installing workspace dependencies..."
rm -rf shared/node_modules backend/node_modules worker/node_modules extension/node_modules dashboard/node_modules 2>/dev/null || true
CI=true pnpm install --frozen-lockfile

echo "[docker] Building native modules (sharp, esbuild)..."
pnpm rebuild sharp esbuild @swc/core || pnpm rebuild sharp esbuild @swc/core

echo "[docker] Building @aiapply/shared..."
pnpm --filter @aiapply/shared build

touch node_modules/.docker-deps-done
echo "[docker] Dependencies ready."
