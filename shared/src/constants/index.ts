import type { Platform } from "../types/index.js";

export const PLATFORMS: Platform[] = ["naukri", "linkedin"];

export const PLATFORM_HOSTS: Partial<Record<Platform, string[]>> = {
  naukri: ["naukri.com", "www.naukri.com"],
  linkedin: ["linkedin.com", "www.linkedin.com"],
};

export const QUEUE_NAMES = {
  AUTOMATION: "automation",
  REPORT: "report",
} as const;

/** Matches extension RunTimer estimate (50 × 18s ≈ 15 min). */
export const TARGET_APPLICATIONS_PER_RUN = 50;
export const SECONDS_PER_JOB_ATTEMPT = 18;

export function estimateAutomationRunMs(
  targetApplications = TARGET_APPLICATIONS_PER_RUN
): number {
  return targetApplications * SECONDS_PER_JOB_ATTEMPT * 1000;
}

export function automationAbortRedisKey(userId: string, platform: string): string {
  return `aiapply:abort:${userId}:${platform}`;
}
