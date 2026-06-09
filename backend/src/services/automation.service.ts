import {
  automationAbortRedisKey,
  type ExtensionPageMetadata,
  type JobFilters,
  type NaukriFilterBreakdown,
  type Platform,
} from "@aiapply/shared";

import { env } from "../config/env.js";
import { getRedisConnection, isRedisReady } from "../config/redis.js";
import { getPlatformAdapter } from "../adapters/index.js";
import { AppError } from "../middleware/errorHandler.js";
import { enqueueAutomationJob } from "../queue/automation.queue.js";
import { isQueueAvailable } from "../queue/connection.js";
import {
  enqueueDevMockJob,
  isDevMockQueueEnabled,
} from "../queue/devMock.queue.js";
import type { AutomationJobData } from "../queue/types.js";

export const ALL_PLATFORMS: Platform[] = ["naukri", "linkedin"];

export interface AutomationLastRun {
  jobId: string;
  platform: Platform;
  success: boolean;
  applied: number;
  skipped: number;
  failed: number;
  alreadyApplied: number;
  noApplyButton: number;
  messages: string[];
  filterBreakdown?: NaukriFilterBreakdown;
  recommendedStats?: {
    found: number;
    matched: number;
    ready: number;
    applied: number;
    skipped: number;
    failed: number;
    successRate: number;
  };
  finishedAt: string;
}

interface SessionEntry {
  platform: Platform;
  jobId: string;
}

/** Per-user active jobs — one entry per platform (parallel runs allowed). */
const runningSessions = new Map<string, Map<Platform, SessionEntry>>();
const lastRuns = new Map<string, Map<Platform, AutomationLastRun>>();

function userSessions(userId: string): Map<Platform, SessionEntry> {
  let map = runningSessions.get(userId);
  if (!map) {
    map = new Map();
    runningSessions.set(userId, map);
  }
  return map;
}

function userLastRuns(userId: string): Map<Platform, AutomationLastRun> {
  let map = lastRuns.get(userId);
  if (!map) {
    map = new Map();
    lastRuns.set(userId, map);
  }
  return map;
}

export class AutomationService {
  async start(input: {
    userId: string;
    platform: Platform;
    filters: JobFilters;
    pageMetadata?: ExtensionPageMetadata;
  }) {
    const effectiveFilters: JobFilters =
      input.platform === "naukri"
        ? input.filters
        : { ...input.filters, mode: "search" };

    const sessions = userSessions(input.userId);
    const runs = userLastRuns(input.userId);
    if (sessions.has(input.platform)) {
      throw new AppError(409, `Automation already running on ${input.platform}`);
    }

    const adapter = getPlatformAdapter(input.platform);
    const errors = adapter.validateFilters(effectiveFilters);

    if (errors.length > 0) {
      throw new AppError(400, "Invalid filters", errors);
    }

    const searchPayload = adapter.buildSearchPayload(effectiveFilters);

    const jobData: AutomationJobData = {
      userId: input.userId,
      platform: input.platform,
      mode: effectiveFilters.mode,
      filters: effectiveFilters,
      pageMetadata: input.pageMetadata,
      enqueuedAt: new Date().toISOString(),
    };

    const result = await this.enqueueJob(jobData);

    if (result.status === "failed") {
      throw new AppError(503, result.message ?? "Queue unavailable");
    }

    sessions.set(input.platform, {
      platform: input.platform,
      jobId: result.jobId,
    });
    runs.delete(input.platform);

    await this.clearAbortFlag(input.userId, input.platform);

    return {
      ...result,
      platform: input.platform,
      searchPayload,
      queueAvailable: isQueueAvailable(),
      mockQueue: isDevMockQueueEnabled(),
    };
  }

  /** Enqueue Naukri + LinkedIn in parallel (requires worker concurrency ≥ 2). */
  async startAll(input: { userId: string; filters: JobFilters }) {
    const started: Awaited<ReturnType<AutomationService["start"]>>[] = [];
    const skipped: Platform[] = [];
    const errors: { platform: Platform; message: string }[] = [];

    for (const platform of ALL_PLATFORMS) {
      if (userSessions(input.userId).has(platform)) {
        skipped.push(platform);
        continue;
      }
      try {
        const result = await this.start({
          userId: input.userId,
          platform,
          filters: input.filters,
        });
        started.push(result);
      } catch (err) {
        const message =
          err instanceof AppError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Start failed";
        errors.push({ platform, message });
      }
    }

    if (started.length === 0 && errors.length > 0) {
      throw new AppError(503, "Could not start any platform", errors);
    }

    return {
      status: "queued" as const,
      platforms: started.map((s) => s.platform),
      skipped,
      errors,
      jobs: started,
      queueAvailable: isQueueAvailable(),
      mockQueue: isDevMockQueueEnabled(),
    };
  }

