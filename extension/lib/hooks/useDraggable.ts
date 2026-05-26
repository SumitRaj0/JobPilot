import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { STORAGE_KEYS } from "~lib/storage/keys";

export interface PanelPosition {
  x: number;
  y: number;
}

export const PANEL_WIDTH = 380;
export const PANEL_HEIGHT_ESTIMATE = 640;
export const ORB_SIZE = 56;
const MARGIN = 20;

function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number
): PanelPosition {
  const maxX = Math.max(MARGIN, window.innerWidth - width - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - height - MARGIN);
  return {
    x: Math.min(Math.max(MARGIN, x), maxX),
    y: Math.min(Math.max(MARGIN, y), maxY),
  };
}

/** Fixed to bottom-right corner (default for orb + panel open). */
export function bottomRightStyle(): CSSProperties {
  return {
    position: "fixed",
    right: MARGIN,
    bottom: MARGIN,
    left: "auto",
    top: "auto",
  };
}

export function useDraggable(collapsed: boolean) {
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const wasDragged = useRef(false);
  const positionRef = useRef<PanelPosition | null>(null);

  const boxW = collapsed ? ORB_SIZE : PANEL_WIDTH;
  const boxH = collapsed ? ORB_SIZE : PANEL_HEIGHT_ESTIMATE;

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.panelPosition, (result) => {
      const stored = result[STORAGE_KEYS.panelPosition] as PanelPosition | undefined;
      if (stored && typeof stored.x === "number" && typeof stored.y === "number") {
        const clamped = clampPosition(stored.x, stored.y, boxW, boxH);
        positionRef.current = clamped;
        setPosition(clamped);
      }
    });
  }, []);

  const persistPosition = useCallback((pos: PanelPosition) => {
    void chrome.storage.local.set({ [STORAGE_KEYS.panelPosition]: pos });
  }, []);

  const resetToBottomRight = useCallback(() => {
    positionRef.current = null;
    setPosition(null);
    void chrome.storage.local.remove(STORAGE_KEYS.panelPosition);
  }, []);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;

      const target = e.currentTarget.closest("[data-aiapply-panel]") as HTMLElement | null;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const current = position ?? { x: rect.left, y: rect.top };

      dragOffset.current = { x: e.clientX - current.x, y: e.clientY - current.y };
      dragging.current = true;
      wasDragged.current = false;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [position]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (!dragging.current) return;
      wasDragged.current = true;
      const next = clampPosition(
        e.clientX - dragOffset.current.x,
        e.clientY - dragOffset.current.y,
        boxW,
        boxH
      );
      positionRef.current = next;
      setPosition(next);
    },
    [boxW, boxH]
  );

  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (!dragging.current) return;
      dragging.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
      if (positionRef.current) persistPosition(positionRef.current);
    },
    [persistPosition]
  );

  const positionStyle = useMemo((): CSSProperties => {
    if (position) {
      return {
        position: "fixed",
        left: position.x,
        top: position.y,
        right: "auto",
        bottom: "auto",
      };
    }
    return bottomRightStyle();
  }, [position]);

  const consumeClick = useCallback(() => {
    if (!wasDragged.current) return false;
    wasDragged.current = false;
    return true;
  }, []);

  return {
    positionStyle,
    anchoredBottomRight: position === null,
    onDragHandlePointerDown: onPointerDown,
    onDragHandlePointerMove: onPointerMove,
    onDragHandlePointerUp: onPointerUp,
    consumeClick,
    resetToBottomRight,
  };
}
