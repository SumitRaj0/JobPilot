import type { JobCard } from "@aiapply/shared";

export interface NaukriScrapedJob extends JobCard {
  tupleIndex: number;
  applySelector?: string;
  /** Detected on SRP card — skip re-apply (same title/company may differ by jobId). */
  alreadyApplied?: boolean;
}
