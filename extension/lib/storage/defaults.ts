import type { JobFilters } from "@aiapply/shared";

export const DEFAULT_FILTERS: JobFilters = {
  mode: "search",
  role: "",
  experience: "",
  remote: false,
  salary: "",
  datePosted: "",
  location: "",
  excludeKeywords: "",
  minPolicyScore: 0,
  easyApplyOnly: false,
  fullAuto: false,
};
