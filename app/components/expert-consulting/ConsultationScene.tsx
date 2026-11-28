"use client";

import { useEffect, useRef, useState } from "react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import styles from "./ConsultationScene.module.css";

export default function ConsultationScene({ poster, clip, loop = false, priority = false }: {
  poster: string;
  clip: string;
  loop?: boolean;
  priority?: boolean;
}) {
  const gate = useSpritePlaybackGate<HTMLDivElement>({ rootMargin: "0px" });
  const video = useRef<HTMLVideoElement>(null);
  const [eligible, setEligible] = useState(false);
  const [startedClip, setStartedClip] = useState("");
  const [failedClip, setFailedClip] = useState("");

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: EventTarget & { saveData?: boolean; effectiveType?: string }
    }).connection;
    const update = () => setEligible(!connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType || ""));
    update();
    connection?.addEventListener("change", update);
    return () => connection?.removeEventListener("change", update);
  }, []);

  const allowed = eligible && !gate.prefersReducedMotion && failedClip !== clip;
  const active = allowed && gate.canAnimate;
  useEffect(() => {
    if (active) setStartedClip(clip);
  }, [active, clip]);

  const mounted = allowed && startedClip === clip;
  useEffect(() => {
    const element = video.current;
    if (!mounted || !element || !active || element.ended) return;
    let current = true;
    void element.play().catch(() => { if (current) setFailedClip(clip); });
    return () => { current = false; element.pause(); };
  }, [active, mounted, clip]);

  return <div ref={gate.ref} className={styles.scene} aria-hidden="true">
    <img src={poster} alt="" width="960" height="540" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" />
    {mounted && <video key={clip} ref={video} src={clip} muted playsInline loop={loop}
      preload="none" onPlaying={event => { event.currentTarget.dataset.playing = "true"; }}
      onError={() => setFailedClip(clip)} />}
  </div>;
}
