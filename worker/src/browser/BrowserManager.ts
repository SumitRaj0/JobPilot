import { mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";

import { env } from "../config/env.js";
import type { Platform } from "@aiapply/shared";
import { AutomationLogger } from "../logging/automationLogger.js";

export class BrowserManager {
  private browser: Browser | null = null;
  private readonly logger = new AutomationLogger("BrowserManager");

  async launch(): Promise<Browser> {
    if (this.browser) return this.browser;

    this.logger.info("Launching Chromium", { headless: env.PLAYWRIGHT_HEADLESS });
    this.browser = await chromium.launch({
      headless: env.PLAYWRIGHT_HEADLESS,
      args: ["--disable-blink-features=AutomationControlled"],
    });
    return this.browser;
  }

  private sessionPath(platform: Platform, userId: string): string {
    return join(env.sessionDir, platform, userId, "storageState.json");
  }

  async getContext(platform: Platform, userId: string): Promise<BrowserContext> {
    const browser = await this.launch();
    await mkdir(join(env.sessionDir, platform, userId), { recursive: true });

    const storageStatePath = this.sessionPath(platform, userId);
    const options: Parameters<Browser["newContext"]>[0] = {
      viewport: { width: 1366, height: 768 },
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
    };

    if (existsSync(storageStatePath)) {
      this.logger.info("Restoring session", { storageStatePath });
      options.storageState = storageStatePath;
    }

    return browser.newContext(options);
  }

  async newPage(platform: Platform, userId: string): Promise<Page> {
    const context = await this.getContext(platform, userId);
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(45_000);
    return page;
  }

  async persistSession(
    page: Page,
    platform: Platform,
    userId: string
  ): Promise<void> {
    const path = this.sessionPath(platform, userId);
    await mkdir(join(env.sessionDir, platform, userId), { recursive: true });
    await page.context().storageState({ path });
    this.logger.info("Session saved", { path });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.info("Browser closed");
    }
  }
}

export const browserManager = new BrowserManager();
