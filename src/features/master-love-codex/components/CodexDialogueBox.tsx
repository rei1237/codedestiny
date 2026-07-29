"use client";

/**
 * 마스터 운명 연애 비책 — 타자기 대사창.
 *
 * 운명 찻집 TeaHouseDialogueBox 의 동작 계약을 따른다:
 *  - grapheme-safe(Array.from) 로 한 글자씩 노출 → 한글·이모지 깨짐 방지
 *  - 내레이션은 조금 느리게, 대사는 조금 빠르게
 *  - 클릭 1회 = 타자 즉시 완성, 클릭 2회 = 다음 라인
 *  - prefers-reduced-motion 이면 타자 없이 즉시 전체 노출
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TYPE_INTERVAL_MS = 24;
const TYPE_INTERVAL_NARRATION_MS = 46;

interface CodexDialogueBoxProps {
  speaker: "narration" | "박지은";
  text: string;
  cta?: string;
  onAdvance?: () => void;
  isAdvanceDisabled?: boolean;
  onTextComplete?: (complete: boolean) => void;
}

export default function CodexDialogueBox({
  speaker,
  text,
  cta,
  onAdvance,
  isAdvanceDisabled = false,
  onTextComplete,
}: CodexDialogueBoxProps) {
  const characters = useMemo(() => Array.from(String(text || "")), [text]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const completeRef = useRef(onTextComplete);
  completeRef.current = onTextComplete;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setVisibleCount(characters.length);
      return undefined;
    }
    setVisibleCount(0);
    if (!characters.length) return undefined;
    const interval = speaker === "narration" ? TYPE_INTERVAL_NARRATION_MS : TYPE_INTERVAL_MS;
    const timer = window.setInterval(() => {
      setVisibleCount((current) => {
        if (current >= characters.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, interval);
    return () => window.clearInterval(timer);
  }, [characters, reducedMotion, speaker]);

  const isComplete = visibleCount >= characters.length;

  useEffect(() => {
    completeRef.current?.(isComplete);
  }, [isComplete]);

  const handleClick = useCallback(() => {
    if (!isComplete) {
      setVisibleCount(characters.length);
      return;
    }
    if (isAdvanceDisabled) return;
    onAdvance?.();
  }, [characters.length, isAdvanceDisabled, isComplete, onAdvance]);

  const label = speaker === "narration" ? "" : speaker;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={isComplete ? "다음으로 넘어가기" : "대사를 모두 표시하기"}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleClick();
      }}
      className="w-full cursor-pointer rounded-2xl border border-amber-200/25 bg-[#150b1e]/85 px-5 py-5 text-left shadow-[0_24px_60px_-30px_rgba(0,0,0,.9)] backdrop-blur-sm transition hover:border-amber-200/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200/70 sm:px-7 sm:py-6"
    >
      {label ? (
        <p className="mb-2 text-[11px] font-black tracking-[0.28em] text-amber-100/85">{label}</p>
      ) : (
        <p className="mb-2 text-[11px] font-semibold tracking-[0.28em] text-rose-100/50">이야기</p>
      )}
      <p
        className={`whitespace-pre-wrap text-[15px] leading-8 sm:text-base sm:leading-9 ${
          speaker === "narration" ? "italic text-rose-50/80" : "text-rose-50"
        }`}
      >
        {characters.slice(0, visibleCount).join("")}
        {!isComplete ? <span className="ml-0.5 inline-block animate-pulse text-amber-200">▌</span> : null}
      </p>
      <p className="mt-4 text-right text-xs font-bold text-amber-100/70">
        {isComplete ? (isAdvanceDisabled ? "" : `${cta || "계속"} ›`) : "탭하면 바로 표시"}
      </p>
    </div>
  );
}
