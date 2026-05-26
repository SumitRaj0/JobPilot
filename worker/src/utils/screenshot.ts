import { mkdir } from "fs/promises";
import { join } from "path";
import type { Page } from "playwright";

import { env } from "../config/env.js";

export async function captureScreenshot(
  page: Page,
  label: string,
  platform: string,
  jobId?: string
): Promise<string> {
  await mkdir(env.screenshotDir, { recursive: true });

  const safeLabel = label.replace(/[^a-z0-9-_]/gi, "_").slice(0, 40);
  const filename = `${platform}-${jobId ?? "run"}-${Date.now()}-${safeLabel}.png`;
  const filepath = join(env.screenshotDir, filename);

  await page.screenshot({ path: filepath, fullPage: false });
  return filepath;
}
