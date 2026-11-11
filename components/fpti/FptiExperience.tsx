"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FptiHero from "./FptiHero";
import FptiInputForm from "./FptiInputForm";
import styles from "./FptiCosmic.module.css";
import { useFreeReadingGuard } from "@/app/_lib/use-free-reading-guard";
import { useReadingIdentityReset } from "@/app/_lib/use-reading-identity-reset";
import type { FptiAnalysisResult, FptiFormInput, FptiSourceData } from "@/lib/fpti/fpti-types";
import {
  fetchCurrentDestinyProfile,
  isDestinyProfileStorageKey,
  type DestinyProfileCard,
} from "@/app/_lib/profile-card-storage";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { usePaidResume, unpackPaidResumeArg } from "@/app/hooks/usePaidResume";

// 이미 진행된 과거 결제의 복귀만 보존한다. 신규 결제 진입은 제공하지 않는다.
const FPTI_DEEP_REPORT_RESUME_KIND = "premium-fpti-report";

const FptiLoading = dynamic(() => import("./FptiLoading"), {
  loading: () => null,
});
const FptiResultCard = dynamic(() => import("./FptiResultCard"), {
  loading: () => null,
});
const FptiDictionarySection = dynamic(() => import("./FptiDictionarySection"), {
  loading: () => null,
});

