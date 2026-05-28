import type { Frame, Page } from "playwright";

type QuestionnaireScope = Page | Frame;

import { env } from "../../config/env.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import { QuestionnaireUnresolvedError } from "../QuestionnaireUnresolvedError.js";
import { QuestionResolver } from "../QuestionResolver.js";
import { fillChoiceQuestion } from "./fillChoices.js";
import { filterScrapedQuestions } from "./filterQuestions.js";
import { pickBestUiOption } from "./matchUiOptions.js";
import { scrapeQuestionnaireFieldsWithConfig } from "./scrapeInBrowser.js";
import type { QuestionnairePlatformConfig, ScrapedQuestion } from "./types.js";

let resolver: QuestionResolver | null = null;

function getResolver(): QuestionResolver {
  if (!resolver) {
    resolver = new QuestionResolver(env.profileDataPath);
  }
  return resolver;
}

function isStrictlyRequiredQuestion(q: ScrapedQuestion): boolean {
  if (q.required) return true;
  return /\b(required|mandatory)\b/i.test(q.questionText) || /\*/.test(q.questionText);
}

export async function isQuestionnaireVisible(
  page: Page,
  config: QuestionnairePlatformConfig
): Promise<boolean> {
  const modal = page.locator(config.playwright.container).first();
  if (await modal.isVisible({ timeout: 1500 }).catch(() => false)) {
    return true;
  }

  const scraped = filterScrapedQuestions(
    await page.evaluate(scrapeQuestionnaireFieldsWithConfig, config.scrape).catch(() => [])
  );
  return scraped.length > 0;
}

/**
 * Resolves and fills recruiter questions for any platform config.
 * @returns `true` if OK to proceed to submit; `false` = skip this job.
 */
export async function handlePlatformQuestionnaire(
  page: Page,
  config: QuestionnairePlatformConfig,
  logger: AutomationLogger,
  options?: { initialWait?: boolean }
): Promise<boolean> {
  if (options?.initialWait !== false) {
    await humanDelay(1200, 1800);
  }

  const visible = await isQuestionnaireVisible(page, config);
  if (!visible) {
    logger.info(`No recruiter questionnaire (${config.platform})`);
    return true;
  }

  const rawQuestions = await page.evaluate(
    scrapeQuestionnaireFieldsWithConfig,
    config.scrape
  );
  const questions = filterScrapedQuestions(rawQuestions);
  if (questions.length === 0) {
    logger.info(`No screening questions to answer (${config.platform})`, {
      rawBlocks: rawQuestions.length,
    });
    return true;
  }

  logger.info(`Recruiter questionnaire (${config.platform})`, {
    count: questions.length,
  });

  const questionResolver = getResolver();

  for (const q of questions) {
    try {
      const { answer: rawAnswer, source } = await questionResolver.resolveQuestion(
        q.questionText,
        q.uiOptions
      );

      const answer =
        q.uiOptions.length > 0 && q.controlType !== "checkbox"
          ? (pickBestUiOption(rawAnswer, q.uiOptions) ?? rawAnswer)
          : rawAnswer;

      if (env.DRY_RUN) {
        logger.info("[DRY_RUN] Would fill answer", {
          platform: config.platform,
          question: q.questionText.slice(0, 80),
          answer,
          source,
        });
        continue;
      }

      await fillQuestionAnswer(page, config, q, answer, logger);
      await humanDelay(400, 800);
    } catch (err) {
      if (err instanceof QuestionnaireUnresolvedError) {
        if (!isStrictlyRequiredQuestion(q)) {
          logger.warn(`Skipping optional unresolved question (${config.platform})`, {
            question: err.questionText.slice(0, 120),
            reason: err.reason,
          });
          continue;
        }
        logger.warn(`Skipping job — unresolved question (${config.platform})`, {
          question: err.questionText.slice(0, 120),
          reason: err.reason,
          headless: env.PLAYWRIGHT_HEADLESS,
        });
        await closeQuestionnaireModal(page, config);
        return false;
      }
      throw err;
    }
  }

  return true;
}

/**
 * Same resolver as the main page, plus child iframes (Indeed Smart Apply often embeds questions).
 */
export async function handlePlatformQuestionnaireDeep(
  page: Page,
  config: QuestionnairePlatformConfig,
  logger: AutomationLogger,
  options?: { initialWait?: boolean }
): Promise<boolean> {
  if (!(await handlePlatformQuestionnaire(page, config, logger, options))) {
    return false;
  }

  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    if (!(await handleQuestionnaireOnFrame(frame, config, logger))) {
      return false;
    }
  }

  return true;
}

