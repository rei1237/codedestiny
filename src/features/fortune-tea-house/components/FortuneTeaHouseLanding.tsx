"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Clock3, DoorOpen, Sparkles } from "lucide-react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import { fortuneTeaHouseAssets, talkingPigYeoniFrameCrops } from "../data/assets";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import TeaHouseButton from "./TeaHouseButton";
import styles from "../styles/fortune-tea-house.module.css";

type FortuneTeaHouseLandingProps = {
  hasSeenPrologue: boolean;
  onEnter: () => void;
  onReplayPrologue: () => void;
  onShowHistory: () => void;
};

const talkingPigFrames = [
  talkingPigYeoniFrameCrops.welcome,
  talkingPigYeoniFrameCrops.thinking,
  talkingPigYeoniFrameCrops.surprised,
] as const;

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다(없으면 이 문구가 그대로 남는다). */
const KO = {
  // 순서가 talkingPigFrames 와 1:1 이다 — 프레임이 바뀌면 여기도 같이 바꿀 것.
  speeches: [
    "어서 오세요. 오늘의 마음은 제가 먼저 따뜻하게 데워둘게요.",
    "질문은 천천히 꺼내도 괜찮아요. 찻잎은 마음의 속도를 기다릴 줄 알아요.",
    "달빛이 조금 더 가까워졌어요. 지금의 흐름을 함께 살펴볼까요?",
  ],
  title: "운명의 찻집",
  leadTop: "달빛 골목 끝에서 문이 열립니다.",
  leadBottom: "연이가 당신의 질문을 먼저 부드럽게 맞이합니다.",
  intro: "말로 꺼내기 어려웠던 마음을 찻잔 앞에 내려놓으면, 찻잎과 카드의 상징이 지금 붙잡아야 할 방향을 조용히 비춥니다.",
  enterAriaSeen: "운명의 찻집 상담 바로 시작하기",
  enterAriaFirst: "운명의 찻집 프롤로그 시작하기",
  enterLabelSeen: "바로 상담 시작하기",
  enterLabelFirst: "찻집에 들어가기",
  replayAria: "운명의 찻집 프롤로그 다시 보기",
  replayLabel: "프롤로그 다시 보기",
  historyAria: "운명의 찻집 상담 기록 보기",
  historyLabel: "상담 기록 보기",
  visualAria: "문 앞에서 손님을 맞이하는 꽃돼지 연이",
  guideAria: "운명의 찻집 이용 안내",
  guide: {
    reading: {
      title: "찻잔 앞에 잠시 멈추면 마음의 질문이 선명해집니다",
      body1: "운명의 찻집은 연이가 질문의 온도를 먼저 살피고, 찻잎과 카드의 상징을 따라 지금의 감정과 선택지를 부드럽게 정리하는 상담 공간입니다.",
      body2: "빠른 결론보다 마음이 왜 그 질문에 머무는지를 먼저 봅니다. 불안을 키우는 단정 대신, 지금 붙잡아도 되는 것과 내려놓아야 하는 것을 차분히 나눕니다.",
    },
    flow: {
      title: "질문은 작아도 마음의 결은 충분히 깊게 읽습니다",
      body1: "이름, 생년월일, 필요하면 출생 정보와 질문을 바탕으로 연애, 관계, 선택, 흐름을 각각 다른 언어로 비춥니다.",
      body2: "타로는 감정의 장면을, 사주는 오래 이어진 패턴을, 숙요는 관계의 거리와 호흡을 살펴보며 사용자가 오늘 할 수 있는 행동으로 연결합니다.",
    },
    promise: {
      title: "상처를 크게 만들지 않고, 필요한 말만 부드럽게 건넵니다",
      body1: "운명의 찻집은 사용자의 마음을 겁주지 않습니다. 가능성과 흐름을 중심으로 읽고, 선택을 대신하기보다 생각을 정리할 수 있는 문장을 건넵니다.",
    },
  },
};

const landingPetals = Array.from({ length: 16 }, (_, index) => index);
const landingSceneUi = "relative isolate min-h-[100dvh] overflow-hidden bg-[#080511] text-[#fffaf1] antialiased";
const landingHeroUi = "relative isolate min-h-[100dvh] overflow-hidden";
const landingCopyUi = "relative z-10 mx-auto max-w-[620px] [text-wrap:balance] lg:mx-0";
const landingBadgeUi =
  "inline-flex items-center justify-center !rounded-full !border !border-[#f6dfb7]/25 !bg-[#12091f]/40 px-4 py-2 !font-[var(--tea-font-premium)] !text-[0.78rem] !font-semibold !tracking-[0] !text-[#ffe8a6] !shadow-[0_12px_28px_rgba(4,2,12,0.2),0_0_22px_rgba(246,223,183,0.12)] ring-1 ring-white/10 backdrop-blur-md";
const landingTitleUi =
  "!font-[var(--tea-font-display)] !font-medium !tracking-[0] !text-[#fffaf1] drop-shadow-[0_18px_42px_rgba(4,2,12,0.58)]";
