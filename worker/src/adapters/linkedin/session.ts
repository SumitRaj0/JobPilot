import type { Page } from "playwright";

import type { AutomationLogger } from "../../logging/automationLogger.js";
import {
  preparePlatformSession,
  type PlatformLoginConfig,
} from "../shared/platformLogin.js";
import { LinkedInSelectors } from "./selectors.js";

const LINKEDIN_LOGIN_CONFIG: PlatformLoginConfig = {
  platform: "linkedin",
  loginUrl: "https://www.linkedin.com/login",
  warmUpUrl: "https://www.linkedin.com/jobs/",
  isLoggedIn: isLinkedInLoggedIn,
};

export async function isLinkedInLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  if (/\/login|checkpoint|uas\/login|signup|authwall/i.test(url)) {
    return false;
  }

  const signIn = page
    .locator(
      'a[href*="/login"], button:has-text("Sign in"), a:has-text("Sign in")'
    )
    .first();
  if (await signIn.isVisible({ timeout: 2000 }).catch(() => false)) {
    return false;
  }

  const profile = page.locator(LinkedInSelectors.login.profileHint).first();
  if (await profile.isVisible({ timeout: 4000 }).catch(() => false)) {
    return true;
  }

  const jobs = page.locator(LinkedInSelectors.search.jobCard).first();
  if (await jobs.isVisible({ timeout: 4000 }).catch(() => false)) {
    return true;
  }

  const navMe = page
    .locator('.global-nav__me, [data-control-name="nav.settings"]')
    .first();
  if (await navMe.isVisible({ timeout: 2000 }).catch(() => false)) {
    return true;
  }

  return false;
}

export async function ensureLinkedInSession(
  page: Page,
  userId: string,
  logger: AutomationLogger
): Promise<boolean> {
  return preparePlatformSession(page, userId, logger, LINKEDIN_LOGIN_CONFIG);
}

/** @deprecated Use isLinkedInLoggedIn after navigation */
export async function verifyLoggedInOnLinkedIn(
  page: Page,
  logger: AutomationLogger
): Promise<boolean> {
  const ok = await isLinkedInLoggedIn(page);
  if (ok) logger.info("LinkedIn logged in");
  else logger.warn("LinkedIn not logged in");
  return ok;
}
