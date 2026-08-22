"use client";

/**
 * "왜 일반 운세가 아닌가" — 가격을 본 직후 그 근거를 읽게 한다.
 *
 * 문구는 data/premium.ts 가 정본이다. 여기에 문장을 직접 쓰지 않는다.
 */

import CodexReveal from "./CodexReveal";
import { CODEX_WHY_PREMIUM } from "../data/premium";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import styles from "../styles/codex.module.css";

export default function CodexWhyPremium() {
  const copy = useMasterLoveCodexCopy();
  return (
    <section className={styles.section} aria-label={copy.whyPremiumAriaLabel}>
      <div className={styles.measure}>
        <CodexReveal>
          <p
            className={`${styles.numeral} text-[0.6875rem]`}
            style={{ letterSpacing: "0.28em", color: "var(--codex-gold-dim)" }}
          >
            WHY PREMIUM
          </p>
          <h2 className={`${styles.actTitle} mt-4`}>{copy.whyPremiumTitle}</h2>
          <hr className={`${styles.rule} mt-9`} />
        </CodexReveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {CODEX_WHY_PREMIUM.map((item, index) => (
            <CodexReveal key={item.label} as="article" index={index} className={styles.premiumCard}>
              <p
                className={`${styles.numeral} text-[0.6875rem]`}
                style={{ letterSpacing: "0.22em", color: "var(--codex-gold-dim)" }}
              >
                {item.label}
              </p>
              <h3
                className="mt-4 font-bold leading-8"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.125rem", color: "var(--codex-gold)" }}
              >
                {item.title}
              </h3>
              <p
                className="mt-3.5 leading-8"
                style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text)" }}
              >
                {item.body}
              </p>
            </CodexReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
