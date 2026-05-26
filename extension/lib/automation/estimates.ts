import type { AutomationLastRun } from "~lib/messaging/types";

/** Session target for timer and status copy. */
export const TARGET_APPLICATIONS = 50;

/** 50 applications in ~15 minutes => ~18s per attempt (900 / 50). */
export const SECONDS_PER_JOB_ATTEMPT = 18;

export function isUnlimitedTarget(jobCount = TARGET_APPLICATIONS): boolean {
  return jobCount <= 0;
}

export function estimateJobCountForTimer(jobCount = TARGET_APPLICATIONS): number {
  return jobCount;
}

export function estimateRunDurationSeconds(jobCount = TARGET_APPLICATIONS): number {
  return estimateJobCountForTimer(jobCount) * SECONDS_PER_JOB_ATTEMPT;
}

export function targetApplicationsLabel(jobCount = TARGET_APPLICATIONS): string {
  return isUnlimitedTarget(jobCount) ? "all matching jobs" : String(jobCount);
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `~${h}h ${rm}m left`;
  }
  return m > 0 ? `~${m}m ${r}s left` : `~${r}s left`;
}

/** MM:SS for the running-state timer (estimated, not exact). */
export function formatEstimatedTimeRemaining(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** True apply rate: successes vs real errors only (not no-apply / already-applied). */
export function applySuccessPercent(applied: number, failed: number): number {
  const total = applied + failed;
  if (total === 0) return 0;
  return Math.round((applied / total) * 100);
}

export function normalizeLastRun(
  run: Partial<AutomationLastRun> & Pick<AutomationLastRun, "applied" | "failed">
): AutomationLastRun {
  return {
    jobId: run.jobId ?? "",
    platform: run.platform ?? "naukri",
    success: run.success ?? false,
    applied: run.applied,
    skipped: run.skipped ?? 0,
    failed: run.failed,
    alreadyApplied: run.alreadyApplied ?? 0,
    noApplyButton: run.noApplyButton ?? 0,
    messages: run.messages ?? [],
    finishedAt: run.finishedAt ?? new Date().toISOString(),
  };
}

export type RunStatusTone = "success" | "error" | "neutral";

export interface RunStatusSummary {
  applied: number;
  failed: number;
  skipped: number;
  totalTarget: number;
  percent: number;
  line: string;
  tone: RunStatusTone;
  colorClass: string;
}

/** Parse apply target from worker messages. */
export function parseTargetFromMessages(messages: string[]): number {
  for (const m of messages) {
    if (/no limit|no application limit|all matching jobs/i.test(m)) {
      return 0;
    }
    const match = m.match(/of\s+(\d+)\s+target/i);
    if (match) return Number.parseInt(match[1]!, 10);
  }
  return TARGET_APPLICATIONS;
}

function runStatusTone(applied: number, failed: number): RunStatusTone {
  if (failed > 0) return "error";
  if (applied > 0) return "success";
  return "neutral";
}

function toneColorClass(tone: RunStatusTone): string {
  switch (tone) {
    case "error":
      return "aiapply-text-red-400";
    case "success":
      return "aiapply-text-emerald-400";
    default:
      return "aiapply-text-panel-muted";
  }
}

/**
 * Single-line task status for the panel (color: red if errors, green if all OK, else neutral).
 */
export function buildRunStatusSummary(run: AutomationLastRun): RunStatusSummary {
  const applied = run.applied;
  const failed = run.failed;
  const skipped =
    run.skipped + run.alreadyApplied + run.noApplyButton;
  const totalTarget = parseTargetFromMessages(run.messages);
  const unlimited = isUnlimitedTarget(totalTarget);
  const percent = applySuccessPercent(applied, failed);
  const tone = runStatusTone(applied, failed);

  let line = unlimited
    ? `Applied ${applied} matching jobs. Finished.`
    : `Applied ${applied} of ${totalTarget} items. Finished.`;
  if (failed > 0) {
    line += ` (${failed} errors — ${percent}% success rate)`;
  } else if (applied > 0) {
    line += ` (${percent}% success rate)`;
  }
  if (skipped > 0) {
    line += ` · ${skipped} skipped`;
  }

  return {
    applied,
    failed,
    skipped,
    totalTarget,
    percent,
    tone,
    colorClass: toneColorClass(tone),
    line,
  };
}
