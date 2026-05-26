import type { JobFilters, Platform } from "@aiapply/shared";
import { validateJobFilters } from "@aiapply/shared";

export interface AutomationContext {
  platform: Platform;
  filters: JobFilters;
  userId: string;
}

/** Contract for platform-specific API / worker orchestration (Playwright in worker). */
export interface IPlatformAdapter {
  readonly platform: Platform;
  validateFilters(filters: JobFilters): string[];
  buildSearchPayload(filters: JobFilters): Record<string, unknown>;
}

export abstract class BasePlatformAdapter implements IPlatformAdapter {
  abstract readonly platform: Platform;

  validateFilters(filters: JobFilters): string[] {
    const result = validateJobFilters(filters);
    return Object.values(result.errors).filter(Boolean) as string[];
  }

  abstract buildSearchPayload(filters: JobFilters): Record<string, unknown>;
}
