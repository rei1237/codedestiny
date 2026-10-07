"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FUSION_ORBS, FUSION_CORE_ORB } from "./fusionOrbs";
import { tintVars, type FusionStageKey, type FusionStageState, type Result } from "./fusion-thread";
import { useFusionSharedCopy } from "./_lib/copy";
import { useFusionPremiumCopy } from "./_lib/premium-copy";
import styles from "./fusion-fortune.module.css";

/** Presentation only: progress comes from received events and saved content, never elapsed time. */
export function FusionConvergence({ stageStates, result, loading, composeProgress }: {
  stageStates: Record<FusionStageKey, FusionStageState>;
  result: Result | null;
  loading: boolean;
  composeProgress: { completed: number; total: number; label: string; phase: string } | null;
}) {
  const copy = useFusionPremiumCopy();
  const shared = useFusionSharedCopy();
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [motion, setMotion] = useState(true);
  useEffect(() => {
    let intersecting = false;
    const sync = () => setVisible(intersecting && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; sync(); });
    if (ref.current) observer.observe(ref.current);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);
  const systems = FUSION_ORBS.map((orb) => {
    const section = result?.[`${orb.key}Section`];
    const available = Boolean(section?.content?.trim());
    const state = available || stageStates[orb.key] === "completed" ? "completed" : stageStates[orb.key];
    return { ...orb, available, state };
  });
  const completed = systems.filter((item) => item.state === "completed").length;
  const firstAvailable = systems.find((item) => item.available);
  const complete = Boolean(result?.finalVerdict && result.expertMeta?.complete !== false);
  const composing = loading && stageStates.fusion === "active";
  return <section ref={ref} data-fusion-convergence="true" className={styles.convergence} aria-labelledby="fusion-convergence-heading" data-motion={loading && visible && motion ? "running" : "paused"}>
    <div className={styles.convergenceHeading}>
      <div>
        <h3 id="fusion-convergence-heading" className={styles.readingTitle}>{copy.heading}</h3>
        <p>{copy.description}</p>
      </div>
      <button type="button" aria-pressed={!motion} onClick={() => setMotion((value) => !value)}>{motion ? copy.pause : copy.resume}</button>
    </div>
    <div className={styles.convergenceScene}>
      <svg aria-hidden="true" className={styles.convergencePaths} viewBox="0 0 600 240" preserveAspectRatio="none">
        {systems.map((item, index) => {
          const left = index < 3;
          const y = 40 + (index % 3) * 80;
          return <path key={item.key} data-state={item.state} style={tintVars(item.key)} d={`M ${left ? 115 : 485} ${y} C ${left ? 230 : 370} ${y}, ${left ? 235 : 365} 120, 300 120`} />;
        })}
      </svg>
      <ol className={styles.convergenceSystems}>
        {systems.map((item, index) => <li key={item.key} data-state={item.state} style={{ ...tintVars(item.key), gridColumn: index < 3 ? 1 : 3, gridRow: index % 3 + 1 }}>
          <span className={styles.convergenceOrb} aria-hidden="true">
            {item.image ? <Image src={item.image} alt="" width={64} height={64} /> : <svg viewBox="0 0 48 48"><rect x="12" y="7" width="24" height="34" rx="3" /><path d="m24 16 6 8-6 8-6-8Z" /></svg>}
          </span>
          <span><strong>{shared.systemLabels[item.key]}</strong><small>{item.state === "completed" ? copy.completed : !loading ? copy.paused : item.state === "active" ? copy.active : copy.pending}</small></span>
        </li>)}
      </ol>
      <div className={styles.convergenceCore} data-composing={composing}>
        <Image src={FUSION_CORE_ORB} alt="" width={144} height={144} />
        <strong>{copy.center}</strong>
        <span>{complete ? copy.ready : composing ? copy.composing : `${completed} / 6`}</span>
      </div>
    </div>
    <div className={styles.convergenceFooter}>
      <p role="status">{copy.count} <strong>{completed} / 6</strong>{composeProgress && <> · {composeProgress.phase === "repair" ? copy.repair : copy.progress} {composeProgress.completed} / {composeProgress.total}{composeProgress.label ? ` · ${composeProgress.label}` : ""}</>}</p>
      {firstAvailable && <a href={`#fusion-toc-${firstAvailable.key}Section`}>{copy.read}<span aria-hidden="true"> →</span></a>}
    </div>
  </section>;
}
