/// <reference lib="dom" />

import type { NaukriScrapedJob } from "./types.js";

export interface ScrapeInBrowserArgs {
  tupleSelector: string;
  titleSelectors: string;
  max: number;
  source: "search" | "recommended";
}

/** Executed inside the browser via page.evaluate — do not import Node APIs here. */
export function scrapeTuplesInBrowser(
  args: ScrapeInBrowserArgs
): (NaukriScrapedJob | null)[] {
  let cards = Array.from(document.querySelectorAll<HTMLElement>(args.tupleSelector)).slice(
    0,
    args.max
  );

  // Recommended feed DOM is often different; fallback from job links.
  if (cards.length === 0) {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        'a[href*="job-listings"], a[href*="job-details"], a[href*="-jobs-"]'
      )
    ).slice(0, args.max * 2);
    const seen = new Set<HTMLElement>();
    for (const a of links) {
      const card = (a.closest("[data-job-id]") ||
        a.closest("article") ||
        a.closest("section") ||
        a.closest("div")) as HTMLElement | null;
      if (!card || seen.has(card)) continue;
      seen.add(card);
      cards.push(card);
      if (cards.length >= args.max) break;
    }
  }

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
    const titleFromLink = titleLink?.textContent?.trim() ?? "";
    const titleFromHeading =
      card
        .querySelector<HTMLElement>(
          "h1, h2, h3, h4, [class*='title' i], [class*='jobTitle' i], [class*='designation' i], strong"
        )
        ?.textContent?.trim() ?? "";
    const titleFromAttr =
      card.getAttribute("data-title")?.trim() ??
      card.getAttribute("aria-label")?.trim() ??
      "";
    const title = [titleFromLink, titleFromHeading, titleFromAttr].find(
      (t) => t && t.length >= 3
    );
    if (!title) return null;

    let href = titleLink?.getAttribute("href") ?? "";
    if (href && !href.startsWith("http")) {
      href = `https://www.naukri.com${href.startsWith("/") ? href : `/${href}`}`;
    }
    if (!href) {
      const deepLink =
        card
          .querySelector<HTMLAnchorElement>(
            'a[href*="job-listings"], a[href*="job-details"], a[href*="-jobs-"]'
          )
          ?.getAttribute("href") ?? "";
      if (deepLink) {
        href = deepLink.startsWith("http")
          ? deepLink
          : `https://www.naukri.com${deepLink.startsWith("/") ? deepLink : `/${deepLink}`}`;
      }
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

    const expText =
      card
        .querySelector(
          ".exp, .exp-wrap, .experience, [class*='experience' i], [class*='exp-wrap' i]"
        )
        ?.textContent?.trim() ?? "";

    const tupleText = (card.textContent ?? "").slice(0, 2000);

    let experienceYears: number | undefined;
    const expSource = expText || tupleText;
    const expRange = expSource.match(
      /(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?|y)/i
    );
    if (expRange) {
      const min = Number.parseFloat(expRange[1]!);
      const max = Number.parseFloat(expRange[2]!);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        experienceYears = (min + max) / 2;
      }
    } else {
      const expSingle = expSource.match(
        /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?|y)/i
      );
      if (expSingle) {
        const years = Number.parseFloat(expSingle[1]!);
        if (Number.isFinite(years)) experienceYears = years;
      } else if (/fresher|entry level/i.test(expSource)) {
        experienceYears = 0;
      }
    }

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
      const buttons = Array.from(card.querySelectorAll("button, a, span, div"));
      for (const el of buttons) {
        const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
        const aria = (el.getAttribute("aria-label") ?? "").toLowerCase();
        if (
          (/^apply$/i.test(text) || /apply on naukri/i.test(`${text} ${aria}`)) &&
          !/company\s*site|external/i.test(`${text} ${tupleText}`)
        ) {
          easyApply = true;
          break;
        }
      }
    }
    if (
      !easyApply &&
      card.querySelector(
        '[class*="apply" i], [class*="ApplyButton" i], [id*="apply" i], .tuple-apply-btn'
      ) &&
      !/apply on company|company site/i.test(tupleText)
    ) {
      easyApply = true;
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

    const dataJobId = card.getAttribute("data-job-id")?.trim();
    const jobIdMatch = href.match(
      /job-listings-(\d+)|jobid[=/-](\d+)|(\d{8,})/i
    );
    const jobIdFromHref = jobIdMatch
      ? (jobIdMatch[1] ?? jobIdMatch[2] ?? jobIdMatch[3])
      : null;
    const jobId = dataJobId || jobIdFromHref;
    if (!jobId || !/^\d{6,}$/.test(jobId)) return null;

    return {
      platform: "naukri" as const,
      source: args.source,
      jobId,
      title,
      company,
      location,
      salary,
      postedAt,
      experienceYears,
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
  const scrollers = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[class*="scroll" i], [class*="feed" i], [class*="list" i], main'
    )
  );
  for (const s of scrollers) {
    const canScroll = s.scrollHeight > s.clientHeight + 50;
    if (canScroll) s.scrollBy(0, 600);
  }
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
