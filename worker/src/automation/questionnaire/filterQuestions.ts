import type { ScrapedQuestion } from "./types.js";

/** Ignore resume cards, contact blocks, and other non-question UI scraped as "questions". */
export function isLikelyRecruiterQuestion(
  questionText: string,
  uiOptions: string[] = []
): boolean {
  const text = questionText.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();

  if (text.length < 5) return false;

  if (/@/.test(text) && /\d[\d\s\-+]{8,}/.test(text) && !text.includes("?")) {
    return false;
  }

  if (/\.pdf|\.docx?|resume-selection|choose a resume|select a resume|upload.*resume/i.test(lower)) {
    return false;
  }

  if (
    /^(use your indeed|indeed resume|contact information|review your application|add a cover letter)$/i.test(
      lower
    )
  ) {
    return false;
  }

  if (/\?/.test(text)) return true;

  if (
    /^(how|what|when|where|why|which|are you|do you|have you|can you|will you|is your|please enter|years of|how many|how much|enter your|list your|describe your)/i.test(
      lower
    )
  ) {
    return true;
  }

  if (uiOptions.length >= 2 && text.length < 120 && !/@/.test(text)) {
    return true;
  }

  return false;
}

export function filterScrapedQuestions(questions: ScrapedQuestion[]): ScrapedQuestion[] {
  return questions.filter((q) => isLikelyRecruiterQuestion(q.questionText, q.uiOptions));
}
