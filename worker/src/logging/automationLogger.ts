import type { Platform } from "@aiapply/shared";

export class AutomationLogger {
  constructor(
    private readonly scope: string,
    private readonly platform?: Platform,
    private readonly jobId?: string
  ) {}

  private prefix(): string {
    const parts = ["[Automation]", this.scope];
    if (this.platform) parts.push(this.platform);
    if (this.jobId) parts.push(this.jobId);
    return parts.join(" ");
  }

  info(message: string, data?: unknown) {
    console.info(this.prefix(), message, data ?? "");
  }

  warn(message: string, data?: unknown) {
    console.warn(this.prefix(), message, data ?? "");
  }

  error(message: string, data?: unknown) {
    console.error(this.prefix(), message, data ?? "");
  }

  child(scope: string): AutomationLogger {
    return new AutomationLogger(scope, this.platform, this.jobId);
  }
}
