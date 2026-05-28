import type { Page } from "playwright";

import { env } from "../../config/env.js";
import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";

export async function scrollResultsPage(
  page: Page,
  logger: AutomationLogger,
  rounds = env.NAUKRI_SCROLL_ROUNDS
): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await page.mouse.wheel(0, 1400);
    await humanDelay(500, 900);
    const loadMore = page
      .getByRole("button", { name: /load more|see more jobs|show more/i })
      .first();
    if (await loadMore.isVisible({ timeout: 600 }).catch(() => false)) {
      await loadMore.click().catch(() => undefined);
      await humanDelay(700, 1100);
    }
  }
  logger.info("Finished scrolling results", { scrollRounds: rounds });
}
