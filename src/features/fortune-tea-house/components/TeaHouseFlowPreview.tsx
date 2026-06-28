"use client";

import { useEffect, useMemo, useState } from "react";
import { Coffee, HeartPulse, MessagesSquare, PenLine } from "lucide-react";
import { fortuneTeaHouseAssets } from "../data/assets";
import { teaHouseFlowCards, type TeaHouseStoryStep } from "../data/story";
import AssetImage from "./AssetImage";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import YeoniDialogueActor from "./YeoniDialogueActor";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseFlowPreviewProps = {
  steps: TeaHouseStoryStep[];
  onComplete: () => void;
};

const flowIcons = [Coffee, PenLine, HeartPulse, MessagesSquare];
const flowAssetSrc = {
  selection: fortuneTeaHouseAssets.ui.selection,
  bubble: fortuneTeaHouseAssets.cutout.teaCups,
  emotionGauge: fortuneTeaHouseAssets.pig.emotionGauge,
  buttons: fortuneTeaHouseAssets.ui.buttons,
} as const;

export default function TeaHouseFlowPreview({ steps, onComplete }: TeaHouseFlowPreviewProps) {
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
    <section className={styles.flowScene} aria-labelledby="teaHouseFlowTitle">
      <div className={styles.flowCopy}>
        <p className={styles.sceneEyebrow}>찻잔이 마음을 고르는 자리</p>
        <h2 id="teaHouseFlowTitle">상담은 이렇게 열립니다</h2>
        <YeoniDialogueActor
          className={styles.flowYeoniActor}
          mood={currentStep.mood || "gentle"}
          isSpeaking={isYeoniLine}
          cueText={isYeoniLine ? currentStep.text : ""}
          compact
        />
        <TeaHouseDialogueBox speaker={currentStep.speaker} text={currentStep.text} />
        <div className={styles.storyActions}>
          <span className={styles.storyProgress}>{progressLabel}</span>
          <TeaHouseButton
            onClick={() => {
              if (isLast) onComplete();
              else setStepIndex((current) => current + 1);
            }}
          >
            {currentStep.cta || (isLast ? "상담 시작 준비하기" : "다음")}
          </TeaHouseButton>
        </div>
      </div>
      <div className={styles.flowGrid}>
        {teaHouseFlowCards.map((card, index) => {
          const Icon = flowIcons[index] || Coffee;
          return (
            <article className={styles.flowCard} key={card.id}>
              <span className={styles.flowCardIcon}>
                <Icon size={20} aria-hidden />
              </span>
              <AssetImage
                className={styles.flowCardAsset}
                src={flowAssetSrc[card.assetKey]}
                alt={`${card.title} 장면`}
              />
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
