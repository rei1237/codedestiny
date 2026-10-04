"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import FloatingPetals from "./FloatingPetals";
import { fortuneTeaHouseAssets } from "../data/assets";
import { isTeaHouseEntryStage } from "../data/entryStory";
import type { TeaHouseStage } from "../data/story";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import room from "../styles/tea-room.module.css";

type FortuneTeaHouseImmersiveShellProps = {
  stage: TeaHouseStage;
  notice?: string;
  onBackToLanding: () => void;
  children: ReactNode;
  soundControl?: ReactNode;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다. */
const KO = {
  back: "돌아가기",
  homeAria: "Code Destiny 홈화면으로 바로가기",
  home: "홈으로",
};
const BRAND = { title: "연이의 운명 찻집" };

export default function FortuneTeaHouseImmersiveShell({ stage, notice = "", onBackToLanding, children, soundControl }: FortuneTeaHouseImmersiveShellProps) {
  const copy = useTeaHouseCopy("shell", KO);
  const brand = useTeaHouseCopy("homeV2", BRAND);
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

  if (stage === "landing") return <main style={backgroundStyle}>{children}</main>;
  if (["questionInput", "scentLoading", "tarotReveal", "result"].includes(stage)) return (
    <main className={room.room} data-stage={stage} style={backgroundStyle}>
      <div className={room.atmosphere} aria-hidden><FloatingPetals /></div>
      <header className={room.header}><button type="button" onClick={onBackToLanding}>{copy.back}</button><Link href="/fortune-tea-house/">{brand.title}</Link><Link href="/ggulggul/" aria-label={copy.homeAria}>{copy.home}</Link></header>
      <div className={room.soundBar}>{soundControl}</div>
      {notice && <p className={room.notice} role="status">{notice}</p>}
      {children}
    </main>
  );

  return (
    <main className={styles.page} data-stage={stage} style={backgroundStyle}>
      <FloatingPetals />
      {soundControl}
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
        {children}
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
