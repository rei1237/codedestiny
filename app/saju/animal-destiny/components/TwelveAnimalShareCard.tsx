"use client";

import { forwardRef } from "react";
import type { TwelveGrowthAnimalResult } from "../lib/types";

type Props = {
  result: TwelveGrowthAnimalResult;
};

const STAGE_ICON: Record<string, string> = {
  장생: "🦌",
  목욕: "🐈",
  관대: "🦊",
  건록: "🐶",
  제왕: "🦁",
  쇠: "🦉",
  병: "🐰",
  사: "🦋",
  묘: "🐹",
  절: "🐈‍⬛",
  태: "🐣",
  양: "🐷",
};

const TwelveAnimalShareCard = forwardRef<HTMLDivElement, Props>(function TwelveAnimalShareCard({ result }, ref) {
  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[1.8rem] border border-[#bdd8ec] bg-[linear-gradient(160deg,#f9fdff_0%,#edf7ff_56%,#fff5e6_100%)] p-5 shadow-[0_18px_40px_rgba(57,108,152,0.2)]"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#cde7ff]/70 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-2 h-32 w-32 rounded-full bg-[#ffe4b8]/60 blur-2xl" />

      <div className="relative z-10 space-y-4">
        <p className="text-[11px] font-black tracking-[0.18em] text-[#3d6b92]">운명의 동물 도감 · 결과 요약 카드</p>
        <div className="rounded-2xl border border-[#c8def0] bg-white/88 p-4 text-center">
          <p className="text-5xl">{STAGE_ICON[result.stageName] || "🐾"}</p>
          <h4 className="mt-2 text-xl font-black text-[#274f73]">{result.animalName}</h4>
          <p className="text-sm font-semibold text-[#4d7597]">십이운성 {result.stageName}</p>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#355f82]">{result.animalTitle}</p>
        </div>

        <p className="rounded-2xl border border-[#c8def0] bg-white/88 p-4 text-sm leading-relaxed text-[#335f82]">{result.summary}</p>

        <div className="flex flex-wrap gap-2">
          {result.keywords.slice(0, 5).map((tag) => (
            <span key={tag} className="rounded-full border border-[#c8def0] bg-white px-3 py-1 text-xs font-bold text-[#356186]">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

export default TwelveAnimalShareCard;
