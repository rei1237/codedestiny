"use client";

import dynamic from "next/dynamic";
import CodexArtwork from "@/src/features/master-love-codex/components/CodexArtwork";
import { masterLoveCodexAssets } from "@/src/features/master-love-codex/data/assets";
import styles from "@/src/features/master-love-codex/styles/codex.module.css";

const MasterLoveCodexPage = dynamic(() => import("@/src/features/master-love-codex/MasterLoveCodexPage"), {
  ssr: false,
  loading: () => <MasterLoveCodexShell />,
});

export default function MasterLoveCodexRouteClient() {
  return <MasterLoveCodexPage />;
}

function MasterLoveCodexShell() {
  return (
    <div className={styles.root} aria-busy="true">
      <div className={styles.loadingNav} aria-hidden="true" />
      <div className={styles.landingHero}>
        <div className={styles.landingHeroCopy}>
          {/* 서버 HTML 의 H1 은 page.tsx 의 ServiceIntroSection 이 소유한다. */}
          <h2 className={styles.landingHeroTitle}>마스터 인연의 서</h2>
          <p className={styles.landingHeroEnglish}>MASTER LOVE CODEX</p>
          <p className={styles.landingLead}>사주 명식과 자미두수 명반을 함께 읽어, 사랑에서 반복되는 패턴과 관계의 흐름을 20장으로 정리합니다.</p>
          <p className={styles.landingEdition}>20장 · 5막</p>
          <span className={`${styles.cta} ${styles.heroChoose} ${styles.loadingAction}`} aria-live="polite">리딩 준비 중</span>
        </div>
        <figure className={styles.landingPortrait}>
          <CodexArtwork
            src={masterLoveCodexAssets.humanHero}
            alt="달빛 아래 인연의 지도를 펼쳐 보는 서한비"
            width={1200}
            height={675}
            sizes="(max-width: 767px) 100vw, 600px"
            className={styles.heroArtwork}
            priority
          />
          <figcaption className={styles.landingPortraitCaption}>
            <strong>인연의 서를 읽어주는 서한비</strong>
            <span>달빛 아래, 당신의 인연 지도를 함께 펼쳐봐요.</span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
