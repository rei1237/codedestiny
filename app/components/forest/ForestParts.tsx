"use client";

import type { DailyJourney, JourneyHoney } from "./useDailyJourney";
import { forestZoneForLevel, litLanternCount } from "./forest-progress.mjs";
import styles from "./forest.module.css";

const MAX_LANTERNS = 14;
export const CARD_MANAGE_HREF = "/ggulggul/?action=dpOpenList";

function LanternIcon() {
  return <svg viewBox="0 0 24 32" width="24" height="32" aria-hidden="true"><path d="M8 5h8M12 1v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M7 7h10l3 7-3 12H7L4 14z" fill="var(--forest-lantern-fill)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M8 29h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

/** 연속 출석 등불. 마지막 칸은 보너스 꿀단지 자리다. 숫자는 전부 서버 값이다. */
export function LanternRow({ honey }: { honey: JourneyHoney }) {
  const total = Math.min(honey.streakEvery, MAX_LANTERNS);
  const lit = litLanternCount(honey.streak, honey.streakEvery, honey.attended);
  return <div className={styles.lanterns} role="img" aria-label={`연속 출석 ${honey.streak}일, 다음 보너스까지 ${honey.nextBonusIn}일`}>
    {Array.from({ length: total }, (_, index) => {
      const isJar = index === total - 1;
      return <span key={index} className={styles.lantern} data-lit={index < lit || undefined} data-just-lit={(honey.awarded && index === lit - 1) || undefined} data-jar={isJar || undefined}>
        {isJar
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src="/images/fortune-tea-house/honey-drop-jewel-96-v1.webp" width="96" height="96" alt="" loading="lazy" decoding="async" />
          : <LanternIcon />}
      </span>;
    })}
  </div>;
}

/** 프로필 카드 이름, 숲 구역, 레벨, 경험치 막대. 재조회한 값만 보여 준다. */
export function GrowthCard({ journey }: { journey: DailyJourney }) {
  const { status, profile, progress } = journey;
  const name = status === "loading" ? "카드 확인 중" : status === "guest" ? "나의 카드 만나기" : profile ? `${profile.name || "나의"} 카드` : "프로필 카드 확인하기";
  const fallback = status === "guest" ? "로그인하면 계정의 성장 기록을 볼 수 있어요." : status === "error" ? "성장 기록을 확인해 주세요." : status === "ready" ? "성장 기록을 불러오지 못했어요." : "성장 기록 확인 중";
  const ratio = progress ? Math.min(100, Math.round((progress.currentLevelExp / Math.max(1, progress.nextLevelExp)) * 100)) : 0;
  return <div className={styles.growth}>
    <div className={styles.growthHead}>
      <strong>{name}</strong>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href={CARD_MANAGE_HREF}>{status === "ready" && !profile ? "프로필 카드 만들기" : "카드 관리"}</a>
    </div>
    {progress
      ? <div className={styles.growthBody}>
          <span className={styles.zone}>{forestZoneForLevel(progress.currentLevel)} · Lv. {progress.currentLevel}</span>
          <div className={styles.xpTrack} role="progressbar" aria-label="다음 레벨까지의 경험치" aria-valuemin={0} aria-valuemax={Math.max(1, progress.nextLevelExp)} aria-valuenow={progress.currentLevelExp}><span className={styles.xpFill} style={{ width: `${ratio}%` }} /></div>
          <small>{progress.currentLevelExp} / {progress.nextLevelExp} XP</small>
        </div>
      : <small className={styles.muted}>{fallback}</small>}
  </div>;
}

/** 연이와 영냥이의 한마디. */
export function ForestLines({ line }: { line: { yeoni: string; yeongnyangi: string } }) {
  return <div className={styles.lines}>
    <p><b>연이</b>{line.yeoni}</p>
    <p><b>영냥이</b>{line.yeongnyangi}</p>
  </div>;
}
