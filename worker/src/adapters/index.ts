import type { Platform } from "@aiapply/shared";

import { LinkedInAdapter } from "./linkedin.adapter.js";
import { NaukriAdapter } from "./naukri.adapter.js";
import type { IPlatformAdapter } from "./types.js";

const adapters: Partial<Record<Platform, IPlatformAdapter>> = {
  naukri: new NaukriAdapter(),
  linkedin: new LinkedInAdapter(),
};

export function getPlatformAdapter(platform: Platform): IPlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) throw new Error(`No Playwright adapter for: ${platform}`);
  return adapter;
}

export * from "./types.js";
export { BasePlatformAdapter } from "./base.adapter.js";
export { NaukriAdapter, NaukriSelectors } from "./naukri.adapter.js";
