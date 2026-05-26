import type { ExtensionPageMetadata, Platform } from "@aiapply/shared";

export interface PlatformAdapter {
  platform: Platform;
  matches(hostname: string): boolean;
  getPageType(url: string): string;
  extractExtras(document: Document, url: string): Record<string, string>;
}

export type { ExtensionPageMetadata };
