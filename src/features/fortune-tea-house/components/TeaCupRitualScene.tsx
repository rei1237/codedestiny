"use client";

import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import type { TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import TeaCupVisual from "./TeaCupVisual";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";

type TeaCupRitualSceneProps = {
  selectedCup: TeaHouseCup;
  onConfirm: () => void;
  onBack: () => void;
};

export default function TeaCupRitualScene({ selectedCup, onConfirm, onBack }: TeaCupRitualSceneProps) {
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
          alt="선택한 찻잔을 내미는 연이"
          priority
          loading="eager"
        />
        <TeaHouseDialogueBox speaker="연이" text={selectedCup.yeoniSelectLine} />
        <div className={styles.storyActions}>
          <TeaHouseButton variant="ghost" onClick={onBack}>
            다른 찻잔 보기
          </TeaHouseButton>
          <TeaHouseButton onClick={onConfirm}>이 찻잔으로 이야기하기</TeaHouseButton>
        </div>
      </div>
    </section>
  );
}
