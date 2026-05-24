"use client";

import { ZiweiDeepChart, ZiweiPalaceId, ZIWEI_PALACE_NAME } from "@/app/_lib/ziwei-types";
import { transformationTypeToLabel } from "@/app/_lib/ziwei-advanced-normalization";

interface ZiweiPalaceOrbitProps {
  chart: ZiweiDeepChart;
  activePalaceId?: ZiweiPalaceId;
  onSelect: (id: ZiweiPalaceId) => void;
}

export default function ZiweiPalaceOrbit({ chart, activePalaceId, onSelect }: ZiweiPalaceOrbitProps) {
  const badgeTone = (symbol: string) => {
    if (symbol === "◎") return "border-emerald-300/60 bg-emerald-200/15 text-emerald-100";
    if (symbol === "O") return "border-cyan-300/60 bg-cyan-200/15 text-cyan-100";
    if (symbol === "▲") return "border-violet-300/60 bg-violet-200/15 text-violet-100";
    if (symbol === "△") return "border-amber-300/60 bg-amber-200/15 text-amber-100";
    if (symbol === "X") return "border-rose-300/60 bg-rose-200/15 text-rose-100";
    return "border-white/20 bg-white/10 text-slate-200";
  };

  const transformationTone = (label: string) => {
    if (label === "화록") return "border-lime-300/50 bg-lime-200/15 text-lime-100";
    if (label === "화권") return "border-orange-300/50 bg-orange-200/15 text-orange-100";
    if (label === "화과") return "border-sky-300/50 bg-sky-200/15 text-sky-100";
    return "border-rose-300/50 bg-rose-200/15 text-rose-100";
  };

  return (
    <section className="rounded-3xl border border-cyan-200/20 bg-[#081428]/70 p-4 backdrop-blur-xl md:p-5">
      <h2 className="mb-3 text-sm font-bold tracking-wide text-cyan-200">12궁 성도 요약 맵</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {chart.palaces.map((palace) => {
          const active = palace.id === activePalaceId;
          const triad = palace.sanFangSiZheng?.palaceNames?.join(" · ") || palace.triadPalaceIds.map((id) => ZIWEI_PALACE_NAME[id]).join(" · ");
          const opposite = ZIWEI_PALACE_NAME[palace.oppositePalaceId];
          const directTransforms = (palace.fourTransformations || []).map((item) => ({
            label: transformationTypeToLabel(item.type),
            star: item.starName,
          }));
          const incomingTransforms = (palace.incomingFourTransformations || []).map((item) => ({
            label: transformationTypeToLabel(item.type),
            star: item.starName,
          }));
          return (
            <button
              key={palace.id}
              type="button"
              onClick={() => onSelect(palace.id)}
              className={`min-h-40 rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-cyan-300/80 bg-cyan-200/10 shadow-[0_0_24px_rgba(56,189,248,0.28)]"
                  : "border-white/10 bg-slate-950/40 hover:border-cyan-300/45"
              }`}
              aria-label={`${ZIWEI_PALACE_NAME[palace.id]} 상세 보기`}
            >
              <p className="text-xs font-bold text-slate-200">{ZIWEI_PALACE_NAME[palace.id]} {palace.branch || palace.earthlyBranch}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {palace.isEmptyMainStarPalace
                  ? "주성: 무주성궁"
                  : `주성: ${palace.mainStars.map((s) => `${s.name}(${s.strengthSymbol || s.symbol || "△"} ${s.strength || "평"})`).join(", ")}`}
              </p>
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
                {directTransforms.length ? directTransforms.map((item) => (
                  <span
                    key={`${palace.id}-${item.label}-${item.star}`}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${transformationTone(item.label)}`}
                  >
                    {item.label} {item.star}
                  </span>
                )) : <span className="text-[10px] text-slate-400">직접 사화 없음</span>}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                유입: {incomingTransforms.length ? incomingTransforms.map((item) => `${item.label} ${item.star}`).join(", ") : "삼방사정/대궁 유입 약함"}
              </p>
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
