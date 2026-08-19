"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useEffect, useState } from "react";
import type { AnimalDestinyInput } from "../lib/types";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type Props = {
  input: AnimalDestinyInput;
  onChange: (patch: Partial<AnimalDestinyInput>) => void;
  onSubmit: () => void;
  isBusy: boolean;
  canSubmit: boolean;
  error?: string;
};

const TWELVE_ANIMAL_INPUT_CARD_TEXT_TRANSLATIONS = {
  ko: {
    title: "운성 탐색 정보 입력",
    intro: "입력값은 기존 십이운성 계산 로직으로 안전하게 처리됩니다. 발자국 진행바를 따라 차례대로 입력해 보세요.",
    progress: "탐험 진행",
    stepBirthDate: "생년월일",
    stepTime: "시간",
    stepGender: "성별",
    nameLabel: "이름 또는 닉네임",
    namePlaceholder: "예: 별빛탐험가",
    birthDateLabel: "출생일",
    calendarLabel: "달력 타입",
    solar: "양력 (기본)",
    lunar: "음력",
    birthTimeLabel: "태어난 시간",
    timeHint: "시간을 모르면 비워도 계산이 진행됩니다.",
    genderLabel: "성별",
    genderUnknown: "성별 미선택",
    genderFemale: "여성",
    genderMale: "남성",
    lunarLeap: "윤달 출생입니다",
    errorPrefix: "🐾 입력을 다시 확인해 주세요:",
    busy: "운명의 동물을 찾는 중...",
    submit: "내 동물 찾기",
  },
  en: {
    title: "Enter Destiny Animal Details",
    intro: "Your input is processed safely through the existing twelve-stage calculation logic. Follow the paw progress bar step by step.",
    progress: "Exploration Progress",
    stepBirthDate: "Birth date",
    stepTime: "Time",
    stepGender: "Gender",
    nameLabel: "Name or nickname",
    namePlaceholder: "e.g. Starlight Explorer",
    birthDateLabel: "Birth date",
    calendarLabel: "Calendar type",
    solar: "Solar (default)",
    lunar: "Lunar",
    birthTimeLabel: "Birth time",
    timeHint: "If you do not know the time, leave it blank and the calculation will continue.",
    genderLabel: "Gender",
    genderUnknown: "Not selected",
    genderFemale: "Female",
    genderMale: "Male",
    lunarLeap: "Born in a leap lunar month",
    errorPrefix: "🐾 Please check your input again:",
    busy: "Finding your destiny animal...",
    submit: "Find My Animal",
  },
  ja: {
    title: "運星探索情報入力",
    intro: "入力値は既存の十二運星計算ロジックで安全に処理されます。足あと進行バーに沿って順番に入力してください。",
    progress: "探索進行",
    stepBirthDate: "生年月日",
    stepTime: "時間",
    stepGender: "性別",
    nameLabel: "名前またはニックネーム",
    namePlaceholder: "例：星明かり探検家",
    birthDateLabel: "出生日",
    calendarLabel: "暦タイプ",
    solar: "陽暦（基本）",
    lunar: "陰暦",
    birthTimeLabel: "出生時刻",
    timeHint: "時間が分からない場合は空欄でも計算できます。",
    genderLabel: "性別",
    genderUnknown: "性別未選択",
    genderFemale: "女性",
    genderMale: "男性",
    lunarLeap: "閏月生まれです",
    errorPrefix: "🐾 入力をもう一度確認してください:",
    busy: "運命の動物を探しています...",
    submit: "私の動物を探す",
  },
  "zh-CN": {
    title: "输入运星探索信息",
    intro: "输入值会通过现有十二运星计算逻辑安全处理。请沿着足迹进度条依次填写。",
    progress: "探索进度",
    stepBirthDate: "出生日期",
    stepTime: "时间",
    stepGender: "性别",
    nameLabel: "姓名或昵称",
    namePlaceholder: "例：星光探险家",
    birthDateLabel: "出生日期",
    calendarLabel: "历法类型",
    solar: "阳历（默认）",
    lunar: "阴历",
    birthTimeLabel: "出生时间",
    timeHint: "如果不知道时间，可以留空继续计算。",
    genderLabel: "性别",
    genderUnknown: "未选择性别",
    genderFemale: "女性",
    genderMale: "男性",
    lunarLeap: "出生月为闰月",
    errorPrefix: "🐾 请再次确认输入:",
    busy: "正在寻找你的命运动物...",
    submit: "寻找我的动物",
  },
  "zh-TW": {
    title: "輸入運星探索資訊",
    intro: "輸入值會透過現有十二運星計算邏輯安全處理。請沿著足跡進度條依序填寫。",
    progress: "探索進度",
    stepBirthDate: "出生日期",
    stepTime: "時間",
    stepGender: "性別",
    nameLabel: "姓名或暱稱",
    namePlaceholder: "例：星光探險家",
    birthDateLabel: "出生日期",
    calendarLabel: "曆法類型",
    solar: "陽曆（預設）",
    lunar: "陰曆",
    birthTimeLabel: "出生時間",
    timeHint: "如果不知道時間，可以留空繼續計算。",
    genderLabel: "性別",
    genderUnknown: "未選擇性別",
    genderFemale: "女性",
    genderMale: "男性",
    lunarLeap: "出生月為閏月",
    errorPrefix: "🐾 請再次確認輸入:",
    busy: "正在尋找你的命運動物...",
    submit: "尋找我的動物",
  },
} as const;

function getTwelveAnimalInputCardCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja" || locale === "zh-CN" || locale === "zh-TW") {
    return TWELVE_ANIMAL_INPUT_CARD_TEXT_TRANSLATIONS[locale];
  }
  return TWELVE_ANIMAL_INPUT_CARD_TEXT_TRANSLATIONS.ko;
}

function getStep(input: AnimalDestinyInput) {
  if (!input.birthDate) return 0;
  if (!input.birthTime) return 1;
  if (input.gender === "unknown") return 2;
  return 3;
}

export default function TwelveAnimalInputCard({ input, onChange, onSubmit, isBusy, canSubmit, error }: Props) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getTwelveAnimalInputCardCopy(locale);
  const steps = [copy.stepBirthDate, copy.stepTime, copy.stepGender];
  const isLunar = (input.calendarType || "solar") === "lunar";
  const currentStep = getStep(input);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    return () => window.removeEventListener("cd:locale-ready", syncLocale);
  }, []);

  return (
    <section className="space-y-5 rounded-[2rem] border border-[#b8d4eb] bg-[linear-gradient(158deg,#f8fcff_0%,#f7fbff_45%,#fff6ea_100%)] p-5 text-[#2f5677] shadow-[0_20px_46px_rgba(62,110,154,0.15)] sm:p-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-black tracking-tight text-[#214968]">{copy.title}</h2>
        <p className="text-sm font-semibold leading-relaxed text-[#3f6789]">
          {copy.intro}
        </p>
      </div>

      <div className="space-y-2 rounded-2xl border border-[#c8ddf0] bg-white/82 p-3">
        <div className="flex items-center justify-between text-xs font-black text-[#3c678d]">
          <span>{copy.progress}</span>
          <span>{Math.min(currentStep, 3)} / 3</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`rounded-xl px-2 py-2 text-center text-[11px] font-bold ${index < currentStep ? "bg-[#e4f5e7] text-[#2f7741]" : "bg-[#edf4fb] text-[#5c7e9d]"}`}
            >
              <span className="mr-1">🐾</span>
              {step}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-bold text-[#2b5376]">
          {copy.nameLabel}
          <input
            value={input.name || ""}
            onChange={(e) => onChange({ name: e.target.value.slice(0, 20) })}
            placeholder={copy.namePlaceholder}
            className="min-h-[46px] w-full rounded-2xl border border-[#bfd8eb] bg-white px-4 py-3 text-base text-[#315c7f] placeholder:text-[#7ca0be] focus:border-[#4f8fbe] focus:outline-none"
          />
        </label>

        <label className="space-y-2 text-sm font-bold text-[#2b5376]">
          {copy.birthDateLabel} <span className="text-rose-600">*</span>
          <input
            {...birthDateTextInputProps(input.birthDate, (nextBirthDate) => onChange({ birthDate: nextBirthDate }))}
            className="min-h-[46px] w-full rounded-2xl border border-[#bfd8eb] bg-white px-4 py-3 text-base text-[#315c7f] focus:border-[#4f8fbe] focus:outline-none"
          />
        </label>

        <label className="space-y-2 text-sm font-bold text-[#2b5376]">
          {copy.calendarLabel}
          <select
            value={input.calendarType || "solar"}
            onChange={(e) => onChange({ calendarType: e.target.value as AnimalDestinyInput["calendarType"] })}
            className="min-h-[46px] w-full appearance-none rounded-2xl border border-[#bfd8eb] bg-white px-4 py-3 text-base text-[#315c7f] focus:border-[#4f8fbe] focus:outline-none"
          >
            <option value="solar">{copy.solar}</option>
            <option value="lunar">{copy.lunar}</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-bold text-[#2b5376]">
          {copy.birthTimeLabel}
          <input
            type="time"
            value={input.birthTime || ""}
            onChange={(e) => onChange({ birthTime: e.target.value })}
            className="min-h-[46px] w-full rounded-2xl border border-[#bfd8eb] bg-white px-4 py-3 text-base text-[#315c7f] focus:border-[#4f8fbe] focus:outline-none"
          />
          <span className="block text-[11px] font-medium text-[#6182a0]">{copy.timeHint}</span>
        </label>

        <label className="space-y-2 text-sm font-bold text-[#2b5376]">
          {copy.genderLabel}
          <select
            value={input.gender}
            onChange={(e) => onChange({ gender: e.target.value as AnimalDestinyInput["gender"] })}
            className="min-h-[46px] w-full appearance-none rounded-2xl border border-[#bfd8eb] bg-white px-4 py-3 text-base text-[#315c7f] focus:border-[#4f8fbe] focus:outline-none"
          >
            <option value="unknown">{copy.genderUnknown}</option>
            <option value="female">{copy.genderFemale}</option>
            <option value="male">{copy.genderMale}</option>
          </select>
        </label>

        {isLunar ? (
          <label className="flex min-h-[46px] cursor-pointer items-center gap-3 rounded-2xl border border-[#bfd8eb] bg-[#f3f8ff] px-4 py-3 text-sm font-bold text-[#2f5f87] md:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(input.lunarLeap)}
              onChange={(e) => onChange({ lunarLeap: e.target.checked })}
              className="h-5 w-5 accent-[#3e84ba]"
            />
            {copy.lunarLeap}
          </label>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#f0b2b2] bg-[#fff4f4] px-4 py-3 text-sm font-semibold text-[#b34d4d]">
          {copy.errorPrefix} {error}
        </div>
      ) : null}

      <button
        onClick={onSubmit}
        disabled={!canSubmit || isBusy}
        className="group relative min-h-[48px] w-full overflow-hidden rounded-[1.6rem] bg-[linear-gradient(130deg,#3e84ba,#5cb8d6,#f2c774)] py-4 text-lg font-black text-white shadow-[0_15px_30px_rgba(62,132,186,0.3)] transition active:scale-[0.98] disabled:opacity-50 hover:brightness-105"
      >
        <div className="absolute inset-0 translate-x-[-100%] bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.2),transparent)] group-hover:animate-[shimmer_2s_infinite]" />
        <span className="relative inline-flex items-center gap-2">
          <span className="text-[20px]">🐾</span>
          {isBusy ? copy.busy : copy.submit}
        </span>
      </button>
    </section>
  );
}
