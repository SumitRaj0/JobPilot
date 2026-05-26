/** Backend API base URL (Plasmo inlines PLASMO_PUBLIC_* at build time) */
export const API_BASE_URL =
  process.env.PLASMO_PUBLIC_API_URL ?? "http://localhost:3001";

export const API_ROUTES = {
  pageMetadata: "/api/extension/page-metadata",
  automationStart: "/api/automation/start",
  automationStop: "/api/automation/stop",
  automationStatus: "/api/automation/status",
  automationComplete: "/api/automation/complete",
} as const;
