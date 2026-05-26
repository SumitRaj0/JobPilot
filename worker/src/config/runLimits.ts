import { env } from "./env.js";

/** `MAX_APPLICATIONS_PER_RUN <= 0` means apply to every scraped job (no cap). */
export function isUnlimitedApplications(max?: number): boolean {
  const n = max ?? env.MAX_APPLICATIONS_PER_RUN;
  return n <= 0;
}

export function resolveMaxApplications(max?: number): number {
  const n = max ?? env.MAX_APPLICATIONS_PER_RUN;
  return n <= 0 ? Number.MAX_SAFE_INTEGER : n;
}

export function resolveScrapeLimit(): number {
  return isUnlimitedApplications() ? 999 : env.NAUKRI_SCRAPE_LIMIT;
}

export function resolveScrollRounds(): number {
  return isUnlimitedApplications()
    ? Math.max(env.NAUKRI_SCROLL_ROUNDS, 20)
    : env.NAUKRI_SCROLL_ROUNDS;
}

/** Search result pages to walk when applications are unlimited. */
export function resolveMaxSearchPages(): number {
  return isUnlimitedApplications() ? 20 : 1;
}

export function formatApplyTarget(max?: number): string {
  return isUnlimitedApplications(max) ? "all matching jobs" : String(resolveMaxApplications(max));
}
