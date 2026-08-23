"use client";

/**
 * 마스터 인연의 서 — 타자기 대사창.
 *
 * 운명 찻집 TeaHouseDialogueBox 의 동작 계약을 따른다:
 *  - grapheme-safe(Array.from) 로 한 글자씩 노출 → 한글·이모지 깨짐 방지
 *  - 내레이션은 조금 느리게, 대사는 조금 빠르게
 *  - 클릭 1회 = 타자 즉시 완성, 클릭 2회 = 다음 라인
 *  - prefers-reduced-motion 이면 타자 없이 즉시 전체 노출
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import styles from "../styles/codex.module.css";

const TYPE_INTERVAL_MS = 24;
const TYPE_INTERVAL_NARRATION_MS = 46;

interface CodexDialogueBoxProps {
  speaker: "narration" | "연애 고수";
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
  const copy = useMasterLoveCodexCopy();
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
      aria-label={isComplete ? copy.dialogueAdvanceAriaLabel : copy.dialogueRevealAriaLabel}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleClick();
      }}
      className="w-full cursor-pointer border-t border-[color:var(--codex-rule)] pt-7 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--codex-gold)]"
    >
      {label ? (
        <p
          className={`${styles.numeral} mb-4 text-[0.6875rem]`}
          style={{ letterSpacing: "0.28em", color: "var(--codex-gold)" }}
        >
          {label}
        </p>
      ) : null}
      <p
        className="whitespace-pre-wrap text-[1.0625rem] leading-9 sm:text-[1.125rem] sm:leading-[1.9]"
        style={{
          fontFamily: "var(--font-premium)",
          letterSpacing: ".02em",
          color: speaker === "narration" ? "var(--codex-ink-text-muted)" : "var(--codex-ink-text)",
        }}
      >
        {characters.slice(0, visibleCount).join("")}
        {!isComplete ? (
          <span className="ml-0.5 inline-block motion-safe:animate-pulse" style={{ color: "var(--codex-gold)" }}>▌</span>
        ) : null}
      </p>
      <p className={`${styles.quiet} mt-7 text-right`}>
        {isComplete ? (isAdvanceDisabled ? "" : `${cta || copy.dialogueDefaultCta} ›`) : copy.dialogueTapHint}
      </p>
    </div>
  );
}
