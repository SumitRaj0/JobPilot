import type { QuestionnairePlatformConfig } from "../../automation/questionnaire/types.js";

/** Indeed "Indeed Apply" / IAS screening questions */
export const indeedQuestionnaireConfig: QuestionnairePlatformConfig = {
  platform: "indeed",
  scrape: {
    containerSelectors: [
      "#iasDialog",
      '[class*="ia-Modal" i]',
      '[class*="indeed-apply" i]',
      'div[role="dialog"]',
      ".ia-BasePage",
      '[class*="ia-Apply" i]',
      '[data-testid="apply-page"]',
      '[data-testid="application-form"]',
    ],
    blockSelectors: [
      ".ia-Questions-item",
      '[data-testid="question-item"]',
      '[data-testid*="question" i]',
      '[class*="ia-Question" i]',
      '[class*="mosaic-provider" i] fieldset',
      "fieldset",
      ".ia-FormField",
      '[class*="FormField" i]',
    ],
  },
  playwright: {
    container:
      '#iasDialog, [class*="ia-Modal" i], .ia-BasePage, [class*="ia-Apply" i], main, div[role="dialog"]',
    questionBlock:
      ".ia-Questions-item, [data-testid*='question' i], [class*='ia-Question' i], fieldset, .ia-FormField, [class*='FormField' i]",
    closeBtn:
      'button[aria-label="Close"], button:has-text("Close"), [data-testid="close-button"]',
    textInput:
      'input[type="text"], input[type="number"], input[type="email"], input[type="tel"], textarea',
    choiceOptions:
      'label:has(input[type="radio"]), label:has(input[type="checkbox"]), [role="option"], select option, ul li',
    nextStepBtn:
      'button:has-text("Continue"), button:has-text("Next"), button:has-text("Review your application")',
    submitBtn:
      'button[data-testid="submit-application-button"], button:has-text("Submit your application"), button:has-text("Submit application")',
  },
};
