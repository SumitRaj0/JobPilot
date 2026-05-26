import type { ExtensionPageMetadata } from "@aiapply/shared";

import { isDatabaseConnected } from "../config/database.js";

const recentMetadata = new Map<string, ExtensionPageMetadata>();

function cacheKey(metadata: ExtensionPageMetadata): string {
  return `${metadata.platform}:${metadata.hostname}`;
}

export class ExtensionService {
  async recordPageMetadata(
    metadata: ExtensionPageMetadata
  ): Promise<{ stored: boolean; key: string }> {
    const key = cacheKey(metadata);
    recentMetadata.set(key, metadata);

    // MongoDB persistence lands in Step 9
    if (isDatabaseConnected()) {
      // placeholder for logs collection
    }

    return { stored: true, key };
  }

  getLatestMetadata(platform?: string): ExtensionPageMetadata | null {
    if (platform) {
      for (const meta of recentMetadata.values()) {
        if (meta.platform === platform) return meta;
      }
      return null;
    }
    const last = [...recentMetadata.values()].at(-1);
    return last ?? null;
  }
}

export const extensionService = new ExtensionService();
