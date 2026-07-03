"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Clock3, DoorOpen, Sparkles } from "lucide-react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import { fortuneTeaHouseAssets, talkingPigYeoniFrameCrops } from "../data/assets";
import TeaHouseButton from "./TeaHouseButton";
import styles from "../styles/fortune-tea-house.module.css";

type FortuneTeaHouseLandingProps = {
  hasSeenPrologue: boolean;
  onEnter: () => void;
  onReplayPrologue: () => void;
  onShowHistory: () => void;
};

const talkingPigFrames = [
  {
    ...talkingPigYeoniFrameCrops.welcome,
    speech: "꿀… 문 앞에서 기다리고 있었어.",
  },
  {
    ...talkingPigYeoniFrameCrops.thinking,
    speech: "달빛 찻잔이 네 마음을 알아볼 거야.",
  },
  {
    ...talkingPigYeoniFrameCrops.surprised,
    speech: "조금만 더 가까이 와 봐.",
  },
] as const;

const landingPetals = Array.from({ length: 16 }, (_, index) => index);
const landingSceneUi =
  "relative isolate min-h-[100dvh] overflow-hidden bg-[#080511] text-[#fffaf1] antialiased";
const landingHeroUi =
  "relative isolate min-h-[100dvh] overflow-hidden";
const landingCopyUi =
  "relative z-10 mx-auto max-w-[620px] [text-wrap:balance] lg:mx-0";
const landingBadgeUi =
  "inline-flex items-center justify-center !rounded-full !border !border-[#f6dfb7]/25 !bg-[#12091f]/40 px-4 py-2 !font-[var(--tea-font-premium)] !text-[0.78rem] !font-semibold !tracking-[0] !text-[#ffe8a6] !shadow-[0_12px_28px_rgba(4,2,12,0.2),0_0_22px_rgba(246,223,183,0.12)] ring-1 ring-white/10 backdrop-blur-md";
const landingTitleUi =
  "!font-[var(--tea-font-display)] !font-medium !tracking-[0] !text-[#fffaf1] drop-shadow-[0_18px_42px_rgba(4,2,12,0.58)]";
const landingLeadUi =
  "max-w-[540px] !font-[var(--tea-font-premium)] !text-[#fffaf1]/90 drop-shadow-[0_10px_24px_rgba(4,2,12,0.45)]";
const landingIntroUi =
  "max-w-[560px] !font-[var(--tea-font-body)] !leading-[1.78] !text-[#fff7e8]/80 drop-shadow-[0_8px_22px_rgba(4,2,12,0.38)]";
const landingActionsUi =
  "w-full max-w-[460px]";
const landingHistoryUi =
  "mt-3 flex min-h-11 w-full max-w-[460px] items-center justify-center gap-2 !rounded-[0.85rem] !border !border-[#f6dfb7]/20 !bg-[#12091f]/35 px-4 py-2.5 !font-[var(--tea-font-premium)] !text-[0.92rem] !font-semibold !text-[#fffaf1]/90 !shadow-[0_12px_28px_rgba(4,2,12,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/5 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:!border-[#ffe8a6]/45 hover:!text-[#fffaf1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe8a6]/75";
const landingGuideUi =
  "relative z-10 mx-auto mb-10 mt-4 grid w-full max-w-[1180px] grid-cols-1 gap-3 px-4 text-[#fffaf1]/90 sm:mt-6 md:mb-16 md:mt-10 lg:grid-cols-3 lg:gap-5";
