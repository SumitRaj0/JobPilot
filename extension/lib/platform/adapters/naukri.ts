import type { PlatformAdapter } from "~lib/platform/types";

function matchHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "naukri.com" || h.endsWith(".naukri.com");
}

export const naukriAdapter: PlatformAdapter = {
  platform: "naukri",
  matches: matchHost,

  getPageType(url: string): string {
    const path = new URL(url).pathname.toLowerCase();
    if (path.includes("/job-listings") || path.includes("/search")) return "job_search";
    if (path.includes("/job-details") || path.includes("/job-detail")) return "job_detail";
    if (path.includes("/mnjuser")) return "dashboard";
    if (path.includes("/apply")) return "apply";
    return "other";
  },

  extractExtras(document: Document, url: string): Record<string, string> {
    const extras: Record<string, string> = { path: new URL(url).pathname };
    const heading = document.querySelector("h1, h2")?.textContent?.trim();
    if (heading) extras.heading = heading.slice(0, 120);
    return extras;
  },
};