async function handleQuestionnaireOnFrame(
  frame: Frame,
  config: QuestionnairePlatformConfig,
  logger: AutomationLogger
): Promise<boolean> {
  const questions = filterScrapedQuestions(
    await frame
      .evaluate(scrapeQuestionnaireFieldsWithConfig, config.scrape)
      .catch(() => [] as ScrapedQuestion[])
  );

  if (questions.length === 0) {
    return true;
  }

  logger.info(`Recruiter questionnaire in iframe (${config.platform})`, {
    count: questions.length,
    frameUrl: frame.url().slice(0, 120),
  });

  const questionResolver = getResolver();
  const ownerPage = frame.page();

  for (const q of questions) {
    try {
      const { answer, source } = await questionResolver.resolveQuestion(
        q.questionText,
        q.uiOptions
      );

      if (env.DRY_RUN) {
        logger.info("[DRY_RUN] Would fill answer (iframe)", {
          platform: config.platform,
          question: q.questionText.slice(0, 80),
          answer,
          source,
        });
        continue;
      }

      await fillQuestionAnswer(frame, config, q, answer, logger);
      await humanDelay(400, 800);
    } catch (err) {
      if (err instanceof QuestionnaireUnresolvedError) {
        if (!isStrictlyRequiredQuestion(q)) {
          logger.warn(`Skipping optional unresolved iframe question (${config.platform})`, {
            question: err.questionText.slice(0, 120),
            reason: err.reason,
          });
          continue;
        }
        logger.warn(`Skipping job — unresolved question in iframe (${config.platform})`, {
          question: err.questionText.slice(0, 120),
          reason: err.reason,
        });
        await closeQuestionnaireModal(ownerPage, config);
        return false;
      }
      throw err;
    }
  }

  return true;
}

async function closeQuestionnaireModal(
  page: Page,
  config: QuestionnairePlatformConfig
): Promise<void> {
  const close = page.locator(config.playwright.closeBtn).first();
  if (await close.isVisible({ timeout: 2000 }).catch(() => false)) {
    await close.click().catch(() => undefined);
  } else {
    await page.keyboard.press("Escape").catch(() => undefined);
  }
  await humanDelay(400, 800);
}

async function fillQuestionAnswer(
  scopeRoot: QuestionnaireScope,
  config: QuestionnairePlatformConfig,
  question: ScrapedQuestion,
  answer: string,
  logger: AutomationLogger
): Promise<void> {
  const modal = scopeRoot.locator(config.playwright.container).first();
  const scope = (await modal.isVisible().catch(() => false)) ? modal : scopeRoot;

  const blocks = scope.locator(config.playwright.questionBlock);
  const blockCount = await blocks.count();
  const block =
    blockCount > question.blockIndex ? blocks.nth(question.blockIndex) : scope;

  const radioCount = await block.locator('input[type="radio"]').count();
  const checkboxCount = await block.locator('input[type="checkbox"]').count();
  const useChoicesFirst =
    question.controlType === "radio" ||
    question.controlType === "checkbox" ||
    radioCount > 0 ||
    checkboxCount > 0 ||
    (question.uiOptions.length >= 2 && !question.hasTextInput);

  if (/how many years|years of.*experience/i.test(question.questionText)) {
    const filled = await fillChoiceQuestion(block, question, answer, logger);
    if (filled) return;
  }

  if (useChoicesFirst) {
    const filled = await fillChoiceQuestion(block, question, answer, logger);
    if (filled) return;
  }

  if (question.hasTextInput) {
    const textInput = block.locator(config.playwright.textInput).first();
    if (await textInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textInput.click({ clickCount: 3 });
      await textInput.fill(answer);
      logger.info("Filled text question", {
        platform: config.platform,
        question: question.questionText.slice(0, 60),
      });
      return;
    }
  }

  const filledFallback = await fillChoiceQuestion(block, question, answer, logger);
  if (filledFallback) return;

  const select = block.locator("select").first();
  if (await select.isVisible({ timeout: 1000 }).catch(() => false)) {
    await select.selectOption({ label: answer }).catch(async () => {
      await select.selectOption({ value: answer }).catch(() => undefined);
    });
    logger.info("Selected dropdown", {
      platform: config.platform,
      question: question.questionText.slice(0, 60),
    });
    return;
  }

  logger.warn("Could not match answer to UI control", {
    platform: config.platform,
    question: question.questionText.slice(0, 60),
    answer,
  });
  throw new QuestionnaireUnresolvedError(question.questionText, "ui_control_not_matched");
}
