"use client";

import { useEffect, useState } from "react";
import type { FptiFormInput } from "@/lib/fpti/fpti-types";
import { formatBirthDateDigits, normalizeBirthDateFromDigits } from "@/lib/birthDateInput";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import styles from "./FptiCosmic.module.css";

const FPTI_INPUT_FORM_TEXT_TRANSLATIONS = {
  ko: {
    title: "출생 정보 입력",
    subtitle: "입력이 완료되면 별자리 성향 관측이 자동으로 시작됩니다.",
    autoMode: "입력 감지 자동 모드",
    statusRunning: "성향 관측 진행 중",
    statusReady: "자동 관측 준비 완료",
    statusWaiting: "필수 입력 대기 중",
    nameLabel: "이름 또는 닉네임",
    namePlaceholder: "예: 홍길동",
    genderLabel: "성별 (선택)",
    genderOther: "선택 안함",
    genderMale: "남성",
    genderFemale: "여성",
    birthDateLabel: "생년월일",
    calendarLabel: "양력 / 음력",
    calendarSolar: "양력",
    calendarLunar: "음력",
    calendarLeap: "윤달",
    birthTimeLabel: "태어난 시간",
    birthRegionLabel: "태어난 지역 (선택)",
    birthRegionPlaceholder: "예: 서울",
    timeUnknownLabel: "태어난 시간을 모름 (시주 제외)",
    timeUnknownNotice: "태어난 시간을 모르면 일부 분석은 간략화되며, 결과의 세부 해석 폭이 줄어들 수 있습니다.",
    submitBusy: "관측 중...",
    submitIdle: "운명 성향 분석 시작",
    footerHelp: "기본 결과 후 심층 리포트에서 챕터별 상세 해석을 확인할 수 있습니다.",
  },
  en: {
    title: "Enter Birth Details",
    subtitle: "Once the required fields are complete, the personality observation begins automatically.",
    autoMode: "Input-detection auto mode",
    statusRunning: "Observing personality patterns",
    statusReady: "Auto observation ready",
    statusWaiting: "Waiting for required fields",
    nameLabel: "Name or nickname",
    namePlaceholder: "e.g. Alex",
    genderLabel: "Gender (optional)",
    genderOther: "Prefer not to say",
    genderMale: "Male",
    genderFemale: "Female",
    birthDateLabel: "Date of birth",
    calendarLabel: "Solar / Lunar",
    calendarSolar: "Solar",
    calendarLunar: "Lunar",
    calendarLeap: "Leap month",
    birthTimeLabel: "Birth time",
    birthRegionLabel: "Birth region (optional)",
    birthRegionPlaceholder: "e.g. Seoul",
    timeUnknownLabel: "I do not know my birth time (exclude hour pillar)",
    timeUnknownNotice: "If the birth time is unknown, some analysis will be simplified and detailed interpretation may be narrower.",
    submitBusy: "Observing...",
    submitIdle: "Start Destiny Personality Analysis",
    footerHelp: "After the basic result, the deep report opens detailed chapter-by-chapter interpretation.",
  },
  ja: {
    title: "出生情報を入力",
    subtitle: "入力が完了すると、星の性向観測が自動で始まります。",
    autoMode: "入力検知自動モード",
    statusRunning: "性向を観測中",
    statusReady: "自動観測の準備完了",
    statusWaiting: "必須入力を待っています",
    nameLabel: "名前またはニックネーム",
    namePlaceholder: "例：太郎",
    genderLabel: "性別（任意）",
    genderOther: "選択しない",
    genderMale: "男性",
    genderFemale: "女性",
    birthDateLabel: "生年月日",
    calendarLabel: "陽暦 / 陰暦",
    calendarSolar: "陽暦",
    calendarLunar: "陰暦",
    calendarLeap: "閏月",
    birthTimeLabel: "出生時刻",
    birthRegionLabel: "出生地（任意）",
    birthRegionPlaceholder: "例：ソウル",
    timeUnknownLabel: "出生時刻が不明（時柱を除外）",
    timeUnknownNotice: "出生時刻が不明な場合、一部の分析は簡略化され、細部の解釈幅が狭くなることがあります。",
    submitBusy: "観測中...",
    submitIdle: "運命性向分析を始める",
    footerHelp: "基本結果の後、深層レポートで章ごとの詳しい解釈を確認できます。",
  },
  "zh-CN": {
    title: "输入出生信息",
    subtitle: "必填信息完成后，星象性格观测会自动开始。",
    autoMode: "输入感知自动模式",
    statusRunning: "正在观测性格倾向",
    statusReady: "自动观测准备完成",
    statusWaiting: "等待必填信息",
    nameLabel: "姓名或昵称",
    namePlaceholder: "例：小明",
    genderLabel: "性别（可选）",
    genderOther: "不选择",
    genderMale: "男性",
    genderFemale: "女性",
    birthDateLabel: "出生日期",
    calendarLabel: "阳历 / 阴历",
    calendarSolar: "阳历",
    calendarLunar: "阴历",
    calendarLeap: "闰月",
    birthTimeLabel: "出生时间",
    birthRegionLabel: "出生地区（可选）",
    birthRegionPlaceholder: "例：首尔",
    timeUnknownLabel: "不知道出生时间（排除时柱）",
    timeUnknownNotice: "如果不知道出生时间，部分分析会简化，结果的细节解读范围也可能缩小。",
    submitBusy: "观测中...",
    submitIdle: "开始命运性格分析",
    footerHelp: "基础结果之后，可在深度报告中查看逐章详细解读。",
  },
  "zh-TW": {
    title: "輸入出生資訊",
    subtitle: "必填資訊完成後，星象性格觀測會自動開始。",
    autoMode: "輸入感知自動模式",
    statusRunning: "正在觀測性格傾向",
    statusReady: "自動觀測準備完成",
    statusWaiting: "等待必填資訊",
    nameLabel: "姓名或暱稱",
    namePlaceholder: "例：小明",
    genderLabel: "性別（可選）",
    genderOther: "不選擇",
    genderMale: "男性",
    genderFemale: "女性",
    birthDateLabel: "出生日期",
    calendarLabel: "陽曆 / 陰曆",
    calendarSolar: "陽曆",
    calendarLunar: "陰曆",
    calendarLeap: "閏月",
    birthTimeLabel: "出生時間",
    birthRegionLabel: "出生地區（可選）",
    birthRegionPlaceholder: "例：首爾",
    timeUnknownLabel: "不知道出生時間（排除時柱）",
    timeUnknownNotice: "如果不知道出生時間，部分分析會簡化，結果的細節解讀範圍也可能縮小。",
    submitBusy: "觀測中...",
    submitIdle: "開始命運性格分析",
    footerHelp: "基礎結果之後，可在深度報告中查看逐章詳細解讀。",
  },
} as const;

