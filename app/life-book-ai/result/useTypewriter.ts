"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 마지막에 도착한 장만 "지금 쓰이는 중"처럼 보이게 하는 연출.
 *
 * 🔴 문자 단위 setState 는 60FPS 를 못 지킨다 — requestAnimationFrame 안에서 프레임당 여러 자를 배치로 넘긴다.
 * 🔴 접근성: 잘린 텍스트를 aria-live 에 넣으면 스크린리더가 같은 문장을 수십 번 반복한다.
 *    호출부는 typed 를 aria-hidden 으로, 전문을 sr-only 로 함께 렌더해야 한다.
 */
const CHARS_PER_FRAME = 6;

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useTypewriter(text = "", enabled = false) {
  const [typed, setTyped] = useState(text);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!enabled || !text || prefersReducedMotion()) {
      setTyped(text);
      return undefined;
    }
    let cursor = 0;
    setTyped("");
    const step = () => {
      cursor = Math.min(text.length, cursor + CHARS_PER_FRAME);
      setTyped(text.slice(0, cursor));
      if (cursor < text.length) frameRef.current = window.requestAnimationFrame(step);
    };
    frameRef.current = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [text, enabled]);

  return { typed, isTyping: enabled && typed.length < text.length };
}
