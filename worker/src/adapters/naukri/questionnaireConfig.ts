import type { QuestionnairePlatformConfig } from "../../automation/questionnaire/types.js";
import { NaukriSelectors } from "./selectors.js";

export const naukriQuestionnaireConfig: QuestionnairePlatformConfig = {
  platform: "naukri",
  scrape: {
    containerSelectors: [
      ".chatbot-container",
      ".modal-form-fields",
      '[class*="chatbot" i]',
      '[class*="questionnaire" i]',
      '[class*="ApplyModal" i]',
      'div[role="dialog"]',
    ],
    blockSelectors: [
      ".question-block",
      '[class*="question" i]',
      '[class*="form-group" i]',
      '[class*="fieldWrapper" i]',
      "fieldset",
      ".form-row",
    ],
  },
  playwright: {
    container: NaukriSelectors.questionnaire.container,
    questionBlock: NaukriSelectors.questionnaire.questionBlock,
    closeBtn: NaukriSelectors.applyModal.closeBtn,
    textInput: NaukriSelectors.questionnaire.textInput,
    choiceOptions: NaukriSelectors.questionnaire.dropdownOption,
    nextStepBtn:
      'button:has-text("Next"), button:has-text("Continue"), button:has-text("Proceed")',
    submitBtn: NaukriSelectors.questionnaire.submitBtn,
  },
};
