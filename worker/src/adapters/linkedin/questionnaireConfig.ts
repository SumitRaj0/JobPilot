import type { QuestionnairePlatformConfig } from "../../automation/questionnaire/types.js";

/** LinkedIn Easy Apply / application question modals */
export const linkedInQuestionnaireConfig: QuestionnairePlatformConfig = {
  platform: "linkedin",
  scrape: {
    containerSelectors: [
      ".jobs-easy-apply-modal",
      '[data-test-modal]',
      '[class*="jobs-easy-apply" i]',
      'div[role="dialog"]',
      ".artdeco-modal",
    ],
    blockSelectors: [
      "fieldset",
      ".fb-dash-form-element",
      '[data-test-form-element]',
      '[class*="jobs-easy-apply-form-section" i]',
      ".jobs-easy-apply-form-section__grouping",
    ],
  },
  playwright: {
    container:
      '.jobs-easy-apply-modal, [data-test-modal], .artdeco-modal[role="dialog"]',
    questionBlock:
      "fieldset, .fb-dash-form-element, [data-test-form-element], .jobs-easy-apply-form-section__grouping",
    closeBtn:
      'button[aria-label="Dismiss"], button[aria-label="Close"], .artdeco-modal__dismiss',
    textInput:
      'input[type="text"], input[type="number"], input[type="email"], input[type="tel"], textarea',
    choiceOptions:
      'label:has(input[type="radio"]), label:has(input[type="checkbox"]), [role="radio"], [role="option"], ul li',
    nextStepBtn:
      'button:has-text("Next"), button:has-text("Continue"), button:has-text("Review"), button[aria-label="Continue to next step"], button[aria-label="Review your application"]',
    submitBtn:
      'button:has-text("Submit application"), button[aria-label="Submit application"], button:has-text("Submit"), footer button.artdeco-button--primary:has-text("Submit")',
  },
};
