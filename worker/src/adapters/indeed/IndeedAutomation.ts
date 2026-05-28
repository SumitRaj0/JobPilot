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
import { isRunAborted } from "../shared/abortCheck.js";
import { emptyApplyBatch, mergeApplyBatch } from "../shared/applyBatch.js";
import { applyToIndeedJobs } from "./apply.js";
import { navigateToIndeedSearch } from "./filters.js";
import {
  loadMoreIndeedJobs,
  scrapeIndeedJobs,
  tryGoToNextIndeedPage,
} from "./scraper.js";
import {
  ensureIndeedSession,
  isIndeedLoggedIn,
  resolveIndeedOrigin,
} from "./session.js";

export class IndeedAutomation {
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
      const canProceed = await ensureIndeedSession(page, userId, logger);
      if (!canProceed) {
        return {
          success: false,
          applied: 0,
          skipped: 0,
          failed: 1,
          alreadyApplied: 0,
          noApplyButton: 0,
          messages: [
            "Indeed login required — use PLAYWRIGHT_HEADLESS=false, sign in in the worker browser, then retry",
          ],
        };
      }

      const indeedOrigin = await resolveIndeedOrigin(page);
      await navigateToIndeedSearch(page, indeedOrigin, filters, logger);
      let searchListUrl = page.url();

      if (!(await isIndeedLoggedIn(page))) {
        return {
          success: false,
          applied: 0,
          skipped: 0,
          failed: 1,
          alreadyApplied: 0,
          noApplyButton: 0,
          messages: [
            "Indeed jobs page opened but not logged in — complete login in the Playwright window",
          ],
        };
      }

      const seenJobIds = new Set<string>();
      let applyResult = emptyApplyBatch();
      const maxPages = resolveMaxSearchPages();
      const scrapeLimit = resolveScrapeLimit();

      for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
        if (await isRunAborted(ctx)) {
          messages.push("Indeed run stopped — time limit reached or stopped from panel");
          break;
        }

        if (pageIndex > 0) {
          const moved = await tryGoToNextIndeedPage(page, logger);
          if (!moved) break;
          searchListUrl = page.url();
        }

        await loadMoreIndeedJobs(page, logger);
        const scraped = await scrapeIndeedJobs(page, filters, logger, scrapeLimit);
        const jobs = scraped.filter((j) => !seenJobIds.has(j.jobId));
        for (const j of jobs) seenJobIds.add(j.jobId);

        if (jobs.length === 0) {
          if (pageIndex === 0) messages.push("Found 0 matching Indeed job cards");
          break;
        }

        messages.push(
          pageIndex === 0
            ? `Found ${jobs.length} Indeed jobs on page 1`
            : `Indeed page ${pageIndex + 1}: ${jobs.length} new jobs`
        );

        if (!filters.fullAuto) {
          messages.push("Scrape OK — enable Full Auto to submit applications");
          break;
        }

        const remaining = unlimited
          ? Number.MAX_SAFE_INTEGER
          : maxApps - applyResult.applied;

        const batch = await applyToIndeedJobs(page, jobs, logger, {
          fullAuto: filters.fullAuto,
          maxApplications: remaining,
          searchListUrl,
          shouldAbort: ctx?.shouldAbort,
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
        logger.info("Indeed unlimited run complete", {
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
      const shot = await captureScreenshot(page, "indeed-fatal", "indeed").catch(
        () => undefined
      );
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error("Indeed automation failed", { message, shot });
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
