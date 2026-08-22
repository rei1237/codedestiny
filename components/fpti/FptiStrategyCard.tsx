"use client";

import { useFptiSharedCopy } from "./_lib/copy";

type Props = {
  strategySummary: string;
  relationshipSummary: string;
  loveSummary: string;
  careerMoneySummary: string;
  growthTips: string[];
};

export default function FptiStrategyCard({
  strategySummary,
  relationshipSummary,
  loveSummary,
  careerMoneySummary,
  growthTips,
}: Props) {
  const copy = useFptiSharedCopy();
  return (
    <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
      <h4 className="text-sm font-semibold text-slate-100">{copy.strategyTitle}</h4>
      <p className="mt-2 text-sm text-slate-200">{strategySummary}</p>

      <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
        <p>{relationshipSummary}</p>
        <p>{loveSummary}</p>
        <p>{careerMoneySummary}</p>
      </div>

      <ul className="mt-3 space-y-1 text-sm text-slate-200">
        {growthTips.map((tip) => (
          <li key={tip}>- {tip}</li>
        ))}
      </ul>
    </section>
  );
}
