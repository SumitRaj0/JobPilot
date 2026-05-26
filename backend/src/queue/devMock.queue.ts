import type { AutomationJobData, AutomationJobResult } from "./types.js";

const jobs = new Map<string, AutomationJobData>();

let mockEnabled = false;

export function enableDevMockQueue(): void {
  mockEnabled = true;
  console.info(
    "[Queue] DEV mock mode — jobs kept in memory (install Redis for real queue)"
  );
}

export function isDevMockQueueEnabled(): boolean {
  return mockEnabled;
}

export async function enqueueDevMockJob(
  data: AutomationJobData
): Promise<AutomationJobResult> {
  const jobId = `mock-${data.platform}-${Date.now()}`;
  jobs.set(jobId, data);
  console.info("[Queue] mock job enqueued", jobId, data.platform, data.filters.role);
  return { jobId, status: "queued" };
}

export function getDevMockJob(jobId: string): AutomationJobData | undefined {
  return jobs.get(jobId);
}
