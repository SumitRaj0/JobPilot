import { detectPlatform } from "~lib/platform/detectPlatform";
import {
  fetchAutomationStatusFromBackend,
  startAutomationOnBackend,
  stopAutomationOnBackend,
  syncPageMetadataToBackend,
} from "~background/apiClient";
import type {
  AutomationStatus,
  ContentReadyPayload,
  ExtensionMessage,
  ExtensionPageMetadata,
  StartAutomationPayload,
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
      running: status.running,
      platform: status.platform ?? null,
      lastRun: status.lastRun ?? null,
      statusMessage: status.statusMessage ?? null,
      updatedAt: Date.now(),
    },
  });
}

async function refreshAutomationFromBackend(): Promise<AutomationStatus> {
  const remote = await fetchAutomationStatusFromBackend();

  if (!remote.ok || !remote.status) {
    return {
      running: automationRunning,
      platform: lastPageMetadata?.platform ?? null,
      error: remote.error,
    };
  }

  automationRunning = remote.status.running;
  const status: AutomationStatus = {
    running: remote.status.running,
    platform: remote.status.platform ?? lastPageMetadata?.platform ?? null,
    lastRun: remote.status.lastRun ?? null,
    statusMessage: remote.status.running
      ? "Worker is applying in its own browser (~20 min for 25 jobs). You can use other tabs."
      : formatLastRunMessage(remote.status.lastRun ?? null),
  };

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
            const { filters } = message.payload as StartAutomationPayload;
            const platform = lastPageMetadata?.platform;

            if (!platform) {
              return {
                running: false,
                error: "No platform detected — open a job site first",
              };
            }

            const apiResult = await startAutomationOnBackend({
              platform,
              filters,
              pageMetadata: lastPageMetadata,
            });

            lastBackendSync = { ok: apiResult.ok, error: apiResult.error };
            automationRunning = apiResult.ok;

            if (!apiResult.ok) {
              console.warn("[AI Apply] start failed", apiResult.error);
              return {
                running: false,
                platform,
                error: apiResult.error,
              };
            }

            console.info("[AI Apply] automation queued", apiResult.data);
            const status: AutomationStatus = {
              running: true,
              platform,
              statusMessage: "Queued on backend — running…",
            };
            await persistAutomationState(status);
            return status;
          }

          case "STOP_AUTOMATION": {
            const apiResult = await stopAutomationOnBackend(
              lastPageMetadata?.platform
            );
            automationRunning = false;
            lastBackendSync = { ok: apiResult.ok, error: apiResult.error };
            const status: AutomationStatus = {
              running: false,
              platform: lastPageMetadata?.platform ?? null,
              statusMessage: "Automation stopped",
            };
            await persistAutomationState(status);
            return status;
          }

          case "SYNC_AUTOMATION_STATUS":
            return refreshAutomationFromBackend();

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
