import { existsSync } from "fs";
import type { Locator, Page } from "playwright";

import { env } from "../../config/env.js";
import {
  formatApplyTarget,
  isUnlimitedApplications,
  resolveMaxApplications,
} from "../../config/runLimits.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import { withRetry } from "../../utils/retry.js";
import { captureScreenshot } from "../../utils/screenshot.js";
import { isRunAborted } from "../shared/abortCheck.js";
import type { RunContext } from "../types.js";
import {
  clickApplyInDetailPanel,
  clickApplyInTuple,
  detectCardApplyState,
  detectPageApplyState,
  listApplyLikeControls,
  openJobDetailInTuple,
  type CardApplyState,
} from "./applyInBrowser.js";
import { runApplyModalSteps } from "../../automation/questionnaire/runApplyModalSteps.js";
import { naukriQuestionnaireConfig } from "./questionnaireConfig.js";
import { NaukriSelectors } from "./selectors.js";
import type { NaukriScrapedJob } from "./types.js";

const JOB_TUPLE_SELECTOR = ".srp-jobtuple-wrapper";

const TUPLE_APPLY_SELECTORS = [
  "button:has-text('Apply')",
  "a:has-text('Apply')",
  "div:has-text('Apply')",
  "[class*='apply-button' i]",
  "[class*='ApplyButton' i]",
  "span:has-text('Apply')",
].join(", ");

const DETAIL_APPLY_SELECTORS = [
  ".styles_jhc__apply-button-container button",
  "[class*='apply-button' i] button",
  "[class*='apply-button' i] a",
  "[class*='ApplyButton' i]",
  "button:has-text('Apply')",
  "a:has-text('Apply')",
].join(", ");

import {
  emptyApplyBatch,
  mergeApplyBatch,
  type ApplyBatchResult,
} from "../shared/applyBatch.js";

export type ApplyJobOutcome =
  | "applied"
  | "already_applied"
  | "no_apply_button"
  | "aborted"
  | "error";

export type { ApplyBatchResult };
export { mergeApplyBatch };

function tupleLocatorArgs(job: NaukriScrapedJob) {
  return {
    tupleIndex: job.tupleIndex,
    tupleSelector: JOB_TUPLE_SELECTOR,
    jobId: naukriNumericJobId(job) ?? undefined,
  };
}

export async function applyToJobs(
  page: Page,
  jobs: NaukriScrapedJob[],
  logger: AutomationLogger,
  options: {
    fullAuto: boolean;
    maxApplications: number;
    searchListUrl: string;
    ctx?: RunContext;
  }
): Promise<ApplyBatchResult> {
  const result: ApplyBatchResult = {
    applied: 0,
    skipped: 0,
    failed: 0,
    alreadyApplied: 0,
    noApplyButton: 0,
    messages: [],
  };

  if (!options.fullAuto) {
    result.skipped = jobs.length;
    result.messages.push("fullAuto disabled — scrape only, no applications");
    return result;
  }

  const unlimited = isUnlimitedApplications(options.maxApplications);
  const targetApplied = resolveMaxApplications(options.maxApplications);
  let attempts = 0;
  const maxAttempts = unlimited
    ? jobs.length + 5000
    : Math.max(targetApplied * 8, jobs.length);

  for (const job of jobs) {
    if (await isRunAborted(options.ctx)) {
      result.messages.push("Stopped from panel — finishing current step");
      break;
    }

    if (!unlimited && result.applied >= targetApplied) {
      result.messages.push(`Reached target: ${targetApplied} applications`);
      break;
    }
    if (attempts >= maxAttempts) {
      result.messages.push(`Stopped after ${maxAttempts} attempts`);
      break;
    }

    if (!job.easyApply) {
      result.skipped++;
      continue;
    }

    if (job.alreadyApplied) {
      result.alreadyApplied++;
      logger.info("Already applied (list card)", {
        title: job.title,
        company: job.company,
        jobId: job.jobId,
      });
      continue;
    }

    attempts++;
    const outcome = await withRetry(
      () => applySingleJob(page, job, logger, options.searchListUrl, options.ctx),
      { attempts: 2, label: `apply-${job.jobId}` }
    ).catch(async (err) => {
      const shot = await captureScreenshot(
        page,
        `apply-fail-${job.jobId}`,
        "naukri"
      ).catch(() => undefined);
      logger.error("Apply failed", { job: job.title, err, shot });
      return "error" as const;
    });

    switch (outcome) {
      case "applied":
        result.applied++;
        logger.info("Applied", { title: job.title, company: job.company });
        break;
      case "already_applied":
        result.alreadyApplied++;
        logger.info("Already applied — skipped", {
          title: job.title,
          company: job.company,
          jobId: job.jobId,
        });
        break;
      case "no_apply_button":
        result.noApplyButton++;
        logger.info("No apply button — skipped", {
          title: job.title,
          company: job.company,
        });
        break;
      case "error":
        result.failed++;
        break;
      case "aborted":
        result.messages.push("Stopped from panel — apply loop halted");
        return result;
    }

    const [dMin, dMax] = env.NAUKRI_FAST_APPLY ? [500, 1100] : [1200, 2500];
    await humanDelay(dMin, dMax);
  }

  const targetLabel = formatApplyTarget(options.maxApplications);
  result.messages.push(
    unlimited
      ? `Applied ${result.applied} from ${jobs.length} in queue (no limit)`
      : `Applied ${result.applied} of ${targetLabel} target (${jobs.length} in queue)`
  );
  if (result.alreadyApplied > 0) {
    result.messages.push(`Already applied: ${result.alreadyApplied} (not clicked again)`);
  }
  if (result.noApplyButton > 0) {
    result.messages.push(`No apply button: ${result.noApplyButton} (company site / external)`);
  }
  if (result.failed > 0) {
    result.messages.push(`Errors: ${result.failed}`);
  }

  return result;
}

