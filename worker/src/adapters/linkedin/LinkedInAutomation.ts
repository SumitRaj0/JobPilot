import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import {
  formatApplyTarget,
  isUnlimitedApplications,
  resolveMaxApplications,
  resolveMaxSearchPages,
  resolveScrapeLimit,
} from "../../config/runLimits.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { captureScreenshot } from "../../utils/screenshot.js";
import type { AutomationRunResult, RunContext } from "../types.js";
import { emptyApplyBatch, mergeApplyBatch } from "../shared/applyBatch.js";
import { applyToLinkedInJobs } from "./apply.js";
import { navigateToLinkedInSearch } from "./filters.js";
import {
  loadMoreLinkedInJobs,
  scrapeLinkedInJobs,
  tryGoToNextLinkedInPage,
} from "./scraper.js";
import { ensureLinkedInSession, isLinkedInLoggedIn } from "./session.js";

export class LinkedInAutomation {
  async run(
    page: Page,
    filters: JobFilters,
    logger: AutomationLogger,
    ctx?: RunContext
  ): Promise<AutomationRunResult> {
    const userId = ctx?.userId ?? "dev-user";
    const messages: string[] = [];
    const unlimited = isUnlimitedApplications();
    const maxApps = resolveMaxApplications();

    try {
      const canProceed = await ensureLinkedInSession(page, userId, logger);
      if (!canProceed) {
        return {
          success: false,
          applied: 0,
          skipped: 0,
          failed: 1,
          alreadyApplied: 0,
          noApplyButton: 0,
          messages: [
            "LinkedIn login required — use PLAYWRIGHT_HEADLESS=false, sign in in the worker browser, then retry",
          ],
        };
      }

      await navigateToLinkedInSearch(page, filters, logger);
      let searchListUrl = page.url();

      if (!(await isLinkedInLoggedIn(page))) {
        return {
          success: false,
          applied: 0,
          skipped: 0,
          failed: 1,
          alreadyApplied: 0,
          noApplyButton: 0,
          messages: [
            "LinkedIn jobs page opened but not logged in — complete login or security check in the Playwright window",
          ],
        };
      }

      const seenJobIds = new Set<string>();
      let applyResult = emptyApplyBatch();
      const maxPages = resolveMaxSearchPages();
      const scrapeLimit = resolveScrapeLimit();

      for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
        if (pageIndex > 0) {
          const moved = await tryGoToNextLinkedInPage(page, logger);
          if (!moved) break;
          searchListUrl = page.url();
        }

        await loadMoreLinkedInJobs(page, logger);
        const scraped = await scrapeLinkedInJobs(page, filters, logger, scrapeLimit);
        const jobs = scraped.filter((j) => !seenJobIds.has(j.jobId));
        for (const j of jobs) seenJobIds.add(j.jobId);

        if (jobs.length === 0) {
          if (pageIndex === 0) messages.push("Found 0 matching LinkedIn job cards");
          break;
        }

        messages.push(
          pageIndex === 0
            ? `Found ${jobs.length} LinkedIn jobs on page 1`
            : `LinkedIn page ${pageIndex + 1}: ${jobs.length} new jobs`
        );

        if (!filters.fullAuto) {
          messages.push("Scrape OK — enable Full Auto to submit applications");
          break;
        }

        const remaining = unlimited
          ? Number.MAX_SAFE_INTEGER
          : maxApps - applyResult.applied;

        const batch = await applyToLinkedInJobs(page, jobs, logger, {
          fullAuto: filters.fullAuto,
          maxApplications: remaining,
          searchListUrl,
        });
        applyResult = mergeApplyBatch(applyResult, batch);

        if (!unlimited && applyResult.applied >= maxApps) break;
      }

      messages.push(...applyResult.messages);
      const scrapeOk = seenJobIds.size > 0;
      const minSuccess = unlimited ? 1 : Math.min(3, maxApps);
      const success =
        scrapeOk && (!filters.fullAuto || applyResult.applied >= minSuccess);

      if (unlimited && filters.fullAuto) {
        logger.info("LinkedIn unlimited run complete", {
          uniqueJobs: seenJobIds.size,
          applied: applyResult.applied,
          target: formatApplyTarget(),
        });
      }

      return {
        success,
        applied: applyResult.applied,
        skipped: applyResult.skipped,
        failed: applyResult.failed,
        alreadyApplied: applyResult.alreadyApplied,
        noApplyButton: applyResult.noApplyButton,
        messages,
      };
    } catch (err) {
      const shot = await captureScreenshot(page, "linkedin-fatal", "linkedin").catch(
        () => undefined
      );
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error("LinkedIn automation failed", { message, shot });
      return {
        success: false,
        applied: 0,
        skipped: 0,
        failed: 1,
        alreadyApplied: 0,
        noApplyButton: 0,
        messages: [message],
      };
    }
  }
}
