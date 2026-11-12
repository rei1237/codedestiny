"use client";
import Image from "next/image";
import { useLazySpriteSource, useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import { fortuneTeaHouseAssets } from "../data/assets";
import styles from "../styles/tea-brewing.module.css";

/** A fixed-base atlas prevents the porcelain and character from changing between frames. */
export default function YeoniWaitingPortrait({ label, complete = false, paused = false }: { label: string; complete?: boolean; paused?: boolean }) {
  const gate = useSpritePlaybackGate<HTMLDivElement>();
  const sheet = useLazySpriteSource(fortuneTeaHouseAssets.teaAnimation.brewing, gate.canLoad && !gate.prefersReducedMotion && !complete && !paused);
  const animate = gate.canAnimate && sheet.isLoaded && !complete && !paused;
  return <div ref={gate.ref} className={styles.portrait} data-motion={animate ? "animated" : "still"} data-tea-action={complete ? "offering" : "brewing"} data-sprite-status={sheet.status} role="img" aria-label={label}>
    <Image className={styles.brewingStill} src={complete ? fortuneTeaHouseAssets.teaAnimation.handoff : fortuneTeaHouseAssets.teaAnimation.still} width={640} height={640} alt="" priority style={{ visibility: animate ? "hidden" : "visible" }} />
    {sheet.isLoaded && <span aria-hidden className={styles.brewingSprite} style={{ backgroundImage: `url("${sheet.resolvedSrc}")`, visibility: animate ? "visible" : "hidden", animationPlayState: animate ? "running" : "paused" }}/>}
  </div>;
}
