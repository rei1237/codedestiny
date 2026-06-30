import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type { TeaHouseSpeaker } from "../data/story";
import type { TeaHouseEntrySpeaker } from "../data/entryStory";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseDialogueBoxProps = {
  speaker?: TeaHouseSpeaker | TeaHouseEntrySpeaker;
  text: string;
  className?: string;
  onAdvance?: () => void;
  isAdvanceDisabled?: boolean;
  onTextComplete?: (complete: boolean) => void;
};

const TYPEWRITER_INTERVAL_MS = 24;
const TYPEWRITER_INTERVAL_NARRATION_MS = 48;
const dialoguePremiumUi =
  "relative !rounded-[22px] !border !border-[#f6dfb7]/30 !shadow-[0_24px_70px_rgba(6,3,18,0.38),0_0_34px_rgba(206,196,255,0.12),inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-white/10 backdrop-blur-2xl [&_p]:!font-[var(--tea-font-body)] [&_p]:!leading-[1.82] [&_p]:!tracking-[0] [&_strong]:!font-[var(--tea-font-premium)] [&_strong]:!tracking-[0]";

function getSpeakerLabel(speaker: TeaHouseSpeaker | TeaHouseEntrySpeaker) {
  if (speaker === "narration") return "나레이션";
  return speaker;
}

function getSpeakerIcon(speaker: TeaHouseSpeaker | TeaHouseEntrySpeaker) {
  if (speaker === "연이") return "연";
  if (speaker === "꽃돼지?") return "꿀";
  return "달";
}

export default function TeaHouseDialogueBox({
  speaker = "narration",
  text,
  className = "",
  onAdvance,
  isAdvanceDisabled = false,
  onTextComplete,
}: TeaHouseDialogueBoxProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const characters = useMemo(() => Array.from(text), [text]);
  const [visibleCharacters, setVisibleCharacters] = useState(() => (prefersReducedMotion ? characters.length : 0));
  const speakerLabel = getSpeakerLabel(speaker);
  const isSystem = speaker === "narration";
  const typewriterIntervalMs = isSystem ? TYPEWRITER_INTERVAL_NARRATION_MS : TYPEWRITER_INTERVAL_MS;
  const speakerIcon = getSpeakerIcon(speaker);
  const isTextComplete = visibleCharacters >= characters.length;
  const visibleText = characters.slice(0, visibleCharacters).join("");

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleCharacters(characters.length);
      return;
    }

    setVisibleCharacters(0);
    const timer = window.setInterval(() => {
      setVisibleCharacters((current) => {
        if (current >= characters.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, typewriterIntervalMs);

    return () => window.clearInterval(timer);
  }, [characters.length, prefersReducedMotion, text, typewriterIntervalMs]);

  useEffect(() => {
    onTextComplete?.(isTextComplete);
  }, [isTextComplete, onTextComplete]);

  function handleDialogueAdvance() {
    if (!isTextComplete) {
      setVisibleCharacters(characters.length);
      return;
    }
    if (!isAdvanceDisabled) onAdvance?.();
  }

  function handleDialogueKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleDialogueAdvance();
  }

  return (
    <div
      className={`${styles.dialogueBox} ${dialoguePremiumUi} ${className}`}
      data-speaker={speaker}
      data-frame={isSystem ? "system" : "character"}
      data-complete={isTextComplete ? "true" : "false"}
      data-advance-disabled={isAdvanceDisabled ? "true" : "false"}
      role="button"
      tabIndex={0}
      onClick={handleDialogueAdvance}
      onKeyDown={handleDialogueKeyDown}
    >
      <div className={styles.dialogueSpeaker}>
        <span aria-hidden>{speakerIcon}</span>
        <strong>{speakerLabel}</strong>
      </div>
      <p className={styles.dialogueText}>{visibleText}</p>
      <span className={styles.dialogueNextIndicator} aria-hidden>
        {isAdvanceDisabled ? "달빛이 피어오르는 중..." : "다음 ▾"}
      </span>
    </div>
  );
}
