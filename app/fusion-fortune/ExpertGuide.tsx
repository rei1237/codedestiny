"use client";
import { useFusionSharedCopy, type FusionSystemKeyLabel } from "./_lib/copy";
import { useFusionExpertCopy } from "./ExpertEvidence";
import styles from "./fusion-fortune.module.css";

export function ExpertGuide({ mode = "guide", systems }: { mode?: "guide" | "value" | "usage"; systems?: readonly FusionSystemKeyLabel[] }) {
  const copy = useFusionExpertCopy();
  const shared = useFusionSharedCopy();
  if (mode === "usage") return <section className={styles.seoGuide} aria-label={copy.input}><h2>{copy.input}</h2><p>{copy.required}</p><p>{copy.price}</p><p>{copy.retry}</p></section>;
  return <section className={mode === "value" ? styles.valuePreview : styles.seoGuide} aria-label={copy.guide}>
    <h2>{mode === "value" ? copy.valueTitle : copy.guide}</h2>
    <p>{mode === "value" ? copy.valueIntro : copy.guideBody}</p>
    {systems && <ol className={styles.valueBlocks}>{systems.map((system) => <li key={system}><strong>{shared.systemLabels[system]}</strong></li>)}</ol>}
    {mode === "value" && <><p>{copy.benefits}</p><p>{copy.length}</p></>}
  </section>;
}
