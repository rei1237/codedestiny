"use client";

import { useEffect, useMemo, useState } from "react";
import type { TeaHouseStoryStep } from "../data/story";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import YeoniDialogueActor from "./YeoniDialogueActor";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type HumanYeoniRevealProps = {
  steps: TeaHouseStoryStep[];
  onComplete: () => void;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다. */
const KO = {
  eyebrow: "달빛 속에 드러난 이름",
  title: "연이가 당신을 맞이합니다",
  seeReadingLabel: "찻잔 상담 보기",
  nextLabel: "다음",
};

export default function HumanYeoniReveal({ steps, onComplete }: HumanYeoniRevealProps) {
  const copy = useTeaHouseCopy("humanYeoniReveal", KO);
  const [stepIndex, setStepIndex] = useState(0);
  const [isCurrentLineTextComplete, setIsCurrentLineTextComplete] = useState(false);
  const firstStepId = steps[0]?.id || "";

  useEffect(() => {
    setStepIndex(0);
    setIsCurrentLineTextComplete(false);
  }, [firstStepId]);

  useEffect(() => {
    setIsCurrentLineTextComplete(false);
  }, [stepIndex]);

  const currentStep = steps[stepIndex] || steps[0];
  const isLast = stepIndex >= steps.length - 1;
  const progressLabel = useMemo(() => `${Math.min(stepIndex + 1, steps.length)} / ${steps.length}`, [stepIndex, steps.length]);
  const isYeoniLine = currentStep?.speaker === "연이";

  if (!currentStep) return null;

  return (
    <section className={styles.yeoniScene} aria-labelledby="humanYeoniTitle">
      <div className={styles.yeoniPortraitWrap}>
        <YeoniDialogueActor
          className={styles.yeoniPortrait}
          mood={currentStep.mood || "welcome"}
          isSpeaking={isYeoniLine}
          cueText={isYeoniLine ? currentStep.text : ""}
          priority
        />
      </div>
      <div className={styles.yeoniDialoguePanel}>
        <p className={styles.sceneEyebrow}>{copy.eyebrow}</p>
        <h2 id="humanYeoniTitle">{copy.title}</h2>
        <TeaHouseDialogueBox
          speaker={currentStep.speaker}
          text={currentStep.text}
          isAdvanceDisabled={!isCurrentLineTextComplete}
          onTextComplete={setIsCurrentLineTextComplete}
        />
        <div className={styles.storyActions}>
          <span className={styles.storyProgress}>{progressLabel}</span>
          <TeaHouseButton
            disabled={!isCurrentLineTextComplete}
            onClick={() => {
              if (isLast) onComplete();
              else setStepIndex((current) => current + 1);
            }}
          >
            {currentStep.cta || (isLast ? copy.seeReadingLabel : copy.nextLabel)}
          </TeaHouseButton>
        </div>
      </div>
    </section>
  );
}
