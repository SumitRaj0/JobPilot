import type { Platform } from "@aiapply/shared";

import { env } from "./config/env.js";
import type { AutomationRunResult } from "./adapters/types.js";

export async function notifyJobComplete(
  userId: string,
  platform: Platform,
  jobId: string,
  result: AutomationRunResult
): Promise<void> {
  const url = `${env.BACKEND_URL}/api/automation/complete`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        jobId,
        platform,
        success: result.success,
        applied: result.applied,
        skipped: result.skipped,
        failed: result.failed,
        alreadyApplied: result.alreadyApplied,
        noApplyButton: result.noApplyButton,
        messages: result.messages,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn("[Worker] Backend complete notify failed", response.status, text);
    }
  } catch (err) {
    console.warn(
      "[Worker] Backend complete notify error",
      err instanceof Error ? err.message : err
    );
  }
}
