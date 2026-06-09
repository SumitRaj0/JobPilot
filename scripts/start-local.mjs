import net from "node:net";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function portOpen(port, host = "127.0.0.1", timeoutMs = 1500) {
  return new Promise((resolvePromise) => {
    const socket = net.createConnection({ port, host });
    const done = (ok) => {
      socket.destroy();
      resolvePromise(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
  });
}

console.log("\n=== AI Apply — local mode (no Docker Compose) ===\n");

try {
  execSync("pnpm --filter @aiapply/shared build", { cwd: root, stdio: "inherit" });
} catch {
  console.error("\nShared build failed. Run: pnpm install && pnpm --filter @aiapply/shared build\n");
  process.exit(1);
}

const redisOk = await portOpen(6379);
const mongoOk = await portOpen(27017);

console.log("Prerequisites:");
console.log(`  Redis (6379):   ${redisOk ? "running" : "NOT running — worker needs this"}`);
console.log(`  MongoDB (27017): ${mongoOk ? "running" : "optional (API works without it)"}`);
console.log("");

if (!redisOk) {
  console.log("Start Redis (lightweight — not full Docker Compose):");
  console.log("  • Memurai / Redis for Windows, or");
  console.log("  • WSL: sudo service redis-server start, or");
  console.log("  • One container only: docker run -d --name aiapply-redis -p 6379:6379 redis:7-alpine");
  console.log("");
  console.log("In .env set: DEV_MOCK_QUEUE=false");
  console.log("");
}

console.log("Open 3 terminals and run:\n");
console.log("  Terminal 1:  pnpm dev:backend");
console.log("  Terminal 2:  pnpm dev:worker");
console.log("  Terminal 3:  pnpm dev:extension");
console.log("");
console.log("First Naukri login (worker opens Chromium on your PC):");
console.log("  In worker/.env: PLAYWRIGHT_HEADLESS=false");
console.log("");
console.log("Chrome:");
console.log("  1. chrome://extensions → Load unpacked → extension\\build\\chrome-mv3-dev");
console.log("  2. Open naukri.com → Start Auto Apply");
console.log("");
console.log("Stop: Ctrl+C in each terminal.");
console.log("");
