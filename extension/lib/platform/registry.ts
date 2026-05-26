import { indeedAdapter } from "~lib/platform/adapters/indeed";
import { linkedinAdapter } from "~lib/platform/adapters/linkedin";
import { naukriAdapter } from "~lib/platform/adapters/naukri";
import type { ExtensionPageMetadata, PlatformAdapter } from "~lib/platform/types";
import type { Platform } from "@aiapply/shared";

const adapters: PlatformAdapter[] = [naukriAdapter, linkedinAdapter, indeedAdapter];

export function getPlatformAdapter(platform: Platform): PlatformAdapter | null {
  return adapters.find((a) => a.platform === platform) ?? null;
}

export function detectPlatformAdapter(hostname: string): PlatformAdapter | null {
  return adapters.find((a) => a.matches(hostname)) ?? null;
}

export function buildPageMetadata(
  adapter: PlatformAdapter,
  doc: Document = document
): ExtensionPageMetadata {
  const url = doc.defaultView?.location.href ?? window.location.href;
  const hostname = doc.defaultView?.location.hostname ?? window.location.hostname;

  return {
    platform: adapter.platform,
    url,
    title: doc.title,
    hostname,
    pageType: adapter.getPageType(url),
    extractedAt: new Date().toISOString(),
    extras: adapter.extractExtras(doc, url),
  };
}

export { adapters };
