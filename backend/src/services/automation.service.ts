import type { ExtensionPageMetadata, JobFilters, Platform } from "@aiapply/shared";

import { env } from "../config/env.js";
import { getPlatformAdapter } from "../adapters/index.js";
import { AppError } from "../middleware/errorHandler.js";
import { enqueueAutomationJob } from "../queue/automation.queue.js";
import { isQueueAvailable } from "../queue/connection.js";
import {
  enqueueDevMockJob,
  isDevMockQueueEnabled,
} from "../queue/devMock.queue.js";
import type { AutomationJobData } from "../queue/types.js";

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
  finishedAt: string;
}

const runningSessions = new Map<string, { platform: Platform; jobId: string }>();
const lastRuns = new Map<string, AutomationLastRun>();

export class AutomationService {
  async start(input: {
    userId: string;
    platform: Platform;
    filters: JobFilters;
    pageMetadata?: ExtensionPageMetadata;
  }) {
    const adapter = getPlatformAdapter(input.platform);
    const errors = adapter.validateFilters(input.filters);

    if (errors.length > 0) {
      throw new AppError(400, "Invalid filters", errors);
    }

    const searchPayload = adapter.buildSearchPayload(input.filters);

    const jobData: AutomationJobData = {
      userId: input.userId,
      platform: input.platform,
      filters: input.filters,
      pageMetadata: input.pageMetadata,
      enqueuedAt: new Date().toISOString(),
    };

    const result = await this.enqueueJob(jobData);

    if (result.status === "failed") {
      throw new AppError(503, result.message ?? "Queue unavailable");
    }

    runningSessions.set(input.userId, {
      platform: input.platform,
      jobId: result.jobId,
    });

    return {
      ...result,
      platform: input.platform,
      searchPayload,
      queueAvailable: isQueueAvailable(),
      mockQueue: isDevMockQueueEnabled(),
    };
  }

  async stop(userId: string, platform?: Platform) {
    const session = runningSessions.get(userId);
    if (!session) {
      return { running: false, message: "No active session" };
    }

    if (platform && session.platform !== platform) {
      return { running: true, platform: session.platform };
    }

    runningSessions.delete(userId);
    return { running: false, jobId: session.jobId };
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
    }
  ) {
    runningSessions.delete(userId);
    const lastRun: AutomationLastRun = {
      ...input,
      finishedAt: new Date().toISOString(),
    };
    lastRuns.set(userId, lastRun);
    return { running: false, lastRun };
  }

  getStatus(userId: string) {
    const session = runningSessions.get(userId);
    const lastRun = lastRuns.get(userId) ?? null;
    return {
      running: Boolean(session),
      platform: session?.platform ?? lastRun?.platform ?? null,
      jobId: session?.jobId ?? lastRun?.jobId ?? null,
      lastRun,
      queueAvailable: isQueueAvailable(),
      mockQueue: isDevMockQueueEnabled(),
    };
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
