"use client";
/**
 * 초융합 결과 시각화 — 체계별 신호 강도(레이더) · 12개월 시기 라인 · 교차 검증 게이지.
 *
 * 🔴 전부 인라인 SVG 로만 그린다. 결과 화면은 html2canvas 로 PDF 캡처되는데 canvas 기반
 * 차트 라이브러리는 그 캡처에서 빈 상자로 남는다. 같은 이유로 recharts 를 새로 들이지 않고,
 * app/destiny-compass/_components/DestinyRadar.tsx 의 인라인 SVG 패턴을 따른다.
 *
 * 데이터는 worker/lib/fusion-fortune-visual.js 가 항상 채워 준다(LLM 이 빠뜨려도 결정론 폴백).
 */
import { FUSION_ORB_BY_KEY, type FusionSystemKey } from "./fusionOrbs";
import styles from "./fusion-visualization.module.css";

export type FusionSystemScore = { key: FusionSystemKey; label: string; score: number; note?: string };
export type FusionTimelineMonth = { label: string; intensity: number; note: string };
export type FusionCrossCheck = { theme: string; systems: string[]; meaning: string };
export type FusionVisualizationData = {
  systemScores: FusionSystemScore[];
  monthlyTimeline: FusionTimelineMonth[];
  crossChecks: { aligned: FusionCrossCheck[]; divergent: FusionCrossCheck[] };
};

const RADAR_SIZE = 300;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = RADAR_CENTER - 52;
const RADAR_RINGS = [0.25, 0.5, 0.75, 1];

function radarPoint(radius: number, angle: number): [number, number] {
  return [RADAR_CENTER + Math.cos(angle) * radius, RADAR_CENTER + Math.sin(angle) * radius];
}

function FusionSignalRadar({ scores }: { scores: FusionSystemScore[] }) {
  const items = scores.map((item, index) => ({
    ...item,
    angle: (index / scores.length) * Math.PI * 2 - Math.PI / 2,
    tint: FUSION_ORB_BY_KEY[item.key]?.tint || "#e8d5a3",
  }));
  const valuePoly = items.map((item) => radarPoint(RADAR_RADIUS * (item.score / 100), item.angle).join(",")).join(" ");

  return (
    <svg
      className={styles.radar}
      /* 라벨은 반지름 밖으로 나가므로 좌우에 여백을 더 준다 — 안 그러면 "자미두수"가 잘린다. */
      viewBox={`-46 0 ${RADAR_SIZE + 92} ${RADAR_SIZE}`}
      role="img"
      aria-label={`체계별 신호 강도: ${items.map((item) => `${item.label} ${item.score}`).join(", ")}`}
    >
      <defs>
        <radialGradient id="cd-fusion-radar-fill" cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor="rgba(232, 213, 163, 0.46)" />
          <stop offset="100%" stopColor="rgba(140, 96, 214, 0.24)" />
        </radialGradient>
      </defs>
      {RADAR_RINGS.map((ring) => (
        <polygon
          key={ring}
          points={items.map((item) => radarPoint(RADAR_RADIUS * ring, item.angle).join(",")).join(" ")}
          fill="none"
          stroke="rgba(232, 213, 163, 0.16)"
          strokeWidth="1"
        />
      ))}
      {items.map((item) => {
        const [x, y] = radarPoint(RADAR_RADIUS, item.angle);
        return <line key={item.key} x1={RADAR_CENTER} y1={RADAR_CENTER} x2={x} y2={y} stroke="rgba(232, 213, 163, 0.14)" strokeWidth="1" />;
      })}
      <polygon points={valuePoly} fill="url(#cd-fusion-radar-fill)" stroke="#e8d5a3" strokeWidth="2" />
      {items.map((item) => {
        const [x, y] = radarPoint(RADAR_RADIUS * (item.score / 100), item.angle);
        return <circle key={item.key} cx={x} cy={y} r="4.5" fill={item.tint} stroke="#0e0a1d" strokeWidth="1.5" />;
      })}
      {items.map((item) => {
        const [x, y] = radarPoint(RADAR_RADIUS + 22, item.angle);
        const cos = Math.cos(item.angle);
        const anchor = Math.abs(cos) < 0.35 ? "middle" : cos > 0 ? "start" : "end";
        return (
          <text key={item.key} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className={styles.radarLabel}>
            {item.label}
          </text>
        );
      })}
    </svg>
  );
}

const LINE_WIDTH = 720;
const LINE_HEIGHT = 200;
const LINE_TOP = 16;
const LINE_BOTTOM = LINE_HEIGHT - 34;

