import { compareTwoStrings } from "string-similarity";

import type { IntentMapping } from "./types/profileData.js";

/** Fraction of keywords that must match (fuzzy or substring) for overlap scoring. */
function requiredKeywordHits(keywordCount: number): number {
  if (keywordCount <= 1) return 1;
  if (keywordCount === 2) return 2;
  return Math.max(2, Math.ceil(keywordCount * 0.5));
}

function keywordMatchesText(text: string, keyword: string, perKeywordMin: number): boolean {
  const k = keyword.toLowerCase().trim();
  if (!k) return false;
  if (text.includes(k)) return true;
  return compareTwoStrings(text, k) >= perKeywordMin;
}

/**
 * Score based on how many mapping keywords appear in the question (substring or fuzzy).
 * Returns 0–1; requires at least half of keywords (min 2 when list is long).
 */
export function keywordOverlapScore(
  questionText: string,
  keywords: string[],
  perKeywordMin = 0.72
): number {
  if (keywords.length === 0) return 0;

  const text = questionText.toLowerCase();
  let hits = 0;
  for (const keyword of keywords) {
    if (keywordMatchesText(text, keyword, perKeywordMin)) hits++;
  }

  const required = requiredKeywordHits(keywords.length);
  if (hits < required) return 0;
  return hits / keywords.length;
}

export interface FuzzyMatchResult {
  value: string;
  rating: number;
  intent: string;
}

/** Best intent_mapping for question text using string similarity + keyword overlap. */
export function findBestFuzzyMapping(
  questionText: string,
  mappings: IntentMapping[],
  threshold: number
): FuzzyMatchResult | null {
  const cleanText = questionText.toLowerCase().trim();
  if (!cleanText) return null;

  let best: FuzzyMatchResult | null = null;

  for (const mapping of mappings) {
    const phrase = mapping.keywords.join(" ").toLowerCase();
    const intentLabel = mapping.intent.replace(/_/g, " ").toLowerCase();

    const overlap = keywordOverlapScore(cleanText, mapping.keywords);
    const phraseSim = phrase ? compareTwoStrings(cleanText, phrase) : 0;
    const intentSim = intentLabel ? compareTwoStrings(cleanText, intentLabel) : 0;

    const rating = Math.max(overlap, phraseSim, intentSim);

    if (rating >= threshold && (!best || rating > best.rating)) {
      best = { value: mapping.value, rating, intent: mapping.intent };
    }
  }

  return best;
}
