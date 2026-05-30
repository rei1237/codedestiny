"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateZiweiChart,
  normalizeZiweiForAdvancedReport,
  validateAdvancedZiweiResult,
} from "../_lib/ziwei-engine";
import { normalizeZiweiInput } from "../_lib/normalize-ziwei-input";
import { getZiweiDeepChapter, primeZiweiDeepRuntime } from "../_lib/ziwei-deep-runtime";
import { validateZiweiChart } from "../_lib/validate-ziwei-chart";
import {
  ZiweiDeepChart,
  ZiweiDeepChapter,
  ZiweiStarMeta,
  ZiweiGender,
  ZiweiPalaceId,
  ZiweiSectionId,
  ZIWEI_SECTIONS,
} from "../_lib/ziwei-types";
import { transformationTypeToLabel } from "../_lib/ziwei-advanced-normalization";
import ZiweiStarField from "./ziwei/ZiweiStarField";
import ZiweiCosmicHero from "./ziwei/ZiweiCosmicHero";
import ZiweiPalaceOrbit from "./ziwei/ZiweiPalaceOrbit";
import ZiweiPalaceTabs from "./ziwei/ZiweiPalaceTabs";
import ZiweiDeepChapterView from "./ziwei/ZiweiDeepChapterView";

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

const RESULT_CACHE_KEY = "premium:ziwei:result:v7";

function sectionTitle(sectionId: ZiweiSectionId): string {
  return ZIWEI_SECTIONS.find((s) => s.id === sectionId)?.title || sectionId;
}