function getFptiInputCopy(locale: LoadingLocale) {
  if (locale === "ja" || locale === "zh-CN" || locale === "zh-TW" || locale === "en") {
    return FPTI_INPUT_FORM_TEXT_TRANSLATIONS[locale];
  }
  return FPTI_INPUT_FORM_TEXT_TRANSLATIONS.ko;
}

type Props = {
  value: FptiFormInput;
  onChange: (next: FptiFormInput) => void;
  onSubmit: () => void;
  busy?: boolean;
  autoReady?: boolean;
  autoRunning?: boolean;
};

export default function FptiInputForm({ value, onChange, onSubmit, busy, autoReady, autoRunning }: Props) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getFptiInputCopy(locale);
  const update = <K extends keyof FptiFormInput>(key: K, next: FptiFormInput[K]) => {
    onChange({ ...value, [key]: next });
  };

  const fieldClass = `${styles.inputShell} h-12 w-full rounded-2xl px-4 text-[15px]`;
  const genderOptions = [
    { value: "OTHER", label: copy.genderOther },
    { value: "M", label: copy.genderMale },
    { value: "F", label: copy.genderFemale },
  ];
  const calendarOptions = [
    { value: "solar", label: copy.calendarSolar },
    { value: "lunar", label: copy.calendarLunar },
    { value: "lunar_leap", label: copy.calendarLeap },
  ];

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    return () => window.removeEventListener("cd:locale-ready", syncLocale);
  }, []);

  return (
    <section className={`${styles.glassPanel} relative overflow-hidden rounded-[30px] p-5 md:p-7`}>
      <div className={`${styles.starLayerSoft} absolute inset-0`} aria-hidden />

      <div className="relative mb-4">
        <h2 className="text-xl font-semibold text-[#f8fbff]">{copy.title}</h2>
        <p className="mt-1 text-sm text-[#d8d5ff]">{copy.subtitle}</p>
      </div>

      <div className="relative mb-4 flex flex-wrap gap-2 text-xs">
        <span className={`${styles.autoBadge} rounded-full px-3 py-1 text-violet-100`}>{copy.autoMode}</span>
        <span className="rounded-full border border-indigo-200/35 bg-indigo-500/20 px-3 py-1 text-indigo-100">
          {autoRunning ? copy.statusRunning : autoReady ? copy.statusReady : copy.statusWaiting}
        </span>
      </div>

      <div className="relative grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-[#dbe5ff]">{copy.nameLabel}</span>
          <input
            type="text"
            value={value.name}
            onChange={(e) => update("name", e.target.value)}
            className={fieldClass}
            placeholder={copy.namePlaceholder}
          />
        </label>

        <div className="text-sm">
          <span className="mb-1 block text-[#dbe5ff]">{copy.genderLabel}</span>
          <div className={`${styles.touchSafeChoice} grid grid-cols-3 gap-2`}>
            {genderOptions.map((option) => {
              const active = (value.gender || "OTHER") === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update("gender", option.value as FptiFormInput["gender"])}
                  className={`${styles.optionCard} ${active ? styles.optionCardActive : ""} min-h-12 rounded-2xl px-3 py-2 text-xs font-semibold`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="text-sm">
          <span className="mb-1 block text-[#dbe5ff]">{copy.birthDateLabel}</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            pattern="[0-9]{8}"
            placeholder="YYYYMMDD"
            value={formatBirthDateDigits(value.birthDate)}
            onChange={(e) => update("birthDate", normalizeBirthDateFromDigits(e.target.value))}
            className={fieldClass}
          />
        </label>

        <div className="text-sm">
          <span className="mb-1 block text-[#dbe5ff]">{copy.calendarLabel}</span>
          <div className={`${styles.touchSafeChoice} grid grid-cols-3 gap-2`}>
            {calendarOptions.map((option) => {
              const active = value.calendarType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update("calendarType", option.value as FptiFormInput["calendarType"])}
                  className={`${styles.optionCard} ${active ? styles.optionCardActive : ""} min-h-12 rounded-2xl px-3 py-2 text-xs font-semibold`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="text-sm">
          <span className="mb-1 block text-[#dbe5ff]">{copy.birthTimeLabel}</span>
          <input
            type="time"
            value={value.birthTime}
            onChange={(e) => update("birthTime", e.target.value)}
            disabled={value.timeUnknown}
            className={`${fieldClass} disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-900/70`}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-[#dbe5ff]">{copy.birthRegionLabel}</span>
          <input
            type="text"
            value={value.birthRegion || ""}
            onChange={(e) => update("birthRegion", e.target.value)}
            className={fieldClass}
            placeholder={copy.birthRegionPlaceholder}
          />
        </label>
      </div>

      <label className="relative mt-3 flex items-center gap-2 text-sm text-[#dbe5ff]">
        <input
          type="checkbox"
          checked={value.timeUnknown}
          onChange={(e) => update("timeUnknown", e.target.checked)}
          className="h-4 w-4"
        />
        {copy.timeUnknownLabel}
      </label>

      {value.timeUnknown && (
        <p className="relative mt-2 rounded-xl border border-amber-200/30 bg-amber-200/10 p-3 text-xs text-amber-100">
          {copy.timeUnknownNotice}
        </p>
      )}

      <div className="relative mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || !value.birthDate || (!value.timeUnknown && !value.birthTime)}
          onClick={onSubmit}
          className={`${styles.ctaButton} h-12 rounded-full px-6 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45`}
        >
          {busy ? copy.submitBusy : copy.submitIdle}
        </button>
        <p className="self-center text-xs text-[#d8d5ff]">{copy.footerHelp}</p>
      </div>
    </section>
  );
}
