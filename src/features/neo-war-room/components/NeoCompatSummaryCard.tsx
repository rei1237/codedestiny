"use client";

import type { CSSProperties } from "react";
import type { LoadingLocale } from "@/constants/loadingMessages";
import { getNeoCompatStatusLabel, getNeoFormCopy } from "../data/form-copy";
import styles from "./neo-compat-summary.module.css";

/** 서버가 내는 축 그대로. worker/lib/neo-operation-room-compat.js 의 buildNeoCompatScores 와 짝이다. */
export type NeoCompatAxis = {
  key?: string;
  label?: string;
  value?: number;
  /** true 면 높을수록 나쁜 축(자미두수의 갈등 위험). 뒤집지 않고 라벨로 방향을 밝힌다. */
  inverted?: boolean;
};

export type NeoCompatScores = {
  overall?: number;
  axes?: NeoCompatAxis[];
  /**
   * 🔴 2026-08-26 이전에 저장된 자미두수 궁합 상담의 옛 모양. 그때는 축이 3개로 고정이라
   *    키를 평면으로 실었다. 재열람하면 이 값만 오므로 아래에서 축 배열로 되살린다 —
   *    안 그러면 옛 상담의 점수 카드가 통째로 비어 보인다.
   */
  resonance?: number;
  friction?: number;
  growth?: number;
};

export type NeoCompatSummary = {
  scores?: NeoCompatScores | null;
  relationshipStatus?: string;
  partnerBirthTimeUnknown?: boolean;
};

function clampScore(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

/**
 * 축 키 → 화면 카피 키. 🔴 서버가 주는 label 은 한국어라 그대로 그리면 다른 로케일이 깨진다.
 * 여기 없는 키만 서버 라벨로 폴백한다.
 */
const AXIS_COPY_KEYS = {
  resonance: "briefing.compatScoreResonance",
  friction: "briefing.compatScoreFriction",
  growth: "briefing.compatScoreGrowth",
  attraction: "briefing.compatScoreAttraction",
  stability: "briefing.compatScoreStability",
  communication: "briefing.compatScoreCommunication",
  endurance: "briefing.compatScoreEndurance",
} as const;

function axisLabel(axis: NeoCompatAxis, formCopy: ReturnType<typeof getNeoFormCopy>) {
  const copyKey = AXIS_COPY_KEYS[axis.key as keyof typeof AXIS_COPY_KEYS];
  return (copyKey ? formCopy[copyKey] : "") || axis.label || "";
}

/** 옛 평면 모양(자미두수 3축)을 축 배열로 되살린다. 새 모양이면 그대로 쓴다. */
function resolveAxes(scores: NeoCompatScores): NeoCompatAxis[] {
  if (Array.isArray(scores.axes)) return scores.axes;
  const legacy: NeoCompatAxis[] = [
    { key: "resonance", value: scores.resonance },
    { key: "friction", value: scores.friction, inverted: true },
    { key: "growth", value: scores.growth },
  ];
  return legacy.filter((axis) => Number.isFinite(Number(axis.value)));
}

/**
 * 궁합 계기판. 1차 브리핑 패널과 결과 명령서가 같은 카드를 쓴다.
 *
 * 🔴 friction 은 방향이 반대다(높을수록 위험). 서버가 뒤집지 않은 원값을 주므로 화면도 뒤집지 않고,
 *    라벨("갈등 위험")·색·각주 세 가지로 방향을 밝힌다. 여기서 100 - friction 으로 그리면
 *    같은 숫자가 화면과 프롬프트에서 다른 뜻이 된다.
 */
export default function NeoCompatSummaryCard({
  scores,
  relationshipStatus = "",
  partnerBirthTimeUnknown = false,
  locale,
}: NeoCompatSummary & { locale: LoadingLocale }) {
  if (!scores) return null;
  const formCopy = getNeoFormCopy(locale);
  const statusLabel = getNeoCompatStatusLabel(relationshipStatus, locale);
  // 축은 술수마다 다르다(자미두수 3축 · 사주 4축 · 베다 8쿠타). 이름을 박지 않고 서버가 낸
  // 라벨을 그대로 그린다 — 박아 두면 술수가 늘 때 게이지가 조용히 빈다.
  const axes = resolveAxes(scores);
  // 베다점은 축 없이 종합만 온다(쿠타 8개는 근거 표로 내려간다). 종합조차 없으면 그릴 게 없다.
  if (!axes.length && !Number.isFinite(Number(scores.overall))) return null;
  const gauges = [
    { axis: "overall", label: formCopy["briefing.compatScoreOverall"], value: clampScore(scores.overall), inverted: false },
    ...axes.map((axis, index) => ({
      axis: axis.key || `axis-${index}`,
      label: axisLabel(axis, formCopy),
      value: clampScore(axis.value),
      inverted: axis.inverted === true,
    })),
  ];
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <strong>{formCopy["briefing.compatScoresLabel"]}</strong>
        {statusLabel ? <span>{formCopy["briefing.compatStatusLabel"]} · {statusLabel}</span> : null}
      </header>
      <dl className={styles.gaugeGrid}>
        {gauges.map((gauge) => (
          <div key={gauge.axis} className={styles.gauge} data-axis={gauge.axis} data-inverted={gauge.inverted ? "true" : "false"}>
            <dt>{gauge.label}</dt>
            <dd>{gauge.value}</dd>
            <div className={styles.track}>
              <span
                className={styles.fill}
                style={{ "--neo-gauge-width": `${gauge.value}%` } as CSSProperties}
              />
            </div>
          </div>
        ))}
      </dl>
      <p className={styles.note}>
        {/* 축이 있으면 방향 안내, 없으면(베다점) 36점 만점을 백분율로 환산했다는 안내. */}
        <span>{axes.length ? formCopy["briefing.compatScoreNote"] : formCopy["briefing.compatScoreAshtakutaNote"]}</span>
        {partnerBirthTimeUnknown ? <span>{formCopy["briefing.compatPartnerTimeUnknownNote"]}</span> : null}
      </p>
    </section>
  );
}
