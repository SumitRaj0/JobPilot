export type QuestionControlType = "text" | "radio" | "checkbox" | "select";

export interface ScrapedQuestion {
  questionText: string;
  uiOptions: string[];
  hasTextInput: boolean;
  blockIndex: number;
  controlType?: QuestionControlType;
  /** True when UI marks it required (required/aria-required/*). */
  required?: boolean;
}

/** Passed into page.evaluate — must stay JSON-serializable. */
export interface QuestionnaireScrapeConfig {
  containerSelectors: string[];
  blockSelectors: string[];
}

export interface QuestionnairePlaywrightSelectors {
  container: string;
  questionBlock: string;
  closeBtn: string;
  textInput: string;
  choiceOptions: string;
  /** Next / Continue / Review in multi-step apply flows */
  nextStepBtn: string;
  submitBtn: string;
}

export interface QuestionnairePlatformConfig {
  platform: "naukri" | "linkedin" | "indeed";
  scrape: QuestionnaireScrapeConfig;
  playwright: QuestionnairePlaywrightSelectors;
}
