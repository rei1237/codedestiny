"use client";

import type { TwelveGrowthAnimalResult } from "../lib/types";

type Props = {
  result: TwelveGrowthAnimalResult;
};

function compactText(text: string, max = 92) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

export default function TwelveAnimalAdviceCard({ result }: Props) {
  const routineCards = [
    { time: "아침", label: "운 열기", text: compactText(result.todayAction, 74) },
    { time: "오후", label: "리듬 지키기", text: compactText(result.recoveryGuide, 74) },
    { time: "밤", label: "복 저장", text: compactText(result.growthMission, 74) },
  ];

  return (
    <section className="rounded-[1.9rem] border border-[#b9d6ec] bg-[linear-gradient(165deg,#fbfdff_0%,#f4fbff_58%,#fff9ee_100%)] p-5 shadow-[0_14px_34px_rgba(56,108,152,0.12)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#2a557a]">오늘의 조언과 성장 미션</h3>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-[#5b7d9a]">
            {result.animalName}의 운을 하루 안에서 열고, 지키고, 저장하는 작은 루틴입니다.
          </p>
        </div>
        <span className="rounded-full border border-[#d9d3a2] bg-[#fff8de] px-3 py-1 text-xs font-black text-[#8e7b34]">
          {result.stageName} 루틴
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
          <p className="text-xs font-black text-[#4d7697]">오늘의 실전 조언</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#345e81]">{result.todayAction}</p>
        </article>
        <article className="rounded-2xl border border-[#c6def0] bg-white/86 p-4">
          <p className="text-xs font-black text-[#4d7697]">성장 미션</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#345e81]">{result.growthMission}</p>
        </article>
        <article className="rounded-2xl border border-[#c6def0] bg-white/86 p-4">
          <p className="text-xs font-black text-[#4d7697]">회복 가이드</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#345e81]">{result.recoveryGuide}</p>
        </article>
        <article className="rounded-2xl border border-[#c6def0] bg-white/86 p-4">
          <p className="text-xs font-black text-[#4d7697]">잘 맞는 동물 에너지</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#345e81]">{result.compatibleEnergy}</p>
        </article>
        <article className="rounded-2xl border border-[#c6def0] bg-white/86 p-4">
          <p className="text-xs font-black text-[#4d7697]">조심해야 할 에너지</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#345e81]">{result.cautionEnergy}</p>
        </article>
      </div>
    </section>
  );
}
