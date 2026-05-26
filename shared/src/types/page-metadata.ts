/** Page context sent from extension content script to backend */
export interface ExtensionPageMetadata {
  platform: "naukri" | "linkedin" | "indeed";
  url: string;
  title: string;
  hostname: string;
  pageType: string;
  extractedAt: string;
  extras?: Record<string, string>;
}
