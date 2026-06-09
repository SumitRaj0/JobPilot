import type { JobFilters } from "../types/index.js";

export type FilterFieldKey = keyof JobFilters;

export interface FilterValidationResult {
  valid: boolean;
  errors: Partial<Record<FilterFieldKey, string>>;
  warnings: string[];
}

const ALLOWED_DATE_POSTED = new Set(["", "1", "3", "7", "30"]);
const ALLOWED_MODES = new Set(["search", "recommended"]);

/** True if text looks like a negative amount (e.g. -5, - 10 LPA). Allows ranges like 2-5. */
export function textHasNegativeNumber(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^-/.test(t)) return true;
  if (/(?:^|\s)-\d/.test(t)) return true;
  return false;
}

export function validateJobFilters(filters: JobFilters): FilterValidationResult {
  const errors: Partial<Record<FilterFieldKey, string>> = {};
  const warnings: string[] = [];
  const mode = filters.mode ?? "search";

  if (!ALLOWED_MODES.has(mode)) {
    errors.mode = "Invalid automation mode";
  }

  const role = filters.role.trim();
  if (mode === "search") {
    if (!role) {
      errors.role = "Job title is required";
    } else if (role.length < 2) {
      errors.role = "Enter at least 2 characters";
    } else if (role.length > 80) {
      errors.role = "Job title is too long (max 80 characters)";
    }
  } else if (role.length > 80) {
    errors.role = "Job title is too long (max 80 characters)";
  }

  const experience = filters.experience?.trim() ?? "";
  if (experience.length > 30) {
    errors.experience = "Experience is too long (max 30 characters)";
  } else if (textHasNegativeNumber(experience)) {
    errors.experience = "Experience cannot be negative";
  }

  const salary = filters.salary?.trim() ?? "";
  if (salary.length > 40) {
    errors.salary = "Expected salary is too long (max 40 characters)";
  } else if (textHasNegativeNumber(salary)) {
    errors.salary = "Expected salary cannot be negative";
  }

  const datePosted = filters.datePosted ?? "";
  if (datePosted && !ALLOWED_DATE_POSTED.has(datePosted)) {
    errors.datePosted = "Choose a date range from the list";
  } else if (datePosted) {
    const days = Number.parseInt(datePosted, 10);
    if (!Number.isFinite(days) || days <= 0) {
      errors.datePosted = "Date posted must be a positive number of days";
    }
  }

  const location = filters.location?.trim() ?? "";
  if (location.length > 60) {
    errors.location = "Location is too long (max 60 characters)";
  }

  const excludeKeywords = filters.excludeKeywords?.trim() ?? "";
  if (excludeKeywords.length > 120) {
    errors.excludeKeywords = "Exclude keywords too long (max 120 characters)";
  }

  const minPolicyScore = filters.minPolicyScore ?? 0;
  if (minPolicyScore < 0 || minPolicyScore > 100) {
    errors.minPolicyScore = "Min match score must be between 0 and 100";
  }

  if (!filters.fullAuto) {
    warnings.push("Full Auto is off — the run will scrape jobs only (no applications).");
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

export function sanitizeJobFilters(filters: JobFilters): JobFilters {
  const minPolicyScore = filters.minPolicyScore ?? 0;
  return {
    ...filters,
    mode: filters.mode === "recommended" ? "recommended" : "search",
    role: filters.role.trim(),
    experience: filters.experience?.trim() ?? "",
    salary: filters.salary?.trim() || undefined,
    datePosted: filters.datePosted?.trim() || undefined,
    location: filters.location?.trim() || undefined,
    excludeKeywords: filters.excludeKeywords?.trim() || undefined,
    minPolicyScore: minPolicyScore > 0 ? Math.min(100, minPolicyScore) : undefined,
  };
}
