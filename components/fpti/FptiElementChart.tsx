"use client";

import { useMemo } from "react";
import type { FiveElementKey } from "@/lib/fpti/fpti-types";
import { useFptiSharedCopy } from "./_lib/copy";

const ELEMENTS: { key: FiveElementKey; label: string; gradient: [string, string] }[] = [
  { key: "wood", label: "목", gradient: ["#34d399", "#a3e635"] },
  { key: "fire", label: "화", gradient: ["#fb7185", "#fb923c"] },
  { key: "earth", label: "토", gradient: ["#f59e0b", "#facc15"] },
  { key: "metal", label: "금", gradient: ["#64748b", "#3f3f46"] },
  { key: "water", label: "수", gradient: ["#06b6d4", "#2563eb"] },
];

type Props = {
  percentages: Record<FiveElementKey, number>;
};

export default function FptiElementChart({ percentages }: Props) {
  const copy = useFptiSharedCopy();
  const normalized = useMemo(() => {
    return ELEMENTS.reduce((acc, item) => {
      const raw = Number(percentages?.[item.key]);
      if (!Number.isFinite(raw)) {
        acc[item.key] = 0;
        return acc;
      }
      acc[item.key] = Math.max(0, Math.min(100, raw));
      return acc;
    }, {} as Record<FiveElementKey, number>);
  }, [percentages]);

  const ordered = [...ELEMENTS].sort((a, b) => normalized[b.key] - normalized[a.key]);
  const strong = ordered[0]?.label || "-";
  const weak = ordered[ordered.length - 1]?.label || "-";

  const formatPercent = (value: number) => {
    if (!Number.isFinite(value)) return "0";
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  const toBarWidth = (value: number) => {
    if (value <= 0) return 0;
    return Math.max(2.4, Math.min(100, value));
  };

  return (
    <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
      <h4 className="text-sm font-semibold text-slate-100">{copy.elementBalanceTitle}</h4>
      <p className="mt-1 text-xs text-slate-300">{copy.elementStrongLabel}: {strong} · {copy.elementWeakLabel}: {weak}</p>
      <div className="mt-3 space-y-2">
        {ELEMENTS.map((item) => (
          <div key={item.key}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
              <span>{item.label}</span>
              <span>{formatPercent(normalized[item.key])}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full shadow-[0_0_8px_rgba(255,255,255,0.14)]"
                style={{
                  width: `${toBarWidth(normalized[item.key])}%`,
                  backgroundImage: `linear-gradient(90deg, ${item.gradient[0]}, ${item.gradient[1]})`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
