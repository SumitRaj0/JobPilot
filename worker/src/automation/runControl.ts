import { automationAbortRedisKey, estimateAutomationRunMs } from "@aiapply/shared";
import type { Platform } from "@aiapply/shared";

import { isRedisReady, getRedisConnection } from "../config/redis.js";
import { env } from "../config/env.js";

export class RunDeadline {
  constructor(private readonly endsAtMs: number) {}

  static fromEnv(): RunDeadline {
    return new RunDeadline(Date.now() + env.AUTOMATION_MAX_RUN_MS);
  }

  isExpired(): boolean {
    return Date.now() >= this.endsAtMs;
  }

  remainingMs(): number {
    return Math.max(0, this.endsAtMs - Date.now());
  }
}

export type ShouldAbortRun = () => boolean | Promise<boolean>;

export function createRunAbortChecker(
  userId: string,
  platform: Platform,
  deadline: RunDeadline
): ShouldAbortRun {
  let lastRedisCheck = 0;
  let redisAbort = false;

  return async () => {
    if (deadline.isExpired()) return true;

    const now = Date.now();
    if (now - lastRedisCheck < 1500) {
      return redisAbort;
    }
    lastRedisCheck = now;

    if (!isRedisReady()) return false;

    try {
      const flag = await getRedisConnection().get(
        automationAbortRedisKey(userId, platform)
      );
      redisAbort = flag === "1";
      return redisAbort;
    } catch {
      return false;
    }
  };
}

export async function clearRunAbortFlag(
  userId: string,
  platform: Platform
): Promise<void> {
  if (!isRedisReady()) return;
  try {
    await getRedisConnection().del(automationAbortRedisKey(userId, platform));
  } catch {
    /* ignore */
  }
}

export function resolveAutomationMaxRunMs(): number {
  return env.AUTOMATION_MAX_RUN_MS;
}

/** Re-export for worker env default alignment with extension timer. */
export { estimateAutomationRunMs };
