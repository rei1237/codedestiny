"use client";

import Link from "next/link";
import styles from "../_premium/premium.module.css";
import timeline from "./dasha-timeline.module.css";
import { usePremiumReport } from "../_premium/use-premium-report";
import { CrossSell, GenderPrompt, NatalBar, NeedBirth, SectionCards, UnlockGate, type ReportSection } from "../_premium/PremiumParts";

const PRODUCT = {
  featureKey: "nakshatra-dasha-map",
  coinPrice: 100,
  amountKRW: 10000,
  reason: "나크샤트라 다샤 인생지도 해금",
  endpoint: "/api/nakshatra-premium/dasha-map",
} as const;

const GATE_BULLETS = [
  "비쇼타리 120년 — 마하다샤 전 구간을 나이·연도와 함께",
  "각 대주기 안의 안타르다샤 9구간 전개(총 90구간)",
  "동양 사주 대운(절기 기준 10년)을 같은 연도 축에 병렬",
  "지금 지나는 구간이 무엇을 열고 무엇을 요구하는지",
  "무대가 바뀌는 해 — 대주기 전환 연표",
  "구간마다의 기회 · 요구 · 주의 항목",
];

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

function PeriodRow({ period }: { period: Period }) {
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
          {period.startAge}–{period.endAge}세
        </span>
        <span className={timeline.lord}>{period.lordKo}</span>
        <span className={timeline.phase}>{period.title}</span>
        {period.isCurrent && <span className={timeline.nowBadge}>지금</span>}
      </summary>
      <div className={timeline.periodBody}>
        <p className={timeline.line}>
          <span className={timeline.lineLabel}>기간 </span>
          {period.startDate} ~ {period.endDate} · {period.focus}
        </p>
        <p className={timeline.line}>
          <span className={timeline.lineLabel}>여는 것 </span>
          {period.opens}
        </p>
        <p className={timeline.line}>
          <span className={timeline.lineLabel}>요구하는 것 </span>
          {period.demands}
        </p>
        <p className={`${timeline.line} ${timeline.lineCaution}`}>
          <span className={timeline.lineLabel}>주의 </span>
          {period.caution}
        </p>

        {period.easternCycles.length > 0 && (
          <p className={timeline.eastern}>
            <span className={timeline.easternLabel}>같은 시기의 동양 대운 </span>
            {period.easternCycles
              .map((cycle) => `${cycle.pillar}${cycle.tenGod ? `(${cycle.tenGod})` : ""} ${cycle.startAge}–${cycle.endAge}세`)
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
  const { report, birth, natal, confirmedLocked, unlocked, checking, loading, paying, error, unlock, setGender } =
    usePremiumReport<DashaMap>(PRODUCT);

  const meta = report ? `${report.meta.periodCount}구간 · 안타르 ${report.meta.antardashaCount}` : undefined;
  const natalLabel = natal || (report ? { sukuyoKo: "", sukuyoHan: "", nakshatraKo: report.meta.nakshatraKo, nakshatraEn: report.meta.nakshatraEn } : null);

  return (
    <main className={`${styles.vars} ${styles.shell}`}>
      <div className={styles.inner}>
        <Link href="/nakshatra" className={styles.back}>
          ← 나크샤트라 결정판
        </Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>Nakshatra Codex · Vimshottari Dasha</p>
          <h1 className={styles.title}>다샤 인생지도</h1>
          <p className={styles.lede}>
            태어날 때 달이 있던 자리에서 시작하는 120년의 시간표입니다. 아홉 그라하가 도는 인도의 시계와
            열 살 단위로 흐르는 동양 대운을 같은 연도 축에 나란히 놓습니다.
          </p>
        </header>

        <NatalBar natal={natalLabel} meta={meta} />

        {!birth && <NeedBirth />}

        {birth && !unlocked && (
          <>
            {checking && !confirmedLocked && <p className={styles.status}>이용권을 확인하는 중이에요…</p>}
            {confirmedLocked && (
              <UnlockGate
                priceLabel="15,000원 · 1회 해금"
                bullets={GATE_BULLETS}
                onUnlock={() => void unlock()}
                disabled={paying || loading}
                buttonLabel={paying ? "결제 진행 중…" : "인생지도 열기"}
              />
            )}
          </>
        )}

        {birth && unlocked && !report && (
          <p className={styles.status}>{loading ? "120년의 시간표를 펼치는 중이에요…" : "지도를 준비하고 있어요…"}</p>
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
                120년 지도 — 마하다샤 {report.meta.periodCount}구간
              </h2>
              <p className={timeline.mapNote}>
                구간을 누르면 그 안의 안타르다샤 9개가 펼쳐집니다.
                {report.meta.easternAvailable
                  ? ` 동양 대운(${report.meta.easternDirection})이 같은 연도 축에 함께 표시됩니다.`
                  : " 성별을 포함해 다시 열면 동양 대운이 함께 표시됩니다."}
              </p>
              {report.periods.map((period) => (
                <PeriodRow key={period.index} period={period} />
              ))}
            </section>

            <CrossSell
              href="/nakshatra/lord-report"
              title="그 시기를 지나는 사람은 누구인가"
              text="이 지도가 '언제인가'를 다뤘다면, 지배성 심화 리포트는 '누구인가'를 다룹니다. 같은 시기가 사람마다 다르게 흐르는 이유가 거기 있습니다."
              cta="지배성 심화 리포트 보기"
            />
            <p className={styles.disclaimer}>
              비쇼타리 다샤는 시데리얼(라히리) 기준 출생 시 달의 위치로 계산합니다. 출생 시각이
              부정확하면 구간 경계가 밀릴 수 있습니다. 해석 자료이며 의료·법률·투자 판단의 근거로 쓰지 마세요.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
