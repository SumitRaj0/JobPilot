import { detectPlatform } from "~lib/platform/detectPlatform";
import {
  fetchAutomationStatusFromBackend,
  startAutomationOnBackend,
  stopAutomationOnBackend,
  syncPageMetadataToBackend,
} from "~background/apiClient";
import type { Platform } from "@aiapply/shared";
import type {
  AutomationStatus,
  ContentReadyPayload,
  ExtensionMessage,
  ExtensionPageMetadata,
  StartAutomationPayload,
  StopAutomationPayload,
  TabState,
} from "~lib/messaging/types";
import { STORAGE_KEYS } from "~lib/storage/keys";

let automationRunning = false;
let lastPageMetadata: ExtensionPageMetadata | null = null;
let lastBackendSync: { ok: boolean; error?: string } | null = null;

function formatLastRunMessage(
  lastRun: AutomationStatus["lastRun"]
): string | undefined {
  if (!lastRun) return undefined;
  const parts = [`${lastRun.applied} applied`];
  if (lastRun.alreadyApplied > 0) parts.push(`${lastRun.alreadyApplied} already applied`);
  if (lastRun.noApplyButton > 0) parts.push(`${lastRun.noApplyButton} no apply btn`);
  if (lastRun.failed > 0) parts.push(`${lastRun.failed} errors`);
  return `Finished — ${parts.join(", ")}`;
}

async function persistAutomationState(status: AutomationStatus): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.automationState]: {
      running: status.runningOnThisPlatform ?? status.running,
      platform: status.platform ?? null,
      runningPlatforms: status.runningPlatforms ?? [],
      lastRun: status.lastRun ?? null,
      statusMessage: status.statusMessage ?? null,
      updatedAt: Date.now(),
    },
  });
}

function resolveRunningPlatforms(status: {
  running: boolean;
  platform: Platform | null;
  runningPlatforms?: Platform[];
}): Platform[] {
  if (status.runningPlatforms?.length) return status.runningPlatforms;
  if (status.running && status.platform) return [status.platform];
  return [];
}

function statusForPlatform(
  remote: NonNullable<Awaited<ReturnType<typeof fetchAutomationStatusFromBackend>>["status"]>,
  panelPlatform: Platform | undefined
): AutomationStatus {
  const runningPlatforms = resolveRunningPlatforms(remote);
  const runningOnThisPlatform = panelPlatform
    ? runningPlatforms.includes(panelPlatform)
    : remote.running;

  const lastRunForPanel =
    (panelPlatform && remote.lastRunsByPlatform?.[panelPlatform]) ||
    (remote.lastRun?.platform === panelPlatform ? remote.lastRun : null) ||
    null;

  return {
    running: remote.running,
    runningOnThisPlatform,
    platform: panelPlatform ?? remote.platform ?? null,
    runningPlatforms,
    lastRun: lastRunForPanel,
    statusMessage: runningOnThisPlatform
      ? `Applying on ${panelPlatform} in the worker browser…`
      : remote.running && runningPlatforms.length > 0
        ? `Running on: ${runningPlatforms.join(", ")}`
        : formatLastRunMessage(lastRunForPanel),
  };
}

async function refreshAutomationFromBackend(
  panelPlatform?: Platform
): Promise<AutomationStatus> {
  const remote = await fetchAutomationStatusFromBackend();

  if (!remote.ok || !remote.status) {
    return {
      running: false,
      runningOnThisPlatform: false,
      platform: panelPlatform ?? lastPageMetadata?.platform ?? null,
      error: remote.error,
    };
  }

  automationRunning = remote.status.running;
  const status = statusForPlatform(remote.status, panelPlatform);
  await persistAutomationState(status);
  return status;
}