const FPTI_EXPERIENCE_TEXT_TRANSLATIONS = {
  ko: {
    loadingSteps: [
      "별자리 성향 좌표를 정렬하는 중...",
      "당신의 기질 리듬을 읽는 중...",
      "관계와 선택 패턴을 해석하는 중...",
      "운명 성향 리포트를 구성하는 중...",
      "당신만의 성향 코드를 완성하는 중...",
    ],
    profileUser: "프로필 사용자",
    currentProfile: "현재 프로필",
    inputRequired: "생년월일과 양음력, 태어난 시간을 확인해 주세요.",
    invalidBirthInput: "사주 계산에 필요한 입력값이 올바르지 않습니다. 날짜/시간 형식을 확인해 주세요.",
    analysisFailed: "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    profileMissing: "현재 선택된 프로필의 생년월일 데이터를 찾을 수 없습니다. 프로필 카드를 먼저 확인해 주세요.",
    introTitle: "성향 리포트 안내",
    introBody: "결과는 당신의 선택 리듬, 감정 흐름, 관계 운영 방식, 성장 전략을 중심으로 구성되며, 심층 리포트에서는 챕터별로 독립된 해석과 실전 조언을 제공합니다.",
    profileLinked: (name: string) => <>현재 프로필 연동됨: <span className="font-semibold">{name}</span></>,
    pillars: { year: "년주", month: "월주", day: "일주", hour: "시주", unknown: "미상" },
    previewTitle: "이 서비스에서 계산되는 FPTI 유형 설명",
    previewBody: "아래 유형은 실제 서비스에 탑재된 대표 코드입니다. 입력값으로 사주 계산이 완료되면 축 조합에 맞는 코드/설명이 자동으로 매칭됩니다.",
    analyzeProfile: "현재 프로필로 바로 분석",
    confirmInput: "입력값 확인 후 분석",
  },
  en: {
    loadingSteps: [
      "Aligning your constellation temperament coordinates...",
      "Reading the rhythm of your nature...",
      "Interpreting relationship and choice patterns...",
      "Composing your destiny temperament report...",
      "Completing your personal temperament code...",
    ],
    profileUser: "Profile User",
    currentProfile: "Current Profile",
    inputRequired: "Please check your birth date, calendar type, and birth time.",
    invalidBirthInput: "The birth details needed for Saju calculation are not valid. Please check the date and time format.",
    analysisFailed: "An error occurred during analysis. Please try again shortly.",
    profileMissing: "We could not find birth-date data in the selected profile. Please check the profile card first.",
    introTitle: "About This Temperament Report",
    introBody: "The result is built around your choice rhythm, emotional flow, relationship style, and growth strategy. The deep report offers independent chapter readings and practical guidance.",
    profileLinked: (name: string) => <>Profile linked: <span className="font-semibold">{name}</span></>,
    pillars: { year: "Year Pillar", month: "Month Pillar", day: "Day Pillar", hour: "Hour Pillar", unknown: "Unknown" },
    previewTitle: "FPTI Types Calculated in This Service",
    previewBody: "These are representative codes used in the live service. Once the Saju calculation is complete, the matching code and description are selected automatically.",
    analyzeProfile: "Analyze current profile",
    confirmInput: "Review input and analyze",
  },
  ja: {
    loadingSteps: [
      "星座の性質座標を整えています...",
      "あなたの気質のリズムを読み解いています...",
      "関係と選択パターンを解釈しています...",
      "運命気質レポートを組み立てています...",
      "あなただけの気質コードを仕上げています...",
    ],
    profileUser: "プロフィールユーザー",
    currentProfile: "現在のプロフィール",
    inputRequired: "生年月日、暦の種類、生まれた時刻をご確認ください。",
    invalidBirthInput: "四柱推命の計算に必要な入力値が正しくありません。日付と時刻の形式をご確認ください。",
    analysisFailed: "分析中にエラーが発生しました。しばらくしてからもう一度お試しください。",
    profileMissing: "現在選択中のプロフィールから生年月日データを見つけられませんでした。先にプロフィールカードをご確認ください。",
    introTitle: "気質レポートのご案内",
    introBody: "結果は、選択のリズム、感情の流れ、関係の築き方、成長戦略を中心に構成されます。深層レポートでは章ごとに独立した解釈と実践的な助言をお届けします。",
    profileLinked: (name: string) => <>プロフィール連携中: <span className="font-semibold">{name}</span></>,
    pillars: { year: "年柱", month: "月柱", day: "日柱", hour: "時柱", unknown: "不明" },
    previewTitle: "このサービスで計算されるFPTIタイプ",
    previewBody: "以下は実際のサービスに搭載されている代表コードです。入力値から四柱推命の計算が完了すると、軸の組み合わせに合うコードと説明が自動で照合されます。",
    analyzeProfile: "現在のプロフィールで分析",
    confirmInput: "入力内容を確認して分析",
  },
  "zh-CN": {
    loadingSteps: [
      "正在校准星座性向坐标...",
      "正在解读你的气质节奏...",
      "正在解析关系与选择模式...",
      "正在构建命运性向报告...",
      "正在完成你的专属性向代码...",
    ],
    profileUser: "档案用户",
    currentProfile: "当前档案",
    inputRequired: "请确认出生日期、阴阳历类型和出生时间。",
    invalidBirthInput: "八字计算所需的输入值不正确，请确认日期/时间格式。",
    analysisFailed: "分析过程中发生错误，请稍后重试。",
    profileMissing: "在当前选择的档案中找不到出生日期数据，请先确认档案卡片。",
    introTitle: "性向报告说明",
    introBody: "结果围绕你的选择节奏、情绪流动、关系经营方式和成长策略构成，深度报告将按章节提供独立解读与实践建议。",
    profileLinked: (name: string) => <>已关联当前档案：<span className="font-semibold">{name}</span></>,
    pillars: { year: "年柱", month: "月柱", day: "日柱", hour: "时柱", unknown: "未知" },
    previewTitle: "本服务计算的 FPTI 类型说明",
    previewBody: "以下是实际服务中搭载的代表代码。输入值完成八字计算后，会自动匹配符合轴组合的代码与说明。",
    analyzeProfile: "用当前档案直接分析",
    confirmInput: "确认输入值后分析",
  },
  "zh-TW": {
    loadingSteps: [
      "正在校準星座性向座標...",
      "正在解讀你的氣質節奏...",
      "正在解析關係與選擇模式...",
      "正在建構命運性向報告...",
      "正在完成你的專屬性向代碼...",
    ],
    profileUser: "檔案使用者",
    currentProfile: "目前檔案",
    inputRequired: "請確認出生日期、陰陽曆類型和出生時間。",
    invalidBirthInput: "八字計算所需的輸入值不正確，請確認日期/時間格式。",
    analysisFailed: "分析過程中發生錯誤，請稍後再試。",
    profileMissing: "在目前選擇的檔案中找不到出生日期資料，請先確認檔案卡片。",
    introTitle: "性向報告說明",
    introBody: "結果圍繞你的選擇節奏、情緒流動、關係經營方式與成長策略構成，深度報告將依章節提供獨立解讀與實踐建議。",
    profileLinked: (name: string) => <>已連結目前檔案：<span className="font-semibold">{name}</span></>,
    pillars: { year: "年柱", month: "月柱", day: "日柱", hour: "時柱", unknown: "未知" },
    previewTitle: "本服務計算的 FPTI 類型說明",
    previewBody: "以下是實際服務中搭載的代表代碼。輸入值完成八字計算後，會自動配對符合軸組合的代碼與說明。",
    analyzeProfile: "用目前檔案直接分析",
    confirmInput: "確認輸入值後分析",
  },
} as const;

