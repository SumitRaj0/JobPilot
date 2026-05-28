import type { Locator, Page } from "playwright";

import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import { isIndeedRecaptchaPresent, waitForHumanRecaptchaIfPresent } from "./captcha.js";

const SUBMIT_SELECTORS = [
  'button[data-testid="submit-application-button"]',
  'button[data-testid="submitButton"]',
  'button[data-testid="submit-application"]',
  'button:has-text("Submit your application")',
  'button:has-text("Submit application")',
];

async function isLocatorClickable(btn: Locator): Promise<boolean> {
  if (!(await btn.isVisible({ timeout: 400 }).catch(() => false))) return false;
  if (await btn.isDisabled().catch(() => false)) return false;
  const ariaDisabled = await btn.getAttribute("aria-disabled");
  if (ariaDisabled === "true") return false;
  return true;
}

/** Indeed keeps Submit disabled until attestations / required fields on review are satisfied. */
export async function acceptIndeedReviewRequirements(
  page: Page,
  logger: AutomationLogger
): Promise<void> {
  const unchecked = page.locator(
    'input[type="checkbox"]:not(:checked):not([name="g-recaptcha-response"]), input[type="checkbox"][aria-checked="false"]'
  );
  const count = await unchecked.count();

  for (let i = 0; i < count; i++) {
    const box = unchecked.nth(i);
    if (!(await box.isVisible({ timeout: 500 }).catch(() => false))) continue;

    const id = (await box.getAttribute("id")) ?? "";
    if (/recaptcha|g-recaptcha/i.test(id)) continue;
    await box.check({ force: true }).catch(async () => {
      const label = page.locator(`label[for="${await box.getAttribute("id")}"]`).first();
      if (await label.isVisible({ timeout: 300 }).catch(() => false)) {
        await label.click({ force: true });
      }
    });
    logger.info("Indeed review: checked required checkbox");
    await humanDelay(200, 400);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => undefined);
  await humanDelay(300, 500);
}

export async function findEnabledIndeedSubmitButton(
  page: Page
): Promise<Locator | null> {
  for (const selector of SUBMIT_SELECTORS) {
    const buttons = page.locator(selector);
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      if (await isLocatorClickable(btn)) return btn;
    }
  }

  const roleSubmit = page.getByRole("button", {
    name: /submit your application|submit application/i,
  });
  const roleCount = await roleSubmit.count();
  for (let i = 0; i < roleCount; i++) {
    const btn = roleSubmit.nth(i);
    if (await isLocatorClickable(btn)) return btn;
  }

  return null;
}

/** Wait until Submit is enabled, then click once (never force-clicks a disabled button). */
export async function waitAndClickIndeedSubmit(
  page: Page,
  logger: AutomationLogger,
  maxWaitMs = 15_000
): Promise<boolean> {
  if (await isIndeedRecaptchaPresent(page)) {
    const solved = await waitForHumanRecaptchaIfPresent(page, logger);
    if (!solved) return false;
  }

  await acceptIndeedReviewRequirements(page, logger);

  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const btn = await findEnabledIndeedSubmitButton(page);
    if (btn) {
      await btn.scrollIntoViewIfNeeded().catch(() => undefined);
      await btn.click();
      logger.info("Indeed: clicked enabled Submit");
      await humanDelay(1200, 2000);
      return true;
    }

    const disabledVisible = page.locator(SUBMIT_SELECTORS.join(", ")).first();
    if (await disabledVisible.isVisible({ timeout: 300 }).catch(() => false)) {
      logger.info("Indeed: Submit visible but still disabled — checking attestations");
      await acceptIndeedReviewRequirements(page, logger);
    }

    await humanDelay(600, 900);
  }

  logger.warn("Indeed: Submit never became enabled", { url: page.url() });
  return false;
}
