import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import { BasePlatformAdapter } from "./base.adapter.js";
import type { AutomationRunResult } from "./types.js";
import type { AutomationLogger } from "../logging/automationLogger.js";
import { NaukriAutomation } from "./naukri/NaukriAutomation.js";

export { NaukriSelectors } from "./naukri/selectors.js";

/** Full Naukri Playwright adapter — Step 7 */
export class NaukriAdapter extends BasePlatformAdapter {
  readonly platform = "naukri";
  readonly baseUrl = "https://www.naukri.com";

  private readonly automation = new NaukriAutomation();

  async run(
    page: Page,
    filters: JobFilters,
    logger: AutomationLogger,
    ctx?: import("./types.js").RunContext
  ): Promise<AutomationRunResult> {
    return this.automation.run(page, filters, logger, ctx);
  }
}
