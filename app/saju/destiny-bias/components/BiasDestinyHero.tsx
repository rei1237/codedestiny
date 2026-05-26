"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  onEnter: () => void;
  stageLoading: number;
};

export default function BiasDestinyHero({ onEnter, stageLoading }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[30px] border border-purple-300/45 bg-[linear-gradient(145deg,rgba(7,10,31,0.86),rgba(26,14,66,0.64))] p-5 shadow-[0_0_34px_rgba(124,58,237,0.36)] md:p-7"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(244,114,182,0.24),transparent_36%),radial-gradient(circle_at_82%_14%,rgba(96,165,250,0.24),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(196,181,253,0.2),transparent_42%)]" aria-hidden />

      <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#FDE68A]/45 bg-[#FDE68A]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-[#FDE68A]">
            DESTINY CONCERT GATE
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white drop-shadow-[0_0_24px_rgba(244,114,182,0.62)] md:text-5xl">
            나의 운명 최애는 누구일까?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/86 md:text-base">
            사주 에너지로 찾아보는 나와 가장 잘 맞는 최애 타입.
            우주 콘서트 무대의 스포트라이트가 지금 당신의 팬라이트 오라를 비추기 시작합니다.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEnter}
              className="min-h-11 rounded-full bg-[linear-gradient(92deg,#F472B6,#7C3AED,#60A5FA)] px-6 text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(124,58,237,0.45)] transition hover:-translate-y-0.5"
            >
              운명 스테이지 입장하기
            </button>
            <button
              type="button"
              onClick={onEnter}
              className="min-h-11 rounded-full border border-white/28 bg-white/8 px-6 text-sm font-semibold text-white/92 transition hover:border-pink-200/65 hover:bg-pink-200/10"
            >
              내 최애 에너지 분석하기
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/18 bg-black/35 p-4 backdrop-blur-md">
          <p className="text-[11px] tracking-[0.2em] text-purple-100/85">SPOTLIGHT READING</p>
          <p className="mt-1 text-sm font-semibold text-pink-100">운명 응원봉 싱크를 준비하고 있어요</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-purple-300/35">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#F472B6] via-[#7C3AED] to-[#60A5FA] shadow-[0_0_18px_rgba(124,58,237,.8)]"
              style={{ width: `${stageLoading}%` }}
            />
          </div>
          <p className="mt-2 text-right text-xs font-semibold text-cyan-200/90">{stageLoading}%</p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              "Bias Matching",
              "Fanlight Aura",
              "Spotlight Card",
            ].map((feature) => (
              <div key={feature} className="rounded-xl border border-white/14 bg-white/5 px-2 py-3 text-center text-[11px] font-semibold text-white/85">
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
