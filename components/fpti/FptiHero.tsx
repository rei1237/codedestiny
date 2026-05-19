"use client";

import { motion } from "framer-motion";

type Props = {
  onStart: () => void;
};

export default function FptiHero({ onStart }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/25 bg-[radial-gradient(circle_at_20%_20%,rgba(255,210,130,0.25),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(118,166,255,0.23),transparent_40%),linear-gradient(155deg,#0e1739_0%,#161142_45%,#3d1b3f_100%)] p-6 text-white shadow-[0_24px_80px_rgba(5,8,24,0.5)] md:p-10">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-200/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end"
      >
        <div>
          <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs tracking-[0.22em] text-amber-100">
            SAJU FPTI EXPERIENCE
          </p>
          <h1
            className="mt-4 text-4xl leading-tight md:text-6xl"
            style={{ fontFamily: "'Cormorant Garamond', 'Noto Serif KR', serif" }}
          >
            사주로 보는 FPTI 테스트
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-100/90 md:text-base">
            태어난 연월일시를 기반으로 오행과 십성 분포를 계산하고, 4축 코드로 당신의 성향을
            해석합니다. 무료 결과는 즉시 확인, 유료 모드에서는 궁합/커리어/연애 심층 리포트까지 확장됩니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onStart}
              className="rounded-full bg-amber-300 px-5 py-2 text-sm font-semibold text-[#1a1f3d] transition hover:scale-[1.02] hover:bg-amber-200"
            >
              지금 테스트 시작하기
            </button>
            <a
              href="#fpti-intro"
              className="rounded-full border border-white/40 px-5 py-2 text-sm text-white/90 transition hover:bg-white/10"
            >
              분석 방식 보기
            </a>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur"
        >
          <p className="text-xs tracking-[0.2em] text-sky-100">YOUR CODE PREVIEW</p>
          <p className="mt-3 text-3xl font-bold text-amber-200">A-S-D-H</p>
          <p className="mt-1 text-sm text-slate-100">통찰 탐구형 · 감정 신호를 깊게 읽는 전략가</p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-black/20 p-2">기질축: Aqua</div>
            <div className="rounded-xl bg-black/20 p-2">행동축: Scholar</div>
            <div className="rounded-xl bg-black/20 p-2">관계축: Deep</div>
            <div className="rounded-xl bg-black/20 p-2">전략축: Harmony</div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
