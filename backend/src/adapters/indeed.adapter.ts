import type { JobFilters } from "@aiapply/shared";

import { BasePlatformAdapter } from "./base.adapter.js";

export class IndeedAdapter extends BasePlatformAdapter {
  readonly platform = "indeed" as const;

  buildSearchPayload(filters: JobFilters): Record<string, unknown> {
    return {
      q: filters.role,
      salary: filters.salary,
      fromage: filters.datePosted,
      remotejob: filters.remote ? "1" : undefined,
    };
  }
}
