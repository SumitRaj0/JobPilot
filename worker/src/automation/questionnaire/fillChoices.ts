import type { Frame, Locator, Page } from "playwright";

import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import type { ScrapedQuestion } from "./types.js";
import {
  mapPartsToUiOptions,
  optionTextsMatch,
  pickBestUiOption,
  splitMultiSelectAnswer,
} from "./matchUiOptions.js";

type ChoiceScope = Page | Frame | Locator;

function scopePage(scope: ChoiceScope): Page {
  if ("goto" in scope && !("page" in scope)) {
    return scope as Page;
  }
  return (scope as Frame | Locator).page();
}
function isMultiSelectQuestion(question: ScrapedQuestion): boolean {
  return (
    /select all/i.test(question.questionText) ||
    (question.controlType === "checkbox" && question.uiOptions.length > 1)
  );
}

async function clickLabelWithText(
  block: ChoiceScope,
  optionText: string,
  logger: AutomationLogger,
  inputType: "radio" | "checkbox"
): Promise<boolean> {
  const labels = block.locator(`label:has(input[type="${inputType}"])`);
  const count = await labels.count();

  for (let i = 0; i < count; i++) {
    const label = labels.nth(i);
    const text = ((await label.innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim();
    if (optionTextsMatch(text, optionText)) {
      await label.click({ force: true });
      logger.info(`Selected ${inputType}`, { option: text.slice(0, 80) });
      return true;
    }
  }

  const byRole = block.getByRole(inputType, { name: new RegExp(escapeRegExp(optionText), "i") });
  if (await byRole.first().isVisible({ timeout: 800 }).catch(() => false)) {
    await byRole.first().click({ force: true });
    logger.info(`Selected ${inputType} (role)`, { option: optionText.slice(0, 80) });
    return true;
  }

  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Indeed often uses &lt;select&gt; or listboxes for "How many years..." — not radios. */
async function fillSelectListboxOrNumeric(
  block: ChoiceScope,
  question: ScrapedQuestion,
  answer: string,
  logger: AutomationLogger
): Promise<boolean> {
  const select = block.locator("select").first();
  if (await select.isVisible({ timeout: 1200 }).catch(() => false)) {
    const options = await select.locator("option").allTextContents();
    const best = pickBestUiOption(answer, options.filter((o) => o.trim()));
    if (!best) return false;
    await select.selectOption({ label: best }).catch(async () => {
      await select.selectOption({ value: best }).catch(() => undefined);
    });
    logger.info("Selected dropdown option", { option: best.slice(0, 80) });
    return true;
  }

  const numeric = answer.replace(/[^\d.]/g, "");
  const numberInput = block.locator('input[type="number"]').first();
  if (numeric && (await numberInput.isVisible({ timeout: 1000 }).catch(() => false))) {
    await numberInput.fill(numeric);
    logger.info("Filled numeric answer", { value: numeric });
    return true;
  }

  const combo = block.locator('[role="combobox"], button[aria-haspopup="listbox"]').first();
  if (await combo.isVisible({ timeout: 1000 }).catch(() => false)) {
    await combo.click();
    await humanDelay(300, 500);
    const best =
      question.uiOptions.length > 0 ? pickBestUiOption(answer, question.uiOptions) : answer;
    if (!best) return false;
    const option = scopePage(block).getByRole("option", {
      name: new RegExp(escapeRegExp(best), "i"),
    });
    if (await option.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await option.first().click();
      logger.info("Selected listbox option", { option: best.slice(0, 80) });
      return true;
    }
  }

  const clickableOptions = block.locator(
    '[role="option"], [role="radio"], button[type="button"], li button, li[role="option"]'
  );
  const optCount = await clickableOptions.count();
  const best =
    question.uiOptions.length > 0 ? pickBestUiOption(answer, question.uiOptions) : answer;
  if (!best) return false;

  for (let i = 0; i < optCount; i++) {
    const opt = clickableOptions.nth(i);
    const text = ((await opt.innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim();
    if (text && optionTextsMatch(text, best)) {
      await opt.click({ force: true });
      logger.info("Selected clickable option", { option: text.slice(0, 80) });
      return true;
    }
  }

  return false;
}

export async function fillChoiceQuestion(
  block: ChoiceScope,
  question: ScrapedQuestion,
  answer: string,
  logger: AutomationLogger
): Promise<boolean> {
  if (/how many years|years of.*experience/i.test(question.questionText)) {
    if (await fillSelectListboxOrNumeric(block, question, answer, logger)) {
      return true;
    }
  }

  const radioCount = await block.locator('input[type="radio"]').count();
  const checkboxCount = await block.locator('input[type="checkbox"]').count();

  if (isMultiSelectQuestion(question) || (checkboxCount > 1 && radioCount === 0)) {
    const parts = splitMultiSelectAnswer(answer);
    const targets =
      question.uiOptions.length > 0
        ? mapPartsToUiOptions(parts.length > 0 ? parts : [answer], question.uiOptions)
        : parts;

    if (targets.length === 0 && question.uiOptions.length > 0) {
      const fallback = pickBestUiOption(answer, question.uiOptions);
      if (fallback) targets.push(fallback);
    }

    let clicked = 0;
    for (const target of targets) {
      if (await clickLabelWithText(block, target, logger, "checkbox")) {
        clicked++;
      }
    }
    return clicked > 0;
  }

  if (radioCount > 0) {
    const single =
      question.uiOptions.length > 0 ? pickBestUiOption(answer, question.uiOptions) : answer;
    if (!single) return false;
    return clickLabelWithText(block, single, logger, "radio");
  }

  if (checkboxCount === 1) {
    return clickLabelWithText(block, answer, logger, "checkbox");
  }

  return false;
}
