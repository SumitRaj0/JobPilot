import { existsSync } from "fs";
import type { Page } from "playwright";

import { QuestionResolver } from "../../automation/QuestionResolver.js";
import { handlePlatformQuestionnaireDeep } from "../../automation/questionnaire/handleQuestionnaire.js";
import { env } from "../../config/env.js";
import { fillIndeedContactFields } from "./fillContactFields.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import { dismissCommonOverlays } from "../shared/platformLogin.js";
import { indeedQuestionnaireConfig } from "./questionnaireConfig.js";
import { waitAndClickIndeedSubmit } from "./reviewPage.js";
import {
  isIndeedApplicationSubmitted,
  isIndeedConfirmationUrl,
  waitForIndeedSubmissionConfirmation,
} from "./submitVerification.js";

/** Indeed Smart Apply — do not match the job-listing "Apply now" button */
const INDEED_CONTINUE_BTN =
  'button[data-testid="continue-button"], button[data-testid="ia-continue"], .ia-continueButton, button:has-text("Continue"), button:has-text("Next")';

const INDEED_SUBMIT_BTN =
  'button[data-testid="submit-application-button"], button[data-testid="submitButton"], button[data-testid="submit-application"], button:has-text("Submit your application"), button:has-text("Submit application"), button:has-text("Submit your responses"), button:has-text("Submit")';

const INDEED_APPLY_ROOT =
  '#iasDialog, [class*="ia-Modal" i], [class*="ia-Apply" i], .ia-BasePage, [data-indeed-apply-api-loaded], div[role="dialog"]';

function isIndeedResumeStep(url: string): boolean {
  return /resume-selection/i.test(url);
}

function isIndeedReviewStep(url: string): boolean {
  return /review-module/i.test(url);
}

async function uploadResumeIfPresent(page: Page, logger: AutomationLogger): Promise<void> {
  if (!env.resumePath || !existsSync(env.resumePath)) return;

  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.isVisible({ timeout: 1500 }).catch(() => false)) {
    await fileInput.setInputFiles(env.resumePath);
    await humanDelay(600, 1000);
    logger.info("Indeed: resume uploaded");
  }
}

/** Pick saved Indeed resume / first radio — not a screening question. */
async function handleIndeedResumeSelection(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  if (!isIndeedResumeStep(page.url())) return false;

  const resumeRadio = page.locator('input[type="radio"]:not([disabled])').first();
  if (await resumeRadio.isVisible({ timeout: 2500 }).catch(() => false)) {
    if (!env.DRY_RUN) {
      await resumeRadio.check({ force: true }).catch(async () => {
        await resumeRadio.click({ force: true });
      });
    }
    logger.info("Indeed: selected resume (radio)");
    await humanDelay(400, 700);
    await clickIndeedContinue(page, logger);
    return true;
  }

  const resumeCard = page
    .locator(
      '[data-testid*="resume" i], [class*="ResumeCard" i], [class*="resumeCard" i], label:has(input[type="radio"])'
    )
    .first();
  if (await resumeCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    if (!env.DRY_RUN) await resumeCard.click({ force: true });
    logger.info("Indeed: selected resume (card)");
    await humanDelay(400, 700);
    await clickIndeedContinue(page, logger);
    return true;
  }

  if (await clickIndeedContinue(page, logger)) {
    return true;
  }

  return false;
}

async function indeedApplySurfaceVisible(page: Page): Promise<boolean> {
  if (isIndeedConfirmationUrl(page.url())) {
    return true;
  }

  const root = page.locator(INDEED_APPLY_ROOT).first();
  if (await root.isVisible({ timeout: 500 }).catch(() => false)) {
    return true;
  }

  if (/smartapply|apply\.indeed|viewapply|indeedapply/i.test(page.url())) {
    return true;
  }

  const continueBtn = page.locator(INDEED_CONTINUE_BTN).first();
  const submitBtn = page.locator(INDEED_SUBMIT_BTN).first();
  return (
    (await continueBtn.isVisible({ timeout: 500 }).catch(() => false)) ||
    (await submitBtn.isVisible({ timeout: 500 }).catch(() => false))
  );
}

async function waitForIndeedApplySurface(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  for (let i = 0; i < 12; i++) {
    if (await indeedApplySurfaceVisible(page)) {
      logger.info("Indeed apply surface ready", { url: page.url() });
      return true;
    }
    await humanDelay(500, 900);
  }
  logger.warn("Indeed apply surface did not appear", { url: page.url() });
  return false;
}

async function clickEnabled(
  page: Page,
  selector: string,
  logger: AutomationLogger,
  label: string
): Promise<boolean> {
  const btn = page.locator(selector).first();
  if (!(await btn.isVisible({ timeout: 2000 }).catch(() => false))) {
    return false;
  }
  if (await btn.isDisabled().catch(() => false)) {
    logger.info(`Indeed: ${label} visible but disabled — waiting`);
    await humanDelay(800, 1200);
    if (await btn.isDisabled().catch(() => false)) return false;
  }
  if (env.DRY_RUN) {
    logger.info(`[DRY_RUN] Would click Indeed ${label}`);
    return true;
  }
  await btn.click({ force: true });
  logger.info(`Indeed: clicked ${label}`);
  await humanDelay(1000, 1800);
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
  return true;
}

