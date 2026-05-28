import type { Page } from "playwright";

import { handlePlatformQuestionnaire } from "../../automation/questionnaire/handleQuestionnaire.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { linkedInQuestionnaireConfig } from "./questionnaireConfig.js";

export async function handleLinkedInQuestionnaire(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  return handlePlatformQuestionnaire(page, linkedInQuestionnaireConfig, logger);
}
