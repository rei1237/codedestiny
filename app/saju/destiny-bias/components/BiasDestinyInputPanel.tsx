"use client";

import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import styles from "../destiny-bias.module.css";

type Props = {
  stepLabel: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function BiasDestinyInputPanel({ stepLabel, title, description, children }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <m.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[28px] border border-white/20 bg-[linear-gradient(140deg,rgba(7,4,22,0.88),rgba(26,11,63,0.66))] p-5 shadow-[0_0_46px_rgba(109,59,255,0.2)] backdrop-blur-xl md:p-7"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(circle at 14% 10%, rgba(255,217,138,0.2), transparent 36%), radial-gradient(circle at 84% 12%, rgba(201,167,255,0.26), transparent 42%), radial-gradient(circle at 52% 100%, rgba(255,95,210,0.16), transparent 42%)",
        }}
      />
      <div className={styles.panelRigBar} aria-hidden />
      <div className={styles.panelRigWash} aria-hidden />

      <div className="relative z-10">
        <div className="mb-4 flex items-center gap-3">
          <span className={`${styles.rigLamp} ${styles.rigLampPink}`} aria-hidden />
          <span className={`${styles.rigLamp} ${styles.rigLampGold}`} aria-hidden />
          <span className={`${styles.rigLamp} ${styles.rigLampBlue}`} aria-hidden />
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--bias-gold)]/90">{stepLabel}</p>
        </div>

        <h2 className="text-2xl font-black leading-tight text-white drop-shadow-[0_0_22px_rgba(255,217,138,0.32)] md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-white/82 md:text-base">{description}</p>

        <m.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.32, ease: "easeOut" }}
          className="mt-5 rounded-2xl border border-white/14 bg-black/25 p-4 ring-1 ring-white/10 md:p-5"
        >
          {children}
        </m.div>
      </div>
    </m.section>
  );
}
