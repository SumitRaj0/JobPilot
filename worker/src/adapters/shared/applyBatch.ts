export interface ApplyBatchResult {
  applied: number;
  skipped: number;
  failed: number;
  alreadyApplied: number;
  noApplyButton: number;
  processedJobIds: string[];
  messages: string[];
}

export function emptyApplyBatch(): ApplyBatchResult {
  return {
    applied: 0,
    skipped: 0,
    failed: 0,
    alreadyApplied: 0,
    noApplyButton: 0,
    processedJobIds: [],
    messages: [],
  };
}

export function mergeApplyBatch(
  a: ApplyBatchResult,
  b: ApplyBatchResult
): ApplyBatchResult {
  return {
    applied: a.applied + b.applied,
    skipped: a.skipped + b.skipped,
    failed: a.failed + b.failed,
    alreadyApplied: a.alreadyApplied + b.alreadyApplied,
    noApplyButton: a.noApplyButton + b.noApplyButton,
    processedJobIds: [...a.processedJobIds, ...b.processedJobIds],
    messages: [...a.messages, ...b.messages],
  };
}
