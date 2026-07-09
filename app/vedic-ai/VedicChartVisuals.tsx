"use client";

import { useMemo, useState } from "react";
import styles from "./VedicAiClient.module.css";

type AnyRecord = Record<string, unknown>;

const SIGN_NUMBERS: Record<string, number> = {
  Aries: 1, Taurus: 2, Gemini: 3, Cancer: 4, Leo: 5, Virgo: 6,
  Libra: 7, Scorpio: 8, Sagittarius: 9, Capricorn: 10, Aquarius: 11, Pisces: 12,
};

const GRAHA_SHORT: Record<string, string> = {
  "태양": "태", "달": "달", "화성": "화", "수성": "수", "목성": "목",
  "금성": "금", "토성": "토", "라후": "라", "케투": "케",
  Sun: "태", Moon: "달", Mars: "화", Mercury: "수", Jupiter: "목",
  Venus: "금", Saturn: "토", Rahu: "라", Ketu: "케",
};

// 북인도식(다이아몬드) 차트 12바바 폴리곤 좌표. viewBox 0 0 200 200 기준,
// 1하우스가 상단 중앙 마름모이며 반시계 방향으로 진행하는 전통 배치.
const HOUSE_POLYGONS: Array<{ house: number; points: string; cx: number; cy: number }> = [
  { house: 1, points: "100,0 150,50 100,100 50,50", cx: 100, cy: 50 },
  { house: 2, points: "0,0 100,0 50,50", cx: 50, cy: 22 },
  { house: 3, points: "0,0 50,50 0,100", cx: 22, cy: 50 },
  { house: 4, points: "0,100 50,50 100,100 50,150", cx: 50, cy: 100 },
  { house: 5, points: "0,100 50,150 0,200", cx: 22, cy: 150 },
  { house: 6, points: "0,200 50,150 100,200", cx: 50, cy: 178 },
  { house: 7, points: "100,200 50,150 100,100 150,150", cx: 100, cy: 150 },
  { house: 8, points: "100,200 150,150 200,200", cx: 150, cy: 178 },
  { house: 9, points: "200,200 150,150 200,100", cx: 178, cy: 150 },
  { house: 10, points: "200,100 150,150 100,100 150,50", cx: 150, cy: 100 },
  { house: 11, points: "200,100 150,50 200,0", cx: 178, cy: 50 },
  { house: 12, points: "200,0 100,0 150,50", cx: 150, cy: 22 },
];

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : {};
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

type BhavaInfo = {
  house: number;
  rashi: string;
  rashiKo: string;
  signNumber: number;
  meaning: string;
  grahas: string[];
  lord: string;
};

function readBhavas(chart: AnyRecord): BhavaInfo[] {
  const rows = Array.isArray(chart.bhavas)
    ? chart.bhavas.map(asRecord)
    : (Array.isArray(chart.houses) ? chart.houses.map(asRecord) : []);
  return rows
    .map((row) => {
      const rashi = toText(row.rashi || row.sign);
      return {
        house: Number(row.house) || 0,
        rashi,
        rashiKo: toText(row.rashiKo || row.signKo) || rashi,
        signNumber: SIGN_NUMBERS[rashi] || 0,
        meaning: toText(row.meaning),
        grahas: Array.isArray(row.grahas)
          ? row.grahas.map(toText).filter(Boolean)
          : (Array.isArray(row.planets) ? row.planets.map(toText).filter(Boolean) : []),
        lord: toText(row.lord),
      };
    })
    .filter((row) => row.house >= 1 && row.house <= 12);
}

