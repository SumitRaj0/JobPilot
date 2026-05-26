import type { Platform } from "@aiapply/shared";

import { getPlatformAdapter } from "../adapters/index.js";
import { browserManager } from "../browser/BrowserManager.js";
import { env } from "../config/env.js";
import { AutomationLogger } from "../logging/automationLogger.js";

export interface AutomationJobPayload {
  userId: string;
  platform: Platform;
  filters: import("@aiapply/shared").JobFilters;
  pageMetadata?: import("@aiapply/shared").ExtensionPageMetadata;
  enqueuedAt: string;
}

export async function runAutomation(
  jobId: string,
  data: AutomationJobPayload
) {
  const logger = new AutomationLogger("run", data.platform, jobId);
  logger.info("Job started", {
    user: data.userId,
    role: data.filters.role,
    enqueuedAt: data.enqueuedAt,
  });

  const adapter = getPlatformAdapter(data.platform);
  const page = await browserManager.newPage(data.platform, data.userId);

  try {
    const result = await adapter.run(page, data.filters, logger, {
      userId: data.userId,
      jobId,
    });
    await browserManager.persistSession(page, data.platform, data.userId);
    logger.info("Job finished", result);
    return result;
  } catch (err) {
    logger.error("Job crashed", err);
    throw err;
  } finally {
    if (!page.isClosed() && env.PLAYWRIGHT_KEEP_OPEN && !env.PLAYWRIGHT_HEADLESS) {
      logger.info(
        `Keeping browser open ${env.PLAYWRIGHT_CLOSE_DELAY_MS}ms — do not close the window early`
      );
      await new Promise((r) => setTimeout(r, env.PLAYWRIGHT_CLOSE_DELAY_MS));
    }
    if (!page.isClosed()) {
      await page.context().close();
    }
  }
}
