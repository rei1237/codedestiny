"use client";

/**
 * 마무리 요약 카드 — 리포트가 끝났음을 상담사가 정리해 주듯 닫는다.
 *
 * 🔴 이 섹션은 `#master-love-codex-document` **안**에 있고 `data-codex-pdf-page` 를 단다.
 *    문서 div 밖에 두면 캡처 선택자에 걸리지 않아 PDF 에서 조용히 사라진다
 *    (CodexSeal 이 지금도 그 상태다 — 그쪽은 다음 화면으로 가는 CTA 라 의도된 것이다).
 * 🔴 애니메이션 값이 없다 — 캡처 시점과 무관하게 항상 같은 화면이다.
 */

import CodexReveal from "./CodexReveal";
import CodexReportStamp from "./CodexReportStamp";
import { codexAccessLabel } from "../data/premium";
import { masterLoveCodexBilling, type MasterLoveCodexMode } from "../constants";
import { useMasterLoveCodexCopy, useMasterLoveCodexLocale } from "../_lib/copy";
import styles from "../styles/codex.module.css";

interface CodexReportOutroProps {
  mode: MasterLoveCodexMode;
  accessType: string;
  chapterCount: number;
  totalCharCount: number;
  forceVisible?: boolean;
}

export default function CodexReportOutro({
  mode,
  accessType,
  chapterCount,
  totalCharCount,
  forceVisible = false,
}: CodexReportOutroProps) {
  const locale = useMasterLoveCodexLocale();
  const copy = useMasterLoveCodexCopy();
  const billing = masterLoveCodexBilling(mode, locale);

  return (
    <section data-codex-pdf-page className={styles.section} aria-label={copy.reportOutroAriaLabel}>
      <div className={`${styles.measure} text-center`}>
        <CodexReveal forceVisible={forceVisible}>
          <div className={`${styles.premiumCard} ${styles.premiumCardFeatured} items-center text-center`}>
            <CodexReportStamp mode={mode} accessType={accessType} />

            <p
              className={`${styles.numeral} mt-8`}
              style={{ fontSize: "clamp(1.25rem, 4.5vw, 1.625rem)", letterSpacing: "0.08em", color: "var(--codex-gold)" }}
            >
              Generated Successfully
            </p>
            <p className="mt-3" style={{ fontSize: "1.125rem", letterSpacing: "0.3em", color: "var(--codex-gold)" }}>
              <span aria-hidden="true">★★★★★</span>
              <span className="sr-only">{copy.generatedSuccessfullyAriaLabel}</span>
            </p>

            <hr className={`${styles.rule} ${styles.ruleShort} mt-8`} />

            <p
              className={`${styles.numeral} mt-8`}
              style={{ fontSize: "0.875rem", letterSpacing: "0.22em", color: "var(--codex-ink-text)" }}
            >
              MASTER LOVE CODEX
            </p>
            <p className={`${styles.numeral} mt-2`} style={{ fontSize: "var(--codex-caption)", color: "var(--codex-silver)" }}>
              {copy.reportOutroChapterLine(chapterCount, totalCharCount)}
            </p>

            <p className="mx-auto mt-8 max-w-[36ch] leading-8" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-silver)" }}>
              {copy.reportOutroAccessLine(billing.title, !codexAccessLabel(accessType).showPrice)} {copy.reportOutroClosingLine}
            </p>
          </div>
        </CodexReveal>
      </div>
    </section>
  );
}
