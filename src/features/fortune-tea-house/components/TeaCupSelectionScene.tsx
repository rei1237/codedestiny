"use client";

import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import { teaHouseCups, type TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import SpriteCrop from "./SpriteCrop";
import TeaCupVisual from "./TeaCupVisual";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";

type TeaCupSelectionSceneProps = {
  selectedCupId?: string;
  onSelect: (cup: TeaHouseCup) => void;
};

const teaCupSelectionDialogue =
  "손님 마음에서 나는 향이 여섯 잔을 깨우고 있어요.\n연애와 재회, 설렘, 선택, 돈의 흐름, 회복, 결단 중 오늘 가장 강하게 반응하는 잔을 골라주세요.";

const teaCupUiSheet = {
  src: fortuneTeaHouseAssets.fallback.teaCups,
  sheetWidth: 1448,
  sheetHeight: 1086,
} as const;

const teaCupDesignCharms: Record<string, { x: number; y: number; width: number; height: number }> = {
  "lotus-moon": { x: 936, y: 870, width: 76, height: 70 },
  "honey-peach": { x: 1176, y: 866, width: 68, height: 70 },
  "star-black-tea": { x: 1255, y: 864, width: 74, height: 76 },
  "gold-cinnamon": { x: 1344, y: 862, width: 78, height: 76 },
  "white-lotus-healing": { x: 1098, y: 866, width: 72, height: 72 },
  "black-moon-brown-rice": { x: 1020, y: 864, width: 70, height: 76 },
};

export default function TeaCupSelectionScene({ selectedCupId, onSelect }: TeaCupSelectionSceneProps) {
  const selectedCup = teaHouseCups.find((cup) => cup.id === selectedCupId);
  const sceneStyle = {
    "--yeoni-cup-pose-sheet": `url("${fortuneTeaHouseAssets.yeoni.transparent.cupPoseSheet}")`,
    "--fallback-teacup-ui": `url("${fortuneTeaHouseAssets.fallback.teaCups}")`,
  } as CSSProperties;

  return (
    <section className={styles.teaSelectScene} style={sceneStyle} aria-labelledby="teaCupSelectTitle">
      <div className={styles.teaSelectGuide}>
        <p className={styles.sceneEyebrow}>마음의 향에 반응하는 여섯 잔</p>
        <h2 id="teaCupSelectTitle">오늘 당신을 부르는 찻잔</h2>
        <p className={styles.sceneDescription}>
          연이가 손님의 마음 향을 맡으면, 질문의 결에 맞는 찻잔부터 먼저 빛납니다.
          컵 하나를 고르는 순간 상담의 장면도 그 향으로 열려요.
        </p>
        <AssetImage
          className={styles.cupPoseYeoni}
          imageClassName={styles.cupPoseYeoniImage}
          src={fortuneTeaHouseAssets.yeoni.transparent.cupPose}
          alt="찻잔을 내미는 연이"
        />
        <TeaHouseDialogueBox speaker="연이" text={teaCupSelectionDialogue} />
        {selectedCup ? <p className={styles.teaCupSelectedComment}>{selectedCup.selectionComment}</p> : null}
      </div>

      <div className={styles.teaMenuBoard} aria-label="운명의 찻집 상담 메뉴판">
        <div className={styles.teaMenuHeader}>
          <p>Moonlit Tea Selection</p>
          <h3>오늘 당신을 부르는 찻잔</h3>
          <span>찻잔은 메뉴가 아니라, 오늘의 질문이 지나갈 작은 운명의 문입니다.</span>
        </div>
        <div className={styles.teaMenuCards}>
          {teaHouseCups.map((cup, index) => {
            const isSelected = selectedCupId === cup.id;
            const charmCrop = teaCupDesignCharms[cup.id] || teaCupDesignCharms["lotus-moon"];
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
                <SpriteCrop
                  className={styles.teaCupMenuDesignFrame}
                  src={teaCupUiSheet.src}
                  sheetWidth={teaCupUiSheet.sheetWidth}
                  sheetHeight={teaCupUiSheet.sheetHeight}
                  x={isSelected ? 638 : 145}
                  y={190}
                  width={250}
                  height={138}
                  alt=""
                  fallback={<span aria-hidden />}
                />
                <SpriteCrop
                  className={styles.teaCupMenuDesignCharm}
                  src={teaCupUiSheet.src}
                  sheetWidth={teaCupUiSheet.sheetWidth}
                  sheetHeight={teaCupUiSheet.sheetHeight}
                  x={charmCrop.x}
                  y={charmCrop.y}
                  width={charmCrop.width}
                  height={charmCrop.height}
                  alt=""
                  fallback={<span aria-hidden />}
                />
                <TeaCupVisual cup={cup} state={isSelected ? "selected" : "normal"} size="menu" className={styles.teaCupMenuVisual} decorative />
                <span className={styles.teaCupMenuNumber}>{index + 1}</span>
                <span className={styles.teaCupMenuText}>
                  <strong>{cup.name}</strong>
                  <span>{cup.topic}</span>
                  <small>{cup.eyebrow}</small>
                </span>
                <span className={styles.teaCupMenuAction}>{isSelected ? "반응 중" : "향 맡기"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
