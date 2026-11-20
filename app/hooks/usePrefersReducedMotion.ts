"use client";

// 공용 reduced-motion 훅(2026-11-20 4단계에서 찻집 전용 위치에서 올림).
// 찻집(src/features/fortune-tea-house/lib/usePrefersReducedMotion.ts)은 이 훅을 다시 내보낸다 —
// apps/toss 테스트가 그 상대 경로를 목으로 바꾸므로 경로를 지우지 않는다.
import { useEffect, useState } from "react";

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}
