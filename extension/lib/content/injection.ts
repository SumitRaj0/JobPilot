import type { PlasmoGetOverlayAnchor } from "plasmo";

/**
 * Inject floating UI on document.body (isolated from host layout).
 * Plasmo CSUI mounts a shadow-friendly overlay here.
 */
export const getOverlayAnchor: PlasmoGetOverlayAnchor = () => document.body;

export function injectStyles(cssText: string): HTMLStyleElement {
  const style = document.createElement("style");
  style.setAttribute("data-aiapply-styles", "true");
  style.textContent = cssText;
  return style;
}

export function createStyleGetter(cssText: string): () => HTMLStyleElement {
  return () => injectStyles(cssText);
}
