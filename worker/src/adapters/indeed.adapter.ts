import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import { BasePlatformAdapter } from "./base.adapter.js";
import type { AutomationRunResult } from "./types.js";
import type { AutomationLogger } from "../logging/automationLogger.js";
import { humanDelay } from "../utils/delay.js";

export class IndeedAdapter extends BasePlatformAdapter {
  readonly platform = "indeed";
  readonly baseUrl = "https://www.indeed.com";

  async run(
    page: Page,
    filters: JobFilters,
    logger: AutomationLogger,
    _ctx?: import("./types.js").RunContext
  ): Promise<AutomationRunResult> {
    try {
      await this.gotoHome(page, logger);
      const params = new URLSearchParams({ q: filters.role });
      if (filters.remote) params.set("remotejob", "1");
      const searchUrl = `https://www.indeed.com/jobs?${params.toString()}`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
      await humanDelay(800, 1600);
      logger.info("Indeed search page loaded", { url: page.url() });

      return this.result({
        success: true,
        messages: [`Indeed search staged for: ${filters.role}`],
      });
    } catch (err) {
      const shot = await this.safeScreenshot(page, "indeed-error");
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error("Indeed run failed", { message, shot });
      return this.result({ success: false, failed: 1, messages: [message] });
    }
  }
}
