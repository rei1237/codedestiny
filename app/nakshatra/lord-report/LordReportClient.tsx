"use client";

import Link from "next/link";
import styles from "../_premium/premium.module.css";
import { usePremiumReport } from "../_premium/use-premium-report";
import { CrossSell, NatalBar, NeedBirth, SectionCards, UnlockGate, type ReportSection } from "../_premium/PremiumParts";

const PRODUCT = {
  featureKey: "nakshatra-lord-report",
  coinPrice: 100,
  amountKRW: 10000,
  reason: "나크샤트라 지배성 심화 리포트 해금",
  endpoint: "/api/nakshatra-premium/lord-report",
} as const;

const GATE_BULLETS = [
  "당신의 별을 다스리는 지배성(그라하)의 초상 — 원형·재능·그림자",
  "파다와 나바암샤 — 겉으로 보이는 나와 혼자일 때의 나",
  "가나·나디·요니 세 축으로 읽는 기질과 관계 본능",
  "같은 주인을 둔 세 별 가운데 무엇이 나만의 몫인가",
  "지배성이 제 몫을 하는 나이, 그리고 지금 지나는 대주기",
  "요일·색·만트라·실천 3가지로 짜인 생활 처방",
];

interface LordReport {
  meta: {
    nakshatraKo: string;
    nakshatraEn: string;
    lordKo: string;
    lordSanskrit: string;
    archetype: string;
    pada: number | null;
    navamsaSignKo: string | null;
    navamsaLordKo: string | null;
    timeUnknown: boolean;
  };
  headline: string;
  sections: ReportSection[];
  charCount: number;
}

export default function LordReportClient() {
  const { report, birth, natal, confirmedLocked, unlocked, checking, loading, paying, error, unlock } =
    usePremiumReport<LordReport>(PRODUCT);

  const meta = report ? `${report.sections.length}편 · ${report.charCount.toLocaleString()}자` : undefined;
  const natalLabel = natal || (report ? { sukuyoKo: "", sukuyoHan: "", nakshatraKo: report.meta.nakshatraKo, nakshatraEn: report.meta.nakshatraEn } : null);

  return (
    <main className={`${styles.vars} ${styles.shell}`}>
      <div className={styles.inner}>
        <Link href="/nakshatra" className={styles.back}>
          ← 나크샤트라 결정판
        </Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>Nakshatra Codex · Ruling Planet</p>
          <h1 className={styles.title}>지배성 심화 리포트</h1>
          <p className={styles.lede}>
            나크샤트라마다 그 자리를 다스리는 별이 따로 있습니다. 지배성과 파다·나바암샤가 만드는
            성격·재능·그림자를 한 편으로 엮어 드립니다.
          </p>
        </header>

        <NatalBar natal={natalLabel} meta={meta} />

        {!birth && <NeedBirth />}

        {birth && !unlocked && (
          <>
            {checking && !confirmedLocked && <p className={styles.status}>이용권을 확인하는 중이에요…</p>}
            {confirmedLocked && (
              <UnlockGate
                priceLabel="10,000원 · 1회 해금"
                bullets={GATE_BULLETS}
                onUnlock={() => void unlock()}
                disabled={paying || loading}
                buttonLabel={paying ? "결제 진행 중…" : "리포트 열기"}
              />
            )}
          </>
        )}

        {birth && unlocked && !report && (
          <p className={styles.status}>{loading ? "지배성을 읽는 중이에요…" : "리포트를 준비하고 있어요…"}</p>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        {report && (
          <>
            <p className={styles.headline}>{report.headline}</p>
            <SectionCards sections={report.sections} />
            <CrossSell
              href="/nakshatra/dasha-map"
              title="언제 그것이 시험대에 오르는가"
              text="이 리포트가 '누구인가'를 다뤘다면, 다샤 인생지도는 '언제인가'를 다룹니다. 비쇼타리 120년 주기와 동양 대운을 나란히 놓고 봅니다."
              cta="다샤 인생지도 보기"
            />
            <p className={styles.disclaimer}>
              이 리포트는 시데리얼(라히리) 기준 달의 위치와 27 나크샤트라 전통 속성으로 산출한
              해석 자료입니다. 의료·법률·투자 판단의 근거로 쓰지 마세요.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
