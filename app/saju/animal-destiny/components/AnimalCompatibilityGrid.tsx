"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getAnimalDisplayData } from "../lib/animalMapping";
import type { AnimalDestinyData, AnimalDestinyInput, PartnerResult } from "../lib/types";

const ANIMAL_COMPATIBILITY_GRID_TEXT_TRANSLATIONS = {
  ko: {
    best: "최고의 궁합",
    good: "좋은 인연",
    challenging: "조심할 인연",
    worst: "피할 인연",
    partnerTitle: "상대방과의 실시간 궁합 분석",
    partnerNamePlaceholder: "상대 이름",
    solar: "양력",
    lunar: "음력",
    lunarLeap: "상대 출생월이 윤달이면 체크",
    submit: "궁합 결과 확인하기",
    scoreSuffix: "점",
    resultLabel: "분석 결과:",
    primaryStageLabel: "대표 운성:",
    attractionLabel: "끌림 포인트:",
    cautionLabel: "주의할 점:",
    evidenceLabel: "사주 근거:",
    unknown: "미확인",
  },
  en: {
    best: "Best Match",
    good: "Good Connection",
    challenging: "Needs Care",
    worst: "Avoid This Match",
    partnerTitle: "Real-Time Compatibility Analysis",
    partnerNamePlaceholder: "Partner name",
    solar: "Solar",
    lunar: "Lunar",
    lunarLeap: "Check if the partner's birth month is a leap lunar month",
    submit: "View Compatibility Result",
    scoreSuffix: "pts",
    resultLabel: "Analysis:",
    primaryStageLabel: "Primary stage:",
    attractionLabel: "Attraction points:",
    cautionLabel: "Cautions:",
    evidenceLabel: "Saju evidence:",
    unknown: "Not confirmed",
  },
  ja: {
    best: "最高の相性",
    good: "よいご縁",
    challenging: "注意したいご縁",
    worst: "避けたいご縁",
    partnerTitle: "相手とのリアルタイム相性分析",
    partnerNamePlaceholder: "相手の名前",
    solar: "陽暦",
    lunar: "陰暦",
    lunarLeap: "相手の出生月が閏月ならチェック",
    submit: "相性結果を確認",
    scoreSuffix: "点",
    resultLabel: "分析結果:",
    primaryStageLabel: "代表運星:",
    attractionLabel: "惹かれる点:",
    cautionLabel: "注意点:",
    evidenceLabel: "四柱根拠:",
    unknown: "未確認",
  },
  "zh-CN": {
    best: "最佳合盘",
    good: "良好缘分",
    challenging: "需要留意的缘分",
    worst: "建议避开的缘分",
    partnerTitle: "与对方的实时合盘分析",
    partnerNamePlaceholder: "对方姓名",
    solar: "阳历",
    lunar: "阴历",
    lunarLeap: "如果对方出生月为闰月请勾选",
    submit: "查看合盘结果",
    scoreSuffix: "分",
    resultLabel: "分析结果:",
    primaryStageLabel: "代表运星:",
    attractionLabel: "吸引点:",
    cautionLabel: "注意点:",
    evidenceLabel: "四柱依据:",
    unknown: "未确认",
  },
  "zh-TW": {
    best: "最佳合盤",
    good: "良好緣分",
    challenging: "需要留意的緣分",
    worst: "建議避開的緣分",
    partnerTitle: "與對方的即時合盤分析",
    partnerNamePlaceholder: "對方姓名",
    solar: "陽曆",
    lunar: "陰曆",
    lunarLeap: "如果對方出生月為閏月請勾選",
    submit: "查看合盤結果",
    scoreSuffix: "分",
    resultLabel: "分析結果:",
    primaryStageLabel: "代表運星:",
    attractionLabel: "吸引點:",
    cautionLabel: "注意點:",
    evidenceLabel: "四柱依據:",
    unknown: "未確認",
  },
} as const;

function getAnimalCompatibilityGridCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja" || locale === "zh-CN" || locale === "zh-TW") {
    return ANIMAL_COMPATIBILITY_GRID_TEXT_TRANSLATIONS[locale];
  }
  return ANIMAL_COMPATIBILITY_GRID_TEXT_TRANSLATIONS.ko;
}

