import {
  emptyFilterBreakdown,
  type JobFilters,
  type NaukriFilterBreakdown,
} from "@aiapply/shared";

import {
  isBlockedCompany,
  isPreferredCompany,
  type JobPreferences,
} from "./companyPreferences.js";
import { jobPostedWithinLimit } from "./dateMatch.js";
import { jobExperienceMatchesFilter } from "./experienceMatch.js";
import { jobLocationMatchesFilter } from "./locationMatch.js";
import { scoreJob } from "./policy.js";
import { jobTitleMatchesRole } from "./roleMatch.js";
import type { NaukriScrapedJob } from "./types.js";

export interface CardFilterOptions {
  jobPreferences?: JobPreferences;
}

function isStableJobId(jobId: string): boolean {
  return /^\d{6,}$/.test(jobId);
}

function parseExcludeKeywords(text?: string): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/[,;|]/)
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length >= 2);
}

function titleHasExcludedKeyword(title: string, keywords: string[]): boolean {
  const norm = title.toLowerCase();
  return keywords.some((kw) => norm.includes(kw));
}

function salaryMatchesMinimum(
  jobSalary: string | undefined,
  minSalary: string | undefined
): boolean {
  if (!minSalary?.trim() || !jobSalary) return true;

  const parseFirst = (text: string): number | null => {
    const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
    return m ? Number.parseFloat(m[1]!) : null;
  };

  const isLpa = (text: string) => /\blpa\b|\black\b|lac|lakhs?/i.test(text);
  const toLpa = (value: number, text: string): number => {
    if (isLpa(text)) return value;
    if (/k\b|thousand/i.test(text)) return value / 100;
    if (/crore|cr\b/i.test(text)) return value * 100;
    return value;
  };

  const min = parseFirst(minSalary);
  if (!min) return true;

  const values = jobSalary
    .replace(/,/g, "")
    .match(/\d+(?:\.\d+)?/g)
    ?.map((v) => toLpa(Number.parseFloat(v), jobSalary))
    .filter((v) => Number.isFinite(v));

  if (!values?.length) return true;
  return Math.max(...values) >= min;
}

function filterEasyApplyOnly(
  jobs: NaukriScrapedJob[],
  easyApplyOnly: boolean
): { jobs: NaukriScrapedJob[]; dropped: number } {
  if (!easyApplyOnly) return { jobs, dropped: 0 };

  const withBadge = jobs.filter((j) => j.easyApply);
  if (withBadge.length > 0) {
    return { jobs: withBadge, dropped: jobs.length - withBadge.length };
  }

  const inPortal = jobs.filter((j) => !j.externalApply);
  if (inPortal.length > 0) {
    return {
      jobs: inPortal.map((j) => ({ ...j, easyApply: true })),
      dropped: jobs.length - inPortal.length,
    };
  }

  return { jobs: [], dropped: jobs.length };
}

export function runCardFilters(
  jobs: NaukriScrapedJob[],
  filters: JobFilters,
  options: CardFilterOptions = {}
): { jobs: NaukriScrapedJob[]; breakdown: NaukriFilterBreakdown } {
  const breakdown = emptyFilterBreakdown();
  breakdown.parsed = jobs.length;

  const prefs = options.jobPreferences ?? {};
  const blocked = prefs.blocked_companies ?? [];
  const preferred = prefs.preferred_companies ?? [];
  const mode = filters.mode ?? "search";
  const minScore = filters.minPolicyScore ?? 0;

  let current = jobs.filter((job) => {
    if (isStableJobId(job.jobId)) return true;
    breakdown.noStableJobId++;
    return false;
  });

  if (mode === "search" && filters.role.trim()) {
    const next: NaukriScrapedJob[] = [];
    for (const job of current) {
      if (jobTitleMatchesRole(job.title, filters.role)) next.push(job);
      else breakdown.roleMismatch++;
    }
    current = next;
  }

  const exclude = parseExcludeKeywords(filters.excludeKeywords);
  if (exclude.length > 0) {
    const next: NaukriScrapedJob[] = [];
    for (const job of current) {
      if (titleHasExcludedKeyword(job.title, exclude)) breakdown.excludeKeyword++;
      else next.push(job);
    }
    current = next;
  }

  if (filters.experience.trim()) {
    const next: NaukriScrapedJob[] = [];
    for (const job of current) {
      if (jobExperienceMatchesFilter(job.experienceYears, filters.experience)) {
        next.push(job);
      } else {
        breakdown.experienceMismatch++;
      }
    }
    current = next;
  }

  if (filters.datePosted) {
    const next: NaukriScrapedJob[] = [];
    for (const job of current) {
      if (jobPostedWithinLimit(job.postedAt, filters.datePosted)) next.push(job);
      else breakdown.dateTooOld++;
    }
    current = next;
  }

  if (filters.location?.trim() || filters.remote) {
    const next: NaukriScrapedJob[] = [];
    for (const job of current) {
      if (
        jobLocationMatchesFilter(job.location, filters.location, filters.remote)
      ) {
        next.push(job);
      } else if (filters.remote) {
        breakdown.remoteMismatch++;
      } else {
        breakdown.locationMismatch++;
      }
    }
    current = next;
  }

  if (blocked.length > 0) {
    const next: NaukriScrapedJob[] = [];
    for (const job of current) {
      if (isBlockedCompany(job.company, blocked)) breakdown.blockedCompany++;
      else next.push(job);
    }
    current = next;
  }

  const easy = filterEasyApplyOnly(current, filters.easyApplyOnly);
  breakdown.easyApplyOnly = easy.dropped;
  current = easy.jobs;

  const scored: NaukriScrapedJob[] = [];
  for (const job of current) {
    if (!salaryMatchesMinimum(job.salary, filters.salary)) {
      breakdown.salaryMismatch++;
      continue;
    }
    if (job.alreadyApplied) {
      breakdown.alreadyApplied++;
      continue;
    }

    let policyScore = scoreJob(job, mode);
    if (isPreferredCompany(job.company, preferred)) policyScore += 15;

    if (minScore > 0 && policyScore < minScore) {
      breakdown.belowMinScore++;
      continue;
    }

    scored.push({ ...job, policyScore });
  }

  scored.sort((a, b) => (b.policyScore ?? 0) - (a.policyScore ?? 0));
  breakdown.matched = scored.length;
  return { jobs: scored, breakdown };
}