async function getActiveTabState(): Promise<TabState> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url;

  if (!url) {
    return {
      supported: false,
      platform: null,
      automationRunning,
      pageMetadata: lastPageMetadata,
      backendSynced: lastBackendSync?.ok ?? false,
      backendError: lastBackendSync?.error ?? null,
    };
  }

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return {
      supported: false,
      platform: null,
      automationRunning,
      pageMetadata: lastPageMetadata,
      backendSynced: lastBackendSync?.ok ?? false,
      backendError: lastBackendSync?.error ?? null,
    };
  }

  const platform = detectPlatform(hostname);

  return {
    supported: platform !== null,
    platform,
    url,
    automationRunning,
    pageMetadata: lastPageMetadata,
    backendSynced: lastBackendSync?.ok ?? false,
    backendError: lastBackendSync?.error ?? null,
  };
}

async function handlePageMetadata(
  metadata: ExtensionPageMetadata
): Promise<{ ok: boolean; sync: typeof lastBackendSync }> {
  lastPageMetadata = metadata;
  lastBackendSync = await syncPageMetadataToBackend(metadata);

  if (lastBackendSync.ok) {
    console.info("[AI Apply] metadata synced to backend", metadata.platform);
  } else {
    console.warn("[AI Apply] backend sync failed", lastBackendSync.error);
  }

  return { ok: true, sync: lastBackendSync };
}

export function registerMessageRouter(): void {
  chrome.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      const handle = async () => {
        switch (message.type) {
          case "PING":
            return { type: "PONG" as const };

          case "CONTENT_READY": {
            const payload = message.payload as ContentReadyPayload;
            console.info("[AI Apply] content ready", payload.platform, payload.url);
            return { ok: true };
          }

          case "GET_TAB_STATE":
            return getActiveTabState();

          case "GET_PAGE_METADATA":
            return lastPageMetadata;

          case "PAGE_METADATA":
            return handlePageMetadata(message.payload as ExtensionPageMetadata);

          case "START_AUTOMATION": {
            const payload = message.payload as StartAutomationPayload;
            const { filters, platform, pageMetadata: payloadMetadata } = payload;

            if (!platform) {
              return {
                running: false,
                error: "No platform specified for this tab",
              };
            }

            const pageMetadata =
              payloadMetadata ??
              (lastPageMetadata?.platform === platform ? lastPageMetadata : undefined);

            const apiResult = await startAutomationOnBackend({
              platform,
              filters,
              pageMetadata,
            });

            lastBackendSync = { ok: apiResult.ok, error: apiResult.error };
            automationRunning = apiResult.ok;

            if (!apiResult.ok) {
              console.warn("[AI Apply] start failed", apiResult.error);
              return {
                running: false,
                runningOnThisPlatform: false,
                platform,
                error: apiResult.error,
              };
            }

            console.info("[AI Apply] automation queued", platform, apiResult.data);
            const status: AutomationStatus = {
              running: true,
              runningOnThisPlatform: true,
              platform,
              runningPlatforms: [platform],
              statusMessage: `Queued ${platform} — running in worker browser…`,
            };
            await persistAutomationState(status);
            return status;
          }

          case "STOP_AUTOMATION": {
            const { platform } = (message.payload ?? {}) as StopAutomationPayload;

            if (!platform) {
              return {
                running: false,
                error: "No platform specified for this tab",
              };
            }

            const apiResult = await stopAutomationOnBackend(platform);
            lastBackendSync = { ok: apiResult.ok, error: apiResult.error };

            const refreshed = await refreshAutomationFromBackend(platform);
            const status: AutomationStatus = {
              ...refreshed,
              runningOnThisPlatform: false,
              statusMessage: `${platform} automation stopped`,
            };
            await persistAutomationState(status);
            return status;
          }

          case "SYNC_AUTOMATION_STATUS": {
            const panelPlatform = (message.payload as { platform?: Platform } | undefined)
              ?.platform;
            return refreshAutomationFromBackend(panelPlatform);
          }

          case "AUTOMATION_STATUS":
            return refreshAutomationFromBackend();

          default:
            return { error: "Unknown message type" };
        }
      };

      void handle().then(sendResponse);
      return true;
    }
  );

  // Poll backend while jobs may be running (updates all tabs via storage)
  setInterval(() => {
    if (!automationRunning) return;
    void refreshAutomationFromBackend();
  }, 4000);
}
