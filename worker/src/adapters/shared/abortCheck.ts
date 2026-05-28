import type { RunContext } from "../types.js";

export async function isRunAborted(ctx?: RunContext): Promise<boolean> {
  if (!ctx?.shouldAbort) return false;
  return ctx.shouldAbort();
}
