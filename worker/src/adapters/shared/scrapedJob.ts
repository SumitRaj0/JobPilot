import type { JobCard } from "@aiapply/shared";

export interface PlatformScrapedJob extends JobCard {
  tupleIndex: number;
  alreadyApplied?: boolean;
}
