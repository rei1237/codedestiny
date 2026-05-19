"use client";

import { motion } from "framer-motion";

type Props = {
  step: string;
  stepIndex?: number;
};

const ELEMENTS = ["木", "火", "土", "金", "水"];

export default function FptiLoading({ step, stepIndex = 0 }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(145deg,rgba(11,16,38,0.95),rgba(19,10,42,0.9))] p-7 text-center shadow-[0_20px_60px_rgba(3,6,22,0.55)]">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.35),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(96,165,250,0.3),transparent_45%)]" />

      <div className="relative mx-auto h-24 w-24">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#E9C46A]/40"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-3 rounded-full border-2 border-[#60A5FA]/45"
          animate={{ rotate: -360 }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#F6D365_0%,#7C3AED_80%)]"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <h3 className="relative mt-5 text-xl font-semibold text-slate-100">사주 원국 분석 중</h3>
      <p className="relative mt-2 text-sm text-slate-300">{step}</p>

      <div className="relative mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 text-sm text-[#E9C46A]">
        {ELEMENTS.map((item, idx) => (
          <motion.span
            key={item}
            animate={{ y: [0, -4, 0], opacity: idx === stepIndex % 5 ? [0.7, 1, 0.7] : [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: idx * 0.12 }}
            className="rounded-full border border-[#E9C46A]/35 px-2 py-1"
          >
            {item}
          </motion.span>
        ))}
      </div>

      <div className="relative mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/15">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#60A5FA] to-[#F6D365]"
          initial={{ width: "8%" }}
          animate={{ width: "96%" }}
          transition={{ duration: 2.4, ease: "easeInOut" }}
        />
      </div>
    </section>
  );
}
