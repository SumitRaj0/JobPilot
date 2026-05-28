import { existsSync, readFileSync, writeFileSync } from "fs";
import readlineSync from "readline-sync";

import { env } from "../config/env.js";
import { findBestFuzzyMapping } from "./fuzzyMatch.js";
import { QuestionnaireUnresolvedError } from "./QuestionnaireUnresolvedError.js";
import type { ProfileDataFile } from "./types/profileData.js";
import { askGeminiFallback } from "./utils/geminiClient.js";

const CONFIDENCE_THRESHOLD = 0.85;

export type AnswerSource = "local" | "local_fuzzy" | "gemini" | "human";

export interface ResolvedAnswer {
  answer: string;
  source: AnswerSource;
}

/** Interactive CLI only when browser is visible and stdin is a real terminal. */
export function canPromptHuman(): boolean {
  return !env.PLAYWRIGHT_HEADLESS && Boolean(process.stdin.isTTY);
}

export class QuestionResolver {
  private readonly dbPath: string;
  private data: ProfileDataFile;

  constructor(profilePath: string) {
    this.dbPath = profilePath;
    if (!existsSync(profilePath)) {
      throw new Error(`Profile data not found: ${profilePath}`);
    }
    this.data = JSON.parse(readFileSync(profilePath, "utf8")) as ProfileDataFile;
  }

  getProfile(): ProfileDataFile["profile"] {
    return this.data.profile;
  }

  /** Layer 1a: all keywords must appear in question (substring). */
  tryKeywordMatch(questionText: string): string | null {
    const cleanText = questionText.toLowerCase();

    for (const mapping of this.data.intent_mappings) {
      const isMatch = mapping.keywords.every((keyword) =>
        cleanText.includes(keyword.toLowerCase())
      );
      if (isMatch) {
        return mapping.value;
      }
    }
    return null;
  }

  /** Layer 1b: string-similarity + partial keyword overlap (see FUZZY_MATCH_THRESHOLD). */
  tryFuzzyMatch(questionText: string): string | null {
    const best = findBestFuzzyMapping(
      questionText,
      this.data.intent_mappings,
      env.FUZZY_MATCH_THRESHOLD
    );
    return best?.value ?? null;
  }

  /** Layer 3: synchronous terminal prompt for human review */
  askHumanCLI(questionText: string, uiOptions: string[] = []): string {
    console.log("\n[AUTOMATION PAUSED - HUMAN INPUT NEEDED]");
    console.log(`Question: "${questionText}"`);

    if (uiOptions.length > 0) {
      console.log("Options:");
      uiOptions.forEach((opt, idx) => console.log(`  [${idx + 1}] ${opt}`));
      const index = readlineSync.questionInt("Select option number: ") - 1;
      return uiOptions[index] ?? uiOptions[0] ?? "";
    }

    return readlineSync.question("Type the text answer to enter: ");
  }

  /** Avoid caching Gemini mistakes (e.g. entire resume/contact block as one "answer"). */
  shouldCacheMapping(questionText: string, answer: string): boolean {
    const q = questionText.trim();
    const a = answer.trim();
    if (a.length > 100 && !q.includes("?")) return false;
    if (/@/.test(a) && /@/.test(q) && !q.includes("?")) return false;
    if (q.length > 180 && !q.includes("?")) return false;
    return q.length >= 8 && a.length >= 1;
  }

  saveNewMappingToLocalDB(
    intentName: string,
    newKeywords: string[],
    calculatedValue: string
  ): void {
    this.data.intent_mappings.push({
      intent: intentName,
      keywords: newKeywords,
      value: calculatedValue,
      expected_ui_options: [],
    });
    writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), "utf8");
    console.log("Cached new answer variation to profile_data.json");
  }

  /** Local match → Gemini → CLI (CLI skipped in headless / non-TTY). */
  async resolveQuestion(
    questionText: string,
    uiOptions: string[] = []
  ): Promise<ResolvedAnswer> {
    const keyword = this.tryKeywordMatch(questionText);
    if (keyword) {
      console.log(`Local keyword match: "${keyword}"`);
      return { answer: keyword, source: "local" };
    }

    if (!env.QUESTIONNAIRE_STRICT_MODE) {
      const fuzzy = this.tryFuzzyMatch(questionText);
      if (fuzzy) {
        console.log(`Local fuzzy match: "${fuzzy}"`);
        return { answer: fuzzy, source: "local_fuzzy" };
      }
    }

    if (!env.QUESTIONNAIRE_STRICT_MODE && process.env.GEMINI_API_KEY) {
      console.log("Querying Gemini (free tier)...");
      const aiResult = await askGeminiFallback(
        this.data.profile,
        questionText,
        uiOptions
      );
      if (aiResult.answer && aiResult.confidence > CONFIDENCE_THRESHOLD) {
        console.log(`LLM match (confidence ${aiResult.confidence}): "${aiResult.answer}"`);
        if (this.shouldCacheMapping(questionText, aiResult.answer)) {
          this.saveNewMappingToLocalDB(
            `dynamic_intent_${Date.now()}`,
            [questionText.toLowerCase().slice(0, 15)],
            aiResult.answer
          );
        }
        return { answer: aiResult.answer, source: "gemini" };
      }
    }

    if (!canPromptHuman()) {
      const reason = env.PLAYWRIGHT_HEADLESS
        ? "headless_run_no_cli"
        : "no_tty_for_cli";
      throw new QuestionnaireUnresolvedError(questionText, reason);
    }

    const humanAnswer = this.askHumanCLI(questionText, uiOptions);
    if (this.shouldCacheMapping(questionText, humanAnswer)) {
      this.saveNewMappingToLocalDB(
        `human_intent_${Date.now()}`,
        [questionText.toLowerCase()],
        humanAnswer
      );
    }
    return { answer: humanAnswer, source: "human" };
  }
}