function isSearchResultsPage(url: string): boolean {
  try {
    const u = new URL(url);
    if (!/naukri\.com/i.test(u.hostname)) return false;
    if (/job-listings|job-details/i.test(u.pathname)) return false;
    const path = u.pathname;
    if (/-jobs(?:\/|$|-)/i.test(path)) return true;
    if (/\/jobs(?:\/|$|-)/i.test(path)) return true;
    const hasPage =
      u.searchParams.has("page") || u.searchParams.has("pageNo");
    if (hasPage && /jobs/i.test(path)) return true;
  } catch {
    // fall through to legacy check
  }
  const pathOnly = url.split("?")[0] ?? url;
  return /naukri\.com\/.*-jobs/i.test(pathOnly) && !pathOnly.includes("job-listings");
}

async function returnToSearchList(
  page: Page,
  searchListUrl: string,
  logger: AutomationLogger
): Promise<void> {
  if (!searchListUrl || !searchListUrl.includes("naukri.com")) return;

  logger.info("Returning to search results");
  await page.goto(searchListUrl, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page
    .locator(JOB_TUPLE_SELECTOR)
    .first()
    .waitFor({ state: "attached", timeout: 12_000 })
    .catch(() => undefined);
  await humanDelay(800, 1400);
}

/** Naukri SRP cards expose a stable `data-job-id` — use it instead of title text (many duplicates). */
function naukriNumericJobId(job: NaukriScrapedJob): string | null {
  const raw = job.jobId?.trim();
  if (!raw || raw.startsWith("naukri-")) return null;
  const match = raw.match(/\d{6,}/);
  return match ? match[0] : null;
}

function jobTupleLocator(page: Page, job: NaukriScrapedJob): Locator {
  const id = naukriNumericJobId(job);
  if (id) {
    return page.locator(`${JOB_TUPLE_SELECTOR}[data-job-id="${id}"]`).first();
  }
  return page.locator(JOB_TUPLE_SELECTOR).nth(job.tupleIndex);
}

async function readCardState(
  page: Page,
  job: NaukriScrapedJob
): Promise<CardApplyState | null> {
  return page.evaluate(detectCardApplyState, tupleLocatorArgs(job)).catch(() => null);
}

async function applySingleJob(
  page: Page,
  job: NaukriScrapedJob,
  logger: AutomationLogger,
  searchListUrl: string,
  ctx?: RunContext
): Promise<ApplyJobOutcome> {
  try {
    if (await isRunAborted(ctx)) return "aborted";

    if (!isSearchResultsPage(page.url())) {
      await returnToSearchList(page, searchListUrl, logger);
      if (await isRunAborted(ctx)) return "aborted";
    }

    const tuple = jobTupleLocator(page, job);
    const attached = await tuple
      .waitFor({ state: "attached", timeout: 12_000 })
      .then(() => true)
      .catch(() => false);

    if (attached) {
      const cardState = await readCardState(page, job);
      if (cardState === "already_applied") return "already_applied";
      if (cardState === "no_apply_button") return "no_apply_button";
    }

    if (job.url && /job-listings|job-details/i.test(job.url)) {
      const viaPage = await applyViaJobPage(page, job, logger, searchListUrl, ctx);
      if (viaPage !== "error") return viaPage;
    }

    if (!attached) {
      return "no_apply_button";
    }

    await tuple.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await humanDelay(400, 800);

    const cardStateAgain = await readCardState(page, job);
    if (cardStateAgain === "already_applied") return "already_applied";
    if (cardStateAgain === "no_apply_button") return "no_apply_button";

    let clicked = await tryClickApplyOnTuple(page, tuple, job);
    if (await isRunAborted(ctx)) return "aborted";
    if (!clicked) {
      clicked = await tryClickApplyViaDetailPanel(page, job, logger);
    }

    if (!clicked) {
      const pageState = await page.evaluate(detectPageApplyState).catch(() => null);
      if (pageState === "already_applied") return "already_applied";
      const hints = await page.evaluate(listApplyLikeControls).catch(() => []);
      logger.warn("No apply button", { title: job.title, company: job.company, hints });
      return "no_apply_button";
    }

    if (await isRunAborted(ctx)) return "aborted";
    const submitted = await completeApplyFlow(page, logger, ctx);
    await returnToSearchList(page, searchListUrl, logger);
    return submitted ? "applied" : "no_apply_button";
  } catch (err) {
    await returnToSearchList(page, searchListUrl, logger).catch(() => undefined);
    throw err;
  }
}

async function applyViaJobPage(
  page: Page,
  job: NaukriScrapedJob,
  logger: AutomationLogger,
  searchListUrl: string,
  ctx?: RunContext
): Promise<ApplyJobOutcome> {
  if (await isRunAborted(ctx)) return "aborted";
  logger.info("Opening job page", { url: job.url, jobId: job.jobId });

  await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => undefined);
  await humanDelay(1500, 2500);
  if (await isRunAborted(ctx)) return "aborted";

  await dismissNaukriOverlays(page);

  const pageState = await page.evaluate(detectPageApplyState).catch(() => null);
  if (pageState === "already_applied") {
    await returnToSearchList(page, searchListUrl, logger);
    return "already_applied";
  }
  if (pageState === "no_apply_button") {
    await returnToSearchList(page, searchListUrl, logger);
    return "no_apply_button";
  }

  if (!(await clickApplyWithPlaywright(page))) {
    const clicked = await page.evaluate(clickApplyInDetailPanel).catch(() => false);
    if (!clicked) {
      await returnToSearchList(page, searchListUrl, logger);
      return "no_apply_button";
    }
  }

  await humanDelay(800, 1500);
  if (await isRunAborted(ctx)) return "aborted";
  const submitted = await completeApplyFlow(page, logger, ctx);
  await returnToSearchList(page, searchListUrl, logger);
  return submitted ? "applied" : "no_apply_button";
}