interface Props {
  animal: AnimalDestinyData;
  partner: PartnerResult;
  onSubmitPartner: (input: AnimalDestinyInput) => Promise<void>;
}

function CompatibilityCard({ label, animalName, reason }: { label: string; animalName: string; reason: string }) {
  return (
    <m.div
      whileHover={{ scale: 1.02 }}
      className="rounded-2xl border border-[#EAD8B1] bg-white p-4 shadow-sm"
    >
      <p className="text-[10px] font-black tracking-widest text-[#B88E2F] uppercase">{label}</p>
      <p className="mt-1 text-lg font-black text-[#634832]">{animalName}</p>
      <p className="mt-2 text-xs leading-relaxed text-[#634832]/80">{reason}</p>
    </m.div>
  );
}

export default function AnimalCompatibilityGrid({ animal, partner, onSubmitPartner }: Props) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
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
  const copy = getAnimalCompatibilityGridCopy(locale);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    return () => window.removeEventListener("cd:locale-ready", syncLocale);
  }, []);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <CompatibilityCard label={copy.best} animalName={bestName} reason={animal.compatibility.best.reason} />
        <CompatibilityCard label={copy.good} animalName={goodName} reason={animal.compatibility.good.reason} />
        <CompatibilityCard label={copy.challenging} animalName={challengingName} reason={animal.compatibility.challenging.reason} />
        <CompatibilityCard label={copy.worst} animalName={worstName} reason={animal.compatibility.worst.reason} />
      </div>

      <div className="rounded-3xl border-2 border-dashed border-[#EAD8B1] bg-[#FFFBEB]/30 p-5">
        <p className="mb-4 text-center text-sm font-black text-[#634832]">{copy.partnerTitle}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={partnerInput.name || ""}
            onChange={(e) => setPartnerInput((prev) => ({ ...prev, name: e.target.value.slice(0, 20) }))}
            placeholder={copy.partnerNamePlaceholder}
            className="h-12 rounded-xl border border-[#EAD8B1] bg-white px-4 text-sm text-[#634832] focus:border-[#B88E2F] focus:outline-none"
          />
          <input
            {...birthDateTextInputProps(partnerInput.birthDate, (nextBirthDate) => setPartnerInput((prev) => ({ ...prev, birthDate: nextBirthDate })))}
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
            <option value="solar">{copy.solar}</option>
            <option value="lunar">{copy.lunar}</option>
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
            {copy.lunarLeap}
          </label>
        ) : null}

        <button
          onClick={() => onSubmitPartner(partnerInput)}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#634832] text-sm font-black text-white shadow-md active:scale-[0.98]"
        >
          {copy.submit}
        </button>

        {partner.animalData ? (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4 rounded-2xl bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-[#EAD8B1]/40 pb-3">
              <p className="text-lg font-black text-[#634832]">{partner.relationType}</p>
              <span className="rounded-full bg-[#B88E2F] px-3 py-1 text-xs font-black text-white">{partner.score}{copy.scoreSuffix}</span>
            </div>
            <div className="space-y-2 text-sm text-[#634832]">
              <p><span className="font-bold">{copy.resultLabel}</span> {partner.summary}</p>
              <p><span className="font-bold">{copy.primaryStageLabel}</span> {partner.primaryStage || copy.unknown}</p>
              <p><span className="font-bold">{copy.attractionLabel}</span> {partner.goodPoints.join(" · ")}</p>
              <p><span className="font-bold">{copy.cautionLabel}</span> {partner.clashPoints.join(" · ")}</p>
              {partner.stageEvidence ? (
                <p className="rounded-lg bg-[#f9f3e4] p-2 text-xs"><span className="font-bold">{copy.evidenceLabel}</span> {partner.stageEvidence}</p>
              ) : null}
              <p className="mt-3 rounded-lg bg-[#FFFBEB] p-3 text-xs italic">
                💡 {partner.tips[0]}
              </p>
            </div>
          </m.div>
        ) : null}
      </div>
    </section>
  );
}