  async stop(userId: string, platform?: Platform) {
    const sessions = runningSessions.get(userId);
    const runs = userLastRuns(userId);
    if (!sessions || sessions.size === 0) {
      return { running: false, message: "No active session" };
    }

    if (!platform) {
      const stopped = [...sessions.keys()];
      for (const p of stopped) {
        await this.setAbortFlag(userId, p);
        runs.delete(p);
      }
      runningSessions.delete(userId);
      return { running: false, stoppedPlatforms: stopped };
    }

    await this.setAbortFlag(userId, platform);
    runs.delete(platform);

    if (!sessions.has(platform)) {
      return {
        running: sessions.size > 0,
        runningPlatforms: [...sessions.keys()],
        message: `No active job on ${platform}`,
      };
    }

    sessions.delete(platform);
    if (sessions.size === 0) {
      runningSessions.delete(userId);
    }

    return {
      running: sessions.size > 0,
      runningPlatforms: [...sessions.keys()],
      stoppedPlatform: platform,
    };
  }

  complete(
    userId: string,
    input: {
      jobId: string;
      platform: Platform;
      success: boolean;
      applied: number;
      skipped: number;
      failed: number;
      alreadyApplied: number;
      noApplyButton: number;
      messages: string[];
      filterBreakdown?: NaukriFilterBreakdown;
      recommendedStats?: {
        found: number;
        matched: number;
        ready: number;
        applied: number;
        skipped: number;
        failed: number;
        successRate: number;
      };
    }
  ) {
    const sessions = runningSessions.get(userId);
    sessions?.delete(input.platform);

    const lastRun: AutomationLastRun = {
      ...input,
      finishedAt: new Date().toISOString(),
    };
    userLastRuns(userId).set(input.platform, lastRun);

    if (sessions && sessions.size === 0) {
      runningSessions.delete(userId);
    }

    return {
      running: Boolean(sessions && sessions.size > 0),
      runningPlatforms: sessions ? [...sessions.keys()] : [],
      lastRun,
    };
  }

  getStatus(userId: string) {
    const sessions = runningSessions.get(userId);
    const runningPlatforms = sessions ? [...sessions.keys()] : [];
    const platformRuns = userLastRuns(userId);

    const aggregateLastRun =
      runningPlatforms.length === 0 && platformRuns.size > 0
        ? [...platformRuns.values()].sort(
            (a, b) =>
              new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
          )[0]
        : null;

    const primaryPlatform =
      runningPlatforms[0] ?? aggregateLastRun?.platform ?? null;

    return {
      running: runningPlatforms.length > 0,
      platform: primaryPlatform,
      runningPlatforms,
      jobId: primaryPlatform ? sessions?.get(primaryPlatform)?.jobId ?? null : null,
      lastRun: primaryPlatform
        ? (platformRuns.get(primaryPlatform) ?? aggregateLastRun)
        : aggregateLastRun,
      lastRunsByPlatform: Object.fromEntries(platformRuns),
      queueAvailable: isQueueAvailable(),
      mockQueue: isDevMockQueueEnabled(),
    };
  }

  private async setAbortFlag(userId: string, platform: Platform): Promise<void> {
    const redis = getRedisConnection();
    if (!redis) return;
    try {
      await redis.set(automationAbortRedisKey(userId, platform), "1", "EX", 7200);
    } catch {
      /* ignore */
    }
  }

  private async clearAbortFlag(userId: string, platform: Platform): Promise<void> {
    const redis = getRedisConnection();
    if (!redis) return;
    try {
      await redis.del(automationAbortRedisKey(userId, platform));
    } catch {
      /* ignore */
    }
  }

  private async enqueueJob(jobData: AutomationJobData) {
    if (isQueueAvailable()) {
      return enqueueAutomationJob(jobData);
    }

    if (env.NODE_ENV === "development" && env.DEV_MOCK_QUEUE) {
      return enqueueDevMockJob(jobData);
    }

    return {
      jobId: "",
      status: "failed" as const,
      message:
        "Redis queue unavailable — start Redis (port 6379) or set DEV_MOCK_QUEUE=true in development",
    };
  }
}

export const automationService = new AutomationService();
