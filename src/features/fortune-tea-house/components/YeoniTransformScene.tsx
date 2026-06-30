"use client";

import { useEffect, useState } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import { getTeaHouseSteps } from "../data/story";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import AssetImage from "./AssetImage";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";

type YeoniTransformSceneProps = {
  onComplete: () => void;
};

export default function YeoniTransformScene({ onComplete }: YeoniTransformSceneProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [ready, setReady] = useState(prefersReducedMotion);
  const [stepIndex, setStepIndex] = useState(0);
  const [isCurrentLineTextComplete, setIsCurrentLineTextComplete] = useState(false);
  const steps = getTeaHouseSteps("transform");
  const step = steps[stepIndex] || steps[0]!;
  const isLast = stepIndex >= steps.length - 1;

  useEffect(() => {
    if (prefersReducedMotion) {
      setReady(true);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion]);

  useEffect(() => {
    setIsCurrentLineTextComplete(false);
  }, [stepIndex]);

  function goNext() {
    if (!isCurrentLineTextComplete) return;
    if (isLast) onComplete();
    else setStepIndex((current) => current + 1);
  }

  return (
    <section className={styles.transformScene} aria-labelledby="yeoniTransformTitle">
      <div className={styles.transformMoon} aria-hidden />
      <div className={styles.transformImageWrap}>
        <span className={styles.transformGlow} aria-hidden />
        <AssetImage
          className={styles.transformImage}
          src={fortuneTeaHouseAssets.pig.transform}
          alt="꽃돼지?가 달빛 속에서 인간 연이로 변신하는 컷신"
          priority
        />
      </div>
      <div className={styles.transformCopy}>
        <p className={styles.sceneEyebrow}>분홍빛이 피어나는 순간</p>
        <h2 id="yeoniTransformTitle">꽃잎 사이로 모습이 바뀝니다</h2>
        <TeaHouseDialogueBox
          speaker={step.speaker}
          text={step.text}
          isAdvanceDisabled={!isCurrentLineTextComplete}
          onTextComplete={setIsCurrentLineTextComplete}
        />
        <TeaHouseButton
          loading={!ready}
          disabled={!ready || !isCurrentLineTextComplete}
          onClick={goNext}
        >
          {step.cta || (isLast ? "연이를 만난다" : "다음")}
        </TeaHouseButton>
      </div>
    </section>
  );
}
