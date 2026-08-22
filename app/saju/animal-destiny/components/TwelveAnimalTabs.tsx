"use client";

import { useMemo, useState } from "react";
import type { TwelveGrowthAnimalResult } from "../lib/types";
import { buildTwelveAnimalSections } from "../lib/twelveGrowthAnimalResults";
import { useAnimalDestinyCopy } from "../_lib/copy";

type Props = {
  result: TwelveGrowthAnimalResult;
};

export default function TwelveAnimalTabs({ result }: Props) {
  const copy = useAnimalDestinyCopy();
  const sections = useMemo(() => buildTwelveAnimalSections(result), [result]);
  const [active, setActive] = useState(sections[0]?.key || "core");
  const current = sections.find((item) => item.key === active) || sections[0];
  const hint = copy.sectionHint[current.key as keyof typeof copy.sectionHint] || copy.sectionHint.core;

  return (
    <section className="min-w-0 rounded-[1.9rem] border border-[#bad6ed] bg-white/88 p-4 shadow-[0_14px_34px_rgba(56,108,153,0.13)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#27537a]">{copy.detailTitle}</h3>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-[#5b7d9a]">
            {copy.detailDesc(result.animalName)}
          </p>
        </div>
        <span className="rounded-full border border-[#c8dff1] bg-[#f4faff] px-3 py-1 text-xs font-black text-[#4b789c]">
          {copy.interpretationCountSuffix(sections.length)}
        </span>
      </div>
      <div className="mt-4 flex snap-x gap-2 overflow-x-auto pb-2">
        {sections.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`min-h-[44px] shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-black transition ${active === tab.key ? "border-[#4f93c4] bg-[#e9f6ff] text-[#24577f]" : "border-[#c8dff1] bg-white text-[#547a9b] hover:bg-[#f4faff]"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <article className="mt-4 rounded-2xl border border-[#c8def0] bg-[linear-gradient(160deg,#fbfeff_0%,#f5faff_100%)] p-4">
        <div className="mb-3 rounded-2xl border border-[#d6e5f1] bg-white/78 p-3">
          <p className="text-[11px] font-black text-[#4b789c]">{hint.badge}</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-[#537693]">{hint.guide}</p>
        </div>
        <h4 className="text-base font-black text-[#2b5a80]">{current.label}</h4>
        <p className="mt-3 whitespace-pre-line text-sm leading-[1.85] text-[#335f82]">{current.content}</p>
      </article>
    </section>
  );
}
