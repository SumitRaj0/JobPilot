import { existsSync, readFileSync } from "fs";

import { env } from "../../config/env.js";

export interface JobPreferences {
  blocked_companies?: string[];
  preferred_companies?: string[];
}

function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function loadJobPreferences(): JobPreferences {
  try {
    const path = env.PROFILE_DATA_PATH;
    if (!existsSync(path)) return {};
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      job_preferences?: JobPreferences;
    };
    return raw.job_preferences ?? {};
  } catch {
    return {};
  }
}

export function isBlockedCompany(company: string, blocked: string[]): boolean {
  if (!blocked.length) return false;
  const norm = normalizeCompany(company);
  if (!norm) return false;
  return blocked.some((b) => {
    const token = normalizeCompany(b);
    return token.length >= 2 && norm.includes(token);
  });
}

export function isPreferredCompany(company: string, preferred: string[]): boolean {
  if (!preferred.length) return false;
  const norm = normalizeCompany(company);
  if (!norm) return false;
  return preferred.some((p) => {
    const token = normalizeCompany(p);
    return token.length >= 2 && norm.includes(token);
  });
}
