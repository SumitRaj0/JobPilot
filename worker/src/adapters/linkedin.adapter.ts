import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import { BasePlatformAdapter } from "./base.adapter.js";
import type { AutomationRunResult } from "./types.js";
import type { AutomationLogger } from "../logging/automationLogger.js";
import { humanDelay } from "../utils/delay.js";

export class LinkedInAdapter extends BasePlatformAdapter {
  readonly platform = "linkedin";
  readonly baseUrl = "https://www.linkedin.com/jobs/";

  async run(
    page: Page,
    filters: JobFilters,
    logger: AutomationLogger,
    _ctx?: import("./types.js").RunContext
  ): Promise<AutomationRunResult> {
    try {
      await this.gotoHome(page, logger);
      const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(filters.role)}`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
      await humanDelay(1000, 2000);
      logger.info("LinkedIn search page loaded", { url: page.url() });

      return this.result({
        success: true,
        messages: [`LinkedIn search staged for: ${filters.role}`],
      });
    } catch (err) {
      const shot = await this.safeScreenshot(page, "linkedin-error");
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error("LinkedIn run failed", { message, shot });
      return this.result({ success: false, failed: 1, messages: [message] });
    }
  }
}
