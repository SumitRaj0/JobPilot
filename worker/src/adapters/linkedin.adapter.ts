import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import { BasePlatformAdapter } from "./base.adapter.js";
import { LinkedInAutomation } from "./linkedin/LinkedInAutomation.js";
import type { AutomationRunResult } from "./types.js";
import type { AutomationLogger } from "../logging/automationLogger.js";

/** Full LinkedIn Playwright adapter — search, Easy Apply, questionnaire resolver */
export class LinkedInAdapter extends BasePlatformAdapter {
  readonly platform = "linkedin";
  readonly baseUrl = "https://www.linkedin.com/jobs/";

  private readonly automation = new LinkedInAutomation();

  async run(
    page: Page,
    filters: JobFilters,
    logger: AutomationLogger,
    ctx?: import("./types.js").RunContext
  ): Promise<AutomationRunResult> {
    return this.automation.run(page, filters, logger, ctx);
  }
}
