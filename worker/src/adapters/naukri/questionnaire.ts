import type { Page } from "playwright";

import { handlePlatformQuestionnaire } from "../../automation/questionnaire/handleQuestionnaire.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { naukriQuestionnaireConfig } from "./questionnaireConfig.js";

/** @returns `true` if OK to submit; `false` = skip this job apply. */
export async function handleNaukriQuestionnaire(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  return handlePlatformQuestionnaire(page, naukriQuestionnaireConfig, logger);
}
