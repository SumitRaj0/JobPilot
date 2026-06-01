#!/bin/sh
set -e

# Reuse Redis/backend wait + shared build from worker entrypoint
/entrypoint-worker.sh --prep-only

export DISPLAY="${DISPLAY:-:99}"

echo "[docker] Starting virtual display on ${DISPLAY}..."
Xvfb "${DISPLAY}" -screen 0 1366x768x24 -ac +extension GLX +render -noreset &
sleep 1

fluxbox >/dev/null 2>&1 &

echo "[docker] Starting VNC (5900) and noVNC (6080) — dev only, no password..."
x11vnc -display "${DISPLAY}" -forever -shared -rfbport 5900 -nopw -localhost &
websockify --web /usr/share/novnc 6080 localhost:5900 &

export PLAYWRIGHT_HEADLESS=false

echo "[docker] Open http://localhost:6080/vnc.html to see the Playwright browser"
echo "[docker] After Naukri login, sessions persist in worker/sessions volume"

exec "$@"
