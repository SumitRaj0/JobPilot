import type { JobFilters } from "@aiapply/shared";
import { useCallback, useEffect, useState } from "react";

import { DEFAULT_FILTERS } from "~lib/storage/defaults";
import { STORAGE_KEYS } from "~lib/storage/keys";

export function usePersistedFilters() {
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    if (!chrome?.storage?.local) return;

    chrome.storage.local.get(STORAGE_KEYS.filters, (result) => {
      const stored = result[STORAGE_KEYS.filters] as JobFilters | undefined;
      if (stored) setFilters({ ...DEFAULT_FILTERS, ...stored });
    });
  }, []);

  const updateFilters = useCallback((patch: Partial<JobFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      void chrome.storage.local.set({ [STORAGE_KEYS.filters]: next });
      return next;
    });
  }, []);

  return { filters, updateFilters, ready };
}
