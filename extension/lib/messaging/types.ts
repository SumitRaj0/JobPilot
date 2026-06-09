import type {
  ExtensionPageMetadata,
  JobFilters,
  NaukriFilterBreakdown,
  Platform,
} from "@aiapply/shared";

export type MessageType =
  | "PING"
  | "PONG"
  | "CONTENT_READY"
  | "GET_TAB_STATE"
  | "TAB_STATE"
  | "GET_PAGE_METADATA"
  | "PAGE_METADATA"
  | "START_AUTOMATION"
  | "STOP_AUTOMATION"
  | "AUTOMATION_STATUS"
  | "SYNC_AUTOMATION_STATUS";

export type { ExtensionPageMetadata };

export interface ContentReadyPayload {
  platform: Platform;
  url: string;
}

export interface TabState {
  supported: boolean;
  platform: Platform | null;
  url?: string;
  automationRunning: boolean;
  pageMetadata?: ExtensionPageMetadata | null;
  backendSynced?: boolean;
  backendError?: string | null;
}

export interface AutomationLastRun {
  jobId: string;
  platform: Platform;
  success: boolean;
  applied: number;
  skipped: number;
  failed: number;
  alreadyApplied: number;
  noApplyButton: number;
  messages: string[];
  filterBreakdown?: NaukriFilterBreakdown;
  recommendedStats?: {
    found: number;
    matched: number;
    ready: number;
    applied: number;
    skipped: number;
    failed: number;
    successRate: number;
  };
  finishedAt: string;
}

export interface AutomationStatus {
  running: boolean;
  platform?: Platform | null;
  runningPlatforms?: Platform[];
  /** True when this panel’s platform is in the active worker run set */
  runningOnThisPlatform?: boolean;
  error?: string;
  lastRun?: AutomationLastRun | null;
  statusMessage?: string;
}

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface StartAutomationPayload {
  filters: JobFilters;
  /** Tab’s job site — start only this platform’s worker job */
  platform: Platform;
  pageMetadata?: ExtensionPageMetadata;
}

export interface StopAutomationPayload {
  platform: Platform;
}

export interface PingPongPayload {
  platform?: Platform;
  metadata?: ExtensionPageMetadata | null;
}
