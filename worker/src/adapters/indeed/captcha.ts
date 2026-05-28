import type { Page } from "playwright";

import { env } from "../../config/env.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import { findEnabledIndeedSubmitButton } from "./reviewPage.js";

export async function isIndeedRecaptchaPresent(page: Page): Promise<boolean> {
  const iframe = page.locator('iframe[src*="recaptcha"], iframe[title*="reCAPTCHA" i]').first();
  if (await iframe.isVisible({ timeout: 800 }).catch(() => false)) {
    return true;
  }

  const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 6000);
  return /recaptcha|i.?m not a robot|verify you are human|protected by recaptcha/i.test(body);
}

async function isRecaptchaSolved(page: Page): Promise<boolean> {
  return page
    .evaluate(() => {
      const response = document.querySelector(
        'textarea[name="g-recaptcha-response"]'
      ) as HTMLTextAreaElement | null;
      if (response?.value && response.value.length > 20) return true;

      const token = document.querySelector('[name="g-recaptcha-response"]') as
        | HTMLTextAreaElement
        | HTMLInputElement
        | null;
      return Boolean(token?.value && token.value.length > 20);
    })
    .catch(() => false);
}

/**
 * reCAPTCHA cannot be solved by automation. In headed mode, pause for you to click
 * "I'm not a robot" in the worker browser, then continue when Submit enables.
 */
export async function waitForHumanRecaptchaIfPresent(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  if (!(await isIndeedRecaptchaPresent(page))) {
    return true;
  }

  if (env.PLAYWRIGHT_HEADLESS) {
    logger.warn(
      "Indeed: reCAPTCHA on review page — cannot auto-solve in headless mode (set PLAYWRIGHT_HEADLESS=false)"
    );
    return false;
  }

  logger.warn(
    "Indeed: reCAPTCHA detected — click 'I'm not a robot' in the Playwright browser window"
  );

  const deadline = Date.now() + env.INDEED_CAPTCHA_WAIT_MS;

  while (Date.now() < deadline) {
    if (await isRecaptchaSolved(page)) {
      logger.info("Indeed: reCAPTCHA token present — continuing");
      await humanDelay(800, 1200);
      return true;
    }

    if (await findEnabledIndeedSubmitButton(page)) {
      logger.info("Indeed: Submit enabled (reCAPTCHA may be solved)");
      return true;
    }

    await humanDelay(1500, 2000);
  }

  logger.warn("Indeed: reCAPTCHA not solved within wait time");
  return false;
}
