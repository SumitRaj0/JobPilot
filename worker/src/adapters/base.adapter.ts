import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import type { AutomationLogger } from "../logging/automationLogger.js";
import { humanDelay } from "../utils/delay.js";
import { withRetry } from "../utils/retry.js";
import { captureScreenshot } from "../utils/screenshot.js";
import type { AutomationRunResult, IPlatformAdapter, RunContext } from "./types.js";

export abstract class BasePlatformAdapter implements IPlatformAdapter {
  abstract readonly platform: IPlatformAdapter["platform"];
  abstract readonly baseUrl: string;

  protected async gotoHome(page: Page, logger: AutomationLogger): Promise<void> {
    await withRetry(
      async () => {
        await page.goto(this.baseUrl, { waitUntil: "domcontentloaded" });
        await humanDelay(600, 1400);
      },
      { label: `${this.platform}-goto`, attempts: 3 }
    );
    logger.info("Opened platform home", { url: page.url() });
  }

  protected async safeScreenshot(
    page: Page,
    label: string,
    jobId?: string
  ): Promise<string | undefined> {
    try {
      return await captureScreenshot(page, label, this.platform, jobId);
    } catch {
      return undefined;
    }
  }

  protected result(
    partial: Partial<AutomationRunResult> & { success: boolean }
  ): AutomationRunResult {
    return {
      applied: 0,
      skipped: 0,
      failed: 0,
      alreadyApplied: 0,
      noApplyButton: 0,
      messages: [],
      ...partial,
    };
  }

  abstract run(
    page: Page,
    filters: JobFilters,
    logger: AutomationLogger,
    ctx?: RunContext
  ): Promise<AutomationRunResult>;
}
