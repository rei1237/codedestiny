"use client";

import type { TwelveGrowthAnimalResult } from "../lib/types";
import { useAnimalDestinyCopy } from "../_lib/copy";

type Props = {
  result: TwelveGrowthAnimalResult;
};

function compactText(text: string, max = 92) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

export default function TwelveAnimalAdviceCard({ result }: Props) {
  const copy = useAnimalDestinyCopy();
  const routineCards = [
    { time: copy.morningLabel, label: copy.openLuckLabel, text: compactText(result.todayAction, 74) },
    { time: copy.afternoonLabel, label: copy.keepRhythmLabel, text: compactText(result.recoveryGuide, 74) },
    { time: copy.nightLabel, label: copy.saveLuckLabel, text: compactText(result.growthMission, 74) },
  ];

  return (
    <section className="rounded-[1.9rem] border border-[#b9d6ec] bg-[linear-gradient(165deg,#fbfdff_0%,#f4fbff_58%,#fff9ee_100%)] p-5 shadow-[0_14px_34px_rgba(56,108,152,0.12)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#2a557a]">{copy.adviceTitle}</h3>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-[#5b7d9a]">
            {copy.adviceDesc(result.animalName)}
          </p>
        </div>
        <span className="rounded-full border border-[#d9d3a2] bg-[#fff8de] px-3 py-1 text-xs font-black text-[#8e7b34]">
          {copy.routineBadge(result.stageName)}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {routineCards.map((card) => (
          <article key={card.time} className="rounded-2xl border border-[#d9d3a2] bg-[#fffaf0]/88 p-4">
            <p className="text-[11px] font-black text-[#8e7b34]">{card.time}</p>
            <p className="mt-1 text-sm font-black text-[#654f21]">{card.label}</p>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-[#6a5a33]">{card.text}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-2xl border border-[#c6def0] bg-white/86 p-4">
          <p className="text-xs font-black text-[#4d7697]">{copy.practicalAdviceLabel}</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#345e81]">{result.todayAction}</p>
        </article>
        <article className="rounded-2xl border border-[#c6def0] bg-white/86 p-4">
          <p className="text-xs font-black text-[#4d7697]">{copy.growthMissionLabel}</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#345e81]">{result.growthMission}</p>
        </article>
        <article className="rounded-2xl border border-[#c6def0] bg-white/86 p-4">
          <p className="text-xs font-black text-[#4d7697]">{copy.recoveryGuideLabel}</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#345e81]">{result.recoveryGuide}</p>
        </article>
        <article className="rounded-2xl border border-[#c6def0] bg-white/86 p-4">
          <p className="text-xs font-black text-[#4d7697]">{copy.compatibleEnergyLabel}</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#345e81]">{result.compatibleEnergy}</p>
        </article>
        <article className="rounded-2xl border border-[#c6def0] bg-white/86 p-4">
          <p className="text-xs font-black text-[#4d7697]">{copy.cautionEnergyLabel}</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#345e81]">{result.cautionEnergy}</p>
        </article>
      </div>
    </section>
  );
}
