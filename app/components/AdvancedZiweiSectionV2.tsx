"use client";

// ┌───────────────────────────────────────────────────────────────────────────┐
// │ [심화(深化/advanced) 자미두수 명반] 라우트 /ziwei/chart 가 마운트하는 본체.  │
// │ 파일명에 "Advanced"가 붙으면 = 심화 자미두수. 기본(基本) 자미두수 명반은     │
// │ 여기가 아니라 js/saju-engine.js 의 renderZiwei()/zw-* 격자다(메인 index.html│
// │ 사주·자미 모달). 12궁 4×4 격자·팔레트는 기본 명반과 디자인 레퍼런스를 공유.  │
// └───────────────────────────────────────────────────────────────────────────┘
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import "../../styles/fonts-serif.css";
import styles from "./ziwei/ziwei-consultation.module.css";
import { ZiweiConsultationHero, ZiweiQuestionSections } from "./ziwei/ZiweiConsultation";
import { buildQuestionReading } from "../_lib/ziwei-consultation-narrative";
// 심화 자미두수 PDF (ZIWEI_DEEP_PDF) — 회당 결제 LLM 15챕터 PDF 리포트 패널
import ZiweiDeepPdfPanel, { type ZiweiDeepBirthInput } from "./ziwei/ZiweiDeepPdfPanel";
import {
  calculateZiweiChart,
  normalizeZiweiForAdvancedReport,
  validateAdvancedZiweiResult,
} from "../_lib/ziwei-engine";
import { normalizeZiweiInput } from "../_lib/normalize-ziwei-input";
import { getZiweiDeepChapter, primeZiweiDeepRuntime } from "../_lib/ziwei-deep-runtime";
import { validateZiweiChart } from "../_lib/validate-ziwei-chart";
// 🔴 챕터 장문의 절 분리는 이 함수 하나만 쓴다 - 화면이 정규식을 따로 들면 절 수가 어긋나도 아무도 못 잡는다.
import { splitZiweiDeepCategories } from "../_lib/ziwei-deep-reading";
import {
  isDestinyProfileStorageKey,
  readCurrentDestinyProfile,
  resolveDestinyProfileBirthParts,
  type DestinyProfileCard,
} from "../_lib/profile-card-storage";
import {
  ZiweiDeepChart,
  ZiweiDeepChapter,
  ZiweiGender,
  ZiweiPalaceId,
  ZiweiSectionId,
  ZIWEI_SECTIONS,
} from "../_lib/ziwei-types";
import { transformationTypeToLabel } from "../_lib/ziwei-advanced-normalization";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
// 전문가 상담 8종이 공유하는 산문 렌더러와 용어 툴팁. 자미 전용 사본을 만들지 말 것.
import AiResultProse from "@/components/fortune/AiResultProse";
import GlossaryTerm from "@/components/fortune/GlossaryTerm";
import { listGlossaryTerms, lookupTerm } from "@/worker/lib/fortune-glossary.js";
import { getAdvancedZiweiCopy, getPremiumZiweiCopy, type AdvancedZiweiCopy } from "./ziwei/_lib/advanced-ziwei-copy";
// 해석 문장·트랙·궁/별 정의는 순수 모듈로 분리했다(가드 verify:ziwei-chart-customer-copy 가 출력 문장을 검사한다).
import {
  buildBorrowedStarInsights,
  buildCounselingTracks,
  buildPalaceCounseling,
  buildPalaceLinks,
  buildSihuaInsights,
  buildTrackAnalysis,
  PALACE_DEFINITION_MAP,
  palaceForceLabel,
  trackPriorityLabel,
  ZIWEI_TRACK_KEYS,
  type ZiweiConsultationTrackId,
  type ZiweiPalaceCounselingItem,
  type ZiweiTrackPalaceReading,
  type ZiweiTrackPriority,
} from "./ziwei/_lib/advanced-ziwei-reading";

type ZiweiGlossaryEntry = { term: string; oneLiner: string; detail?: string };

/** 워커 용어집에서 자미두수 항목만 추린다(사주·점성 용어가 자미 화면에 섞이지 않게). */
const ZIWEI_GLOSSARY_ENTRIES: ZiweiGlossaryEntry[] = [];
for (const term of listGlossaryTerms()) {
  const entry = lookupTerm(term);
  if (entry && entry.system === "ziwei") {
    ZIWEI_GLOSSARY_ENTRIES.push({ term: entry.term, oneLiner: entry.oneLiner, detail: entry.detail });
  }
}

type Step = "form" | "computing" | "result";

interface AdvancedZiweiSectionProps {
  showIntro?: boolean;
  onStartGeneration?: () => void;
  generationLoading?: boolean;
}

interface FormState {
  name: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthHour: string;
  birthMinute: string;
  unknownHour: boolean;
  gender: ZiweiGender;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
  birthPlace: string;
  timezone: string;
}

const RESULT_CACHE_KEY = "premium:ziwei:result:v10";
const BASIC_ZIWEI_ENTRY_URL = "/?action=openZiweiModal";

type ZiweiProfileTimeSeed = {
  birthHour: string;
  birthMinute: string;
  unknownHour: boolean;
  hasProfileHour: boolean;
};

type ZiweiProfileSeed = {
  fingerprint: string;
  form: Partial<FormState>;
  hasProfileHour: boolean;
};

function toProfileInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

// 출생 월/일/시 타이핑 입력의 숫자 마스킹 — app/nakshatra/NakshatraFormClient.tsx 의 digits() 와 동일 규칙.
function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

function normalizeZiweiProfileGender(profile: DestinyProfileCard | null): ZiweiGender {
  return String(profile?.gender || "").trim().toUpperCase() === "M" ? "M" : "F";
}

function normalizeZiweiProfileCalendarType(profile: DestinyProfileCard | null): FormState["calendarType"] {
  const raw = String(profile?.birth?.calType || profile?.calType || profile?.calendarType || "solar").trim().toLowerCase();
  return raw === "lunar" ? "lunar" : "solar";
}

function isUnknownProfileTime(value: unknown): boolean {
  return /unknown|no\s*time|none|미상|모름|불명/i.test(String(value || "").trim());
}

function parseZiweiProfileTimeText(value: unknown): { hour: number; minute: number } | null {
  const raw = String(value || "").trim();
  if (!raw || isUnknownProfileTime(raw)) return null;
  const timePart = raw.includes("T")
    ? raw.split("T")[1]
    : raw.includes(" ")
      ? raw.split(/\s+/).find((part) => /\d{1,2}:?\d{2}/.test(part)) || raw
      : raw;
  const matched = timePart.match(/(\d{1,2})\D?(\d{2})/);
  if (!matched) return null;
  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  return { hour: Math.trunc(hour), minute: Math.trunc(minute) };
}

function resolveZiweiProfileTime(profile: DestinyProfileCard | null): ZiweiProfileTimeSeed {
  const birth = profile?.birth || {};
  const explicitUnknown = Boolean(profile?.timeUnknown)
    || Boolean(profile?.birthTimeUnknown)
    || Boolean(profile?.noBirthTime)
    || Boolean(birth.timeUnknown)
    || isUnknownProfileTime(profile?.birthTime);
  if (explicitUnknown) {
    return { birthHour: "", birthMinute: "0", unknownHour: true, hasProfileHour: false };
  }

  const hour = toProfileInt(birth.hour ?? profile?.birthHour);
  const minute = toProfileInt(birth.minute ?? profile?.birthMinute);
  if (hour !== null && hour >= 0 && hour <= 23) {
    const safeMinute = minute !== null && minute >= 0 && minute <= 59 ? minute : 0;
    return {
      birthHour: String(hour),
      birthMinute: String(safeMinute),
      unknownHour: false,
      hasProfileHour: true,
    };
  }

  const parsed = parseZiweiProfileTimeText(profile?.birthTime || profile?.birthIso);
  if (parsed) {
    return {
      birthHour: String(parsed.hour),
      birthMinute: String(parsed.minute),
      unknownHour: false,
      hasProfileHour: true,
    };
  }

  return { birthHour: "", birthMinute: "0", unknownHour: true, hasProfileHour: false };
}

