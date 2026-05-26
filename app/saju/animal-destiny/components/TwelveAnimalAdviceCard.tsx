"use client";

import type { TwelveGrowthAnimalResult } from "../lib/types";

type Props = {
  result: TwelveGrowthAnimalResult;
};

export default function TwelveAnimalAdviceCard({ result }: Props) {
  return (
    <section className="rounded-[1.9rem] border border-[#b9d6ec] bg-[linear-gradient(165deg,#fbfdff_0%,#f4fbff_58%,#fff9ee_100%)] p-5 shadow-[0_14px_34px_rgba(56,108,152,0.12)]">
      <h3 className="text-lg font-black text-[#2a557a]">오늘의 조언과 성장 미션</h3>
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
