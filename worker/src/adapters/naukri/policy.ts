import type { JobFilters } from "@aiapply/shared";

import type { NaukriScrapedJob } from "./types.js";

export interface NaukriPolicyStats {
  recommendedFound: number;
  matchedFilters: number;
  readyToApply: number;
}

function parseFirstNumber(text?: string): number | null {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return Number.parseFloat(m[1]!);
}

function isLikelyLpa(text: string): boolean {
  return /\blpa\b|\black\b|lac|lakhs?/i.test(text);
}

function normalizeToLpa(value: number, text: string): number {
  if (isLikelyLpa(text)) return value;
  if (/k\b|thousand/i.test(text)) return value / 100;
  if (/crore|cr\b/i.test(text)) return value * 100;
  return value;
}

function salaryMatchesMinimum(jobSalary: string | undefined, minSalary: string | undefined): boolean {
  const min = parseFirstNumber(minSalary);
  if (!min || !jobSalary) return true;

  const values = jobSalary
    .replace(/,/g, "")
    .match(/\d+(?:\.\d+)?/g)
    ?.map((v) => normalizeToLpa(Number.parseFloat(v), jobSalary))
    .filter((v) => Number.isFinite(v));

  if (!values || values.length === 0) return true;
  const jobMax = Math.max(...values);
  return jobMax >= min;
}

function isRemoteLocation(location: string | undefined): boolean {
  if (!location) return false;
  return /remote|wfh|work from home|anywhere/i.test(location);
}

function scoreJob(job: NaukriScrapedJob, mode: JobFilters["mode"]): number {
  let score = 0;
  if (job.easyApply) score += 40;
  if (!job.externalApply) score += 15;
  if (job.salary) score += 5;
  if (mode === "recommended" || job.source === "recommended") score += 30;
  return score;
}

export function applyNaukriPolicies(
  jobs: NaukriScrapedJob[],
  filters: JobFilters
): { jobs: NaukriScrapedJob[]; stats: NaukriPolicyStats } {
  const mode = filters.mode ?? "search";
  const recommendedFound = jobs.filter((j) => j.source === "recommended").length;

  const matched = jobs.filter((job) => {
    if (filters.easyApplyOnly && !job.easyApply) return false;
    if (filters.remote && !isRemoteLocation(job.location)) return false;
    if (!salaryMatchesMinimum(job.salary, filters.salary)) return false;
    if (job.alreadyApplied) return false;
    return true;
  });

  const scored = matched
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
