import { API_BASE_URL, API_ROUTES } from "~lib/config";
import type { ExtensionPageMetadata } from "~lib/messaging/types";
import type { JobFilters, Platform } from "@aiapply/shared";

export interface SyncResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const text = await response.text();
    let data: T | undefined;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = undefined;
      }
    }

    if (!response.ok) {
      const errBody = data as { error?: string } | undefined;
      return {
        ok: false,
        error: errBody?.error ?? text ?? `HTTP ${response.status}`,
      };
    }

    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function syncPageMetadataToBackend(
  metadata: ExtensionPageMetadata
): Promise<SyncResult> {
  const result = await apiFetch(API_ROUTES.pageMetadata, {
    method: "POST",
    body: JSON.stringify(metadata),
  });
  return { ok: result.ok, error: result.error, data: result.data };
}

export async function startAutomationOnBackend(input: {
  platform: Platform;
  filters: JobFilters;
  pageMetadata?: ExtensionPageMetadata | null;
}): Promise<SyncResult> {
  const result = await apiFetch(API_ROUTES.automationStart, {
    method: "POST",
    body: JSON.stringify({
      platform: input.platform,
      filters: input.filters,
      pageMetadata: input.pageMetadata ?? undefined,
    }),
  });
  return { ok: result.ok, error: result.error, data: result.data };
}

export async function stopAutomationOnBackend(
  platform?: Platform
): Promise<SyncResult> {
  const result = await apiFetch(API_ROUTES.automationStop, {
    method: "POST",
    body: JSON.stringify({ platform }),
  });
  return { ok: result.ok, error: result.error, data: result.data };
}

export interface BackendAutomationStatus {
  running: boolean;
  platform: Platform | null;
  runningPlatforms?: Platform[];
  jobId: string | null;
  lastRun?: {
    jobId: string;
    platform: Platform;
    success: boolean;
    applied: number;
    skipped: number;
    failed: number;
    alreadyApplied: number;
    noApplyButton: number;
    messages: string[];
    finishedAt: string;
  } | null;
  lastRunsByPlatform?: Partial<
    Record<
      Platform,
      {
        jobId: string;
        platform: Platform;
        success: boolean;
        applied: number;
        skipped: number;
        failed: number;
        alreadyApplied: number;
        noApplyButton: number;
        messages: string[];
        finishedAt: string;
      }
    >
  >;
}

export async function fetchAutomationStatusFromBackend(): Promise<{
  ok: boolean;
  status?: BackendAutomationStatus;
  error?: string;
}> {
  const result = await apiFetch<BackendAutomationStatus & { ok?: boolean }>(
    API_ROUTES.automationStatus,
    { method: "GET" }
  );

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error };
  }

  const { ok: _ok, ...status } = result.data;
  return {
    ok: true,
    status: {
      running: Boolean(status.running),
      platform: status.platform ?? null,
      runningPlatforms: status.runningPlatforms ?? [],
      jobId: status.jobId ?? null,
      lastRun: status.lastRun ?? null,
      lastRunsByPlatform: status.lastRunsByPlatform ?? {},
    },
  };
}

