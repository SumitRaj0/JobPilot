import { sleep } from "./delay.js";

export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  backoff?: number;
  label?: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 1000;
  const backoff = options.backoff ?? 1.5;
  const label = options.label ?? "operation";

  let lastError: unknown;

  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === attempts) break;
      const wait = Math.round(delayMs * Math.pow(backoff, i - 1));
      await sleep(wait);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${label} failed after ${attempts} attempts`);
}
