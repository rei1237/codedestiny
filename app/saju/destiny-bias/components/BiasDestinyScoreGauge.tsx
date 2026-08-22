"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import { useDestinyBiasCopy } from "../_lib/copy";

type Props = {
  vm: DestinyBiasResultViewModel;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

// 반원 게이지 경로 (좌 20,100 → 우 180,100, 반지름 80)
const ARC_PATH = "M20 100 A80 80 0 0 1 180 100";

export default function BiasDestinyScoreGauge({ vm }: Props) {
  const copy = useDestinyBiasCopy();
  const total = clampScore(vm.totalScore);
  const biasName = String(vm.biasName || copy.elementFavoriteFallback).trim() || copy.elementFavoriteFallback;
  const timeUnknown = vm.birthDataStatus?.favorite !== "complete";

  const subScores = [
    { label: copy.scoreGaugeEmotionalLabel, value: clampScore(vm.emotionalScore) },
    { label: copy.scoreGaugeFandomLabel, value: clampScore(vm.fandomScore) },
    { label: copy.scoreGaugeLongTermLabel, value: clampScore(vm.longTermScore) },
    { label: copy.scoreGaugeStabilityLabel, value: clampScore(vm.supportStyleScore) },
  ];

  return (
    <section className="space-y-3">
      {timeUnknown ? (
        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/18 bg-white/[0.06] px-3 py-1.5">
          <span aria-hidden className="text-xs">🕰️</span>
          <span className="min-w-0 break-keep text-[11px] leading-4 text-white/75">
            {copy.scoreGaugeTimeUnknownText(biasName)}
          </span>
        </div>
      ) : null}

      <article className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(140deg,rgba(8,16,42,0.82),rgba(18,12,54,0.6),rgba(24,10,58,0.58))] p-5 shadow-[0_0_50px_rgba(124,58,237,0.2),0_20px_50px_rgba(2,6,28,0.46),inset_0_1px_2px_rgba(255,255,255,0.08)] backdrop-blur-xl md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(201,167,255,0.2),transparent_36%),radial-gradient(circle_at_84%_86%,rgba(64,200,255,0.16),transparent_36%)]" aria-hidden />
        <div className="relative z-10 grid items-center gap-5 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          {/* 반원 게이지 */}
          <div className="mx-auto w-full max-w-[240px]">
            <div className="relative">
              <svg viewBox="0 0 200 120" className="w-full" role="img" aria-label={copy.scoreGaugeAriaLabel(total)}>
                <defs>
                  <linearGradient id="destinyGaugeStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#C9A7FF" />
                    <stop offset="52%" stopColor="#FF5FD2" />
                    <stop offset="100%" stopColor="#40C8FF" />
                  </linearGradient>
                </defs>
                <path d={ARC_PATH} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" strokeLinecap="round" />
                <path
                  d={ARC_PATH}
                  fill="none"
                  stroke="url(#destinyGaugeStroke)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray={`${total} 100`}
                  style={{ filter: "drop-shadow(0 0 8px rgba(255,95,210,0.45))" }}
                />
              </svg>
              <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
                <span className="text-4xl font-black leading-none text-white md:text-5xl">{total}</span>
                <span className="mt-0.5 text-[11px] font-semibold tracking-[0.16em] text-[#FFD98A]/90">{vm.destinyGrade}</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {subScores.map((s) => (
                <span key={s.label} className="rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/78">
                  {s.label} <b className="font-bold text-white/92">{s.value}</b>
                </span>
              ))}
            </div>
          </div>

          {/* ① 한줄 케미 요약 */}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-cyan-100/85">{copy.scoreGaugeChemiLabel}</p>
            <p className="mt-2 min-w-0 break-keep text-base font-semibold leading-8 text-white/93 md:text-lg">
              {String(vm.oneLineDestinyMessage || vm.chemistrySummary || "").trim()}
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
