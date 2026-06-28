import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import { type TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";

type ScentLoadingSceneProps = {
  selectedCup?: TeaHouseCup | null;
};

const loadingBars = [
  { label: "사주 기운을 조용히 펼치는 중이에요…", value: 34 },
  { label: "오늘 찻집에 들어온 십성을 확인하고 있어요…", value: 48 },
  { label: "타로 카드가 달빛 위로 떠오르고 있어요…", value: 66 },
  { label: "사주와 타로가 만나는 지점을 정리하고 있어요…", value: 82 },
  { label: "연이가 당신에게 필요한 한마디를 따뜻하게 고르고 있어요…", value: 94 },
];

const scentLoadingDialogue =
  "인간 상담사 연이가 찻잔 위의 흐름을 읽고 있어요.\n사주는 당신의 기본 흐름을 보여주고, 타로는 지금 이 질문의 상징을 보여줘요.\n두 이야기가 만나는 지점을 따뜻하게 정리할 테니 조금만 기다려주세요.";

export default function ScentLoadingScene({ selectedCup }: ScentLoadingSceneProps) {
  return (
    <section className={styles.emotionScene} aria-labelledby="scentLoadingTitle">
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
      </div>
      <div className={styles.emotionPanel}>
        <p className={styles.sceneEyebrow}>{selectedCup?.name || "찻잔"} 위로 향이 피어납니다</p>
        <h2 id="scentLoadingTitle">연이가 찻잔 위의 흐름을 읽고 있어요</h2>
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
