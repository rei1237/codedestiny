"use client";

import { useCompassReport } from "../_hooks/useCompassReport";
import { useDestinyCompassCopy } from "../_lib/copy";
import styles from "./saved-report.module.css";

/** Saved paid text is readable without rerunning the free chart or restoring birth input. */
export function SavedCompassReport({ reportId }: { reportId: string }) {
  const copy = useDestinyCompassCopy();
  const report = useCompassReport(null, null, "", undefined, reportId);
  const sections = Object.values(report.sections).filter(Boolean).sort((a, b) => a!.order - b!.order);
  return <main className={styles.page}>
    <h1>{copy.deepReportGateReason}</h1>
    <p role="status" aria-live="polite">{sections.length} / 10</p>
    {report.error && <p role="alert">{report.error}</p>}
    {report.canRetryWaveB && <button type="button" onClick={report.retryWaveB}>{copy.retrySynthesisButton}</button>}
    <details className={styles.outline}><summary>{copy.deepReportGateReason}</summary>
    <nav aria-label={copy.deepReportGateReason} className={styles.contents}>
      {sections.map(section => <a key={section!.key} href={`#saved-${section!.key}`}>{section!.title}</a>)}
    </nav></details>
    {sections.map(section => <section key={section!.key} id={`saved-${section!.key}`} className={styles.chapter} data-saved-compass-chapter>
      <h2>{section!.title}</h2>
      <div className={styles.body}>{section!.body}</div>
    </section>)}
  </main>;
}
