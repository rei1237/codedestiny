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
    speech: "꿀… 오늘은 그냥 지나칠 수 없는 마음이네.",
  },
  {
    ...talkingPigYeoniFrameCrops.thinking,
    speech: "찻잔을 고르면, 연이가 마음의 흐름을 펼쳐줄 거야.",
  },
  {
    ...talkingPigYeoniFrameCrops.surprised,
    speech: "문 안쪽 이야기는 조금 더 가까이 와야 들려줄게.",
  },
] as const;

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
    <section className={styles.landingScene} aria-labelledby="fortuneTeaHouseTitle">
      <div
        className={styles.landingHero}
        style={
          {
            "--landing-bg-desktop": `url("${fortuneTeaHouseAssets.backgrounds.landingDesktop}")`,
            "--landing-bg-mobile": `url("${fortuneTeaHouseAssets.backgrounds.landingMobile}")`,
            "--landing-overlay": `url("${fortuneTeaHouseAssets.ui.overlay}")`,
            "--landing-overlay-2": `url("${fortuneTeaHouseAssets.ui.overlay2}")`,
          } as CSSProperties
        }
      >
        <div className={styles.landingHeroContent}>
          <div className={styles.landingCopy}>
            <p className={styles.landingBadge}>Moonlight Fortune Tea House</p>
            <h1 id="fortuneTeaHouseTitle">운명의 찻집</h1>
            <p className={styles.landingLead}>
              달빛과 찻잔, 그리고 아직 말하지 못한 마음.
              <br />
              연이가 당신의 이야기를 조용히 읽어드립니다.
            </p>
            <p className={styles.landingIntro}>
              정답을 서두르지 않는 작은 찻집에서
              <br />
              오늘 마음에 오래 남은 질문을 한 잔의 온기로 내려놓아 보세요.
              <br />
              찻잔의 가장자리에 머무는 빛은 지금 마음이 붙잡은 관계와 선택의 결을 비춥니다.
              <br />
              연이는 질문 속에 남은 떨림과 기다림, 다시 열릴 가능성을 차분히 짚어 주고
              작은 온기가 당신에게 필요한 다음 한 걸음을 조용히 가리킵니다.
              <br />
              밤새 남은 예감은 찻물 위에서 한결 또렷한 문장으로 떠오르고,
              당신의 속도가 무너지지 않도록 부드럽게 머무릅니다.
            </p>
            <div className={styles.landingActions}>
              <TeaHouseButton onClick={onEnter} aria-label="운명의 찻집 상담 시작하기">찻집에 들어가기</TeaHouseButton>
            </div>
            <button className={styles.landingHistoryButton} type="button" onClick={onShowHistory}>
              상담 기록 보기
            </button>
          </div>

          <div className={styles.landingVisual} aria-label="귀엽게 말하는 꽃돼지 연이">
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
