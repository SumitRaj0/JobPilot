import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import { dismissCommonOverlays } from "../shared/platformLogin.js";

export function buildLinkedInSearchUrl(filters: JobFilters): string {
  const params = new URLSearchParams();
  params.set("keywords", filters.role.trim());
  if (filters.easyApplyOnly) {
    params.set("f_AL", "true");
  }
  if (filters.remote) {
    params.set("f_WT", "2");
  }
  if (filters.datePosted) {
    const map: Record<string, string> = {
      "1": "r86400",
      "3": "r259200",
      "7": "r604800",
      "30": "r2592000",
    };
    const fTpr = map[filters.datePosted];
    if (fTpr) params.set("f_TPR", fTpr);
  }
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

export async function navigateToLinkedInSearch(
  page: Page,
  filters: JobFilters,
  logger: AutomationLogger
): Promise<void> {
  const url = buildLinkedInSearchUrl(filters);
  logger.info("Opening LinkedIn job search", { url });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await dismissCommonOverlays(page);
  await humanDelay(1500, 2500);
}
