import type { Page } from "playwright";

import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import type { CandidateProfile } from "../../automation/types/profileData.js";

async function fillByLabel(
  page: Page,
  labelPattern: RegExp,
  value: string,
  logger: AutomationLogger,
  fieldName: string
): Promise<void> {
  if (!value) return;

  const label = page.locator("label").filter({ hasText: labelPattern }).first();
  if (!(await label.isVisible({ timeout: 800 }).catch(() => false))) return;

  const forId = await label.getAttribute("for");
  if (forId) {
    const input = page.locator(`#${forId}`);
    if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
      await input.fill(value);
      logger.info(`Indeed: filled ${fieldName}`);
      return;
    }
  }

  const nested = label.locator("input, textarea").first();
  if (await nested.isVisible({ timeout: 500 }).catch(() => false)) {
    await nested.fill(value);
    logger.info(`Indeed: filled ${fieldName}`);
  }
}

/** Address / city / state / postal on Indeed employer question forms. */
export async function fillIndeedContactFields(
  page: Page,
  profile: CandidateProfile,
  logger: AutomationLogger
): Promise<void> {
  await fillByLabel(page, /^city$/i, profile.current_location ?? "Surat", logger, "city");
  await fillByLabel(page, /^state$/i, "Gujarat", logger, "state");
  await fillByLabel(page, /postal|zip|pincode/i, "", logger, "postal");

  const cityInput = page.locator('input[name*="city" i], input[autocomplete="address-level2"]').first();
  if (await cityInput.isVisible({ timeout: 600 }).catch(() => false)) {
    const current = await cityInput.inputValue().catch(() => "");
    if (!current.trim()) {
      await cityInput.fill(profile.current_location ?? "Surat");
      logger.info("Indeed: filled city input");
    }
  }

  await humanDelay(300, 500);
}
