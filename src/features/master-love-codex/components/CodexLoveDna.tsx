"use client";

/**
 * 연애 DNA — 10개 지표.
 *
 * 카드/박스를 쓰지 않는다. 지표는 잉크 위에 이름·숫자·트랙만으로 놓이고,
 * 숫자는 Cinzel 라이닝 숫자 + tabular-nums 로 자리를 맞춘다(로드된 mono 웹폰트가 없다).
 * 유형 이름(typeName)은 위쪽 CodexScoreOverview 가 맡는다 — 여기서는 요약문부터 시작한다.
 *
 * 🔴 PDF: 막대 폭은 언제나 인라인 최종값이고, 스윕은 transform(scaleX)으로만 한다.
 *    정지 상태가 곧 최종 상태라 캡처가 언제 일어나도 0% 막대가 찍히지 않는다.
 *    숫자도 useCodexCountUp 의 skip 으로 즉시 최종값이 된다.
 */

import CodexReveal from "./CodexReveal";
import { useCodexCountUp, useCodexEnterOnce } from "../hooks/useCodexCountUp";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import styles from "../styles/codex.module.css";

export interface CodexLoveDnaMetric {
  key: string;
  label: string;
  score: number;
  basis?: string;
}

export interface CodexLoveDna {
  typeName?: string;
  typeSummary?: string;
  metrics?: CodexLoveDnaMetric[];
}

interface CodexLoveDnaProps {
  loveDna: CodexLoveDna;
  forceVisible?: boolean;
}

/** 지표 한 줄. 훅을 쓰므로 map 안에서 인라인으로 그리지 않고 컴포넌트로 뺀다. */
function CodexLoveDnaRow({ metric, index, forceVisible }: { metric: CodexLoveDnaMetric; index: number; forceVisible: boolean }) {
  const copy = useMasterLoveCodexCopy();
  const score = Math.max(0, Math.min(100, Math.round(Number(metric.score) || 0)));
  const entering = useCodexEnterOnce(forceVisible);
  const displayed = useCodexCountUp(score, { skip: forceVisible, delayMs: Math.min(index * 60, 360) });

  return (
    <CodexReveal
      as="li"
      index={index}
      forceVisible={forceVisible}
      className="border-b border-[color:var(--codex-rule)] py-6"
    >
      <div className="flex items-baseline justify-between gap-6">
        <span className="text-[1.0625rem] font-bold">{metric.label}</span>
        <span
          className={styles.numeral}
          style={{ fontSize: "clamp(1.75rem, 7vw, 2.75rem)", lineHeight: 1, color: "var(--codex-gold)" }}
        >
          {displayed}
        </span>
      </div>
      <div
        className={`${styles.metricTrack} mt-3`}
        role="img"
        aria-label={copy.metricAriaLabel(metric.label, score)}
      >
        {/* 폭은 항상 최종값 — 등장 스윕은 transform 이라 정지 상태가 곧 최종 상태다 */}
        <span
          className={styles.metricFill}
          style={{ width: `${score}%`, transform: entering ? "scaleX(0)" : "scaleX(1)" }}
        />
      </div>
      {metric.basis ? (
        <p className="mt-3 leading-7" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
          {metric.basis}
        </p>
      ) : null}
    </CodexReveal>
  );
}

export default function CodexLoveDnaPanel({ loveDna, forceVisible = false }: CodexLoveDnaProps) {
  const panelCopy = useMasterLoveCodexCopy();
  const metrics = Array.isArray(loveDna.metrics) ? loveDna.metrics : [];
  if (!metrics.length) return null;

  return (
    <section data-codex-pdf-page className={styles.section} aria-label={panelCopy.loveDnaAriaLabel}>
      <div className={styles.measure}>
        <CodexReveal forceVisible={forceVisible}>
          <p
            className={styles.numeral}
            style={{ fontSize: "0.75rem", letterSpacing: "0.28em", color: "var(--codex-gold-dim)" }}
          >
            LOVE DNA
          </p>
          {loveDna.typeSummary ? (
            <p className="mt-4 max-w-[46ch] text-[1.0625rem] leading-9">{loveDna.typeSummary}</p>
          ) : null}
          <hr className={`${styles.rule} mt-9`} />
        </CodexReveal>

        <ul className="mt-2">
          {metrics.map((metric, index) => (
            <CodexLoveDnaRow key={metric.key} metric={metric} index={index} forceVisible={forceVisible} />
          ))}
        </ul>
      </div>
    </section>
  );
}
