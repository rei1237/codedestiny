"use client";

import { useFptiSharedCopy } from "./_lib/copy";

type Props = {
  keyLabel: "Open" | "Deep" | "Loyal" | "Free";
  description: string;
  goodMatch: string[];
  cautionMatch: string[];
};

export default function FptiRelationshipCard({ keyLabel, description, goodMatch, cautionMatch }: Props) {
  const copy = useFptiSharedCopy();
  const tone =
    keyLabel === "Open"
      ? "from-rose-500/12 to-orange-400/8 border-rose-300/25"
      : keyLabel === "Deep"
        ? "from-sky-500/12 to-indigo-500/10 border-sky-300/25"
        : keyLabel === "Loyal"
          ? "from-emerald-500/12 to-teal-400/10 border-emerald-300/25"
          : "from-violet-500/14 to-fuchsia-500/10 border-violet-300/25";

  return (
    <section className={`rounded-3xl border bg-gradient-to-br ${tone} p-4 backdrop-blur-xl`}>
      <h4 className="text-sm font-semibold text-slate-100">{copy.relationshipStyleTitlePrefix}: {keyLabel}</h4>
      <p className="mt-2 text-sm text-slate-200">{description}</p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
          <p className="text-xs font-semibold text-emerald-200">{copy.goodMatchLabel}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {goodMatch.slice(0, 3).map((code) => (
              <span key={code} className="rounded-full border border-emerald-300/30 bg-emerald-200/15 px-2 py-1 text-[11px] text-emerald-100">
                {code}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3">
          <p className="text-xs font-semibold text-amber-200">{copy.cautionMatchLabel}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cautionMatch.slice(0, 3).map((code) => (
              <span key={code} className="rounded-full border border-amber-300/30 bg-amber-200/15 px-2 py-1 text-[11px] text-amber-100">
                {code}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
