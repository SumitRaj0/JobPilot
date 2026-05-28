import type { Platform } from "@aiapply/shared";

import type { IPlatformAdapter } from "./base.adapter.js";
import { LinkedInAdapter } from "./linkedin.adapter.js";
import { NaukriAdapter } from "./naukri.adapter.js";

const adapters: Partial<Record<Platform, IPlatformAdapter>> = {
  naukri: new NaukriAdapter(),
  linkedin: new LinkedInAdapter(),
};

export function getPlatformAdapter(platform: Platform): IPlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return adapter;
}

export { BasePlatformAdapter } from "./base.adapter.js";
export type { IPlatformAdapter } from "./base.adapter.js";
