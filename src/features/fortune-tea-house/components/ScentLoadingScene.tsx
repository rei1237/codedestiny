import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import type { FortuneTeaHouseConsultMode } from "../data/consult";
import { type TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import TeaCupVisual from "./TeaCupVisual";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";

type ScentLoadingSceneProps = {
  selectedCup?: TeaHouseCup | null;
  consultationMode?: FortuneTeaHouseConsultMode;
};

export default function ScentLoadingScene({ selectedCup, consultationMode = "tarot" }: ScentLoadingSceneProps) {
  const chatLine =
    consultationMode === "saju"
      ? "잠깐만요. 사주의 결은 서두르면 놓치는 향이 있어서, 잔을 조금 더 데워 볼게요."
      : consultationMode === "sukuyo"
        ? "두 사람의 달빛이 서로 어떻게 닿는지 보고 있어요. 말은 천천히 골라드릴게요."
        : "카드가 아직 잔 위에서 고르는 중이에요. 기다리는 동안 차가 식지 않게 제가 들고 있을게요.";
  const loadingBars =
    consultationMode === "saju"
      ? [
          { label: "찻잔의 향이 출생정보와 질문의 온도를 모으고 있어요.", value: 42 },
          { label: "오행과 십성의 결을 확인된 흐름 안에서만 살피고 있어요.", value: 68 },
          { label: "연이가 사주의 말로 오늘의 기준을 고르고 있어요.", value: 92 },
        ]
      : consultationMode === "sukuyo"
        ? [
            { label: "두 사람의 생년월일이 달빛 아래 나란히 놓이고 있어요.", value: 42 },
            { label: "27숙의 거리와 관계 유형을 확인된 흐름 안에서 살피고 있어요.", value: 68 },
            { label: "연이가 인연의 말로 오늘 건넬 한 문장을 고르고 있어요.", value: 92 },
          ]
      : [
          { label: "찻잔의 향이 지금 질문의 온도를 모으고 있어요.", value: 42 },
          { label: "선택된 카드의 상징이 달빛 위에 천천히 떠오르고 있어요.", value: 68 },
          { label: "연이가 타로의 말로 다음 장면을 고르고 있어요.", value: 92 },
        ];
  const loadingTitle =
    consultationMode === "saju"
      ? "연이가 사주의 향을 살피고 있어요"
      : consultationMode === "sukuyo"
        ? "연이가 27숙 인연의 흐름을 살피고 있어요"
        : "연이가 타로의 향을 살피고 있어요";
  const scentLoadingDialogue = selectedCup
    ? `${selectedCup.loadingLine}\n${
        consultationMode === "saju"
          ? "연이가 사주의 드러난 결만 조심스럽게 상담에 올리고 있어요."
          : consultationMode === "sukuyo"
            ? "연이가 두 사람의 27숙 거리와 관계의 온도를 조용히 엮고 있어요."
          : "연이가 타로의 상징만 따라 지금 질문의 장면을 고요히 읽고 있어요."
      }`
    : `${loadingTitle}\n열리지 않은 것은 지어내지 않고, 지금 드러난 결만 고요히 읽습니다.`;
  const teaChatStyle = {
    "--yeoni-tea-chat-sprite": `url("${fortuneTeaHouseAssets.yeoni.transparent.teaChatSprite}")`,
  } as CSSProperties;

  return (
    <section className={styles.emotionScene} data-accent={selectedCup?.accent || "pink"} aria-labelledby="scentLoadingTitle">
      <div className={styles.emotionVisual}>
        <AssetImage
          className={styles.loadingSceneAsset}
          src={fortuneTeaHouseAssets.backgrounds.loadingScene}
          alt="달빛 찻잔이 떠오르는 로딩 장면"
          priority
        />
        <AssetImage
          className={styles.emotionGaugeAsset}
          src={fortuneTeaHouseAssets.pig.emotionGauge}
          alt="마음의 향을 읽는 감정 분석 장식"
        />
        <div className={styles.scentLoadingTeaChatStage} style={teaChatStyle}>
          <span className={styles.scentLoadingTeaChatAura} aria-hidden />
          <span className={styles.scentLoadingTeaChatSprite} role="img" aria-label="찻잔을 들고 기다리는 연이" />
          <span className={styles.scentLoadingTeaChatBubble}>
            <strong>연이</strong>
            <span>{chatLine}</span>
          </span>
          {selectedCup ? <TeaCupVisual cup={selectedCup} state="selected" size="large" className={styles.scentLoadingTeaCupBadge} /> : null}
        </div>
      </div>
      <div className={styles.emotionPanel}>
        <p className={styles.sceneEyebrow}>{selectedCup?.name || "찻잔"} 위로 향이 피어납니다</p>
        <h2 id="scentLoadingTitle">{selectedCup?.loadingLine || loadingTitle}</h2>
        <TeaHouseDialogueBox
          speaker="연이"
          text={scentLoadingDialogue}
        />
        <div className={styles.loadingGaugeList} aria-label="마음의 향 분석 진행 중">
          {loadingBars.map((bar) => (
            <div className={styles.loadingGaugeItem} key={bar.label}>
              <span>{bar.label}</span>
              <strong>{bar.value}%</strong>
              <div className={styles.loadingGaugeTrack}>
                <span style={{ "--gauge-value": `${bar.value}%` } as CSSProperties} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
