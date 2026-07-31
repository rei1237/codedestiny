"use client";

/**
 * 숫자 카운트업 — 단일 진입점.
 *
 * 🔴 PDF 안전장치: html2canvas 는 그 순간의 DOM 텍스트를 그대로 찍는다. 카운트업이
 * 진행 중이면 92 대신 37 이 저장된다. `skip` 이 켜지면 rAF 를 **시작조차 하지 않고**
 * 목표값을 즉시 돌려준다 — 캡처 직전 forceVisible 을 올리면 항상 최종값이 찍힌다.
 *
 * skip 판정은 CodexReveal 과 같은 모양이다(forceVisible || prefersReducedMotion).
 * 규칙을 이 파일 하나에 두어 컴포넌트마다 잊을 여지를 없앤다.
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const DEFAULT_DURATION_MS = 900;

interface CodexCountUpOptions {
  /** PDF 캡처 등 — 애니메이션 없이 즉시 최종값 */
  skip?: boolean;
  durationMs?: number;
  /** 목록에서 순차로 올라가게 할 때 */
  delayMs?: number;
}

export function useCodexCountUp(target: number, options: CodexCountUpOptions = {}) {
  const { skip = false, durationMs = DEFAULT_DURATION_MS, delayMs = 0 } = options;
  const prefersReducedMotion = useReducedMotion();
  const settled = skip || Boolean(prefersReducedMotion);

  const safeTarget = Math.round(Number.isFinite(target) ? target : 0);
  const [value, setValue] = useState(settled ? safeTarget : 0);
  const frameRef = useRef(0);
  const timerRef = useRef(0);

  useEffect(() => {
    // 정지 모드에서는 rAF 를 걸지 않는다 — 그래야 캡처가 언제 일어나도 최종값이다.
    if (settled) {
      setValue(safeTarget);
      return undefined;
    }

    const start = () => {
      const began = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - began) / durationMs);
        // easeOutCubic — 끝에서 부드럽게 멎는다
        const eased = 1 - (1 - progress) ** 3;
        setValue(Math.round(safeTarget * eased));
        if (progress < 1) frameRef.current = requestAnimationFrame(step);
      };
      frameRef.current = requestAnimationFrame(step);
    };

    if (delayMs > 0) timerRef.current = window.setTimeout(start, delayMs);
    else start();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [safeTarget, settled, durationMs, delayMs]);

  return value;
}

/**
 * 게이지·지표 바의 등장 스윕 — "빈 상태"가 존재하는 시간을 마운트 직후 한 프레임으로 가둔다.
 *
 * 🔴 PDF 안전장치의 핵심. 게이지 폭/stroke-dashoffset 은 **언제나 인라인 최종값**이고,
 * 이 훅이 true 를 돌려주는 첫 한 프레임에만 시작값으로 렌더된다. 그 다음 프레임부터는
 * DOM 이 영구히 최종값을 들고 있으므로, 캡처가 언제 일어나도(애니메이션 도중이어도,
 * html2canvas 가 클론에서 전이를 리셋해도) 최종값이 찍힌다.
 *
 * `skip`(forceVisible || reduced-motion)이면 그 한 프레임조차 없다.
 */
export function useCodexEnterOnce(skip = false) {
  const prefersReducedMotion = useReducedMotion();
  const settled = skip || Boolean(prefersReducedMotion);
  const [entering, setEntering] = useState(!settled);

  useEffect(() => {
    if (settled) { setEntering(false); return undefined; }
    const frame = requestAnimationFrame(() => setEntering(false));
    return () => cancelAnimationFrame(frame);
  }, [settled]);

  return entering && !settled;
}
