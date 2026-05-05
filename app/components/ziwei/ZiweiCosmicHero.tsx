"use client";

import { ZiweiDeepChart } from "@/app/_lib/ziwei-types";

interface ZiweiCosmicHeroProps {
  chart: ZiweiDeepChart;
}

export default function ZiweiCosmicHero({ chart }: ZiweiCosmicHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-amber-300/30 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />

      <p className="text-[11px] font-bold tracking-[0.24em] text-amber-200/90">DEEP ZIWEI DOSSIER</p>
      <h1 className="mt-2 text-2xl font-black text-slate-100 md:text-4xl">{chart.user.name}님의 심화 자미두수 명반 리포트</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200/90">
        명궁과 신궁, 12궁 상호작용, 사화 흐름을 통합한 로컬 심층 해석입니다. 긴 글은 궁별로 나누어 탐색형으로 제공됩니다.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-3">
          <p className="text-xs text-slate-300">명궁</p>
          <p className="mt-1 text-base font-black text-amber-200">{chart.mingGong}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-3">
          <p className="text-xs text-slate-300">신궁</p>
          <p className="mt-1 text-base font-black text-amber-200">{chart.shenGong}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-3">
          <p className="text-xs text-slate-300">오행국</p>
          <p className="mt-1 text-base font-black text-amber-200">{chart.juInfo}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-3">
          <p className="text-xs text-slate-300">사화 기준</p>
          <p className="mt-1 text-base font-black text-amber-200">{chart.yearGan}{chart.yearZhi}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {chart.summary.keywords.map((keyword) => (
          <span key={keyword} className="rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-xs text-amber-100">
            {keyword}
          </span>
        ))}
      </div>
    </header>
  );
}
