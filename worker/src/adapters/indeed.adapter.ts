import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import { BasePlatformAdapter } from "./base.adapter.js";
import { IndeedAutomation } from "./indeed/IndeedAutomation.js";
import type { AutomationRunResult } from "./types.js";
import type { AutomationLogger } from "../logging/automationLogger.js";

/** Full Indeed Playwright adapter — search, Indeed Apply, questionnaire resolver */
export class IndeedAdapter extends BasePlatformAdapter {
  readonly platform = "indeed";
  readonly baseUrl = "https://www.indeed.com";

  private readonly automation = new IndeedAutomation();

  async run(
    page: Page,
    filters: JobFilters,
    logger: AutomationLogger,
    ctx?: import("./types.js").RunContext
  ): Promise<AutomationRunResult> {
    return this.automation.run(page, filters, logger, ctx);
  }
}
