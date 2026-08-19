"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useEffect, useState } from "react";
import type { AnimalDestinyInput } from "../lib/types";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface Props {
  input: AnimalDestinyInput;
  onChange: (patch: Partial<AnimalDestinyInput>) => void;
  onSubmit: () => void;
  isBusy: boolean;
  canSubmit: boolean;
}

const ANIMAL_DESTINY_INPUT_FORM_TEXT_TRANSLATIONS = {
  ko: {
    title: "운명의 명식 입력",
    introTop: "당신의 태어난 순간을 입력해 주세요.",
    introBottom: "별들이 당신의 수호 동물을 안내해 드립니다.",
    badgeReport: "정밀 리딩 리포트",
    badgeTime: "분석: 약 20초",
    badgeCompatibility: "궁합 리딩 포함",
    nameLabel: "이름 또는 닉네임",
    namePlaceholder: "예: 별빛여우",
    birthDateLabel: "출생일",
    calendarLabel: "달력 타입",
    solar: "양력 (기본)",
    lunar: "음력",
    birthTimeLabel: "태어난 시간",
    timeHint: "* 시간을 모르면 비워두셔도 됩니다.",
    genderLabel: "성별",
    genderUnknown: "성별 미선택",
    genderFemale: "여성",
    genderMale: "남성",
    lunarLeap: "윤달 출생입니다",
    busy: "별의 흐름을 읽는 중...",
    submit: "결과 보기",
    footer: "정밀 사주 엔진이 당신의 십이운성을 계산합니다.",
  },
  en: {
    title: "Enter Destiny Birth Chart",
    introTop: "Enter the moment you were born.",
    introBottom: "The stars will guide you to your guardian animal.",
    badgeReport: "Detailed Reading Report",
    badgeTime: "Analysis: about 20 sec",
    badgeCompatibility: "Includes Compatibility Reading",
    nameLabel: "Name or nickname",
    namePlaceholder: "e.g. Starlight Fox",
    birthDateLabel: "Birth date",
    calendarLabel: "Calendar type",
    solar: "Solar (default)",
    lunar: "Lunar",
    birthTimeLabel: "Birth time",
    timeHint: "* If you do not know the time, you may leave it blank.",
    genderLabel: "Gender",
    genderUnknown: "Not selected",
    genderFemale: "Female",
    genderMale: "Male",
    lunarLeap: "Born in a leap lunar month",
    busy: "Reading the flow of the stars...",
    submit: "View Result",
    footer: "The precision Saju engine calculates your twelve-stage destiny.",
  },
  ja: {
    title: "運命の命式入力",
    introTop: "あなたが生まれた瞬間を入力してください。",
    introBottom: "星々があなたの守護動物へ案内します。",
    badgeReport: "精密リーディングレポート",
    badgeTime: "分析：約20秒",
    badgeCompatibility: "相性リーディング含む",
    nameLabel: "名前またはニックネーム",
    namePlaceholder: "例：星明かり狐",
    birthDateLabel: "出生日",
    calendarLabel: "暦タイプ",
    solar: "陽暦（基本）",
    lunar: "陰暦",
    birthTimeLabel: "出生時刻",
    timeHint: "* 時間が分からない場合は空欄でもかまいません。",
    genderLabel: "性別",
    genderUnknown: "性別未選択",
    genderFemale: "女性",
    genderMale: "男性",
    lunarLeap: "閏月生まれです",
    busy: "星の流れを読んでいます...",
    submit: "結果を見る",
    footer: "精密四柱エンジンがあなたの十二運星を計算します。",
  },
  "zh-CN": {
    title: "输入命运命盘",
    introTop: "请输入你出生的那一刻。",
    introBottom: "星辰会指引你的守护动物。",
    badgeReport: "精密解读报告",
    badgeTime: "分析：约20秒",
    badgeCompatibility: "包含合盘解读",
    nameLabel: "姓名或昵称",
    namePlaceholder: "例：星光狐狸",
    birthDateLabel: "出生日期",
    calendarLabel: "历法类型",
    solar: "阳历（默认）",
    lunar: "阴历",
    birthTimeLabel: "出生时间",
    timeHint: "* 如果不知道时间，可以留空。",
    genderLabel: "性别",
    genderUnknown: "未选择性别",
    genderFemale: "女性",
    genderMale: "男性",
    lunarLeap: "出生月为闰月",
    busy: "正在读取星辰流向...",
    submit: "查看结果",
    footer: "精密四柱引擎会计算你的十二运星。",
  },
  "zh-TW": {
    title: "輸入命運命盤",
    introTop: "請輸入你出生的那一刻。",
    introBottom: "星辰會指引你的守護動物。",
    badgeReport: "精密解讀報告",
    badgeTime: "分析：約20秒",
    badgeCompatibility: "包含合盤解讀",
    nameLabel: "姓名或暱稱",
    namePlaceholder: "例：星光狐狸",
    birthDateLabel: "出生日期",
    calendarLabel: "曆法類型",
    solar: "陽曆（預設）",
    lunar: "陰曆",
    birthTimeLabel: "出生時間",
    timeHint: "* 如果不知道時間，可以留空。",
    genderLabel: "性別",
    genderUnknown: "未選擇性別",
    genderFemale: "女性",
    genderMale: "男性",
    lunarLeap: "出生月為閏月",
    busy: "正在讀取星辰流向...",
    submit: "查看結果",
    footer: "精密四柱引擎會計算你的十二運星。",
  },
} as const;

function getAnimalDestinyInputFormCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja" || locale === "zh-CN" || locale === "zh-TW") {
    return ANIMAL_DESTINY_INPUT_FORM_TEXT_TRANSLATIONS[locale];
  }
  return ANIMAL_DESTINY_INPUT_FORM_TEXT_TRANSLATIONS.ko;
}

