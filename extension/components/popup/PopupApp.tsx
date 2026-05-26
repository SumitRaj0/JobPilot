import { useCallback, useEffect, useState } from "react";

import { sendToActiveTab, sendToBackground } from "~lib/messaging";
import type { ExtensionPageMetadata, TabState } from "~lib/messaging/types";

import "~style.css";

export function PopupApp() {
  const [tabState, setTabState] = useState<TabState | null>(null);
  const [liveMetadata, setLiveMetadata] = useState<ExtensionPageMetadata | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await sendToBackground<TabState>({ type: "GET_TAB_STATE" });
      setTabState(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tab state");
      setTabState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleFetchFromPage = async () => {
    try {
      const metadata = await sendToActiveTab<ExtensionPageMetadata | null>({
        type: "GET_PAGE_METADATA",
      });
      setLiveMetadata(metadata);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Content script not ready");
    }
  };

  const metadata = liveMetadata ?? tabState?.pageMetadata ?? null;

  return (
    <div className="aiapply-reset aiapply-w-[340px] aiapply-min-h-[220px] aiapply-bg-panel-bg aiapply-text-slate-200 aiapply-p-4">
      <header className="aiapply-mb-4">
        <h1 className="aiapply-text-base aiapply-font-semibold aiapply-text-white">
          AI Job Apply Agent
        </h1>
        <p className="aiapply-text-xs aiapply-text-panel-muted aiapply-mt-1">
          Use the panel on the job site (bottom-right)
        </p>
      </header>

      {loading && (
        <p className="aiapply-text-sm aiapply-text-panel-muted">Loading…</p>
      )}

      {!loading && tabState && (
        <section className="aiapply-space-y-2 aiapply-text-sm">
          <Row label="Site supported" value={tabState.supported ? "Yes" : "No"} />
          <Row label="Platform" value={tabState.platform ?? "—"} />
          <Row
            label="Automation"
            value={tabState.automationRunning ? "Running" : "Idle"}
          />
          <Row
            label="Backend sync"
            value={
              tabState.backendSynced
                ? "OK"
                : tabState.backendError
                  ? "Failed"
                  : "—"
            }
          />
          {metadata && (
            <>
              <Row label="Page type" value={metadata.pageType} />
              <Row label="URL" value={truncate(metadata.url, 36)} />
            </>
          )}
        </section>
      )}

      {tabState?.backendError && (
        <p className="aiapply-mt-2 aiapply-text-[10px] aiapply-text-amber-400">
          API: {tabState.backendError} (start backend on :3001)
        </p>
      )}

      {error && (
        <p className="aiapply-mt-3 aiapply-text-xs aiapply-text-red-400">{error}</p>
      )}

      <div className="aiapply-mt-4 aiapply-flex aiapply-flex-col aiapply-gap-2">
        <button
          type="button"
          onClick={() => void handleFetchFromPage()}
          className="aiapply-w-full aiapply-rounded-md aiapply-bg-panel-accent aiapply-px-3 aiapply-py-2 aiapply-text-sm aiapply-font-medium aiapply-text-white hover:aiapply-opacity-90"
        >
          Sync from page
        </button>
        <button
          type="button"
          onClick={() => void refresh()}
          className="aiapply-w-full aiapply-rounded-md aiapply-border aiapply-border-panel-border aiapply-px-3 aiapply-py-2 aiapply-text-sm hover:aiapply-bg-slate-800"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="aiapply-flex aiapply-justify-between aiapply-gap-2">
      <span className="aiapply-text-panel-muted">{label}</span>
      <span className="aiapply-font-medium aiapply-capitalize aiapply-text-right">
        {value}
      </span>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
