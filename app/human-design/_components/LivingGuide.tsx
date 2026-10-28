"use client";
import { useMemo, useState } from "react";
import { buildGuide, type GuideInput, type GuideSection } from "../_copy/living-guide";
import type { Locale } from "../_copy";
import styles from "../human-design.module.css";

export function GuideParagraphs({ section, ui }: {section: GuideSection; ui: Record<string,string>}) {
  return <dl className={styles.guideText}>
    {[[ui.everyday, section.example], [ui.caution, section.caution], [ui.action, section.action]].map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}
  </dl>;
}

/** Explicit whitelist: birthInput, gates, centers and chart activations never enter a share. */
export function manualShareContent(guide: NonNullable<ReturnType<typeof buildGuide>>) {
  return {title:guide.ui.title, nickname:guide.nickname, type:guide.typeName, profile:guide.profile, decision:guide.decision, question:guide.ui.shareQuestion};
}

export default function LivingGuide({chart, locale}: {chart: GuideInput; locale: Locale}) {
  const guide = useMemo(() => buildGuide(chart, locale), [chart, locale]);
  const [format, setFormat] = useState<"feed" | "story">("feed");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  if (!guide) return null;
  const ui = guide.ui;
  async function exportImage(share: boolean) {
    if (!guide || busy) return;
    setBusy(true); setStatus("");
    try {
      const { createManualImage, deliverManualImage } = await import("../_lib/manual-share");
      const blob = await createManualImage(manualShareContent(guide), format);
      const result = await deliverManualImage(blob, share, guide.ui.title, format);
      if (result !== "cancelled") setStatus(result === "shared" ? guide.ui.shared : guide.ui.saved);
    } catch { setStatus(ui.failed); }
    finally { setBusy(false); }
  }
  return <section className={styles.manual} aria-labelledby="hd-manual-title">
    <p className={styles.corePanelTitle}>{ui.title}</p>
    <h2 className={styles.manualTitle} id="hd-manual-title">{guide.nickname}</h2>
    <p className={styles.manualMeta}>{guide.typeName} · {guide.profile}</p>
    <p className={styles.manualDecision}>{guide.decision}</p>
    <p className={styles.blockBody}>{guide.type.example}</p>
    <div className={styles.manualFormats} role="group" aria-label={ui.save}>
      {(["feed", "story"] as const).map(f => <button type="button" key={f} aria-pressed={format === f} onClick={() => setFormat(f)}>{ui[f]} {f === "feed" ? "4:5" : "9:16"}</button>)}
    </div>
    <div className={styles.manualActions}>
      <button type="button" onClick={() => void exportImage(true)} disabled={busy}>{ui.share}</button>
      <button type="button" onClick={() => void exportImage(false)} disabled={busy}>{ui.save}</button>
    </div>
    <p className={styles.guideNote}>{ui.privacy}</p>
    <p role="status" aria-live="polite" className={styles.guideNote}>{status}</p>
  </section>;
}
