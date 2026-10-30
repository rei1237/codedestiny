"use client";
import { useFusionSharedCopy, type FusionSystemKeyLabel } from "./_lib/copy";
import { useFusionExpertCopy } from "./ExpertEvidence";
import styles from "./fusion-fortune.module.css";

export function ExpertGuide({ mode = "guide", systems, paymentNotice }: { paymentNotice?: string; mode?: "guide" | "value" | "usage"; systems?: readonly FusionSystemKeyLabel[] }) {
  const copy = useFusionExpertCopy();
  const shared = useFusionSharedCopy();
  if (mode === "usage") return <section className={styles.seoGuide} aria-label={copy.input}><h2>{copy.input}</h2><p>{copy.required}</p><p>{paymentNotice ?? copy.price}</p><p>{copy.retry}</p></section>;
  if (mode === "value") return <section className={styles.valuePreview} aria-label={copy.guide}>
    {/* 맨 h2·p 로 두면 제목이 본문 크기로, 문단·목록이 간격 없이 붙어 한 덩어리로 보였다. */}
    <h2 className={styles.valueHeading}>{copy.valueTitle}</h2>
    <p className={styles.valueLead}>{copy.valueIntro}</p>
    {systems && <ol className={styles.valueBlocks}>{systems.map((system) => <li key={system}><strong>{shared.systemLabels[system]}</strong></li>)}</ol>}
    <p className={styles.valueLead}>{copy.benefits}</p>
    <p className={styles.valueNote}>{copy.length}</p>
  </section>;
  return <section className={styles.seoGuide} aria-label={copy.guide}>
    <h2>{copy.guide}</h2>
    <p>{copy.guideBody}</p>
    {systems && <ol className={styles.valueBlocks}>{systems.map((system) => <li key={system}><strong>{shared.systemLabels[system]}</strong></li>)}</ol>}
  </section>;
}
