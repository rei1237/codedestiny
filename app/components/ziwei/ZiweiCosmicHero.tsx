"use client";

import { ZiweiDeepChart } from "@/app/_lib/ziwei-types";

interface ZiweiCosmicHeroProps {
  chart: ZiweiDeepChart;
}

export default function ZiweiCosmicHero({ chart }: ZiweiCosmicHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-cyan-200/25 bg-[#071227]/80 p-6 shadow-[0_20px_70px_rgba(2,6,23,0.65)] backdrop-blur-xl md:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />

      <p className="text-[11px] font-semibold tracking-[0.28em] text-cyan-200/90">COSMIC ZIWEI IMMERSIVE REPORT</p>
      <h1 className="mt-2 text-2xl font-black leading-tight text-slate-100 md:text-4xl">{chart.user.name}님의 심화 자미두수 명반</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200/90">
        명궁, 신궁, 12궁 상호작용과 사화 흐름을 통합해 지금의 운행 구조를 입체적으로 탐색합니다.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/15 bg-[#0b1a36]/70 px-4 py-3">
          <p className="text-xs text-slate-300">명궁</p>
          <p className="mt-1 text-base font-black text-cyan-100">{chart.mingGong}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-[#0b1a36]/70 px-4 py-3">
          <p className="text-xs text-slate-300">신궁</p>
          <p className="mt-1 text-base font-black text-cyan-100">{chart.shenGong}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-[#0b1a36]/70 px-4 py-3">
          <p className="text-xs text-slate-300">오행국</p>
          <p className="mt-1 text-base font-black text-cyan-100">{chart.juInfo}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-[#0b1a36]/70 px-4 py-3">
          <p className="text-xs text-slate-300">사화 기준</p>
          <p className="mt-1 text-base font-black text-cyan-100">{chart.yearGan}{chart.yearZhi}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/15 bg-[#0b1a36]/70 px-4 py-3">
          <p className="text-xs font-bold text-slate-300">강약 기호 기준</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded-full border border-emerald-300/60 bg-emerald-200/15 px-2 py-1 text-emerald-100">◎ 묘</span>
            <span className="rounded-full border border-cyan-300/60 bg-cyan-200/15 px-2 py-1 text-cyan-100">○ 왕</span>
            <span className="rounded-full border border-amber-300/60 bg-amber-200/15 px-2 py-1 text-amber-100">△ 리·평</span>
            <span className="rounded-full border border-rose-300/60 bg-rose-200/15 px-2 py-1 text-rose-100">× 함</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-[#0b1a36]/70 px-4 py-3">
          <p className="text-xs font-bold text-slate-300">사화 뱃지</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
            {chart.sihua.hualu ? <span className="rounded-full border border-lime-300/50 bg-lime-200/15 px-2 py-1 text-lime-100">化祿 {chart.sihua.hualu}</span> : null}
            {chart.sihua.huaquan ? <span className="rounded-full border border-orange-300/50 bg-orange-200/15 px-2 py-1 text-orange-100">化權 {chart.sihua.huaquan}</span> : null}
            {chart.sihua.huake ? <span className="rounded-full border border-sky-300/50 bg-sky-200/15 px-2 py-1 text-sky-100">化科 {chart.sihua.huake}</span> : null}
            {chart.sihua.huaji ? <span className="rounded-full border border-rose-300/50 bg-rose-200/15 px-2 py-1 text-rose-100">化忌 {chart.sihua.huaji}</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {chart.summary.keywords.map((keyword) => (
          <span key={keyword} className="rounded-full border border-cyan-200/35 bg-cyan-200/10 px-3 py-1 text-xs text-cyan-100">
            {keyword}
          </span>
        ))}
      </div>
    </header>
  );
}
