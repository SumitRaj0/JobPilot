import type { Page } from "playwright";

import {
  closeIndeedApplyPage,
  closeStaleIndeedApplyTabs,
  completeIndeedApplyFlow,
  openIndeedApplySurface,
} from "./completeApplyFlow.js";
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
import { IndeedSelectors } from "./selectors.js";
import type { IndeedScrapedJob } from "./types.js";

export type ApplyJobOutcome =
  | "applied"
  | "already_applied"
  | "no_apply_button"
  | "error";

export async function applyToIndeedJobs(
  page: Page,
  jobs: IndeedScrapedJob[],
  logger: AutomationLogger,
  options: {
    fullAuto: boolean;
    maxApplications: number;
    searchListUrl: string;
    shouldAbort?: import("../types.js").RunContext["shouldAbort"];
  }
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
    if (options.shouldAbort && (await options.shouldAbort())) {
      result.messages.push("Stopped — time limit or user stop");
      break;
    }
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
      () =>
        applySingleIndeedJob(page, job, logger, {
          searchListUrl: options.searchListUrl,
          shouldAbort: options.shouldAbort,
        }),
      { attempts: 2, label: `indeed-apply-${job.jobId}` }
    ).catch(async () => {
      await captureScreenshot(page, `indeed-apply-fail-${job.jobId}`, "indeed").catch(
        () => undefined
      );
      return "error" as const;
    });

    switch (outcome) {
      case "applied":
        result.applied++;
        logger.info("Indeed applied", { title: job.title, company: job.company });
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
      ? `Indeed applied ${result.applied} (no limit)`
      : `Indeed applied ${result.applied} of ${formatApplyTarget(options.maxApplications)}`
  );
  return result;
}

async function applySingleIndeedJob(
  page: Page,
  job: IndeedScrapedJob,
  logger: AutomationLogger,
  options: {
    searchListUrl: string;
    shouldAbort?: import("../types.js").RunContext["shouldAbort"];
  }
): Promise<ApplyJobOutcome> {
  const { searchListUrl, shouldAbort } = options;

  if (shouldAbort && (await shouldAbort())) {
    return "error";
  }
  await closeStaleIndeedApplyTabs(page);

  if (!page.url().includes("/jobs")) {
    await page.goto(searchListUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await humanDelay(1000, 1800);
  }

  const card = page.locator(IndeedSelectors.search.jobCard).nth(job.tupleIndex);
  if (!(await card.isVisible({ timeout: 8000 }).catch(() => false))) {
    return "no_apply_button";
  }

  await card.scrollIntoViewIfNeeded();
  await card.click({ timeout: 8000 });
  await humanDelay(800, 1400);

  let applyBtn = page.locator(IndeedSelectors.search.applyBtn).first();
  if (!(await applyBtn.isVisible({ timeout: 8000 }).catch(() => false))) {
    if (job.url) {
      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await humanDelay(1000, 1800);
      applyBtn = page.locator(IndeedSelectors.search.applyBtn).first();
    }
    if (!(await applyBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      return "no_apply_button";
    }
  }

  const listPage = page;
  const applyPage = await openIndeedApplySurface(listPage, applyBtn, logger);

  const submitted = await completeIndeedApplyFlow(applyPage, logger, {
    shouldAbort: options.shouldAbort,
  });
  await closeIndeedApplyPage(applyPage, listPage);

  if (!submitted) {
    await dismissIndeedModal(listPage);
    return "error";
  }

  await listPage.goto(searchListUrl, { waitUntil: "domcontentloaded" }).catch(() => undefined);
  await humanDelay(600, 1000);
  return "applied";
}

async function dismissIndeedModal(page: Page): Promise<void> {
  const close = page
    .locator('button[aria-label="Close"], button:has-text("Close")')
    .first();
  if (await close.isVisible({ timeout: 2000 }).catch(() => false)) {
    await close.click().catch(() => undefined);
  } else {
    await page.keyboard.press("Escape").catch(() => undefined);
  }
  await humanDelay(400, 800);
}

export { mergeApplyBatch };
