export type { ExtensionPageMetadata } from "./page-metadata.js";

/** Supported job platforms */
export type Platform = "naukri" | "linkedin" | "indeed";

/** User filter preferences from extension */
export interface JobFilters {
  role: string;
  experience: string;
  remote: boolean;
  salary?: string;
  datePosted?: string;
  easyApplyOnly: boolean;
  fullAuto: boolean;
}

/** Job card scraped from a platform */
export interface JobCard {
  platform: Platform;
  jobId: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
  postedAt?: string;
  easyApply: boolean;
  externalApply: boolean;
  url: string;
}

/** Application lifecycle status */
export type ApplicationStatus =
  | "queued"
  | "processing"
  | "applied"
  | "skipped"
  | "failed";

/** Policy engine decision */
export interface ApplyDecision {
  shouldApply: boolean;
  reasons: string[];
  score?: number;
}
