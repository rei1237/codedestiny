"use client";

import { motion, useReducedMotion } from "framer-motion";
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
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={styles.inputPanel}
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-cyan-100/85">{stepLabel}</p>
      <h2 className="mt-2 text-2xl font-black leading-tight text-white">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-white/82 md:text-base">{description}</p>
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}