function FusionMonthlyLine({ months }: { months: FusionTimelineMonth[] }) {
  const step = LINE_WIDTH / Math.max(1, months.length - 1);
  const y = (intensity: number) => LINE_BOTTOM - (LINE_BOTTOM - LINE_TOP) * (Math.min(100, Math.max(0, intensity)) / 100);
  const points = months.map((month, index) => [index * step, y(month.intensity)] as const);
  const line = points.map(([x, py]) => `${x.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = `0,${LINE_BOTTOM} ${line} ${LINE_WIDTH},${LINE_BOTTOM}`;

  return (
    <svg
      className={styles.line}
      viewBox={`-10 0 ${LINE_WIDTH + 20} ${LINE_HEIGHT}`}
      role="img"
      aria-label={`앞으로 12개월 흐름: ${months.map((month) => `${month.label} ${month.intensity}`).join(", ")}`}
    >
      <defs>
        <linearGradient id="cd-fusion-line-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(232, 213, 163, 0.34)" />
          <stop offset="100%" stopColor="rgba(232, 213, 163, 0)" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line key={ratio} x1="0" x2={LINE_WIDTH} y1={y(ratio * 100)} y2={y(ratio * 100)} stroke="rgba(232, 213, 163, 0.12)" strokeWidth="1" />
      ))}
      <polygon points={area} fill="url(#cd-fusion-line-fill)" />
      <polyline points={line} fill="none" stroke="#e8d5a3" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map(([x, py], index) => (
        <circle key={months[index].label + index} cx={x} cy={py} r="4" fill="#0e0a1d" stroke="#f0dda8" strokeWidth="2" />
      ))}
      {months.map((month, index) => (
        <text key={month.label + index} x={index * step} y={LINE_HEIGHT - 10} textAnchor="middle" className={styles.lineLabel}>
          {month.label}
        </text>
      ))}
    </svg>
  );
}

const GAUGE_RADIUS = 78;

function FusionCrossCheckGauge({ aligned, divergent }: { aligned: number; divergent: number }) {
  const total = Math.max(1, aligned + divergent);
  const ratio = aligned / total;
  const circumference = Math.PI * GAUGE_RADIUS;
  const label = `${Math.round(ratio * 100)}%`;

  return (
    <svg className={styles.gauge} viewBox="0 0 200 118" role="img" aria-label={`체계 간 합의 강도 ${label}. 겹치는 신호 ${aligned}가지, 엇갈리는 신호 ${divergent}가지.`}>
      <path d={`M 22 100 A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 178 100`} fill="none" stroke="rgba(232, 213, 163, 0.18)" strokeWidth="13" strokeLinecap="round" />
      <path
        d={`M 22 100 A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 178 100`}
        fill="none"
        stroke="#e8d5a3"
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray={`${(circumference * ratio).toFixed(1)} ${circumference.toFixed(1)}`}
      />
      <text x="100" y="86" textAnchor="middle" className={styles.gaugeValue}>{label}</text>
      <text x="100" y="108" textAnchor="middle" className={styles.gaugeCaption}>체계 간 합의</text>
    </svg>
  );
}

function SystemChips({ systems }: { systems: string[] }) {
  return (
    <span className={styles.chips}>
      {systems.map((key) => {
        const orb = FUSION_ORB_BY_KEY[key as FusionSystemKey];
        if (!orb) return null;
        return <b key={key} className={styles.chip} style={{ "--tint": orb.tint } as React.CSSProperties}>{orb.label}</b>;
      })}
    </span>
  );
}

export function FusionVisualization({ data }: { data: FusionVisualizationData }) {
  const { systemScores, monthlyTimeline, crossChecks } = data;

  return (
    <section className={styles.wrap} aria-label="초융합 리딩 요약 지표">
      <article className={styles.card}>
        <h3>체계별 신호 강도</h3>
        <p className={styles.caption}>여섯 체계가 이번 질문에 얼마나 뚜렷한 신호를 주는지입니다. 사람을 평가하는 점수가 아닙니다.</p>
        <FusionSignalRadar scores={systemScores} />
        <ul className={styles.scoreList}>
          {systemScores.map((item) => (
            <li key={item.key} style={{ "--tint": FUSION_ORB_BY_KEY[item.key]?.tint || "#e8d5a3" } as React.CSSProperties}>
              <span>{item.label}</span>
              <i aria-hidden><em style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }} /></i>
              <b>{item.score}</b>
              {item.note && <small>{item.note}</small>}
            </li>
          ))}
        </ul>
      </article>

      <article className={styles.card}>
        <h3>교차 검증</h3>
        <p className={styles.caption}>여러 체계가 함께 가리키는 신호는 우선순위로, 엇갈리는 신호는 상황별 선택지로 남깁니다.</p>
        <div className={styles.crossGrid}>
          <FusionCrossCheckGauge aligned={crossChecks.aligned.length} divergent={crossChecks.divergent.length} />
          <div className={styles.crossLists}>
            <div>
              <h4>겹치는 신호</h4>
              <ul>
                {crossChecks.aligned.map((item, index) => (
                  <li key={item.theme + index}>
                    <strong>{item.theme}</strong>
                    <SystemChips systems={item.systems} />
                    <p>{item.meaning}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>엇갈리는 신호</h4>
              <ul>
                {crossChecks.divergent.map((item, index) => (
                  <li key={item.theme + index}>
                    <strong>{item.theme}</strong>
                    <SystemChips systems={item.systems} />
                    <p>{item.meaning}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </article>

      <article className={`${styles.card} ${styles.wide}`}>
        <h3>앞으로 12개월의 시기 라인</h3>
        <p className={styles.caption}>사건을 예고하는 선이 아니라, 각 달에 힘을 쓸 만한 정도와 그때 해볼 일입니다.</p>
        <FusionMonthlyLine months={monthlyTimeline} />
        <ol className={styles.monthList}>
          {monthlyTimeline.map((month, index) => (
            <li key={month.label + index}>
              <strong>{month.label}</strong>
              <i aria-hidden><em style={{ width: `${Math.min(100, Math.max(0, month.intensity))}%` }} /></i>
              <span>{month.note}</span>
            </li>
          ))}
        </ol>
      </article>
    </section>
  );
}
