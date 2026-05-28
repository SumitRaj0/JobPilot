import { GoogleGenerativeAI } from "@google/generative-ai";

import { env } from "../../config/env.js";
import type { CandidateProfile, GeminiAnswerResult } from "../types/profileData.js";

export async function askGeminiFallback(
  profile: CandidateProfile,
  questionText: string,
  uiOptions: string[] = []
): Promise<GeminiAnswerResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { answer: null, confidence: 0 };
  }

  try {
    const prompt = `
You are an automated job application assistant filling out a questionnaire for a candidate.

Candidate Profile Data:
${JSON.stringify(profile, null, 2)}

Question asked on the job portal: "${questionText}"
${
  uiOptions.length > 0
    ? `Available choices to select from: ${JSON.stringify(uiOptions)}`
    : "This is an open text input field."
}

Instructions:
1. Analyze the candidate profile data against the question.
2. If multiple choice options are provided, you MUST copy the exact option text from the list — do not invent new wording.
3. For radio/dropdown (single choice): return exactly ONE option string from the list.
4. For "select all that apply" / checkboxes: return a comma-separated list of option strings, each copied exactly from the list.
5. Return ONLY a valid JSON object matching this schema exactly:
   { "answer": "The selected option string or precise text answer", "confidence": 0.95 }
4. Do not include any markdown fences, backticks, or extra words. Output raw JSON text only.
`.trim();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });
    const response = await model.generateContent(prompt);
    const raw = response.response.text();
    const cleanJson = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson) as GeminiAnswerResult;

    if (typeof parsed.answer !== "string" || typeof parsed.confidence !== "number") {
      return { answer: null, confidence: 0 };
    }

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Gemini resolver error:", message);
    return { answer: null, confidence: 0 };
  }
}