const landingGuideCardUi =
  "grid min-w-0 content-start gap-2.5 rounded-[8px] border border-[#f6dfb7]/20 p-4 sm:p-5 md:gap-3 md:p-6";
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
            "--landing-bg-desktop": `url("${fortuneTeaHouseAssets.backgrounds.landingDesktop}")`,
            "--landing-bg-mobile": `url("${fortuneTeaHouseAssets.backgrounds.landingMobile}")`,
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
            <h1 id="fortuneTeaHouseTitle" className={landingTitleUi}>운명의 찻집</h1>
            <p className={`${styles.landingLead} ${landingLeadUi}`}>
              달빛 골목 끝에서 문이 열립니다.
              <br />
              연이가 당신의 질문을 먼저 따뜻하게 맞이합니다.
            </p>
            <p className={`${styles.landingIntro} ${landingIntroUi}`}>
              말로 꺼내기 어려웠던 마음을 찻잔 위에 올려두면,
              달빛과 카드의 상징이 지금 붙잡아야 할 방향을 조용히 비춥니다.
            </p>
            <div className={`${styles.landingActions} ${landingActionsUi}`}>
              <TeaHouseButton
                className="min-h-[52px] rounded-[1rem] text-[1rem] shadow-[0_22px_54px_rgba(4,2,12,0.36),0_0_34px_rgba(246,223,183,0.18),inset_0_1px_0_rgba(255,255,255,0.42)]"
                onClick={onEnter}
                aria-label={hasSeenPrologue ? "운명의 찻집 상담 바로 시작하기" : "운명의 찻집 프롤로그 시작하기"}
              >
                <DoorOpen size={18} strokeWidth={2.2} aria-hidden />
                <span>{hasSeenPrologue ? "바로 상담 시작하기" : "찻집에 들어가기"}</span>
              </TeaHouseButton>
            </div>
            {hasSeenPrologue ? (
              <button className={`${styles.landingHistoryButton} ${landingHistoryUi}`} type="button" onClick={onReplayPrologue} aria-label="운명의 찻집 프롤로그 다시 보기">
                <Sparkles size={16} strokeWidth={2.2} aria-hidden />
                <span>프롤로그 다시 보기</span>
              </button>
            ) : null}
            <button className={`${styles.landingHistoryButton} ${landingHistoryUi}`} type="button" onClick={onShowHistory} aria-label="운명의 찻집 상담 기록 보기">
              <Clock3 size={16} strokeWidth={2.2} aria-hidden />
              <span>상담 기록 보기</span>
            </button>
          </div>

          <div className={styles.landingVisual} aria-label="문 앞에서 손님을 맞이하는 꽃돼지 연이">
            <span className={styles.landingPigAura} aria-hidden />
            <div className={styles.landingSpeechWrap} role="note">
              <span className={styles.landingSpeechOrnament} aria-hidden />
              <p>{activePig.speech}</p>
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
      <div className={landingGuideUi} aria-label="운명의 찻집에서 머무는 법">
        <article className={landingGuideCardUi} style={landingGuideCardStyle}>
          <span className={landingGuideBadgeUi}>Tea Reading</span>
          <h2 className={landingGuideTitleUi}>찻잔 위에 남은 마음부터 천천히 읽습니다</h2>
          <p className={landingGuideBodyUi}>
            운명의 찻집에 들어오면 연이는 먼저 질문의 온도를 살핍니다. 사랑을 묻는 마음인지,
            다시 만나고 싶은 인연인지, 지금의 선택 앞에서 오래 멈춘 마음인지에 따라 찻잔의 빛은
            다르게 기울어집니다. 타로를 고르면 카드의 장면이 마음속에서 반복되는 상징을 비추고,
            사주를 고르면 태어난 계절과 오행의 흐름이 지금의 선택을 어떻게 흔드는지 드러납니다.
            숙요점 궁합을 고르면 두 사람 사이에 남은 거리, 당겨지는 힘, 조심해야 할 말의 결이
            잔잔하게 떠오릅니다.
          </p>
          <p className={landingGuideBodyUi}>
            연이는 빠른 결론보다 마음이 왜 그 질문에 머무는지를 먼저 봅니다. 그래서 이곳의 상담은
            좋다거나 나쁘다는 한마디로 닫히지 않습니다. 이미 알고 있었지만 말하지 못한 마음,
            반복해서 같은 자리로 돌아가게 만든 불안, 지금은 놓아야 하는 기대와 아직 지켜도 되는
            소망을 조용히 나누어 봅니다. 대답은 부드럽게 오지만, 흐릿한 마음을 그대로 두지는 않습니다.
          </p>
        </article>
        <article className={landingGuideCardUi} style={landingGuideCardStyle}>
          <span className={landingGuideBadgeUi}>Moonlit Flow</span>
          <h2 className={landingGuideTitleUi}>질문은 작아도 괜찮고, 마음은 솔직할수록 선명합니다</h2>
          <p className={landingGuideBodyUi}>
            이름과 생년월일, 필요한 출생 정보가 들어오면 찻집의 문은 조금 더 깊게 열립니다.
            출생시간을 모르는 날에도 가능한 범위에서 흐름을 읽고, 질문이 짧게 맴도는 날에는
            연이가 먼저 감정의 가장자리를 정리합니다. 중요한 것은 멋진 문장이 아니라 지금 정말
            궁금한 한 줄입니다. 왜 답장을 기다리는지, 왜 이직 앞에서 마음이 굳는지, 왜 같은 사람에게
            다시 흔들리는지처럼 마음이 오래 붙잡은 자리일수록 찻잔은 또렷하게 반응합니다.
          </p>
          <p className={landingGuideBodyUi}>
            상담이 열린 뒤에는 카드와 명식, 인연의 흐름이 서로 다른 언어로 같은 마음을 비춥니다.
            타로는 지금 눈앞의 장면을, 사주는 오래 이어진 기질과 선택 습관을, 숙요점은 관계 안에서
            서로를 당기고 밀어내는 리듬을 살핍니다. 연이는 그 흐름을 한 사람의 밤에 맞는 말로
            풀어내며, 오늘 붙잡아도 되는 마음과 오늘은 내려놓아야 하는 마음을 차분히 가리킵니다.
          </p>
        </article>
        <article className={landingGuideCardUi} style={landingGuideCardStyle}>
          <span className={landingGuideBadgeUi}>Yeoni&apos;s Promise</span>
          <h2 className={landingGuideTitleUi}>상처를 크게 만들지 않고, 필요한 말은 흐리지 않습니다</h2>
          <p className={landingGuideBodyUi}>
            운명의 찻집은 마음을 재촉하지 않습니다. 다만 같은 걱정을 오래 품고 있었다면, 그 걱정이
            어디에서 시작됐는지 함께 바라봅니다. 연애와 재회에서는 상대의 마음만 좇지 않고 당신이
            반복해서 기대는 감정의 습관을 봅니다. 일과 돈에서는 불안이 판단을 흐리는 지점과 현실적으로
            먼저 정리할 기준을 나눕니다. 인간관계에서는 지키고 싶은 마음과 인정받고 싶은 마음이 어디서
            뒤섞였는지 조용히 분리합니다.
          </p>
          <p className={landingGuideBodyUi}>
            찻잔의 빛은 단정하지 않고, 필요한 방향을 남깁니다. 지금은 기다려도 되는 때인지,
            먼저 말을 꺼내야 하는 때인지, 더 이상 마음을 소모하지 말아야 하는 때인지가 상담의 끝에서
            자연스럽게 드러납니다. 연이는 그 답을 당신 대신 살아 주지는 않지만, 오늘 밤 어떤 마음을
            품고 잠들어야 덜 흔들리는지는 분명히 비춥니다.
          </p>
          <p className={landingGuideBodyUi}>
            다시 찾아오는 마음도 이곳에서는 서두르지 않습니다. 같은 질문을 다른 날에 꺼내면,
            찻잔은 그날의 온도와 지난 선택의 흔적을 함께 비춥니다. 그래서 오늘의 대답은 끝이 아니라,
            당신이 스스로에게 덜 거칠어지는 작은 약속으로 남습니다.
          </p>
        </article>
      </div>
    </section>
  );
}
