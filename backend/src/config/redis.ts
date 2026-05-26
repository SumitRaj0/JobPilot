import { Redis } from "ioredis";

import { env } from "./env.js";

let redis: Redis | null = null;
let redisReady = false;

export function isRedisReady(): boolean {
  return redisReady && redis !== null;
}

/** Returns a connected client only after connectRedis() succeeds. */
export function getRedisConnection(): Redis | null {
  return isRedisReady() ? redis : null;
}

export async function connectRedis(): Promise<boolean> {
  if (redisReady && redis) return true;

  await disconnectRedis();

  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  });

  let errorLogged = false;
  client.on("error", (err) => {
    if (!errorLogged && !redisReady) {
      errorLogged = true;
      console.warn("[Redis] Connection error:", err.message);
    }
  });

  try {
    await client.connect();
    await client.ping();
    redis = client;
    redisReady = true;
    console.info("[Redis] Connected");
    return true;
  } catch (err) {
    try {
      client.disconnect();
    } catch {
      /* ignore */
    }
    redis = null;
    redisReady = false;
    console.warn(
      "[Redis] Unavailable — queue disabled:",
      err instanceof Error ? err.message : err
    );
    console.warn(
      "[Redis] Start Redis locally (e.g. Docker: docker run -d -p 6379:6379 redis)"
    );
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!redis) {
    redisReady = false;
    return;
  }
  try {
    redis.disconnect();
  } catch {
    /* ignore */
  }
  redis = null;
  redisReady = false;
}
