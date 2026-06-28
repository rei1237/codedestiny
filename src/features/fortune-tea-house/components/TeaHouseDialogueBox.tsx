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
};

const TYPEWRITER_INTERVAL_MS = 24;
const TYPEWRITER_INTERVAL_NARRATION_MS = 48;

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
      className={`${styles.dialogueBox} ${className}`}
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
