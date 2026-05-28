import type { Page } from "playwright";

import type { AutomationLogger } from "../../logging/automationLogger.js";
import {
  preparePlatformSession,
  type PlatformLoginConfig,
} from "../shared/platformLogin.js";
import { IndeedSelectors } from "./selectors.js";

const INDEED_LOGIN_CONFIG: PlatformLoginConfig = {
  platform: "indeed",
  loginUrl: "https://secure.indeed.com/auth",
  warmUpUrl: "https://www.indeed.com",
  isLoggedIn: isIndeedLoggedIn,
};

/** Resolve regional Indeed host (e.g. in.indeed.com for India). */
export async function resolveIndeedOrigin(page: Page): Promise<string> {
  await page.goto("https://www.indeed.com", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  try {
    const host = new URL(page.url()).hostname;
    if (/indeed\./i.test(host)) {
      return `https://${host}`;
    }
  } catch {
    // fall through
  }
  return "https://www.indeed.com";
}

export async function isIndeedLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  if (/secure\.indeed|\/auth\b|account\/login/i.test(url)) {
    return false;
  }

  const account = page.locator(IndeedSelectors.login.account).first();
  if (await account.isVisible({ timeout: 3000 }).catch(() => false)) {
    return true;
  }

  const signIn = page
    .getByRole("link", { name: /sign in/i })
    .or(page.locator(IndeedSelectors.login.signIn))
    .first();
  if (await signIn.isVisible({ timeout: 2000 }).catch(() => false)) {
    return false;
  }

  const jobs = page
    .locator(
      ".job_seen_beacon, #mosaic-provider-jobcards a, div.jobsearch-ResultsList"
    )
    .first();
  if (await jobs.isVisible({ timeout: 5000 }).catch(() => false)) {
    return true;
  }

  return false;
}

export async function ensureIndeedSession(
  page: Page,
  userId: string,
  logger: AutomationLogger
): Promise<boolean> {
  return preparePlatformSession(page, userId, logger, INDEED_LOGIN_CONFIG);
}

export async function verifyLoggedInOnIndeed(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  const ok = await isIndeedLoggedIn(page);
  if (ok) logger.info("Indeed logged in");
  else logger.warn("Indeed not logged in");
  return ok;
}
