import type { PlatformAdapter } from "~lib/platform/types";

function matchHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "linkedin.com" || h.endsWith(".linkedin.com");
}

export const linkedinAdapter: PlatformAdapter = {
  platform: "linkedin",
  matches: matchHost,

  getPageType(url: string): string {
    const path = new URL(url).pathname.toLowerCase();
    if (path.includes("/jobs/view")) return "job_detail";
    if (path.includes("/jobs/search") || path.includes("/jobs/collections"))
      return "job_search";
    if (path.includes("/jobs")) return "jobs";
    if (path.includes("/feed")) return "feed";
    return "other";
  },

  extractExtras(document: Document, url: string): Record<string, string> {
    const extras: Record<string, string> = { path: new URL(url).pathname };
    const title = document.querySelector(".jobs-unified-top-card__job-title")
      ?.textContent?.trim();
    if (title) extras.jobTitle = title.slice(0, 120);
    return extras;
  },
};
