"use client";

import type { FiveElementKey } from "@/lib/fpti/fpti-types";

const ELEMENTS: { key: FiveElementKey; label: string; color: string }[] = [
  { key: "wood", label: "목", color: "from-emerald-400 to-lime-400" },
  { key: "fire", label: "화", color: "from-rose-400 to-orange-400" },
  { key: "earth", label: "토", color: "from-amber-500 to-yellow-400" },
  { key: "metal", label: "금", color: "from-slate-300 to-zinc-400" },
  { key: "water", label: "수", color: "from-sky-400 to-indigo-500" },
];

type Props = {
  percentages: Record<FiveElementKey, number>;
};

export default function FptiElementChart({ percentages }: Props) {
  const ordered = [...ELEMENTS].sort((a, b) => percentages[b.key] - percentages[a.key]);
  const strong = ordered[0]?.label || "-";
  const weak = ordered[ordered.length - 1]?.label || "-";

  return (
    <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
      <h4 className="text-sm font-semibold text-slate-100">오행 에너지 밸런스</h4>
      <p className="mt-1 text-xs text-slate-300">강한 오행: {strong} · 부족한 오행: {weak}</p>
      <div className="mt-3 space-y-2">
        {ELEMENTS.map((item) => (
          <div key={item.key}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
              <span>{item.label}</span>
              <span>{percentages[item.key]}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                style={{ width: `${Math.max(4, Math.min(100, percentages[item.key]))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
