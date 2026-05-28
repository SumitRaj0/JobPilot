import type { Page } from "playwright";

import type { Platform } from "@aiapply/shared";
import { env } from "../../config/env.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import { hasSavedSession } from "./platformSession.js";

export interface PlatformLoginConfig {
  platform: Platform;
  loginUrl: string;
  /** Page to open first with saved cookies (feed, jobs home, etc.) */
  warmUpUrl: string;
  isLoggedIn: (page: Page) => Promise<boolean>;
}

export async function dismissCommonOverlays(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Accept all")',
    'button:has-text("Accept")',
    'button:has-text("I agree")',
    'button:has-text("Got it")',
    'button[aria-label="Dismiss"]',
  ];
  for (const sel of selectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 600 }).catch(() => false)) {
      await btn.click({ force: true }).catch(() => undefined);
      await humanDelay(300, 500);
    }
  }
}

/**
 * Open warm-up URL, verify cookies, or wait for manual login in the Playwright window.
 */
export async function preparePlatformSession(
  page: Page,
  userId: string,
  logger: AutomationLogger,
  config: PlatformLoginConfig
): Promise<boolean> {
  const { platform } = config;
  const hadSaved = hasSavedSession(platform, userId);

  logger.info(`Checking ${platform} session`, { hadSavedCookies: hadSaved });

  await page.goto(config.warmUpUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await dismissCommonOverlays(page);
  await humanDelay(1500, 2500);

  if (await config.isLoggedIn(page)) {
    logger.info(`${platform} session valid`);
    return true;
  }

  logger.warn(
    `${platform} login required — sign in in the Playwright browser (${hadSaved ? "session expired" : "first-time setup"})`
  );

  await page.goto(config.loginUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await dismissCommonOverlays(page);

  const deadline = Date.now() + env.NAUKRI_LOGIN_WAIT_MS;
  let lastCheckpointWarn = 0;

  while (Date.now() < deadline) {
    if (await config.isLoggedIn(page)) {
      logger.info(`${platform} login completed`);
      await humanDelay(1000, 2000);
      return true;
    }

    const url = page.url();
    if (
      platform === "linkedin" &&
      /checkpoint|challenge/i.test(url) &&
      Date.now() - lastCheckpointWarn > 15_000
    ) {
      logger.warn(
        "LinkedIn security check — complete CAPTCHA/verification in the Playwright window"
      );
      lastCheckpointWarn = Date.now();
    }

    await humanDelay(2500, 3500);
  }

  logger.error(`${platform} login timeout — try PLAYWRIGHT_HEADLESS=false and log in manually`);
  return false;
}
