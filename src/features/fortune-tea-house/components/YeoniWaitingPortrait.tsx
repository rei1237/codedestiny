"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, type CSSProperties } from "react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import { fortuneTeaHouseAssets } from "../data/assets";
import styles from "../styles/tea-brewing.module.css";

/** Brewing loops; the completed, server-delivered result gets one tea offering. */
export default function YeoniWaitingPortrait({ label, complete = false }: { label: string; complete?: boolean }) {
  const gate = useSpritePlaybackGate<HTMLDivElement>();
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFrame(0); setLoaded(false); setFailed(false); }, [complete]);
  useEffect(() => {
    if (!gate.canAnimate || !loaded || (complete && frame === 7)) return;
    const timer = window.setTimeout(() => setFrame(value => complete ? Math.min(7, value + 1) : (value + 1) % 8), complete ? 300 : 520);
    return () => window.clearTimeout(timer);
  }, [frame, complete, gate.canAnimate, loaded]);
  const shownFrame = gate.prefersReducedMotion ? (complete ? 7 : 0) : frame;
  return <div ref={gate.ref} className={styles.portrait} data-motion={gate.canAnimate ? "idle" : "still"} data-tea-action={complete ? "offering" : "brewing"} data-frame={shownFrame} role="img" aria-label={label}>
    {failed ? <img className={styles.fallbackPortrait} src={fortuneTeaHouseAssets.yeoni.transparent.cupPose} alt="" /> :
      <span className={styles.portraitCrop} style={{ "--frame-column": shownFrame % 4, "--frame-row": Math.floor(shownFrame / 4) } as CSSProperties}>
        {gate.canLoad && <img key={String(complete)} className={styles.portraitSheet}
          src={complete ? fortuneTeaHouseAssets.teaAnimation.handoff : fortuneTeaHouseAssets.teaAnimation.brewing}
          alt="" decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
      </span>}
  </div>;
}
