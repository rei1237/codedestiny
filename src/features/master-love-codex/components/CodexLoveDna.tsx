"use client";

/**
 * 연애 DNA — 10개 지표.
 *
 * 카드/박스를 쓰지 않는다. 지표는 잉크 위에 이름·숫자·가는 트랙만으로 놓이고,
 * 숫자는 Cinzel 라이닝 숫자 + tabular-nums 로 자리를 맞춘다(로드된 mono 웹폰트가 없다).
 */

import CodexReveal from "./CodexReveal";
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

export default function CodexLoveDnaPanel({ loveDna, forceVisible = false }: CodexLoveDnaProps) {
  const metrics = Array.isArray(loveDna.metrics) ? loveDna.metrics : [];
  if (!metrics.length) return null;

  return (
    <section data-codex-pdf-page className={styles.section} aria-label="연애 DNA">
      <div className={styles.measure}>
        <CodexReveal forceVisible={forceVisible}>
          <p
            className={styles.numeral}
            style={{ fontSize: "0.75rem", letterSpacing: "0.28em", color: "var(--codex-gold-dim)" }}
          >
            LOVE DNA
          </p>
          {loveDna.typeName ? (
            <h2 className={`${styles.actTitle} mt-4`} style={{ color: "var(--codex-gold)" }}>
              {loveDna.typeName}
            </h2>
          ) : null}
          {loveDna.typeSummary ? (
            <p className="mt-4 max-w-[46ch] text-[1.0625rem] leading-9">{loveDna.typeSummary}</p>
          ) : null}
          <hr className={`${styles.rule} mt-9`} />
        </CodexReveal>

        <ul className="mt-2">
          {metrics.map((metric, index) => {
            const score = Math.max(0, Math.min(100, Math.round(Number(metric.score) || 0)));
            return (
              <CodexReveal
                key={metric.key}
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
                    {score}
                  </span>
                </div>
                <div
                  className="mt-3 h-px w-full"
                  style={{ background: "rgba(232,213,163,.14)" }}
                  role="img"
                  aria-label={`${metric.label} ${score}점 (100점 만점)`}
                >
                  <div
                    className="h-px"
                    style={{
                      width: `${score}%`,
                      background: "var(--codex-gold)",
                      boxShadow: "0 0 12px 0 rgba(232,213,163,.55)",
                    }}
                  />
                </div>
                {metric.basis ? (
                  <p className="mt-3 text-[0.875rem] leading-7" style={{ color: "var(--codex-ink-text-muted)" }}>
                    {metric.basis}
                  </p>
                ) : null}
              </CodexReveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
