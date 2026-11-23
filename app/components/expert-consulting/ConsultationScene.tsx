"use client";

import { useEffect, useRef, useState } from "react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import styles from "./ConsultationScene.module.css";

export default function ConsultationScene({ poster, clip, loop = false }: {
  poster: string;
  clip: string;
  loop?: boolean;
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
    {mounted
      ? <video key={clip} ref={video} src={clip} poster={poster} muted playsInline loop={loop}
          preload="none" onError={() => setFailedClip(clip)} />
      : <img src={poster} alt="" width="960" height="540" loading="lazy" decoding="async" />}
  </div>;
}
