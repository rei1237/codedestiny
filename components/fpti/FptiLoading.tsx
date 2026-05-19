"use client";

import { motion } from "framer-motion";

type Props = {
  step: string;
};

export default function FptiLoading({ step }: Props) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-7 text-center shadow-sm">
      <motion.div
        className="mx-auto h-16 w-16 rounded-full border-4 border-slate-200 border-t-indigo-600"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      />
      <h3 className="mt-5 text-xl font-semibold text-slate-900">사주 데이터 분석 중</h3>
      <p className="mt-2 text-sm text-slate-600">{step}</p>
      <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-amber-400"
          initial={{ width: "8%" }}
          animate={{ width: "96%" }}
          transition={{ duration: 2.4, ease: "easeInOut" }}
        />
      </div>
    </section>
  );
}
