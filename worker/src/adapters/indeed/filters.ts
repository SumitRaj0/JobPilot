import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import { dismissCommonOverlays } from "../shared/platformLogin.js";

export function buildIndeedSearchUrl(origin: string, filters: JobFilters): string {
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams({ q: filters.role.trim() });
  if (filters.remote) params.set("remotejob", "1");
  if (filters.datePosted) {
    const map: Record<string, string> = {
      "1": "1",
      "3": "3",
      "7": "7",
      "30": "30",
    };
    const fromage = map[filters.datePosted];
    if (fromage) params.set("fromage", fromage);
  }
  return `${base}/jobs?${params.toString()}`;
}

export async function navigateToIndeedSearch(
  page: Page,
  origin: string,
  filters: JobFilters,
  logger: AutomationLogger
): Promise<void> {
  const url = buildIndeedSearchUrl(origin, filters);
  logger.info("Opening Indeed job search", { url, origin });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await dismissCommonOverlays(page);
  await humanDelay(1200, 2200);
}
