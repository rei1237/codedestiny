"use client";

import { motion } from "framer-motion";

interface Props {
  title: string;
  subtitle: string;
}

export default function FlipCardReveal({ title, subtitle }: Props) {
  return (
    <motion.div
      initial={{ rotateY: 180, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="mx-auto w-full max-w-sm rounded-2xl border border-[#fff2b2] bg-gradient-to-br from-[#ffe8a3] to-[#ffc5a6] p-5 text-center shadow-lg"
      style={{ transformStyle: "preserve-3d" }}
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8d5a2f]">Hologram Reveal</p>
      <h3 className="mt-2 text-2xl font-black text-[#3d3220]">{title}</h3>
      <p className="mt-1 text-sm text-[#4c3d2b]">{subtitle}</p>
    </motion.div>
  );
}
