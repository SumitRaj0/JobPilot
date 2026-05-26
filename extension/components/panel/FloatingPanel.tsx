import type { Platform } from "@aiapply/shared";
import { useCallback, useEffect, useState } from "react";

import { AssistantOrb } from "~components/panel/AssistantOrb";
import { FilterForm } from "~components/panel/FilterForm";
import { PanelFooter } from "~components/panel/PanelFooter";
import { PanelHeader } from "~components/panel/PanelHeader";
import { RunStatusLine } from "~components/panel/RunStatusLine";
import { RunTimer } from "~components/panel/RunTimer";
import { normalizeLastRun } from "~lib/automation/estimates";
import { useDraggable } from "~lib/hooks/useDraggable";
import { usePersistedFilters } from "~lib/hooks/usePersistedFilters";
import { sendToBackground } from "~lib/messaging";
import type {
  AutomationLastRun,
  AutomationStatus,
  StartAutomationPayload,
} from "~lib/messaging/types";
import { STORAGE_KEYS } from "~lib/storage/keys";
import type { FilterFieldKey } from "~lib/validation/jobFilters";
import {
  sanitizeJobFilters,
  validateJobFilters,
} from "~lib/validation/jobFilters";

interface FloatingPanelProps {
  platform: Platform;
}

export function FloatingPanel({ platform }: FloatingPanelProps) {
  const { filters, updateFilters, ready } = usePersistedFilters();
  const [collapsed, setCollapsed] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<AutomationLastRun | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [panelEntering, setPanelEntering] = useState(false);
  const [orbEntering, setOrbEntering] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FilterFieldKey, string>>
  >({});
  const [formWarning, setFormWarning] = useState<string | null>(null);

  const {
    positionStyle,
    onDragHandlePointerDown,
    onDragHandlePointerMove,
    onDragHandlePointerUp,
    consumeClick,
    resetToBottomRight,
  } = useDraggable(collapsed);

  const syncRunning = useCallback((status: AutomationStatus) => {
    setRunning((wasRunning) => {
      if (status.running && !wasRunning) {
        setRunStartedAt(Date.now());
        setLastRun(null);
        setStatusText(null);
      }
      return status.running;
    });

    if (!status.running) {
      setRunStartedAt(null);
      if (status.lastRun) {
        setLastRun(normalizeLastRun(status.lastRun));
      }
      if (status.statusMessage) setStatusText(status.statusMessage);
    }
  }, []);

  useEffect(() => {
    chrome.storage.local.get(
      [STORAGE_KEYS.panelCollapsed, STORAGE_KEYS.automationState],
      (result) => {
        setCollapsed(Boolean(result[STORAGE_KEYS.panelCollapsed]));
        const state = result[STORAGE_KEYS.automationState] as
          | {
              running?: boolean;
              lastRun?: AutomationLastRun | null;
              statusMessage?: string | null;
              runStartedAt?: number | null;
            }
          | undefined;
        if (state?.running) {
          setRunning(true);
          setRunStartedAt(state.runStartedAt ?? Date.now());
        }
        if (state?.lastRun && !state?.running) {
          setLastRun(normalizeLastRun(state.lastRun));
        }
        if (state?.statusMessage) setStatusText(state.statusMessage);
      }
    );
  }, []);

  useEffect(() => {
    void sendToBackground<AutomationStatus>({ type: "SYNC_AUTOMATION_STATUS" }).then(
      syncRunning
    );
  }, [syncRunning]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      void sendToBackground<AutomationStatus>({ type: "SYNC_AUTOMATION_STATUS" }).then(
        syncRunning
      );
    }, 4000);
    return () => window.clearInterval(id);
  }, [running, syncRunning]);

  useEffect(() => {
    void chrome.storage.local.set({
      [STORAGE_KEYS.automationState]: {
        running,
        lastRun,
        statusMessage: statusText,
        runStartedAt,
        updatedAt: Date.now(),
      },
    });
  }, [running, lastRun, statusText, runStartedAt]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      void chrome.storage.local.set({ [STORAGE_KEYS.panelCollapsed]: next });

      if (next) {
        resetToBottomRight();
        setOrbEntering(true);
        window.setTimeout(() => setOrbEntering(false), 320);
      } else {
        resetToBottomRight();
        setPanelEntering(true);
        window.setTimeout(() => setPanelEntering(false), 420);
      }
      return next;
    });
  }, [resetToBottomRight]);

  const clearFieldError = useCallback((field: FilterFieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleStart = async () => {
    const validation = validateJobFilters(filters);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      const first = Object.values(validation.errors)[0];
      setStatusText(first ?? "Fix the highlighted fields");
      setFormWarning(null);
      return;
    }

    const sanitized = sanitizeJobFilters(filters);
    if (sanitized.role !== filters.role) {
      updateFilters({ role: sanitized.role });
    }

    setFieldErrors({});
    setFormWarning(validation.warnings[0] ?? null);
    setBusy(true);
    setStatusText(null);
    setLastRun(null);
    try {
      const payload: StartAutomationPayload = { filters: sanitized };
      const status = await sendToBackground<AutomationStatus>({
        type: "START_AUTOMATION",
        payload,
      });
      if (status.running) {
        setRunning(true);
        setRunStartedAt(Date.now());
      } else {
        setRunning(false);
        setStatusText(
          status.error ?? "Failed to start — is the backend running on :3001?"
        );
      }
    } catch {
      setStatusText("Failed to start");
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    try {
      const status = await sendToBackground<AutomationStatus>({
        type: "STOP_AUTOMATION",
      });
      setRunning(status.running);
      setRunStartedAt(null);
      setStatusText("Automation stopped");
      setLastRun(null);
    } catch {
      setStatusText("Failed to stop");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  const appliedCount = lastRun?.applied ?? 0;
  const showTimer = running && runStartedAt != null;
  const showStatusLine = !running && lastRun != null;
  const showIdleError = !running && !lastRun && statusText != null;

  if (collapsed) {
    return (
      <AssistantOrb
        platform={platform}
        running={running}
        appliedCount={appliedCount}
        entering={orbEntering}
        positionStyle={positionStyle}
        onPointerDown={onDragHandlePointerDown}
        onPointerMove={onDragHandlePointerMove}
        onPointerUp={onDragHandlePointerUp}
        onExpand={toggleCollapsed}
        consumeClick={consumeClick}
      />
    );
  }

  return (
    <div
      data-aiapply-panel
      className={`aiapply-reset aiapply-fixed aiapply-z-[2147483647] aiapply-panel-anchor ${panelEntering ? "aiapply-panel-enter" : ""}`}
      style={positionStyle}
    >
      <div className="aiapply-panel-shell">
        <div className="aiapply-glass-panel">
          <PanelHeader
            platform={platform}
            running={running}
            onDragPointerDown={onDragHandlePointerDown}
            onDragPointerMove={onDragHandlePointerMove}
            onDragPointerUp={onDragHandlePointerUp}
            onMinimize={toggleCollapsed}
          />

          <div className="aiapply-panel-scroll">
            <div className="aiapply-space-y-3 aiapply-pt-3 aiapply-pb-2">
              {showTimer && <RunTimer runStartedAt={runStartedAt} />}
              {showStatusLine && <RunStatusLine lastRun={lastRun} />}
              {formWarning && !running && (
                <p className="aiapply-alert-warn" role="status">
                  {formWarning}
                </p>
              )}
              {showIdleError && (
                <p className="aiapply-alert-error" role="alert">
                  {statusText}
                </p>
              )}
              <FilterForm
                filters={filters}
                disabled={running || busy}
                errors={fieldErrors}
                onChange={updateFilters}
                onClearError={clearFieldError}
              />
            </div>
          </div>

          <PanelFooter
            platform={platform}
            running={running}
            busy={busy}
            lastRun={lastRun}
            showStart={!running}
            showStop={running}
            onStart={() => void handleStart()}
            onStop={() => void handleStop()}
          />
        </div>
      </div>
    </div>
  );
}