function buildZiweiProfileSeed(eventProfile?: unknown): ZiweiProfileSeed | null {
  const profile = readCurrentDestinyProfile(eventProfile);
  const birth = resolveDestinyProfileBirthParts(profile);
  if (!profile || !birth) return null;

  const time = resolveZiweiProfileTime(profile);
  const gender = normalizeZiweiProfileGender(profile);
  const calendarType = normalizeZiweiProfileCalendarType(profile);
  const profileId = String(profile.id || profile.profileId || "").trim();
  const name = String(profile.name || "").trim();
  const birthDate = `${String(birth.year).padStart(4, "0")}-${pad2(birth.month)}-${pad2(birth.day)}`;
  const birthPlace = String(profile.location?.label || profile.birthRegion || "").trim();
  const timezone = String(profile.location?.tz || "").trim();

  const form: Partial<FormState> = {
    name,
    birthYear: String(birth.year),
    birthMonth: String(birth.month),
    birthDay: String(birth.day),
    birthHour: time.birthHour,
    birthMinute: time.birthMinute,
    unknownHour: time.unknownHour,
    gender,
    calendarType,
    isLeapMonth: false,
    birthPlace: birthPlace || getAdvancedZiweiCopy(getCurrentLoadingLocale()).defaultBirthPlaceValue,
    timezone: timezone || "Asia/Seoul",
  };

  if (birthPlace) form.birthPlace = birthPlace;
  if (timezone) form.timezone = timezone;

  return {
    fingerprint: [
      profileId,
      name,
      birthDate,
      time.hasProfileHour ? pad2(Number(time.birthHour)) : "",
      time.hasProfileHour ? pad2(Number(time.birthMinute)) : "",
      gender,
      calendarType,
      birthPlace,
      timezone,
      time.unknownHour ? "unknown" : "known",
    ].join("|"),
    form,
    hasProfileHour: time.hasProfileHour,
  };
}

function sectionTitle(sectionId: ZiweiSectionId): string {
  return ZIWEI_SECTIONS.find((s) => s.id === sectionId)?.title || sectionId;
}

const ZIWEI_STRENGTH_SYMBOL_KEY: Record<string, keyof AdvancedZiweiCopy["strengthDescriptions"]> = {
  "◎": "miao",
  O: "deuk",
  "▲": "li",
  "△": "ping",
  X: "ham",
};

// 12궁 전통 명반 배치 — 지지(한글)를 4×4 격자 위치로 매핑(기본 명반 saju-engine.js zw-cell-N과 동일 배열).
// 중앙 2×2(2/2~4/4)는 자미 성도 패널. ZHI_LIST(app/_lib/ziwei-engine.ts)는 한글 지지를 쓴다.
const ZIWEI_BRANCH_GRID_AREA: Record<string, string> = {
  사: "1 / 1", 오: "1 / 2", 미: "1 / 3", 신: "1 / 4",
  진: "2 / 1", 유: "2 / 4",
  묘: "3 / 1", 술: "3 / 4",
  인: "4 / 1", 축: "4 / 2", 자: "4 / 3", 해: "4 / 4",
};

// 별 세기 기호(◎ O ▲ △ X)별 색 토큰
const ZIWEI_STRENGTH_TONE: Record<string, string> = {
  "◎": "text-emerald-300",
  O: "text-sky-300",
  "▲": "text-amber-300",
  "△": "text-slate-300",
  X: "text-rose-300",
};

// 사화 pill 색 위계 — 록=록빛/권=권세/과=명예/기=주의(기본 명반과 동일 의미)
const ZIWEI_SIHUA_PILL: Record<string, string> = {
  화록: "border-lime-300/40 bg-lime-300/12 text-lime-100",
  화권: "border-fuchsia-300/40 bg-fuchsia-300/12 text-fuchsia-100",
  화과: "border-sky-300/40 bg-sky-300/12 text-sky-100",
  화기: "border-rose-300/45 bg-rose-300/14 text-rose-100",
};

/* 결과 화면 구역 이동 바. 이 배열 순서가 곧 DOM 순서이자 칩 순서이며, 스크롤 스파이가 그대로 관찰한다. */
const ZIWEI_RESULT_NAV = [
  { key: 'answer', id: 'ziwei-result-answer' }, { key: 'questions', id: 'ziwei-result-track' },
  { key: 'chart', id: 'ziwei-result-deep' }, { key: 'today', id: 'ziwei-result-today' }, { key: 'pdf', id: 'ziwei-result-pdf' },
] as const;

function palaceForceToneClass(score: number): string {
  if (score >= 78) return "border border-emerald-300/35 bg-emerald-200/15 text-emerald-100";
  if (score >= 62) return "border border-cyan-300/35 bg-cyan-200/15 text-[var(--zw-muted)]";
  if (score >= 46) return "border border-amber-300/35 bg-amber-200/15 text-amber-100";
  return "border border-rose-300/35 bg-rose-200/15 text-rose-100";
}

function trackPriorityToneClass(priority: ZiweiTrackPriority): string {
  if (priority === "primary") return "border-amber-200/35 bg-amber-200/14 text-amber-50";
  if (priority === "secondary") return "border-cyan-200/30 bg-cyan-200/12 text-cyan-50";
  return "border-white/10 bg-white/6 text-slate-300";
}

function zPatternStrengthDescription(symbol: string, copy: AdvancedZiweiCopy): string {
  const key = ZIWEI_STRENGTH_SYMBOL_KEY[symbol];
  return key ? copy.strengthDescriptions[key] : "별의 흐름을 다시 살펴야 하는 상태";
}

function StagePanel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={`relative rounded-xl border border-[var(--zw-rule)] bg-[var(--zw-surface)] ${className || ''}`}>{children}</div>;
}

