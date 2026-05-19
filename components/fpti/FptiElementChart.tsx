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
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">오행 분포 (정규화)</h4>
      <div className="mt-3 space-y-2">
        {ELEMENTS.map((item) => (
          <div key={item.key}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
              <span>{item.label}</span>
              <span>{percentages[item.key]}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
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
