/** Convert Naukri posted text ("3 days ago") to approximate age in days. */
export function parsePostedDaysAgo(postedAt?: string): number | null {
  if (!postedAt) return null;
  const t = postedAt.trim().toLowerCase();
  if (!t) return null;
  if (/just now|few (?:hours|mins)|today|moments? ago/i.test(t)) return 0;
  if (/yesterday/i.test(t)) return 1;

  const days = t.match(/(\d+)\s*\+?\s*days?/);
  if (days) return Number.parseInt(days[1]!, 10);

  const weeks = t.match(/(\d+)\s*\+?\s*weeks?/);
  if (weeks) return Number.parseInt(weeks[1]!, 10) * 7;

  const months = t.match(/(\d+)\s*\+?\s*months?/);
  if (months) return Number.parseInt(months[1]!, 10) * 30;

  if (/month/i.test(t)) return 30;
  if (/week/i.test(t)) return 7;
  if (/30\+|30\s*plus/i.test(t)) return 31;
  return null;
}

export function jobPostedWithinLimit(
  postedAt: string | undefined,
  maxDays: string | undefined
): boolean {
  if (!maxDays?.trim()) return true;
  const limit = Number.parseInt(maxDays, 10);
  if (!Number.isFinite(limit) || limit <= 0) return true;

  const age = parsePostedDaysAgo(postedAt);
  if (age == null) return true;
  return age <= limit;
}