const landingLeadUi =
  "max-w-[540px] !font-[var(--tea-font-premium)] !text-[#fffaf1]/90 drop-shadow-[0_10px_24px_rgba(4,2,12,0.45)]";
const landingIntroUi =
  "max-w-[560px] !font-[var(--tea-font-body)] !leading-[1.78] !text-[#fff7e8]/80 drop-shadow-[0_8px_22px_rgba(4,2,12,0.38)]";
const landingActionsUi = "w-full max-w-[460px]";
const landingHistoryUi =
  "mt-3 flex min-h-11 w-full max-w-[460px] items-center justify-center gap-2 !rounded-[0.85rem] !border !border-[#f6dfb7]/20 !bg-[#12091f]/35 px-4 py-2.5 !font-[var(--tea-font-premium)] !text-[0.92rem] !font-semibold !text-[#fffaf1]/90 !shadow-[0_12px_28px_rgba(4,2,12,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/5 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:!border-[#ffe8a6]/45 hover:!text-[#fffaf1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe8a6]/75";
const landingGuideUi = "sr-only";
const landingGuideCardUi = "grid min-w-0 content-start gap-2.5 rounded-[8px] border border-[#f6dfb7]/20 p-4 sm:p-5 md:gap-3 md:p-6";
const landingGuideBadgeUi =
  "w-fit rounded-full border border-[#f6dfb7]/30 bg-[#12091f]/45 px-2.5 py-1 !font-[var(--tea-font-premium)] !text-[0.72rem] !font-extrabold !leading-none !tracking-[0] !text-[#ffe8a6]";
const landingGuideTitleUi =
  "m-0 !font-[var(--tea-font-display)] !text-[1.03rem] !font-medium !leading-[1.34] !tracking-[0] !text-[#fffaf1] md:!text-[1.28rem] lg:!text-[1.4rem]";
const landingGuideBodyUi =
  "m-0 break-keep !font-[var(--tea-font-body)] !text-[0.84rem] !font-medium !leading-[1.66] !text-[#fff7e8]/80 md:!text-[0.94rem] md:!leading-[1.82]";
const landingGuideCardStyle: CSSProperties = {
  background:
    "radial-gradient(circle at 18% 0%, rgba(246, 223, 183, 0.13), transparent 38%), linear-gradient(145deg, rgba(18, 9, 31, 0.78), rgba(38, 19, 56, 0.58))",
  boxShadow: "0 22px 54px rgba(4, 2, 12, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
  backdropFilter: "blur(18px)",
};

