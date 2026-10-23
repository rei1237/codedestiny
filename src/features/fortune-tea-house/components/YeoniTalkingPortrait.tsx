"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import styles from "./YeoniTalkingPortrait.module.css";

const SPEECH_FRAMES = [0, 1, 1, 0, 1, 0, 0, 1] as const;

/** Keep the body still; only the mouth and eyelids reveal another sheet cell. */
export default function YeoniTalkingPortrait({ talking = false, speechKey, className = "" }: {
  talking?: boolean;
  speechKey?: string;
  className?: string;
}) {
  const gate = useSpritePlaybackGate<HTMLSpanElement>();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const [greeting, setGreeting] = useState(false);

  useEffect(() => {
    if (speechKey === undefined || !loaded) return;
    setGreeting(true);
    const timer = window.setTimeout(() => setGreeting(false), 2400);
    return () => window.clearTimeout(timer);
  }, [speechKey, loaded]);

  useEffect(() => {
    if (!gate.canAnimate || !loaded || failed) return;
    const timer = window.setInterval(() => setTick(value => (value + 1) % 32), 150);
    return () => window.clearInterval(timer);
  }, [gate.canAnimate, loaded, failed]);

  const blink = gate.canAnimate && tick === 30;
  const frame = !gate.canAnimate ? 0 : blink ? 3 : talking || greeting ? SPEECH_FRAMES[tick % SPEECH_FRAMES.length] : 0;
  const position = { "--yeoni-talk-x": `${(frame % 2) * -50}%`, "--yeoni-talk-y": `${Math.floor(frame / 2) * -50}%` } as CSSProperties;
  const sheet = (animated: boolean) => <picture>
    <source media="(max-width: 768px)" srcSet="/images/fortune-tea-house/yeoni-talk-v1-768.webp" />
    <Image src="/images/fortune-tea-house/yeoni-talk-v1-1280.webp" width={1280} height={1280} alt="" unoptimized loading="eager"
      className={`${styles.sheet} ${animated ? styles.expression : ""}`}
      onLoad={animated ? undefined : async event => { try { await event.currentTarget.decode(); setLoaded(true); } catch { setFailed(true); } }}
      onError={() => setFailed(true)} />
  </picture>;

  return <span ref={gate.ref} className={`${styles.portrait} ${className}`} data-yeoni-talk-frame={frame} data-ready={loaded && !failed} data-blink={blink} style={position} aria-hidden="true">
    {(!loaded || failed) && <Image src="/images/fortune-tea-house/renewal/human-smile.webp" alt="" fill unoptimized sizes="(max-width: 768px) 80vw, 480px" className={styles.fallback} />}
    {!failed && <>{sheet(false)}<span className={styles.face}>{sheet(true)}</span></>}
  </span>;
}
