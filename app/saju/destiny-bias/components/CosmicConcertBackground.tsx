"use client";

import { motion } from "framer-motion";
import styles from "../destiny-bias.module.css";

interface CosmicConcertBackgroundProps {
  isLowSpec?: boolean;
  reduceMotion?: boolean;
}

export default function CosmicConcertBackground({ isLowSpec, reduceMotion }: CosmicConcertBackgroundProps) {
  return (
    <>
      {/* Base deep space gradient */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className={`absolute inset-0 ${styles.destinyBiasBg}`} />
        <div className={`absolute inset-0 ${styles.stageDots}`} />
      </div>

      {/* Concert beams */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className={`absolute inset-0 ${styles.concertBeamLeft}`} />
        <div className={`absolute inset-0 ${styles.concertBeamRight}`} />
        <div className={`absolute inset-0 ${styles.spotlight}`} />
      </div>

      {/* Aurora mist */}
      <div className={`pointer-events-none absolute inset-0 z-0 ${styles.auraMist}`} aria-hidden />

      {/* Stage floor glow */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 h-48"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(109,59,255,0.28) 0%, rgba(255,95,210,0.14) 50%, transparent 80%)",
          filter: "blur(2px)",
        }}
      />

      {/* Animated floating particles (skip for low-spec/reduced-motion) */}
      {!isLowSpec && !reduceMotion && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          {[
            { x: "15%", delay: 0, duration: 5.2, size: 3, color: "rgba(255,95,210,0.7)" },
            { x: "32%", delay: 1.1, duration: 6.8, size: 2, color: "rgba(64,200,255,0.65)" },
            { x: "55%", delay: 0.6, duration: 4.6, size: 4, color: "rgba(201,167,255,0.6)" },
            { x: "72%", delay: 1.8, duration: 7.1, size: 2, color: "rgba(128,255,231,0.55)" },
            { x: "88%", delay: 0.3, duration: 5.5, size: 3, color: "rgba(255,217,138,0.6)" },
          ].map((p, i) => (
            <motion.div
              key={i}
              className="absolute bottom-0 rounded-full"
              style={{
                left: p.x,
                width: p.size,
                height: p.size,
                background: p.color,
                filter: "blur(0.5px)",
              }}
              animate={{ y: [0, -320, -640], opacity: [0, 0.9, 0] }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
