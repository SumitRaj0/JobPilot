import type { PlatformAdapter } from "~lib/platform/types";

function matchHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "indeed.com" ||
    h.endsWith(".indeed.com") ||
    h === "in.indeed.com" ||
    h.endsWith(".in.indeed.com")
  );
}

export const indeedAdapter: PlatformAdapter = {
  platform: "indeed",
  matches: matchHost,

  getPageType(url: string): string {
    const path = new URL(url).pathname.toLowerCase();
    if (path.includes("/viewjob") || path.includes("/rc/clk")) return "job_detail";
    if (path.includes("/jobs")) return "job_search";
    return "other";
  },

  extractExtras(document: Document, url: string): Record<string, string> {
    const extras: Record<string, string> = { path: new URL(url).pathname };
    const jobTitle = document.querySelector(
      "h1.jobsearch-JobInfoHeader-title, h1"
    )?.textContent?.trim();
    if (jobTitle) extras.jobTitle = jobTitle.slice(0, 120);
    return extras;
  },
};
