export interface ExperienceRange {
  min: number;
  max: number;
}

/** Parse user filter like "2", "2-5", "3 years". */
export function parseExperienceFilter(text: string): ExperienceRange | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (/fresher|0\s*year|entry/i.test(t)) return { min: 0, max: 1 };

  const range = t.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/);
  if (range) {
    const min = Number.parseFloat(range[1]!);
    const max = Number.parseFloat(range[2]!);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min: Math.min(min, max), max: Math.max(min, max) };
    }
  }

  const single = t.match(/(\d+(?:\.\d+)?)/);
  if (single) {
    const years = Number.parseFloat(single[1]!);
    if (Number.isFinite(years)) return { min: years, max: years + 2 };
  }
  return null;
}

/** Parse card text like "2-5 Yrs", "3+ years", "0-1 yr". */
export function parseExperienceFromText(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (/fresher|entry level|0\s*year/i.test(t)) return 0;

  const range = t.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/);
  if (range) {
    const min = Number.parseFloat(range[1]!);
    const max = Number.parseFloat(range[2]!);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return (min + max) / 2;
    }
  }

  const plus = t.match(/(\d+(?:\.\d+)?)\s*\+/);
  if (plus) return Number.parseFloat(plus[1]!);

  const single = t.match(/(\d+(?:\.\d+)?)/);
  if (single) return Number.parseFloat(single[1]!);
  return null;
}

export function jobExperienceMatchesFilter(
  jobYears: number | undefined,
  filterText: string
): boolean {
  const range = parseExperienceFilter(filterText);
  if (!range) return true;
  if (jobYears == null) return true;

  const tolerance = 1;
  return jobYears >= range.min - tolerance && jobYears <= range.max + tolerance;
}
