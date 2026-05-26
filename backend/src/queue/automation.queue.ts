import { Queue } from "bullmq";

import { QUEUE_NAMES } from "@aiapply/shared";

import { isRedisReady } from "../config/redis.js";
import { getQueueConnection } from "./connection.js";
import type { AutomationJobData, AutomationJobResult } from "./types.js";

let automationQueue: Queue<AutomationJobData> | null = null;

export function getAutomationQueue(): Queue<AutomationJobData> | null {
  if (!isRedisReady()) return null;
  if (automationQueue) return automationQueue;

  try {
    const connection = getQueueConnection();
    automationQueue = new Queue<AutomationJobData>(QUEUE_NAMES.AUTOMATION, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    automationQueue.on("error", (err) => {
      console.warn("[Queue] automation error:", err.message);
    });

    return automationQueue;
  } catch {
    automationQueue = null;
    return null;
  }
}

export async function enqueueAutomationJob(
  data: AutomationJobData
): Promise<AutomationJobResult> {
  const queue = getAutomationQueue();

  if (!queue) {
    return {
      jobId: "",
      status: "failed",
      message:
        "Redis queue unavailable — start Redis (port 6379) or set REDIS_URL in .env",
    };
  }

  try {
    const job = await queue.add("run-automation", data, {
      jobId: `${data.platform}-${data.userId}-${Date.now()}`,
    });

    return {
      jobId: job.id ?? "",
      status: "queued",
    };
  } catch (err) {
    return {
      jobId: "",
      status: "failed",
      message: err instanceof Error ? err.message : "Failed to enqueue job",
    };
  }
}
