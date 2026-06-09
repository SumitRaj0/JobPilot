import { Redis } from "ioredis";

import { env } from "./env.js";

let redis: Redis | null = null;let redisReady = false;

/** Dedicated connection for BullMQ worker (must not share the app Redis client). */
let bullWorkerRedis: Redis | null = null;

export function isRedisReady(): boolean {
  return redisReady && redis !== null;
}

export function getRedisConnection(): Redis {
  if (!isRedisReady() || !redis) {
    throw new Error("Redis is not connected");
  }
  return redis;
}

/** BullMQ worker needs its own ioredis client with blocking commands. */
export function getBullWorkerConnection(): Redis {
  if (!bullWorkerRedis) {
    bullWorkerRedis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return bullWorkerRedis;
}

export async function connectRedis(): Promise<boolean> {
  if (redisReady && redis) return true;

  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  });

  try {
    await client.connect();
    await client.ping();
    redis = client;
    redisReady = true;
    console.info("[Worker] Redis connected");
    return true;
  } catch (err) {
    try {
      client.disconnect();
    } catch {
      /* ignore */
    }
    console.warn(
      "[Worker] Redis unavailable:",
      err instanceof Error ? err.message : err
    );
    console.warn(
      "[Worker] Start Redis to process jobs from the queue (mock backend jobs are not in Redis)"
    );
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (bullWorkerRedis) {
    try {
      await bullWorkerRedis.quit();
    } catch {
      bullWorkerRedis.disconnect();
    }
    bullWorkerRedis = null;
  }
  if (!redis) return;
  redis.disconnect();
  redis = null;
  redisReady = false;
}
