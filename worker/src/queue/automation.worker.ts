import { Worker } from "bullmq";

import { QUEUE_NAMES } from "@aiapply/shared";

import { runAutomation, type AutomationJobPayload } from "../automation/runAutomation.js";
import { getRedisConnection } from "../config/redis.js";
import { env } from "../config/env.js";
import { browserManager } from "../browser/BrowserManager.js";
import { notifyJobComplete } from "../notifyBackend.js";

let worker: Worker<AutomationJobPayload> | null = null;

export function startAutomationWorker(): Worker<AutomationJobPayload> {
  if (worker) return worker;

  const connection = getRedisConnection();

  worker = new Worker<AutomationJobPayload>(
    QUEUE_NAMES.AUTOMATION,
    async (job) => {
      const jobId = job.id ?? "unknown";
      console.info(`[Worker] Processing job ${jobId}`, job.data.platform);
      const result = await runAutomation(jobId, job.data);
      await notifyJobComplete(job.data.userId, job.data.platform, jobId, result);
      return result;
    },
    {
      connection,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (job, result) => {
    console.info(`[Worker] Job ${job.id} completed`, result);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[Worker] Queue error:", err.message);
  });

  console.info(
    `[Worker] Listening on queue "${QUEUE_NAMES.AUTOMATION}" (concurrency ${env.WORKER_CONCURRENCY})`
  );

  return worker;
}

export async function stopAutomationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  await browserManager.close();
}
