import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import {
  sampleFirstTupleLinks,
  scrapeTuplesInBrowser,
  scrollPageDown,
} from "./scrapeInBrowser.js";
import { env } from "../../config/env.js";
import { jobTitleMatchesRole } from "./roleMatch.js";
import type { NaukriScrapedJob } from "./types.js";

/** Primary Naukri SRP job card selector. */
const JOB_TUPLE_SELECTOR = ".srp-jobtuple-wrapper";

const TITLE_LINK_SELECTORS = [
  "a.title",
  "a.jtitle",
  "a.jobsTuple__title",
  "h2 a",
  'a[href*="job-listings"]',
  'a[href*="job-details"]',
  'a[href*="-jobs-"]',
  '[class*="title"] a',
  "a[href*='/job/']",
].join(", ");

export async function loadMoreJobsOnPage(
  page: Page,
  logger: AutomationLogger,
  rounds = env.NAUKRI_SCROLL_ROUNDS
): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await scrollForMoreJobs(page, logger);
    const loadMore = page
      .getByRole("button", { name: /load more|view more jobs/i })
      .or(page.getByText(/load more/i))
      .first();
    if (await loadMore.isVisible({ timeout: 800 }).catch(() => false)) {
      await loadMore.click().catch(() => undefined);
      await humanDelay(800, 1200);
    }
  }
  logger.info("Finished loading more job cards", { scrollRounds: rounds });
}

/** Click Naukri SRP "Next" when unlimited mode should walk more result pages. */
export async function tryGoToNextSearchPage(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  if (page.isClosed()) return false;

  const nextLink = page
    .locator('a[rel="next"]')
    .or(page.getByRole("link", { name: /^next$/i }))
    .or(page.locator("a").filter({ hasText: /^\s*Next\s*$/i }))
    .first();

  if (!(await nextLink.isVisible({ timeout: 2000 }).catch(() => false))) {
    return false;
  }

  const disabled = await nextLink
    .evaluate((el) => {
      const anchor = el.closest("a") ?? el;
      const cls = anchor.getAttribute("class") ?? "";
      const aria = anchor.getAttribute("aria-disabled");
      return (
        aria === "true" ||
        /disabled|inactive|current/i.test(cls) ||
        anchor.hasAttribute("disabled")
      );
    })
    .catch(() => true);

  if (disabled) return false;

  const before = page.url();
  await nextLink.click().catch(() => undefined);
  await humanDelay(1000, 1800);
  await page
    .locator(JOB_TUPLE_SELECTOR)
    .first()
    .waitFor({ state: "attached", timeout: 15_000 })
    .catch(() => undefined);

  if (page.url() === before) return false;

  logger.info("Next search results page", { url: page.url() });
  return true;
}

export async function scrapeJobCards(
  page: Page,
  filters: JobFilters,
  logger: AutomationLogger,
  limit = env.NAUKRI_SCRAPE_LIMIT
): Promise<NaukriScrapedJob[]> {
  if (page.isClosed()) {
    logger.warn("Page closed before scrape");
    return [];
  }

  await page
    .locator(JOB_TUPLE_SELECTOR)
    .first()
    .waitFor({ state: "attached", timeout: 12_000 })
    .catch(() => undefined);

  const raw = await page
    .evaluate(scrapeTuplesInBrowser, {
      tupleSelector: JOB_TUPLE_SELECTOR,
      titleSelectors: TITLE_LINK_SELECTORS,
      max: limit,
    })
    .catch((err) => {
      logger.warn("DOM scrape evaluate failed", { err });
      return [] as (NaukriScrapedJob | null)[];
    });

  const tupleCount = await page.locator(JOB_TUPLE_SELECTOR).count();
  const jobs = raw.filter((j): j is NaukriScrapedJob => j != null);

  logger.info("Scraping job cards", { visible: tupleCount, parsed: jobs.length });

  if (jobs.length === 0 && tupleCount > 0) {
    const sample = await page
      .evaluate(sampleFirstTupleLinks, JOB_TUPLE_SELECTOR)
      .catch(() => null);
    logger.warn("Cards visible but no titles parsed — DOM may have changed", {
      sample,
    });
  }

  const roleMatched = jobs.filter((j) =>
    jobTitleMatchesRole(j.title, filters.role)
  );
  if (roleMatched.length < jobs.length) {
    logger.info("Role relevance filter", {
      before: jobs.length,
      after: roleMatched.length,
      role: filters.role.trim(),
    });
  }

  let filtered = roleMatched.length > 0 ? roleMatched : jobs;
  if (filters.easyApplyOnly) {
    const easyOnly = filtered.filter((j) => j.easyApply);
    if (easyOnly.length === 0 && filtered.length > 0) {
      logger.warn(
        "Easy Apply only: none detected in card HTML — keeping jobs (Naukri filter already applied on page)",
        { parsed: filtered.length }
      );
      filtered = filtered.map((j) => ({ ...j, easyApply: true }));
    } else {
      const beforeEasy = filtered.length;
      filtered = easyOnly;
      if (easyOnly.length < beforeEasy) {
        logger.info("Easy Apply filter", {
          parsed: beforeEasy,
          kept: easyOnly.length,
        });
      }
    }
  }

  logger.info("Scraped jobs", {
    total: filtered.length,
    easyApplyOnly: filters.easyApplyOnly,
  });
  return filtered;
}

export async function scrollForMoreJobs(
  page: Page,
  logger?: AutomationLogger
): Promise<void> {
  if (page.isClosed()) return;

  try {
    await page.evaluate(scrollPageDown);
    await humanDelay(400, 800);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (page.isClosed() || /closed/i.test(message)) {
      logger?.warn("Scroll skipped — browser window was closed");
      return;
    }
    throw err;
  }
}
