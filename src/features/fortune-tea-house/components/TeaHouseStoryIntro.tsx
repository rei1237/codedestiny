"use client";

import { useEffect, useMemo, useState } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import type { TeaHouseStoryStep } from "../data/story";
import TalkingPigYeoni from "./TalkingPigYeoni";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type TeaHouseStoryIntroProps = {
  steps: TeaHouseStoryStep[];
  eyebrow: string;
  title: string;
  completeLabel: string;
  onComplete: () => void;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다. */
const KO = {
  nextLabel: "다음",
  backdropAlt: "달빛 아래 문이 열린 운명의 찻집",
  title: "운명의 찻집",
  skipAria: "운명의 찻집 도입 장면 건너뛰기",
  skipLabel: "건너뛰기",
};

export default function TeaHouseStoryIntro({ steps, eyebrow, title, completeLabel, onComplete }: TeaHouseStoryIntroProps) {
  const copy = useTeaHouseCopy("storyIntro", KO);
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
  const buttonLabel = currentStep?.cta || (isLast ? completeLabel : copy.nextLabel);
  const progressLabel = useMemo(() => `${Math.min(stepIndex + 1, steps.length)} / ${steps.length}`, [stepIndex, steps.length]);

  if (!currentStep) return null;

  return (
    <section className={styles.storyScene} aria-labelledby={`${currentStep.stage}Title`}>
      <div className={styles.storyVisual} data-visual={currentStep.visual}>
        {currentStep.visual === "pig" ? (
          <TalkingPigYeoni cueText={currentStep.text} isSpeaking={currentStep.speaker === "꽃돼지?"} mood={currentStep.mood} />
        ) : (
          <div className={styles.teaHouseDoor}>
            <picture className={styles.doorImage}>
              <source media="(max-width: 640px)" srcSet={fortuneTeaHouseAssets.backgrounds.landingMobile} />
              <img src={fortuneTeaHouseAssets.backgrounds.landingDesktop} alt={copy.backdropAlt} decoding="async" loading="eager" />
            </picture>
            <span>{copy.title}</span>
          </div>
        )}
      </div>
      <div className={styles.storyPanel}>
        <p className={styles.sceneEyebrow}>{eyebrow}</p>
        <h2 id={`${currentStep.stage}Title`}>{title}</h2>
        <TeaHouseDialogueBox
          speaker={currentStep.speaker}
          text={currentStep.text}
          isAdvanceDisabled={!isCurrentLineTextComplete}
          onTextComplete={setIsCurrentLineTextComplete}
        />
        <div className={styles.storyActions}>
          <span className={styles.storyProgress}>{progressLabel}</span>
          <div className={styles.storyButtonGroup}>
            {!isLast ? (
              <TeaHouseButton variant="ghost" onClick={onComplete} aria-label={copy.skipAria}>
                {copy.skipLabel}
              </TeaHouseButton>
            ) : null}
            <TeaHouseButton
              disabled={!isCurrentLineTextComplete}
              onClick={() => {
                if (isLast) onComplete();
                else setStepIndex((current) => current + 1);
              }}
            >
              {buttonLabel}
            </TeaHouseButton>
          </div>
        </div>
      </div>
    </section>
  );
}
