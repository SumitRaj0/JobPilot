import type { JobFilters, Platform } from "@aiapply/shared";
import type { Page } from "playwright";

import type { AutomationLogger } from "../logging/automationLogger.js";

export interface AutomationRunResult {
  success: boolean;
  applied: number;
  skipped: number;
  failed: number;
  /** Jobs you already applied to — not clicked again (for dashboard). */
  alreadyApplied: number;
  /** No Naukri Apply / company-site only — not counted as failed. */
  noApplyButton: number;
  messages: string[];
}

export interface RunContext {
  userId?: string;
  jobId?: string;
}

export interface IPlatformAdapter {
  readonly platform: Platform;
  readonly baseUrl: string;
  run(
    page: Page,
    filters: JobFilters,
    logger: AutomationLogger,
    ctx?: RunContext
  ): Promise<AutomationRunResult>;
}
