"use client";

/**
 * 종합 점수 — 원형 게이지 + 별점.
 *
 * 점수는 서버가 따로 주지 않는다. 연애 DNA 10개 지표의 평균을 반올림해 쓴다
 * (LLM 프롬프트·스키마를 건드리지 않으므로 이미 저장된 세션에서도 그대로 뜬다).
 *
 * ═══ PDF 안전장치 (html2canvas) ═══════════════════════════════════════════
 * 🔴 stroke-dashoffset 은 **언제나 인라인 최종값**이다. 등장 스윕은 useCodexEnterOnce 가
 *    돌려주는 마운트 직후 한 프레임에만 시작값으로 렌더되고, 그 뒤로는 DOM 이 영구히
 *    최종값을 들고 있는다. @keyframes 로 그리면 클론에서 0프레임부터 다시 돌아
 *    화면엔 92% 인데 PDF 엔 0% 로 저장된다.
 * 🔴 <svg> 에 width/height **속성**을 준다. CSS 로만 크기를 주면 직렬화 과정에서
 *    0 크기로 떨어질 수 있다.
 * 🔴 글로우(box-shadow/filter)는 렌더되지 않는다 — 링과 숫자가 그것 없이도 읽혀야 한다.
 */

import CodexReveal from "./CodexReveal";
import { useCodexCountUp, useCodexEnterOnce } from "../hooks/useCodexCountUp";
import { codexScoreStars, codexScoreTier } from "../data/premium";
import type { CodexLoveDna } from "./CodexLoveDna";
import type { CodexActMode } from "../data/acts";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import styles from "../styles/codex.module.css";

interface CodexScoreOverviewProps {
  loveDna: CodexLoveDna;
  mode: CodexActMode;
  /** PDF 캡처 중 — 애니메이션 없이 즉시 최종값 */
  forceVisible?: boolean;
}

const GAUGE_SIZE = 220;
const GAUGE_STROKE = 6;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

/** 10개 지표의 평균. 지표가 없으면 0 을 돌려주고 호출부가 렌더를 건너뛴다. */
export function codexOverallScore(loveDna: CodexLoveDna | null): number {
  const metrics = Array.isArray(loveDna?.metrics) ? loveDna.metrics : [];
  if (!metrics.length) return 0;
  const total = metrics.reduce((sum, metric) => {
    const score = Math.max(0, Math.min(100, Math.round(Number(metric.score) || 0)));
    return sum + score;
  }, 0);
  return Math.round(total / metrics.length);
}

/** data/premium.ts 의 CODEX_SCORE_TIERS.label(영문 키, 고정)로 로케일 문구를 고른다. */
function tierCopy(copy: ReturnType<typeof useMasterLoveCodexCopy>, label: string): string {
  switch (label) {
    case "Excellent Match": return copy.scoreTierExcellent;
    case "Strong Match": return copy.scoreTierStrong;
    case "Balanced Match": return copy.scoreTierBalanced;
    case "Growing Match": return copy.scoreTierGrowing;
    default: return copy.scoreTierChallenging;
  }
}

export default function CodexScoreOverview({ loveDna, mode, forceVisible = false }: CodexScoreOverviewProps) {
  const copy = useMasterLoveCodexCopy();
  const score = codexOverallScore(loveDna);
  const entering = useCodexEnterOnce(forceVisible);
  const displayed = useCodexCountUp(score, { skip: forceVisible, durationMs: 1100 });

  // 지표가 있으면 항상 렌더한다 — 점수 0(전 지표 0)이라고 숨기면 아래 지표 목록만 남아
  // 이 화면에서만 보여 주는 유형 이름(typeName)이 사라진다.
  const hasMetrics = Array.isArray(loveDna?.metrics) && loveDna.metrics.length > 0;
  if (!hasMetrics) return null;

  const tier = codexScoreTier(score);
  const tierLabel = tierCopy(copy, tier.label);
  const stars = codexScoreStars(score);
  // 인라인 최종값. entering 인 한 프레임에만 빈 링으로 렌더된다.
  const dashOffset = entering
    ? GAUGE_CIRCUMFERENCE
    : GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * score) / 100;

  return (
    <section data-codex-pdf-page className={styles.section} aria-label={copy.scoreSectionAriaLabel}>
      <div className={`${styles.measure} text-center`}>
        <CodexReveal forceVisible={forceVisible}>
          <p
            className={`${styles.numeral} text-[0.75rem]`}
            style={{ letterSpacing: "0.28em", color: "var(--codex-gold-dim)" }}
          >
            {mode === "compat" ? copy.relationshipScoreEyebrow : copy.loveScoreEyebrow}
          </p>

          <div className="relative mx-auto mt-10" style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
            <svg
              width={GAUGE_SIZE}
              height={GAUGE_SIZE}
              viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
              role="img"
              aria-label={copy.scoreAriaLabel(score, tierLabel)}
            >
              <circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={GAUGE_RADIUS}
                fill="none"
                stroke="rgba(232,213,163,.16)"
                strokeWidth={GAUGE_STROKE}
              />
              <circle
                className={styles.gaugeRing}
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={GAUGE_RADIUS}
                fill="none"
                stroke="var(--codex-gold)"
                strokeWidth={GAUGE_STROKE}
                strokeLinecap="round"
                strokeDasharray={GAUGE_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={styles.numeral}
                style={{ fontSize: "clamp(3rem, 12vw, 4rem)", lineHeight: 1, color: "var(--codex-gold)" }}
              >
                {displayed}
              </span>
              <span
                className={styles.numeral}
                style={{ fontSize: "0.875rem", letterSpacing: "0.18em", color: "var(--codex-silver)" }}
              >
                / 100
              </span>
            </div>
          </div>

          <p className="mt-8" style={{ fontSize: "1.125rem", letterSpacing: "0.3em", color: "var(--codex-gold)" }}>
            <span aria-hidden="true">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
            <span className="sr-only">{copy.scoreStarsAriaLabel(stars)}</span>
          </p>
          <p
            className={`${styles.numeral} mt-5`}
            style={{ fontSize: "clamp(1.25rem, 4.5vw, 1.625rem)", letterSpacing: "0.06em", color: "var(--codex-ink-text)" }}
          >
            {tier.label}
          </p>
          <p className="mt-2 leading-8" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-silver)" }}>
            {tierLabel}
          </p>

          {/* 유형 이름은 이 화면에만 둔다 — 아래 연애 DNA 패널은 요약문과 지표를 맡는다 */}
          {loveDna.typeName ? (
            <>
              <hr className={`${styles.rule} ${styles.ruleShort} mt-10`} />
              <h2 className={`${styles.actTitle} mt-8`} style={{ color: "var(--codex-gold)" }}>
                {loveDna.typeName}
              </h2>
            </>
          ) : null}
        </CodexReveal>
      </div>
    </section>
  );
}
