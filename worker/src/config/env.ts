import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { estimateAutomationRunMs } from "@aiapply/shared";
import { z } from "zod";

const workerPackageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.."
);

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  WORKER_CONCURRENCY: z.coerce.number().default(1),
  PLAYWRIGHT_HEADLESS: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  SESSION_STORAGE_PATH: z.string().default("./sessions"),
  SCREENSHOT_PATH: z.string().default("./screenshots"),
  NAUKRI_RESUME_PATH: z.string().optional(),
  MAX_APPLICATIONS_PER_RUN: z.coerce.number().default(50),
  /** Max wall-clock time per automation job (matches extension ~15 min timer). */
  AUTOMATION_MAX_RUN_MS: z.coerce.number().default(estimateAutomationRunMs()),
  NAUKRI_SCRAPE_LIMIT: z.coerce.number().default(60),
  NAUKRI_SCROLL_ROUNDS: z.coerce.number().default(5),
  MAX_RECOMMENDED_SCROLLS: z.coerce.number().default(18),
  MAX_RECOMMENDED_JOBS: z.coerce.number().default(120),
  RECENT_JOB_DEDUPE_TTL_SEC: z.coerce.number().default(86_400),
  NAUKRI_FAST_APPLY: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  NAUKRI_LOGIN_WAIT_MS: z.coerce.number().default(120_000),
  /** Headed runs: seconds to wait on review page for you to solve reCAPTCHA manually. */
  INDEED_CAPTCHA_WAIT_MS: z.coerce.number().default(120_000),
  PLAYWRIGHT_KEEP_OPEN: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  PLAYWRIGHT_CLOSE_DELAY_MS: z.coerce.number().default(8000),
  BACKEND_URL: z.string().default("http://localhost:3001"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  FUZZY_MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),
  /** Strict questionnaire mode: avoid fuzzy/LLM guesses; unresolved => skip job. */
  QUESTIONNAIRE_STRICT_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  PROFILE_DATA_PATH: z.string().default("./profile_data.json"),
  DRY_RUN: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid worker env:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  sessionDir: resolve(parsed.data.SESSION_STORAGE_PATH),
  screenshotDir: resolve(parsed.data.SCREENSHOT_PATH),
  resumePath: parsed.data.NAUKRI_RESUME_PATH
    ? resolve(parsed.data.NAUKRI_RESUME_PATH)
    : undefined,
  profileDataPath: resolve(workerPackageRoot, parsed.data.PROFILE_DATA_PATH),
};
