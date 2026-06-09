import type { JobFilters, NaukriFilterBreakdown, Platform } from "@aiapply/shared";
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

export interface RunContext {
  userId?: string;
  jobId?: string;
  /** Stops applying when timer expires or user hits Stop in the panel. */
  shouldAbort?: () => boolean | Promise<boolean>;
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
