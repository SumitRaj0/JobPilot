import type { Page } from "playwright";

import { handlePlatformQuestionnaire } from "../../automation/questionnaire/handleQuestionnaire.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { indeedQuestionnaireConfig } from "./questionnaireConfig.js";

export async function handleIndeedQuestionnaire(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  return handlePlatformQuestionnaire(page, indeedQuestionnaireConfig, logger);
}
