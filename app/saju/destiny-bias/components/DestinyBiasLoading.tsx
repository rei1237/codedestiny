"use client";

import { motion } from "framer-motion";
import styles from "../destiny-bias.module.css";

export default function DestinyBiasLoading({
  currentMessage,
  progress,
}: {
  currentMessage: string;
  progress: number;
}) {
  const segmentCount = 5;
  const activeSegments = Math.max(1, Math.min(segmentCount, Math.ceil(progress * segmentCount)));

  return (
    <section className={`relative overflow-hidden rounded-3xl p-5 md:p-7 ${styles.glass}`} aria-live="polite">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-5 top-5 text-xs font-semibold tracking-[0.15em] text-cyan-200/90">DESTINY LOADING...</div>
        <div className="absolute right-4 top-3 text-2xl">💖</div>
      </div>

      <div className="relative mt-8 grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <motion.p
            key={currentMessage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className="text-base font-semibold leading-7 text-white md:text-lg"
          >
            {currentMessage}
          </motion.p>

          <div className="mt-4 grid grid-cols-5 gap-2" aria-hidden>
            {Array.from({ length: segmentCount }).map((_, index) => {
              const active = index < activeSegments;
              return (
                <span
                  key={index}
                  className={`relative h-2 rounded-full border border-white/20 ${styles.loadingSegment} ${
                    active ? "bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-300" : "bg-white/10"
                  }`}
                />
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-3 text-sm text-white/80">
            <span>⭐</span>
            <span>팬덤 공명 파형 정렬 중</span>
            <span>🎤</span>
          </div>
        </div>

        <div className="relative mx-auto h-52 w-44 md:h-60 md:w-48">
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, -1.5, 1.2, 0] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
            className="absolute inset-0 rounded-3xl border border-white/30 bg-gradient-to-br from-fuchsia-400/50 via-violet-500/35 to-cyan-400/45 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.4)]"
          >
            <div className="h-full rounded-2xl border border-white/25 bg-black/25 p-3 backdrop-blur-md">
              <p className="text-[11px] font-bold tracking-[0.12em] text-white/80">MY DESTINY BIAS</p>
              <p className="mt-3 text-sm font-bold text-white">운명 포토카드 생성 중</p>
              <p className="mt-2 text-xs leading-5 text-white/80">라이트스틱 응원 에너지와 별빛 시그널을 조합하고 있어요.</p>
              <div className="mt-3 text-lg">🦁🐷✨</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
