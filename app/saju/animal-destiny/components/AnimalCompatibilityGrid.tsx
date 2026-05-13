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
      className="rounded-xl border border-[#d9e7cf] bg-white/80 p-3 text-sm text-[#3d5240]"
      style={{ transformStyle: "preserve-3d" }}
    >
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6b7f68]">{label}</p>
      <p className="mt-1 text-base font-black text-[#2d3f2f]">{animalName}</p>
      <p className="mt-1 text-xs">{reason}</p>
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
  });

  const bestName = getAnimalDisplayData(animal.compatibility.best.animal_id)?.animal_ko || animal.compatibility.best.animal_id;
  const goodName = getAnimalDisplayData(animal.compatibility.good.animal_id)?.animal_ko || animal.compatibility.good.animal_id;
  const challengingName = getAnimalDisplayData(animal.compatibility.challenging.animal_id)?.animal_ko || animal.compatibility.challenging.animal_id;
  const worstName = getAnimalDisplayData(animal.compatibility.worst.animal_id)?.animal_ko || animal.compatibility.worst.animal_id;

  return (
    <section className="space-y-3 rounded-2xl border border-[#d8e3cf] bg-white/70 p-4">
      <h3 className="text-lg font-black text-[#2d3f2f]">궁합</h3>
      <div className="grid gap-2 md:grid-cols-2">
        <CompatibilityCard label="환상의 짝꿍" animalName={bestName} reason={animal.compatibility.best.reason} />
        <CompatibilityCard label="잘 맞는 동물" animalName={goodName} reason={animal.compatibility.good.reason} />
        <CompatibilityCard label="긴장감 있는 동물" animalName={challengingName} reason={animal.compatibility.challenging.reason} />
        <CompatibilityCard label="주의 동물" animalName={worstName} reason={animal.compatibility.worst.reason} />
      </div>

      <div className="rounded-xl border border-[#d8e3cf] bg-[#f8fff3] p-3">
        <p className="mb-2 text-sm font-bold text-[#2d3f2f]">상대방과 궁합 보기</p>
        <div className="grid gap-2 md:grid-cols-4">
          <input
            value={partnerInput.name || ""}
            onChange={(e) => setPartnerInput((prev) => ({ ...prev, name: e.target.value.slice(0, 20) }))}
            placeholder="상대 이름"
            className="rounded-lg border border-[#bdd2b7] px-2 py-2 text-sm"
          />
          <input
            type="date"
            value={partnerInput.birthDate}
            onChange={(e) => setPartnerInput((prev) => ({ ...prev, birthDate: e.target.value }))}
            className="rounded-lg border border-[#bdd2b7] px-2 py-2 text-sm"
          />
          <input
            type="time"
            value={partnerInput.birthTime || ""}
            onChange={(e) => setPartnerInput((prev) => ({ ...prev, birthTime: e.target.value }))}
            className="rounded-lg border border-[#bdd2b7] px-2 py-2 text-sm"
          />
          <button
            onClick={() => onSubmitPartner(partnerInput)}
            className="rounded-lg bg-[#5ac8a8] px-3 py-2 text-sm font-bold text-white"
          >
            궁합 계산
          </button>
        </div>

        {partner.animalData ? (
          <div className="mt-3 rounded-lg border border-[#d8e3cf] bg-white p-3 text-sm text-[#3f5241]">
            <p className="font-black">궁합 점수: {partner.score}점 ({partner.relationType})</p>
            <p className="mt-1 text-xs text-[#4e6253]">상대 핵심 십이운성: {partner.primaryStage || "-"}</p>
            {partner.stageEvidence ? <p className="mt-1 rounded-lg bg-[#eff8ea] p-2 text-xs font-semibold text-[#365139]">사주 근거: {partner.stageEvidence}</p> : null}
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
