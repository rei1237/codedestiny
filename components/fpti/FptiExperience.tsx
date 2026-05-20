"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FptiHero from "./FptiHero";
import FptiInputForm from "./FptiInputForm";
import FptiLoading from "./FptiLoading";
import FptiResultCard from "./FptiResultCard";
import { analyzeFptiFromBirth } from "@/lib/fpti/fpti-adapter";
import type { FptiAnalysisResult, FptiFormInput } from "@/lib/fpti/fpti-types";

const LOADING_STEPS = [
  "사주 원국을 계산하는 중...",
  "일간의 본질을 읽는 중...",
  "오행의 균형을 분석하는 중...",
  "십성의 성격 패턴을 해석하는 중...",
  "당신만의 FPTI 코드를 생성하는 중...",
];

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
  calendarType?: string;
  birthRegion?: string;
  birth?: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    calType?: string;
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

function normalizeCalendarType(raw: unknown): "solar" | "lunar" {
  const value = String(raw || "").trim().toLowerCase();
  if (value.includes("lunar") || value.includes("음")) return "lunar";
  return "solar";
}

function normalizeDate(profile: DestinyProfile): string {
  const birth = profile.birth;
  if (birth?.year && birth?.month && birth?.day) {
    return `${birth.year}-${toTwoDigits(Number(birth.month))}-${toTwoDigits(Number(birth.day))}`;
  }
  const dateFromField = String(profile.birthDate || "").trim();
  if (!dateFromField) return "";
  const m = dateFromField.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (!m) return "";
  return `${m[1]}-${toTwoDigits(Number(m[2]))}-${toTwoDigits(Number(m[3]))}`;
}

function normalizeTime(profile: DestinyProfile): { birthTime: string; timeUnknown: boolean } {
  const birth = profile.birth;
  const hour = Number(birth?.hour);
  const minute = Number(birth?.minute);
  if (Number.isFinite(hour) && Number.isFinite(minute)) {
    return {
      birthTime: `${toTwoDigits(Math.max(0, Math.min(23, hour)))}:${toTwoDigits(Math.max(0, Math.min(59, minute)))}`,
      timeUnknown: false,
    };
  }

  const raw = String(profile.birthTime || "").trim();
  const m = raw.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) {
    return {
      birthTime: `${toTwoDigits(Math.max(0, Math.min(23, Number(m[1]))))}:${toTwoDigits(Math.max(0, Math.min(59, Number(m[2]))))}`,
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
    calendarType: normalizeCalendarType(profile.birth?.calType || profile.calendarType),
    birthTime: time.birthTime,
    timeUnknown: time.timeUnknown,
    birthRegion: String(profile.location?.label || profile.birthRegion || "").trim(),
  };
}

export default function FptiExperience() {
  const [phase, setPhase] = useState<"landing" | "input" | "loading" | "result">("landing");
  const [form, setForm] = useState<FptiFormInput>(DEFAULT_FORM);
  const [result, setResult] = useState<FptiAnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [linkedProfileName, setLinkedProfileName] = useState("");

  const loadingStep = useMemo(() => LOADING_STEPS[stepIndex] || LOADING_STEPS[0], [stepIndex]);

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

  const analyzeWith = async (input: FptiFormInput) => {
    if (!input.name || !input.birthDate) {
      setError("이름과 생년월일은 필수입니다.");
      return;
    }

    setError("");
    setStepIndex(0);
    setPhase("loading");

    const timer = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 620);

    try {
      const [analysis] = await Promise.all([analyzeFptiFromBirth(input), sleep(2400)]);
      setResult(analysis);
      setPhase("result");
    } catch {
      setError("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setPhase("input");
    } finally {
      window.clearInterval(timer);
    }
  };

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
    await analyzeWith(profileForm);
  };

  const preview = () => {
    setPhase("result");
    const sample = analyzeFptiFromBirth({
      name: "샘플 사용자",
      gender: "OTHER",
      birthDate: "1994-12-09",
      calendarType: "solar",
      birthTime: "23:20",
      timeUnknown: false,
      birthRegion: "서울",
    });
    Promise.resolve(sample)
      .then((data) => {
        setResult(data);
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => {
            const target = document.getElementById("fpti-result");
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }
      })
      .catch(() => {
        setError("샘플 결과를 불러오지 못했습니다. 다시 시도해 주세요.");
        setPhase("landing");
      });
  };

  const onAnalyze = async () => {
    await analyzeWith(form);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#020817_0%,#07203c_42%,#1f2937_100%)] py-8 md:py-12">
      <div className="pointer-events-none absolute inset-0 opacity-55 [background:radial-gradient(circle_at_16%_18%,rgba(14,165,233,0.28),transparent_43%),radial-gradient(circle_at_84%_22%,rgba(245,158,11,0.2),transparent_45%),radial-gradient(circle_at_50%_70%,rgba(147,197,253,0.14),transparent_54%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:auto,auto,auto,24px_24px]" />
      <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-12 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="relative mx-auto w-full max-w-6xl space-y-6 px-4 md:px-6">
        <FptiHero onStart={start} onPreview={preview} />

        <section id="fpti-intro" className="rounded-3xl border border-white/20 bg-[linear-gradient(145deg,rgba(8,16,35,0.88),rgba(18,37,63,0.86))] p-5 text-sm text-slate-200 shadow-[0_20px_65px_rgba(2,8,24,0.45)] backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-50">분석 기준</h2>
              <p className="mt-1 max-w-3xl">
                4축(기질/행동/관계/전략)은 사주 오행, 십성 분포, 월지 계절, 용신/희신 정보를 기반으로 계산됩니다.
                기존 사주 엔진 계산값을 재사용하는 결정론적 로직이며, 입력 누락 시에는 부분/기본 분석 품질 안내를 함께 제공합니다.
              </p>
            </div>
            {linkedProfileName && (
              <div className="rounded-2xl border border-emerald-300/35 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                현재 프로필 연동됨: <span className="font-semibold">{linkedProfileName}</span>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={analyzeCurrentProfile}
              className="rounded-full border border-sky-300/45 bg-sky-400/12 px-4 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/18"
            >
              현재 프로필로 바로 분석
            </button>
            <button
              type="button"
              onClick={start}
              className="rounded-full border border-amber-300/45 bg-amber-300/12 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/18"
            >
              입력값 확인 후 분석
            </button>
          </div>
        </section>

        {phase === "input" && (
          <section id="fpti-input">
          <FptiInputForm value={form} onChange={setForm} onSubmit={onAnalyze} busy={false} />
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
