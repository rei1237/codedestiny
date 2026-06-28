"use client";

import { useEffect, useMemo, useState } from "react";
import type { TeaHouseStoryStep } from "../data/story";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import YeoniDialogueActor from "./YeoniDialogueActor";
import styles from "../styles/fortune-tea-house.module.css";

type HumanYeoniRevealProps = {
  steps: TeaHouseStoryStep[];
  onComplete: () => void;
};

export default function HumanYeoniReveal({ steps, onComplete }: HumanYeoniRevealProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const firstStepId = steps[0]?.id || "";

  useEffect(() => {
    setStepIndex(0);
  }, [firstStepId]);

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
        <p className={styles.sceneEyebrow}>달빛 속에 드러난 이름</p>
        <h2 id="humanYeoniTitle">연이가 당신을 맞이합니다</h2>
        <TeaHouseDialogueBox speaker={currentStep.speaker} text={currentStep.text} />
        <div className={styles.storyActions}>
          <span className={styles.storyProgress}>{progressLabel}</span>
          <TeaHouseButton
            onClick={() => {
              if (isLast) onComplete();
              else setStepIndex((current) => current + 1);
            }}
          >
            {currentStep.cta || (isLast ? "찻잔 상담 보기" : "다음")}
          </TeaHouseButton>
        </div>
      </div>
    </section>
  );
}
