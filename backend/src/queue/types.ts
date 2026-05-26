import type { ExtensionPageMetadata, JobFilters, Platform } from "@aiapply/shared";

export interface AutomationJobData {
  userId: string;
  platform: Platform;
  filters: JobFilters;
  pageMetadata?: ExtensionPageMetadata;
  enqueuedAt: string;
}

export interface AutomationJobResult {
  jobId: string;
  status: "queued" | "failed";
  message?: string;
}
