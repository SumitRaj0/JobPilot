import { useCallback, useEffect, useRef, useState } from "react";

import { sendToBackground } from "~lib/messaging";
import type { ExtensionPageMetadata } from "~lib/platform/types";
import type { Platform } from "@aiapply/shared";

import { createContentMessageBridge } from "./messageBridge";
import { collectPageMetadata, publishPageMetadata } from "./metadataPublisher";
import { watchUrlChanges } from "./urlWatcher";
import { detectPlatformAdapter } from "~lib/platform/registry";

export function useJobSiteContent() {
  const [platform, setPlatform] = useState<Platform | null>(() =>
    detectPlatformAdapter(window.location.hostname)?.platform ?? null
  );
  const metadataRef = useRef<ExtensionPageMetadata | null>(null);

  const syncMetadata = useCallback(async () => {
    const adapter = detectPlatformAdapter(window.location.hostname);
    if (!adapter) {
      metadataRef.current = null;
      setPlatform(null);
      return;
    }

    setPlatform(adapter.platform);
    const metadata = await publishPageMetadata(collectPageMetadata());
    metadataRef.current = metadata;
  }, []);

  useEffect(() => {
    void syncMetadata();

    const adapter = detectPlatformAdapter(window.location.hostname);
    if (adapter) {
      void sendToBackground({
        type: "CONTENT_READY",
        payload: { platform: adapter.platform, url: window.location.href },
      });
    }

    return watchUrlChanges(() => {
      void syncMetadata();
    });
  }, [syncMetadata]);

  useEffect(() => {
    if (!platform) return;

    return createContentMessageBridge({
      platform,
      getMetadata: () => metadataRef.current ?? collectPageMetadata(),
    });
  }, [platform]);

  return { platform, metadata: metadataRef.current };
}