export default function AdvancedZiweiSectionV2({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
}: AdvancedZiweiSectionProps) {
  const [step, setStep] = useState<Step>("form");
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("명반 계산을 준비하는 중...");
  const [chart, setChart] = useState<ZiweiDeepChart | null>(null);
  const [chapters, setChapters] = useState<Partial<Record<ZiweiSectionId, ZiweiDeepChapter>>>({});
  const [activeSection, setActiveSection] = useState<ZiweiSectionId>("overview");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    birthYear: "",
    birthMonth: "1",
    birthDay: "1",
    birthHour: "12",
    birthMinute: "0",
    unknownHour: false,
    gender: "F",
    calendarType: "solar",
    isLeapMonth: false,
    birthPlace: "대한민국 서울",
    timezone: "Asia/Seoul",
  });

  const autoComputeRef = useRef(false);

  const activeChapter = chapters[activeSection];

  const activePalace = useMemo(() => {
    if (!chart) return null;
    if (activeSection === "overview" || activeSection === "master") return null;
    return chart.palaces.find((p) => p.id === activeSection) || null;
  }, [activeSection, chart]);

  const strengthBadgeClass = useCallback((symbol: string) => {
    if (symbol === "◎") return "border-emerald-300/60 bg-emerald-200/15 text-emerald-100";
    if (symbol === "O" || symbol === "○") return "border-cyan-300/60 bg-cyan-200/15 text-cyan-100";
    if (symbol === "▲") return "border-amber-300/60 bg-amber-200/15 text-amber-100";
    if (symbol === "△") return "border-slate-300/60 bg-slate-200/15 text-slate-100";
    if (symbol === "X" || symbol === "×") return "border-rose-300/60 bg-rose-200/15 text-rose-100";
    return "border-white/30 bg-white/10 text-slate-200";
  }, []);

  const displayStrengthSymbol = useCallback((symbol: string) => {
    const normalized = String(symbol || "").trim();
    if (normalized === "○") return "O";
    if (normalized === "×") return "X";
    return normalized;
  }, []);

  const transformationBadgeClass = useCallback((label: string) => {
    if (label === "화록") return "border-lime-300/50 bg-lime-200/15 text-lime-100";
    if (label === "화권") return "border-orange-300/50 bg-orange-200/15 text-orange-100";
    if (label === "화과") return "border-sky-300/50 bg-sky-200/15 text-sky-100";
    return "border-rose-300/50 bg-rose-200/15 text-rose-100";
  }, []);

  const normalizeStrengthBand = useCallback((star: ZiweiStarMeta): "묘" | "득" | "리" | "평" | "함" | "" => {
    const strength = String(star?.strength || "").trim();
    if (strength === "왕") return "묘";
    if (["묘", "득", "리", "평", "함"].includes(strength)) return strength as "묘" | "득" | "리" | "평" | "함";
    const symbol = String(star?.strengthSymbol || star?.symbol || "").trim();
    if (symbol === "◎") return "묘";
    if (symbol === "O" || symbol === "○") return "득";
    if (symbol === "▲") return "리";
    if (symbol === "△") return "평";
    if (symbol === "X" || symbol === "×") return "함";
    return "";
  }, []);

  const activeStrengthBands = useMemo(() => {
    const counts = { miao: 0, deuk: 0, li: 0, ping: 0, ham: 0 };
    if (!activePalace) return counts;
    activePalace.allStars.forEach((star) => {
      const band = normalizeStrengthBand(star);
      if (band === "묘") counts.miao += 1;
      if (band === "득") counts.deuk += 1;
      if (band === "리") counts.li += 1;
      if (band === "평") counts.ping += 1;
      if (band === "함") counts.ham += 1;
    });
    return counts;
  }, [activePalace, normalizeStrengthBand]);

  const enterImmersiveMode = useCallback(async () => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    if (!el?.requestFullscreen) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      }
    } catch (e) {
      // User gesture or browser policy can block fullscreen; continue without failure.
    }
  }, []);

  const exitImmersiveMode = useCallback(async () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement || !document.exitFullscreen) return;
    try {
      await document.exitFullscreen();
    } catch (e) {
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

  const handleCompute = useCallback(() => {
    void enterImmersiveMode();

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
      alert(normalized.errors.map((e) => e.message).join("\n") || "입력값을 확인해 주세요.");
      return;
    }

    setStep("computing");
    setProgress(0);

    const progressTexts = [
      "생년월일 데이터를 정규화하는 중...",
      "명궁과 신궁 축을 계산하는 중...",
      "12궁 별 배치를 정렬하는 중...",
      "궁별 심층 분석 템플릿을 생성하는 중...",
      "리포트 렌더링을 준비하는 중...",
    ];

    let p = 0;
    const timer = setInterval(() => {
      p += 4;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
      }
      setProgress(p);
      setLoadingText(progressTexts[Math.min(progressTexts.length - 1, Math.floor((p / 100) * progressTexts.length))]);
    }, 120);

    setTimeout(() => {
      try {
        const nextChart = normalizeZiweiForAdvancedReport(calculateZiweiChart(normalized.input!));
        const advancedValidation = validateAdvancedZiweiResult(nextChart);
        if (!advancedValidation.valid) {
          clearInterval(timer);
          console.error("[AdvancedZiweiV2] advanced chart validation failed:", advancedValidation.missingFields);
          alert("명반 데이터 보정 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
          setStep("form");
          return;
        }

        nextChart.warnings = [...nextChart.warnings, ...normalized.warnings];

        const validation = validateZiweiChart(nextChart);
        if (!validation.valid) {
          clearInterval(timer);
          alert(validation.errors.join("\n"));
          setStep("form");
          return;
        }

        nextChart.debugWarnings = [...(nextChart.debugWarnings || []), ...validation.debugWarnings];
        if (nextChart.debugWarnings.length) {
          console.warn("[AdvancedZiweiV2] debug warnings:", nextChart.debugWarnings);
        }

        primeZiweiDeepRuntime(nextChart, ["overview", "ming"]);
        const overview = getZiweiDeepChapter(nextChart, "overview");
        const ming = getZiweiDeepChapter(nextChart, "ming");

        setChart(nextChart);
        setChapters({ overview, ming });
        setActiveSection("overview");

        try {
          sessionStorage.setItem(
            RESULT_CACHE_KEY,
            JSON.stringify({ chart: nextChart, chapters: { overview, ming }, activeSection: "overview" }),
          );
        } catch (e) {
          // no-op
        }

        clearInterval(timer);
        setProgress(100);
        setTimeout(() => setStep("result"), 320);
      } catch (err) {
        clearInterval(timer);
        console.error("[AdvancedZiweiV2] compute error:", err);
        alert("분석 중 오류가 발생했습니다.");
        setStep("form");
      }
    }, 1600);
  }, [enterImmersiveMode, form]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(RESULT_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.chart && parsed?.chapters) {
          const migratedChart = (!parsed.chart.version || !String(parsed.chart.version).includes("four-transformations"))
            ? normalizeZiweiForAdvancedReport(parsed.chart)
            : parsed.chart;
          const advancedValidation = validateAdvancedZiweiResult(migratedChart);
          if (!advancedValidation.valid) {
            console.warn("[AdvancedZiweiV2] cached chart invalid, ignore cache:", advancedValidation.missingFields);
            sessionStorage.removeItem(RESULT_CACHE_KEY);
          } else {
            primeZiweiDeepRuntime(migratedChart, ["overview", "ming"]);
            const overview = parsed.chapters?.overview || getZiweiDeepChapter(migratedChart, "overview");
            const ming = parsed.chapters?.ming || getZiweiDeepChapter(migratedChart, "ming");
            setChart(migratedChart);
            setChapters({ ...parsed.chapters, overview, ming });
            setActiveSection(parsed.activeSection || "overview");
            setStep("result");
            return;
          }
        }
      }

      const rawProfile = localStorage.getItem("FORTUNE_APP_VEDIC_PAYLOAD");
      if (rawProfile) {
        const payload = JSON.parse(rawProfile);
        if (payload?.birth?.year) {
          setForm((prev) => ({
            ...prev,
            name: payload.name || "",
            birthYear: String(payload.birth.year),
            birthMonth: String(payload.birth.month ?? 1),
            birthDay: String(payload.birth.day ?? 1),
            birthHour: String(payload.birth.hour ?? 12),
            birthMinute: String(payload.birth.minute ?? 0),
            unknownHour: false,
            gender: (payload.gender === "M" ? "M" : "F") as ZiweiGender,
          }));
          autoComputeRef.current = true;
        }
      }
    } catch (e) {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (!autoComputeRef.current || !form.birthYear) return;
    autoComputeRef.current = false;
    handleCompute();
  }, [form.birthYear, handleCompute]);

  const maxDay = useMemo(() => {
    const y = Number(form.birthYear || 2000);
    const m = Number(form.birthMonth || 1);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return 31;
    return new Date(y, m, 0).getDate();
  }, [form.birthMonth, form.birthYear]);

  if (showIntro) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[#050d1f] p-6 md:p-8">
        <ZiweiStarField />
        <div className="relative z-10">
          <p className="text-[11px] font-extrabold tracking-[0.32em] text-cyan-200/80">ZIWEI IMMERSIVE MODE</p>
          <h3 className="mt-2 text-2xl font-black text-white">별의 세기를 입체적으로 읽는 심화 자미두수</h3>
          <p className="mt-3 text-sm leading-7 text-slate-200/90">
            묘·왕·리·평·함을 중심으로 명궁, 신궁, 12궁 작동을 몰입형 화면에서 탐색할 수 있습니다.
          </p>
          <div className="mt-6 space-y-3">
            <button
              onClick={() => {
                void enterImmersiveMode();
                onStartGeneration?.();
              }}
              disabled={generationLoading}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300 px-4 py-4 text-sm font-black text-[#08223a]"
            >
              몰입모드로 바로 시작하기
            </button>
            <button
              onClick={() => setStep("form")}
              className="w-full rounded-2xl border border-cyan-200/25 bg-cyan-100/5 px-4 py-4 text-sm font-bold text-cyan-100"
            >
              입력값 먼저 설정하기
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (step === "form") {
    return (
      <section className="relative min-h-[100dvh] overflow-hidden px-4 py-8 text-slate-100 sm:px-6">
        <ZiweiStarField dense />
        <div className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(circle_at_80%_12%,rgba(56,189,248,0.22),transparent_40%),radial-gradient(circle_at_18%_82%,rgba(250,204,21,0.18),transparent_42%)]" />
        <div className="relative mx-auto max-w-5xl rounded-3xl border border-cyan-200/25 bg-[#081428]/72 p-6 shadow-[0_18px_70px_rgba(2,6,23,0.65)] backdrop-blur-xl md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.24em] text-cyan-200/80">COSMIC INPUT</p>
              <h1 className="mt-2 text-3xl font-black text-slate-100">심화 자미두수 입력</h1>
              <p className="mt-2 text-sm text-slate-300">음력/양력, 윤달, 출생지, 시간대까지 반영해 별의 세기와 12궁 흐름을 계산합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => void toggleImmersiveMode()}
              className="rounded-xl border border-cyan-200/30 bg-cyan-200/10 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-200/20"
            >
              {isFullscreen ? "몰입모드 해제" : "몰입모드 켜기"}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold text-cyan-100">이름</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
                placeholder="예: 홍길동"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-cyan-100">성별</span>
              <select
                value={form.gender}
                onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value as ZiweiGender }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
              >
                <option value="F">여성</option>
                <option value="M">남성</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold text-cyan-100">출생 연도</span>
              <input
                type="number"
                value={form.birthYear}
                onChange={(e) => setForm((prev) => ({ ...prev, birthYear: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-cyan-100">출생 월</span>
              <select
                value={form.birthMonth}
                onChange={(e) => setForm((prev) => ({ ...prev, birthMonth: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-cyan-100">출생 일</span>
              <select
                value={form.birthDay}
                onChange={(e) => setForm((prev) => ({ ...prev, birthDay: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
              >
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}일
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-cyan-100">출생 시</span>
              <select
                value={form.birthHour}
                onChange={(e) => setForm((prev) => ({ ...prev, birthHour: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
                disabled={form.unknownHour}
              >
                {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}시
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold text-cyan-100">양력/음력</span>
              <select
                value={form.calendarType}
                onChange={(e) => setForm((prev) => ({ ...prev, calendarType: e.target.value as "solar" | "lunar" }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
              >
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-cyan-100">출생지</span>
              <input
                value={form.birthPlace}
                onChange={(e) => setForm((prev) => ({ ...prev, birthPlace: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
                placeholder="예: 대한민국 서울"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold text-cyan-100">시간대</span>
              <input
                value={form.timezone}
                onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
                placeholder="Asia/Seoul"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.unknownHour}
                onChange={(e) => setForm((prev) => ({ ...prev, unknownHour: e.target.checked }))}
                className="h-4 w-4"
              />
              출생시간 미상(정오 12시 fallback)
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isLeapMonth}
                onChange={(e) => setForm((prev) => ({ ...prev, isLeapMonth: e.target.checked }))}
                className="h-4 w-4"
              />
              윤달
            </label>
          </div>

          <button
            type="button"
            onClick={handleCompute}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300 px-5 py-4 text-sm font-black text-[#0a2238]"
          >
            묘왕리평함 기반 심층 분석 시작
          </button>
        </div>
      </section>
    );
  }

  if (step === "computing") {
    return (
      <section className="relative flex min-h-screen items-center justify-center px-6 text-center text-slate-100">
        <ZiweiStarField dense />
        <div className="relative z-10 w-full max-w-xl rounded-3xl border border-white/15 bg-slate-950/60 p-8 backdrop-blur-xl">
          <p className="text-xs font-bold tracking-[0.25em] text-cyan-200">LOCAL ZIWEI ENGINE</p>
          <h2 className="mt-3 text-3xl font-black">{loadingText}</h2>
          <div className="mt-7 overflow-hidden rounded-full border border-white/15 bg-white/10">
            <div className="h-2 bg-gradient-to-r from-cyan-300 via-sky-300 to-cyan-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-xs text-cyan-100">{progress}% COMPLETE</p>
        </div>
      </section>
    );
  }

  if (!chart || !activeChapter) {
    return null;
  }

  const orbitActivePalaceId: ZiweiPalaceId | undefined =
    activeSection === "overview" || activeSection === "master" ? undefined : activeSection;

  return (
    <section className="relative min-h-[100dvh] px-4 py-8 text-slate-100 sm:px-6">
      <ZiweiStarField dense />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void toggleImmersiveMode()}
            className="rounded-xl border border-cyan-200/30 bg-cyan-200/10 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-200/20"
          >
            {isFullscreen ? "몰입모드 해제" : "몰입모드 켜기"}
          </button>
        </div>

        <ZiweiCosmicHero chart={chart} />

        {chart.warnings.length ? (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
            {chart.warnings.map((warning, idx) => (
              <p key={`${warning.code}-${idx}`}>- {warning.message}</p>
            ))}
          </div>
        ) : null}

        <ZiweiPalaceOrbit
          chart={chart}
          activePalaceId={orbitActivePalaceId}
          onSelect={(id) => loadSection(id)}
        />

        <div className="rounded-2xl border border-white/15 bg-slate-950/55 p-3 backdrop-blur-xl">
          <ZiweiPalaceTabs activeSection={activeSection} onChange={loadSection} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-white/15 bg-slate-950/55 p-4 backdrop-blur-xl">
            <p className="text-xs font-bold tracking-wide text-amber-200">목차</p>
            <ul className="mt-3 space-y-2">
              {ZIWEI_SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => loadSection(section.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                      activeSection === section.id
                        ? "border-amber-300/70 bg-amber-200/10 text-amber-100"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              <p className="font-bold text-slate-200">현재 섹션</p>
              <p className="mt-1">{sectionTitle(activeSection)}</p>
            </div>
          </aside>

          <main>
            <div className="space-y-4">
                <section className="rounded-2xl border border-white/15 bg-slate-950/55 p-4 backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-amber-100">핵심 구조 카드</h3>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full border border-emerald-300/60 bg-emerald-200/15 px-2 py-1 font-semibold text-emerald-100">◎ 매우 강함</span>
                      <span className="rounded-full border border-cyan-300/60 bg-cyan-200/15 px-2 py-1 font-semibold text-cyan-100">O 득지</span>
                      <span className="rounded-full border border-amber-300/60 bg-amber-200/15 px-2 py-1 font-semibold text-amber-100">▲ 이로움</span>
                      <span className="rounded-full border border-slate-300/60 bg-slate-200/15 px-2 py-1 font-semibold text-slate-100">△ 균형</span>
                      <span className="rounded-full border border-rose-300/60 bg-rose-200/15 px-2 py-1 font-semibold text-rose-100">X 보완</span>
                    </div>
                  </div>

                  {activePalace ? (
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs font-bold text-slate-200">{activePalace.name} {activePalace.branch || activePalace.earthlyBranch}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {activePalace.isEmptyMainStarPalace
                            ? "무주성궁: 대궁과 삼방사정 영향을 강하게 받는 구조"
                            : "주성 배치가 궁의 기본 성향을 직접 형성"}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-400">주성</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {activePalace.mainStars.length ? activePalace.mainStars.map((star) => {
                            const symbol = displayStrengthSymbol(star.strengthSymbol || star.symbol || "강약 미확인");
                            return (
                              <span key={`main-${star.name}`} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${strengthBadgeClass(symbol)}`}>
                                {star.name} {symbol}
                              </span>
                            );
                          }) : <span className="text-[11px] text-slate-400">무주성궁</span>}
                        </div>

                        <p className="mt-3 text-[11px] text-slate-400">보조성</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {activePalace.auxiliaryStars.length ? activePalace.auxiliaryStars.map((star) => {
                            const symbol = displayStrengthSymbol(star.strengthSymbol || star.symbol || "강약 미확인");
                            return (
                              <span key={`aux-${star.name}`} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${strengthBadgeClass(symbol)}`}>
                                {star.name} {symbol}
                              </span>
                            );
                          }) : <span className="text-[11px] text-slate-400">없음</span>}
                        </div>

                        <p className="mt-3 text-[11px] text-slate-400">살성</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {activePalace.maleficStars.length ? activePalace.maleficStars.map((star) => {
                            const symbol = displayStrengthSymbol(star.strengthSymbol || star.symbol || "강약 미확인");
                            return (
                              <span key={`bad-${star.name}`} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${strengthBadgeClass(symbol)}`}>
                                {star.name} {symbol}
                              </span>
                            );
                          }) : <span className="text-[11px] text-slate-400">없음</span>}
                        </div>

                        <p className="mt-3 text-[11px] text-slate-400">묘득리평함 분포</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="rounded-full border border-emerald-300/50 bg-emerald-200/10 px-2 py-0.5 text-[10px] text-emerald-100">묘 {activeStrengthBands.miao}</span>
                          <span className="rounded-full border border-cyan-300/50 bg-cyan-200/10 px-2 py-0.5 text-[10px] text-cyan-100">득 {activeStrengthBands.deuk}</span>
                          <span className="rounded-full border border-amber-300/50 bg-amber-200/10 px-2 py-0.5 text-[10px] text-amber-100">리 {activeStrengthBands.li}</span>
                          <span className="rounded-full border border-slate-300/50 bg-slate-200/10 px-2 py-0.5 text-[10px] text-slate-100">평 {activeStrengthBands.ping}</span>
                          <span className="rounded-full border border-rose-300/50 bg-rose-200/10 px-2 py-0.5 text-[10px] text-rose-100">함 {activeStrengthBands.ham}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-300">
                          강점: {activePalace.strengthSummary?.strongestStars?.length ? activePalace.strengthSummary.strongestStars.map((s) => `${s.name}${s.strengthSymbol || s.symbol || ""}`).join(", ") : "뚜렷한 강세 없음"}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-300">
                          보완: {activePalace.strengthSummary?.weakStars?.length ? activePalace.strengthSummary.weakStars.map((s) => `${s.name}${s.strengthSymbol || s.symbol || ""}`).join(", ") : "약세 신호 약함"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs font-bold text-slate-200">사화·삼방사정 연결</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {activePalace.fourTransformations.length ? activePalace.fourTransformations.map((item) => {
                            const label = transformationTypeToLabel(item.type);
                            return (
                              <span key={`sihua-${label}-${item.starName}`} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${transformationBadgeClass(label)}`}>
                                {label} {item.starName}
                              </span>
                            );
                          }) : <span className="text-[11px] text-slate-300">이 궁에는 생년사화가 직접 들어오지 않았습니다.</span>}
                        </div>

                        <p className="mt-3 text-[11px] text-slate-400">사화 유입</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {activePalace.incomingFourTransformations.length ? activePalace.incomingFourTransformations.map((item) => {
                            const label = transformationTypeToLabel(item.type);
                            return (
                              <span key={`inflow-${label}-${item.starName}`} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${transformationBadgeClass(label)}`}>
                                {label} {item.starName}
                              </span>
                            );
                          }) : <span className="text-[11px] text-slate-400">삼방사정/대궁 직접 유입이 강하지 않습니다.</span>}
                        </div>

                        <p className="mt-3 text-[11px] text-slate-400">대궁</p>
                        <p className="mt-1 text-sm font-bold text-slate-100">{activePalace.oppositePalace?.name || chart.palaces.find((p) => p.id === activePalace.oppositePalaceId)?.name || activePalace.oppositePalaceId}</p>

                        <p className="mt-3 text-[11px] text-slate-400">삼방사정</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(activePalace.sanFangSiZheng?.palaceNames || activePalace.triadPalaceIds.map((id) => chart.palaces.find((p) => p.id === id)?.name || id)).map((label) => (
                            <span key={`triad-${label}`} className="rounded-full border border-sky-300/50 bg-sky-200/15 px-2 py-0.5 text-[11px] font-semibold text-sky-100">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] text-slate-400">현재 강한 궁</p>
                        <p className="mt-1 text-sm font-bold text-slate-100">{chart.palaces.slice().sort((a, b) => b.score - a.score)[0]?.name || "정보 없음"}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] text-slate-400">사화 기준</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {[chart.sihua.hualu && `화록 ${chart.sihua.hualu}`, chart.sihua.huaquan && `화권 ${chart.sihua.huaquan}`, chart.sihua.huake && `화과 ${chart.sihua.huake}`, chart.sihua.huaji && `화기 ${chart.sihua.huaji}`]
                            .filter(Boolean)
                            .map((label) => (
                              <span key={String(label)} className="rounded-full border border-cyan-300/50 bg-cyan-200/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                                {label}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] text-slate-400">핵심 성공 공식</p>
                        <p className="mt-1 text-sm font-bold text-slate-100">{chart.summary.direction}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3 md:col-span-3">
                        <p className="text-[11px] text-slate-400">인생 전체 키워드 · 명궁/신궁 요약</p>
                        <p className="mt-1 text-sm font-bold text-slate-100">
                          {chart.summary.keywords.slice(0, 3).join(" · ")} · 명궁 {chart.palaces.find((p) => p.id === "ming")?.mainStars.map((star) => `${star.name}${star.strengthSymbol || star.symbol || ""}`).join(", ") || "확인 중"} · 신궁 {chart.palaces.find((p) => p.earthlyBranch === chart.shenGong)?.name || chart.shenGong}
                        </p>
                      </div>
                    </div>
                  )}
                </section>

                <ZiweiDeepChapterView chapter={activeChapter} />
            </div>
          </main>
        </div>

        <footer className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
          본 리포트는 로컬 계산 및 템플릿 생성 결과이며, 건강/투자/법률 판단은 전문 상담과 함께 검토하세요.
        </footer>
      </div>
    </section>
  );
}