export default function AdvancedZiweiSectionV2({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
}: AdvancedZiweiSectionProps) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = useMemo(() => getAdvancedZiweiCopy(locale), [locale]);
  const ui = useMemo(() => getPremiumZiweiCopy(locale), [locale]);
  const [inputError, setInputError] = useState("");
  const computationEpoch = useRef(0);
  const deepRef = useRef<HTMLDetailsElement>(null);
  const counselingTracks = useMemo(() => buildCounselingTracks(copy), [copy]);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
    };
  }, []);

  const [step, setStep] = useState<Step>("form");
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState(() => getAdvancedZiweiCopy(getCurrentLoadingLocale()).loadingInitialText);
  const [chart, setChart] = useState<ZiweiDeepChart | null>(null);
  const [chapters, setChapters] = useState<Partial<Record<ZiweiSectionId, ZiweiDeepChapter>>>({});
  const [activeSection, setActiveSection] = useState<ZiweiSectionId>("overview");
  const [openSections, setOpenSections] = useState<number[]>([0]);
  // 절마다 접혀 있는 "왜 이렇게 읽었나" 영역. 결론이 앞, 자미두수 근거가 뒤다.
  const [openEvidence, setOpenEvidence] = useState<number[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<ZiweiConsultationTrackId>("life");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [form, setForm] = useState<FormState>(() => ({
    name: "",
    birthYear: "",
    birthMonth: "1",
    birthDay: "1",
    birthHour: "",
    birthMinute: "0",
    unknownHour: false,
    gender: "F",
    calendarType: "solar",
    isLeapMonth: false,
    birthPlace: getAdvancedZiweiCopy(getCurrentLoadingLocale()).defaultBirthPlaceValue,
    timezone: "Asia/Seoul",
  }));

  const currentProfileFingerprintRef = useRef("");

  // 심화 자미두수 명반은 무료 열람 — 영구 해금 잠금 모델 제거. 유료 요소는 전문가 상담/PDF의 회당 결제로 통일.

  // 심화 자미두수 PDF (ZIWEI_DEEP_PDF): 폼 → PDF 리포트 생성용 출생 정보
  const deepPdfBirth = useMemo<ZiweiDeepBirthInput>(() => ({
    name: form.name.trim(),
    gender: form.gender === "M" ? "male" : "female",
    birthDate: `${String(form.birthYear || "").padStart(4, "0")}-${pad2(Number(form.birthMonth) || 1)}-${pad2(Number(form.birthDay) || 1)}`,
    birthTime: form.unknownHour ? "" : `${pad2(Number(form.birthHour) || 0)}:${pad2(Number(form.birthMinute) || 0)}`,
    birthTimeUnknown: form.unknownHour,
    calendarType: form.calendarType,
    isLeapMonth: form.calendarType === "lunar" ? form.isLeapMonth : false,
  }), [form]);

  const readings = useMemo(() => chart ? ZIWEI_TRACK_KEYS.map(id => buildQuestionReading(chart, id)) : [], [chart]);
  const selectedReading = readings.find(reading => reading.id === activeTrackId);
  const activeChapter = chapters[activeSection];
  const activeTrack = useMemo(() => counselingTracks.find((track) => track.key === activeTrackId) || counselingTracks[0], [activeTrackId, counselingTracks]);

  const activePalace = useMemo(() => {
    if (!chart) return null;
    if (activeSection === "overview" || activeSection === "master") return null;
    return chart.palaces.find((p) => p.id === activeSection) || null;
  }, [activeSection, chart]);

  // 궁을 바꾸면 첫 절만 열린 상태로 되돌린다(앞 궁에서 펼친 절 번호가 따라오지 않게).
  useEffect(() => {
    setOpenSections([0]);
    setOpenEvidence([]);
  }, [activeSection]);

  const toggleChapterSection = useCallback((index: number) => {
    setOpenSections((previous) => (previous.includes(index) ? previous.filter((row) => row !== index) : [...previous, index]));
  }, []);

  const toggleCardEvidence = useCallback((index: number) => {
    setOpenEvidence((previous) => (previous.includes(index) ? previous.filter((row) => row !== index) : [...previous, index]));
  }, []);

  const palaceCounseling = useMemo<ZiweiPalaceCounselingItem[]>(() => (chart ? buildPalaceCounseling(chart) : []), [chart]);

  const trackAnalysis = useMemo(() => (chart && palaceCounseling.length ? buildTrackAnalysis(chart, activeTrack, palaceCounseling, copy) : null), [activeTrack, chart, copy, palaceCounseling]);
  const trackPalaceReadingById = useMemo(() => {
    if (!trackAnalysis) return {} as Partial<Record<ZiweiPalaceId, ZiweiTrackPalaceReading>>;
    return Object.fromEntries(trackAnalysis.palaceReadings.map((reading) => [reading.palaceId, reading])) as Partial<Record<ZiweiPalaceId, ZiweiTrackPalaceReading>>;
  }, [trackAnalysis]);
  const orderedPalaceCounseling = useMemo(() => {
    const order = { primary: 0, secondary: 1, supporting: 2 };
    return [...palaceCounseling].sort((a, b) => {
      const aReading = trackPalaceReadingById[a.palace.id];
      const bReading = trackPalaceReadingById[b.palace.id];
      const priorityGap = order[aReading?.priority || "supporting"] - order[bReading?.priority || "supporting"];
      return priorityGap || b.energy - a.energy;
    });
  }, [palaceCounseling, trackPalaceReadingById]);


  const palaceLinks = useMemo(() => buildPalaceLinks(palaceCounseling, copy.palaceLinkTitles), [copy, palaceCounseling]);

  const sihuaInsights = useMemo(() => (chart ? buildSihuaInsights(chart, palaceCounseling) : []), [chart, palaceCounseling]);

  const borrowedStarInsights = useMemo(() => buildBorrowedStarInsights(palaceCounseling), [palaceCounseling]);

  const enterImmersiveMode = useCallback(async () => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    if (!el?.requestFullscreen) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      }
    } catch {
      // no-op
    }
  }, []);

  const exitImmersiveMode = useCallback(async () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement || !document.exitFullscreen) return;
    try {
      await document.exitFullscreen();
    } catch {
      // no-op
    }
  }, []);

  const toggleImmersiveMode = useCallback(async () => {
    if (isFullscreen) {
      await exitImmersiveMode();
      return;
    }
    await enterImmersiveMode();
  }, [enterImmersiveMode, exitImmersiveMode, isFullscreen]);

  const loadSection = useCallback(
    (section: ZiweiSectionId) => {
      if (!chart) return;
      setActiveSection(section);
      setChapters((prev) => {
        if (prev[section]) return prev;
        const chapter = getZiweiDeepChapter(chart, section);
        return { ...prev, [section]: chapter };
      });
    },
    [chart],
  );

  const selectCounselingTrack = useCallback(
    (trackId: ZiweiConsultationTrackId) => {
      const nextTrack = counselingTracks.find((track) => track.key === trackId) || counselingTracks[0];
      setActiveTrackId(nextTrack.key);
      const firstPalace = nextTrack.primaryPalaces[0];
      if (firstPalace) loadSection(firstPalace);
    },
    [counselingTracks, loadSection],
  );

  const handleCompute = useCallback(() => {
    setInputError("");
    const epoch = ++computationEpoch.current;

    if (!form.unknownHour && String(form.birthHour).trim() === "") {
      setInputError(copy.alertMissingBirthHour);
      return;
    }

    const normalized = normalizeZiweiInput({
      name: form.name,
      birthYear: form.birthYear,
      birthMonth: form.birthMonth,
      birthDay: form.birthDay,
      birthHour: form.birthHour,
      birthMinute: form.birthMinute,
      unknownHour: form.unknownHour,
      gender: form.gender,
      calendarType: form.calendarType,
      isLeapMonth: form.isLeapMonth,
      birthPlace: form.birthPlace,
      timezone: form.timezone,
    });

    if (normalized.errors.length || !normalized.input) {
      setInputError(normalized.errors.map((e) => e.message).join("\n") || copy.alertCheckInput);
      return;
    }

    setStep("computing");
    setProgress(0);

    const progressTexts = copy.progressTexts;

    let p = 0;
    const timer = setInterval(() => {
      if (epoch !== computationEpoch.current) { clearInterval(timer); return; }
      p += 4;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
      }
      setProgress(p);
      setLoadingText(progressTexts[Math.min(progressTexts.length - 1, Math.floor((p / 100) * progressTexts.length))]);
    }, 120);

    setTimeout(() => {
      if (epoch !== computationEpoch.current) { clearInterval(timer); return; }
      try {
        const nextChart = normalizeZiweiForAdvancedReport(calculateZiweiChart(normalized.input!));
        const advancedValidation = validateAdvancedZiweiResult(nextChart);
        if (!advancedValidation.valid) {
          clearInterval(timer);
          setInputError(copy.alertChartError);
          setStep("form");
          return;
        }

        nextChart.warnings = [...nextChart.warnings, ...normalized.warnings];

        const validation = validateZiweiChart(nextChart);
        if (!validation.valid) {
          clearInterval(timer);
          setInputError(copy.alertChartError);
          setStep("form");
          return;
        }

        nextChart.debugWarnings = [...(nextChart.debugWarnings || []), ...validation.debugWarnings];

        primeZiweiDeepRuntime(nextChart, ["overview", "ming"]);
        const overview = getZiweiDeepChapter(nextChart, "overview");
        const ming = getZiweiDeepChapter(nextChart, "ming");

        setChart(nextChart);
        setChapters({ overview, ming });
        setActiveSection("ming");

        try {
          sessionStorage.setItem(
            RESULT_CACHE_KEY,
            JSON.stringify({
              chart: nextChart,
              form,
              chapters: { overview, ming },
              activeSection: "ming",
              activeTrackId,
              profileFingerprint: currentProfileFingerprintRef.current,
            }),
          );
        } catch {
          // no-op
        }

        clearInterval(timer);
        setProgress(100);
        setTimeout(() => { if (epoch === computationEpoch.current) setStep("result"); }, 320);
      } catch (err) {
        clearInterval(timer);
        console.error("[AdvancedZiweiV2] compute error:", err);
        setInputError(copy.alertComputeError);
        setStep("form");
      }
    }, 1600);
  }, [activeTrackId, copy, enterImmersiveMode, form]);

  const restoreCachedResult = useCallback((expectedFingerprint: string): boolean => {
    try {
      const cached = sessionStorage.getItem(RESULT_CACHE_KEY);
      if (!cached) return false;
      const parsed = JSON.parse(cached);
      if (!parsed?.chart || !parsed?.chapters || parsed.profileFingerprint !== expectedFingerprint) {
        sessionStorage.removeItem(RESULT_CACHE_KEY);
        return false;
      }

      const migratedChart = (!parsed.chart.version || !String(parsed.chart.version).includes("four-transformations"))
        ? normalizeZiweiForAdvancedReport(parsed.chart)
        : parsed.chart;
      const advancedValidation = validateAdvancedZiweiResult(migratedChart);
      if (!advancedValidation.valid) {
        sessionStorage.removeItem(RESULT_CACHE_KEY);
        return false;
      }

      primeZiweiDeepRuntime(migratedChart, ["overview", "ming"]);
      const overview = parsed.chapters?.overview || getZiweiDeepChapter(migratedChart, "overview");
      const ming = parsed.chapters?.ming || getZiweiDeepChapter(migratedChart, "ming");
      if (parsed.form) setForm(parsed.form);
      setChart(migratedChart);
      setChapters({ ...parsed.chapters, overview, ming });
      setActiveSection(parsed.activeSection || "overview");
      if (ZIWEI_TRACK_KEYS.includes(parsed.activeTrackId)) {
        setActiveTrackId(parsed.activeTrackId);
      }
      setStep("result");
      return true;
    } catch {
      try {
        sessionStorage.removeItem(RESULT_CACHE_KEY);
      } catch {}
      return false;
    }
  }, []);

  const applyCurrentProfileSeed = useCallback((eventProfile?: unknown) => {
    computationEpoch.current += 1;
    setInputError("");
    const seed = buildZiweiProfileSeed(eventProfile);
    const nextFingerprint = seed?.fingerprint || "";
    currentProfileFingerprintRef.current = nextFingerprint;

    if (restoreCachedResult(nextFingerprint)) {
      return;
    }

    try {
      sessionStorage.removeItem(RESULT_CACHE_KEY);
    } catch {}

    setChart(null);
    setChapters({});
    setActiveSection("overview");
    setActiveTrackId("life");
    setStep("form");

    if (!seed) {
      setForm(prev => ({ ...prev, name: "", birthYear: "", birthMonth: "1", birthDay: "1", birthHour: "", birthMinute: "0", unknownHour: false }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      ...seed.form,
    }));
  }, [restoreCachedResult]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  useEffect(() => {
    applyCurrentProfileSeed();
  }, [applyCurrentProfileSeed]);

  useEffect(() => {
    const handleProfileUpdated = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;
      applyCurrentProfileSeed(detail);
    };
    const handleProfileStorage = (event: StorageEvent) => {
      if (!isDestinyProfileStorageKey(event.key)) return;
      applyCurrentProfileSeed();
    };

    window.addEventListener("cd:destiny-profile-updated", handleProfileUpdated);
    document.addEventListener("destinyProfileChanged", handleProfileUpdated);
    window.addEventListener("storage", handleProfileStorage);
    return () => {
      window.removeEventListener("cd:destiny-profile-updated", handleProfileUpdated);
      document.removeEventListener("destinyProfileChanged", handleProfileUpdated);
      window.removeEventListener("storage", handleProfileStorage);
    };
  }, [applyCurrentProfileSeed]);


  useEffect(() => () => { computationEpoch.current += 1; }, []);
  useEffect(() => {
    if (step !== 'result' || !chart) return;
    try { sessionStorage.setItem(RESULT_CACHE_KEY, JSON.stringify({ chart, form, chapters, activeSection, activeTrackId, profileFingerprint: currentProfileFingerprintRef.current })); } catch {}
  }, [step, chart, form, chapters, activeSection, activeTrackId]);

  useEffect(() => {
    if (step !== 'result') return;
    const revealAnchor = () => {
      const id = window.location.hash.slice(1);
      if (['ziwei-result-chart', 'ziwei-result-palace'].includes(id) && deepRef.current) {
        deepRef.current.open = true;
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
      }
    };
    revealAnchor();
    window.addEventListener('hashchange', revealAnchor);
    return () => window.removeEventListener('hashchange', revealAnchor);
  }, [step]);

  // 구역 이동 바의 활성 칩 — 상단 바(약 72px) 아래로 들어온 구역 중 가장 위를 활성으로 둔다.
  const [activeNavId, setActiveNavId] = useState<string>(ZIWEI_RESULT_NAV[0].id);
  useEffect(() => {
    if (step !== "result") return;
    const nodes = ZIWEI_RESULT_NAV.map((item) => document.getElementById(item.id)).filter(
      (node): node is HTMLElement => !!node,
    );
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActiveNavId(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -62% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [step]);

  if (showIntro) {
    return (
      <section className={`${styles.surface} font-premium relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#020510] p-6 text-slate-100 md:p-8`}>

        <div className="relative z-10">
          <h3 className="font-display mt-3 text-2xl font-black leading-tight text-white md:text-3xl">{copy.introTitle}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200/90">
            {copy.introDesc}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => {
                void enterImmersiveMode();
                onStartGeneration?.();
              }}
              disabled={generationLoading}
              className="rounded-2xl bg-[var(--zw-gold)] px-4 py-4 text-sm font-black text-slate-950"
            >
              {copy.introStartButton}
            </button>
            <button
              onClick={() => {
                window.location.href = BASIC_ZIWEI_ENTRY_URL;
              }}
              className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 text-sm font-semibold text-slate-100"
            >
              {copy.introBasicButton}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (step === "form") {
    return (
      <section className={`${styles.surface} font-body relative min-h-[100dvh] overflow-hidden px-4 py-6 text-slate-100 sm:px-6 lg:px-8`}>

        <div className="relative mx-auto flex min-h-[100dvh] max-w-5xl items-center py-[calc(1rem+env(safe-area-inset-top))]">
          <StagePanel className="relative z-10 w-full p-5 sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display mt-3 text-3xl font-black text-white md:text-4xl">{copy.formTitle}</h2>
                <p className="font-premium mt-3 max-w-2xl text-sm leading-7 text-slate-200/85">
                  {copy.formDesc}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = BASIC_ZIWEI_ENTRY_URL;
                  }}
                  className="rounded-full border border-amber-200/25 bg-amber-200/10 px-4 py-2 text-xs font-semibold text-amber-50"
                >
                  {copy.goBasicButton}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleImmersiveMode()}
                  className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold text-slate-100"
                >
                  {isFullscreen ? copy.fullscreenExitLabel : copy.fullscreenEnterLabel}
                </button>
              </div>
            </div>

            <fieldset className={styles.inputTopics}><legend>{ui.choose}</legend><p>{ui.chooseHint}</p><div className={styles.topicOptions}>{counselingTracks.map(track => <label key={track.key}><input type="radio" name="ziwei-topic" value={track.key} checked={activeTrackId === track.key} onChange={() => setActiveTrackId(track.key)} />{track.title}</label>)}</div></fieldset>
            {inputError ? <p role="alert" className={styles.error}>{inputError}</p> : null}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldNameLabel}</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none ring-0 placeholder:text-slate-500"
                  placeholder={copy.namePlaceholder}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldGenderLabel}</span>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value as ZiweiGender }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none"
                >
                  <option value="F">{copy.genderLabels.female}</option>
                  <option value="M">{copy.genderLabels.male}</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldBirthYearLabel}</span>
                <input
                  type="number"
                  value={form.birthYear}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthYear: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldBirthMonthLabel}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="MM"
                  value={form.birthMonth}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthMonth: digitsOnly(e.target.value, 2) }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldBirthDayLabel}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="DD"
                  value={form.birthDay}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthDay: digitsOnly(e.target.value, 2) }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldBirthHourLabel}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="HH"
                  value={form.birthHour}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthHour: digitsOnly(e.target.value, 2) }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                  disabled={form.unknownHour}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldCalendarLabel}</span>
                <select
                  value={form.calendarType}
                  onChange={(e) => setForm((prev) => ({ ...prev, calendarType: e.target.value as "solar" | "lunar" }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none"
                >
                  <option value="solar">{copy.calendarLabels.solar}</option>
                  <option value="lunar">{copy.calendarLabels.lunar}</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldBirthPlaceLabel}</span>
                <input
                  value={form.birthPlace}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthPlace: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                  placeholder={copy.birthPlacePlaceholder}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldTimezoneLabel}</span>
                <input
                  value={form.timezone}
                  onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                  placeholder="Asia/Seoul"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-300">
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.unknownHour}
                  onChange={(e) => setForm((prev) => ({ ...prev, unknownHour: e.target.checked }))}
                  className="h-4 w-4 accent-cyan-300"
                />
                {copy.unknownHourCheckboxLabel}
              </label>
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isLeapMonth}
                  onChange={(e) => setForm((prev) => ({ ...prev, isLeapMonth: e.target.checked }))}
                  className="h-4 w-4 accent-cyan-300"
                />
                {copy.leapMonthCheckboxLabel}
              </label>
            </div>

            <p className="mt-3 text-xs leading-6 text-amber-100/85">
              {copy.formDisclaimer}
            </p>

            <button
              type="button"
              onClick={handleCompute}
              className="mt-6 w-full rounded-2xl bg-[var(--zw-gold)] px-5 py-4 text-sm font-black text-slate-950"
            >
              {copy.computeButton}
            </button>
          </StagePanel>
        </div>
      </section>
    );
  }

  if (step === "computing") {
    return (
      <section className={`${styles.surface} font-body relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6 text-center text-slate-100`}>

        <div className="relative z-10 w-full max-w-xl">
          <StagePanel className="p-8 sm:p-10">
            <h2 className="font-display mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">{loadingText}</h2>
            <p className="mt-3 text-sm font-semibold text-amber-100">{copy.computingTrackLabelPrefix}{activeTrack.title}</p>
            <div role="progressbar" aria-label={loadingText} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-7 overflow-hidden rounded-full border border-white/12 bg-white/10">
              <div className="h-2 bg-[var(--zw-gold)]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-xs text-[var(--zw-muted)]">{progress}%</p>
          </StagePanel>
        </div>
      </section>
    );
  }

  if (!chart || !activeChapter) {
    return null;
  }

  const orbitActivePalaceId: ZiweiPalaceId | undefined =
    activeSection === "overview" || activeSection === "master" ? undefined : activeSection;
  // "라벨: 값" 형태의 요약 줄은 라벨을 소제목으로 올려 문장만 남긴다.
  const chapterLead = (activeChapter.summary || [])
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .map((line) => {
      const marker = line.indexOf(": ");
      if (marker <= 0 || marker > 14) return { label: "", value: line };
      return { label: line.slice(0, marker), value: line.slice(marker + 2) };
    });
  // 궁 챕터는 계산된 절 구조를 그대로 카드로 쓴다(문자열을 다시 자르지 않는다).
  const categoryCards = activeChapter.palaceReading?.categories || [];
  // 개관·마스터플랜은 palaceReading 이 없고 장문에 "### N." 도 없어 빈 배열이 온다 - 그때는 통짜 산문으로 렌더한다.
  const chapterSections = splitZiweiDeepCategories(activeChapter.fullText || "");
  const chapterText = `${activeChapter.title} ${(activeChapter.summary || []).join(" ")} ${activeChapter.fullText || ""}`;
  const chapterGlossary = ZIWEI_GLOSSARY_ENTRIES.filter((entry) => chapterText.includes(entry.term));
  const doNowItems = [
    ...new Set(
      [...(activeChapter.remedies || []), ...(activeChapter.actionItems || [])]
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  ].slice(0, 6);
  const routineBlocks = [
    { heading: copy.thisWeekHeading, items: activeChapter.routine7Days || [] },
    { heading: copy.thisMonthHeading, items: activeChapter.routine30Days || [] },
  ].filter((block) => block.items.length);

  const activePalaceSihua = activePalace
    ? Array.from(new Set((activePalace.fourTransformations || []).map((t) => transformationTypeToLabel(t.type)).filter(Boolean)))
    : [];

  return (
    <section className={`${styles.surface} fixed inset-0 z-50 h-[100dvh] overflow-y-auto overscroll-none px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]`}>
      <nav aria-label={copy.resultNavAriaLabel} className={styles.topbar}>
        <button type="button" className={styles.fullscreen} onClick={() => void toggleImmersiveMode()}>{isFullscreen ? copy.fullscreenExitLabel : copy.fullscreenEnterLabel}</button>
        <ul>{ZIWEI_RESULT_NAV.map(item => <li key={item.id}><a href={`#${item.id}`} aria-current={activeNavId === item.id ? 'true' : undefined} onClick={() => { if(item.key === 'chart' && deepRef.current) deepRef.current.open = true; }}>{ui[item.key]}</a></li>)}</ul>
      </nav>
      <div className={styles.content}>
        {selectedReading ? <ZiweiConsultationHero key={activeTrackId} chart={chart} reading={selectedReading} locale={locale} /> : null}
        <ZiweiQuestionSections readings={readings} selected={activeTrackId} onSelect={selectCounselingTrack} locale={locale} onPalace={id => { loadSection(id); if(deepRef.current) deepRef.current.open = true; requestAnimationFrame(() => document.getElementById('ziwei-result-palace')?.scrollIntoView({ block:'start' })); }} />
        <details ref={deepRef} id="ziwei-result-deep" className={styles.deep}>
          <summary>{ui.deep}<small>{ui.deepHint}</small></summary>
          <div className={styles.deepBody}>
            {chart.warnings.length ? <div className={styles.error}>{chart.warnings.map((warning,index) => <p key={index}>{warning.message}</p>)}</div> : null}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1.1fr]">
          <section id="ziwei-result-chart" className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))]">
          <StagePanel className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-[var(--zw-muted)]/80">{copy.gridSectionEyebrow}</p>
                <h2 className="mt-2 text-lg font-black text-white">{copy.gridSectionTitle}</h2>
              </div>
              <p className="text-xs text-slate-300">{copy.selectedPalaceLabelPrefix}{sectionTitle(activeSection)}</p>
            </div>
            {/* 12궁 전통 4×4 명반 — 기본 명반(saju-engine.js zw-* 격자)과 동일한 지지 배치/팔레트 레퍼런스.
                🔴 375px 에서 한 칸이 약 73px 이라 칸 안 글자는 12px 미만으로 내리지 않는다
                (scripts/verify-ziwei-chart-customer-copy.mjs 검사 3이 잠근다).
                🔴 행은 minmax(min-content, 1fr) 이고 정사각은 sm 부터다 — 좁은 화면에서 1fr 고정 행은
                주성 2줄 궁(염정◎/천상◎ · 자미◎/천부◎)의 둘째 줄을 13.8px 잘라낸다(같은 날 실측:
                clientHeight 71 vs scrollHeight 77). 검사 4가 잠근다. */}
            <div
              className="relative mx-auto mt-5 w-full max-w-[38rem] gap-1.5 sm:aspect-square"
              style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gridTemplateRows: "repeat(4, minmax(min-content, 1fr))" }}
            >
              {chart.palaces.map((palace) => {
                const area = ZIWEI_BRANCH_GRID_AREA[palace.earthlyBranch];
                if (!area) return null;
                const active = palace.id === orbitActivePalaceId;
                const isMeng = palace.id === "ming";
                const isShen = !!chart.shenGong && palace.earthlyBranch === chart.shenGong && !isMeng;
                const hasHuaji = Array.from(
                  new Set((palace.fourTransformations || []).map((t) => transformationTypeToLabel(t.type)).filter(Boolean)),
                ).includes("화기");
                const mains = palace.mainStars || [];
                const roleClass = active
                  ? "border-amber-200/70 bg-gradient-to-br from-indigo-500/25 to-violet-600/20 shadow-[0_0_26px_rgba(196,181,253,0.32)]"
                  : isMeng
                    ? "border-amber-300/55 bg-black/30 shadow-[0_0_20px_rgba(232,213,163,0.18)]"
                    : isShen
                      ? "border-sky-300/45 bg-black/30 shadow-[0_0_18px_rgba(125,211,252,0.16)]"
                      : hasHuaji
                        ? "border-rose-300/45 bg-black/30"
                        : "border-violet-300/20 bg-black/25 hover:border-violet-200/45 hover:bg-black/35";
                return (
                  <button
                    key={palace.id}
                    type="button"
                    onClick={() => loadSection(palace.id)}
                    style={{ gridArea: area }}
                    aria-pressed={active}
                    aria-label={`${palace.name} ${palace.earthlyBranch}`}
                    className={`group flex min-h-0 flex-col gap-0.5 overflow-hidden rounded-xl border p-2 text-left transition duration-200 ${roleClass}`}
                  >
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[13px] font-black leading-tight text-white">{palace.name}</span>
                      <span className="shrink-0 text-xs font-black text-white/60">{palace.earthlyBranch}</span>
                    </div>
                    <div className="flex min-h-0 flex-col gap-0.5">
                      {mains.length ? (
                        mains.map((star, i) => (
                          <span key={`${star.name}-${i}`} className="flex items-baseline gap-0.5 text-xs font-bold leading-tight text-amber-50">
                            {star.name}
                            {star.strengthSymbol ? (
                              <span className={`text-xs font-black ${ZIWEI_STRENGTH_TONE[star.strengthSymbol] || "text-slate-200"}`}>{star.strengthSymbol}</span>
                            ) : null}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs italic text-slate-300">{copy.emptyPalaceCellLabel}</span>
                      )}
                    </div>
                  </button>
                );
              })}
              <div
                style={{ gridArea: "2 / 2 / 4 / 4" }}
                className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-amber-200/35 bg-[radial-gradient(circle_at_50%_28%,rgba(232,213,163,0.2),transparent_58%),radial-gradient(circle_at_30%_80%,rgba(167,139,250,0.2),transparent_56%),linear-gradient(160deg,rgba(40,28,84,0.85),rgba(15,13,42,0.92))] p-3 text-center shadow-[inset_0_0_28px_rgba(232,213,163,0.18)]"
              >
                <p className="text-xs font-black tracking-[0.16em] text-amber-100/90">紫微星圖</p>
                <p className="mt-1 text-sm font-black text-amber-100 sm:text-base">{copy.centerPanelSubtitle}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  <span className="rounded-full border border-amber-300/45 bg-amber-300/12 px-2 py-0.5 text-xs font-bold text-amber-100">{copy.statMingLabel} {chart.mingGong}</span>
                  <span className="rounded-full border border-sky-300/45 bg-sky-300/12 px-2 py-0.5 text-xs font-bold text-sky-100">{copy.statShenLabel} {chart.shenGong}</span>
                  <span className="rounded-full border border-violet-300/45 bg-violet-300/12 px-2 py-0.5 text-xs font-bold text-violet-100">{copy.statJuLabel} {chart.juInfo}</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-300">{copy.centerPanelDesc}</p>
          </StagePanel>
          </section>

          <section id="ziwei-result-palace" className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))]">
          <StagePanel className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-[var(--zw-muted)]/80">{activeTrack.title}</p>
                <h2 className="mt-2 text-2xl font-black text-white">{activeChapter.title}</h2>
                {activeChapter.subtitle ? <p className="mt-2 text-sm text-slate-300">{activeChapter.subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => loadSection(activeSection)}
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold text-slate-100"
              >
                {copy.rereadButtonLabel}
              </button>
            </div>

            {activePalace ? (
              <div className="relative mt-5 overflow-hidden rounded-[1.5rem] border border-cyan-200/20 bg-[linear-gradient(135deg,rgba(8,18,38,0.96),rgba(18,11,39,0.92)_52%,rgba(7,20,31,0.96))] p-4 shadow-[0_18px_54px_rgba(8,47,73,0.28)]">
                <div className="pointer-events-none absolute inset-x-8 h-px bg-gradient-to-r from-transparent via-cyan-100/45 to-transparent" />
                <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
                  <div className="relative aspect-square min-h-[13rem] overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/24">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(125,211,252,0.22),transparent_35%),radial-gradient(circle_at_28%_32%,rgba(251,191,36,0.22),transparent_18%),radial-gradient(circle_at_76%_70%,rgba(192,132,252,0.2),transparent_24%)]" />
                    <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:42px_42px]" />
                    <div className="absolute left-[18%] top-[26%] h-2.5 w-2.5 rounded-full bg-cyan-100 shadow-[0_0_18px_rgba(165,243,252,0.9)]" />
                    <div className="absolute left-[42%] top-[18%] h-2 w-2 rounded-full bg-amber-100 shadow-[0_0_18px_rgba(254,243,199,0.9)]" />
                    <div className="absolute left-[66%] top-[42%] h-2.5 w-2.5 rounded-full bg-fuchsia-100 shadow-[0_0_18px_rgba(245,208,254,0.9)]" />
                    <div className="absolute left-[51%] top-[70%] h-2 w-2 rounded-full bg-sky-100 shadow-[0_0_18px_rgba(186,230,253,0.9)]" />
                    <div className="absolute left-[21%] top-[30%] h-px w-[31%] rotate-[-10deg] bg-cyan-100/45" />
                    <div className="absolute left-[43%] top-[25%] h-px w-[29%] rotate-[36deg] bg-amber-100/40" />
                    <div className="absolute left-[54%] top-[57%] h-px w-[25%] rotate-[104deg] bg-fuchsia-100/40" />
                    <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/10 bg-black/42 px-4 py-3 backdrop-blur-xl">
                      <p className="text-[10px] font-semibold tracking-[0.26em] text-[var(--zw-muted)]/80">{copy.palaceMapEyebrow}</p>
                      <p className="mt-1 text-sm font-black text-white">{activePalace.name} · {activePalace.earthlyBranch}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.28em] text-amber-100/80">{activePalace.name} {copy.palaceReadingSuffixLabel}</p>
                    <h3 className="mt-2 text-xl font-black text-white">
                      {activePalace.id === "ming"
                        ? "성향, 자기방어, 선택 습관을 먼저 읽습니다"
                        : activePalace.id === "siblings"
                          ? "수평 관계, 협업, 신뢰 흐름을 먼저 읽습니다"
                          : "이 궁의 실제 작동 방식을 먼저 읽습니다"}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-200">
                      {activePalace.id === "ming"
                        ? "명궁은 기본 성격 설명이 아니라, 위기 앞에서 어떤 얼굴이 먼저 나오고 어떤 기준으로 삶을 움직이는지 보여주는 중심 궁입니다."
                        : activePalace.id === "siblings"
                          ? "형제궁은 혈연을 넘어 친구, 동료, 라이벌, 협업 파트너와 어떤 거리로 연결되는지 보여주는 수평 관계의 별자리입니다."
                          : `${activePalace.name}은 ${PALACE_DEFINITION_MAP[activePalace.id].definition}입니다.`}
                    </p>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/24 p-4">
                      <p className="text-xs font-semibold tracking-[0.24em] text-[var(--zw-muted)]/85">{copy.detailCard.evidenceSummaryTitle}</p>
                      <dl className="mt-3 grid gap-2 text-xs leading-6 text-slate-200 sm:grid-cols-2">
                        <div>
                          <dt className="font-semibold text-white">{copy.detailCard.mainStarLabel}</dt>
                          <dd>{activePalace.mainStars.map((s) => `${s.name}${s.strengthSymbol || ""}`).join(" · ") || copy.noMainStarShort}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-white">{copy.detailCard.auxLabel}</dt>
                          <dd>{(activePalace.subStars || []).map((s) => s.name).join(" · ") || copy.noAuxStarCell}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-white">{copy.detailCard.sihuaLabel}</dt>
                          <dd className="mt-1 flex flex-wrap gap-1">
                            {activePalaceSihua.length ? (
                              activePalaceSihua.map((label) => (
                                <span key={label} className={`rounded-full border px-2 py-0.5 text-xs font-bold ${ZIWEI_SIHUA_PILL[label] || "border-white/15 bg-white/10 text-white"}`}>
                                  {label}
                                </span>
                              ))
                            ) : (
                              <span>{copy.noSihuaShort}</span>
                            )}
                          </dd>
                        </div>
                        {activePalace.dahan ? (
                          <div>
                            <dt className="font-semibold text-white">{copy.palaceDahanLabel}</dt>
                            <dd>{activePalace.dahan}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* (1) 리드 - 챕터 요약. "라벨: 값" 형태는 라벨을 소제목으로 올린다. */}
            <div className="mt-5 grid gap-3">
              {chapterLead.map((item, index) => (
                <div key={`lead-${index}`} className={`rounded-2xl border px-4 py-3 ${index === 0 ? "border-amber-200/24 bg-amber-200/8" : "border-white/10 bg-black/20"}`}>
                  {item.label ? (
                    <>
                      <p className="text-[11px] font-semibold text-[var(--zw-muted)]/85">{item.label}</p>
                      <p className="mt-1 text-sm leading-7 text-slate-200">{item.value}</p>
                    </>
                  ) : (
                    <AiResultProse value={item.value} className="text-sm leading-7 text-amber-50" />
                  )}
                </div>
              ))}
            </div>

            {/* (2) 절 단위 카드. 결론(핵심 한 줄 → 실제 모습 → 강점/주의/활용)이 앞이고 명반 근거는 뒤에 접어 둔다.
                궁 챕터는 palaceReading.categories 를 그대로 쓰고, palaceReading 이 없는 개관·마스터플랜만
                splitZiweiDeepCategories 산문 경로로 떨어진다(절 분리 정규식은 여전히 그 함수 한 곳뿐이다). */}
            <div className="mt-5">
              <p className="text-[11px] font-semibold tracking-[0.28em] text-[var(--zw-muted)]/85">{copy.chapterSectionsHeading}</p>
              <div className="mt-3 grid gap-2">
                {categoryCards.length ? (
                  categoryCards.map((card, index) => {
                    const open = openSections.includes(index);
                    const evidenceOpen = openEvidence.includes(index);
                    return (
                      <div key={`${activeSection}-card-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                        <button
                          type="button"
                          onClick={() => toggleChapterSection(index)}
                          aria-expanded={open}
                          className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200/70"
                        >
                          <span className="text-sm font-black leading-6 text-white">{card.categoryTitle}</span>
                          <span aria-hidden="true" className="shrink-0 text-base font-black text-[var(--zw-muted)]/85">{open ? "−" : "+"}</span>
                        </button>
                        {open ? (
                          <div className="border-t border-white/10 px-4 pb-4 pt-3">
                            {card.headline ? <p className="font-premium text-[15px] font-black leading-7 text-amber-50">{card.headline}</p> : null}
                            <p className="font-premium mt-2 text-sm leading-7 text-slate-200">{card.interpretation}</p>

                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                              {card.strengths?.length ? (
                                <section className="rounded-2xl border border-emerald-300/18 bg-emerald-200/8 p-4">
                                  <p className="text-xs font-semibold text-emerald-100">✦ {copy.detailCard.workingWellTitle}</p>
                                  <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-100">
                                    {card.strengths.map((line) => (
                                      <li key={line}>• {line}</li>
                                    ))}
                                  </ul>
                                </section>
                              ) : null}
                              {card.cautions?.length ? (
                                <section className="rounded-2xl border border-rose-300/18 bg-rose-200/8 p-4">
                                  <p className="text-xs font-semibold text-rose-100">⚠ {copy.detailCard.overworkingTitle}</p>
                                  <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-100">
                                    {card.cautions.map((line) => (
                                      <li key={line}>• {line}</li>
                                    ))}
                                  </ul>
                                </section>
                              ) : null}
                            </div>

                            {card.actions?.length ? (
                              <section className="mt-2 rounded-2xl border border-sky-300/18 bg-sky-200/8 p-4">
                                <p className="text-xs font-semibold text-sky-100">💡 {copy.detailCard.practicalUseTitle}</p>
                                <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-100">
                                  {card.actions.map((line) => (
                                    <li key={line}>• {line}</li>
                                  ))}
                                </ul>
                              </section>
                            ) : null}

                            {card.basisChips?.length ? (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {card.basisChips.map((chip) => (
                                  <span key={`${chip.label}-${chip.value}`} className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-slate-200">
                                    <span className="font-semibold text-[var(--zw-muted)]">{chip.label}</span> {chip.value}
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            {card.evidenceNotes?.length ? (
                              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                                <button
                                  type="button"
                                  onClick={() => toggleCardEvidence(index)}
                                  aria-expanded={evidenceOpen}
                                  className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200/70"
                                >
                                  <span className="text-xs font-semibold text-cyan-50">{copy.evidenceToggleLabel}</span>
                                  <span aria-hidden="true" className="shrink-0 text-sm font-black text-[var(--zw-muted)]/85">{evidenceOpen ? "−" : "+"}</span>
                                </button>
                                {evidenceOpen ? (
                                  <div className="border-t border-white/10 px-4 pb-4 pt-3">
                                    <ul className="font-premium space-y-2 text-sm leading-7 text-slate-300">
                                      {card.evidenceNotes.map((line) => (
                                        <li key={line}>• {line}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : chapterSections.length ? (
                  chapterSections.map((section, index) => {
                    const open = openSections.includes(index);
                    return (
                      <div key={`${activeSection}-part-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                        <button
                          type="button"
                          onClick={() => toggleChapterSection(index)}
                          aria-expanded={open}
                          className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200/70"
                        >
                          <span className="text-sm font-black leading-6 text-white">{section.title}</span>
                          <span aria-hidden="true" className="shrink-0 text-base font-black text-[var(--zw-muted)]/85">{open ? "−" : "+"}</span>
                        </button>
                        {open ? (
                          <div className="border-t border-white/10 px-4 pb-4">
                            <AiResultProse value={section.body} />
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 pb-4">
                    <AiResultProse value={activeChapter.fullText} />
                  </div>
                )}
              </div>
            </div>

            {/* (3) 용어 풀이 - 공용 GlossaryTerm + 워커 용어집(재구현 금지). */}
            {chapterGlossary.length ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold text-slate-300">{copy.glossaryHeading}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-100">
                  {chapterGlossary.map((entry) => (
                    <GlossaryTerm key={entry.term} hint={entry.oneLiner} detail={entry.detail}>
                      {entry.term}
                    </GlossaryTerm>
                  ))}
                </div>
              </div>
            ) : null}

            {/* (4) 읽고 나서 할 것 - 처방/실천 + 7일·30일 루틴. */}
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {doNowItems.length ? (
                <div className="rounded-2xl border border-emerald-200/20 bg-emerald-200/8 p-4">
                  <p className="text-xs font-semibold text-emerald-100">{copy.doNowHeading}</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-100">
                    {doNowItems.map((item) => (
                      <li key={`do-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {routineBlocks.map((block) => (
                  <div key={block.heading} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-semibold text-slate-300">{block.heading}</p>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-200">
                      {block.items.map((item) => (
                        <li key={`${block.heading}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </StagePanel>
          </section>
        </div>


            <details className={styles.deep}><summary>{copy.detailHeading}</summary>
        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-[var(--zw-muted)]/80">{copy.detailHeading}</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {orderedPalaceCounseling.map((item) => {
              const reading = trackPalaceReadingById[item.palace.id];
              if (!reading) return null;
              return (
                <article key={`detail-${item.palace.id}`} className={`rounded-2xl border bg-gradient-to-br from-[#0a1427]/90 via-[#0b1224]/85 to-[#130b25]/88 p-4 shadow-[0_14px_40px_rgba(5,10,30,0.35)] ${reading.priority === "primary" ? "border-amber-200/28" : "border-white/10"}`}>
                  <details open={reading.priority === "primary"}>
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-lg font-black text-white">{reading.palaceName}</h3>
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${trackPriorityToneClass(reading.priority)}`}>
                              {trackPriorityLabel(reading.priority)}
                            </span>
                          </div>
                          <p className="font-premium mt-2 text-sm leading-7 text-slate-200">{reading.headline}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${palaceForceToneClass(item.energy)}`}>{palaceForceLabel(item.energy)}</span>
                      </div>
                    </summary>

                    <div className="mt-4 grid gap-3">
                      <section className="rounded-2xl border border-cyan-200/15 bg-black/24 p-4">
                        <p className="text-xs font-semibold text-[var(--zw-muted)]">{copy.detailCard.evidenceSummaryTitle}</p>
                        <div className="mt-3 grid gap-2 text-xs leading-6 text-slate-200 sm:grid-cols-2">
                          <p><span className="font-semibold text-white">{copy.detailCard.mainStarLabel}</span>: {reading.evidence.mainStars.join(" · ") || copy.noMainStarShort}</p>
                          <p><span className="font-semibold text-white">{copy.detailCard.auxLabel}</span>: {reading.evidence.auxiliaryStars.join(" · ") || copy.noAuxStarCell}</p>
                          <p><span className="font-semibold text-white">{copy.detailCard.sihuaLabel}</span>: {reading.evidence.transformations.join(" / ") || copy.noSihuaShort}</p>
                          <p><span className="font-semibold text-white">{copy.detailCard.connectedPalaceLabel}</span>: {[reading.evidence.oppositePalace, ...reading.evidence.relatedPalaces].filter(Boolean).join(" · ") || copy.noConnectedPalaceShort}</p>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-cyan-200/16 bg-cyan-200/8 p-4">
                        <p className="text-xs font-semibold text-[var(--zw-muted)]">{copy.detailCard.customerReadingTitle}</p>
                        <div className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-100/92">
                          <p><span className="font-semibold text-white">{copy.detailCard.meaningLabel}</span>: {reading.customerMeaning}</p>
                          <p><span className="font-semibold text-white">{copy.detailCard.corePatternLabel}</span>: {reading.corePattern}</p>
                          <p><span className="font-semibold text-white">{copy.detailCard.baseTraitLabel}</span>: {item.reality}</p>
                        </div>
                      </section>

                      <div className="grid gap-3 md:grid-cols-2">
                        <section className="rounded-2xl border border-emerald-300/18 bg-emerald-200/8 p-4">
                          <p className="text-xs font-semibold text-emerald-100">{copy.detailCard.workingWellTitle}</p>
                          <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-100/92">
                            {reading.strengths.map((line) => (
                              <li key={line}>• {line}</li>
                            ))}
                          </ul>
                        </section>
                        <section className="rounded-2xl border border-rose-300/18 bg-rose-200/8 p-4">
                          <p className="text-xs font-semibold text-rose-100">{copy.detailCard.overworkingTitle}</p>
                          <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-100/92">
                            {reading.challenges.map((line) => (
                              <li key={line}>• {line}</li>
                            ))}
                          </ul>
                        </section>
                      </div>

                      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-semibold text-[var(--zw-muted)]">{copy.detailCard.realLifeSceneTitle}</p>
                        <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-200">
                          {reading.realLifeManifestations.map((line) => (
                            <li key={line}>• {line}</li>
                          ))}
                        </ul>
                      </section>

                      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-semibold text-[var(--zw-muted)]">{copy.detailCard.crossPalaceTitle}</p>
                        <p className="font-premium mt-3 text-sm leading-7 text-slate-200">{reading.crossPalaceInterpretation}</p>
                        <p className="font-premium mt-3 text-sm leading-7 text-slate-200">{reading.selectedTrackRelevance}</p>
                      </section>

                      <div className="grid gap-3 md:grid-cols-2">
                        <section className="rounded-2xl border border-amber-200/20 bg-amber-200/8 p-4">
                          <p className="text-xs font-semibold text-amber-100">{copy.detailCard.currentTimingTitle}</p>
                          <p className="font-premium mt-3 text-sm leading-7 text-slate-100/92">{reading.timingInterpretation}</p>
                        </section>
                        <section className="rounded-2xl border border-sky-200/18 bg-sky-200/8 p-4">
                          <p className="text-xs font-semibold text-sky-100">{copy.detailCard.practicalUseTitle}</p>
                          <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-100/92">
                            {reading.practicalAdvice.map((line) => (
                              <li key={line}>• {line}</li>
                            ))}
                          </ul>
                        </section>
                      </div>

                      {reading.dataLimitations.length ? (
                        <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-xs leading-6 text-slate-300">
                          {reading.dataLimitations.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      ) : null}

                      <details className="rounded-2xl border border-cyan-200/15 bg-cyan-200/8 px-4 py-3 text-xs leading-6 text-cyan-50">
                        <summary className="cursor-pointer font-semibold">{copy.evidenceToggleLabel}</summary>
                        <ul className="mt-3 space-y-1">
                          {reading.evidence.lines.map((line) => (
                            <li key={line}>• {line}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        </StagePanel>

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-[var(--zw-muted)]/80">{copy.palaceLinkHeading}</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {palaceLinks.map((link) => (
              <div key={link.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-black text-white">{link.title}</p>
                <p className="mt-2 text-xs text-[var(--zw-muted)]">{link.lens} · {link.state}</p>
                <p className="mt-2 text-sm leading-7 text-slate-200">{link.summary}</p>
              </div>
            ))}
          </div>
        </StagePanel>

        <div className="grid gap-4 lg:grid-cols-2">
          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-[var(--zw-muted)]/80">{copy.sihuaHeading}</p>
            <div className="mt-4 grid gap-3">
              {sihuaInsights.map((line, index) => (
                <p key={`sihua-${index}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                  {line}
                </p>
              ))}
            </div>
          </StagePanel>

          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-[var(--zw-muted)]/80">{copy.borrowedStarHeading}</p>
            <div className="mt-4 grid gap-3">
              {borrowedStarInsights.length ? borrowedStarInsights.map((line, index) => (
                <p key={`borrow-${index}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                  {line}
                </p>
              )) : (
                <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                  {copy.borrowedStarFallback}
                </p>
              )}
            </div>
          </StagePanel>
        </div>

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-[var(--zw-muted)]/80">{copy.summaryTableHeading}</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {palaceCounseling.map((item) => {
              const reading = trackPalaceReadingById[item.palace.id];
              const forceRatio = Math.max(6, Math.min(100, Math.round(item.energy)));
              return (
                <div key={`summary-${item.palace.id}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <dt className="text-sm font-black text-white">{item.palace.name}</dt>
                  <dd className="mt-2 flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-semibold text-white">{copy.tableColForce}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 font-semibold ${palaceForceToneClass(item.energy)}`}>
                      {palaceForceLabel(item.energy)}
                    </span>
                  </dd>
                  <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/12">
                    <span className="block h-full rounded-full bg-gradient-to-r from-amber-300/85 to-cyan-200/85" style={{ width: `${forceRatio}%` }} />
                  </div>
                  <dd className="mt-3 text-xs leading-6 text-slate-300">{item.definition}</dd>
                  <dd className="mt-2 text-xs leading-6 text-slate-200">
                    <span className="font-semibold text-white">{copy.tableColMainStar}</span> {item.palace.mainStars.map((s) => s.name).join(" · ") || copy.noMainStarShort}
                  </dd>
                  <dd className="mt-1 text-xs leading-6 text-slate-200">
                    <span className="font-semibold text-white">{copy.tableColAuxStar}</span> {item.palace.auxiliaryStars.map((s) => s.name).slice(0, 3).join(" · ") || copy.noAuxStarCell}
                  </dd>
                  <dd className="mt-3 flex items-baseline gap-2 text-xs">
                    <span className="font-semibold text-white">{copy.tableColPriority}</span>
                    <span className={`rounded-full border px-2.5 py-1 font-semibold ${trackPriorityToneClass(reading?.priority || "supporting")}`}>
                      {trackPriorityLabel(reading?.priority || "supporting")}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </StagePanel>
            </details>
          </div>
        </details>
        <section id="ziwei-result-today" className={styles.today}><h2>{ui.todayTitle}</h2><p>{selectedReading?.today}</p></section>
        <div id="ziwei-result-pdf" className={styles.pdf}><ZiweiDeepPdfPanel key={JSON.stringify(chart.user)} birth={deepPdfBirth} disabled={!chart} /></div>
      </div>
    </section>
  );
}

export { __cmsZiweiDeepDefaults } from "./ziwei/_lib/advanced-ziwei-reading";
