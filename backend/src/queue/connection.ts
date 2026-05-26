import { getRedisConnection, isRedisReady } from "../config/redis.js";

export function getQueueConnection() {
  const connection = getRedisConnection();
  if (!connection) {
    throw new Error("Redis is not available — cannot enqueue jobs");
  }
  return connection;
}

export function isQueueAvailable(): boolean {
  return isRedisReady();
}
