"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";
import type { RubState } from "./CrystalGem";

type Point = {
  x: number;
  y: number;
};

type UseRubInteractionOptions = {
  threshold?: number;
  onActivated?: () => void;
};

export function useRubInteraction(options: UseRubInteractionOptions = {}) {
  const threshold = Math.max(1, options.threshold || 200);
  const [progress, setProgress] = useState(0);
  const [rubState, setRubState] = useState<RubState>("idle");
  const activeRef = useRef(false);
  const activatedRef = useRef(false);
  const distanceRef = useRef(0);
  const lastPointRef = useRef<Point | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    activeRef.current = false;
    activatedRef.current = false;
    distanceRef.current = 0;
    lastPointRef.current = null;
    pointerIdRef.current = null;
    setProgress(0);
    setRubState("idle");
  }, []);

  const activate = useCallback(() => {
    if (activatedRef.current) return;
    activatedRef.current = true;
    activeRef.current = false;
    distanceRef.current = threshold;
    setProgress(100);
    setRubState("activated");
    options.onActivated?.();
  }, [options, threshold]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (activatedRef.current) return;
    activeRef.current = true;
    pointerIdRef.current = event.pointerId;
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    setRubState("rubbing");
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!activeRef.current || activatedRef.current) return;
    if (pointerIdRef.current !== null && pointerIdRef.current !== event.pointerId) return;

    const lastPoint = lastPointRef.current;
    const nextPoint = { x: event.clientX, y: event.clientY };
    if (!lastPoint) {
      lastPointRef.current = nextPoint;
      return;
    }

    const distance = Math.hypot(nextPoint.x - lastPoint.x, nextPoint.y - lastPoint.y);
    lastPointRef.current = nextPoint;
    distanceRef.current += distance;
    const nextProgress = Math.min(100, (distanceRef.current / threshold) * 100);
    setProgress(nextProgress);
    setRubState("rubbing");

    if (distanceRef.current >= threshold) {
      activate();
    }
  }, [activate, threshold]);

  const finishGesture = useCallback((event: PointerEvent<HTMLElement>) => {
    if (pointerIdRef.current !== null && pointerIdRef.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (activatedRef.current) return;
    reset();
  }, [reset]);

  return {
    progress,
    rubState,
    reset,
    activate,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishGesture,
      onPointerLeave: finishGesture,
      onPointerCancel: finishGesture,
    },
  };
}
