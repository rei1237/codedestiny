"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import styles from "./ConsultationScene.module.css";

const preferenceKey = "cd:consultation-motion";

export default function ConsultationScene({ poster, clip, loop = false }: {
  poster: string;
  clip: string;
  loop?: boolean;
}) {
  const gate = useSpritePlaybackGate<HTMLDivElement>({ rootMargin: "0px" });
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    try { setPaused(sessionStorage.getItem(preferenceKey) === "off"); } catch {}
    setEligible(!connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType || ""));
  }, []);

  const available = eligible && !gate.prefersReducedMotion && !failed;
  const active = available && !paused && gate.canAnimate;
  useEffect(() => {
    const element = video.current;
    if (!element || !active) return;
    let current = true;
    void element.play().catch(() => { if (current) setFailed(true); });
    return () => { current = false; element.pause(); };
  }, [active, clip]);

  function toggle() {
    setPaused(!paused);
    try { sessionStorage.setItem(preferenceKey, paused ? "on" : "off"); } catch {}
  }

  return <div ref={gate.ref} className={styles.scene}>
    <img src={poster} alt="" width="960" height="540" decoding="async"/>
    {active && <video ref={video} src={clip} muted playsInline loop={loop} preload="none" aria-hidden="true"
      data-playing={playing} onPlaying={() => setPlaying(true)} onError={() => setFailed(true)}/>}
    {available && <button type="button" onClick={toggle} aria-pressed={paused} aria-label="영상 연출 줄이기">
      {paused ? <Play size={15} aria-hidden/> : <Pause size={15} aria-hidden/>}
      {paused ? "영상 켜기" : "영상 끄기"}
    </button>}
  </div>;
}
