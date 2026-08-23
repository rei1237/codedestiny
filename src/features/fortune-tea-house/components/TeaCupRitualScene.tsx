"use client";

import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import type { TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import TeaCupVisual from "./TeaCupVisual";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type TeaCupRitualSceneProps = {
  selectedCup: TeaHouseCup;
  onConfirm: () => void;
  onBack: () => void;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    speaker="연이" 는 여기에 없다 — 그건 문구가 아니라 대사 상자가 이니셜을 고르는 판별자다. */
const KO = {
  yeoniAlt: "선택한 찻잔을 내미는 연이",
  backLabel: "다른 찻잔 보기",
  confirmLabel: "이 찻잔으로 이야기하기",
};

export default function TeaCupRitualScene({ selectedCup, onConfirm, onBack }: TeaCupRitualSceneProps) {
  const copy = useTeaHouseCopy("teaCupRitual", KO);
  const sceneStyle = {
    "--tea-cup-ritual-asset": `url("${fortuneTeaHouseAssets.ui.selection}")`,
  } as CSSProperties;

  return (
    <section className={styles.teaCupRitualScene} style={sceneStyle} data-accent={selectedCup.accent} aria-labelledby="teaCupRitualTitle">
      <div className={styles.teaCupRitualVisual}>
        <span className={styles.teaCupRitualMoon} aria-hidden />
        <TeaCupVisual cup={selectedCup} state="selected" size="hero" className={styles.teaCupRitualCup} />
        <span className={styles.teaCupRitualMist} aria-hidden />
      </div>

      <div className={styles.teaCupRitualPanel}>
        <p className={styles.sceneEyebrow}>{selectedCup.eyebrow}</p>
        <h2 id="teaCupRitualTitle">{selectedCup.ritualTitle}</h2>
        <p className={styles.sceneDescription}>{selectedCup.summonLine}</p>
        <AssetImage
          className={styles.teaCupRitualYeoni}
          imageClassName={styles.cupPoseYeoniImage}
          src={fortuneTeaHouseAssets.yeoni.transparent.cupPose}
          fallbackSrc={fortuneTeaHouseAssets.yeoni.cupPose}
          alt={copy.yeoniAlt}
          priority
          loading="eager"
        />
        <TeaHouseDialogueBox speaker="연이" text={selectedCup.yeoniSelectLine} />
        <div className={styles.storyActions}>
          <TeaHouseButton variant="ghost" onClick={onBack}>
            {copy.backLabel}
          </TeaHouseButton>
          <TeaHouseButton onClick={onConfirm}>{copy.confirmLabel}</TeaHouseButton>
        </div>
      </div>
    </section>
  );
}
