import { existsSync } from "fs";
import type { Page } from "playwright";

import { env } from "../../config/env.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import { handlePlatformQuestionnaire } from "./handleQuestionnaire.js";
import type { QuestionnairePlatformConfig } from "./types.js";

const MAX_STEPS = 20;

async function linkedInApplySucceeded(page: Page): Promise<boolean> {
  const { isLinkedInSubmitSuccessVisible } = await import(
    "../../adapters/linkedin/easyApplyModal.js"
  );
  return isLinkedInSubmitSuccessVisible(page);
}

/**
 * Multi-step apply modal: resolve questions on each screen, then Next or Submit.
 * @returns true if submitted or no modal; false if questionnaire unresolved.
 */
export async function runApplyModalSteps(
  page: Page,
  config: QuestionnairePlatformConfig,
  logger: AutomationLogger,
  options?: { shouldAbort?: () => boolean | Promise<boolean> }
): Promise<boolean> {
  const shouldAbort = async (): Promise<boolean> => {
    if (!options?.shouldAbort) return false;
    return options.shouldAbort();
  };

  const modal = page.locator(config.playwright.container).first();
  const hasModal = await modal.isVisible({ timeout: 4000 }).catch(() => false);
  if (!hasModal) {
    if (config.platform === "linkedin") {
      return false;
    }
    return true;
  }

  if (env.resumePath && existsSync(env.resumePath)) {
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fileInput.setInputFiles(env.resumePath);
      await humanDelay(500, 1000);
      logger.info("Resume uploaded in apply modal", { platform: config.platform });
    }
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    if (await shouldAbort()) {
      logger.info("Apply modal stopped from panel", { platform: config.platform, step });
      return false;
    }

    const questionnaireOk = await handlePlatformQuestionnaire(page, config, logger, {
      initialWait: step === 0,
    });
    if (!questionnaireOk) {
      return false;
    }

    const submit = page.locator(config.playwright.submitBtn).first();
    if (await submit.isVisible({ timeout: 1500 }).catch(() => false)) {
      if (env.DRY_RUN) {
        logger.info("[DRY_RUN] Would click submit on apply modal", {
          platform: config.platform,
        });
        return true;
      }
      if (await submit.isDisabled().catch(() => false)) {
        logger.warn(`${config.platform} submit visible but disabled`, { step });
      } else {
        await submit.click();
        await humanDelay(1500, 2500);
        logger.info("Submit clicked", { platform: config.platform, step });
        if (config.platform === "linkedin") {
          if (await linkedInApplySucceeded(page)) {
            return true;
          }
          continue;
        }
        return true;
      }
    }

    const next = page.locator(config.playwright.nextStepBtn).first();
    if (await next.isVisible({ timeout: 1500 }).catch(() => false)) {
      if (env.DRY_RUN) {
        logger.info("[DRY_RUN] Would click next on apply modal", {
          platform: config.platform,
          step,
        });
        return true;
      }
      if (!(await next.isDisabled().catch(() => false))) {
        await next.click();
        await humanDelay(800, 1500);
        continue;
      }
      logger.warn(`${config.platform} next visible but disabled`, { step });
    }

    if (!(await modal.isVisible({ timeout: 800 }).catch(() => false))) {
      if (config.platform === "linkedin") {
        return false;
      }
      return true;
    }

    if (config.platform === "linkedin") {
      logger.warn(`${config.platform} apply step stalled — no Next/Submit found`, {
        step,
      });
      return false;
    }

    logger.info("Apply modal open with no Next/Submit — treating as complete", {
      platform: config.platform,
      step,
    });
    return true;
  }

  logger.warn("Apply modal exceeded max steps", { platform: config.platform });
  if (config.platform === "linkedin" && (await linkedInApplySucceeded(page))) {
    return true;
  }
  return config.platform !== "linkedin";
}