export default function FortuneTeaHouseLanding({ hasSeenPrologue, onEnter, onReplayPrologue, onShowHistory }: FortuneTeaHouseLandingProps) {
  const copy = useTeaHouseCopy("landing", KO);
  const pigGate = useSpritePlaybackGate<HTMLSpanElement>();
  const [activePigFrame, setActivePigFrame] = useState(0);
  const [usePigFallback, setUsePigFallback] = useState(false);
  const [usePigSingleFallback, setUsePigSingleFallback] = useState(false);
  const activePig = talkingPigFrames[activePigFrame] || talkingPigFrames[0];
  const activePigSrc = usePigSingleFallback
    ? fortuneTeaHouseAssets.cutout.flowerPig
    : usePigFallback
      ? activePig.fallbackSrc
      : activePig.src;

  useEffect(() => {
    if (!pigGate.canAnimate) {
      setActivePigFrame(0);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setActivePigFrame((current) => (current + 1) % talkingPigFrames.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [pigGate.canAnimate]);

  useEffect(() => {
    setUsePigFallback(false);
    setUsePigSingleFallback(false);
  }, [activePigFrame]);

  return (
    <section className={`${styles.landingScene} ${landingSceneUi}`} aria-labelledby="fortuneTeaHouseTitle">
      <div
        className={`${styles.landingHero} ${landingHeroUi}`}
        style={
          {
            "--landing-bg-desktop": `url("${fortuneTeaHouseAssets.premium.landingDesktop}")`,
            "--landing-bg-mobile": `url("${fortuneTeaHouseAssets.premium.landingMobile}")`,
            "--landing-overlay": `url("${fortuneTeaHouseAssets.ui.overlay}")`,
            "--landing-overlay-2": `url("${fortuneTeaHouseAssets.ui.overlay2}")`,
            "--landing-bubble-overlay": `url("${fortuneTeaHouseAssets.ui.overlayCutout}")`,
            "--landing-bubble-overlay-2": `url("${fortuneTeaHouseAssets.ui.overlay2Cutout}")`,
          } as CSSProperties
        }
      >
        <span className={styles.landingMoonGlow} aria-hidden />
        <span className={styles.landingTeaGlow} aria-hidden />
        <span className={styles.landingHeroGlow} aria-hidden />
        <span className={styles.landingParticles} aria-hidden>
          {landingPetals.map((petal) => (
            <span key={petal} />
          ))}
        </span>
        <div className={styles.landingHeroContent}>
          <div className={`${styles.landingCopy} ${landingCopyUi}`}>
            <p className={`${styles.landingBadge} ${landingBadgeUi}`}>Moonlight Fortune Tea House</p>
            {/* 페이지의 H1 은 page.tsx 의 ServiceIntroSection 이 소유한다. id 는 그대로 두어 위 aria-labelledby 가 계속 가리킨다. */}
            <h2 id="fortuneTeaHouseTitle" className={landingTitleUi}>{copy.title}</h2>
            <p className={`${styles.landingLead} ${landingLeadUi}`}>
              {copy.leadTop}
              <br />
              {copy.leadBottom}
            </p>
            <p className={`${styles.landingIntro} ${landingIntroUi}`}>
              {copy.intro}
            </p>
            <div className={`${styles.landingActions} ${landingActionsUi}`}>
              <TeaHouseButton
                className="min-h-[52px] rounded-[1rem] text-[1rem] shadow-[0_22px_54px_rgba(4,2,12,0.36),0_0_34px_rgba(246,223,183,0.18),inset_0_1px_0_rgba(255,255,255,0.42)]"
                onClick={onEnter}
                aria-label={hasSeenPrologue ? copy.enterAriaSeen : copy.enterAriaFirst}
              >
                <DoorOpen size={18} strokeWidth={2.2} aria-hidden />
                <span>{hasSeenPrologue ? copy.enterLabelSeen : copy.enterLabelFirst}</span>
              </TeaHouseButton>
            </div>
            {hasSeenPrologue ? (
              <button className={`${styles.landingHistoryButton} ${landingHistoryUi}`} type="button" onClick={onReplayPrologue} aria-label={copy.replayAria}>
                <Sparkles size={16} strokeWidth={2.2} aria-hidden />
                <span>{copy.replayLabel}</span>
              </button>
            ) : null}
            <button className={`${styles.landingHistoryButton} ${landingHistoryUi}`} type="button" onClick={onShowHistory} aria-label={copy.historyAria}>
              <Clock3 size={16} strokeWidth={2.2} aria-hidden />
              <span>{copy.historyLabel}</span>
            </button>
          </div>

          <div className={styles.landingVisual} aria-label={copy.visualAria}>
            <span className={styles.landingPigAura} aria-hidden />
            <div className={styles.landingSpeechWrap} role="note">
              <span className={styles.landingSpeechOrnament} aria-hidden />
              <p>{copy.speeches[activePigFrame] || copy.speeches[0]}</p>
            </div>
            <span
              ref={pigGate.ref}
              className={`${styles.landingPigMascot} ${usePigSingleFallback ? "" : styles.pigSpriteFrame}`}
              style={
                {
                  "--pig-sprite-x": `${activePig.x}px`,
                  "--pig-sprite-y": `${activePig.y}px`,
                  "--pig-sprite-width": `${activePig.width}px`,
                  "--pig-sprite-height": `${activePig.height}px`,
                  "--pig-sprite-aspect-width": activePig.width,
                  "--pig-sprite-aspect-height": activePig.height,
                  "--pig-sprite-sheet-width": `${activePig.sheetWidth}px`,
                  "--pig-sprite-sheet-height": `${activePig.sheetHeight}px`,
                } as CSSProperties
              }
            >
              <Image
                className={usePigSingleFallback ? styles.landingPigSingleImage : styles.pigSpriteSheet}
                src={activePigSrc}
                alt={activePig.label}
                fill
                sizes="(max-width: 640px) 48vw, 24vw"
                loading="lazy"
                unoptimized
                onError={() => {
                  if (!usePigFallback && !usePigSingleFallback) {
                    setUsePigFallback(true);
                    return;
                  }
                  setUsePigSingleFallback(true);
                }}
              />
            </span>
          </div>
        </div>
      </div>
      <div className={landingGuideUi} aria-label={copy.guideAria}>
        <article className={landingGuideCardUi} style={landingGuideCardStyle}>
          <span className={landingGuideBadgeUi}>Tea Reading</span>
          <h2 className={landingGuideTitleUi}>{copy.guide.reading.title}</h2>
          <p className={landingGuideBodyUi}>
            {copy.guide.reading.body1}
          </p>
          <p className={landingGuideBodyUi}>
            {copy.guide.reading.body2}
          </p>
        </article>
        <article className={landingGuideCardUi} style={landingGuideCardStyle}>
          <span className={landingGuideBadgeUi}>Moonlit Flow</span>
          <h2 className={landingGuideTitleUi}>{copy.guide.flow.title}</h2>
          <p className={landingGuideBodyUi}>
            {copy.guide.flow.body1}
          </p>
          <p className={landingGuideBodyUi}>
            {copy.guide.flow.body2}
          </p>
        </article>
        <article className={landingGuideCardUi} style={landingGuideCardStyle}>
          <span className={landingGuideBadgeUi}>Yeoni&apos;s Promise</span>
          <h2 className={landingGuideTitleUi}>{copy.guide.promise.title}</h2>
          <p className={landingGuideBodyUi}>
            {copy.guide.promise.body1}
          </p>
        </article>
      </div>
    </section>
  );
}
