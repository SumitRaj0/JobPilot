import type { JobCard } from "@aiapply/shared";

export interface NaukriScrapedJob extends JobCard {
  source: "search" | "recommended";
  policyScore?: number;
  tupleIndex: number;
  applySelector?: string;
  /** Parsed from card text when available (years). */
  experienceYears?: number;
  /** Detected on SRP card — skip re-apply (same title/company may differ by jobId). */
  alreadyApplied?: boolean;
}