export function NorthIndianChart({ chart }: { chart: AnyRecord }) {
  const bhavas = useMemo(() => readBhavas(chart), [chart]);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const byHouse = useMemo(() => new Map(bhavas.map((row) => [row.house, row])), [bhavas]);

  if (!bhavas.length) {
    return (
      <section className={styles.rashiChartCard} aria-label="라시 차트">
        <div className={styles.rashiChartHeader}>
          <span>라시 차트, Rashi Chart (D1)</span>
        </div>
        <p className={styles.chartNotice}>출생시간이 없어 라그나 기준 바바 배치를 그리지 않았습니다. 달·나크샤트라·다샤 중심으로 읽습니다.</p>
      </section>
    );
  }

  const selected = selectedHouse ? byHouse.get(selectedHouse) : null;

  return (
    <section className={styles.rashiChartCard} aria-label="라시 차트 D1 — 하우스를 누르면 해설이 열립니다">
      <div className={styles.rashiChartHeader}>
        <span>라시 차트, Rashi Chart (D1)</span>
        <small>북인도식 · 바바를 누르면 해설이 열립니다</small>
      </div>
      <div className={styles.rashiChartBody}>
        <svg viewBox="-4 -4 208 208" className={styles.rashiChartSvg} role="group" aria-label="북인도식 라시 차트">
          <rect x="0" y="0" width="200" height="200" className={styles.rashiFrame} />
          {HOUSE_POLYGONS.map(({ house, points, cx, cy }) => {
            const bhava = byHouse.get(house);
            const grahas = (bhava?.grahas || []).map((name) => GRAHA_SHORT[name] || name.slice(0, 1));
            const isSelected = selectedHouse === house;
            return (
              <g
                key={house}
                className={isSelected ? styles.rashiHouseSelected : styles.rashiHouse}
                onClick={() => setSelectedHouse(isSelected ? null : house)}
                role="button"
                tabIndex={0}
                aria-label={`${house}하우스 ${bhava?.rashiKo || ""} ${bhava?.grahas?.join(", ") || "그라하 없음"}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedHouse(isSelected ? null : house);
                  }
                }}
              >
                <polygon points={points} />
                <text x={cx} y={cy - (grahas.length ? 6 : 0)} className={styles.rashiSignNumber} textAnchor="middle">
                  {bhava?.signNumber || ""}
                </text>
                {grahas.length ? (
                  <text x={cx} y={cy + 9} className={styles.rashiGrahaText} textAnchor="middle">
                    {grahas.slice(0, 4).join(" ")}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <div className={styles.rashiDetailPane}>
          {selected ? (
            <>
              <strong>{selected.house}하우스 · {selected.rashiKo}</strong>
              <p>{selected.meaning || "이 바바의 의미 정보가 없습니다."}</p>
              <small>
                지배성 {selected.lord || "-"}
                {selected.grahas.length ? ` · 머무는 그라하: ${selected.grahas.join(", ")}` : " · 머무는 그라하 없음"}
              </small>
            </>
          ) : (
            <p className={styles.rashiDetailHint}>차트의 바바(칸)를 누르면 그 자리의 의미와 머무는 그라하를 보여드립니다. 숫자는 라시(별자리) 번호입니다.</p>
          )}
        </div>
      </div>
    </section>
  );
}

type DashaPeriod = {
  lord: string;
  startDate: string;
  endDate: string;
  durationYears: number;
};

function readDashaPeriods(chart: AnyRecord): DashaPeriod[] {
  const vimshottari = asRecord(chart.vimshottariDasha);
  const legacy = asRecord(chart.dasha);
  const rows = Array.isArray(vimshottari.periods)
    ? vimshottari.periods.map(asRecord)
    : (Array.isArray(legacy.periods) ? legacy.periods.map(asRecord) : []);
  return rows
    .map((row) => ({
      lord: toText(row.lord),
      startDate: toText(row.startDate) || toText(row.start).slice(0, 10),
      endDate: toText(row.endDate) || toText(row.end).slice(0, 10),
      durationYears: Number(row.durationYears ?? row.years) || 0,
    }))
    .filter((row) => row.lord && row.durationYears > 0);
}

const DASHA_COLORS: Record<string, string> = {
  Sun: "#f59e0b", Moon: "#cbd5f5", Mars: "#f87171", Mercury: "#34d399", Jupiter: "#fbbf24",
  Venus: "#f9a8d4", Saturn: "#818cf8", Rahu: "#94a3b8", Ketu: "#a78bfa",
};

const GRAHA_KO: Record<string, string> = {
  Sun: "태양", Moon: "달", Mars: "화성", Mercury: "수성", Jupiter: "목성",
  Venus: "금성", Saturn: "토성", Rahu: "라후", Ketu: "케투",
};

// 조티시 자연 길성/흉성 분류. 길성(부드러운 흐름): 목성·금성·수성·달. 흉성(도전적 흐름): 토성·화성·태양·라후·케투.
const BENEFIC_GRAHAS = new Set(["Jupiter", "Venus", "Mercury", "Moon", "목성", "금성", "수성", "달"]);

type GrahaNature = "benefic" | "malefic";

export function getGrahaMeta(lord: string): { ko: string; nature: GrahaNature } {
  const key = String(lord ?? "").trim();
  const ko = GRAHA_KO[key] || key;
  const nature: GrahaNature = BENEFIC_GRAHAS.has(key) ? "benefic" : "malefic";
  return { ko, nature };
}

const NATURE_LABEL: Record<GrahaNature, string> = {
  benefic: "길성 · 부드러운 흐름",
  malefic: "흉성 · 도전적 흐름",
};

// 그라하 성정(길성/흉성)을 나타내는 작은 색 점. 색만으로 구분되지 않도록 스크린리더 텍스트를 함께 제공.
export function GrahaNatureDot({ nature }: { nature: GrahaNature }) {
  return (
    <i className={`${styles.grahaNatureDot} ${nature === "benefic" ? styles.grahaNatureBenefic : styles.grahaNatureMalefic}`} aria-hidden="true">
      <span className={styles.srOnly}>{NATURE_LABEL[nature]}</span>
    </i>
  );
}

const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;

// 마하다샤 진행률 링. 현재 날짜가 마하다샤 전체 기간(예: 토성 19년) 중 어디쯤인지를
// progress = (now - start) / (end - start) 로 계산해 원형 링으로 표현한다.
export function DashaProgressRing({ lord, startDate, endDate }: { lord: string; startDate: string; endDate: string }) {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  const now = Date.now();
  const meta = getGrahaMeta(lord);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  const totalMs = end - start;
  const elapsedMs = Math.min(totalMs, Math.max(0, now - start));
  const progress = elapsedMs / totalMs;
  const elapsedYears = elapsedMs / YEAR_MS;
  const totalYears = totalMs / YEAR_MS;
  const percent = Math.round(progress * 100);

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={styles.dashaRing} role="img" aria-label={`${meta.ko} 마하다샤 진행률 ${percent}퍼센트, 전체 ${totalYears.toFixed(0)}년 중 ${elapsedYears.toFixed(1)}년 경과`}>
      <svg viewBox="0 0 72 72" className={styles.dashaRingSvg} aria-hidden="true">
        <circle cx="36" cy="36" r={radius} className={styles.dashaRingTrack} />
        <circle
          cx="36"
          cy="36"
          r={radius}
          className={styles.dashaRingProgress}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <span className={styles.dashaRingPercent} aria-hidden="true">{percent}%</span>
    </div>
  );
}

export function DashaTimeline({ chart }: { chart: AnyRecord }) {
  const periods = useMemo(() => readDashaPeriods(chart), [chart]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  if (!periods.length) return null;

  const now = Date.now();
  const totalYears = periods.reduce((sum, period) => sum + period.durationYears, 0) || 1;
  const currentIndex = periods.findIndex((period) => {
    const start = Date.parse(period.startDate);
    const end = Date.parse(period.endDate);
    return Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end;
  });
  const selected = selectedIndex != null ? periods[selectedIndex] : (currentIndex >= 0 ? periods[currentIndex] : null);

  return (
    <section className={styles.dashaTimelineCard} aria-label="빈쇼타리 다샤 타임라인">
      <div className={styles.rashiChartHeader}>
        <span>다샤 타임라인, Vimshottari Dasha</span>
        <small>구간을 누르면 기간이 보입니다 · ▼ 지금</small>
      </div>
      <div className={styles.dashaTrackWrap}>
        <div className={styles.dashaTrack} role="list">
          {periods.map((period, index) => {
            const width = Math.max(4, (period.durationYears / totalYears) * 100);
            const isCurrent = index === currentIndex;
            const isSelected = selectedIndex === index || (selectedIndex == null && isCurrent);
            const meta = getGrahaMeta(period.lord);
            let currentOffset = 0;
            if (isCurrent) {
              const start = Date.parse(period.startDate);
              const end = Date.parse(period.endDate);
              if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
                currentOffset = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
              }
            }
            return (
              <button
                type="button"
                role="listitem"
                key={`${period.lord}-${period.startDate}`}
                className={`${styles.dashaSegment} ${isSelected ? styles.dashaSegmentSelected : ""}`}
                style={{ width: `${width}%`, background: DASHA_COLORS[period.lord] || "#7c7f93" }}
                onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
                aria-label={`${meta.ko} 다샤(${NATURE_LABEL[meta.nature]}) ${period.startDate}부터 ${period.endDate}까지 ${period.durationYears}년${isCurrent ? ", 현재 진행 중" : ""}`}
              >
                <span>{meta.ko}</span>
                {isCurrent ? <i className={styles.dashaNowMarker} style={{ left: `${currentOffset}%` }} aria-hidden="true">▼</i> : null}
              </button>
            );
          })}
        </div>
      </div>
      {selected ? (
        <p className={styles.dashaSelectedInfo}>
          <GrahaNatureDot nature={getGrahaMeta(selected.lord).nature} />
          <strong>{getGrahaMeta(selected.lord).ko} 마하다샤</strong> · {selected.startDate} ~ {selected.endDate} ({selected.durationYears}년)
          {currentIndex >= 0 && periods[currentIndex] === selected ? " · 지금 이 흐름 안에 있습니다" : ""}
        </p>
      ) : null}
    </section>
  );
}

// 메인 히어로용 장식 차트 — 데이터 없이 북인도식 격자와 라시 번호만 은은하게 표시
export function HeroChartPreview() {
  return (
    <svg viewBox="-4 -4 208 208" className={styles.heroChartPreview} aria-hidden="true">
      <rect x="0" y="0" width="200" height="200" className={styles.rashiFrame} />
      {HOUSE_POLYGONS.map(({ house, points, cx, cy }) => (
        <g key={house} className={styles.heroChartHouse}>
          <polygon points={points} />
          <text x={cx} y={cy + 3} textAnchor="middle">{house}</text>
        </g>
      ))}
    </svg>
  );
}
