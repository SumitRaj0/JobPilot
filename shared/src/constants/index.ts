import type { Platform } from "../types/index.js";

export const PLATFORMS: Platform[] = ["naukri", "linkedin", "indeed"];

export const PLATFORM_HOSTS: Record<Platform, string[]> = {
  naukri: ["naukri.com", "www.naukri.com"],
  linkedin: ["linkedin.com", "www.linkedin.com"],
  indeed: ["indeed.com", "www.indeed.com", "in.indeed.com"],
};

export const QUEUE_NAMES = {
  AUTOMATION: "automation",
  REPORT: "report",
} as const;
