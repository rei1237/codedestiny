"use client";

// 유료 상담 생성 대기 화면의 경과 시간.
//
// 🔴 실측 시간만 센다. 진행률을 시간으로 지어내지 않는다 — 경과 시간은 "얼마나 기다렸는지"
//    일 뿐, "얼마나 됐는지" 가 아니다. 진행 정도는 서버가 돌려준 완성 수로만 말한다.
// 🔴 초는 내림한다(0.9초는 0:00). 반올림하면 시작하자마자 0:01 이 찍혀 시계가 앞서 간다.

import { useEffect, useState } from "react";

const TICK_MS = 1000;

/** 밀리초를 m:ss 로 바꾼다. 음수·NaN 은 0:00. 60분이 넘어도 분을 그대로 센다(61:05). */
export function formatElapsed(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const seconds = Math.floor(safe / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * running 이 true 인 동안 시작 시각부터 지난 밀리초를 돌려준다.
 * false 가 되면 0 으로 돌아가고, 다시 true 가 되면 처음부터 센다.
 */
export function useElapsed(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return undefined;
    const start = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - start);
    }, TICK_MS);
    return () => {
      window.clearInterval(timer);
      setElapsed(0);
    };
  }, [running]);

  return elapsed;
}
