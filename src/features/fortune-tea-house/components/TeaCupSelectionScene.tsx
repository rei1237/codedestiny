"use client";

import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import { teaHouseCups, type TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import YeoniDialogueActor from "./YeoniDialogueActor";
import styles from "../styles/fortune-tea-house.module.css";

type TeaCupSelectionSceneProps = {
  selectedCupId?: string;
  onSelect: (cup: TeaHouseCup) => void;
};

const cupSpritePositions = [
  { largeX: "0%", largeY: "0%", stateX: "0%" },
  { largeX: "50%", largeY: "0%", stateX: "20%" },
  { largeX: "100%", largeY: "0%", stateX: "40%" },
  { largeX: "0%", largeY: "100%", stateX: "60%" },
  { largeX: "50%", largeY: "100%", stateX: "80%" },
  { largeX: "100%", largeY: "100%", stateX: "100%" },
] as const;

const teaCupSelectionDialogue =
  "이제 운명의 메뉴판을 펼쳐볼게요.\n이 찻잔들은 단순한 음료가 아니라, 당신의 고민을 어떤 방향에서 바라볼지 정하는 작은 문이에요.\n너무 오래 고민하지는 마세요. 오늘 당신에게 필요한 찻잔은, 머리보다 마음이 먼저 알아볼 거예요. 꿀... 아, 이건 못 들은 걸로 해주세요.";

export default function TeaCupSelectionScene({ selectedCupId, onSelect }: TeaCupSelectionSceneProps) {
  const menuStyle = {
    "--tea-menu-desktop": `url("${fortuneTeaHouseAssets.ui.menuDesktop}")`,
    "--tea-menu-mobile": `url("${fortuneTeaHouseAssets.ui.menuMobile}")`,
    "--tea-cups-labeled": `url("${fortuneTeaHouseAssets.teaCups.labeledSheet}")`,
    "--tea-cups-states": `url("${fortuneTeaHouseAssets.teaCups.stateSheet}")`,
  } as CSSProperties;
  const guideStyle = {
    "--yeoni-cup-pose-sheet": `url("${fortuneTeaHouseAssets.yeoni.cupPoseSheet}")`,
  } as CSSProperties;

  return (
    <section className={styles.teaSelectScene} aria-labelledby="teaCupSelectTitle">
      <div className={styles.teaSelectGuide} style={guideStyle}>
        <p className={styles.sceneEyebrow}>마음이 먼저 알아보는 잔</p>
        <h2 id="teaCupSelectTitle">오늘의 찻잔을 골라 주세요</h2>
        <AssetImage
          className={styles.cupPoseYeoni}
          imageClassName={styles.cupPoseYeoniImage}
          src={fortuneTeaHouseAssets.yeoni.cupPose}
          alt="찻잔을 내미는 연이"
        />
        <YeoniDialogueActor className={styles.flowYeoniActor} mood="gentle" isSpeaking cueText={teaCupSelectionDialogue} compact />
        <TeaHouseDialogueBox
          speaker="연이"
          text={teaCupSelectionDialogue}
        />
      </div>

      <div className={styles.teaMenuBoard} style={menuStyle} aria-label="운명의 찻집 상담 메뉴판">
        <div className={styles.teaMenuCards}>
          {teaHouseCups.map((cup, index) => {
            const isSelected = selectedCupId === cup.id;
            const spritePosition = cupSpritePositions[index] || cupSpritePositions[0];
            return (
              <button
                type="button"
                className={styles.teaCupMenuItem}
                data-accent={cup.accent}
                data-cup-id={cup.id}
                data-selected={isSelected ? "true" : "false"}
                aria-pressed={isSelected}
                aria-label={`${cup.name}, ${cup.topic}, ${cup.description}`}
                key={cup.id}
                onClick={() => onSelect(cup)}
              >
                <span
                  className={styles.teaCupMenuVisual}
                  style={
                    {
                      "--cup-large-x": spritePosition.largeX,
                      "--cup-large-y": spritePosition.largeY,
                      "--cup-state-x": spritePosition.stateX,
                    } as CSSProperties
                  }
                  aria-hidden
                />
                <span className={styles.teaCupMenuNumber}>{index + 1}</span>
                <span className={styles.teaCupMenuText}>
                  <strong>{cup.name}</strong>
                  <span>{cup.topic}</span>
                  <small>{cup.description}</small>
                </span>
                <span className={styles.teaCupMenuAction}>{isSelected ? "선택됨" : "이 찻잔으로 보기"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
