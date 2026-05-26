import type { Request, Response } from "express";

import { isDatabaseConnected } from "../config/database.js";
import { env } from "../config/env.js";
import { isRedisReady } from "../config/redis.js";
import { isQueueAvailable } from "../queue/connection.js";
import { isDevMockQueueEnabled } from "../queue/devMock.queue.js";

export function healthCheck(_req: Request, res: Response) {
  res.json({
    ok: true,
    service: "aiapply-backend",
    env: env.NODE_ENV,
    mongo: isDatabaseConnected(),
    redis: isRedisReady(),
    queue: isQueueAvailable(),
    queueMode: isQueueAvailable()
      ? "redis"
      : isDevMockQueueEnabled()
        ? "mock"
        : "disabled",
    devMockQueue: env.DEV_MOCK_QUEUE,
  });
}
