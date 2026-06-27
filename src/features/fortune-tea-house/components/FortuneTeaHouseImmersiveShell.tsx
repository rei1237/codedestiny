"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import FloatingPetals from "./FloatingPetals";
import { fortuneTeaHouseAssets } from "../data/assets";
import type { TeaHouseStage } from "../data/story";
import AssetImage from "./AssetImage";
import styles from "../styles/fortune-tea-house.module.css";

type FortuneTeaHouseImmersiveShellProps = {
  stage: TeaHouseStage;
  notice?: string;
  children: ReactNode;
};

export default function FortuneTeaHouseImmersiveShell({ stage, notice = "", children }: FortuneTeaHouseImmersiveShellProps) {
  const backgroundAssets = getStageBackgroundAssets(stage);
  const backgroundStyle = {
    "--tea-bg-desktop": `url("${backgroundAssets.desktop}")`,
    "--tea-bg-mobile": `url("${backgroundAssets.mobile}")`,
    "--tea-overlay": `url("${fortuneTeaHouseAssets.ui.overlay}")`,
    "--tea-overlay-2": `url("${fortuneTeaHouseAssets.ui.overlay2}")`,
    "--tea-bg-position-desktop": backgroundAssets.desktopPosition,
    "--tea-bg-position-mobile": backgroundAssets.mobilePosition,
  } as CSSProperties;

  return (
    <main className={styles.page} data-stage={stage} style={backgroundStyle}>
      <FloatingPetals />
      <div className={styles.backdropVeil} aria-hidden />
      <AssetImage
        className={styles.shellSceneImage}
        src={fortuneTeaHouseAssets.backgrounds.loadingScene}
        alt=""
        imageClassName={styles.shellSceneImageAsset}
      />
      <Link className={styles.backButton} href="/">
        돌아가기
      </Link>
      <div className={styles.pageInner}>{children}</div>
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

  if (stage === "scentLoading") {
    return {
      desktop: fortuneTeaHouseAssets.backgrounds.loadingDesktop,
      mobile: fortuneTeaHouseAssets.backgrounds.loadingMobile,
      desktopPosition: "center center",
      mobilePosition: "center center",
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

  return {
    desktop: fortuneTeaHouseAssets.backgrounds.interiorDesktop1,
    mobile: fortuneTeaHouseAssets.backgrounds.interiorMobile1,
    desktopPosition: "center center",
    mobilePosition: "center top",
  };
}
