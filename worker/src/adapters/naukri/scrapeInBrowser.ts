/// <reference lib="dom" />

import type { NaukriScrapedJob } from "./types.js";

export interface ScrapeInBrowserArgs {
  tupleSelector: string;
  titleSelectors: string;
  max: number;
}

/** Executed inside the browser via page.evaluate — do not import Node APIs here. */
export function scrapeTuplesInBrowser(
  args: ScrapeInBrowserArgs
): (NaukriScrapedJob | null)[] {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>(args.tupleSelector)
  ).slice(0, args.max);

  return cards.map((card, index) => {
    const titleLink =
      card.querySelector<HTMLAnchorElement>(args.titleSelectors) ??
      Array.from(card.querySelectorAll<HTMLAnchorElement>("a")).find((a) => {
        const href = a.getAttribute("href") ?? "";
        const text = (a.textContent ?? "").trim();
        return (
          text.length >= 3 &&
          (/job-listings|job-details|\/job\//i.test(href) ||
            a.classList.contains("title"))
        );
      });

    if (!titleLink) return null;

    const title = titleLink.textContent?.trim();
    if (!title || title.length < 3) return null;

    let href = titleLink.getAttribute("href") ?? "";
    if (href && !href.startsWith("http")) {
      href = `https://www.naukri.com${href.startsWith("/") ? href : `/${href}`}`;
    }

    const company =
      card
        .querySelector(
          "a.comp-name, .comp-name, .comp-dtls-wrap a, [class*='comp'] a"
        )
        ?.textContent?.trim() || "Unknown";

    const location =
      card
        .querySelector(".loc-wrap .loc, .locWdth, .location, [class*='loc']")
        ?.textContent?.trim() || undefined;

    const salary =
      card
        .querySelector(".sal-wrap span, .salary, .sal, [class*='sal']")
        ?.textContent?.trim() || undefined;

    const postedAt =
      card
        .querySelector(".job-post-day, .type, span.fleft.grey-text")
        ?.textContent?.trim() || undefined;

    const tupleText = (card.textContent ?? "").slice(0, 2000);

    let easyApply = /easy\s*apply/i.test(tupleText);
    if (
      !easyApply &&
      card.querySelector(
        '.easy-apply, .ico.easy-apply, [class*="easyApply"], [class*="easy-apply"], [class*="EasyApply"]'
      )
    ) {
      easyApply = true;
    }
    if (!easyApply) {
      const imgs = Array.from(card.querySelectorAll("img[alt], img[title]"));
      for (const img of imgs) {
        const label = `${img.getAttribute("alt") ?? ""} ${img.getAttribute("title") ?? ""}`;
        if (/easy\s*apply/i.test(label)) {
          easyApply = true;
          break;
        }
      }
    }
    if (!easyApply) {
      const buttons = Array.from(card.querySelectorAll("button, a, span"));
      for (const el of buttons) {
        const text = (el.textContent ?? "").trim();
        if (/^apply$/i.test(text) && !/company\s*site/i.test(tupleText)) {
          easyApply = true;
          break;
        }
      }
    }

    const externalApply =
      /apply on company/i.test(tupleText) ||
      !!card.querySelector('[class*="company-site" i]');

    let alreadyApplied = false;
    if (
      /already\s+applied|you\s+applied|application\s+sent|application\s+submitted|applied\s+on/i.test(
        tupleText
      )
    ) {
      alreadyApplied = true;
    }
    if (!alreadyApplied) {
      const controls = Array.from(card.querySelectorAll("button, a, span"));
      for (const el of controls) {
        const t = (el.textContent ?? "").trim().toLowerCase();
        if (t === "applied" || t === "already applied") {
          alreadyApplied = true;
          break;
        }
      }
    }

    const jobIdMatch = href.match(
      /job-listings-(\d+)|jobid[=/-](\d+)|(\d{8,})/i
    );
    const jobId = jobIdMatch
      ? (jobIdMatch[1] ?? jobIdMatch[2] ?? jobIdMatch[3])
      : `naukri-${index}`;

    return {
      platform: "naukri" as const,
      jobId,
      title,
      company,
      location,
      salary,
      postedAt,
      easyApply,
      externalApply,
      alreadyApplied,
      url: href || window.location.href,
      tupleIndex: index,
    };
  });
}

export function scrollPageDown() {
  window.scrollBy(0, 600);
}

export function sampleFirstTupleLinks(selector: string) {
  const card = document.querySelector(selector);
  if (!card) return null;
  const links = Array.from(card.querySelectorAll("a"))
    .slice(0, 5)
    .map((a) => ({
      text: (a.textContent ?? "").trim().slice(0, 60),
      href: a.getAttribute("href"),
      className: a.className,
    }));
  return { linkCount: card.querySelectorAll("a").length, links };
}
