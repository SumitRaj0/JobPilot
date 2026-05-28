/// <reference lib="dom" />

import type { QuestionnaireScrapeConfig, ScrapedQuestion } from "./types.js";

/** Runs in page.evaluate — self-contained DOM scrape for recruiter questions. */
export function scrapeQuestionnaireFieldsWithConfig(
  config: QuestionnaireScrapeConfig
): ScrapedQuestion[] {
  let root: Element | null = null;
  for (const sel of config.containerSelectors) {
    const el = document.querySelector(sel);
    if (
      el &&
      (el.querySelector("input, textarea, select") || el.textContent?.includes("?"))
    ) {
      root = el;
      break;
    }
  }
  if (!root) return [];

  const blocks: Element[] = [];
  for (const sel of config.blockSelectors) {
    const found = Array.from(root.querySelectorAll(sel));
    if (found.length >= 1) {
      blocks.push(...found);
      break;
    }
  }

  if (blocks.length === 0) {
    root
      .querySelectorAll<HTMLElement>(
        'input[type="text"], input[type="number"], textarea, select, input[type="radio"]'
      )
      .forEach((input) => {
        const parent = input.closest("div, fieldset, li, label, section") ?? input;
        if (!blocks.includes(parent)) blocks.push(parent);
      });
  }

  const questions: ScrapedQuestion[] = [];
  const seen = new Set<string>();

  blocks.forEach((block, blockIndex) => {
    const labelEl =
      block.querySelector<HTMLElement>(
        '.question-label, [class*="question" i] label, label, .label, legend, h3, h4, p, span'
      ) ?? block;

    const questionText = (labelEl.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);

    if (!questionText || questionText.length < 3) return;
    if (seen.has(questionText)) return;
    seen.add(questionText);

    const uiOptions: string[] = [];
    block
      .querySelectorAll<HTMLElement>(
        'ul li, [role="option"], [role="radio"], label:has(input[type="radio"]), label:has(input[type="checkbox"]), option'
      )
      .forEach((el) => {
        const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text && text.length < 120) uiOptions.push(text);
      });

    block.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((radio) => {
      const val = radio.value?.trim();
      if (val && !uiOptions.includes(val)) uiOptions.push(val);
    });

    const radioCount = block.querySelectorAll('input[type="radio"]').length;
    const checkboxCount = block.querySelectorAll('input[type="checkbox"]').length;
    const hasSelect = Boolean(block.querySelector("select"));
    const hasTextInput = Boolean(
      block.querySelector(
        'input[type="text"], input[type="number"], input[type="email"], input[type="tel"], textarea'
      )
    );

    const isContactField = /^(address|city|state|postal|zip|pincode)/i.test(questionText);
    const isNumberedScreening = /^\d+\.\s/.test(questionText);

    let controlType: "text" | "radio" | "checkbox" | "select" = "text";
    if (checkboxCount > 1 || (/select all/i.test(questionText) && checkboxCount > 0)) {
      controlType = "checkbox";
    } else if (radioCount > 0) {
      controlType = "radio";
    } else if (hasSelect) {
      controlType = "select";
    }

    const treatAsChoice =
      controlType === "radio" ||
      controlType === "checkbox" ||
      (isNumberedScreening && uiOptions.length >= 2);

    const effectiveHasText =
      hasTextInput && !treatAsChoice && (isContactField || !isNumberedScreening);
    const requiredByAttr = Boolean(
      block.querySelector("[required], [aria-required='true']")
    );
    const requiredByLabel = /\*/.test(questionText) || /\b(required|mandatory)\b/i.test(questionText);
    const required = requiredByAttr || requiredByLabel;

    if (!effectiveHasText && uiOptions.length === 0) return;

    questions.push({
      questionText,
      uiOptions: [...new Set(uiOptions)],
      hasTextInput: effectiveHasText,
      blockIndex,
      controlType,
      required,
    });
  });

  return questions;
}
