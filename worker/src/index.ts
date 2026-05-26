import { connectRedis, disconnectRedis } from "./config/redis.js";
import { env } from "./config/env.js";
import { startAutomationWorker, stopAutomationWorker } from "./queue/automation.worker.js";

async function bootstrap() {
  console.info("[Worker] AI Apply Playwright worker starting...");
  console.info("[Worker] headless:", env.PLAYWRIGHT_HEADLESS);
  console.info("[Worker] sessions:", env.sessionDir);

  const redisOk = await connectRedis();

  if (!redisOk) {
    console.warn("[Worker] Exiting — connect Redis to consume automation jobs.");
    console.warn(
      "[Worker] Backend DEV mock queue does not publish to Redis; use real Redis + restart backend without mock-only flow."
    );
    process.exit(1);
  }

  startAutomationWorker();

  const shutdown = async () => {
    console.info("[Worker] Shutting down...");
    await stopAutomationWorker();
    await disconnectRedis();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("[Worker] Fatal:", err);
  process.exit(1);
});
