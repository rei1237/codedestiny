"use client";
/**
 * 저사양 3단계 폴백 티어 — full / lite / static.
 * 판정: prefers-reduced-motion → static, 저메모리·저코어 기기 → lite, 그 외 full.
 * 스테이지 루트에 data-fx로 부여하면 map.module.css가 앰비언트 모션/그레인을 단계적으로 끈다.
 * SSR 안전(초기 full) — 마운트 후 1회 판정, 네트워크·측정 루프 없음.
 */
import { useEffect, useState } from "react";

export type FxTier = "full" | "lite" | "static";

export function useFxTier(): FxTier {
  const [tier, setTier] = useState<FxTier>("full");
  useEffect(() => {
    try {
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        setTier("static");
        return;
      }
      const nav = navigator as Navigator & { deviceMemory?: number };
      const mem = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8;
      const cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 8;
      if (mem <= 3 || cores <= 4) setTier("lite");
    } catch {
      /* 판정 불가 시 full 유지 */
    }
  }, []);
  return tier;
}
