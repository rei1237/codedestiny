"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FptiHero from "./FptiHero";
import FptiInputForm from "./FptiInputForm";
import FptiLoading from "./FptiLoading";
import FptiResultCard from "./FptiResultCard";
import styles from "./FptiCosmic.module.css";
import {
  analyzeFptiFromSajuSource,
  calculateSajuSourceFromBirth,
  hasRequiredSajuFields,
} from "@/lib/fpti/fpti-adapter";
import { FPTI_CURATED_TYPES } from "@/lib/fpti/fpti-copy";
import type { FptiAnalysisResult, FptiFormInput, FptiSourceData } from "@/lib/fpti/fpti-types";

const LOADING_STEPS = [
  "사주 원국을 계산하는 중...",
  "일간의 본질을 읽는 중...",
  "오행의 균형을 분석하는 중...",
  "십성의 성격 패턴을 해석하는 중...",
  "당신만의 FPTI 코드를 생성하는 중...",
];

const PREVIEW_TYPES = FPTI_CURATED_TYPES.slice(0, 6);

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

const PROFILE_NS = "FORTUNE_APP_USER_PROFILES";

type ProfileGender = "M" | "F" | "OTHER";

type DestinyProfile = {
  id?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthYear?: number | string;
  birthMonth?: number | string;
  birthDay?: number | string;
  birthHour?: number | string;
  birthMinute?: number | string;
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
    hour?: number | string;
    minute?: number | string;
    calType?: string;
    timeUnknown?: boolean;
  };
  location?: {
    label?: string;
  };
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

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

function resolveScope() {
  const authRaw = localStorage.getItem("fortune_auth_user");
  const auth = safeParse<Record<string, unknown>>(authRaw);
  const scopedId = String(auth?.id || auth?.userId || auth?._id || auth?.uid || "").trim().toLowerCase();
  return scopedId || "guest";
}

