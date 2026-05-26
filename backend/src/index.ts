import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { enableDevMockQueue } from "./queue/devMock.queue.js";

async function bootstrap() {
  await connectDatabase();
  const redisOk = await connectRedis();
  if (!redisOk && env.NODE_ENV === "development" && env.DEV_MOCK_QUEUE) {
    enableDevMockQueue();
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.info(`AI Apply API listening on http://localhost:${env.PORT}`);
    console.info(`  Health:  GET  /api/health`);
    console.info(`  Meta:    POST /api/extension/page-metadata`);
    console.info(`  Start:   POST /api/automation/start`);
    console.info(`  Stop:    POST /api/automation/stop`);
    console.info(`  Status:  GET  /api/automation/status`);
  });

  const shutdown = async () => {
    console.info("Shutting down...");
    server.close();
    await disconnectDatabase();
    await disconnectRedis();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
