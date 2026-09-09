"use client";

import CodexReveal from "./CodexReveal";
import type { CodexLoveDna } from "./CodexLoveDna";
import type { CodexActMode } from "../data/acts";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import styles from "../styles/codex.module.css";

interface CodexScoreOverviewProps {
  loveDna: CodexLoveDna;
  mode: CodexActMode;
  forceVisible?: boolean;
}

/** Opposite traits (e.g. care and jealousy) cannot be averaged into a match grade.
 * Preserve individual stored metrics, and summarize the actual reading instead.
 * Keep the existing component boundary and PDF page contract for saved reports.
 */
export default function CodexScoreOverview({ loveDna, forceVisible = false }: CodexScoreOverviewProps) {
  const copy = useMasterLoveCodexCopy();
  if (!loveDna.typeName && !loveDna.typeSummary) return null;
  return (
    <section data-codex-pdf-page data-codex-summary className={styles.section} aria-label={copy.readerSummaryTitle}>
      <div className={styles.measure}>
        <CodexReveal forceVisible={forceVisible}>
          <h2 className={styles.chapterTitle}>{copy.readerSummaryTitle}</h2>
          {loveDna.typeName ? <p className={styles.keySentence}>{loveDna.typeName}</p> : null}
          {loveDna.typeSummary ? <p className={styles.insight}>{loveDna.typeSummary}</p> : null}
          <p className={styles.bridge}>{copy.readerMetricsNote}</p>
        </CodexReveal>
      </div>
    </section>
  );
}
