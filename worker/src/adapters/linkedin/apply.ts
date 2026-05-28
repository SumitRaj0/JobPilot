import type { Locator, Page } from "playwright";

import { runApplyModalSteps } from "../../automation/questionnaire/runApplyModalSteps.js";
import {
  formatApplyTarget,
  isUnlimitedApplications,
  resolveMaxApplications,
} from "../../config/runLimits.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import { withRetry } from "../../utils/retry.js";
import { captureScreenshot } from "../../utils/screenshot.js";
import {
  emptyApplyBatch,
  mergeApplyBatch,
  type ApplyBatchResult,
} from "../shared/applyBatch.js";
import {
  isLinkedInSubmitSuccessVisible,
  waitForLinkedInEasyApplyModal,
} from "./easyApplyModal.js";
import { linkedInQuestionnaireConfig } from "./questionnaireConfig.js";
import { LinkedInSelectors } from "./selectors.js";
import type { LinkedInScrapedJob } from "./types.js";

export type ApplyJobOutcome =
  | "applied"
  | "already_applied"
  | "no_apply_button"
  | "error";

export async function applyToLinkedInJobs(
  page: Page,
  jobs: LinkedInScrapedJob[],
  logger: AutomationLogger,
  options: { fullAuto: boolean; maxApplications: number; searchListUrl: string }
): Promise<ApplyBatchResult> {
  const result = emptyApplyBatch();

  if (!options.fullAuto) {
    result.skipped = jobs.length;
    result.messages.push("fullAuto disabled — scrape only");
    return result;
  }

  const unlimited = isUnlimitedApplications(options.maxApplications);
  const targetApplied = resolveMaxApplications(options.maxApplications);

  for (const job of jobs) {
    if (!unlimited && result.applied >= targetApplied) break;
    if (!job.easyApply) {
      result.skipped++;
      continue;
    }
    if (job.alreadyApplied) {
      result.alreadyApplied++;
      continue;
    }

    const outcome = await withRetry(
      () => applySingleLinkedInJob(page, job, logger, options.searchListUrl),
      { attempts: 2, label: `linkedin-apply-${job.jobId}` }
    ).catch(async () => {
      await captureScreenshot(page, `linkedin-apply-fail-${job.jobId}`, "linkedin").catch(
        () => undefined
      );
      return "error" as const;
    });

    switch (outcome) {
      case "applied":
        result.applied++;
        logger.info("LinkedIn applied", { title: job.title, company: job.company });
        break;
      case "already_applied":
        result.alreadyApplied++;
        break;
      case "no_apply_button":
        result.noApplyButton++;
        break;
      case "error":
        result.failed++;
        break;
    }

    await humanDelay(800, 1600);
  }

  result.messages.push(
    unlimited
      ? `LinkedIn applied ${result.applied} (no limit)`
      : `LinkedIn applied ${result.applied} of ${formatApplyTarget(options.maxApplications)}`
  );
  return result;
}

function locateLinkedInJobCard(page: Page, job: LinkedInScrapedJob): Locator {
  const numericId = job.jobId.match(/(\d{6,})/)?.[1] ?? job.jobId;
  if (numericId && !numericId.startsWith("linkedin-")) {
    const byListItem = page
      .locator(`li:has(a[href*="/jobs/view/${numericId}"]), [data-job-id="${numericId}"]`)
      .first();
    return byListItem;
  }
  return page.locator(LinkedInSelectors.search.jobCard).nth(job.tupleIndex);
}

async function applySingleLinkedInJob(
  page: Page,
  job: LinkedInScrapedJob,
  logger: AutomationLogger,
  searchListUrl: string
): Promise<ApplyJobOutcome> {
  try {
    if (!page.url().includes("/jobs/search")) {
      await page.goto(searchListUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await humanDelay(1000, 1800);
    }

    const card = locateLinkedInJobCard(page, job);
    if (!(await card.isVisible({ timeout: 8000 }).catch(() => false))) {
      logger.warn("LinkedIn: job card not found", { jobId: job.jobId, title: job.title });
      return "no_apply_button";
    }

    await card.scrollIntoViewIfNeeded();
    await card.click({ timeout: 8000 });
    await humanDelay(1500, 2200);

    await page
      .locator(".jobs-unified-top-card, .jobs-search__job-details--container")
      .first()
      .waitFor({ state: "visible", timeout: 8000 })
      .catch(() => undefined);

    const easyApply = page.locator(LinkedInSelectors.search.easyApplyBtn).first();
    if (!(await easyApply.isVisible({ timeout: 8000 }).catch(() => false))) {
      const applied = page.locator(LinkedInSelectors.search.appliedBadge).first();
      if (await applied.isVisible({ timeout: 2000 }).catch(() => false)) {
        return "already_applied";
      }
      logger.warn("LinkedIn: Easy Apply button not visible", { title: job.title });
      return "no_apply_button";
    }

    await easyApply.click({ force: true });
    await humanDelay(800, 1200);

    if (!(await waitForLinkedInEasyApplyModal(page, logger))) {
      await captureScreenshot(page, `linkedin-no-modal-${job.jobId}`, "linkedin").catch(
        () => undefined
      );
      await dismissLinkedInModal(page);
      return "error";
    }

    const stepsOk = await runApplyModalSteps(page, linkedInQuestionnaireConfig, logger);
    if (!stepsOk) {
      await captureScreenshot(page, `linkedin-steps-fail-${job.jobId}`, "linkedin").catch(
        () => undefined
      );
      await dismissLinkedInModal(page);
      return "error";
    }

    if (!(await waitForLinkedInSubmitConfirmation(page, logger))) {
      logger.warn("LinkedIn: submit not confirmed", { title: job.title });
      await captureScreenshot(page, `linkedin-no-confirm-${job.jobId}`, "linkedin").catch(
        () => undefined
      );
      await dismissLinkedInModal(page);
      return "error";
    }

    await dismissLinkedInModal(page);
    return "applied";
  } catch (err) {
    await page.goto(searchListUrl, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    logger.warn("LinkedIn apply step failed", {
      title: job.title,
      err: err instanceof Error ? err.message : String(err),
    });
    return "error";
  }
}

async function waitForLinkedInSubmitConfirmation(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  const deadline = Date.now() + 25_000;

  while (Date.now() < deadline) {
    if (await isLinkedInSubmitSuccessVisible(page)) {
      logger.info("LinkedIn: verified application submitted");
      return true;
    }

    const applied = page.locator(LinkedInSelectors.search.appliedBadge).first();
    if (await applied.isVisible({ timeout: 800 }).catch(() => false)) {
      logger.info("LinkedIn: verified via Applied badge");
      return true;
    }

    await humanDelay(600, 900);
  }

  return false;
}

async function dismissLinkedInModal(page: Page): Promise<void> {
  const dismiss = page
    .locator(
      'button[aria-label="Dismiss"], button[aria-label="Close"], .artdeco-modal__dismiss'
    )
    .first();
  if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismiss.click().catch(() => undefined);
  } else {
    await page.keyboard.press("Escape").catch(() => undefined);
  }
  await humanDelay(400, 800);
}

export { mergeApplyBatch };
