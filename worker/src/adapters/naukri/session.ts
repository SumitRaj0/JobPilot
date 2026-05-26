import { existsSync } from "fs";
import { join } from "path";
import type { Page } from "playwright";

import { env } from "../../config/env.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import { NaukriSelectors } from "./selectors.js";

export function hasSavedSession(userId: string): boolean {
  const path = join(env.sessionDir, "naukri", userId, "storageState.json");
  return existsSync(path);
}

/**
 * Go straight to search when cookies exist — avoids homepage login redirect.
 */
export async function ensureSessionForSearch(
  page: Page,
  userId: string,
  logger: AutomationLogger
): Promise<boolean> {
  if (hasSavedSession(userId)) {
    logger.info("Saved session found — will open search directly");
    return true;
  }

  return waitForManualLogin(page, logger);
}

export async function verifyLoggedInOnSearchPage(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  const url = page.url();

  if (url.includes("/login") || url.includes("nlogin")) {
    logger.warn("Redirected to login page during search");
    return false;
  }

  const jobList = page.locator(".srp-jobtuple-wrapper").first();
  if (await jobList.isVisible({ timeout: 10_000 }).catch(() => false)) {
    logger.info("Job results visible — session OK");
    return true;
  }

  const loginLink = page.locator(NaukriSelectors.login.loginLink).first();
  if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    logger.warn("Login link visible on search page");
    return false;
  }

  logger.info("Assuming logged in (no login gate detected)");
  return true;
}

export async function waitForManualLogin(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  logger.warn(
    "Login required — complete login in the browser window (one time only)"
  );
  await page.goto("https://www.naukri.com/nlogin/login", {
    waitUntil: "domcontentloaded",
  });

  try {
    await page.waitForURL(
      (u) => !u.pathname.includes("login") && !u.pathname.includes("nlogin"),
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
