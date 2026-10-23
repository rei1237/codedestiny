"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import styles from "./NeoTalkingPortrait.module.css";

const SPEECH_FRAMES = [0, 1, 2, 1, 0, 2, 1, 0] as const;

/** One decoded texture stays mounted; dialogue changes only move its crop. */
export default function NeoTalkingPortrait({ talking }: { talking: boolean }) {
  const gate = useSpritePlaybackGate<HTMLSpanElement>();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  // next/image already decodes before onLoad; keep its error ref stable per tick.
  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setFailed(true), []);

  useEffect(() => {
    if (!gate.canAnimate || !loaded || failed) return;
    const timer = window.setInterval(() => setTick(value => (value + 1) % 32), 150);
    return () => window.clearInterval(timer);
  }, [gate.canAnimate, loaded, failed]);

  const frame = !gate.canAnimate ? 0 : tick === 30 ? 3 : talking ? SPEECH_FRAMES[tick % SPEECH_FRAMES.length] : 0;
  const position = { "--neo-talk-x": `${(frame % 2) * -50}%`, "--neo-talk-y": `${Math.floor(frame / 2) * -50}%` } as CSSProperties;

  return <span ref={gate.ref} className={styles.portrait} data-neo-talk-frame={frame} data-ready={loaded && !failed} style={position} aria-hidden="true">
    {(!loaded || failed) && <Image src="/neo-operation-room/sprites/transparent/neo-transparent-s1-f01.webp" alt="" fill unoptimized sizes="(max-width: 768px) 76vw, 600px" className={styles.fallback} />}
    {!failed && <picture>
      <source media="(max-width: 768px)" srcSet="/neo-operation-room/sprites/neo-talk-v1-768.webp" />
      <Image src="/neo-operation-room/sprites/neo-talk-v1-1280.webp" alt="" width={1280} height={1280} unoptimized loading="eager" className={styles.sheet}
        onLoad={handleLoad}
        onError={handleError} />
    </picture>}
  </span>;
}
