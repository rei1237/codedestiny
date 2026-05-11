import { useCallback, useRef } from "react";
import type { PointerEvent } from "react";

export function useDestinyBiasTouchGuard(threshold = 12) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    start.current = { x: event.clientX, y: event.clientY };
    moved.current = false;
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!start.current) return;
    const dx = Math.abs(event.clientX - start.current.x);
    const dy = Math.abs(event.clientY - start.current.y);
    if (dx > threshold || dy > threshold) {
      moved.current = true;
    }
  }, [threshold]);

  const shouldBlockClick = useCallback(() => moved.current, []);

  const reset = useCallback(() => {
    start.current = null;
    moved.current = false;
  }, []);

  return {
    guardHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: reset,
      onPointerCancel: reset,
    },
    shouldBlockClick,
  };
}
