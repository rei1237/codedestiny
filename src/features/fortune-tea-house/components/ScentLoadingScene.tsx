import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import { type TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import TeaCupVisual from "./TeaCupVisual";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";

type ScentLoadingSceneProps = {
  selectedCup?: TeaHouseCup | null;
};

export default function ScentLoadingScene({ selectedCup }: ScentLoadingSceneProps) {
  const loadingBars = selectedCup?.loadingBars || [
    { label: "찻잔과 타로가 지금 질문의 향을 모으고 있어요.", value: 42 },
    { label: "사주의 흐름이 열리면 함께 비추고 있어요.", value: 68 },
    { label: "연이가 빈 화면 없이 이어질 상담을 정리하고 있어요.", value: 92 },
  ];
  const scentLoadingDialogue = selectedCup
    ? `${selectedCup.loadingLine}\n사주가 열리면 기본 흐름을 함께 보고, 열리지 않아도 찻잔과 타로 중심으로 상담은 계속 이어져요.`
    : "찻잔과 타로가 지금 질문의 향을 모으고 있어요.\n사주가 잠시 열리지 않아도 상담은 멈추지 않습니다.";

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
        <AssetImage
          className={styles.scentLoadingCupPoseYeoni}
          imageClassName={styles.scentLoadingCupPoseYeoniImage}
          src={fortuneTeaHouseAssets.yeoni.transparent.cupPose}
          alt="답을 담은 찻잔을 내미는 연이"
          priority
        />
        {selectedCup ? <TeaCupVisual cup={selectedCup} state="selected" size="large" className={styles.scentLoadingTeaCup} /> : null}
      </div>
      <div className={styles.emotionPanel}>
        <p className={styles.sceneEyebrow}>{selectedCup?.name || "찻잔"} 위로 향이 피어납니다</p>
        <h2 id="scentLoadingTitle">{selectedCup?.loadingLine || "연이가 찻잔 위의 흐름을 읽고 있어요"}</h2>
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
