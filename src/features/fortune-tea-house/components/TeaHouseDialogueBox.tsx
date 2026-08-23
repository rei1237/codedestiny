import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type { TeaHouseSpeaker } from "../data/story";
import type { TeaHouseEntrySpeaker } from "../data/entryStory";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

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

// speaker 값 자체는 스토리 데이터의 판별자다 — 비교는 그대로 두고 화면에 나가는 라벨만 사전을 태운다.
function getSpeakerLabel(speaker: TeaHouseSpeaker | TeaHouseEntrySpeaker, copy: typeof KO) {
  if (speaker === "narration") return copy.speakerLabel.narration;
  if (speaker === "연이") return copy.speakerLabel.yeoni;
  if (speaker === "꽃돼지?") return copy.speakerLabel.pig;
  return speaker;
}

function getSpeakerIcon(speaker: TeaHouseSpeaker | TeaHouseEntrySpeaker, copy: typeof KO) {
  if (speaker === "연이") return copy.speakerIcon.yeoni;
  if (speaker === "꽃돼지?") return copy.speakerIcon.pig;
  return copy.speakerIcon.moon;
}

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다. */
const KO = {
  speakerLabel: { narration: "나레이션", yeoni: "연이", pig: "꽃돼지?" },
  // 아바타 자리에 한 글자로 들어간다 — 번역도 짧게 유지할 것.
  speakerIcon: { yeoni: "연", pig: "꿀", moon: "달" },
  waiting: "달빛이 피어오르는 중...",
  next: "다음 ▾",
};

export default function TeaHouseDialogueBox({
  speaker = "narration",
  text,
  className = "",
  onAdvance,
  isAdvanceDisabled = false,
  onTextComplete,
}: TeaHouseDialogueBoxProps) {
  const copy = useTeaHouseCopy("dialogueBox", KO);
  const prefersReducedMotion = usePrefersReducedMotion();
  const characters = useMemo(() => Array.from(text), [text]);
  const [visibleCharacters, setVisibleCharacters] = useState(() => (prefersReducedMotion ? characters.length : 0));
  const speakerLabel = getSpeakerLabel(speaker, copy);
  const isSystem = speaker === "narration";
  const typewriterIntervalMs = isSystem ? TYPEWRITER_INTERVAL_NARRATION_MS : TYPEWRITER_INTERVAL_MS;
  const speakerIcon = getSpeakerIcon(speaker, copy);
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
        {isAdvanceDisabled ? copy.waiting : copy.next}
      </span>
    </div>
  );
}
