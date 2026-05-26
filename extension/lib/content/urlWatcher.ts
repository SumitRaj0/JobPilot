export type UrlChangeHandler = (url: string, hostname: string) => void;

/**
 * Detect SPA navigations on job sites (pushState + polling fallback).
 */
export function watchUrlChanges(onChange: UrlChangeHandler): () => void {
  let lastUrl = window.location.href;

  const notify = () => {
    const next = window.location.href;
    if (next === lastUrl) return;
    lastUrl = next;
    onChange(next, window.location.hostname);
  };

  const onPopState = () => notify();
  window.addEventListener("popstate", onPopState);

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = (...args) => {
    originalPushState(...args);
    notify();
  };

  history.replaceState = (...args) => {
    originalReplaceState(...args);
    notify();
  };

  const interval = window.setInterval(notify, 2000);

  return () => {
    window.removeEventListener("popstate", onPopState);
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.clearInterval(interval);
  };
}
