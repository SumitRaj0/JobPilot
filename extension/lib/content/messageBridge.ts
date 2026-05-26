import { sendToBackground } from "~lib/messaging";
import type { ExtensionMessage } from "~lib/messaging/types";
import type { ExtensionPageMetadata } from "~lib/platform/types";
import type { Platform } from "@aiapply/shared";

import { collectPageMetadata } from "./metadataPublisher";

export interface ContentBridgeHandlers {
  platform: Platform;
  getMetadata: () => ExtensionPageMetadata | null;
}

export function createContentMessageBridge(handlers: ContentBridgeHandlers) {
  const listener = (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean => {
    switch (message.type) {
      case "PING":
        sendResponse({
          type: "PONG",
          payload: {
            platform: handlers.platform,
            metadata: handlers.getMetadata(),
          },
        });
        return true;

      case "GET_PAGE_METADATA": {
        const metadata = handlers.getMetadata() ?? collectPageMetadata();
        sendResponse(metadata);
        return true;
      }

      case "START_AUTOMATION":
      case "STOP_AUTOMATION":
        void sendToBackground(message).then(sendResponse);
        return true;

      default:
        return false;
    }
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
