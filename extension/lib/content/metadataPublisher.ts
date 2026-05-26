import { sendToBackground } from "~lib/messaging";
import {
  buildPageMetadata,
  detectPlatformAdapter,
} from "~lib/platform/registry";
import type { ExtensionPageMetadata } from "~lib/platform/types";

export function collectPageMetadata(): ExtensionPageMetadata | null {
  const adapter = detectPlatformAdapter(window.location.hostname);
  if (!adapter) return null;
  return buildPageMetadata(adapter);
}

export async function publishPageMetadata(
  metadata?: ExtensionPageMetadata | null
): Promise<ExtensionPageMetadata | null> {
  const data = metadata ?? collectPageMetadata();
  if (!data) return null;

  await sendToBackground({
    type: "PAGE_METADATA",
    payload: data,
  });

  return data;
}
