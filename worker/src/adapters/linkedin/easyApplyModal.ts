import type { Locator, Page } from "playwright";

import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
export function linkedInEasyApplyModal(page: Page): Locator {
  return page
    .locator(
      ".jobs-easy-apply-modal, .jobs-easy-apply-content, [data-test-modal][role='dialog'], .artdeco-modal.jobs-easy-apply-modal"
    )
    .first();
}

export async function waitForLinkedInEasyApplyModal(
  page: Page,
  logger: AutomationLogger,
  timeoutMs = 12_000
): Promise<boolean> {
  const modal = linkedInEasyApplyModal(page);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await modal.isVisible({ timeout: 800 }).catch(() => false)) {
      logger.info("LinkedIn: Easy Apply modal open");
      return true;
    }
    await humanDelay(400, 600);
  }

  logger.warn("LinkedIn: Easy Apply modal did not appear");
  return false;
}

export async function isLinkedInSubmitSuccessVisible(page: Page): Promise<boolean> {
  const modal = linkedInEasyApplyModal(page);
  const scopes: Locator[] = [
    modal,
    page.locator(".artdeco-modal").first(),
    page.locator("body"),
  ];

  for (const scope of scopes) {
    const text = ((await scope.innerText().catch(() => "")) || "").slice(0, 6000);
    if (
      /application\s+sent|application\s+submitted|your\s+application\s+was\s+sent|your\s+application\s+was\s+submitted|successfully\s+applied|you\s+applied\s+to/i.test(
        text
      )
    ) {
      return true;
    }
  }

  if (
    await page
      .locator(
        '[data-test-easy-apply-success-message], .jobs-easy-apply-success, [class*="easy-apply-success" i]'
      )
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false)
  ) {
    return true;
  }

  return false;
}

export async function clickLinkedInModalPrimary(
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
    logger.warn(`LinkedIn: ${label} button disabled`);
    return false;
  }
  await btn.click();
  await humanDelay(800, 1400);
  logger.info(`LinkedIn: clicked ${label}`);
  return true;
}
