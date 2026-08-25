"use client";

import type { CSSProperties } from "react";
import type { LoadingLocale } from "@/constants/loadingMessages";
import { getNeoCompatStatusLabel, getNeoFormCopy } from "../data/form-copy";
import styles from "./neo-compat-summary.module.css";

/** 서버가 내는 축 그대로. worker/lib/neo-operation-room-compat.js 의 buildNeoCompatScores 와 짝이다. */
export type NeoCompatScores = {
  overall?: number;
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
  const gauges = [
    { axis: "overall", label: formCopy["briefing.compatScoreOverall"], value: clampScore(scores.overall) },
    { axis: "resonance", label: formCopy["briefing.compatScoreResonance"], value: clampScore(scores.resonance) },
    { axis: "friction", label: formCopy["briefing.compatScoreFriction"], value: clampScore(scores.friction) },
    { axis: "growth", label: formCopy["briefing.compatScoreGrowth"], value: clampScore(scores.growth) },
  ];
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <strong>{formCopy["briefing.compatScoresLabel"]}</strong>
        {statusLabel ? <span>{formCopy["briefing.compatStatusLabel"]} · {statusLabel}</span> : null}
      </header>
      <dl className={styles.gaugeGrid}>
        {gauges.map((gauge) => (
          <div key={gauge.axis} className={styles.gauge} data-axis={gauge.axis}>
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
        <span>{formCopy["briefing.compatScoreNote"]}</span>
        {partnerBirthTimeUnknown ? <span>{formCopy["briefing.compatPartnerTimeUnknownNote"]}</span> : null}
      </p>
    </section>
  );
}
