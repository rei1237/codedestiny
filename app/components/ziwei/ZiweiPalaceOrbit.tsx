"use client";

import { ZiweiDeepChart, ZiweiPalaceId, ZIWEI_PALACE_NAME } from "@/app/_lib/ziwei-types";

interface ZiweiPalaceOrbitProps {
  chart: ZiweiDeepChart;
  activePalaceId?: ZiweiPalaceId;
  onSelect: (id: ZiweiPalaceId) => void;
}

export default function ZiweiPalaceOrbit({ chart, activePalaceId, onSelect }: ZiweiPalaceOrbitProps) {
  const badgeTone = (symbol: string) => {
    if (symbol === "◎") return "border-emerald-300/60 bg-emerald-200/15 text-emerald-100";
    if (symbol === "○") return "border-cyan-300/60 bg-cyan-200/15 text-cyan-100";
    if (symbol === "△") return "border-amber-300/60 bg-amber-200/15 text-amber-100";
    if (symbol === "×") return "border-rose-300/60 bg-rose-200/15 text-rose-100";
    return "border-white/20 bg-white/10 text-slate-200";
  };

  return (
    <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl md:p-5">
      <h2 className="mb-3 text-sm font-bold tracking-wide text-amber-200">12궁 Star Chart Summary</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {chart.palaces.map((palace) => {
          const active = palace.id === activePalaceId;
          const triad = palace.triadPalaceIds.map((id) => ZIWEI_PALACE_NAME[id]).join(" · ");
          const opposite = ZIWEI_PALACE_NAME[palace.oppositePalaceId];
          return (
            <button
              key={palace.id}
              type="button"
              onClick={() => onSelect(palace.id)}
              className={`min-h-40 rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-amber-300/80 bg-amber-200/10 shadow-[0_0_20px_rgba(251,191,36,0.28)]"
                  : "border-white/10 bg-slate-950/30 hover:border-amber-300/40"
              }`}
              aria-label={`${ZIWEI_PALACE_NAME[palace.id]} 상세 보기`}
            >
              <p className="text-xs font-bold text-slate-200">{ZIWEI_PALACE_NAME[palace.id]}</p>
              <p className="mt-1 text-[11px] text-slate-400">{palace.mainStars.map((s) => `${s.name}${s.strengthSymbol || s.symbol || ""}`).join(", ") || "주성 없음"}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {palace.mainStars.slice(0, 3).map((star) => {
                  const symbol = star.strengthSymbol || star.symbol || "강약 미확인";
                  return (
                    <span key={`${palace.id}-${star.name}`} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeTone(symbol)}`}>
                      {star.name} {symbol}
                    </span>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {palace.sihua.map((key) => (
                  <span key={`${palace.id}-${key}`} className="rounded-full border border-violet-300/40 bg-violet-200/15 px-2 py-0.5 text-[10px] font-semibold text-violet-100">
                    {key}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {palace.keywords.slice(0, 2).map((keyword) => (
                  <span key={keyword} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                    {keyword}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">대궁: {opposite}</p>
              <p className="mt-1 text-[10px] text-slate-400">삼방사정: {triad}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
