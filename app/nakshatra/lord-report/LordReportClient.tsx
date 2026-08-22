"use client";

import Link from "next/link";
import styles from "../_premium/premium.module.css";
import { usePremiumReport } from "../_premium/use-premium-report";
import { CrossSell, NatalBar, NeedBirth, SectionCards, UnlockGate, type ReportSection } from "../_premium/PremiumParts";
import { useNakshatraCopy } from "../_lib/copy";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";

const PRODUCT = {
  featureKey: "nakshatra-lord-report",
  coinPrice: 100,
  amountKRW: 10000,
  reason: "나크샤트라 지배성 심화 리포트 해금",
  endpoint: "/api/nakshatra-premium/lord-report",
} as const;

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
  const { lordReport: copy } = useNakshatraCopy();
  const locale = getCurrentLoadingLocale();
  const { report, birth, natal, confirmedLocked, unlocked, checking, loading, paying, error, unlock } =
    usePremiumReport<LordReport>(PRODUCT);

  const meta = report
    ? copy.metaTemplate.replace("{count}", String(report.sections.length)).replace("{chars}", report.charCount.toLocaleString())
    : undefined;
  const natalLabel = natal || (report ? { sukuyoKo: "", sukuyoHan: "", nakshatraKo: report.meta.nakshatraKo, nakshatraEn: report.meta.nakshatraEn } : null);

  return (
    <main className={`${styles.vars} ${styles.shell}`}>
      <div className={styles.inner}>
        <Link href="/nakshatra" className={styles.back}>
          {copy.backLink}
        </Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>Nakshatra Codex · Ruling Planet</p>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={styles.lede}>
            {copy.lede}
          </p>
        </header>

        <NatalBar natal={natalLabel} meta={meta} />

        {!birth && <NeedBirth />}

        {birth && !unlocked && (
          <>
            {checking && !confirmedLocked && <p className={styles.status}>{copy.checkingStatus}</p>}
            {confirmedLocked && (
              <UnlockGate
                priceLabel={locale === "ko" ? copy.priceLabelKo : copy.priceLabelOther}
                bullets={copy.gateBullets}
                onUnlock={() => void unlock()}
                disabled={paying || loading}
                buttonLabel={paying ? copy.buyButtonLoading : copy.buyButtonIdle}
              />
            )}
          </>
        )}

        {birth && unlocked && !report && (
          <p className={styles.status}>{loading ? copy.loadingStatusReading : copy.loadingStatusPreparing}</p>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        {report && (
          <>
            <p className={styles.headline}>{report.headline}</p>
            <SectionCards sections={report.sections} />
            <CrossSell
              href="/nakshatra/dasha-map"
              title={copy.crossSellTitle}
              text={copy.crossSellText}
              cta={copy.crossSellCta}
            />
            <p className={styles.disclaimer}>
              {copy.disclaimer}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
