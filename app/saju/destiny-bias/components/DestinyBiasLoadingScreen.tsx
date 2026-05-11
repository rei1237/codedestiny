"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "../destiny-bias.module.css";

export default function DestinyBiasLoadingScreen({
  message,
  progress,
}: {
  message: string;
  progress: number;
}) {
  const reduceMotion = useReducedMotion();
  const percentage = Math.max(0, Math.min(100, Math.round(progress * 100)));

  return (
    <section className={`relative overflow-hidden rounded-[32px] p-5 md:p-7 ${styles.loadingConcertWrap}`} aria-live="polite">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className={styles.loadingSpotA} />
        <div className={styles.loadingSpotB} />
        <div className={styles.loadingSparkleField} />
      </div>

      <div className={`relative mx-auto w-full max-w-[560px] rounded-3xl border border-white/35 bg-white/10 p-5 shadow-[0_20px_60px_rgba(2,1,18,0.55)] backdrop-blur-2xl md:p-7 ${styles.loadingGlassCard}`}>
        <p className="text-center text-[17px] font-semibold leading-8 text-[#ffe8ff] md:text-[22px]">
          당신의 운명 속
          <br />
          최애를 만나는 순간
        </p>

        <div className="mx-auto mt-5 grid w-full max-w-[260px] grid-cols-3 overflow-hidden rounded-xl border border-white/45 bg-[#2d1658]/50 text-center text-3xl md:text-4xl">
          <span className="py-3 text-pink-200">♡</span>
          <span className="border-x border-white/25 py-3 text-amber-100">✶</span>
          <span className="py-3 text-pink-200">♡</span>
        </div>

        <motion.p
          key={message}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 text-center text-sm font-medium tracking-[0.02em] text-white/90 md:text-base"
        >
          {message}
        </motion.p>

        <div className="mt-5 rounded-full border border-white/30 bg-black/25 p-1.5">
          <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-300 via-pink-200 to-cyan-200"
              animate={{ width: `${percentage}%` }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 110, damping: 25 }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs tracking-[0.13em] text-white/75 md:text-sm">
          <span>DESTINY LOADING...</span>
          <span>{percentage}%</span>
        </div>
      </div>
    </section>
  );
}
