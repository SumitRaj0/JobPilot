import type { Platform } from "@aiapply/shared";

import type { AutomationLastRun } from "~lib/messaging/types";

import { PlayIcon, StopIcon } from "~components/panel/icons";
import { normalizeLastRun } from "~lib/automation/estimates";

interface PanelFooterProps {
  platform: Platform;
  running: boolean;
  busy: boolean;
  lastRun: AutomationLastRun | null;
  showStart: boolean;
  showStop: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function PanelFooter({
  platform,
  running,
  busy,
  lastRun,
  showStart,
  showStop,
  onStart,
  onStop,
}: PanelFooterProps) {
  const stats = lastRun ? normalizeLastRun(lastRun) : null;
  const applied = stats?.applied ?? 0;
  const failed = stats?.failed ?? 0;
  const skipped =
    (stats?.skipped ?? 0) +
    (stats?.alreadyApplied ?? 0) +
    (stats?.noApplyButton ?? 0);

  return (
    <footer className="aiapply-panel-footer">
      <div className="aiapply-stats-grid">
        <div className="aiapply-stat">
          <span className="aiapply-stat-icon" aria-hidden>
            ✓
          </span>
          <span className="aiapply-stat-value aiapply-stat-value--applied">
            {running ? "…" : applied}
          </span>
          <span className="aiapply-stat-label">Applied</span>
        </div>
        <div className="aiapply-stat">
          <span className="aiapply-stat-icon" aria-hidden>
            ✕
          </span>
          <span className="aiapply-stat-value aiapply-stat-value--failed">
            {running ? "…" : failed}
          </span>
          <span className="aiapply-stat-label">Failed</span>
        </div>
        <div className="aiapply-stat">
          <span className="aiapply-stat-icon" aria-hidden>
            ⊘
          </span>
          <span className="aiapply-stat-value aiapply-stat-value--skipped">
            {running ? "…" : skipped}
          </span>
          <span className="aiapply-stat-label">Skipped</span>
        </div>
      </div>

      <p className="aiapply-mb-3 aiapply-flex aiapply-items-center aiapply-gap-1.5 aiapply-text-[10px] aiapply-text-slate-500">
        <span
          className={`aiapply-status-dot ${running ? "aiapply-status-dot--live" : ""}`}
        />
        {running
          ? `Scanning ${platform}…`
          : `Platform: ${platform} · Idle`}
      </p>

      {showStart && (
        <button
          type="button"
          className="aiapply-btn-start"
          disabled={busy}
          onClick={onStart}
        >
          <PlayIcon />
          {busy ? "Starting…" : "Start Auto Apply"}
        </button>
      )}
      {showStop && (
        <button
          type="button"
          className="aiapply-btn-stop"
          disabled={busy}
          onClick={onStop}
        >
          <StopIcon />
          Stop Automation
        </button>
      )}
    </footer>
  );
}
