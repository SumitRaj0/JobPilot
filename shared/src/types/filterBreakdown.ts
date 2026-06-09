/** Per-stage job filter counts (Naukri scrape → apply pipeline). */
export interface NaukriFilterBreakdown {
  parsed: number;
  networkMerged: number;
  noStableJobId: number;
  roleMismatch: number;
  excludeKeyword: number;
  experienceMismatch: number;
  dateTooOld: number;
  locationMismatch: number;
  remoteMismatch: number;
  salaryMismatch: number;
  easyApplyOnly: number;
  alreadyApplied: number;
  blockedCompany: number;
  belowMinScore: number;
  matched: number;
}

export function emptyFilterBreakdown(): NaukriFilterBreakdown {
  return {
    parsed: 0,
    networkMerged: 0,
    noStableJobId: 0,
    roleMismatch: 0,
    excludeKeyword: 0,
    experienceMismatch: 0,
    dateTooOld: 0,
    locationMismatch: 0,
    remoteMismatch: 0,
    salaryMismatch: 0,
    easyApplyOnly: 0,
    alreadyApplied: 0,
    blockedCompany: 0,
    belowMinScore: 0,
    matched: 0,
  };
}

export function mergeFilterBreakdown(
  a: NaukriFilterBreakdown,
  b: Partial<NaukriFilterBreakdown>
): NaukriFilterBreakdown {
  const out = { ...a };
  for (const key of Object.keys(out) as (keyof NaukriFilterBreakdown)[]) {
    if (typeof b[key] === "number") {
      out[key] += b[key] as number;
    }
  }
  return out;
}

export function formatFilterBreakdown(b: NaukriFilterBreakdown): string {
  const parts: string[] = [`parsed:${b.parsed}`];
  if (b.networkMerged > 0) parts.push(`network:+${b.networkMerged}`);
  if (b.noStableJobId) parts.push(`noId:${b.noStableJobId}`);
  if (b.roleMismatch) parts.push(`role:${b.roleMismatch}`);
  if (b.excludeKeyword) parts.push(`exclude:${b.excludeKeyword}`);
  if (b.experienceMismatch) parts.push(`exp:${b.experienceMismatch}`);
  if (b.dateTooOld) parts.push(`date:${b.dateTooOld}`);
  if (b.locationMismatch) parts.push(`loc:${b.locationMismatch}`);
  if (b.remoteMismatch) parts.push(`remote:${b.remoteMismatch}`);
  if (b.salaryMismatch) parts.push(`salary:${b.salaryMismatch}`);
  if (b.easyApplyOnly) parts.push(`easyApply:${b.easyApplyOnly}`);
  if (b.alreadyApplied) parts.push(`applied:${b.alreadyApplied}`);
  if (b.blockedCompany) parts.push(`blocked:${b.blockedCompany}`);
  if (b.belowMinScore) parts.push(`lowScore:${b.belowMinScore}`);
  parts.push(`matched:${b.matched}`);
  return parts.join(" → ");
}