function getFptiExperienceCopy(locale: LoadingLocale) {
  return FPTI_EXPERIENCE_TEXT_TRANSLATIONS[locale as keyof typeof FPTI_EXPERIENCE_TEXT_TRANSLATIONS] || FPTI_EXPERIENCE_TEXT_TRANSLATIONS.en;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_FORM: FptiFormInput = {
  name: "",
  gender: "OTHER",
  birthDate: "",
  calendarType: "solar",
  birthTime: "12:00",
  timeUnknown: false,
  birthRegion: "",
};

type ProfileGender = "M" | "F" | "OTHER";

type DestinyProfile = {
  id?: string;
  profileId?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthIso?: string;
  birthYear?: number | string;
  birthMonth?: number | string;
  birthDay?: number | string;
  birthHour?: number | string | null;
  birthMinute?: number | string | null;
  calType?: string;
  calendarType?: string;
  timeUnknown?: boolean;
  birthTimeUnknown?: boolean;
  noBirthTime?: boolean;
  birthRegion?: string;
  birth?: {
    year?: number | string;
    month?: number | string;
    day?: number | string;
    hour?: number | string | null;
    minute?: number | string | null;
    calType?: string;
    timeUnknown?: boolean;
  };
  location?: {
    label?: string;
  };
};

function toTwoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeGender(raw: unknown): ProfileGender {
  const value = String(raw || "").trim().toUpperCase();
  if (value === "M" || value === "MALE" || value === "남" || value === "남성") return "M";
  if (value === "F" || value === "FEMALE" || value === "여" || value === "여성") return "F";
  return "OTHER";
}

function normalizeCalendarType(raw: unknown): FptiFormInput["calendarType"] {
  const value = String(raw || "").trim().toLowerCase();
  if (value.includes("leap") || value.includes("윤")) return "lunar_leap";
  if (value.includes("lunar") || value.includes("음")) return "lunar";
  return "solar";
}

function parseFiniteInt(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function isValidSolarDate(year: number, month: number, day: number): boolean {
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() + 1 === month
    && candidate.getUTCDate() === day;
}

function parseDatePartsFromText(raw: unknown): { year: number; month: number; day: number } | null {
  const value = String(raw || "").trim();
  if (!value) return null;

  const isoLike = value.match(/^(\d{4}-\d{1,2}-\d{1,2})T/i);
  const source = isoLike ? isoLike[1] : value;

  const standard = source.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (standard) {
    return {
      year: Number(standard[1]),
      month: Number(standard[2]),
      day: Number(standard[3]),
    };
  }

  const compact = source.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    return {
      year: Number(compact[1]),
      month: Number(compact[2]),
      day: Number(compact[3]),
    };
  }

  const korean = source.match(/^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일$/);
  if (korean) {
    return {
      year: Number(korean[1]),
      month: Number(korean[2]),
      day: Number(korean[3]),
    };
  }

  return null;
}

function normalizeDate(profile: DestinyProfile): string {
  const candidates: Array<{ year: number; month: number; day: number }> = [];
  const birth = profile.birth;

  const birthYear = parseFiniteInt(birth?.year ?? profile.birthYear);
  const birthMonth = parseFiniteInt(birth?.month ?? profile.birthMonth);
  const birthDay = parseFiniteInt(birth?.day ?? profile.birthDay);
  if (birthYear !== null && birthMonth !== null && birthDay !== null) {
    candidates.push({ year: birthYear, month: birthMonth, day: birthDay });
  }

  const parsedFromField = parseDatePartsFromText(profile.birthDate);
  if (parsedFromField) candidates.push(parsedFromField);

  for (const candidate of candidates) {
    if (!isValidSolarDate(candidate.year, candidate.month, candidate.day)) continue;
    return `${candidate.year}-${toTwoDigits(candidate.month)}-${toTwoDigits(candidate.day)}`;
  }

  return "";
}

function isUnknownTimeMarker(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return false;
  return value === "unknown"
    || value === "미상"
    || value === "모름"
    || value === "없음"
    || value === "n/a";
}

function normalizeHourMinute(hour: number, minute: number): { hour: number; minute: number } | null {
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour: Math.trunc(hour), minute: Math.trunc(minute) };
}

