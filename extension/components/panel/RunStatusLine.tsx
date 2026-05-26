import type { AutomationLastRun } from "~lib/messaging/types";
import { buildRunStatusSummary, normalizeLastRun } from "~lib/automation/estimates";

interface RunStatusLineProps {
  lastRun: AutomationLastRun;
}

export function RunStatusLine({ lastRun }: RunStatusLineProps) {
  const run = normalizeLastRun(lastRun);
  const summary = buildRunStatusSummary(run);

  return (
    <div className="aiapply-glass-card aiapply-p-3" role="status" aria-live="polite">
      <p className="aiapply-m-0 aiapply-mb-1.5 aiapply-text-[10px] aiapply-font-medium aiapply-uppercase aiapply-tracking-wider aiapply-text-slate-500">
        Run complete
      </p>
      <p
        className={`aiapply-m-0 aiapply-text-sm aiapply-font-semibold aiapply-leading-snug ${summary.colorClass}`}
      >
        {summary.line}
      </p>
    </div>
  );
}
