import type { JobFilters } from "@aiapply/shared";

import { BasePlatformAdapter } from "./base.adapter.js";

export class NaukriAdapter extends BasePlatformAdapter {
  readonly platform = "naukri" as const;

  buildSearchPayload(filters: JobFilters): Record<string, unknown> {
    return {
      mode: filters.mode,
      keyword: filters.role,
      experience: filters.experience,
      remote: filters.remote,
      salary: filters.salary,
      datePosted: filters.datePosted,
      easyApply: filters.easyApplyOnly,
    };
  }
}
