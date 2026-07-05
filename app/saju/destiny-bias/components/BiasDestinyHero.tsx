"use client";

import { m, useReducedMotion } from "framer-motion";

type Props = {
  onEnter: () => void;
  stageLoading: number;
};

export default function BiasDestinyHero({ onEnter, stageLoading }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <m.section
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[32px] border border-white/20 bg-[linear-gradient(145deg,rgba(8,9,30,0.92),rgba(17,10,49,0.72))] p-5 shadow-[0_24px_64px_rgba(2,6,23,0.58)] md:p-7"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(251,191,36,0.22),transparent_38%),radial-gradient(circle_at_82%_14%,rgba(96,165,250,0.24),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(244,114,182,0.22),transparent_44%)]" aria-hidden />
      <div className="pointer-events-none absolute -left-10 top-6 h-36 w-36 rounded-full bg-pink-400/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-8 top-10 h-32 w-32 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden />

      <div className="pointer-events-none absolute left-0 right-0 top-0 h-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0))]" aria-hidden />

      <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#FDE68A]/45 bg-[#FDE68A]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-[#FDE68A]">
            LIVE ARENA GATE OPEN
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white drop-shadow-[0_0_24px_rgba(244,114,182,0.62)] md:text-5xl">
            최애운명 라이브 스테이지
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/86 md:text-base">
            사주 에너지의 박자와 최애의 무대 파장을 맞춰, 지금 가장 강하게 공명하는 팬심 시그널을 찾아냅니다.
            입장과 동시에 스포트라이트 리딩이 시작됩니다.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEnter}
              className="min-h-11 rounded-full bg-[linear-gradient(92deg,#f97316,#f43f5e,#8b5cf6,#22d3ee)] px-6 text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(244,63,94,0.42)] transition hover:-translate-y-0.5"
            >
              스테이지 입장하기
            </button>
            <button
              type="button"
              onClick={onEnter}
              className="min-h-11 rounded-full border border-white/28 bg-white/8 px-6 text-sm font-semibold text-white/92 transition hover:border-pink-200/65 hover:bg-pink-200/10"
            >
              리허설 없이 바로 분석
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] md:max-w-xl">
            {[
              "Spotlight Score",
              "Fanlight Sync",
              "Encore Energy",
            ].map((item) => (
              <span key={item} className="rounded-full border border-white/20 bg-white/8 px-3 py-1.5 text-center font-semibold text-white/85">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/18 bg-black/35 p-4 backdrop-blur-md">
          <p className="text-[11px] tracking-[0.2em] text-purple-100/85">SPOTLIGHT READING</p>
          <p className="mt-1 text-sm font-semibold text-pink-100">무대 음향과 운명 시그널을 동기화 중입니다</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-purple-300/35">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#f97316] via-[#f43f5e] to-[#22d3ee] shadow-[0_0_18px_rgba(244,63,94,.8)]"
              style={{ width: `${stageLoading}%` }}
            />
          </div>
          <p className="mt-2 text-right text-xs font-semibold text-cyan-200/90">{stageLoading}%</p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              "Crowd Heat",
              "Sync BPM",
              "Encore Card",
            ].map((feature) => (
              <div key={feature} className="rounded-xl border border-white/14 bg-white/5 px-2 py-3 text-center text-[11px] font-semibold text-white/85">
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </m.section>
  );
}
