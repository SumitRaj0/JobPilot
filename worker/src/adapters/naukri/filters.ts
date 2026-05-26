import type { JobFilters } from "@aiapply/shared";
import type { Page } from "playwright";

import type { AutomationLogger } from "../../logging/automationLogger.js";
import { humanDelay } from "../../utils/delay.js";
import { withRetry } from "../../utils/retry.js";
import { roleToSlug } from "./roleMatch.js";
import { NaukriSelectors } from "./selectors.js";

const DATE_LABELS: Record<string, string[]> = {
  "1": ["24 hours", "1 day", "Today"],
  "3": ["3 days", "3 day"],
  "7": ["7 days", "1 week", "Week"],
  "30": ["30 days", "Month"],
};

export function buildSearchUrl(filters: JobFilters): string {
  const keyword = filters.role.trim();
  const slug = roleToSlug(keyword);
  const params = new URLSearchParams();
  params.set("k", keyword);

  if (filters.remote) {
    params.set("remoteFilter", "1");
    params.set("wfhType", "2");
  }
  if (filters.experience?.trim()) {
    params.set("experience", filters.experience.trim());
  }
  if (filters.datePosted) {
    params.set("jobAge", mapDatePosted(filters.datePosted));
  }

  return `https://www.naukri.com/${slug}-jobs?${params.toString()}`;
}

function mapDatePosted(value: string): string {
  const map: Record<string, string> = {
    "1": "1",
    "3": "3",
    "7": "7",
    "30": "30",
  };
  return map[value] ?? value;
}

function keywordAlreadySet(pageUrl: string, keyword: string): boolean {
  try {
    const k = new URL(pageUrl).searchParams.get("k");
    if (!k) return false;
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    return norm(decodeURIComponent(k.replace(/\+/g, " "))) === norm(keyword);
  } catch {
    return false;
  }
}

/** Best-effort keyword in header search — never throws (URL already has k=). */
async function applyKeywordInSearchBar(
  page: Page,
  keyword: string,
  logger: AutomationLogger
): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  try {
    if (keywordAlreadySet(page.url(), trimmed)) {
      logger.info("Keyword already in URL — skip search bar", { keyword: trimmed });
      return;
    }

    const input = page
      .locator(
        'input.suggestor-input, input[placeholder*="designation" i], input[placeholder*="keyword" i]'
      )
      .first();

    if (!(await input.isVisible({ timeout: 2000 }).catch(() => false))) {
      logger.info("Search input not found — using URL keyword only");
      return;
    }

    const current = (await input.inputValue().catch(() => "")).toLowerCase();
    const needle = trimmed.toLowerCase().slice(0, Math.min(12, trimmed.length));
    if (needle.length > 3 && current.includes(needle)) {
      logger.info("Keyword already in search input — skip", { current: current.slice(0, 40) });
      return;
    }

    await page.keyboard.press("Escape").catch(() => undefined);

    await input.fill(trimmed, { force: true, timeout: 8000 }).catch(async () => {
      await page.evaluate((kw) => {
        const el = document.querySelector<HTMLInputElement>(
          "input.suggestor-input, input[placeholder*='designation' i]"
        );
        if (!el) return;
        el.focus();
        el.value = kw;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, trimmed);
    });

    await humanDelay(300, 500);
    await page.keyboard.press("Enter").catch(() => undefined);
    await page
      .locator(".nI-gNb-sb__icon-wrapper, button[type='submit']")
      .first()
      .click({ force: true, timeout: 3000 })
      .catch(() => undefined);

    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await humanDelay(800, 1200);
    logger.info("Keyword applied via search bar", { keyword: trimmed });
  } catch (err) {
    logger.warn("Search bar step skipped — continuing with URL filters", {
      keyword: trimmed,
      err: err instanceof Error ? err.message : err,
    });
  }
}

export async function applyFiltersOnPage(
  page: Page,
  filters: JobFilters,
  logger: AutomationLogger
): Promise<void> {
  await humanDelay(400, 800);

  await applyKeywordInSearchBar(page, filters.role.trim(), logger).catch(() => undefined);

  if (filters.remote) {
    await tryClickFilter(page, NaukriSelectors.filters.remoteCheckbox, "remote");
  }

  if (filters.easyApplyOnly) {
    await tryClickFilter(
      page,
      NaukriSelectors.filters.easyApplyFilter,
      "easy apply filter"
    );
  }

  if (filters.experience?.trim()) {
    await tryClickExperience(page, filters.experience, logger);
  }

  if (filters.datePosted) {
    await tryClickDatePosted(page, filters.datePosted, logger);
  }

  if (filters.salary?.trim()) {
    logger.info("Salary filter noted (UI varies)", { salary: filters.salary });
  }

  await humanDelay(500, 1000);
  logger.info("Filters pass complete", { url: page.url() });
}

async function tryClickFilter(
  page: Page,
  selector: string,
  label: string
): Promise<void> {
  const loc = page.locator(selector).first();
  if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
    await loc.click({ timeout: 5000 }).catch(() => undefined);
    await humanDelay(300, 600);
  }
}

async function tryClickExperience(
  page: Page,
  experience: string,
  logger: AutomationLogger
): Promise<void> {
  const chip = page
    .locator(NaukriSelectors.filters.experienceChip)
    .filter({ hasText: new RegExp(experience.replace(/\s/g, ""), "i") })
    .first();

  if (await chip.isVisible({ timeout: 2000 }).catch(() => false)) {
    await chip.click();
    await humanDelay(300, 700);
    logger.info("Experience filter clicked", { experience });
  }
}

async function tryClickDatePosted(
  page: Page,
  datePosted: string,
  logger: AutomationLogger
): Promise<void> {
  const labels = DATE_LABELS[datePosted] ?? [];
  for (const label of labels) {
    const opt = page.getByText(label, { exact: false }).first();
    if (await opt.isVisible({ timeout: 1500 }).catch(() => false)) {
      await opt.click();
      await humanDelay(300, 700);
      logger.info("Date filter clicked", { label });
      return;
    }
  }
}

export async function navigateToSearch(
  page: Page,
  filters: JobFilters,
  logger: AutomationLogger
): Promise<void> {
  const url = buildSearchUrl(filters);
  logger.info("Search URL built", { url, role: filters.role.trim() });

  await withRetry(
    async () => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
      await humanDelay(800, 1500);
    },
    { label: "naukri-search-nav", attempts: 3 }
  );
  logger.info("Search results loaded", { url: page.url() });

  await applyFiltersOnPage(page, filters, logger);
}