function readCurrentProfile(): DestinyProfile | null {
  const scope = resolveScope();
  const scopedListKey = `${PROFILE_NS}.list::${scope}`;
  const scopedCurrentKey = `${PROFILE_NS}.current::${scope}`;

  const list = safeParse<DestinyProfile[]>(localStorage.getItem(scopedListKey))
    || safeParse<DestinyProfile[]>(localStorage.getItem(`${PROFILE_NS}.list`))
    || [];

  if (!Array.isArray(list) || list.length === 0) return null;

  const currentId = localStorage.getItem(scopedCurrentKey)
    || localStorage.getItem(`${PROFILE_NS}.current`)
    || "";

  if (!currentId) return list[0] || null;
  return list.find((profile) => profile?.id === currentId) || list[0] || null;
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

function buildAutoSignature(input: FptiFormInput): string {
  const keyBirthDate = String(input?.birthDate || "").trim();
  const keyCalendarType = String(input?.calendarType || "").trim();
  const keyTime = input?.timeUnknown ? "unknown" : String(input?.birthTime || "").trim();
  const keyGender = String(input?.gender || "OTHER").trim();
  return [keyBirthDate, keyCalendarType, keyTime, keyGender].join("|");
}

export default function FptiExperience() {
  const [phase, setPhase] = useState<"landing" | "input" | "loading" | "result">("landing");
  const [form, setForm] = useState<FptiFormInput>(DEFAULT_FORM);
  const [result, setResult] = useState<FptiAnalysisResult | null>(null);
  const [sajuSource, setSajuSource] = useState<FptiSourceData | null>(null);
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [linkedProfileName, setLinkedProfileName] = useState("");
  const [autoRunning, setAutoRunning] = useState(false);
  const autoSignatureRef = useRef("");

  const loadingStep = useMemo(() => LOADING_STEPS[stepIndex] || LOADING_STEPS[0], [stepIndex]);
  const autoReady = useMemo(() => hasRequiredSajuFields(form), [form]);

  const toAnalysisInput = useCallback((input: FptiFormInput): FptiFormInput => {
    const fallbackName = String(linkedProfileName || "프로필 사용자").trim() || "프로필 사용자";
    return {
      ...input,
      name: String(input?.name || "").trim() || fallbackName,
      birthRegion: String(input?.birthRegion || "").trim(),
    };
  }, [linkedProfileName]);

  const syncFormFromCurrentProfile = useCallback(() => {
    if (typeof window === "undefined") return null;
    const currentProfile = readCurrentProfile();
    if (!currentProfile) return null;
    const profileForm = toFormInput(currentProfile);
    if (!profileForm) return null;

    setForm((prev) => ({
      ...prev,
      ...profileForm,
      name: profileForm.name || prev.name || "프로필 사용자",
    }));
    setLinkedProfileName(profileForm.name || "현재 프로필");
    return {
      ...profileForm,
      name: profileForm.name || "프로필 사용자",
    };
  }, []);

  useEffect(() => {
    syncFormFromCurrentProfile();
    const onProfileChanged = () => {
      syncFormFromCurrentProfile();
    };
    window.addEventListener("destinyProfileChanged", onProfileChanged);
    return () => {
      window.removeEventListener("destinyProfileChanged", onProfileChanged);
    };
  }, [syncFormFromCurrentProfile]);

  const analyzeWith = useCallback(async (input: FptiFormInput, trigger: "manual" | "auto" = "manual") => {
    const analysisInput = toAnalysisInput(input);
    if (!hasRequiredSajuFields(analysisInput)) {
      if (trigger === "manual") {
        setError("생년월일과 양음력, 태어난 시간을 확인해 주세요.");
      }
      return false;
    }

    let computed: FptiSourceData;
    try {
      // 입력값을 사주 원천 데이터로 먼저 계산해 FPTI 상태와 동기화합니다.
      computed = calculateSajuSourceFromBirth(analysisInput);
      setSajuSource(computed);
    } catch {
      setError("사주 계산에 필요한 입력값이 올바르지 않습니다. 날짜/시간 형식을 확인해 주세요.");
      setPhase("input");
      return false;
    }

    setError("");
    setStepIndex(0);
    setPhase("loading");
    setAutoRunning(trigger === "auto");

    const timer = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 620);

    try {
      const [analysis] = await Promise.all([
        Promise.resolve(analyzeFptiFromSajuSource(computed)),
        sleep(trigger === "auto" ? 1300 : 2200),
      ]);
      setResult(analysis);
      setPhase("result");
      autoSignatureRef.current = buildAutoSignature(analysisInput);
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          const target = document.getElementById("fpti-result");
          target?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      return true;
    } catch {
      setError("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setPhase("input");
      return false;
    } finally {
      setAutoRunning(false);
      window.clearInterval(timer);
    }
  }, [toAnalysisInput]);

  const start = () => {
    setPhase("input");
    setError("");
    syncFormFromCurrentProfile();
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const target = document.getElementById("fpti-input");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const analyzeCurrentProfile = async () => {
    const profileForm = syncFormFromCurrentProfile();
    if (!profileForm) {
      setError("현재 선택된 프로필의 생년월일 데이터를 찾을 수 없습니다. 프로필 카드를 먼저 확인해 주세요.");
      setPhase("input");
      return;
    }
    await analyzeWith(profileForm, "manual");
  };

  const onAnalyze = async () => {
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

  const sourcePillars = useMemo(() => {
    if (!sajuSource) return null;
    return [
      ["년주", sajuSource?.pillars?.year || "-"],
      ["월주", sajuSource?.pillars?.month || "-"],
      ["일주", sajuSource?.pillars?.day || "-"],
      ["시주", sajuSource?.pillars?.hour || (form?.timeUnknown ? "미상" : "-")],
    ] as const;
  }, [form?.timeUnknown, sajuSource]);

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
              <h2 className="text-base font-semibold text-slate-50">분석 기준</h2>
              <p className="mt-1 max-w-3xl">
                4축(기질/행동/관계/전략)은 사주 오행, 십성 분포, 월지 계절, 용신/희신 정보를 기반으로 계산됩니다.
                입력값 변경은 자동 감지되며, 계산된 만세력 데이터는 FPTI 상태에 즉시 주입됩니다.
              </p>
            </div>
            {linkedProfileName && (
              <div className={`${styles.autoBadge} rounded-2xl px-3 py-2 text-xs text-emerald-100`}>
                현재 프로필 연동됨: <span className="font-semibold">{linkedProfileName}</span>
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

          <div className="mt-4 rounded-2xl border border-indigo-200/20 bg-[#0a1432]/55 p-3">
              <h3 className="text-sm font-semibold text-slate-50">이 서비스에서 계산되는 FPTI 유형 설명</h3>
            <p className="mt-1 text-xs text-indigo-100/85">
              아래 유형은 실제 서비스에 탑재된 대표 코드입니다. 입력값으로 사주 계산이 완료되면 축 조합에 맞는 코드/설명이 자동으로 매칭됩니다.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {PREVIEW_TYPES.map((item) => (
                <div key={item.code} className="rounded-xl border border-indigo-200/20 bg-[#091029]/70 p-3">
                  <p className="text-[11px] tracking-[0.12em] text-[#9dd8ff]">{item.code}</p>
                  <p className="mt-1 text-sm font-semibold text-[#f7f9ff]">{item.name}</p>
                  <p className="mt-1 text-xs text-[#d8e2ff]">{item.oneLiner}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={analyzeCurrentProfile}
              className={`${styles.softButton} rounded-full px-4 py-2 text-xs font-semibold`}
            >
              현재 프로필로 바로 분석
            </button>
            <button
              type="button"
              onClick={start}
              className={`${styles.softButton} rounded-full px-4 py-2 text-xs font-semibold`}
            >
              입력값 확인 후 분석
            </button>
          </div>
        </section>

        {phase === "input" && (
          <section id="fpti-input">
            <FptiInputForm
              value={form}
              onChange={setForm}
              onSubmit={onAnalyze}
              busy={false}
              autoReady={autoReady}
              autoRunning={autoRunning}
            />
          </section>
        )}

        {phase === "loading" && <FptiLoading step={loadingStep} stepIndex={stepIndex} />}

        {phase === "result" && result && (
          <section id="fpti-result">
            <FptiResultCard result={result} />
          </section>
        )}

        {error && <p className="rounded-xl border border-rose-300/30 bg-rose-500/12 p-3 text-sm text-rose-100">{error}</p>}
      </div>
    </main>
  );
}
