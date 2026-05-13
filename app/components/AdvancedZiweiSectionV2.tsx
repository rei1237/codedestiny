"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateZiweiChart } from "../_lib/ziwei-engine";
import { normalizeZiweiInput } from "../_lib/normalize-ziwei-input";
import { getZiweiDeepChapter, primeZiweiDeepRuntime } from "../_lib/ziwei-deep-runtime";
import { validateZiweiChart } from "../_lib/validate-ziwei-chart";
import {
  ZiweiDeepChart,
  ZiweiDeepChapter,
  ZiweiGender,
  ZiweiPalaceId,
  ZiweiSectionId,
  ZIWEI_SECTIONS,
} from "../_lib/ziwei-types";
import PremiumBlurGate from "./PremiumBlurGate";
import { usePayment } from "./PaymentProcessingContext";
import { useToast } from "./Toast";
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
  isUnlocked?: boolean;
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

const RESULT_CACHE_KEY = "premium:ziwei:result:v6";
const PREMIUM_UNLOCK_MARKER_KEY = "premium:ziwei:unlock:v1";
const LEGACY_TILE_LOCK_KEY = "cd_tile_locks";
const TILE_LOCK_PREFIX = "cd_tile_locks_v2::";
const PREMIUM_UNLOCK_ALIASES = [
  "premium-ziwei",
  "ziwei-deep",
  "unlock.premium_ziwei",
  "premiumDivinationPack",
  "premium-divination-pack",
  "unlock.premium_divination_pack",
];
const FREE_SECTIONS = new Set<ZiweiSectionId>(["overview", "ming"]);

function normalizeKey(raw: unknown) {
  return String(raw || "").trim();
}

function isPremiumUnlockKey(raw: unknown) {
  const key = normalizeKey(raw);
  return Boolean(key && PREMIUM_UNLOCK_ALIASES.includes(key));
}

