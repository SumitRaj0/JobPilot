import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import {
  resolveScrapeLimit,
  resolveScrollRounds,
} from "../../config/runLimits.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { scrollResultsPage } from "../shared/platformScroll.js";
import { jobTitleMatchesRole } from "../naukri/roleMatch.js";
import { scrapeLinkedInTuplesInBrowser } from "./scrapeInBrowser.js";
import type { LinkedInScrapedJob } from "./types.js";

export async function loadMoreLinkedInJobs(
  page: Page,
  logger: AutomationLogger
): Promise<void> {
  await scrollResultsPage(page, logger, resolveScrollRounds());
}

export async function scrapeLinkedInJobs(
  page: Page,
  filters: JobFilters,
  logger: AutomationLogger,
  limit = resolveScrapeLimit()
): Promise<LinkedInScrapedJob[]> {
  const raw = await page.evaluate(scrapeLinkedInTuplesInBrowser);
  const jobs: LinkedInScrapedJob[] = [];

  for (const row of raw) {
    if (jobs.length >= limit) break;
    if (!jobTitleMatchesRole(row.title, filters.role)) continue;
    if (filters.easyApplyOnly && !row.easyApply) continue;

    jobs.push({
      platform: "linkedin",
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

  logger.info("LinkedIn jobs scraped", { count: jobs.length, raw: raw.length });
  return jobs;
}

export async function tryGoToNextLinkedInPage(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  const next = page
    .locator('button[aria-label="View next page"], button:has-text("Next")')
    .first();
  if (!(await next.isVisible({ timeout: 2000 }).catch(() => false))) return false;
  if (await next.isDisabled().catch(() => true)) return false;
  await next.click();
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  logger.info("LinkedIn next page");
  return true;
}
