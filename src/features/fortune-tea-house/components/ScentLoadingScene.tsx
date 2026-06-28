import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import { type TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import YeoniDialogueActor from "./YeoniDialogueActor";
import styles from "../styles/fortune-tea-house.module.css";

type ScentLoadingSceneProps = {
  selectedCup?: TeaHouseCup | null;
};

const loadingBars = [
  { label: "마음속에 남은 향", value: 72 },
  { label: "찻잔 위의 달빛", value: 58 },
  { label: "떠오르는 카드", value: 81 },
];

const scentLoadingDialogue =
  "당신의 말 속에 여러 감정이 겹쳐 있어요.\n겉으로는 하나의 질문처럼 보이지만, 그 안에는 기대와 불안, 미련과 두려움이 함께 들어 있네요.\n조금만 기다려주세요. 오늘은 빠르게 단정하기보다, 마음의 결을 천천히 풀어야 할 것 같아요.";

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
        <YeoniDialogueActor className={styles.flowYeoniActor} mood="thinking" isSpeaking cueText={scentLoadingDialogue} compact />
      </div>
      <div className={styles.emotionPanel}>
        <p className={styles.sceneEyebrow}>{selectedCup?.name || "찻잔"} 위로 향이 피어납니다</p>
        <h2 id="scentLoadingTitle">연이가 마음의 향을 읽고 있어요</h2>
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
