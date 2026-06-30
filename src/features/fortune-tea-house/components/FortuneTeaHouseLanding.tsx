"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { fortuneTeaHouseAssets, talkingPigYeoniFrameCrops } from "../data/assets";
import TeaHouseButton from "./TeaHouseButton";
import styles from "../styles/fortune-tea-house.module.css";

type FortuneTeaHouseLandingProps = {
  onEnter: () => void;
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
  "relative isolate min-h-svh overflow-hidden bg-[#080511] text-[#fffaf1] antialiased";
const landingHeroUi =
  "relative isolate overflow-hidden";
const landingCopyUi =
  "relative z-10 mx-auto max-w-[760px] text-center [text-wrap:balance]";
const landingBadgeUi =
  "inline-flex items-center justify-center !rounded-full !border !border-[#f6dfb7]/30 !bg-[#12091f]/60 px-4 py-2 !font-[var(--tea-font-premium)] !text-[0.8rem] !font-semibold !tracking-[0] !text-[#ffe8a6] !shadow-[0_14px_34px_rgba(4,2,12,0.24),0_0_24px_rgba(246,223,183,0.14),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-white/10 backdrop-blur-xl";
const landingTitleUi =
  "!font-[var(--tea-font-display)] !font-medium !tracking-[0] !text-[#fffaf1] drop-shadow-[0_18px_42px_rgba(4,2,12,0.58)]";
const landingLeadUi =
  "mx-auto max-w-[620px] !font-[var(--tea-font-premium)] !text-[#fffaf1]/90 drop-shadow-[0_10px_24px_rgba(4,2,12,0.45)]";
const landingIntroUi =
  "mx-auto max-w-[680px] !font-[var(--tea-font-body)] !leading-[1.82] !text-[#fff7e8]/80 drop-shadow-[0_8px_22px_rgba(4,2,12,0.38)]";
const landingActionsUi =
  "mx-auto w-full max-w-[560px]";
const landingHistoryUi =
  "mx-auto mt-3 flex min-h-12 w-full max-w-[560px] items-center justify-center !rounded-[0.95rem] !border !border-[#f6dfb7]/20 !bg-[#12091f]/50 px-4 py-2.5 !font-[var(--tea-font-premium)] !text-[0.95rem] !font-semibold !text-[#fffaf1]/90 !shadow-[0_16px_36px_rgba(4,2,12,0.26),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/5 backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:!border-[#ffe8a6]/50 hover:!text-[#fffaf1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe8a6]/75";

export default function FortuneTeaHouseLanding({ onEnter, onShowHistory }: FortuneTeaHouseLandingProps) {
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
    const timer = window.setInterval(() => {
      setActivePigFrame((current) => (current + 1) % talkingPigFrames.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, []);

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
              달빛 골목 끝, 작은 찻집.
              <br />
              꽃돼지 연이가 문 앞에서 기다립니다.
            </p>
            <p className={`${styles.landingIntro} ${landingIntroUi}`}>
              오늘 마음에 오래 남은 질문을 한 잔의 온기로 내려놓아 보세요.
              찻잔의 가장자리에 머무는 빛이 관계와 선택의 결을 차분히 비춥니다.
            </p>
            <div className={`${styles.landingActions} ${landingActionsUi}`}>
              <TeaHouseButton className="min-h-[52px] rounded-[1rem] text-[1rem] shadow-[0_22px_54px_rgba(4,2,12,0.36),0_0_34px_rgba(246,223,183,0.18),inset_0_1px_0_rgba(255,255,255,0.42)]" onClick={onEnter} aria-label="운명의 찻집 상담 시작하기">찻집에 들어가기</TeaHouseButton>
            </div>
            <button className={`${styles.landingHistoryButton} ${landingHistoryUi}`} type="button" onClick={onShowHistory}>
              상담 기록 보기
            </button>
          </div>

          <div className={styles.landingVisual} aria-label="귀엽게 말하는 꽃돼지 연이">
            <span className={styles.landingPigAura} aria-hidden />
            <div className={styles.landingSpeechWrap} role="note">
              <span className={styles.landingSpeechOrnament} aria-hidden />
              <p>{activePig.speech}</p>
            </div>
            <span
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
                priority
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
    </section>
  );
}
