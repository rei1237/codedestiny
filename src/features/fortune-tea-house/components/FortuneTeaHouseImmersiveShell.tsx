"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import FloatingPetals from "./FloatingPetals";
import { fortuneTeaHouseAssets } from "../data/assets";
import { isTeaHouseEntryStage } from "../data/entryStory";
import type { TeaHouseStage } from "../data/story";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import { ExpertStickyCta, ExpertValueCards } from "@/app/components/expert-consulting/ExpertConsultationFrame";

type FortuneTeaHouseImmersiveShellProps = {
  stage: TeaHouseStage;
  notice?: string;
  onBackToLanding: () => void;
  children: ReactNode;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다. */
const KO = {
  back: "돌아가기",
  homeAria: "Code Destiny 홈화면으로 바로가기",
  home: "홈으로",
};

export default function FortuneTeaHouseImmersiveShell({ stage, notice = "", onBackToLanding, children }: FortuneTeaHouseImmersiveShellProps) {
  const copy = useTeaHouseCopy("shell", KO);
  const backgroundAssets = getStageBackgroundAssets(stage);
  const backgroundStyle = {
    "--tea-bg-desktop": `url("${backgroundAssets.desktop}")`,
    "--tea-bg-mobile": `url("${backgroundAssets.mobile}")`,
    "--tea-overlay": `url("${fortuneTeaHouseAssets.ui.overlay}")`,
    "--tea-overlay-2": `url("${fortuneTeaHouseAssets.ui.overlay2}")`,
    "--tea-bg-position-desktop": backgroundAssets.desktopPosition,
    "--tea-bg-position-mobile": backgroundAssets.mobilePosition,
  } as CSSProperties;
  const shouldShowBackButton = stage !== "landing";

  return (
    <main className={styles.page} data-stage={stage} style={backgroundStyle}>
      <FloatingPetals />
      <div className={styles.backdropVeil} aria-hidden />
      {shouldShowBackButton ? (
        <button className={styles.backButton} type="button" onClick={onBackToLanding}>
          {copy.back}
        </button>
      ) : null}
      <Link className={styles.homeButton} href="/" aria-label={copy.homeAria}>
        {copy.home}
      </Link>
      <div className={styles.pageInner}>
        {stage === "questionInput" ? (
          <ExpertValueCards theme="yeoni" points={[{ title: "마음의 온도", description: "연이가 질문의 결을 먼저 살피고 지금 감정의 온도를 읽습니다." }, { title: "상징의 흐름", description: "찻잎과 카드가 보여주는 관계·선택의 신호를 부드럽게 엮습니다." }, { title: "다음 한 걸음", description: "겁을 주는 예언 대신 지금 덜 흔들릴 수 있는 선택을 남깁니다." }]} />
        ) : null}
        {children}
        {stage === "questionInput" ? <ExpertStickyCta theme="yeoni" targetId="tea-question-form" label="연이에게 상담 건네기" price="상담 이용 가격 확인" /> : null}
      </div>
      <div className={styles.shellMist} aria-hidden />
      {notice ? (
        <div className={styles.readyNotice} role="status">
          {notice}
        </div>
      ) : null}
    </main>
  );
}

function getStageBackgroundAssets(stage: TeaHouseStage) {
  if (stage === "landing") {
    return {
      desktop: fortuneTeaHouseAssets.backgrounds.landingDesktop,
      mobile: fortuneTeaHouseAssets.backgrounds.landingMobile,
      desktopPosition: "center center",
      mobilePosition: "center top",
    };
  }

  if (stage === "teaCupRitual") {
    return {
      desktop: fortuneTeaHouseAssets.backgrounds.interiorDesktop2,
      mobile: fortuneTeaHouseAssets.backgrounds.interiorMobile2,
      desktopPosition: "center center",
      mobilePosition: "center top",
    };
  }

  if (stage === "scentLoading") {
    return {
      desktop: fortuneTeaHouseAssets.backgrounds.interiorDesktop2,
      mobile: fortuneTeaHouseAssets.backgrounds.interiorMobile2,
      desktopPosition: "center center",
      mobilePosition: "center top",
    };
  }

  if (stage === "tarotReveal" || stage === "result") {
    return {
      desktop: fortuneTeaHouseAssets.backgrounds.interiorDesktop2,
      mobile: fortuneTeaHouseAssets.backgrounds.interiorMobile2,
      desktopPosition: "center center",
      mobilePosition: "center top",
    };
  }

  if (isTeaHouseEntryStage(stage)) {
    const useSecondInterior = stage === "transformPreview" || stage === "yeoniReveal" || stage === "teaIntro";
    return {
      desktop: useSecondInterior ? fortuneTeaHouseAssets.backgrounds.interiorDesktop2 : fortuneTeaHouseAssets.backgrounds.interiorDesktop1,
      mobile: useSecondInterior ? fortuneTeaHouseAssets.backgrounds.interiorMobile2 : fortuneTeaHouseAssets.backgrounds.interiorMobile1,
      desktopPosition: "center center",
      mobilePosition: "center center",
    };
  }

  return {
    desktop: fortuneTeaHouseAssets.backgrounds.interiorDesktop1,
    mobile: fortuneTeaHouseAssets.backgrounds.interiorMobile1,
    desktopPosition: "center center",
    mobilePosition: "center top",
  };
}