async function dismissNaukriOverlays(page: Page): Promise<void> {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page
    .evaluate(() => {
      document
        .querySelectorAll(
          ".chatbot_Overlay, .chatbot_Overlay.show, [class*='chatbot_Overlay']"
        )
        .forEach((el) => {
          (el as HTMLElement).style.pointerEvents = "none";
          (el as HTMLElement).style.display = "none";
        });
    })
    .catch(() => undefined);
  await humanDelay(300, 600);
}

async function completeApplyFlow(
  page: Page,
  logger: AutomationLogger,
  ctx?: RunContext
): Promise<boolean> {
  if (await isRunAborted(ctx)) return false;
  await dismissNaukriOverlays(page);

  const modal = page.locator(NaukriSelectors.applyModal.container).first();
  const modalVisible = await modal
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  await uploadResumeIfNeeded(page, logger);
  if (await isRunAborted(ctx)) return false;
  const stepsOk = await runApplyModalSteps(page, naukriQuestionnaireConfig, logger, {
    shouldAbort: ctx?.shouldAbort,
  });
  if (!stepsOk) {
    logger.warn("Apply aborted — questionnaire could not be completed");
    if (modalVisible) {
      await closeModalIfOpen(page);
    }
    return false;
  }
  if (modalVisible) {
    await closeModalIfOpen(page);
  }
  return true;
}