function resolveAuthScope() {
  try {
    const raw = localStorage.getItem("fortune_auth_user");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return String(parsed?.id || parsed?.userId || parsed?._id || parsed?.uid || "")
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

function readObjectStorage(storageKey: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, boolean> = {};
    Object.keys(parsed).forEach((k) => {
      if (parsed[k] === true) result[k] = true;
    });
    return result;
  } catch {
    return {};
  }
}

function writeUnlockToMaps() {
  try {
    const legacy = readObjectStorage(LEGACY_TILE_LOCK_KEY);
    PREMIUM_UNLOCK_ALIASES.forEach((alias) => {
      legacy[alias] = true;
    });
    localStorage.setItem(LEGACY_TILE_LOCK_KEY, JSON.stringify(legacy));
  } catch {
    // no-op
  }

  try {
    const scope = resolveAuthScope();
    if (!scope) return;
    const scopedKey = `${TILE_LOCK_PREFIX}${scope}`;
    const scoped = readObjectStorage(scopedKey);
    PREMIUM_UNLOCK_ALIASES.forEach((alias) => {
      scoped[alias] = true;
    });
    localStorage.setItem(scopedKey, JSON.stringify(scoped));
  } catch {
    // no-op
  }
}

function markPremiumUnlockedLocal() {
  try {
    const payload = JSON.stringify({ unlocked: true, updatedAt: Date.now() });
    localStorage.setItem(PREMIUM_UNLOCK_MARKER_KEY, payload);
    sessionStorage.setItem(PREMIUM_UNLOCK_MARKER_KEY, payload);
  } catch {
    // no-op
  }
  writeUnlockToMaps();
}

function isPremiumUnlockedLocal() {
  try {
    const candidate =
      sessionStorage.getItem(PREMIUM_UNLOCK_MARKER_KEY) || localStorage.getItem(PREMIUM_UNLOCK_MARKER_KEY);
    if (!candidate) return false;
    const parsed = JSON.parse(candidate);
    return parsed?.unlocked === true;
  } catch {
    return false;
  }
}

interface PremiumUnlockPayload {
  unlockedFeatures?: unknown[];
  user?: { unlockedFeatures?: unknown[] } | null;
  unlockMap?: Record<string, unknown> | null;
}

function payloadHasPremiumUnlock(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  const source = payload as PremiumUnlockPayload;
  const keys = new Set<string>();
  if (Array.isArray(source.unlockedFeatures)) {
    source.unlockedFeatures.forEach((v: unknown) => keys.add(normalizeKey(v)));
  }
  if (Array.isArray(source.user?.unlockedFeatures)) {
    source.user.unlockedFeatures.forEach((v: unknown) => keys.add(normalizeKey(v)));
  }
  if (source.unlockMap && typeof source.unlockMap === "object") {
    Object.keys(source.unlockMap).forEach((k) => {
      if (source.unlockMap?.[k] === true) keys.add(normalizeKey(k));
    });
  }
  return Array.from(keys).some((k) => isPremiumUnlockKey(k));
}

function getFlowerAdminTokenClient() {
  try {
    return localStorage.getItem("flower_admin_token");
  } catch {
    return null;
  }
}

function sectionTitle(sectionId: ZiweiSectionId): string {
  return ZIWEI_SECTIONS.find((s) => s.id === sectionId)?.title || sectionId;
}

export default function AdvancedZiweiSectionV2({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
  isUnlocked = false,
}: AdvancedZiweiSectionProps) {
  const [step, setStep] = useState<Step>("form");
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("명반 계산을 준비하는 중...");
  const [chart, setChart] = useState<ZiweiDeepChart | null>(null);
  const [chapters, setChapters] = useState<Partial<Record<ZiweiSectionId, ZiweiDeepChapter>>>({});
  const [activeSection, setActiveSection] = useState<ZiweiSectionId>("overview");
  const [resolvedUnlocked, setResolvedUnlocked] = useState(Boolean(isUnlocked));
  const [unlockSyncing, setUnlockSyncing] = useState(false);

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

  const { startPayment, endPayment } = usePayment();
  const { showToast } = useToast();
  const autoComputeRef = useRef(false);

  const activeChapter = chapters[activeSection];
  const canReadCurrent = resolvedUnlocked || FREE_SECTIONS.has(activeSection);

  const activePalace = useMemo(() => {
    if (!chart) return null;
    if (activeSection === "overview" || activeSection === "master") return null;
    return chart.palaces.find((p) => p.id === activeSection) || null;
  }, [activeSection, chart]);

  const strengthBadgeClass = useCallback((symbol: string) => {
    if (symbol === "◎") return "border-emerald-300/60 bg-emerald-200/15 text-emerald-100";
    if (symbol === "○") return "border-cyan-300/60 bg-cyan-200/15 text-cyan-100";
    if (symbol === "△") return "border-amber-300/60 bg-amber-200/15 text-amber-100";
    if (symbol === "×") return "border-rose-300/60 bg-rose-200/15 text-rose-100";
    return "border-white/30 bg-white/10 text-slate-200";
  }, []);

  const syncUnlockState = useCallback(
    async (checkServer: boolean) => {
      if (resolvedUnlocked) return true;
      if (isPremiumUnlockedLocal()) {
        setResolvedUnlocked(true);
        return true;
      }
      if (!checkServer) return false;

      setUnlockSyncing(true);
      startPayment("프리미엄 해금 정보를 확인하고 있습니다...");
      try {
        const token = localStorage.getItem("fortune_auth_token");
        const userCache = localStorage.getItem("fortune_auth_user");
        const adminToken = getFlowerAdminTokenClient();
        const hasSessionHint = Boolean(token) || Boolean(userCache);
        if (!hasSessionHint && !adminToken) {
          return false;
        }

        const response = await fetch("/api/user/destiny-profiles", {
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(adminToken ? { "x-admin-token": adminToken } : {}),
          },
        });
        if (response.status === 401 || response.status === 403) {
          return false;
        }
        const payload = await response.json();
        if (response.ok && payloadHasPremiumUnlock(payload)) {
          setResolvedUnlocked(true);
          markPremiumUnlockedLocal();
          showToast("✨ 자미두수 프리미엄 해금이 확인되었습니다!", "success");
          return true;
        }
      } catch (err) {
        console.error("[AdvancedZiweiV2] unlock sync error:", err);
      } finally {
        setUnlockSyncing(false);
        endPayment();
      }
      return false;
    },
    [endPayment, resolvedUnlocked, showToast, startPayment],
  );

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
        const nextChart = calculateZiweiChart(normalized.input!);
        nextChart.warnings = [...nextChart.warnings, ...normalized.warnings];

        const validation = validateZiweiChart(nextChart);
        if (!validation.valid) {
          clearInterval(timer);
          alert(validation.errors.join("\n"));
          setStep("form");
          return;
        }

        nextChart.warnings = [...nextChart.warnings, ...validation.warnings.map((w) => ({ code: "INVALID_DATE", message: w }))];

        primeZiweiDeepRuntime(nextChart, ["overview", "ming"]);
        const overview = getZiweiDeepChapter(nextChart, "overview");
        const ming = getZiweiDeepChapter(nextChart, "ming");

        setChart(nextChart);
        setChapters({ overview, ming });
        setActiveSection("overview");

        try {
          sessionStorage.setItem(
            RESULT_CACHE_KEY,
            JSON.stringify({ chart: nextChart, chapters: { overview, ming }, activeSection: "overview", unlocked: resolvedUnlocked }),
          );
        } catch {
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
  }, [form, resolvedUnlocked]);

  useEffect(() => {
    void syncUnlockState(true);
  }, [syncUnlockState]);

  useEffect(() => {
    if (!isUnlocked) return;
    setResolvedUnlocked(true);
    markPremiumUnlockedLocal();
  }, [isUnlocked]);

  useEffect(() => {
    const handleRuntimeUnlock = () => {
      void syncUnlockState(false);
    };
    window.addEventListener("storage", handleRuntimeUnlock);
    window.addEventListener("focus", handleRuntimeUnlock);
    window.addEventListener("cd:tile-locks-updated", handleRuntimeUnlock as EventListener);
    return () => {
      window.removeEventListener("storage", handleRuntimeUnlock);
      window.removeEventListener("focus", handleRuntimeUnlock);
      window.removeEventListener("cd:tile-locks-updated", handleRuntimeUnlock as EventListener);
    };
  }, [syncUnlockState]);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(RESULT_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.chart && parsed?.chapters) {
          setChart(parsed.chart);
          setChapters(parsed.chapters);
          setActiveSection(parsed.activeSection || "overview");
          if (parsed.unlocked === true) {
            setResolvedUnlocked(true);
            markPremiumUnlockedLocal();
          }
          setStep("result");
          return;
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
    } catch {
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
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[#050816] p-6 md:p-8">
        <ZiweiStarField />
        <div className="relative z-10">
          <p className="text-[11px] font-extrabold tracking-[0.3em] text-cyan-200/80">ZIWEI DEEP REPORT</p>
          <h3 className="mt-2 text-2xl font-black text-white">로컬 기반 심화 자미두수 명반</h3>
          <p className="mt-3 text-sm leading-7 text-slate-200/90">
            계산과 해석 생성은 로컬 템플릿 기반으로 동작하며, 결과는 궁별 탐색형 리포트로 제공됩니다.
          </p>
          <div className="mt-6 space-y-3">
            <button
              onClick={() => onStartGeneration?.()}
              disabled={generationLoading}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-500 px-4 py-4 text-sm font-black text-[#261600]"
            >
              전체 챕터 해금하고 바로 분석하기
            </button>
            <button
              onClick={() => setStep("form")}
              className="w-full rounded-2xl border border-cyan-200/25 bg-cyan-100/5 px-4 py-4 text-sm font-bold text-cyan-100"
            >
              무료 섹션 먼저 보기
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (step === "form") {
    return (
      <section className="relative min-h-screen overflow-hidden px-4 py-8 text-slate-100 sm:px-6">
        <ZiweiStarField dense />
        <div className="relative mx-auto max-w-4xl rounded-3xl border border-white/15 bg-slate-950/55 p-6 backdrop-blur-xl md:p-8">
          <h1 className="text-3xl font-black text-slate-100">심화 자미두수 입력</h1>
          <p className="mt-2 text-sm text-slate-300">음력/양력, 윤달, 출생지, 시간대까지 반영해 로컬 명반을 계산합니다.</p>

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
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 via-sky-300 to-cyan-500 px-5 py-4 text-sm font-black text-slate-900"
          >
            로컬 심층 분석 시작
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
    <section className="relative min-h-screen px-4 py-8 text-slate-100 sm:px-6">
      <ZiweiStarField dense />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5">
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
          <ZiweiPalaceTabs activeSection={activeSection} onChange={loadSection} unlocked={resolvedUnlocked} />
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
              {unlockSyncing ? <p className="mt-2 text-cyan-200">해금 상태 동기화 중...</p> : null}
            </div>
          </aside>

          <main>
            {canReadCurrent ? (
              <div className="space-y-4">
                <section className="rounded-2xl border border-white/15 bg-slate-950/55 p-4 backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-amber-100">핵심 구조 카드</h3>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full border border-emerald-300/60 bg-emerald-200/15 px-2 py-1 font-semibold text-emerald-100">◎ 매우 강함</span>
                      <span className="rounded-full border border-cyan-300/60 bg-cyan-200/15 px-2 py-1 font-semibold text-cyan-100">○ 안정 작동</span>
                      <span className="rounded-full border border-amber-300/60 bg-amber-200/15 px-2 py-1 font-semibold text-amber-100">△ 보완 필요</span>
                      <span className="rounded-full border border-rose-300/60 bg-rose-200/15 px-2 py-1 font-semibold text-rose-100">× 충돌 강함</span>
                    </div>
                  </div>

                  {activePalace ? (
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs font-bold text-slate-200">{activePalace.name} 별 배치</p>
                        <p className="mt-2 text-[11px] text-slate-400">주성</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {activePalace.mainStars.map((star) => {
                            const symbol = star.strengthSymbol || star.symbol || "강약 미확인";
                            return (
                              <span key={`main-${star.name}`} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${strengthBadgeClass(symbol)}`}>
                                {star.name} {symbol}
                              </span>
                            );
                          })}
                        </div>

                        <p className="mt-3 text-[11px] text-slate-400">보조성</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {activePalace.auxiliaryStars.length ? activePalace.auxiliaryStars.map((star) => {
                            const symbol = star.strengthSymbol || star.symbol || "강약 미확인";
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
                            const symbol = star.strengthSymbol || star.symbol || "강약 미확인";
                            return (
                              <span key={`bad-${star.name}`} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${strengthBadgeClass(symbol)}`}>
                                {star.name} {symbol}
                              </span>
                            );
                          }) : <span className="text-[11px] text-slate-400">없음</span>}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs font-bold text-slate-200">사화·삼방사정 연결</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {activePalace.sihua.length ? activePalace.sihua.map((key) => (
                            <span key={`sihua-${key}`} className="rounded-full border border-violet-300/50 bg-violet-200/15 px-2 py-0.5 text-[11px] font-semibold text-violet-100">
                              {key}
                            </span>
                          )) : <span className="text-[11px] text-slate-400">사화 없음</span>}
                        </div>

                        <p className="mt-3 text-[11px] text-slate-400">대궁</p>
                        <p className="mt-1 text-sm font-bold text-slate-100">{chart.palaces.find((p) => p.id === activePalace.oppositePalaceId)?.name || activePalace.oppositePalaceId}</p>

                        <p className="mt-3 text-[11px] text-slate-400">삼방사정</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {activePalace.triadPalaceIds.map((id) => (
                            <span key={`triad-${id}`} className="rounded-full border border-sky-300/50 bg-sky-200/15 px-2 py-0.5 text-[11px] font-semibold text-sky-100">
                              {chart.palaces.find((p) => p.id === id)?.name || id}
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
                              <span key={String(label)} className="rounded-full border border-violet-300/50 bg-violet-200/15 px-2 py-0.5 text-[11px] font-semibold text-violet-100">
                                {label}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] text-slate-400">핵심 성공 공식</p>
                        <p className="mt-1 text-sm font-bold text-slate-100">{chart.summary.direction}</p>
                      </div>
                    </div>
                  )}
                </section>

                <ZiweiDeepChapterView chapter={activeChapter} />
              </div>
            ) : (
              <PremiumBlurGate
                lockedTitle={activeChapter.title}
                subDesc="프리미엄 해금 후 궁별 심층 리포트를 확인할 수 있습니다"
                onUnlock={() => onStartGeneration?.()}
                previewContent={<div className="mb-6 text-center text-cyan-100/60">잠금 해제 후 12궁 장문 해석이 모두 열립니다.</div>}
                lockedItems={[
                  "궁별 장문 분석",
                  "장점/주의점/개운법 분리 카드",
                  "7일/30일 루틴",
                  "90일 실행 로드맵",
                ]}
              />
            )}
          </main>
        </div>

        <footer className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
          본 리포트는 로컬 계산 및 템플릿 생성 결과이며, 건강/투자/법률 판단은 전문 상담과 함께 검토하세요.
        </footer>
      </div>
    </section>
  );
}
