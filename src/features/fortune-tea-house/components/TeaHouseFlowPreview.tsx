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
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

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

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다. */
/** 흐름 카드에서 사전이 덮으면 안 되는 필드. id 는 판별자, assetKey 는 삽화를 고르는 키다. */
const FLOW_CARD_SKIP_KEYS = ["id", "assetKey"];

const KO = {
  eyebrow: "찻잔이 마음을 고르는 자리",
  title: "상담은 이렇게 열립니다",
  readyLabel: "상담 시작 준비하기",
  nextLabel: "다음",
  // {title} 은 카드 제목으로 치환된다 — 번역에서도 그대로 남겨 둘 것.
  cardAlt: "{title} 장면",
};

export default function TeaHouseFlowPreview({ steps, onComplete }: TeaHouseFlowPreviewProps) {
  const copy = useTeaHouseCopy("flowPreview", KO);
  const cards = useTeaHouseCopy("flowCards", teaHouseFlowCards, { skipKeys: FLOW_CARD_SKIP_KEYS });
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
    <section className={styles.flowScene} aria-labelledby="teaHouseFlowTitle">
      <div className={styles.flowCopy}>
        <p className={styles.sceneEyebrow}>{copy.eyebrow}</p>
        <h2 id="teaHouseFlowTitle">{copy.title}</h2>
        <YeoniDialogueActor
          className={styles.flowYeoniActor}
          mood={currentStep.mood || "gentle"}
          isSpeaking={isYeoniLine}
          compact
        />
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
            {currentStep.cta || (isLast ? copy.readyLabel : copy.nextLabel)}
          </TeaHouseButton>
        </div>
      </div>
      <div className={styles.flowGrid}>
        {cards.map((card, index) => {
          const Icon = flowIcons[index] || Coffee;
          return (
            <article className={styles.flowCard} key={card.id}>
              <span className={styles.flowCardIcon}>
                <Icon size={20} aria-hidden />
              </span>
              <AssetImage
                className={styles.flowCardAsset}
                src={flowAssetSrc[card.assetKey]}
                alt={copy.cardAlt.replace("{title}", card.title)}
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
