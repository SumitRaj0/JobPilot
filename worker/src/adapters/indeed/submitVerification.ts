import type { Page } from "playwright";

import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";

/** Smart Apply wizard steps — success text here is often a false positive. */
const INDEED_FORM_MODULE_URL =
  /smartapply\.indeed\.com\/.*\/form\/|applybyapplyablejobid/i;

const INDEED_CONFIRMATION_URL =
  /(?:application-submitted|apply-confirmation|post-apply|submission-complete|confirmation)/i;

const STRICT_SUCCESS_BODY =
  /your application has been submitted|application has been sent to the employer|thanks for applying to this (job|position)|you'?ve successfully applied/i;

const INDEED_SUBMIT_BTN =
  'button[data-testid="submit-application-button"], button[data-testid="submitButton"], button:has-text("Submit your application")';

const INDEED_CONTINUE_BTN =
  'button[data-testid="continue-button"], button:has-text("Continue"), button:has-text("Next")';

export function isIndeedConfirmationUrl(url: string): boolean {
  if (INDEED_CONFIRMATION_URL.test(url)) return true;
  if (/smartapply\.indeed/i.test(url) && !INDEED_FORM_MODULE_URL.test(url)) {
    return /submitted|confirmation|complete|success/i.test(url);
  }
  return false;
}

export function isIndeedWizardStepUrl(url: string): boolean {
  return INDEED_FORM_MODULE_URL.test(url);
}

async function applyWizardStillOpen(page: Page): Promise<boolean> {
  const continueBtn = page.locator(INDEED_CONTINUE_BTN).first();
  const submitBtn = page.locator(INDEED_SUBMIT_BTN).first();
  return (
    (await continueBtn.isVisible({ timeout: 400 }).catch(() => false)) ||
    (await submitBtn.isVisible({ timeout: 400 }).catch(() => false))
  );
}

/**
 * Strict check — avoids counting listing badges, resume cards, or "Applied" in the wizard.
 */
export async function isIndeedApplicationSubmitted(page: Page): Promise<boolean> {
  const url = page.url();

  if (isIndeedConfirmationUrl(url)) {
    return true;
  }

  if (isIndeedWizardStepUrl(url)) {
    return false;
  }

  const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 12_000);
  if (!STRICT_SUCCESS_BODY.test(body)) {
    return false;
  }

  if (await applyWizardStillOpen(page)) {
    return false;
  }

  return true;
}

export async function waitForIndeedSubmissionConfirmation(
  page: Page,
  logger: AutomationLogger,
  maxWaitMs = 22_000
): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    if (await isIndeedApplicationSubmitted(page)) {
      logger.info("Indeed: verified application submitted", { url: page.url() });
      return true;
    }
    await humanDelay(600, 900);
  }

  logger.warn("Indeed: no confirmation after submit — not counting as applied", {
    url: page.url(),
  });
  return false;
}
