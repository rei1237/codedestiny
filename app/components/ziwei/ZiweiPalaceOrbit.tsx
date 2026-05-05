"use client";

import { ZiweiDeepChart, ZiweiPalaceId, ZIWEI_PALACE_NAME } from "@/app/_lib/ziwei-types";

interface ZiweiPalaceOrbitProps {
  chart: ZiweiDeepChart;
  activePalaceId?: ZiweiPalaceId;
  onSelect: (id: ZiweiPalaceId) => void;
}

export default function ZiweiPalaceOrbit({ chart, activePalaceId, onSelect }: ZiweiPalaceOrbitProps) {
  return (
    <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl md:p-5">
      <h2 className="mb-3 text-sm font-bold tracking-wide text-amber-200">12궁 Star Chart Summary</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {chart.palaces.map((palace) => {
          const active = palace.id === activePalaceId;
          return (
            <button
              key={palace.id}
              type="button"
              onClick={() => onSelect(palace.id)}
              className={`min-h-28 rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-amber-300/80 bg-amber-200/10 shadow-[0_0_20px_rgba(251,191,36,0.28)]"
                  : "border-white/10 bg-slate-950/30 hover:border-amber-300/40"
              }`}
              aria-label={`${ZIWEI_PALACE_NAME[palace.id]} 상세 보기`}
            >
              <p className="text-xs font-bold text-slate-200">{ZIWEI_PALACE_NAME[palace.id]}</p>
              <p className="mt-1 text-[11px] text-slate-400">{palace.mainStars.map((s) => s.name).join(", ") || "주성 없음"}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {palace.keywords.slice(0, 2).map((keyword) => (
                  <span key={keyword} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                    {keyword}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
