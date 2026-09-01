"use client";

import { useEffect, useState } from "react";

// LOVE CODE intro/select 의 "상시 연출"(repeat: Infinity 루프·backdrop-filter 다층)을 켤지 판정한다.
//
// 🔴 1024px 은 임의 값이 아니라 마크업의 lg: / max-lg: 와 **같은 지점**이어야 한다.
//    어긋나면 "데스크톱 2열 레이아웃인데 연출만 죽은" 띠가 생긴다. 둘 중 하나를 바꾸면 나머지도 바꾼다.
// 🔴 useState 의 lazy initializer 로 첫 렌더부터 확정한다. 이 컴포넌트는 LoveSimulationClient 에서
//    dynamic(ssr:false) 로만 마운트되므로 첫 렌더가 이미 브라우저다 — 하이드레이션 불일치가 없다.
//    (useState(false) + useEffect 로 뒤늦게 켜면 모바일에서 무한 루프 5개가 한 프레임 켜졌다 꺼진다.)
// 🔴 matchMedia 미지원·예외는 false(= 정적)로 떨어뜨린다. 판정 실패가 "연출 켬"으로 읽히면 안 된다.
const AMBIENT_QUERY = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

function readAmbientMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia(AMBIENT_QUERY).matches;
  } catch {
    return false;
  }
}

export function useAmbientMotionEnabled(): boolean {
  const [enabled, setEnabled] = useState(readAmbientMotion);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    let query: MediaQueryList;
    try {
      query = window.matchMedia(AMBIENT_QUERY);
    } catch {
      return;
    }
    const sync = () => setEnabled(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return enabled;
}
