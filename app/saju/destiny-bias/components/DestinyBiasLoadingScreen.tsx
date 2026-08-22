"use client";

import { m, useReducedMotion } from "framer-motion";
import styles from "../destiny-bias.module.css";
import DestinyIcon from "@/app/components/icons/DestinyIcon";
import { useDestinyBiasCopy } from "../_lib/copy";

export default function DestinyBiasLoadingScreen({
  message,
  progress,
}: {
  message: string;
  progress: number;
}) {
  const copy = useDestinyBiasCopy();
  const reduceMotion = useReducedMotion();
  const percentage = Math.max(0, Math.min(100, Math.round(progress * 100)));
  const activeDots = Math.max(1, Math.min(5, Math.ceil((percentage / 100) * 5)));

  return (
    <section
      className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden rounded-[32px] px-5 py-10"
      aria-live="polite"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(109,59,255,0.22) 0%, transparent 60%), linear-gradient(180deg, rgba(21,10,54,0.9), rgba(7,4,22,0.95))",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Spotlight beams */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className={styles.spotCone} />
        <div className={styles.loadingSpotA} />
        <div className={styles.loadingSpotB} />
        <div className={styles.loadingSparkleField} />
      </div>

      {/* Stage floor glow */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(109,59,255,0.3) 0%, transparent 80%)",
          filter: "blur(2px)",
        }}
      />

      <p className="relative z-10 text-[10px] font-semibold tracking-[0.22em] text-[var(--bias-gold)]/85">
        COSMIC CONCERT LINKING
      </p>
      <p className="relative z-10 mt-1 text-center text-lg font-extrabold leading-snug text-white/95 md:text-xl">
        {copy.loadingSyncLine1 ?? "The stage is opening"}<br />{copy.loadingSyncLine2 ?? "and the two rhythms are syncing ✨"}
      </p>

      {/* Aurora rings */}
      <div className="relative z-10 mt-6 mb-6 h-44 w-44">
        {/* Outer ring */}
        <m.div
          className="absolute inset-0 rounded-full"
          style={{ border: "1.5px solid rgba(255,95,210,0.5)" }}
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 10, ease: "linear", repeat: Infinity }}
        />
        {/* Middle ring */}
        <m.div
          className="absolute inset-4 rounded-full"
          style={{ border: "1.5px solid rgba(64,200,255,0.45)" }}
          animate={reduceMotion ? undefined : { rotate: -360 }}
          transition={{ duration: 7.5, ease: "linear", repeat: Infinity }}
        />
        {/* Inner ring */}
        <m.div
          className="absolute inset-8 rounded-full"
          style={{ border: "1.5px solid rgba(201,167,255,0.5)" }}
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 5.5, ease: "linear", repeat: Infinity }}
        />
        {/* Center glow */}
        <m.div
          className="absolute inset-0 grid place-items-center"
          animate={reduceMotion ? undefined : { opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255,95,210,0.25) 0%, rgba(109,59,255,0.15) 60%, transparent 100%)",
              boxShadow: "0 0 24px rgba(255,95,210,0.4), 0 0 48px rgba(64,200,255,0.2)",
            }}
          >
            <DestinyIcon name="lightstick" size={34} className="text-pink-100" variant="glow" />
          </div>
        </m.div>
      </div>

      {/* Message */}
      <m.p
        key={message}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        className="relative z-10 text-center text-sm font-semibold tracking-[0.02em] text-white/90 md:text-base"
      >
        {message}
      </m.p>

      {/* Fanlight dots */}
      <div className="relative z-10 mt-4 flex items-center gap-2.5">
        {Array.from({ length: 5 }).map((_, index) => {
          const isActive = index === activeDots - 1;
          const isDone = index < activeDots - 1;
          return (
            <m.span
              key={index}
              className="h-2.5 w-2.5 rounded-full"
              animate={
                isActive && !reduceMotion
                  ? { scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }
                  : {}
              }
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background: isDone
                  ? "#40C8FF"
                  : isActive
                  ? "#FF5FD2"
                  : "rgba(255,255,255,0.2)",
                boxShadow: isActive
                  ? "0 0 10px rgba(255,95,210,0.8)"
                  : isDone
                  ? "0 0 8px rgba(64,200,255,0.6)"
                  : "none",
              }}
            />
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="relative z-10 mt-5 w-full max-w-xs rounded-full border border-white/20 bg-black/25 p-1">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <m.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #FF5FD2 0%, #8B5CFF 50%, #40C8FF 100%)",
            }}
            animate={{ width: `${percentage}%` }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 100, damping: 22 }}
          />
        </div>
      </div>
      <p className="relative z-10 mt-2 text-[11px] tracking-[0.14em] text-white/60">
        FANLIGHT SYNC — {percentage}%
      </p>
    </section>
  );
}

