/** Thrown when a question cannot be answered and human CLI is unavailable (e.g. headless). */
export class QuestionnaireUnresolvedError extends Error {
  readonly questionText: string;
  readonly reason: string;

  constructor(questionText: string, reason: string) {
    super(`Unresolved questionnaire: ${reason}`);
    this.name = "QuestionnaireUnresolvedError";
    this.questionText = questionText;
    this.reason = reason;
  }
}
