import type { Platform } from "@aiapply/shared";
import type { CSSProperties, PointerEvent } from "react";

import { RobotIcon } from "~components/panel/icons";

interface AssistantOrbProps {
  platform: Platform;
  running: boolean;
  appliedCount: number;
  entering?: boolean;
  positionStyle: CSSProperties;
  onPointerDown: (e: PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLElement>) => void;
  onExpand: () => void;
  consumeClick: () => boolean;
}

const PLATFORM_LABEL: Record<Platform, string> = {
  naukri: "Naukri",
  linkedin: "LinkedIn",
  indeed: "Indeed",
};

export function AssistantOrb({
  platform,
  running,
  appliedCount,
  entering = false,
  positionStyle,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onExpand,
  consumeClick,
}: AssistantOrbProps) {
  const title = running ? "AI Job Agent Active" : "AI Job Agent";

  return (
    <div
      data-aiapply-panel
      className={`aiapply-reset aiapply-fixed aiapply-z-[2147483647] aiapply-orb-wrap ${entering ? "aiapply-orb-enter" : ""}`}
      style={positionStyle}
    >
      <div
        className={`aiapply-orb-shell ${running ? "aiapply-orb-shell--running" : ""}`}
        role="presentation"
      >
        <button
          type="button"
          className="aiapply-orb"
          aria-label={running ? "Automation running — expand panel" : "Open AI Job Agent"}
          onClick={() => {
            if (consumeClick()) return;
            onExpand();
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {running ? (
            <span className="aiapply-spinner" aria-hidden />
          ) : (
            <RobotIcon size={22} />
          )}
        </button>
        <span
          className={`aiapply-orb-status ${running ? "aiapply-orb-status--live" : ""}`}
          aria-hidden
        />
      </div>

      <div className="aiapply-orb-tooltip aiapply-orb-tooltip--br" role="tooltip">
        <p className="aiapply-m-0 aiapply-text-xs aiapply-font-semibold aiapply-text-white">
          {title}
        </p>
        <p className="aiapply-m-0 aiapply-mt-1 aiapply-text-[10px] aiapply-text-slate-400">
          {PLATFORM_LABEL[platform]}
          {appliedCount > 0 ? ` · ${appliedCount} applied` : ""}
        </p>
      </div>
    </div>
  );
}
