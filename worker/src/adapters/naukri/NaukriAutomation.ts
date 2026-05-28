import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import {
  formatApplyTarget,
  isUnlimitedApplications,
  resolveMaxApplications,
  resolveMaxSearchPages,
  resolveScrapeLimit,
  resolveScrollRounds,
} from "../../config/runLimits.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { captureScreenshot } from "../../utils/screenshot.js";
import type { AutomationRunResult, RunContext } from "../types.js";
import { isRunAborted } from "../shared/abortCheck.js";
import { emptyApplyBatch, mergeApplyBatch, type ApplyBatchResult } from "../shared/applyBatch.js";
import { applyToJobs } from "./apply.js";
import { navigateToSearch } from "./filters.js";
import {
  loadMoreJobsOnPage,
  scrapeJobCards,
  tryGoToNextSearchPage,
} from "./scraper.js";
import {
  ensureSessionForSearch,
  verifyLoggedInOnSearchPage,
  waitForManualLogin,
} from "./session.js";

export class NaukriAutomation {
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
      const canProceed = await ensureSessionForSearch(page, userId, logger);
      if (!canProceed) {
        return {
          success: false,
          applied: 0,
          skipped: 0,
          failed: 1,
          alreadyApplied: 0,
          noApplyButton: 0,
          messages: ["Login required — log in once in the browser, then retry"],
        };
      }

      await navigateToSearch(page, filters, logger);
      let searchListUrl = page.url();

      let loggedIn = await verifyLoggedInOnSearchPage(page, logger);
      if (!loggedIn) {
        const ok = await waitForManualLogin(page, logger);
        if (!ok) {
          return {
            success: false,
            applied: 0,
            skipped: 0,
            failed: 1,
            alreadyApplied: 0,
            noApplyButton: 0,
            messages: ["Login failed or timed out"],
          };
        }
        await navigateToSearch(page, filters, logger);
        searchListUrl = page.url();
        loggedIn = await verifyLoggedInOnSearchPage(page, logger);
      }

      if (!loggedIn) {
        return {
          success: false,
          applied: 0,
          skipped: 0,
          failed: 1,
          alreadyApplied: 0,
          noApplyButton: 0,
          messages: ["Could not reach job search after login"],
        };
      }

      if (page.isClosed()) {
        return {
          success: false,
          applied: 0,
          skipped: 0,
          failed: 1,
          alreadyApplied: 0,
          noApplyButton: 0,
          messages: [
            "Browser window was closed — keep the Playwright window open during auto-apply",
          ],
        };
      }

      const seenJobIds = new Set<string>();
      let applyResult = emptyApplyBatch();
      const maxPages = resolveMaxSearchPages();
      const scrapeLimit = resolveScrapeLimit();
      const scrollRounds = resolveScrollRounds();

      for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
        if (await isRunAborted(ctx)) {
          messages.push("Naukri run stopped — time limit reached or stopped from panel");
          break;
        }

        if (pageIndex > 0) {
          const moved = await tryGoToNextSearchPage(page, logger);
          if (!moved) break;
          searchListUrl = page.url();
        }

        await loadMoreJobsOnPage(page, logger, scrollRounds);
        if (pageIndex === 0) searchListUrl = page.url();

        if (page.isClosed()) {
          return {
            success: false,
            applied: applyResult.applied,
            skipped: applyResult.skipped,
            failed: applyResult.failed + 1,
            alreadyApplied: applyResult.alreadyApplied,
            noApplyButton: applyResult.noApplyButton,
            messages: [
              "Browser window was closed — keep the Playwright window open during auto-apply",
            ],
          };
        }

        const scraped = await scrapeJobCards(
          page,
          filters,
          logger,
          scrapeLimit
        );
        const jobs = scraped.filter((j) => !seenJobIds.has(j.jobId));
        for (const j of jobs) seenJobIds.add(j.jobId);

        if (jobs.length === 0) {
          if (pageIndex === 0) {
            messages.push("Found 0 matching job cards");
            messages.push(
              "No jobs after filters — try fewer filters or uncheck Easy Apply only"
            );
          }
          break;
        }

        if (pageIndex === 0) {
          messages.push(
            unlimited
              ? `Found ${jobs.length} job cards on page 1 (loading more pages…)`
              : `Found ${jobs.length} matching job cards`
          );
        } else {
          messages.push(`Page ${pageIndex + 1}: ${jobs.length} new job cards`);
        }

        if (!filters.fullAuto) {
          if (pageIndex === 0) {
            messages.push(
              "Scrape OK — enable Full Auto in the panel to submit applications"
            );
          }
          break;
        }

        const remaining = unlimited
          ? Number.MAX_SAFE_INTEGER
          : maxApps - applyResult.applied;

        const batch = await applyToJobs(page, jobs, logger, {
          fullAuto: filters.fullAuto,
          maxApplications: remaining,
          searchListUrl,
          ctx,
        });
        applyResult = mergeApplyBatch(applyResult, batch);

        if (!unlimited && applyResult.applied >= maxApps) break;
      }

      if (seenJobIds.size > 0) {
        const firstIdx = messages.findIndex((m) => m.startsWith("Found "));
        const summary = `Found ${seenJobIds.size} unique matching jobs across search pages`;
        if (firstIdx >= 0) messages[firstIdx] = summary;
        else messages.unshift(summary);
      }

      messages.push(...applyResult.messages);

      const scrapeOk = seenJobIds.size > 0;
      if (filters.fullAuto && applyResult.failed > 0 && applyResult.applied > 0) {
        messages.push(
          `Partial run: ${applyResult.applied} applied, ${applyResult.failed} errors`
        );
      }

      if (filters.fullAuto) {
        if (unlimited) {
          messages.push(
            `No application limit — processed ${seenJobIds.size} jobs (${applyResult.applied} applied, ${applyResult.failed} errors)`
          );
        } else if (applyResult.applied < maxApps) {
          messages.push(
            `Target ${maxApps} applications; completed ${applyResult.applied} (${applyResult.failed} errors)`
          );
        }
      }

      const minSuccessApplies = unlimited ? 1 : Math.min(3, maxApps);
      const success =
        scrapeOk &&
        (!filters.fullAuto || applyResult.applied >= minSuccessApplies);

      if (unlimited && filters.fullAuto) {
        logger.info("Unlimited apply run complete", {
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
      const shot = await captureScreenshot(page, "naukri-fatal", "naukri").catch(
        () => undefined
      );
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error("Naukri automation failed", { message, shot });
      return {
        success: false,
        applied: 0,
        skipped: 0,
        failed: 1,
        alreadyApplied: 0,
        noApplyButton: 0,
        messages: [message, shot ? `screenshot: ${shot}` : ""].filter(Boolean),
      };
    }
  }
}