export default function AnimalDestinyInputForm({ input, onChange, onSubmit, isBusy, canSubmit }: Props) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getAnimalDestinyInputFormCopy(locale);
  const isLunar = (input.calendarType || "solar") === "lunar";

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    return () => window.removeEventListener("cd:locale-ready", syncLocale);
  }, []);

  return (
    <section className="space-y-6 rounded-[2.2rem] border border-[#dcc39b] bg-[linear-gradient(158deg,#fff8ea_0%,#fdf1dc_52%,#fae7c5_100%)] p-5 text-[#6b3f1d] shadow-[0_18px_48px_rgba(120,82,34,0.16)] sm:p-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-black tracking-tight text-[#6b3f1d]">{copy.title}</h2>
        <p className="text-sm font-semibold leading-relaxed text-[#7f542e]">
          {copy.introTop}<br />{copy.introBottom}
        </p>
      </div>

      <div className="grid gap-2 text-[11px] font-black sm:grid-cols-3">
        <div className="rounded-xl border border-[#e5c998] bg-[#fff4dc] px-3 py-2 text-[#7f5822]">{copy.badgeReport}</div>
        <div className="rounded-xl border border-[#d7c5a1] bg-[#fff7ea] px-3 py-2 text-[#6b3f1d]">{copy.badgeTime}</div>
        <div className="rounded-xl border border-[#ced8ae] bg-[#f4f8e7] px-3 py-2 text-[#5a6a35]">{copy.badgeCompatibility}</div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-bold text-[#6b3f1d]">
          {copy.nameLabel}
          <input
            value={input.name || ""}
            onChange={(e) => onChange({ name: e.target.value.slice(0, 20) })}
            placeholder={copy.namePlaceholder}
            className="min-h-[46px] w-full rounded-2xl border border-[#dcc39b] bg-white px-4 py-3 text-base text-[#5f3818] placeholder:text-[#b18f66] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8a5a2b] focus:outline-none"
          />
        </label>

        <label className="space-y-2 text-sm font-bold text-[#6b3f1d]">
          {copy.birthDateLabel} <span className="text-rose-600">*</span>
          <input
            {...birthDateTextInputProps(input.birthDate, (nextBirthDate) => onChange({ birthDate: nextBirthDate }))}
            className="min-h-[46px] w-full rounded-2xl border border-[#dcc39b] bg-white px-4 py-3 text-base text-[#5f3818] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8a5a2b] focus:outline-none"
          />
        </label>

        <label className="space-y-2 text-sm font-bold text-[#6b3f1d]">
          {copy.calendarLabel}
          <select
            value={input.calendarType || "solar"}
            onChange={(e) => onChange({ calendarType: e.target.value as AnimalDestinyInput["calendarType"] })}
            className="min-h-[46px] w-full appearance-none rounded-2xl border border-[#dcc39b] bg-white px-4 py-3 text-base text-[#5f3818] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8a5a2b] focus:outline-none"
          >
            <option value="solar">{copy.solar}</option>
            <option value="lunar">{copy.lunar}</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-bold text-[#6b3f1d]">
          {copy.birthTimeLabel}
          <input
            type="time"
            value={input.birthTime || ""}
            onChange={(e) => onChange({ birthTime: e.target.value })}
            className="min-h-[46px] w-full rounded-2xl border border-[#dcc39b] bg-white px-4 py-3 text-base text-[#5f3818] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8a5a2b] focus:outline-none"
          />
          <span className="block px-1 text-[11px] font-medium text-[#8f6b47]">
            {copy.timeHint}
          </span>
        </label>

        <label className="space-y-2 text-sm font-bold text-[#6b3f1d]">
          {copy.genderLabel}
          <select
            value={input.gender}
            onChange={(e) => onChange({ gender: e.target.value as AnimalDestinyInput["gender"] })}
            className="min-h-[46px] w-full appearance-none rounded-2xl border border-[#dcc39b] bg-white px-4 py-3 text-base text-[#5f3818] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8a5a2b] focus:outline-none"
          >
            <option value="unknown">{copy.genderUnknown}</option>
            <option value="female">{copy.genderFemale}</option>
            <option value="male">{copy.genderMale}</option>
          </select>
        </label>

        {isLunar ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#dcc39b] bg-[#fff4de] px-4 py-3 text-sm font-bold text-[#6b3f1d] transition-colors hover:bg-[#faeccf] md:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(input.lunarLeap)}
              onChange={(e) => onChange({ lunarLeap: e.target.checked })}
              className="h-5 w-5 accent-[#8a5a2b]"
            />
            {copy.lunarLeap}
          </label>
        ) : null}
      </div>

      <button
        onClick={onSubmit}
        disabled={!canSubmit || isBusy}
        className="group relative mt-4 min-h-[48px] w-full overflow-hidden rounded-[1.8rem] bg-[linear-gradient(130deg,#8a5a2b,#d88a35,#7f8f52)] py-4 text-lg font-black text-white shadow-[0_15px_30px_rgba(111,66,29,0.35)] transition-all active:scale-[0.98] disabled:opacity-50 hover:scale-[1.01]"
      >
        <div className="absolute inset-0 translate-x-[-100%] bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.18),transparent)] group-hover:animate-[shimmer_2s_infinite]" />
        <span className="relative inline-flex items-center gap-2">
          <span className="text-[20px]">🐾</span>
          {isBusy ? copy.busy : copy.submit}
        </span>
      </button>

      <p className="text-center text-[11px] font-semibold italic text-[#8a5a2b]">
        {copy.footer}
      </p>
    </section>
  );
}
