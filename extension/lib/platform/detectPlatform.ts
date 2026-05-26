import type { Platform } from "@aiapply/shared";

import { detectPlatformAdapter } from "~lib/platform/registry";

/** Resolve platform id from hostname */
export function detectPlatform(hostname: string): Platform | null {
  return detectPlatformAdapter(hostname)?.platform ?? null;
}

export function isSupportedHost(hostname: string): boolean {
  return detectPlatform(hostname) !== null;
}
