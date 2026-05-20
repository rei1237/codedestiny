"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "./FptiCosmic.module.css";

type Props = {
  onStart: () => void;
};

const ELEMENTS = ["木", "火", "土", "金", "水"];

export default function FptiHero({ onStart }: Props) {
  const reducedMotion = useReducedMotion();

  return (
    <section className={`${styles.glassPanelStrong} relative isolate overflow-hidden rounded-[32px] p-6 text-slate-50 md:p-10`}>
      <div className={`${styles.starLayerSoft} absolute inset-0`} aria-hidden />
      <div className={`${styles.auroraLine} absolute left-0 top-0 h-[2px] w-full`} aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-end"
      >
        <div>
          <p className={`${styles.autoBadge} inline-flex rounded-full px-3 py-1 text-[11px] tracking-[0.22em] text-[#efe5ff]`}>
            COSMIC SAJU MATRIX
          </p>
          <h1
            className={`${styles.heroTitle} mt-4 text-4xl leading-[1.02] text-[#f8fbff] md:text-6xl`}
          >
            사주로 보는 FPTI 테스트
          </h1>
          <p className="mt-4 text-base text-[#d8d5ff] md:text-lg">생년월일시로 열어보는 당신의 별자리 성향 코드</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#CBD5E1] md:text-[15px]">
            생년월일, 시간, 음양력 정보가 입력되면 사주 원국을 자동 계산하고 오행과 십성 데이터를 즉시 FPTI 알고리즘에 주입합니다.
            계산이 끝나면 자동으로 다음 단계로 넘어가 결과를 확인할 수 있습니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onStart}
              className={`${styles.ctaButton} rounded-full px-5 py-3 text-sm font-semibold`}
            >
              내 FPTI 확인하기
            </button>
          </div>

          <div className="mt-6 grid max-w-xl grid-cols-5 gap-2 text-center text-sm">
            {ELEMENTS.map((item, idx) => (
              <motion.div
                key={item}
                animate={reducedMotion ? { opacity: 1 } : { y: [0, -4, 0], opacity: [0.82, 1, 0.82] }}
                transition={reducedMotion ? { duration: 0 } : { duration: 3.2, repeat: Infinity, delay: idx * 0.18 }}
                className="rounded-xl border border-violet-200/20 bg-white/5 py-2 backdrop-blur"
              >
                {item}
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
          <p className="mt-2 text-2xl font-semibold text-[#f5ebff]">입력 즉시 사주 계산</p>
          <p className="mt-1 text-sm text-[#d4dcff]">생년월일/시간/양음력 변경 시 원국 재계산 후 FPTI 결과 단계로 자동 전환</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#f8fafc]">
            <div className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">1. 입력 변경 감지</div>
            <div className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">2. 사주 데이터 계산</div>
            <div className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">3. 오행/십성 주입</div>
            <div className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">4. 결과 자동 표시</div>
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
