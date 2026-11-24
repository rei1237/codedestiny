"use client";

import { useSpritePlaybackGate, useLazySpriteSource } from "@/src/hooks/useSpritePlaybackGate";
import styles from "./YeoniTalkingPortrait.module.css";

export type YeoniAction = "welcome" | "speak" | "offer" | "listen";
const base = "/images/fortune-tea-house/hanbok-yeoni/";

export default function YeoniTalkingPortrait({ action, cue, paused, className = "" }: {
  action: YeoniAction;
  cue: string;
  paused: boolean;
  className?: string;
}) {
  const gate = useSpritePlaybackGate<HTMLSpanElement>();
  const eligible = gate.canAnimate && !paused;
  const sheet = useLazySpriteSource(base + action + ".webp", eligible);
  return <span ref={gate.ref} aria-hidden="true" data-yeoni-action={action} className={styles.portrait + " " + className}>
    <img className={styles.poster} src={base + "portrait.webp"} width={300} height={300} alt="" />
    {eligible && sheet.isLoaded && <span key={cue + action} className={styles.performance}
      style={{backgroundImage: "url(" + sheet.resolvedSrc + ")"}} />}
  </span>;
}
