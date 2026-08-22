"use client";

import Link from "next/link";
import styles from "../_premium/premium.module.css";
import { usePremiumReport } from "../_premium/use-premium-report";
import { CrossSell, NatalBar, NeedBirth, SectionCards, UnlockGate, type ReportSection } from "../_premium/PremiumParts";
import { useNakshatraCopy } from "../_lib/copy";

const FEATURE_KEY = "nakshatra-lord-report";

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
  const copy = useNakshatraCopy();
  const product = {
    featureKey: FEATURE_KEY,
    coinPrice: 100,
    amountKRW: 10000,
    reason: copy.lordReason,
    endpoint: "/api/nakshatra-premium/lord-report",
  } as const;
  const { report, birth, natal, confirmedLocked, unlocked, checking, loading, paying, error, unlock } =
    usePremiumReport<LordReport>(product);

  const meta = report ? copy.lordMetaSummary(report.sections.length, report.charCount) : undefined;
  const natalLabel = natal || (report ? { sukuyoKo: "", sukuyoHan: "", nakshatraKo: report.meta.nakshatraKo, nakshatraEn: report.meta.nakshatraEn } : null);

  return (
    <main className={`${styles.vars} ${styles.shell}`}>
      <div className={styles.inner}>
        <Link href="/nakshatra" className={styles.back}>
          {copy.backToHubLink}
        </Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>{copy.lordEyebrow}</p>
          <h1 className={styles.title}>{copy.lordTitle}</h1>
          <p className={styles.lede}>{copy.lordLede}</p>
        </header>

        <NatalBar natal={natalLabel} meta={meta} />

        {!birth && <NeedBirth />}

        {birth && !unlocked && (
          <>
            {checking && !confirmedLocked && <p className={styles.status}>{copy.checkingPassNote}</p>}
            {confirmedLocked && (
              <UnlockGate
                priceLabel={copy.lordPriceLabel}
                bullets={copy.lordGateBullets}
                onUnlock={() => void unlock()}
                disabled={paying || loading}
                buttonLabel={paying ? copy.payingButton : copy.lordUnlockButton}
              />
            )}
          </>
        )}

        {birth && unlocked && !report && (
          <p className={styles.status}>{loading ? copy.lordLoadingText : copy.lordPreparingText}</p>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        {report && (
          <>
            <p className={styles.headline}>{report.headline}</p>
            <SectionCards sections={report.sections} />
            <CrossSell
              href="/nakshatra/dasha-map"
              title={copy.lordCrossSellTitle}
              text={copy.lordCrossSellText}
              cta={copy.lordCrossSellCta}
            />
            <p className={styles.disclaimer}>{copy.lordDisclaimer}</p>
          </>
        )}
      </div>
    </main>
  );
}
