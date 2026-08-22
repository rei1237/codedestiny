"use client";

import Link from "next/link";
import styles from "../_premium/premium.module.css";
import timeline from "./dasha-timeline.module.css";
import { usePremiumReport } from "../_premium/use-premium-report";
import { CrossSell, GenderPrompt, NatalBar, NeedBirth, SectionCards, UnlockGate, type ReportSection } from "../_premium/PremiumParts";
import { useNakshatraCopy } from "../_lib/copy";

const FEATURE_KEY = "nakshatra-dasha-map";

interface Antardasha {
  lord: string;
  lordKo: string;
  startDate: string;
  endDate: string;
  tone: string;
  isCurrent: boolean;
}
interface EasternCycle {
  pillar: string;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  tenGod: string;
  isCurrent: boolean;
}
interface Period {
  index: number;
  lordKo: string;
  title: string;
  focus: string;
  opens: string;
  demands: string;
  caution: string;
  startDate: string;
  endDate: string;
  startYear: number;
  endYear: number;
  startAge: number | null;
  endAge: number | null;
  isCurrent: boolean;
  isPast: boolean;
  antardashas: Antardasha[];
  easternCycles: EasternCycle[];
}
interface DashaMap {
  meta: {
    nakshatraKo: string;
    nakshatraEn: string;
    firstDashaLordKo: string;
    periodCount: number;
    antardashaCount: number;
    easternAvailable: boolean;
    easternDirection: string;
  };
  current: { paragraphs: string[] } | null;
  periods: Period[];
  sections: ReportSection[];
  charCount: number;
}

function PeriodRow({ period, copy }: { period: Period; copy: ReturnType<typeof useNakshatraCopy> }) {
  const className = [
    timeline.period,
    period.isCurrent ? timeline.periodCurrent : "",
    period.isPast ? timeline.periodPast : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <details className={className} open={period.isCurrent}>
      <summary className={timeline.periodHead}>
        <span className={timeline.age}>
          {period.startAge}–{period.endAge}{copy.dashaAgeSuffix}
        </span>
        <span className={timeline.lord}>{period.lordKo}</span>
        <span className={timeline.phase}>{period.title}</span>
        {period.isCurrent && <span className={timeline.nowBadge}>{copy.dashaNowBadge}</span>}
      </summary>
      <div className={timeline.periodBody}>
        <p className={timeline.line}>
          <span className={timeline.lineLabel}>{copy.dashaPeriodLabel}</span>
          {period.startDate} ~ {period.endDate} · {period.focus}
        </p>
        <p className={timeline.line}>
          <span className={timeline.lineLabel}>{copy.dashaOpensLabel}</span>
          {period.opens}
        </p>
        <p className={timeline.line}>
          <span className={timeline.lineLabel}>{copy.dashaDemandsLabel}</span>
          {period.demands}
        </p>
        <p className={`${timeline.line} ${timeline.lineCaution}`}>
          <span className={timeline.lineLabel}>{copy.dashaCautionLabel}</span>
          {period.caution}
        </p>

        {period.easternCycles.length > 0 && (
          <p className={timeline.eastern}>
            <span className={timeline.easternLabel}>{copy.dashaEasternLabel}</span>
            {period.easternCycles
              .map((cycle) => `${cycle.pillar}${cycle.tenGod ? `(${cycle.tenGod})` : ""} ${cycle.startAge}–${cycle.endAge}${copy.dashaAgeSuffix}`)
              .join(" · ")}
          </p>
        )}

        <ul className={timeline.subs}>
          {period.antardashas.map((sub) => (
            <li key={`${period.index}-${sub.lord}`} className={`${timeline.sub} ${sub.isCurrent ? timeline.subCurrent : ""}`}>
              <span className={timeline.subDate}>
                {sub.startDate} ~ {sub.endDate}
              </span>
              <span className={timeline.subLord}>{sub.lordKo}</span>
              <span className={timeline.subTone}>{sub.tone}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export default function DashaMapClient() {
  const copy = useNakshatraCopy();
  const product = {
    featureKey: FEATURE_KEY,
    coinPrice: 100,
    amountKRW: 10000,
    reason: copy.dashaReason,
    endpoint: "/api/nakshatra-premium/dasha-map",
  } as const;
  const { report, birth, natal, confirmedLocked, unlocked, checking, loading, paying, error, unlock, setGender } =
    usePremiumReport<DashaMap>(product);

  const meta = report ? copy.dashaMetaSummary(report.meta.periodCount, report.meta.antardashaCount) : undefined;
  const natalLabel = natal || (report ? { sukuyoKo: "", sukuyoHan: "", nakshatraKo: report.meta.nakshatraKo, nakshatraEn: report.meta.nakshatraEn } : null);

  return (
    <main className={`${styles.vars} ${styles.shell}`}>
      <div className={styles.inner}>
        <Link href="/nakshatra" className={styles.back}>
          {copy.backToHubLink}
        </Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>{copy.dashaEyebrow}</p>
          <h1 className={styles.title}>{copy.dashaTitle}</h1>
          <p className={styles.lede}>{copy.dashaLede}</p>
        </header>

        <NatalBar natal={natalLabel} meta={meta} />

        {!birth && <NeedBirth />}

        {birth && !unlocked && (
          <>
            {checking && !confirmedLocked && <p className={styles.status}>{copy.checkingPassNote}</p>}
            {confirmedLocked && (
              <UnlockGate
                priceLabel={copy.dashaPriceLabel}
                bullets={copy.dashaGateBullets}
                onUnlock={() => void unlock()}
                disabled={paying || loading}
                buttonLabel={paying ? copy.payingButton : copy.dashaUnlockButton}
              />
            )}
          </>
        )}

        {birth && unlocked && !report && (
          <p className={styles.status}>{loading ? copy.dashaLoadingText : copy.dashaPreparingText}</p>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        {/* 성별이 비면 동양 대운 축이 통째로 빠진다 — 상품이 광고한 두 시계 중 하나다. */}
        {birth && unlocked && !birth.gender && (
          <GenderPrompt onPick={setGender} busy={loading} />
        )}

        {report && (
          <>
            {report.current && (
              <div className={styles.headline}>
                {report.current.paragraphs.map((paragraph, index) => (
                  <p key={index} style={{ margin: index === 0 ? 0 : "0.7rem 0 0" }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            <SectionCards sections={report.sections} />

            <section className={timeline.map} aria-labelledby="dasha-map-h">
              <h2 id="dasha-map-h" className={timeline.mapTitle}>
                {copy.dashaMapTitle(report.meta.periodCount)}
              </h2>
              <p className={timeline.mapNote}>
                {copy.dashaMapNote(report.meta.easternAvailable, report.meta.easternDirection)}
              </p>
              {report.periods.map((period) => (
                <PeriodRow key={period.index} period={period} copy={copy} />
              ))}
            </section>

            <CrossSell
              href="/nakshatra/lord-report"
              title={copy.dashaCrossSellTitle}
              text={copy.dashaCrossSellText}
              cta={copy.dashaCrossSellCta}
            />
            <p className={styles.disclaimer}>{copy.dashaDisclaimer}</p>
          </>
        )}
      </div>
    </main>
  );
}
