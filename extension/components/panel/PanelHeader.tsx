import type { Platform } from "@aiapply/shared";
import type { PointerEvent } from "react";

import { MinimizeIcon, RobotIcon, SettingsIcon } from "~components/panel/icons";

interface PanelHeaderProps {
  platform: Platform;
  running: boolean;
  onDragPointerDown: (e: PointerEvent<HTMLElement>) => void;
  onDragPointerMove: (e: PointerEvent<HTMLElement>) => void;
  onDragPointerUp: (e: PointerEvent<HTMLElement>) => void;
  onMinimize: () => void;
}

const PLATFORM_LABEL: Partial<Record<Platform, string>> = {
  naukri: "Naukri",
  linkedin: "LinkedIn",
};

export function PanelHeader({
  platform,
  running,
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerUp,
  onMinimize,
}: PanelHeaderProps) {
  return (
    <header className="aiapply-panel-header">
      <div
        className="aiapply-flex aiapply-items-start aiapply-gap-3 aiapply-cursor-grab active:aiapply-cursor-grabbing"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
      >
        <div className="aiapply-logo-ring aiapply-shrink-0 aiapply-text-sky-300">
          <RobotIcon size={20} />
        </div>
        <div className="aiapply-min-w-0 aiapply-flex-1">
          <div className="aiapply-flex aiapply-flex-wrap aiapply-items-center aiapply-gap-2">
            <h1 className="aiapply-m-0 aiapply-text-[15px] aiapply-font-semibold aiapply-tracking-tight aiapply-text-white">
              AI Job Agent
            </h1>
          </div>
          <p className="aiapply-m-0 aiapply-mt-0.5 aiapply-text-[11px] aiapply-text-slate-500">
            Your personal job hunter
          </p>
          <div className="aiapply-info-bar">
            <span
              className={`aiapply-platform-badge aiapply-platform-badge--${platform}`}
            >
              {PLATFORM_LABEL[platform] ?? "Unsupported"}
            </span>
            <span className="aiapply-info-bar-divider" aria-hidden />
            <span
              className={`aiapply-status-pill ${running ? "aiapply-status-pill--active" : ""}`}
            >
              <span
                className={`aiapply-status-dot ${running ? "aiapply-status-dot--live" : ""}`}
              />
              {running ? "Running" : "Ready"}
            </span>
            <span className="aiapply-info-bar-divider" aria-hidden />
            <span className="aiapply-mode-chip">Smart</span>
          </div>
        </div>
        <div className="aiapply-flex aiapply-shrink-0 aiapply-gap-1">
          <button
            type="button"
            className="aiapply-icon-btn"
            aria-label="Settings"
            title="Settings (coming soon)"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <SettingsIcon />
          </button>
          <button
            type="button"
            className="aiapply-icon-btn"
            aria-label="Minimize to assistant orb"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
          >
            <MinimizeIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
