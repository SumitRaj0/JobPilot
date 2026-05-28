import cssText from "data-text:~style.css";
import type { PlasmoCSConfig } from "plasmo";

import { FloatingPanel } from "~components/panel/FloatingPanel";
import { createStyleGetter, getOverlayAnchor } from "~lib/content/injection";
import { useJobSiteContent } from "~lib/content/useJobSiteContent";

/**
 * Must be a literal array here — Plasmo static analysis cannot read imported matches.
 * Keep in sync with lib/platform/matches.ts
 */
export const config: PlasmoCSConfig = {
  matches: [
    "https://*.naukri.com/*",
    "https://naukri.com/*",
    "https://*.linkedin.com/*",
    "https://linkedin.com/*",
  ],
};

export { getOverlayAnchor };
export const getStyle = createStyleGetter(cssText);

function JobSitesCSUI() {
  const { platform } = useJobSiteContent();

  if (!platform) return null;

  return <FloatingPanel platform={platform} key={platform} />;
}

export default JobSitesCSUI;
