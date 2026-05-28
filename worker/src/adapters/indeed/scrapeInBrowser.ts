/// <reference lib="dom" />

export interface IndeedTupleRaw {
  tupleIndex: number;
  jobId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  easyApply: boolean;
  alreadyApplied: boolean;
}

export function scrapeIndeedTuplesInBrowser(): IndeedTupleRaw[] {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".job_seen_beacon, div.jobsearch-ResultsList > div, div.cardOutline"
    )
  );
  const results: IndeedTupleRaw[] = [];

  cards.forEach((card, tupleIndex) => {
    const titleEl =
      card.querySelector<HTMLAnchorElement>("h2.jobTitle a") ??
      card.querySelector<HTMLAnchorElement>("a.jcs-JobTitle") ??
      card.querySelector<HTMLAnchorElement>("h2 a");

    const title = (titleEl?.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!title) return;

    const company =
      (
        card.querySelector('[data-testid="company-name"]') ??
        card.querySelector(".companyName")
      )?.textContent?.replace(/\s+/g, " ").trim() ?? "";

    const location =
      card.querySelector('[data-testid="text-location"]')?.textContent?.trim() ?? "";

    const href = titleEl?.href ?? "";
    const cardText = (card.textContent ?? "").toLowerCase();
    const easyApply =
      /easily apply|indeed apply|apply now/i.test(cardText) ||
      Boolean(
        card.querySelector(
          '#indeedApplyButton, button.indeed-apply-button, button[aria-label*="Apply" i]'
        )
      );
    const alreadyApplied = /applied/i.test(cardText) && /you|already/i.test(cardText);

    const jobId =
      card.getAttribute("data-jk") ??
      href.match(/jk=([a-f0-9]+)/)?.[1] ??
      `indeed-${tupleIndex}`;

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
