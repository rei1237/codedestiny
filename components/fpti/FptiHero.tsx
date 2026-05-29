"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import styles from "./FptiCosmic.module.css";

type Props = {
  onStart: () => void;
};

const ELEMENTS = [
  { label: "木", className: "border-emerald-300/55 bg-emerald-500/10 text-emerald-100" },
  { label: "火", className: "border-rose-300/55 bg-rose-500/10 text-rose-100" },
  { label: "土", className: "border-amber-300/55 bg-amber-500/10 text-amber-100" },
  { label: "金", className: "border-slate-300/55 bg-slate-300/10 text-slate-100" },
  { label: "水", className: "border-sky-300/55 bg-sky-500/10 text-sky-100" },
];

export default function FptiHero({ onStart }: Props) {
  const reducedMotion = useReducedMotion();

  return (
    <section className={`${styles.glassPanelStrong} relative isolate overflow-hidden rounded-[32px] p-6 text-slate-50 md:p-10`}>
      <div className={`${styles.starLayerSoft} absolute inset-0`} aria-hidden />
      <div className={`${styles.auroraLine} absolute left-0 top-0 h-[2px] w-full`} aria-hidden />

      <Link
        href="/"
        className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur transition-all duration-200 hover:bg-white/10 hover:text-white"
        aria-label="홈으로 가기"
      >
        <span>🏠</span> 홈으로
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-end"
      >
        <div>
          <p className={`${styles.autoBadge} inline-flex rounded-full px-3 py-1 text-[11px] tracking-[0.22em] text-[#efe5ff]`}>
            COSMIC PERSONALITY OBSERVATORY
          </p>
          <h1
            className={`${styles.heroTitle} mt-4 text-4xl leading-[1.02] text-[#f8fbff] md:text-6xl`}
          >
            별자리 성향 연구소 FPTI
          </h1>
          <p className="mt-4 text-base text-[#d8d5ff] md:text-lg">은하 관측소에서 해석하는 당신의 운명 성향 코드</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#CBD5E1] md:text-[15px]">
            입력된 출생 정보를 바탕으로 성향 코드의 흐름을 정교하게 읽어, 단순 성격 테스트가 아닌 프리미엄 운명 성향 리포트 톤으로 결과를 제공합니다.
            분석이 완료되면 결과 화면에서 챕터별 해석과 실전 조언을 바로 확인할 수 있습니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onStart}
              className={`${styles.ctaButton} rounded-full px-5 py-3 text-sm font-semibold`}
            >
              성향 코드 관측 시작
            </button>
          </div>

          <div className="mt-6 grid max-w-xl grid-cols-5 gap-2 text-center text-sm">
            {ELEMENTS.map((item, idx) => (
              <motion.div
                key={item.label}
                animate={reducedMotion ? { opacity: 1 } : { y: [0, -4, 0], opacity: [0.82, 1, 0.82] }}
                transition={reducedMotion ? { duration: 0 } : { duration: 3.2, repeat: Infinity, delay: idx * 0.18 }}
                className={`rounded-xl border py-2 backdrop-blur ${item.className}`}
              >
                {item.label}
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
          transition={{ delay: 0.15, duration: 0.45, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
          className={`${styles.glassPanel} rounded-[28px] p-5`}
        >
          <p className="text-[11px] tracking-[0.2em] text-[#bfdbfe]">AUTO FLOW</p>
          <p className="mt-2 text-2xl font-semibold text-[#f5ebff]">별자리 성향 자동 관측</p>
          <p className="mt-1 text-sm text-[#d4dcff]">입력값이 바뀌면 흐름을 다시 해석해 결과 단계까지 자동 연결됩니다.</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#f8fafc]">
            <div className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">1. 출생 정보 스캔</div>
            <div className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">2. 성향 코드 해석</div>
            <div className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">3. 챕터 리포트 구성</div>
            <div className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">4. 결과 화면 전환</div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px] text-[#CBD5E1]">
            {[
              ["년주", "자동"],
              ["월주", "자동"],
              ["일주", "자동"],
              ["시주", "자동"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/15 bg-black/25 p-2">
                <p>{label}</p>
                <p className="mt-1 text-sm font-semibold text-[#F6D365]">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
