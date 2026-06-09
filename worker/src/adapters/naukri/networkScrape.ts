import type { Page, Response } from "playwright";

import { parseNaukriNetworkPayload } from "./networkScrapeParser.js";
import type { NaukriScrapedJob } from "./types.js";

function isStableJobId(jobId: string): boolean {
  return /^\d{6,}$/.test(jobId);
}

export class NaukriNetworkCapture {
  private readonly pending = new Map<string, NaukriScrapedJob>();
  private attached = false;

  attach(page: Page): void {
    if (this.attached) return;
    this.attached = true;
    page.on("response", (response) => {
      void this.onResponse(response);
    });
  }

  private async onResponse(response: Response): Promise<void> {
    try {
      const url = response.url();
      if (!/naukri\.com/i.test(url)) return;
      if (!/(job|search|recommended|srp|tuple|listing|mnjuser)/i.test(url)) {
        return;
      }

      const status = response.status();
      if (status < 200 || status >= 300) return;

      const contentType = response.headers()["content-type"] ?? "";
      if (!/json|javascript/i.test(contentType)) return;

      const body: unknown = await response.json().catch(() => null);
      if (!body) return;

      const source: "search" | "recommended" = /recommended/i.test(url)
        ? "recommended"
        : "search";

      for (const job of parseNaukriNetworkPayload(body, source)) {
        if (!isStableJobId(job.jobId)) continue;
        this.pending.set(job.jobId, job);
      }
    } catch {
      // Ignore malformed network payloads.
    }
  }

  drain(): NaukriScrapedJob[] {
    const jobs = [...this.pending.values()];
    this.pending.clear();
    return jobs;
  }
}

export function mergeJobsByJobId(
  domJobs: NaukriScrapedJob[],
  networkJobs: NaukriScrapedJob[]
): { jobs: NaukriScrapedJob[]; networkMerged: number } {
  const byId = new Map<string, NaukriScrapedJob>();
  for (const job of domJobs) byId.set(job.jobId, job);

  let networkMerged = 0;
  for (const net of networkJobs) {
    if (!isStableJobId(net.jobId)) continue;
    const existing = byId.get(net.jobId);
    if (existing) {
      byId.set(net.jobId, {
        ...existing,
        ...net,
        easyApply: existing.easyApply || net.easyApply,
        externalApply: existing.externalApply && net.externalApply,
        alreadyApplied: existing.alreadyApplied || net.alreadyApplied,
        experienceYears: existing.experienceYears ?? net.experienceYears,
      });
    } else {
      byId.set(net.jobId, net);
      networkMerged++;
    }
  }

  return { jobs: [...byId.values()], networkMerged };
}