async function tryClickApplyOnTuple(
  page: Page,
  tuple: Locator,
  job: NaukriScrapedJob
): Promise<boolean> {
  const domClicked = await tuple
    .evaluate(
      (card) => {
        const candidates = Array.from(
          card.querySelectorAll<HTMLElement>(
            "button, a, div[role='button'], span[role='button'], [class*='apply' i]"
          )
        );
        for (const el of candidates) {
          const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
          const aria = (el.getAttribute("aria-label") ?? "").toLowerCase();
          const label = `${text} ${aria}`;
          if (text === "applied" || /already\s+applied/.test(label)) continue;
          if (!label.includes("apply")) continue;
          if (label.includes("company") || label.includes("external")) continue;
          el.click();
          return true;
        }
        return false;
      }
    )
    .catch(() => false);

  if (domClicked) return true;

  const applyBtn = tuple.locator(TUPLE_APPLY_SELECTORS).first();
  if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await applyBtn.click({ force: true });
    return true;
  }

  const viaEvaluate = await page
    .evaluate(clickApplyInTuple, tupleLocatorArgs(job))
    .catch(() => false);

  return viaEvaluate;
}

async function tryClickApplyViaDetailPanel(
  page: Page,
  job: NaukriScrapedJob,
  logger: AutomationLogger
): Promise<boolean> {
  const tuple = jobTupleLocator(page, job);
  await tuple.click({ timeout: 5000 }).catch(() => undefined);

  const opened = await page
    .evaluate(openJobDetailInTuple, tupleLocatorArgs(job))
    .catch(() => false);

  if (opened) {
    logger.info("Opened job detail panel", { title: job.title });
  }

  await page
    .locator(
      '[class*="styles_JDC" i], [class*="job-details" i], [class*="JobDetails" i]'
    )
    .first()
    .waitFor({ state: "visible", timeout: 8000 })
    .catch(() => undefined);

  await humanDelay(1500, 2500);

  if (await clickApplyWithPlaywright(page)) return true;

  const detailClicked = await page
    .evaluate(clickApplyInDetailPanel)
    .catch(() => false);

  if (detailClicked) return true;

  const detailBtn = page
    .locator(DETAIL_APPLY_SELECTORS)
    .filter({ hasNotText: /company site|external/i })
    .first();

  if (await detailBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await detailBtn.click({ force: true });
    return true;
  }

  return false;
}

async function clickApplyWithPlaywright(page: Page): Promise<boolean> {
  const applyBtn = page
    .getByRole("button", { name: /^apply$/i })
    .or(page.getByRole("link", { name: /^apply$/i }))
    .or(page.getByRole("button", { name: /apply on naukri/i }))
    .filter({ hasNotText: /company|external/i })
    .first();

  if (await applyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await applyBtn.click({ force: true });
    return true;
  }

  const byClass = page
    .locator(
      '[id*="apply" i], [class*="apply-button" i], [class*="ApplyButton" i], [class*="applyButton" i]'
    )
    .filter({ hasText: /apply/i })
    .filter({ hasNotText: /company|external/i })
    .first();

  if (await byClass.isVisible({ timeout: 3000 }).catch(() => false)) {
    await byClass.click({ force: true });
    return true;
  }

  return false;
}

async function uploadResumeIfNeeded(
  page: Page,
  logger: AutomationLogger
): Promise<void> {
  if (!env.resumePath || !existsSync(env.resumePath)) {
    logger.warn("Resume file not set — skip upload", {
      hint: "Set NAUKRI_RESUME_PATH in worker/.env",
    });
    return;
  }

  const fileInput = page.locator(NaukriSelectors.applyModal.fileInput).first();
  if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await fileInput.setInputFiles(env.resumePath);
    await humanDelay(500, 1000);
    logger.info("Resume uploaded", { path: env.resumePath });
  }
}

async function closeModalIfOpen(page: Page): Promise<void> {
  const close = page.locator(NaukriSelectors.applyModal.closeBtn).first();
  if (await close.isVisible({ timeout: 2000 }).catch(() => false)) {
    await close.click().catch(() => undefined);
    await humanDelay(400, 800);
  }
}
