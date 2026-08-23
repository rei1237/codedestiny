"use client";

import { fortuneTeaHouseAssets } from "../data/assets";
import { teaHouseCups, type TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import TeaCupVisual from "./TeaCupVisual";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type TeaCupSelectionSceneProps = {
  selectedCupId?: string;
  onSelect: (cup: TeaHouseCup) => void;
};

/** 찻잔 데이터에서 사전이 덮으면 안 되는 필드. id 는 조회 키, 나머지 둘은 CSS 토큰이다. */
const CUP_SKIP_KEYS = ["id", "particleTone", "accent"];

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    speaker="연이" 는 대사 상자가 이니셜을 고르는 판별자라 여기 없다.
    찻잔의 name·topic·eyebrow·description 은 data/teaCups.ts 의 값이라 아래에서 따로 덮는다. */
const KO = {
  eyebrow: "마음의 향에 반응하는 여섯 잔",
  title: "오늘 당신을 부르는 찻잔",
  description: "연이가 손님의 마음 향을 맡으면, 질문의 결에 맞는 찻잔부터 먼저 빛납니다. 컵 하나를 고르는 순간 상담의 장면도 그 향으로 열려요.",
  yeoniAlt: "찻잔을 건네는 연이",
  dialogue: "손님 마음에서 나는 향이 여섯 잔을 깨우고 있어요.\n연애와 재회, 설렘, 선택, 돈의 흐름, 회복, 결단 중 오늘 가장 강하게 반응하는 잔을 골라주세요.",
  menuAria: "운명의 찻집 상담 메뉴판",
  menuNote: "찻잔은 메뉴가 아니라, 오늘의 질문이 지나갈 작은 운명의 문입니다.",
  reacting: "반응 중",
  smell: "향 맡기",
};

export default function TeaCupSelectionScene({ selectedCupId, onSelect }: TeaCupSelectionSceneProps) {
  const copy = useTeaHouseCopy("teaCupSelection", KO);
  const cups = useTeaHouseCopy("teaCups", teaHouseCups, { skipKeys: CUP_SKIP_KEYS });
  const selectedCup = cups.find((cup) => cup.id === selectedCupId);

  return (
    <section className={styles.teaSelectScene} aria-labelledby="teaCupSelectTitle">
      <div className={styles.teaSelectGuide}>
        <p className={styles.sceneEyebrow}>{copy.eyebrow}</p>
        <h2 id="teaCupSelectTitle">{copy.title}</h2>
        <p className={styles.sceneDescription}>
          {copy.description}
        </p>
        <AssetImage
          className={styles.cupPoseYeoni}
          imageClassName={styles.cupPoseYeoniImage}
          src={fortuneTeaHouseAssets.yeoni.transparent.cupPose}
          fallbackSrc={fortuneTeaHouseAssets.yeoni.cupPose}
          alt={copy.yeoniAlt}
          priority
          loading="eager"
        />
        <TeaHouseDialogueBox speaker="연이" text={copy.dialogue} />
        {selectedCup ? <p className={styles.teaCupSelectedComment}>{selectedCup.selectionComment}</p> : null}
      </div>

      <div className={styles.teaMenuBoard} aria-label={copy.menuAria}>
        <div className={styles.teaMenuHeader}>
          <p>Moonlit Tea Selection</p>
          <h3>{copy.title}</h3>
          <span>{copy.menuNote}</span>
        </div>
        <div className={styles.teaMenuCards}>
          {/* 렌더는 번역본(cups)으로, onSelect 는 원본(teaHouseCups)으로 간다. 선택된 컵의
              name·topic 은 상담 요청에 실려 서버 프롬프트가 되므로 화면용 번역본을 보내지 않는다. */}
          {cups.map((cup, index) => {
            const isSelected = selectedCupId === cup.id;
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
                onClick={() => onSelect(teaHouseCups[index])}
              >
                <TeaCupVisual cup={cup} state={isSelected ? "selected" : "normal"} size="menu" className={styles.teaCupMenuVisual} decorative />
                <span className={styles.teaCupMenuNumber}>{index + 1}</span>
                <span className={styles.teaCupMenuText}>
                  <strong>{cup.name}</strong>
                  <span>{cup.topic}</span>
                  <small>{cup.eyebrow}</small>
                </span>
                <span className={styles.teaCupMenuAction}>{isSelected ? copy.reacting : copy.smell}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