async function clickIndeedSubmit(page: Page, logger: AutomationLogger): Promise<boolean> {
  if (env.DRY_RUN) {
    logger.info("[DRY_RUN] Would click Indeed Submit when enabled");
    return true;
  }
  return waitAndClickIndeedSubmit(page, logger);
}

async function clickIndeedContinue(page: Page, logger: AutomationLogger): Promise<boolean> {
  if (await clickEnabled(page, INDEED_CONTINUE_BTN, logger, "Continue")) {
    return true;
  }

  const roleContinue = page.getByRole("button", {
    name: /^continue$|^next$|review your application/i,
  });
  const count = await roleContinue.count();
  for (let i = 0; i < count; i++) {
    const btn = roleContinue.nth(i);
    if (!(await btn.isVisible({ timeout: 800 }).catch(() => false))) continue;
    if (await btn.isDisabled().catch(() => false)) continue;
    if (env.DRY_RUN) {
      logger.info("[DRY_RUN] Would click Indeed Continue (role)");
      return true;
    }
    await btn.click();
    logger.info("Indeed: clicked Continue (role)");
    await humanDelay(1000, 1800);
    return true;
  }

  return false;
}

/** Naukri-style: resolve screening questions before/after each navigation step. */
async function answerIndeedScreeningQuestions(
  applyPage: Page,
  logger: AutomationLogger,
  step: number,
  phase: "before" | "after-continue"
): Promise<boolean> {
  if (isIndeedResumeStep(applyPage.url())) {
    return true;
  }

  logger.info("Indeed: checking screening questions", { step, phase });
  return handlePlatformQuestionnaireDeep(applyPage, indeedQuestionnaireConfig, logger, {
    initialWait: step === 0 && phase === "before",
  });
}

/**
 * Walk Indeed Smart Apply through every step until final submit (or success message).
 */
export async function completeIndeedApplyFlow(
  applyPage: Page,
  logger: AutomationLogger,
  options?: { shouldAbort?: () => boolean | Promise<boolean> }
): Promise<boolean> {
  await dismissCommonOverlays(applyPage);
  await humanDelay(800, 1200);

  if (!(await waitForIndeedApplySurface(applyPage, logger))) {
    return false;
  }

  if (isIndeedConfirmationUrl(applyPage.url())) {
    if (await isIndeedApplicationSubmitted(applyPage)) {
      logger.info("Indeed: already on submission confirmation");
      return true;
    }
  }

  let idleRounds = 0;

  for (let step = 0; step < 25; step++) {
    if (options?.shouldAbort && (await options.shouldAbort())) {
      logger.info("Indeed apply flow aborted — time limit or user stop");
      return false;
    }

    await handleIndeedResumeSelection(applyPage, logger);

    if (/questions|screener|employer|qualification|assessment/i.test(applyPage.url())) {
      try {
        const resolver = new QuestionResolver(env.profileDataPath);
        await fillIndeedContactFields(applyPage, resolver.getProfile(), logger);
      } catch {
        /* profile optional */
      }
    }

    if (!(await answerIndeedScreeningQuestions(applyPage, logger, step, "before"))) {
      return false;
    }

    await uploadResumeIfPresent(applyPage, logger);

    if (isIndeedReviewStep(applyPage.url())) {
      if (await clickIndeedSubmit(applyPage, logger)) {
        if (await waitForIndeedSubmissionConfirmation(applyPage, logger)) {
          return true;
        }
      }
    }

    if (await clickIndeedContinue(applyPage, logger)) {
      idleRounds = 0;
      if (!(await answerIndeedScreeningQuestions(applyPage, logger, step, "after-continue"))) {
        return false;
      }
      continue;
    }

    if (!(await answerIndeedScreeningQuestions(applyPage, logger, step, "after-continue"))) {
      return false;
    }

    idleRounds++;
    if (idleRounds >= 3) {
      logger.warn("Indeed: stuck on apply flow — no Continue/Submit", {
        step,
        url: applyPage.url(),
      });
      return false;
    }

    await humanDelay(700, 1100);
  }

  logger.warn("Indeed: exceeded max apply steps without confirmation");
  return false;
}

/** Close leftover Smart Apply tabs from failed prior attempts. */
export async function closeStaleIndeedApplyTabs(listPage: Page): Promise<void> {
  for (const p of listPage.context().pages()) {
    if (p !== listPage && !p.isClosed() && /smartapply\.indeed/i.test(p.url())) {
      await p.close().catch(() => undefined);
    }
  }
}

/** Click Apply — returns the page that hosts the apply flow (popup or same tab). */
export async function openIndeedApplySurface(
  listPage: Page,
  applyBtnLocator: ReturnType<Page["locator"]>,
  logger: AutomationLogger
): Promise<Page> {
  await closeStaleIndeedApplyTabs(listPage);

  const popupPromise = listPage
    .context()
    .waitForEvent("page", { timeout: 10_000 })
    .catch(() => null);

  await applyBtnLocator.click({ force: true });

  const popup = await popupPromise;
  if (popup) {
    await popup.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined);
    logger.info("Indeed apply opened in new tab", { url: popup.url() });
    return popup;
  }

  await humanDelay(1200, 2000);
  return listPage;
}

export async function closeIndeedApplyPage(
  applyPage: Page,
  listPage: Page
): Promise<void> {
  if (applyPage !== listPage && !applyPage.isClosed()) {
    await applyPage.close().catch(() => undefined);
  }
  await closeStaleIndeedApplyTabs(listPage);
}
