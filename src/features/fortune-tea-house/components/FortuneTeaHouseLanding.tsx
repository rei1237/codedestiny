"use client";

import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import AssetImage from "./AssetImage";
import TeaHouseButton from "./TeaHouseButton";
import styles from "../styles/fortune-tea-house.module.css";

type FortuneTeaHouseLandingProps = {
  onEnter: () => void;
};

const teaCupPreviewItems = [
  {
    name: "달빛 연꽃차",
    topic: "재회 · 오래 남은 감정",
    description: "끝나지 않은 마음의 결을 조용히 비추는 잔입니다.",
    accent: "pink",
    cupX: "0%",
  },
  {
    name: "꿀복숭아차",
    topic: "썸 · 새로운 인연",
    description: "막 피어나는 설렘과 다가오는 가능성을 살핍니다.",
    accent: "rose",
    cupX: "20%",
  },
  {
    name: "별가루 홍차",
    topic: "진로 · 사업 방향",
    description: "흐려진 길 위에서 지금 바라볼 별을 찾아냅니다.",
    accent: "purple",
    cupX: "40%",
  },
  {
    name: "황금 계피차",
    topic: "금전 · 현실 기회",
    description: "돈의 흐름과 손에 잡히는 기회를 따뜻하게 짚습니다.",
    accent: "gold",
    cupX: "60%",
  },
  {
    name: "백련 치유차",
    topic: "마음 회복 · 자존감",
    description: "지친 마음이 다시 숨을 고를 수 있게 다독입니다.",
    accent: "cream",
    cupX: "80%",
  },
  {
    name: "흑월 현미차",
    topic: "이별 · 위기 · 정리",
    description: "붙잡을 것과 내려놓을 것을 고요히 구분합니다.",
    accent: "blue",
    cupX: "100%",
  },
] as const;

const consultFlowItems = [
  {
    title: "고민을 적습니다",
    description: "지금 마음에 걸린 질문을 조용히 내려놓습니다.",
  },
  {
    title: "찻잔을 고릅니다",
    description: "마음이 먼저 반응하는 차가 오늘의 상담 방향이 됩니다.",
  },
  {
    title: "연이가 읽어드립니다",
    description: "찻잔, 카드, 감정의 결을 엮어 다정한 답을 전합니다.",
  },
] as const;

const storyCards = [
  "달빛이 닿은 골목 끝, 작은 찻집의 문이 조용히 열립니다.",
  "연이는 당신이 고른 찻잔과 아직 말이 되지 못한 질문을 함께 읽습니다.",
  "무섭게 단정하는 예언이 아니라, 당신의 밤을 조금 덜 아프게 비추는 상담입니다.",
] as const;

export default function FortuneTeaHouseLanding({ onEnter }: FortuneTeaHouseLandingProps) {
  const landingStyle = {
    "--landing-tea-cups": `url("${fortuneTeaHouseAssets.teaCups.transparentStateSheet}")`,
  } as CSSProperties;

  function scrollToTeaPreview() {
    document.getElementById("fortuneTeaCupPreview")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className={styles.landingScene} style={landingStyle} aria-labelledby="fortuneTeaHouseTitle">
      <div className={styles.landingHero}>
        <AssetImage
          className={styles.landingHeroBackdrop}
          src={fortuneTeaHouseAssets.backgrounds.landingDesktop}
          alt=""
          priority
        />
        <span className={styles.landingHeroGlow} aria-hidden />
        <div className={styles.landingHeroContent}>
          <div className={styles.landingCopy}>
            <p className={styles.sceneEyebrow}>달빛이 닿은 골목 끝</p>
            <h1 id="fortuneTeaHouseTitle">운명의 찻집</h1>
            <p className={styles.landingLead}>연이가 달빛 찻잔에 당신의 고민을 비춰드립니다.</p>
            <p className={styles.landingIntro}>정답을 강요하는 예언이 아니라, 당신의 밤을 조금 덜 아프게 비추는 작은 상담실.</p>
            <div className={styles.landingActions}>
              <TeaHouseButton onClick={onEnter} aria-label="운명의 찻집 상담 시작하기">
                찻집으로 들어가기
              </TeaHouseButton>
              <TeaHouseButton variant="secondary" onClick={scrollToTeaPreview} aria-label="오늘의 찻잔 미리보기로 이동">
                오늘의 찻잔 둘러보기
              </TeaHouseButton>
            </div>
          </div>

          <div className={styles.landingVisual} aria-label="달빛 아래 떠 있는 꽃돼지 안내자">
            <img
              className={styles.landingPigMascot}
              src={fortuneTeaHouseAssets.pig.transparent.base1}
              alt="달빛 찻집의 안내자 연이"
              decoding="async"
              loading="eager"
            />
            <span className={styles.landingPigAura} aria-hidden />
          </div>
        </div>
      </div>

      <section id="fortuneTeaCupPreview" className={styles.landingTeaPreview} aria-labelledby="teaPreviewTitle">
        <div className={styles.landingSectionHeader}>
          <p className={styles.sceneEyebrow}>오늘 마음이 향하는 잔</p>
          <h2 id="teaPreviewTitle">어떤 고민을 가져와도, 연이가 그에 맞는 차를 내어드립니다.</h2>
        </div>
        <div className={styles.landingTeaGrid}>
          {teaCupPreviewItems.map((tea, index) => (
            <article
              className={styles.landingTeaCard}
              data-accent={tea.accent}
              key={tea.name}
              style={{ "--landing-cup-x": tea.cupX } as CSSProperties}
            >
              <span className={styles.landingTeaCupVisual} aria-hidden />
              <span className={styles.landingTeaNumber}>{String(index + 1).padStart(2, "0")}</span>
              <h3>{tea.name}</h3>
              <strong>{tea.topic}</strong>
              <p>{tea.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.landingFlowPreview} aria-labelledby="teaFlowTitle">
        <div className={styles.landingSectionHeader}>
          <p className={styles.sceneEyebrow}>상담은 이렇게 열립니다</p>
          <h2 id="teaFlowTitle">결과를 뽑는 운세가 아니라, 찻집에 들어가 상담을 받는 경험입니다.</h2>
        </div>
        <div className={styles.landingFlowGrid}>
          {consultFlowItems.map((item, index) => (
            <article className={styles.landingFlowCard} key={item.title}>
              <span>{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.landingStory} aria-label="찻집 이야기">
        {storyCards.map((story) => (
          <p key={story}>{story}</p>
        ))}
      </section>

      <section className={styles.landingFinalCta} aria-label="운명의 찻집 입장">
        <p className={styles.sceneEyebrow}>달빛 상담실 입장</p>
        <h2>오늘 밤, 마음이 먼저 알아볼 찻잔을 만나보세요.</h2>
        <TeaHouseButton onClick={onEnter} aria-label="운명의 찻집 스토리 시작하기">
          찻집으로 들어가기
        </TeaHouseButton>
      </section>
    </section>
  );
}
