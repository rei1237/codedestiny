"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getAnimalDisplayData } from "../lib/animalMapping";
import type { AnimalDestinyData, AnimalDestinyInput, PartnerResult } from "../lib/types";

interface Props {
  animal: AnimalDestinyData;
  partner: PartnerResult;
  onSubmitPartner: (input: AnimalDestinyInput) => Promise<void>;
}

function CompatibilityCard({ label, animalName, reason }: { label: string; animalName: string; reason: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="rounded-2xl border border-[#EAD8B1] bg-white p-4 shadow-sm"
    >
      <p className="text-[10px] font-black tracking-widest text-[#B88E2F] uppercase">{label}</p>
      <p className="mt-1 text-lg font-black text-[#634832]">{animalName}</p>
      <p className="mt-2 text-xs leading-relaxed text-[#634832]/80">{reason}</p>
    </motion.div>
  );
}

export default function AnimalCompatibilityGrid({ animal, partner, onSubmitPartner }: Props) {
  const [partnerInput, setPartnerInput] = useState<AnimalDestinyInput>({
    name: "",
    birthDate: "",
    birthTime: "",
    gender: "unknown",
    calendarType: "solar",
    lunarLeap: false,
  });

  const bestName = getAnimalDisplayData(animal.compatibility.best.animal_id)?.animal_ko || animal.compatibility.best.animal_id;
  const goodName = getAnimalDisplayData(animal.compatibility.good.animal_id)?.animal_ko || animal.compatibility.good.animal_id;
  const challengingName = getAnimalDisplayData(animal.compatibility.challenging.animal_id)?.animal_ko || animal.compatibility.challenging.animal_id;
  const worstName = getAnimalDisplayData(animal.compatibility.worst.animal_id)?.animal_ko || animal.compatibility.worst.animal_id;
  const isLunar = (partnerInput.calendarType || "solar") === "lunar";

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <CompatibilityCard label="최고의 궁합" animalName={bestName} reason={animal.compatibility.best.reason} />
        <CompatibilityCard label="좋은 인연" animalName={goodName} reason={animal.compatibility.good.reason} />
        <CompatibilityCard label="조심할 인연" animalName={challengingName} reason={animal.compatibility.challenging.reason} />
        <CompatibilityCard label="피할 인연" animalName={worstName} reason={animal.compatibility.worst.reason} />
      </div>

      <div className="rounded-3xl border-2 border-dashed border-[#EAD8B1] bg-[#FFFBEB]/30 p-5">
        <p className="mb-4 text-center text-sm font-black text-[#634832]">상대방과의 실시간 궁합 분석</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={partnerInput.name || ""}
            onChange={(e) => setPartnerInput((prev) => ({ ...prev, name: e.target.value.slice(0, 20) }))}
            placeholder="상대 이름"
            className="h-12 rounded-xl border border-[#EAD8B1] bg-white px-4 text-sm text-[#634832] focus:border-[#B88E2F] focus:outline-none"
          />
          <input
            type="date"
            value={partnerInput.birthDate}
            onChange={(e) => setPartnerInput((prev) => ({ ...prev, birthDate: e.target.value }))}
            className="h-12 rounded-xl border border-[#EAD8B1] bg-white px-4 text-sm text-[#634832]"
          />
          <input
            type="time"
            value={partnerInput.birthTime || ""}
            onChange={(e) => setPartnerInput((prev) => ({ ...prev, birthTime: e.target.value }))}
            className="h-12 rounded-xl border border-[#EAD8B1] bg-white px-4 text-sm text-[#634832]"
          />
          <select
            value={partnerInput.calendarType || "solar"}
            onChange={(e) => setPartnerInput((prev) => ({ ...prev, calendarType: e.target.value as AnimalDestinyInput["calendarType"] }))}
            className="h-12 rounded-xl border border-[#EAD8B1] bg-white px-4 text-sm text-[#634832]"
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </div>

        {isLunar ? (
          <label className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-[#B88E2F]">
            <input
              type="checkbox"
              checked={Boolean(partnerInput.lunarLeap)}
              onChange={(e) => setPartnerInput((prev) => ({ ...prev, lunarLeap: e.target.checked }))}
              className="h-4 w-4 accent-[#634832]"
            />
            상대 출생월이 윤달이면 체크
          </label>
        ) : null}

        <button
          onClick={() => onSubmitPartner(partnerInput)}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#634832] text-sm font-black text-white shadow-md active:scale-[0.98]"
        >
          궁합 결과 확인하기
        </button>

        {partner.animalData ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4 rounded-2xl bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-[#EAD8B1]/40 pb-3">
              <p className="text-lg font-black text-[#634832]">{partner.relationType}</p>
              <span className="rounded-full bg-[#B88E2F] px-3 py-1 text-xs font-black text-white">{partner.score}점</span>
            </div>
            <div className="space-y-2 text-sm text-[#634832]">
              <p><span className="font-bold">분석 결과:</span> {partner.summary}</p>
              <p><span className="font-bold">끌림 포인트:</span> {partner.goodPoints.join(" · ")}</p>
              <p><span className="font-bold">주의할 점:</span> {partner.clashPoints.join(" · ")}</p>
              <p className="mt-3 rounded-lg bg-[#FFFBEB] p-3 text-xs italic">
                💡 {partner.tips[0]}
              </p>
            </div>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
