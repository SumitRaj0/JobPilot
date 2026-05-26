/// <reference lib="dom" />

export interface TupleLocatorArgs {
  tupleIndex: number;
  tupleSelector: string;
  jobId?: string;
}

export type CardApplyState = "can_apply" | "already_applied" | "no_apply_button";

function resolveJobTupleCard(args: TupleLocatorArgs): HTMLElement | null {
  if (args.jobId) {
    const byId = document.querySelector<HTMLElement>(
      `${args.tupleSelector}[data-job-id="${args.jobId}"]`
    );
    if (byId) return byId;
  }
  return (
    document.querySelectorAll<HTMLElement>(args.tupleSelector)[args.tupleIndex] ??
    null
  );
}

function textLooksAlreadyApplied(text: string): boolean {
  return (
    /already\s+applied/i.test(text) ||
    /you\s+(have\s+)?applied/i.test(text) ||
    /application\s+(sent|submitted)/i.test(text) ||
    /applied\s+on/i.test(text) ||
    /applied\s+successfully/i.test(text)
  );
}

function elementLooksAlreadyApplied(el: HTMLElement): boolean {
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  const aria = (el.getAttribute("aria-label") ?? "").toLowerCase();
  const label = `${text} ${aria}`;
  return (
    text === "applied" ||
    text === "already applied" ||
    /already\s+applied/.test(label) ||
    /applied\s+on\s+naukri/.test(label)
  );
}

function cardHasApplyAction(card: HTMLElement): boolean {
  const candidates = Array.from(
    card.querySelectorAll<HTMLElement>(
      "button, a, div[role='button'], span[role='button'], [class*='apply' i]"
    )
  );
  for (const el of candidates) {
    if (elementLooksAlreadyApplied(el)) continue;
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    const aria = (el.getAttribute("aria-label") ?? "").toLowerCase();
    const label = `${text} ${aria}`;
    if (!label.includes("apply")) continue;
    if (label.includes("company") || label.includes("external")) continue;
    if (label.includes("login to apply")) continue;
    return true;
  }
  return false;
}

/** Runs inside page.evaluate — must be self-contained. */
export function detectCardApplyState(args: TupleLocatorArgs): CardApplyState {
  const card = resolveJobTupleCard(args);
  if (!card) return "no_apply_button";

  const tupleText = (card.textContent ?? "").slice(0, 2500);
  if (textLooksAlreadyApplied(tupleText)) return "already_applied";

  const controls = Array.from(
    card.querySelectorAll<HTMLElement>("button, a, span")
  );
  for (const el of controls) {
    if (elementLooksAlreadyApplied(el)) return "already_applied";
  }

  if (cardHasApplyAction(card)) return "can_apply";
  return "no_apply_button";
}

/** Full job page or detail panel — runs in page.evaluate. */
export function detectPageApplyState(): CardApplyState {
  const roots = [
    document.querySelector('[class*="styles_JDC" i]'),
    document.querySelector('[class*="job-details" i]'),
    document.querySelector('[class*="JobDetails" i]'),
    document.querySelector("main"),
    document.body,
  ].filter(Boolean) as HTMLElement[];

  let bodyText = "";
  for (const root of roots) {
    bodyText += (root.textContent ?? "").slice(0, 4000);
  }
  if (textLooksAlreadyApplied(bodyText)) return "already_applied";

  for (const root of roots) {
    const controls = Array.from(
      root.querySelectorAll<HTMLElement>("button, a, div[role='button']")
    );
    for (const el of controls) {
      if (elementLooksAlreadyApplied(el)) return "already_applied";
    }
    if (cardHasApplyAction(root)) return "can_apply";
  }

  return "no_apply_button";
}

/** Runs inside page.evaluate — must be self-contained (no outer helpers). */
export function clickApplyInTuple(args: TupleLocatorArgs): boolean {
  const card = resolveJobTupleCard(args);
  if (!card) return false;

  const candidates = Array.from(
    card.querySelectorAll<HTMLElement>(
      "button, a, div[role='button'], [id*='apply' i], [class*='apply' i]"
    )
  );

  for (const el of candidates) {
    if (elementLooksAlreadyApplied(el)) continue;
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    const aria = (el.getAttribute("aria-label") ?? "").toLowerCase();
    const label = `${text} ${aria}`;
    if (!label.includes("apply")) continue;
    if (label.includes("company") || label.includes("external")) continue;
    if (label.includes("login to apply")) continue;
    el.click();
    return true;
  }
  return false;
}

export function openJobDetailInTuple(args: TupleLocatorArgs): boolean {
  const card = resolveJobTupleCard(args);
  if (!card) return false;

  const titleLink =
    card.querySelector<HTMLAnchorElement>(
      'a.title, a.jtitle, a[href*="job-listings"], a[href*="job-details"], h2 a'
    ) ??
    Array.from(card.querySelectorAll<HTMLAnchorElement>("a")).find((a) => {
      const href = a.getAttribute("href") ?? "";
      return /job-listings|job-details/i.test(href);
    });

  if (titleLink) {
    titleLink.click();
    return true;
  }
  card.click();
  return true;
}

export function clickApplyInDetailPanel(): boolean {
  const roots = [
    document.querySelector('[class*="styles_JDC" i]'),
    document.querySelector('[class*="job-details" i]'),
    document.querySelector('[class*="JobDetails" i]'),
    document.querySelector("main"),
    document.body,
  ].filter(Boolean) as HTMLElement[];

  for (const root of roots) {
    const candidates = Array.from(
      root.querySelectorAll<HTMLElement>(
        "button, a, div[role='button'], [id*='apply' i], [class*='apply' i]"
      )
    );
    for (const el of candidates) {
      if (elementLooksAlreadyApplied(el)) continue;
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
      const aria = (el.getAttribute("aria-label") ?? "").toLowerCase();
      const label = `${text} ${aria}`;
      if (!label.includes("apply")) continue;
      if (label.includes("company") || label.includes("external")) continue;
      if (label.includes("login to apply")) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      el.click();
      return true;
    }
  }
  return false;
}

export function listApplyLikeControls(): string[] {
  const found: string[] = [];
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      "button, a, div[role='button'], [class*='apply' i]"
    )
  );
  for (const el of nodes) {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    const aria = el.getAttribute("aria-label") ?? "";
    if (!text && !aria) continue;
    if (!/apply/i.test(`${text} ${aria}`)) continue;
    found.push(
      `${el.tagName}.${(el.className || "").toString().slice(0, 40)} | ${text || aria}`.slice(
        0,
        120
      )
    );
    if (found.length >= 12) break;
  }
  return found;
}