function parseBirthTimeFromText(raw: unknown): { hour: number; minute: number } | null {
  const source = String(raw || "").trim();
  if (!source) return null;

  const sourceNoMillis = source.replace(/\.\d+Z?$/i, "");
  const isoLike = sourceNoMillis.match(/T(\d{1,2}:\d{1,2}(?::\d{1,2})?)$/);
  const timeSource = (isoLike ? isoLike[1] : sourceNoMillis).trim();

  const colon = timeSource.match(/^(\d{1,2})\s*:\s*(\d{1,2})(?:\s*:\s*(\d{1,2}))?$/);
  if (colon) {
    return normalizeHourMinute(Number(colon[1]), Number(colon[2]));
  }

  const compact = timeSource.match(/^(\d{1,2})(\d{2})$/);
  if (compact) {
    return normalizeHourMinute(Number(compact[1]), Number(compact[2]));
  }

  const normalized = timeSource.replace(/\s+/g, "");
  const hasPm = /오후|pm/i.test(normalized);
  const hasAm = /오전|am/i.test(normalized);
  const cleaned = normalized.replace(/오전|오후|am|pm/gi, "");
  const korean = cleaned.match(/^(\d{1,2})(?:시)?(?:(\d{1,2})분?)?$/);
  if (!korean) return null;

  let hour = Number(korean[1]);
  const minute = Number(korean[2] || "0");

  if (hasPm && hour >= 1 && hour <= 11) hour += 12;
  if (hasAm && hour === 12) hour = 0;

  return normalizeHourMinute(hour, minute);
}

function normalizeTime(profile: DestinyProfile): { birthTime: string; timeUnknown: boolean } {
  const birth = profile.birth;
  const explicitUnknown = Boolean(profile.timeUnknown)
    || Boolean(profile.birthTimeUnknown)
    || Boolean(profile.noBirthTime)
    || Boolean(birth?.timeUnknown)
    || isUnknownTimeMarker(profile.birthTime);
  if (explicitUnknown) {
    return { birthTime: "12:00", timeUnknown: true };
  }

  const rawHour = parseFiniteInt(birth?.hour ?? profile.birthHour);
  const rawMinute = parseFiniteInt(birth?.minute ?? profile.birthMinute);
  if (rawHour !== null) {
    const normalized = normalizeHourMinute(rawHour, rawMinute ?? 0);
    if (normalized) {
      return {
        birthTime: `${toTwoDigits(normalized.hour)}:${toTwoDigits(normalized.minute)}`,
        timeUnknown: false,
      };
    }
  }

  const parsedFromText = parseBirthTimeFromText(profile.birthTime);
  if (parsedFromText) {
    return {
      birthTime: `${toTwoDigits(parsedFromText.hour)}:${toTwoDigits(parsedFromText.minute)}`,
      timeUnknown: false,
    };
  }

  return { birthTime: "12:00", timeUnknown: true };
}

function toFormInput(profile: DestinyProfile): FptiFormInput | null {
  const birthDate = normalizeDate(profile);
  if (!birthDate) return null;
  const time = normalizeTime(profile);
  return {
    name: String(profile.name || "").trim(),
    gender: normalizeGender(profile.gender),
    birthDate,
    calendarType: normalizeCalendarType(profile.birth?.calType || profile.calType || profile.calendarType),
    birthTime: time.birthTime,
    timeUnknown: time.timeUnknown,
    birthRegion: String(profile.location?.label || profile.birthRegion || "").trim(),
  };
}

function hasFptiProfileInput(profile: DestinyProfileCard): boolean {
  return Boolean(toFormInput(profile));
}

function buildAutoSignature(input: FptiFormInput): string {
  const keyBirthDate = String(input?.birthDate || "").trim();
  const keyCalendarType = String(input?.calendarType || "").trim();
  const keyTime = input?.timeUnknown ? "unknown" : String(input?.birthTime || "").trim();
  const keyGender = String(input?.gender || "OTHER").trim();
  return [keyBirthDate, keyCalendarType, keyTime, keyGender].join("|");
}

