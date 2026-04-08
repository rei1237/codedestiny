"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clampFrameIndex } from "./SpriteCharacter";

export type TamagotchiStatus = "idle" | "hungry" | "bored" | "sleepy" | "work";

export type ActionMap = Record<TamagotchiStatus, number[]>;

export const DEFAULT_ACTION_MAP: ActionMap = {
  // 첫 번째 칸은 0번 기준
  idle: [4, 10],
  hungry: [1, 19],
  bored: [11, 17],
  sleepy: [14],
  work: [3, 9],
};

type UseTamagotchiAnimationOptions = {
  status: TamagotchiStatus;
  actionMap?: ActionMap;
  intervalMs?: number;
  interactionFrame?: number;
  interactionMs?: number;
};

export function useTamagotchiAnimation({
  status,
  actionMap = DEFAULT_ACTION_MAP,
  intervalMs = 1300,
  interactionFrame = 15,
  interactionMs = 650,
}: UseTamagotchiAnimationOptions) {
  const frames = useMemo(() => {
    const f = actionMap[status] ?? actionMap.idle;
    return f.length ? f.map(clampFrameIndex) : [0];
  }, [actionMap, status]);

  const [cursor, setCursor] = useState(0);
  const [interactionOn, setInteractionOn] = useState(false);

  useEffect(() => {
    setCursor(0);
  }, [status]);

  useEffect(() => {
    if (interactionOn || frames.length <= 1) return;
    const timer = window.setInterval(() => {
      setCursor((prev) => (prev + 1) % frames.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [frames, intervalMs, interactionOn]);

  const triggerInteraction = useCallback(() => {
    setInteractionOn(true);
    const timer = window.setTimeout(() => {
      setInteractionOn(false);
    }, interactionMs);
    return () => window.clearTimeout(timer);
  }, [interactionMs]);

  const currentFrame = interactionOn ? clampFrameIndex(interactionFrame) : frames[cursor] ?? 0;

  return {
    currentFrame,
    currentAction: status,
    triggerInteraction,
  };
}
