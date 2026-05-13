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
      whileHover={{ rotateY: 7 }}
      className="rounded-xl border border-cyan-100/25 bg-cyan-50/10 p-3 text-sm text-cyan-50"
      style={{ transformStyle: "preserve-3d" }}
    >
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-100/80">{label}</p>
      <p className="mt-1 text-base font-black text-white">{animalName}</p>
      <p className="mt-1 text-xs leading-relaxed text-cyan-50/85">{reason}</p>
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
    <section className="space-y-3 rounded-2xl border border-cyan-100/20 bg-[linear-gradient(160deg,rgba(10,31,59,0.72),rgba(10,20,45,0.7))] p-4">
      <h3 className="text-lg font-black text-cyan-50">궁합 공명 분석</h3>
      <div className="grid gap-2 md:grid-cols-2">
        <CompatibilityCard label="환상의 짝꿍" animalName={bestName} reason={animal.compatibility.best.reason} />
        <CompatibilityCard label="잘 맞는 동물" animalName={goodName} reason={animal.compatibility.good.reason} />
        <CompatibilityCard label="긴장감 있는 동물" animalName={challengingName} reason={animal.compatibility.challenging.reason} />
        <CompatibilityCard label="주의 동물" animalName={worstName} reason={animal.compatibility.worst.reason} />
      </div>

      <div className="rounded-xl border border-cyan-100/25 bg-cyan-50/10 p-3">
        <p className="mb-2 text-sm font-bold text-cyan-50">상대방 정보 입력</p>
        <div className="grid gap-2 md:grid-cols-5">
          <input
            value={partnerInput.name || ""}
            onChange={(e) => setPartnerInput((prev) => ({ ...prev, name: e.target.value.slice(0, 20) }))}
            placeholder="상대 이름"
            className="rounded-lg border border-cyan-100/35 bg-cyan-50/10 px-2 py-2 text-sm text-cyan-50 placeholder:text-cyan-100/45"
          />
          <input
            type="date"
            value={partnerInput.birthDate}
            onChange={(e) => setPartnerInput((prev) => ({ ...prev, birthDate: e.target.value }))}
            className="rounded-lg border border-cyan-100/35 bg-cyan-50/10 px-2 py-2 text-sm text-cyan-50"
          />
          <input
            type="time"
            value={partnerInput.birthTime || ""}
            onChange={(e) => setPartnerInput((prev) => ({ ...prev, birthTime: e.target.value }))}
            className="rounded-lg border border-cyan-100/35 bg-cyan-50/10 px-2 py-2 text-sm text-cyan-50"
          />
          <select
            value={partnerInput.calendarType || "solar"}
            onChange={(e) => setPartnerInput((prev) => ({ ...prev, calendarType: e.target.value as AnimalDestinyInput["calendarType"] }))}
            className="rounded-lg border border-cyan-100/35 bg-cyan-50/10 px-2 py-2 text-sm text-cyan-50"
          >
            <option value="solar" className="text-slate-900">양력</option>
            <option value="lunar" className="text-slate-900">음력</option>
          </select>
          <button
            onClick={() => onSubmitPartner(partnerInput)}
            className="rounded-lg bg-[linear-gradient(120deg,#33d3ff,#6fa9ff)] px-3 py-2 text-sm font-bold text-[#071228]"
          >
            궁합 계산
          </button>
        </div>

        {isLunar ? (
          <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-fuchsia-100">
            <input
              type="checkbox"
              checked={Boolean(partnerInput.lunarLeap)}
              onChange={(e) => setPartnerInput((prev) => ({ ...prev, lunarLeap: e.target.checked }))}
              className="h-4 w-4 accent-fuchsia-300"
            />
            상대 출생월이 윤달이면 체크
          </label>
        ) : null}

        {partner.animalData ? (
          <div className="mt-3 rounded-lg border border-cyan-100/30 bg-slate-950/35 p-3 text-sm text-cyan-50">
            <p className="font-black text-white">궁합 점수: {partner.score}점 ({partner.relationType})</p>
            <p className="mt-1 text-xs text-cyan-100/75">상대 핵심 십이운성: {partner.primaryStage || "-"}</p>
            {partner.stageEvidence ? <p className="mt-1 rounded-lg bg-cyan-100/10 p-2 text-xs font-semibold text-cyan-100">사주 근거: {partner.stageEvidence}</p> : null}
            <p className="mt-1">관계 타입: {partner.summary}</p>
            <p className="mt-1"><span className="font-bold">잘 맞는 포인트:</span> {partner.goodPoints.join(" · ")}</p>
            <p className="mt-1"><span className="font-bold">충돌 포인트:</span> {partner.clashPoints.join(" · ")}</p>
            <p className="mt-1"><span className="font-bold">유지 팁:</span> {partner.tips.join(" · ")}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
