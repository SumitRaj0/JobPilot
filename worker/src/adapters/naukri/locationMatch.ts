function normalizeLocation(text: string): string {
  return text
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9\s,/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRemoteLocation(location: string | undefined): boolean {
  if (!location) return false;
  return /remote|wfh|work from home|anywhere|hybrid/i.test(location);
}

/** Match filter location tokens against job location (contains). */
export function jobLocationMatchesFilter(
  jobLocation: string | undefined,
  filterLocation: string | undefined,
  remoteOnly: boolean
): boolean {
  if (remoteOnly) return isRemoteLocation(jobLocation);

  const filter = filterLocation?.trim();
  if (!filter) return true;

  const jobNorm = normalizeLocation(jobLocation ?? "");
  if (!jobNorm) return false;

  const tokens = filter
    .split(/[,/|]/)
    .map((t) => normalizeLocation(t))
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) return true;
  return tokens.some((token) => jobNorm.includes(token));
}
