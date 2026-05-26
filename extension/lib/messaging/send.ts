import type { ExtensionMessage } from "./types";

export async function sendToBackground<TResponse = unknown>(
  message: ExtensionMessage
): Promise<TResponse> {
  return chrome.runtime.sendMessage(message) as Promise<TResponse>;
}

export async function sendToActiveTab<TResponse = unknown>(
  message: ExtensionMessage
): Promise<TResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab");
  }
  return chrome.tabs.sendMessage(tab.id, message) as Promise<TResponse>;
}
