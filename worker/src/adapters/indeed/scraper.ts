import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import { resolveScrapeLimit, resolveScrollRounds } from "../../config/runLimits.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { scrollResultsPage } from "../shared/platformScroll.js";
import { jobTitleMatchesRole } from "../naukri/roleMatch.js";
import { scrapeIndeedTuplesInBrowser } from "./scrapeInBrowser.js";
import type { IndeedScrapedJob } from "./types.js";

export async function loadMoreIndeedJobs(
  page: Page,
  logger: AutomationLogger
): Promise<void> {
  await scrollResultsPage(page, logger, resolveScrollRounds());
}

export async function scrapeIndeedJobs(
  page: Page,
  filters: JobFilters,
  logger: AutomationLogger,
  limit = resolveScrapeLimit()
): Promise<IndeedScrapedJob[]> {
  const raw = await page.evaluate(scrapeIndeedTuplesInBrowser);
  const jobs: IndeedScrapedJob[] = [];

  for (const row of raw) {
    if (jobs.length >= limit) break;
    if (!jobTitleMatchesRole(row.title, filters.role)) continue;
    if (filters.easyApplyOnly && !row.easyApply) continue;

    jobs.push({
      platform: "indeed",
      jobId: row.jobId,
      title: row.title,
      company: row.company,
      location: row.location,
      url: row.url,
      easyApply: row.easyApply,
      externalApply: !row.easyApply,
      tupleIndex: row.tupleIndex,
      alreadyApplied: row.alreadyApplied,
    });
  }

  logger.info("Indeed jobs scraped", { count: jobs.length, raw: raw.length });
  return jobs;
}

export async function tryGoToNextIndeedPage(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  const next = page
    .locator('a[aria-label="Next Page"], a:has-text("Next")')
    .first();
  if (!(await next.isVisible({ timeout: 2000 }).catch(() => false))) return false;
  await next.click();
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  logger.info("Indeed next page");
  return true;
}
