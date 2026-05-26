import type { JobFilters } from "@aiapply/shared";

import { BasePlatformAdapter } from "./base.adapter.js";

export class LinkedInAdapter extends BasePlatformAdapter {
  readonly platform = "linkedin" as const;

  buildSearchPayload(filters: JobFilters): Record<string, unknown> {
    return {
      keywords: filters.role,
      experience: filters.experience,
      remote: filters.remote,
      f_AL: filters.easyApplyOnly ? "true" : undefined,
    };
  }
}
