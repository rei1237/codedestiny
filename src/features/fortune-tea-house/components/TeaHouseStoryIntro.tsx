"use client";

import { useEffect, useMemo, useState } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import type { TeaHouseStoryStep } from "../data/story";
import AssetImage from "./AssetImage";
import TalkingPigYeoni from "./TalkingPigYeoni";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseStoryIntroProps = {
  steps: TeaHouseStoryStep[];
  eyebrow: string;
  title: string;
  completeLabel: string;
  onComplete: () => void;
};

export default function TeaHouseStoryIntro({ steps, eyebrow, title, completeLabel, onComplete }: TeaHouseStoryIntroProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const firstStepId = steps[0]?.id || "";

  useEffect(() => {
    setStepIndex(0);
  }, [firstStepId]);

  const currentStep = steps[stepIndex] || steps[0];
  const isLast = stepIndex >= steps.length - 1;
  const buttonLabel = currentStep?.cta || (isLast ? completeLabel : "다음");
  const progressLabel = useMemo(() => `${Math.min(stepIndex + 1, steps.length)} / ${steps.length}`, [stepIndex, steps.length]);

  if (!currentStep) return null;

  return (
    <section className={styles.storyScene} aria-labelledby={`${currentStep.stage}Title`}>
      <div className={styles.storyVisual} data-visual={currentStep.visual}>
        {currentStep.visual === "pig" ? (
          <TalkingPigYeoni isSpeaking={currentStep.speaker === "꽃돼지?"} />
        ) : (
          <div className={styles.teaHouseDoor}>
            <AssetImage
              className={styles.doorImage}
              src={fortuneTeaHouseAssets.backgrounds.loadingScene}
              alt="조용히 빛나는 운명의 찻집 문"
              priority
            />
            <span>운명의 찻집</span>
          </div>
        )}
      </div>
      <div className={styles.storyPanel}>
        <p className={styles.sceneEyebrow}>{eyebrow}</p>
        <h2 id={`${currentStep.stage}Title`}>{title}</h2>
        <TeaHouseDialogueBox speaker={currentStep.speaker} text={currentStep.text} />
        <div className={styles.storyActions}>
          <span className={styles.storyProgress}>{progressLabel}</span>
          <TeaHouseButton
            onClick={() => {
              if (isLast) onComplete();
              else setStepIndex((current) => current + 1);
            }}
          >
            {buttonLabel}
          </TeaHouseButton>
        </div>
      </div>
    </section>
  );
}
