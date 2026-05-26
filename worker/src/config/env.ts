import { config } from "dotenv";
import { resolve } from "path";
import { z } from "zod";

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
  NAUKRI_SCRAPE_LIMIT: z.coerce.number().default(60),
  NAUKRI_SCROLL_ROUNDS: z.coerce.number().default(5),
  NAUKRI_FAST_APPLY: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  NAUKRI_LOGIN_WAIT_MS: z.coerce.number().default(120_000),
  PLAYWRIGHT_KEEP_OPEN: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  PLAYWRIGHT_CLOSE_DELAY_MS: z.coerce.number().default(8000),
  BACKEND_URL: z.string().default("http://localhost:3001"),
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
};
