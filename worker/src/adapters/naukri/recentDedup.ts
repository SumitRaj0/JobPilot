import { isRedisReady, getRedisConnection } from "../../config/redis.js";

import type { NaukriScrapedJob } from "./types.js";

// Version key so older dedupe data does not poison newer logic.
const RECENT_KEY_PREFIX = "aiapply:naukri:processed:v2";

function recentKey(userId: string): string {
  return `${RECENT_KEY_PREFIX}:${userId}`;
}

export async function filterRecentlyProcessedJobs(
  userId: string,
  jobs: NaukriScrapedJob[]
): Promise<{ jobs: NaukriScrapedJob[]; skippedRecent: number }> {
  if (!isRedisReady() || jobs.length === 0) {
    return { jobs, skippedRecent: 0 };
  }

  const redis = getRedisConnection();
  const key = recentKey(userId);
  const checks = jobs.map((j) => redis.sismember(key, j.jobId));
  const seenFlags = await Promise.all(checks).catch(() => []);

  if (seenFlags.length !== jobs.length) {
    return { jobs, skippedRecent: 0 };
  }

  const filtered: NaukriScrapedJob[] = [];
  let skippedRecent = 0;
  for (let i = 0; i < jobs.length; i++) {
    if (seenFlags[i] === 1) {
      skippedRecent++;
      continue;
    }
    filtered.push(jobs[i]!);
  }

  return { jobs: filtered, skippedRecent };
}

export async function markJobsProcessedRecently(
  userId: string,
  jobIds: string[],
  ttlSeconds: number
): Promise<void> {
  if (!isRedisReady() || jobIds.length === 0) return;
  const redis = getRedisConnection();
  const key = recentKey(userId);
  try {
    await redis.sadd(key, ...jobIds);
    await redis.expire(key, ttlSeconds);
  } catch {
    /* ignore dedupe storage failures */
  }
}
