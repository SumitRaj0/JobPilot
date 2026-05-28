/** Normalize employer option labels for fuzzy matching. */
export function normalizeOptionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\+\s*/g, "+")
    .replace(/\s*-\s*/g, " - ")
    .trim();
}

export function optionTextsMatch(optionLabel: string, answerPart: string): boolean {
  const opt = normalizeOptionText(optionLabel);
  const ans = normalizeOptionText(answerPart);
  if (!opt || !ans) return false;
  if (opt === ans) return true;
  if (opt.includes(ans) || ans.includes(opt)) return true;

  const optCompact = opt.replace(/\s/g, "");
  const ansCompact = ans.replace(/\s/g, "");
  if (optCompact === ansCompact) return true;
  if (optCompact.includes(ansCompact) || ansCompact.includes(optCompact)) return true;

  return false;
}

/** Pick the single best radio/dropdown option for this answer string. Returns null if no reliable match. */
export function pickBestUiOption(answer: string, uiOptions: string[]): string | null {
  if (uiOptions.length === 0) return null;

  const direct = uiOptions.find((o) => optionTextsMatch(o, answer));
  if (direct) return direct;

  let best: string | null = null;
  let bestLen = 0;
  const ansNorm = normalizeOptionText(answer);

  for (const opt of uiOptions) {
    const optNorm = normalizeOptionText(opt);
    if (ansNorm.includes(optNorm) || optNorm.includes(ansNorm)) {
      if (optNorm.length > bestLen) {
        best = opt;
        bestLen = optNorm.length;
      }
    }
  }

  return best;
}

/** Split Gemini / cache answers into parts for multi-select questions. */
export function splitMultiSelectAnswer(answer: string): string[] {
  return answer
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

export function mapPartsToUiOptions(parts: string[], uiOptions: string[]): string[] {
  const matched: string[] = [];
  for (const part of parts) {
    const hit = uiOptions.find((o) => optionTextsMatch(o, part));
    if (hit && !matched.includes(hit)) matched.push(hit);
  }
  return matched;
}
