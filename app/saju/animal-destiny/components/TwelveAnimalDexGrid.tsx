"use client";

import { useMemo, useState } from "react";
import { ANIMAL_DESTINY_LIST, STAGE_KEY_TO_HANJA, STAGE_LABEL_TO_KEY, STAGE_SEQUENCE } from "@/components/fortune/animal-twelve/animalTwelveData";
import type { AnimalDestinyData } from "../lib/types";
import { resolveTwelveGrowthAnimalResult } from "../lib/twelveGrowthAnimalResults";
import { useAnimalDestinyCopy } from "../_lib/copy";

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
  양: "🐑",
};

function stageDistance(leftStage: string, rightStage: string) {
  const leftKey = STAGE_LABEL_TO_KEY[leftStage as keyof typeof STAGE_LABEL_TO_KEY];
  const rightKey = STAGE_LABEL_TO_KEY[rightStage as keyof typeof STAGE_LABEL_TO_KEY];
  const leftIndex = STAGE_SEQUENCE.indexOf(leftKey);
  const rightIndex = STAGE_SEQUENCE.indexOf(rightKey);
  if (leftIndex < 0 || rightIndex < 0) return 6;
  const direct = Math.abs(leftIndex - rightIndex);
  return Math.min(direct, STAGE_SEQUENCE.length - direct);
}

export default function TwelveAnimalDexGrid({ currentAnimal }: Props) {
  const copy = useAnimalDestinyCopy();
  const [selectedStage, setSelectedStage] = useState(currentAnimal.saju_stage);

  const selectedEntry = useMemo(() => {
    return ANIMAL_DESTINY_LIST.find((item) => item.saju_stage === selectedStage) || currentAnimal;
  }, [selectedStage, currentAnimal]);

  const selectedResult = useMemo(() => {
    return resolveTwelveGrowthAnimalResult(selectedEntry);
  }, [selectedEntry]);
  const selectedDistance = stageDistance(currentAnimal.saju_stage, selectedEntry.saju_stage);
  const selectedStageKey = STAGE_LABEL_TO_KEY[selectedResult.stageName];

  return (
    <section className="rounded-[1.9rem] border border-[#bad7ed] bg-white/90 p-4 shadow-[0_16px_36px_rgba(58,109,153,0.14)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-lg font-black text-[#27557c]">{copy.dexTitle}</h3>
        <p className="text-xs font-bold text-[#557d9f]">{copy.dexDesc}</p>
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
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#c9deef] bg-white px-3 py-1 text-xs font-black text-[#426d90]">
            {selectedResult.stageName}({STAGE_KEY_TO_HANJA[selectedStageKey]})
          </span>
          <span className="rounded-full border border-[#d9d7a3] bg-[#fff8df] px-3 py-1 text-xs font-black text-[#7a6c2f]">
            {copy.relationTone(selectedDistance)}
          </span>
          {selectedResult.elementTags?.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-[#d7e8f5] bg-[#f8fcff] px-3 py-1 text-xs font-bold text-[#567b9b]">
              {tag}
            </span>
          ))}
        </div>
      </article>
    </section>
  );
}
