"use client";

import { useMemo, useState } from "react";
import { ANIMAL_DESTINY_LIST, STAGE_LABEL_TO_KEY } from "@/components/fortune/animal-twelve/animalTwelveData";
import type { AnimalDestinyData } from "../lib/types";
import { resolveTwelveGrowthAnimalResult } from "../lib/twelveGrowthAnimalResults";

type Props = {
  currentAnimal: AnimalDestinyData;
};

const ANIMAL_EMOJI: Record<string, string> = {
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

export default function TwelveAnimalDexGrid({ currentAnimal }: Props) {
  const [selectedStage, setSelectedStage] = useState(currentAnimal.saju_stage);

  const selectedEntry = useMemo(() => {
    return ANIMAL_DESTINY_LIST.find((item) => item.saju_stage === selectedStage) || currentAnimal;
  }, [selectedStage, currentAnimal]);

  const selectedResult = useMemo(() => {
    return resolveTwelveGrowthAnimalResult(selectedEntry);
  }, [selectedEntry]);

  return (
    <section className="rounded-[1.9rem] border border-[#bad7ed] bg-white/90 p-4 shadow-[0_16px_36px_rgba(58,109,153,0.14)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-lg font-black text-[#27557c]">운명 도감 12단계</h3>
        <p className="text-xs font-bold text-[#557d9f]">현재 동물은 하이라이트로 표시됩니다</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {ANIMAL_DESTINY_LIST.map((entry) => {
          const isCurrent = entry.id === currentAnimal.id;
          const isSelected = entry.saju_stage === selectedStage;

          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelectedStage(entry.saju_stage)}
              className={`rounded-2xl border p-2 text-center transition ${isCurrent ? "border-[#f0c77a] bg-[#fff6e4]" : "border-[#cae0f2] bg-[#f8fbff]"} ${isSelected ? "ring-2 ring-[#6bb2e0]" : ""}`}
            >
              <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-2xl ${isCurrent ? "bg-white" : "bg-white/80"}`}>
                {ANIMAL_EMOJI[entry.saju_stage] || "🐾"}
              </div>
              <p className="mt-2 text-xs font-black text-[#2f5d81]">{entry.animal_ko}</p>
              <p className="text-[11px] font-semibold text-[#547c9d]">{entry.saju_stage}</p>
            </button>
          );
        })}
      </div>

      <article className="mt-4 rounded-2xl border border-[#c8def0] bg-[linear-gradient(160deg,#fafdff_0%,#f5fbff_100%)] p-4">
        <h4 className="text-sm font-black text-[#2d5b80]">
          {selectedResult.stageName} · {selectedResult.animalName}
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-[#355f81]">{selectedResult.personality}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#355f81]">{selectedResult.growthMission}</p>
        <p className="mt-3 text-xs font-semibold text-[#567b9b]">
          운성 키: {STAGE_LABEL_TO_KEY[selectedResult.stageName]} / 태그: {selectedResult.elementTags?.join(" · ")}
        </p>
      </article>
    </section>
  );
}
