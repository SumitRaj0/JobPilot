import { useEffect, useState } from "react";

import {
  estimateRunDurationSeconds,
  formatEstimatedTimeRemaining,
  targetApplicationsLabel,
} from "~lib/automation/estimates";

interface RunTimerProps {
  runStartedAt: number;
  /** Called once when estimated session time reaches zero. */
  onTimeExpired?: () => void;
}

export function RunTimer({ runStartedAt, onTimeExpired }: RunTimerProps) {
  const [, setTick] = useState(0);
  const [expiredFired, setExpiredFired] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedSec = Math.floor((Date.now() - runStartedAt) / 1000);
  const totalEst = estimateRunDurationSeconds();
  const remainingSec = Math.max(0, totalEst - elapsedSec);

  useEffect(() => {
    if (remainingSec > 0 || expiredFired || !onTimeExpired) return;
    setExpiredFired(true);
    onTimeExpired();
  }, [remainingSec, expiredFired, onTimeExpired]);

  return (
    <div
      className="aiapply-glass-card aiapply-p-3 aiapply-space-y-2.5"
      role="timer"
      aria-live="polite"
    >
      <div className="aiapply-flex aiapply-items-center aiapply-gap-2">
        <span className="aiapply-spinner" aria-hidden />
        <p className="aiapply-m-0 aiapply-text-xs aiapply-font-semibold aiapply-text-white">
          Auto apply in progress
        </p>
      </div>
      <p className="aiapply-m-0 aiapply-text-lg aiapply-font-mono aiapply-tabular-nums aiapply-tracking-tight aiapply-text-white">
        <span className="aiapply-text-[11px] aiapply-font-sans aiapply-font-normal aiapply-text-slate-500">
          Est. remaining{" "}
        </span>
        {formatEstimatedTimeRemaining(remainingSec)}
      </p>
      <div className="aiapply-progress-track" aria-hidden>
        <div
          className="aiapply-progress-bar"
          style={{
            width: `${Math.min(98, (elapsedSec / totalEst) * 100)}%`,
          }}
        />
      </div>
      <p className="aiapply-m-0 aiapply-text-[10px] aiapply-leading-relaxed aiapply-text-slate-500">
        {targetApplicationsLabel()} · you can switch tabs. Keep the worker browser open.
      </p>
    </div>
  );
}
