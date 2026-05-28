/// <reference lib="dom" />

export interface LinkedInTupleRaw {
  tupleIndex: number;
  jobId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  easyApply: boolean;
  alreadyApplied: boolean;
}

/** Runs inside page.evaluate — selectors must be inlined (no module constants). */
export function scrapeLinkedInTuplesInBrowser(): LinkedInTupleRaw[] {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>(
      "li.jobs-search-results__list-item, li.scaffold-layout__list-item, div.job-card-container"
    )
  );
  const results: LinkedInTupleRaw[] = [];

  cards.forEach((card, tupleIndex) => {
    const titleEl =
      card.querySelector<HTMLElement>(".job-card-list__title") ??
      card.querySelector<HTMLAnchorElement>("a.job-card-container__link") ??
      card.querySelector<HTMLAnchorElement>("h3 a") ??
      card.querySelector<HTMLAnchorElement>("a[href*='/jobs/view/']");

    const title = (titleEl?.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!title) return;

    const company =
      (
        card.querySelector(".job-card-container__company-name") ??
        card.querySelector(".artdeco-entity-lockup__subtitle")
      )?.textContent?.replace(/\s+/g, " ").trim() ?? "";

    const location =
      card.querySelector(".job-card-container__metadata-item")?.textContent?.trim() ??
      "";

    const href =
      titleEl instanceof HTMLAnchorElement
        ? titleEl.href
        : card.querySelector<HTMLAnchorElement>("a[href*='/jobs/view/']")?.href ?? "";

    const cardText = (card.textContent ?? "").toLowerCase();
    const easyApply =
      /easy\s*apply/i.test(cardText) ||
      Boolean(card.querySelector('button[aria-label*="Easy Apply" i], button.jobs-apply-button'));
    const alreadyApplied =
      /applied\s+\d|application\s+submitted|you\s+applied/i.test(cardText);

    const jobId =
      card.getAttribute("data-job-id") ??
      href.match(/jobs\/view\/(\d+)/)?.[1] ??
      `linkedin-${tupleIndex}`;

    results.push({
      tupleIndex,
      jobId,
      title,
      company,
      location,
      url: href,
      easyApply,
      alreadyApplied,
    });
  });

  return results;
}
