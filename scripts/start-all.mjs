import { execSync } from "node:child_process";
import http from "node:http";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionBuild = resolve(root, "extension/build/chrome-mv3-dev/manifest.json");

function waitForHealth(url, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolvePromise, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolvePromise();
          return;
        }
        retry();
      });
      req.on("error", retry);
      req.setTimeout(3000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(tick, 2000);
    };
    tick();
  });
}

function waitForFile(path, timeoutMs = 300_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolvePromise, reject) => {
    const tick = () => {
      if (existsSync(path)) {
        resolvePromise();
        return;
      }
      if (Date.now() > deadline) {
        reject(
          new Error(
            "Extension build not ready. Check: pnpm docker:logs (aiapply-extension container)"
          )
        );
        return;
      }
      setTimeout(tick, 3000);
    };
    tick();
  });
}

console.log("\n[aiapply] Starting Docker (redis, mongo, backend, worker, extension)...\n");
execSync("docker compose up -d", { cwd: root, stdio: "inherit" });

console.log("\n[aiapply] Waiting for API at http://localhost:3001 ...\n");
await waitForHealth("http://localhost:3001/api/health");

console.log("[aiapply] Waiting for extension build (Docker Plasmo watcher)...\n");
await waitForFile(extensionBuild);

console.log("\n[aiapply] Ready!\n");
console.log("  API:       http://localhost:3001");
console.log("  Extension: extension\\build\\chrome-mv3-dev");
console.log("\n  1. Load extension in Chrome once (chrome://extensions → Load unpacked)");
console.log("  2. Open naukri.com → Start Auto Apply");
console.log("  3. When done: pnpm stop");
console.log("\n  Logs: pnpm docker:logs\n");