function hasRequiredFptiSajuFields(input: FptiFormInput | null | undefined): boolean {
  if (!input?.birthDate || !input?.calendarType) return false;
  if (!input?.timeUnknown && !String(input?.birthTime || "").trim()) return false;
  return true;
}

export default function FptiExperience() {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [phase, setPhase] = useState<"landing" | "input" | "loading" | "result">("landing");
  const [form, setForm] = useState<FptiFormInput>(DEFAULT_FORM);
  const [result, setResult] = useState<FptiAnalysisResult | null>(null);
  const [sajuSource, setSajuSource] = useState<FptiSourceData | null>(null);
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [linkedProfileName, setLinkedProfileName] = useState("");
  const [autoRunning, setAutoRunning] = useState(false);
  const autoSignatureRef = useRef("");
  // 저장 프로필과 실제 계산한 입력이 일치할 때만 해당 프로필로 심층 리포트를 조회한다.
  const [linkedProfile, setLinkedProfile] = useState<{ profileId: string; signature: string } | null>(null);
  const [resultSignature, setResultSignature] = useState("");
  const [resultInput, setResultInput] = useState<FptiFormInput | null>(null);
  const [restorePurchasedReport, setRestorePurchasedReport] = useState(false);
  const analysisRevision = useRef(0);
  const profileRevision = useRef(0);
  const mounted = useRef(true);
  const beginAnalysis = useFreeReadingGuard(`fpti-analysis:${analysisRevision.current}`);
  const beginAnalysisRef = useRef(beginAnalysis);
  beginAnalysisRef.current = beginAnalysis;
  const copy = getFptiExperienceCopy(locale);

  const loadingStep = useMemo(() => copy.loadingSteps[stepIndex] || copy.loadingSteps[0], [copy, stepIndex]);
  const autoReady = useMemo(() => hasRequiredFptiSajuFields(form), [form]);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  const toAnalysisInput = useCallback((input: FptiFormInput): FptiFormInput => {
    const fallbackName = String(linkedProfileName || copy.profileUser).trim() || copy.profileUser;
    return {
      ...input,
      name: String(input?.name || "").trim() || fallbackName,
      birthRegion: String(input?.birthRegion || "").trim(),
    };
  }, [copy.profileUser, linkedProfileName]);

  const syncFormFromCurrentProfile = useCallback((eventProfile?: unknown) => {
    if (typeof window === "undefined") return null;
    const currentProfile = eventProfile as DestinyProfileCard | null | undefined;
    if (!currentProfile) return null;
    if (!hasFptiProfileInput(currentProfile)) return null;
    const profileForm = toFormInput(currentProfile);
    if (!profileForm) return null;
    const linkedId = String(currentProfile.profileId || currentProfile.id || "").trim();
    setLinkedProfile(linkedId ? { profileId: linkedId, signature: buildAutoSignature(profileForm) } : null);

    setForm((prev) => ({
      ...prev,
      ...profileForm,
      name: profileForm.name || prev.name || copy.profileUser,
    }));
    setLinkedProfileName(profileForm.name || copy.currentProfile);
    return {
      ...profileForm,
      name: profileForm.name || copy.profileUser,
    };
  }, [copy.currentProfile, copy.profileUser]);

  const syncFormFromCurrentProfileAsync = useCallback(async (eventProfile?: unknown) => {
    const revision = ++profileRevision.current;
    const currentProfile = await fetchCurrentDestinyProfile(hasFptiProfileInput);
    if (!mounted.current || revision !== profileRevision.current) return null;
    if (!currentProfile) return eventProfile ? syncFormFromCurrentProfile(eventProfile) : null;
    const profileForm = toFormInput(currentProfile);
    if (!profileForm) return null;
    const linkedId = String(currentProfile.profileId || currentProfile.id || "").trim();
    setLinkedProfile(linkedId ? { profileId: linkedId, signature: buildAutoSignature(profileForm) } : null);

    const fallbackName = profileForm.name || copy.profileUser;
    setForm((prev) => ({
      ...prev,
      ...profileForm,
      name: profileForm.name || prev.name || fallbackName,
    }));
    setLinkedProfileName(profileForm.name || copy.currentProfile);
    return {
      ...profileForm,
      name: fallbackName,
    };
  }, [copy.currentProfile, copy.profileUser, syncFormFromCurrentProfile]);

  const clearResult = useCallback(() => {
    analysisRevision.current++;
    profileRevision.current++;
    autoSignatureRef.current = "";
    setResult(null);
    setResultInput(null);
    setResultSignature("");
    setSajuSource(null);
    setError("");
    setAutoRunning(false);
    setRestorePurchasedReport(false);
    setPhase("landing");
  }, []);

  useReadingIdentityReset(() => {
    clearResult();
    setLinkedProfile(null);
    setLinkedProfileName("");
    setForm(DEFAULT_FORM);
  });

  useEffect(() => {
    mounted.current = true;
    void syncFormFromCurrentProfileAsync();
    const onProfileChanged = () => {
      clearResult();
      setLinkedProfile(null);
      setLinkedProfileName("");
      void syncFormFromCurrentProfileAsync();
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || isDestinyProfileStorageKey(event.key)) onProfileChanged();
    };
    document.addEventListener("destinyProfileChanged", onProfileChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      mounted.current = false;
      analysisRevision.current++;
      profileRevision.current++;
      document.removeEventListener("destinyProfileChanged", onProfileChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, [clearResult, syncFormFromCurrentProfileAsync]);

  const analyzeWith = useCallback(async (input: FptiFormInput, trigger: "manual" | "auto" | "profile" = "manual") => {
    const analysisInput = toAnalysisInput(input);
    if (!hasRequiredFptiSajuFields(analysisInput)) {
      if (trigger === "manual") setError(copy.inputRequired);
      return false;
    }
    const attempt = beginAnalysisRef.current();
    if (!attempt) return false;
    const revision = analysisRevision.current;
    const valid = () => mounted.current && revision === analysisRevision.current && attempt.valid();
    let timer: number | undefined;
    try {
      const fptiAdapter = await import("@/lib/fpti/fpti-adapter");
      if (!valid()) return false;
      let computed: FptiSourceData;
      try {
        computed = fptiAdapter.calculateSajuSourceFromBirth(analysisInput);
      } catch {
        setError(copy.invalidBirthInput);
        setPhase("input");
        return false;
      }
      setSajuSource(computed);
      setError("");
      setStepIndex(0);
      setPhase("loading");
      setAutoRunning(trigger === "auto");
      timer = window.setInterval(() => {
        if (valid()) setStepIndex((prev) => (prev + 1) % copy.loadingSteps.length);
      }, 620);
      const [analysis] = await Promise.all([
        Promise.resolve(fptiAdapter.analyzeFptiFromSajuSource(computed)),
        sleep(trigger === "auto" ? 1300 : trigger === "profile" ? 700 : 2200),
      ]);
      if (!valid()) return false;
      setResult(analysis);
      setResultInput({ ...analysisInput });
      setResultSignature(buildAutoSignature(analysisInput));
      setPhase("result");
      autoSignatureRef.current = buildAutoSignature(analysisInput);
      window.requestAnimationFrame(() => {
        if (valid()) document.getElementById("fpti-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return true;
    } catch {
      if (valid()) { setError(copy.analysisFailed); setPhase("input"); }
      return false;
    } finally {
      if (valid()) setAutoRunning(false);
      if (timer !== undefined) window.clearInterval(timer);
      attempt.finish();
    }
  }, [copy.analysisFailed, copy.inputRequired, copy.invalidBirthInput, copy.loadingSteps.length, toAnalysisInput]);

  const start = () => {
    clearResult();
    setPhase("input");
    setError("");
    syncFormFromCurrentProfile();
    void syncFormFromCurrentProfileAsync();
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const target = document.getElementById("fpti-input");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const analyzeCurrentProfile = async () => {
    const revision = profileRevision.current + 1;
    const profileForm = syncFormFromCurrentProfile() || await syncFormFromCurrentProfileAsync();
    if (!mounted.current || revision !== profileRevision.current) return;
    if (!profileForm) {
      setError(copy.profileMissing);
      setPhase("input");
      return;
    }
    setRestorePurchasedReport(false);
    await analyzeWith(profileForm, "profile");
  };

  const onAnalyze = async () => {
    setRestorePurchasedReport(false);
    await analyzeWith(form, "manual");
  };

  useEffect(() => {
    if (phase !== "input") return;
    if (!autoReady) return;

    const currentSignature = buildAutoSignature(form);
    if (!currentSignature || currentSignature === autoSignatureRef.current) return;

    const timer = window.setTimeout(() => {
      void analyzeWith(form, "auto");
    }, 360);

    return () => {
      window.clearTimeout(timer);
    };
  }, [analyzeWith, autoReady, form, phase]);

  // 과거 결제 복귀는 같은 입력으로 다시 열고, 결과 카드가 기존 구매 API로 복원한다.
  usePaidResume(FPTI_DEEP_REPORT_RESUME_KIND, async (args) => {
    const restored = unpackPaidResumeArg<FptiFormInput>(args.form);
    if (!restored) return false;
    setForm(restored);
    setRestorePurchasedReport(true);
    return analyzeWith(restored, "profile");
  });

  const sourcePillars = useMemo(() => {
    if (!sajuSource) return null;
    return [
      [copy.pillars.year, sajuSource?.pillars?.year || "-"],
      [copy.pillars.month, sajuSource?.pillars?.month || "-"],
      [copy.pillars.day, sajuSource?.pillars?.day || "-"],
      [copy.pillars.hour, sajuSource?.pillars?.hour || (form?.timeUnknown ? copy.pillars.unknown : "-")],
    ] as const;
  }, [copy.pillars, form?.timeUnknown, sajuSource]);

  return (
    <main className={`${styles.cosmicPage} py-8 md:py-12`}>
      <div className={styles.starLayer} aria-hidden />
      <div className={styles.starLayerSoft} aria-hidden />
      <div className={styles.nebulaLeft} aria-hidden />
      <div className={styles.nebulaRight} aria-hidden />
      <div className="relative mx-auto w-full max-w-6xl space-y-6 px-4 md:px-6">
        <FptiHero onStart={start} />

        <section id="fpti-intro" className={`${styles.glassPanel} rounded-3xl p-5 text-sm text-slate-200`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-50">{copy.introTitle}</h2>
              <p className="mt-1 max-w-3xl">
                {copy.introBody}
              </p>
            </div>
            {linkedProfileName && (
              <div className={`${styles.autoBadge} rounded-2xl px-3 py-2 text-xs text-emerald-100`}>
                {copy.profileLinked(linkedProfileName)}
              </div>
            )}
          </div>

          {sourcePillars && (
            <div className="mt-4 grid gap-2 text-xs text-[#ecebff] md:grid-cols-4">
              {sourcePillars.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-violet-200/25 bg-[#0d1434]/55 px-3 py-2">
                  <p className="text-[11px] text-violet-200/85">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#f6f3ff]">{value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={analyzeCurrentProfile}
              data-cd-reading-action="primary"
              className={`${styles.softButton} rounded-full px-4 py-2 text-xs font-semibold`}
            >
              {copy.analyzeProfile}
            </button>
            <button
              type="button"
              onClick={start}
              className={`${styles.softButton} rounded-full px-4 py-2 text-xs font-semibold`}
            >
              {copy.confirmInput}
            </button>
          </div>
        </section>

        <FptiDictionarySection currentCode={result?.code} />

        {phase === "input" && (
          <section id="fpti-input">
            <FptiInputForm
              value={form}
              onChange={(next) => { analysisRevision.current++; profileRevision.current++; setForm(next); }}
              onSubmit={onAnalyze}
              busy={false}
              autoReady={autoReady}
              autoRunning={autoRunning}
            />
          </section>
        )}

        {phase === "loading" && <FptiLoading step={loadingStep} stepIndex={stepIndex} />}

        {phase === "result" && result && resultInput && (
          <section id="fpti-result">
            <FptiResultCard
              result={result}
              savedProfileId={linkedProfile && linkedProfile.signature === resultSignature ? linkedProfile.profileId : ""}
              birthInput={resultInput}
              restorePurchasedReport={restorePurchasedReport}
            />
          </section>
        )}

        {error && <p className="rounded-xl border border-rose-300/30 bg-rose-500/12 p-3 text-sm text-rose-100">{error}</p>}
      </div>
    </main>
  );
}
