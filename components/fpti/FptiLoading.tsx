"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  step: string;
  stepIndex?: number;
};

const ELEMENTS = ["木", "火", "土", "金", "水"];

export default function FptiLoading({ step, stepIndex = 0 }: Props) {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/20 bg-[linear-gradient(145deg,rgba(5,18,36,0.95),rgba(16,33,54,0.92))] p-7 text-center shadow-[0_20px_60px_rgba(3,9,26,0.58)]">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_18%_24%,rgba(56,189,248,0.3),transparent_42%),radial-gradient(circle_at_82%_76%,rgba(245,158,11,0.22),transparent_46%)]" />

      <div className="relative mx-auto h-24 w-24">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#E9C46A]/40"
          animate={reducedMotion ? { rotate: 0 } : { rotate: 360 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-3 rounded-full border-2 border-[#38BDF8]/45"
          animate={reducedMotion ? { rotate: 0 } : { rotate: -360 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 4.8, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#FDE68A_0%,#0EA5E9_85%)]"
          animate={reducedMotion ? { scale: 1 } : { scale: [1, 1.2, 1] }}
          transition={reducedMotion ? { duration: 0 } : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <h3 className="relative mt-5 text-xl font-semibold text-slate-100">사주 원국 분석 중</h3>
      <p className="relative mt-2 text-sm text-slate-300">{step}</p>

      <div className="relative mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 text-sm text-[#E9C46A]">
        {ELEMENTS.map((item, idx) => (
          <motion.span
            key={item}
            animate={
              reducedMotion
                ? { opacity: idx === stepIndex % 5 ? 1 : 0.7 }
                : { y: [0, -4, 0], opacity: idx === stepIndex % 5 ? [0.7, 1, 0.7] : [0.4, 0.7, 0.4] }
            }
            transition={reducedMotion ? { duration: 0 } : { duration: 1.6, repeat: Infinity, delay: idx * 0.12 }}
            className="rounded-full border border-[#E9C46A]/35 px-2 py-1"
          >
            {item}
          </motion.span>
        ))}
      </div>

      <div className="relative mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/15">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#0EA5E9] via-[#2563EB] to-[#F6D365]"
          initial={{ width: "8%" }}
          animate={{ width: reducedMotion ? "80%" : "96%" }}
          transition={{ duration: reducedMotion ? 0.2 : 2.4, ease: "easeInOut" }}
        />
      </div>
    </section>
  );
}
