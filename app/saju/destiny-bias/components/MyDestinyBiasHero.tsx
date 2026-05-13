"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "../destiny-bias.module.css";

export default function MyDestinyBiasHero({ subtitle }: { subtitle?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[28px] p-5 md:p-7"
      style={{
        background: "radial-gradient(ellipse at 10% 10%, rgba(255,95,210,0.14) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(64,200,255,0.1) 0%, transparent 50%), rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 24px 70px rgba(3,2,14,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
    >
      <div className={styles.heroArtworkLayer} aria-hidden />

      {/* Pink glow blob */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-pink-300/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-20 top-8 h-52 w-52 rounded-full bg-cyan-300/18 blur-3xl" aria-hidden />

      <div className="relative z-10">
        <div className={`${styles.entryPassLabel} mb-2`}>✦ COSMIC FANLIGHT STAGE ✦</div>

        <h1 className="text-3xl font-black leading-tight tracking-[-0.02em] text-white drop-shadow-[0_0_20px_rgba(255,95,210,0.45)] md:text-4xl">
          MY DESTINY BIAS
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-7 text-white/80 md:text-base">
          우주 한가운데 펼쳐진 프라이빗 콘서트장에서,{" "}
          <span className="font-semibold text-fuchsia-200/90">당신의 사주 에너지</span>가{" "}
          <span className="font-semibold text-cyan-200/90">최애의 무대 아우라</span>와 연결됩니다.
        </p>

        {subtitle ? (
          <p className="mt-3 text-sm font-semibold text-cyan-100/85">{subtitle}</p>
        ) : null}
      </div>

      {/* Aurora bottom glow */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
        aria-hidden
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,95,210,0.5) 30%, rgba(64,200,255,0.5) 70%, transparent)",
        }}
      />
    </motion.section>
  );
}

