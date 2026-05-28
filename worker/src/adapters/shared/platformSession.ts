import { existsSync } from "fs";
import { join } from "path";
import type { Page } from "playwright";

import type { Platform } from "@aiapply/shared";
import { env } from "../../config/env.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";

export function hasSavedSession(platform: Platform, userId: string): boolean {
  const path = join(env.sessionDir, platform, userId, "storageState.json");
  return existsSync(path);
}

export async function waitForManualLogin(
  page: Page,
  loginUrl: string,
  logger: AutomationLogger
): Promise<boolean> {
  logger.warn("Login required — complete login in the browser window (one time only)");
  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });

  try {
    await page.waitForFunction(
      () => !/login|signin|auth/i.test(window.location.pathname),
      { timeout: env.NAUKRI_LOGIN_WAIT_MS }
    );
    logger.info("Login completed");
    await humanDelay(1000, 2000);
    return true;
  } catch {
    logger.error("Login timeout");
    return false;
  }
}

export async function ensureSession(
  page: Page,
  platform: Platform,
  userId: string,
  logger: AutomationLogger,
  options: { loginUrl: string }
): Promise<boolean> {
  if (hasSavedSession(platform, userId)) {
    logger.info("Saved session found", { platform });
    return true;
  }
  return waitForManualLogin(page, options.loginUrl, logger);
}
