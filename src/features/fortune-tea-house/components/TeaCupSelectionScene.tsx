"use client";

import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import { teaHouseCups, type TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import SpriteCrop from "./SpriteCrop";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";

type TeaCupSelectionSceneProps = {
  selectedCupId?: string;
  onSelect: (cup: TeaHouseCup) => void;
};

const teaCupStateSheet = {
  width: 1448,
  height: 1086,
  columns: 6,
  rows: 3,
} as const;

const teaCupCell = {
  width: teaCupStateSheet.width / teaCupStateSheet.columns,
  height: teaCupStateSheet.height / teaCupStateSheet.rows,
} as const;

const teaCupSelectionDialogue =
  "마음이 먼저 끌리는 찻잔을 골라주세요.\n선택한 차의 향에 맞춰 사주와 타로의 방향을 조용히 읽어드릴게요.";

export default function TeaCupSelectionScene({ selectedCupId, onSelect }: TeaCupSelectionSceneProps) {
  const selectedCup = teaHouseCups.find((cup) => cup.id === selectedCupId);
  const guideStyle = {
    "--yeoni-cup-pose-sheet": `url("${fortuneTeaHouseAssets.yeoni.transparent.cupPoseSheet}")`,
  } as CSSProperties;

  return (
    <section className={styles.teaSelectScene} aria-labelledby="teaCupSelectTitle">
      <div className={styles.teaSelectGuide} style={guideStyle}>
        <p className={styles.sceneEyebrow}>마음이 먼저 알아보는 차</p>
        <h2 id="teaCupSelectTitle">오늘의 고민에는 어떤 찻잔이 어울릴까요?</h2>
        <p className={styles.sceneDescription}>
          찻잔은 상담의 방향을 정하는 작은 문입니다. 연이는 선택한 찻잔을 기준으로
          사주와 타로의 흐름을 함께 읽어드립니다.
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
          <span>하나를 고르면 연이가 그 차의 향으로 상담을 시작합니다.</span>
        </div>
        <div className={styles.teaMenuCards}>
          {teaHouseCups.map((cup, index) => {
            const isSelected = selectedCupId === cup.id;
            const stateRow = isSelected ? 2 : 0;
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
                  className={styles.teaCupMenuVisual}
                  src={fortuneTeaHouseAssets.teaCups.transparentStateSheet}
                  sheetWidth={teaCupStateSheet.width}
                  sheetHeight={teaCupStateSheet.height}
                  x={index * teaCupCell.width}
                  y={stateRow * teaCupCell.height}
                  width={teaCupCell.width}
                  height={teaCupCell.height}
                  alt=""
                />
                <span className={styles.teaCupMenuNumber}>{index + 1}</span>
                <span className={styles.teaCupMenuText}>
                  <strong>{cup.name}</strong>
                  <span>주제: {cup.topic}</span>
                  <small>{cup.description}</small>
                </span>
                <span className={styles.teaCupMenuAction}>{isSelected ? "선택됨" : "고르기"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
