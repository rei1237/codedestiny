"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import { useDestinyBiasCopy, type DestinyBiasCopy } from "../_lib/copy";

type Props = {
  vm: DestinyBiasResultViewModel;
};

type ElKey = "wood" | "fire" | "earth" | "metal" | "water";

function buildElements(copy: DestinyBiasCopy): Array<{ key: ElKey; label: string; han: string; emoji: string; color: string }> {
  return [
    { key: "wood", label: copy.elementWood, han: "木", emoji: "🌿", color: "#4ADE80" },
    { key: "fire", label: copy.elementFire, han: "火", emoji: "🔥", color: "#FB7185" },
    { key: "earth", label: copy.elementEarth, han: "土", emoji: "🪨", color: "#FBBF24" },
    { key: "metal", label: copy.elementMetal, han: "金", emoji: "✨", color: "#E5E7EB" },
    { key: "water", label: copy.elementWater, han: "水", emoji: "🌊", color: "#60A5FA" },
  ];
}

function pct(value: number, max: number) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(value || 0) / max) * 100)));
}

export default function BiasDestinyElementChart({ vm }: Props) {
  const copy = useDestinyBiasCopy();
  const elements = buildElements(copy);
  const user = vm.elementDistribution?.user || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const favorite = vm.elementDistribution?.favorite || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const maxVal = Math.max(
    0.1,
    ...elements.map((e) => Math.max(Number(user[e.key] || 0), Number(favorite[e.key] || 0)))
  );

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-cyan-100/85">{copy.elementChartLabel} FIVE ELEMENTS</p>
      <article className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(140deg,rgba(6,14,38,0.8),rgba(14,10,48,0.6))] p-4 shadow-[0_0_50px_rgba(124,58,237,0.16),inset_0_1px_2px_rgba(255,255,255,0.06)] backdrop-blur-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(96,165,250,0.08),transparent_45%)]" aria-hidden />
        <div className="relative z-10 mb-3 flex items-center gap-3 text-[11px] text-white/70">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-white/45" />{copy.elementChartMeLabel}</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-white/90" />{String(vm.biasName || copy.elementFavoriteFallback).trim() || copy.elementFavoriteFallback}</span>
        </div>

        <div className="relative z-10 space-y-2.5">
          {elements.map((e) => (
            <div key={e.key} className="flex items-center gap-3">
              <div className="flex w-12 shrink-0 items-center gap-1">
                <span aria-hidden className="text-sm">{e.emoji}</span>
                <span className="text-xs font-bold text-white/85">{e.label}<span className="ml-0.5 text-[10px] text-white/45">{e.han}</span></span>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct(user[e.key], maxVal)}%`, background: e.color, opacity: 0.5 }}
                  />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct(favorite[e.key], maxVal)}%`, background: e.color, boxShadow: `0 0 8px ${e.color}66` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
