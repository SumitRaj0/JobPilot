import type { JobFilters } from "@aiapply/shared";

import type { NaukriScrapedJob } from "./types.js";

export interface NaukriPolicyStats {
  recommendedFound: number;
  matchedFilters: number;
  readyToApply: number;
}

function isRemoteLocation(location: string | undefined): boolean {
  if (!location) return false;
  return /remote|wfh|work from home|anywhere/i.test(location);
}

export function scoreJob(job: NaukriScrapedJob, mode: JobFilters["mode"]): number {
  let score = 0;
  if (job.easyApply) score += 40;
  if (!job.externalApply) score += 15;
  if (job.salary) score += 5;
  if (job.location && isRemoteLocation(job.location)) score += 10;
  if (job.experienceYears != null) score += 5;
  if (mode === "recommended" || job.source === "recommended") score += 30;
  return score;
}

/** Legacy helper — card pipeline now owns filtering; this keeps stats for callers. */
export function applyNaukriPolicies(
  jobs: NaukriScrapedJob[],
  filters: JobFilters
): { jobs: NaukriScrapedJob[]; stats: NaukriPolicyStats } {
  const mode = filters.mode ?? "search";
  const recommendedFound = jobs.filter((j) => j.source === "recommended").length;
  const scored = jobs
    .map((job) => ({ ...job, policyScore: scoreJob(job, mode) }))
    .sort((a, b) => (b.policyScore ?? 0) - (a.policyScore ?? 0));
  const readyToApply = scored.filter((j) => j.easyApply && !j.externalApply).length;

  return {
    jobs: scored,
    stats: {
      recommendedFound,
      matchedFilters: scored.length,
      readyToApply,
    },
  };
}
