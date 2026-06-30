import { useEffect, useState, type CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import type { FortuneTeaHouseConsultMode } from "../data/consult";
import { type TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import TeaCupVisual from "./TeaCupVisual";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";

const tarotAromaParticles = ["moon", "petal", "heart", "spark", "steam"];
const TAROT_SCENT_PIG_FRAME_MS = 675;
const tarotScentPigFrames = [
  { x: 45, y: 31, width: 282, height: 303 },
  { x: 379, y: 35, width: 262, height: 299 },
  { x: 724, y: 35, width: 250, height: 299 },
  { x: 1031, y: 44, width: 250, height: 290 },
  { x: 23, y: 349, width: 295, height: 325 },
  { x: 384, y: 345, width: 252, height: 329 },
  { x: 731, y: 345, width: 237, height: 328 },
  { x: 1054, y: 345, width: 272, height: 328 },
  { x: 44, y: 717, width: 253, height: 297 },
  { x: 377, y: 725, width: 267, height: 288 },
  { x: 714, y: 728, width: 272, height: 285 },
  { x: 1061, y: 731, width: 257, height: 283 },
  { x: 85, y: 1032, width: 228, height: 289 },
  { x: 374, y: 1066, width: 273, height: 288 },
  { x: 717, y: 1066, width: 265, height: 287 },
  { x: 1064, y: 1062, width: 251, height: 291 },
] as const;
const tarotScentPigSpriteSheet = {
  width: 1360,
  height: 1360,
} as const;

type ScentLoadingSceneProps = {
  selectedCup?: TeaHouseCup | null;
  consultationMode?: FortuneTeaHouseConsultMode;
  progress?: {
    percent: number;
    label: string;
    message: string;
    delayed?: boolean;
    status?: "running" | "complete" | "error";
  };
};
const scentPanelUi =
  "relative overflow-hidden rounded-[30px] border border-[#f6dfb7]/25 bg-gradient-to-br from-[#241337]/90 via-[#12091f]/90 to-[#080511]/95 shadow-[0_36px_104px_rgba(4,2,12,0.5),0_0_58px_rgba(206,196,255,0.13),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-white/10 backdrop-blur-2xl";
const scentDialogueUi =
  "border-[#f6dfb7]/30 bg-[#12091f]/70 shadow-[0_22px_66px_rgba(4,2,12,0.34),0_0_38px_rgba(206,196,255,0.12),inset_0_1px_0_rgba(255,255,255,0.14)]";
const scentProgressUi =
  "rounded-[22px] border border-[#f6dfb7]/20 bg-white/[0.06] shadow-[0_20px_58px_rgba(4,2,12,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/5 backdrop-blur-xl";

export default function ScentLoadingScene({ selectedCup, consultationMode = "tarot", progress }: ScentLoadingSceneProps) {
  const isTarotMode = consultationMode === "tarot";
  const [tarotScentPigFrameIndex, setTarotScentPigFrameIndex] = useState(0);
  const chatLine =
    consultationMode === "saju"
      ? "잠깐만요. 사주의 결은 서두르면 놓치는 향이 있어서, 잔을 조금 더 데워 볼게요."
      : consultationMode === "sukuyo"
        ? "두 사람의 달빛이 서로 어떻게 닿는지 보고 있어요. 말은 천천히 골라드릴게요."
        : "킁킁… 이 질문에는 아직 말하지 못한 마음이 묻어 있어요.";
  const progressSteps =
    consultationMode === "saju"
      ? [
          "프로필 확인",
          "명식 계산",
          "오행과 십성",
          "상담문 정리",
        ]
      : consultationMode === "sukuyo"
        ? [
            "달빛 자리",
            "27숙 거리",
            "관계 온도",
            "상담문 정리",
          ]
        : [
          "질문 확인",
          "카드 상징",
          "마음의 향",
          "상담문 정리",
        ];
  const loadingTitle =
    consultationMode === "saju"
      ? "연이가 사주의 향을 살피고 있어요"
      : consultationMode === "sukuyo"
        ? "연이가 27숙 인연의 흐름을 살피고 있어요"
        : "연이가 마음의 향을 살짝 맡아보고 있어요";
  const scentLoadingDialogue = selectedCup
    ? `${selectedCup.loadingLine}\n${
        consultationMode === "saju"
          ? "연이가 사주의 드러난 결만 조심스럽게 상담에 올리고 있어요."
          : consultationMode === "sukuyo"
            ? "연이가 두 사람의 27숙 거리와 관계의 온도를 조용히 엮고 있어요."
          : "카드가 향기의 결을 따라 움직이고 있어요."
      }`
    : isTarotMode
      ? `${loadingTitle}\n카드가 향기의 결을 따라 움직이고 있어요.`
      : `${loadingTitle}\n열리지 않은 것은 지어내지 않고, 지금 드러난 결만 고요히 읽습니다.`;
  const waitingSprite = fortuneTeaHouseAssets.yeoni.transparent.cupPoseSpriteSheet;
  const tarotScentPigSprite = fortuneTeaHouseAssets.yeoni.transparent.talkingPigYeoni3Sprite;
  const tarotScentPigFrame = tarotScentPigFrames[tarotScentPigFrameIndex] || tarotScentPigFrames[0];
  const teaChatStyle = {
    "--yeoni-tea-chat-sprite": `url("${waitingSprite}")`,
  } as CSSProperties;
  const tarotScentPigStyle = {
    "--pig-sprite-x": `${tarotScentPigFrame.x}px`,
    "--pig-sprite-y": `${tarotScentPigFrame.y}px`,
    "--pig-sprite-width": `${tarotScentPigFrame.width}px`,
    "--pig-sprite-height": `${tarotScentPigFrame.height}px`,
    "--pig-sprite-aspect-width": tarotScentPigFrame.width,
    "--pig-sprite-aspect-height": tarotScentPigFrame.height,
    "--pig-sprite-sheet-width": `${tarotScentPigSpriteSheet.width}px`,
    "--pig-sprite-sheet-height": `${tarotScentPigSpriteSheet.height}px`,
  } as CSSProperties;
  const activeProgress = progress || {
    percent: 5,
    label: "요청 접수",
    message: "찻잔 위에 질문을 올리고 있어요.",
    status: "running" as const,
  };
  const visiblePercent = activeProgress.status === "complete"
    ? 100
    : Math.max(5, Math.min(95, activeProgress.percent));
  const activeStepIndex = Math.min(
    progressSteps.length - 1,
    Math.max(0, Math.floor((visiblePercent / 100) * progressSteps.length)),
  );

  useEffect(() => {
    if (!isTarotMode) return;
    const timer = window.setInterval(() => {
      setTarotScentPigFrameIndex((current) => (current + 1) % tarotScentPigFrames.length);
    }, TAROT_SCENT_PIG_FRAME_MS);
    return () => window.clearInterval(timer);
  }, [isTarotMode]);

  return (
    <section className={`${styles.emotionScene} ${isTarotMode ? styles.tarotScentScene : ""}`} data-accent={selectedCup?.accent || "pink"} aria-labelledby="scentLoadingTitle">
      <div className={`${styles.emotionVisual} ${isTarotMode ? styles.tarotScentVisual : ""}`}>
        {isTarotMode ? (
          <div className={styles.scentPigStage} aria-label="연이가 마음의 향을 살피는 장면">
            <span className={styles.scentPigMoon} aria-hidden />
            <span className={styles.scentPigTable} aria-hidden />
            <span className={styles.scentPigAroma} aria-hidden>
              {tarotAromaParticles.map((particle) => (
                <i key={particle} />
              ))}
            </span>
            {selectedCup ? (
              <TeaCupVisual cup={selectedCup} state="selected" size="large" className={styles.scentPigTeaCup} decorative />
            ) : (
              <span className={styles.scentPigTeaCupFallback} aria-hidden />
            )}
            <span
              className={`${styles.scentPigActor} ${styles.scentWaitingYeoniSprite} ${styles.pigSpriteFrame}`}
              style={tarotScentPigStyle}
              role="img"
              aria-label="마음의 향을 맡는 꽃돼지 연이"
            >
              <img
                className={styles.pigSpriteSheet}
                src={tarotScentPigSprite}
                alt=""
                decoding="async"
                loading="eager"
                aria-hidden
              />
            </span>
            <span className={styles.scentPigSparkle} aria-hidden />
            <span className={styles.scentPigBubble}>
              <strong>연이</strong>
              <span>{chatLine}</span>
            </span>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
      <div className={`${styles.emotionPanel} ${scentPanelUi}`}>
        <p className={styles.sceneEyebrow}>{selectedCup?.name || "찻잔"} 위로 향이 피어납니다</p>
        <h2 id="scentLoadingTitle">{selectedCup?.loadingLine || loadingTitle}</h2>
        <TeaHouseDialogueBox
          speaker="연이"
          text={scentLoadingDialogue}
          className={scentDialogueUi}
        />
        <div className={`${styles.loadingProgressPanel} ${scentProgressUi}`} aria-label="상담 생성 진행 상태">
          <div className={styles.loadingProgressHeader}>
            <span>{activeProgress.label}</span>
            <strong>{visiblePercent}%</strong>
          </div>
          <div
            className={styles.loadingProgressTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={visiblePercent}
            aria-label={activeProgress.label}
          >
            <span style={{ "--gauge-value": `${visiblePercent}%` } as CSSProperties} />
          </div>
          <p>{activeProgress.message}</p>
          <div className={styles.loadingProgressSteps} aria-hidden>
            {progressSteps.map((label, index) => (
              <span key={label} data-active={index <= activeStepIndex ? "true" : "false"}>
                {label}
              </span>
            ))}
          </div>
          {activeProgress.delayed ? (
            <p className={styles.loadingDelayNotice}>상담문을 조금 더 깊게 엮고 있어요. 오래 머물면 새로고침하지 말고 잠시만 기다려 주세요.</p>
          ) : null}
          {activeProgress.status === "error" ? (
            <p className={styles.loadingDelayNotice}>흐름이 끊기면 입력 화면에서 같은 질문으로 다시 시도할 수 있어요.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
