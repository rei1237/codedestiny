"use client";
/**
 * [자미두수 심화 기능]
 * - 인터랙티브 웹 리포트 형식의 심화 분석 서비스입니다.
 * - 15개 챕터로 구성되어 있으며, 명궁/사화/대한 데이터를 실시간으로 시각화하여 보여줍니다.
 * - 'Premium Ziwei PDF'와는 별개의 프리미엄 서비스입니다.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { calcZiweiPalaces, ZiweiChartData } from "../_lib/ziwei-engine";
import { generateAdvancedReport } from "../_lib/ziwei-interpretations";
import { AdvancedZiweiResult } from "../_lib/ziwei-normalization";
import { usePayment } from "./PaymentProcessingContext";
import { useToast } from "./Toast";
import PremiumBlurGate from "./PremiumBlurGate";
import { m, AnimatePresence } from "framer-motion";
import { authFetch } from "../_lib/auth-client";

const ADVANCED_ZIWEI_SECTION_TEXT_TRANSLATIONS = {
  ko: {
    "advancedZiwei.001": "성도 안내",
    "advancedZiwei.002": "운명의 축",
    "advancedZiwei.003": "기질의 코어",
    "advancedZiwei.004": "직업 궤도",
    "advancedZiwei.005": "재물 항로",
    "advancedZiwei.006": "관계 중력",
    "advancedZiwei.007": "가문의 결",
    "advancedZiwei.008": "사회 좌표",
    "advancedZiwei.009": "신체 리듬",
    "advancedZiwei.010": "내면 우주",
    "advancedZiwei.011": "공간 자산",
    "advancedZiwei.012": "환경 변곡",
    "advancedZiwei.013": "후속 에너지",
    "advancedZiwei.014": "10년 파동",
    "advancedZiwei.015": "총합 마스터플랜",
    "advancedZiwei.016": "예: 홍길동",
    "advancedZiwei.017": "남성",
    "advancedZiwei.018": "여성",
  },
} as const;

function advancedZiweiSectionText(key: keyof typeof ADVANCED_ZIWEI_SECTION_TEXT_TRANSLATIONS.ko): string {
  return ADVANCED_ZIWEI_SECTION_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
type Step = "form" | "computing" | "result";

interface FormState {
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthHour: string;
  unknownHour: boolean;
  name: string;
  gender: "M" | "F";
}

interface AdvancedZiweiSectionProps {
  showIntro?: boolean;
  onStartGeneration?: () => void;
  generationLoading?: boolean;
  isUnlocked?: boolean;
}

type ChapterId = keyof AdvancedZiweiResult;

interface ChapterMeta {
  id: ChapterId;
  title: string;
  constellation: string;
  free: boolean;
}

const CHAPTERS: ChapterMeta[] = [
  { id: "intro", title: advancedZiweiSectionText("advancedZiwei.001"), constellation: "Orion", free: true },
  { id: "destiny", title: advancedZiweiSectionText("advancedZiwei.002"), constellation: "Polaris", free: true },
  { id: "personality", title: advancedZiweiSectionText("advancedZiwei.003"), constellation: "Lyra", free: true },
  { id: "career", title: advancedZiweiSectionText("advancedZiwei.004"), constellation: "Vega", free: false },
  { id: "wealth", title: advancedZiweiSectionText("advancedZiwei.005"), constellation: "Cygnus", free: false },
  { id: "love", title: advancedZiweiSectionText("advancedZiwei.006"), constellation: "Andromeda", free: false },
  { id: "family", title: advancedZiweiSectionText("advancedZiwei.007"), constellation: "Cassiopeia", free: false },
  { id: "social", title: advancedZiweiSectionText("advancedZiwei.008"), constellation: "Draco", free: false },
  { id: "health", title: advancedZiweiSectionText("advancedZiwei.009"), constellation: "Aquila", free: false },
  { id: "innerMind", title: advancedZiweiSectionText("advancedZiwei.010"), constellation: "Phoenix", free: false },
  { id: "realEstate", title: advancedZiweiSectionText("advancedZiwei.011"), constellation: "Pegasus", free: false },
  { id: "environment", title: advancedZiweiSectionText("advancedZiwei.012"), constellation: "Hydra", free: false },
  { id: "children", title: advancedZiweiSectionText("advancedZiwei.013"), constellation: "Gemini", free: false },
  { id: "majorCycle", title: advancedZiweiSectionText("advancedZiwei.014"), constellation: "Ursa", free: false },
  { id: "total", title: advancedZiweiSectionText("advancedZiwei.015"), constellation: "Argo", free: false },
];

const RESULT_CACHE_KEY = "premium:ziwei:result:v5";
const PREMIUM_UNLOCK_MARKER_KEY = "premium:ziwei:unlock:v1";
const LEGACY_TILE_LOCK_KEY = "cd_tile_locks";
const TILE_LOCK_PREFIX = "cd_tile_locks_v2::";
const ACCESS_CHECKING_MESSAGE = "빠르게 잠금 해제 권한을 확인 중입니다..";
const PREMIUM_UNLOCK_ALIASES = [
  "premium-ziwei",
  "ziwei-deep",
  "unlock.premium_ziwei",
  "premiumDivinationPack",
  "premium-divination-pack",
  "unlock.premium_divination_pack",
];

function getDaysInMonth(year: number, month: number) {
  if (!Number.isFinite(year) || year < 1 || !Number.isFinite(month) || month < 1 || month > 12) {
    return 31;
  }
  return new Date(year, month, 0).getDate();
}

function isValidBirthDate(year: number, month: number, day: number) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
  if (year < 1900 || year > 2099) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

function normalizeKey(raw: unknown) {
  return String(raw || "").trim();
}

function isPremiumUnlockKey(raw: unknown) {
  const key = normalizeKey(raw);
  if (!key) return false;
  return PREMIUM_UNLOCK_ALIASES.includes(key);
}

function resolveAuthScope() {
  try {
    const raw = localStorage.getItem("fortune_auth_user");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    const scope = String(parsed?.id || parsed?.userId || parsed?._id || parsed?.uid || "").trim().toLowerCase();
    return scope;
  } catch (_) {
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
  } catch (_) {
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
  } catch (_) {}

  try {
    const scope = resolveAuthScope();
    if (!scope) return;
    const scopedKey = `${TILE_LOCK_PREFIX}${scope}`;
    const scoped = readObjectStorage(scopedKey);
    PREMIUM_UNLOCK_ALIASES.forEach((alias) => {
      scoped[alias] = true;
    });
    localStorage.setItem(scopedKey, JSON.stringify(scoped));
  } catch (_) {}
}

function markPremiumUnlockedLocal() {
  try {
    const payload = JSON.stringify({ unlocked: true, updatedAt: Date.now() });
    localStorage.setItem(PREMIUM_UNLOCK_MARKER_KEY, payload);
    sessionStorage.setItem(PREMIUM_UNLOCK_MARKER_KEY, payload);
  } catch (_) {}
  writeUnlockToMaps();
}

function isPremiumUnlockedLocal() {
  try {
    const candidate = sessionStorage.getItem(PREMIUM_UNLOCK_MARKER_KEY) || localStorage.getItem(PREMIUM_UNLOCK_MARKER_KEY);
    if (!candidate) return false;
    const parsed = JSON.parse(candidate);
    return parsed?.unlocked === true;
  } catch (_) {
    return false;
  }
}

function readLocalUnlockByTileMap() {
  const bags: Array<Record<string, boolean>> = [];
  bags.push(readObjectStorage(LEGACY_TILE_LOCK_KEY));

  const scope = resolveAuthScope();
  if (scope) {
    bags.push(readObjectStorage(`${TILE_LOCK_PREFIX}${scope}`));
  }

  for (let i = 0; i < bags.length; i += 1) {
    const keys = Object.keys(bags[i]);
    for (let j = 0; j < keys.length; j += 1) {
      if (bags[i][keys[j]] === true && isPremiumUnlockKey(keys[j])) {
        return true;
      }
    }
  }

  return false;
}

function payloadHasPremiumUnlock(payload: any) {
  const keys = new Set<string>();

  const addKeys = (arr: unknown[]) => {
    arr.forEach((value) => {
      const key = normalizeKey(value);
      if (key) keys.add(key);
    });
  };

  if (Array.isArray(payload?.unlockedFeatures)) addKeys(payload.unlockedFeatures);
  if (Array.isArray(payload?.user?.unlockedFeatures)) addKeys(payload.user.unlockedFeatures);
  if (payload?.unlockMap && typeof payload.unlockMap === "object") {
    Object.keys(payload.unlockMap).forEach((k) => {
      if (payload.unlockMap[k] === true) keys.add(normalizeKey(k));
    });
  }

  const rawKeys = Array.from(keys);
  for (let i = 0; i < rawKeys.length; i += 1) {
    if (isPremiumUnlockKey(rawKeys[i])) return true;
  }
  return false;
}

function getFlowerAdminTokenClient() {
  try {
    return localStorage.getItem("flower_admin_token");
  } catch (_) {
    return null;
  }
}

function StarDust() {
  const dots = Array.from({ length: 16 }, (_, i) => i);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((n) => (
        <span
          key={n}
          className="absolute block h-1 w-1 rounded-full bg-cyan-200/70"
          style={{
            left: `${(n * 37) % 100}%`,
            top: `${(n * 23) % 100}%`,
            boxShadow: "0 0 14px rgba(165,243,252,0.7)",
            opacity: 0.25 + ((n % 5) / 10),
            transform: `scale(${0.7 + ((n % 4) * 0.2)})`,
          }}
        />
      ))}
    </div>
  );
}

export default function AdvancedZiweiSection({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
  isUnlocked = false,
}: AdvancedZiweiSectionProps) {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormState>({
    birthYear: "",
    birthMonth: "1",
    birthDay: "1",
    birthHour: "12",
    unknownHour: false,
    name: "",
    gender: "F",
  });
  const [result, setResult] = useState<AdvancedZiweiResult | null>(null);
  const [chartData, setChartData] = useState<ZiweiChartData | null>(null);
  const [savedName, setSavedName] = useState("");
  const [activeTab, setActiveTab] = useState<ChapterId>("intro");
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("성도 데이터를 정렬하는 중...");
  const { startPayment, endPayment, setPaymentMessage } = usePayment();
  const { showToast } = useToast();
  const [resolvedUnlocked, setResolvedUnlocked] = useState(Boolean(isUnlocked));
  const [unlockSyncing, setUnlockSyncing] = useState(false);
  const autoComputeRef = useRef(false);

  const birthYearNum = Number(form.birthYear);
  const birthMonthNum = Number(form.birthMonth);
  const maxDayInMonth = getDaysInMonth(birthYearNum, birthMonthNum);

  const activeChapter = useMemo(() => CHAPTERS.find((c) => c.id === activeTab), [activeTab]);

  const syncUnlockState = useCallback(async (checkServer: boolean) => {
    if (resolvedUnlocked) return true;
    if (!checkServer) return false;

    setUnlockSyncing(true);
    startPayment("프리미엄 해금 정보를 확인하고 있습니다...");
    try {
      const response = await authFetch('/api/billing/entitlements', {
        method: 'GET',
        cache: 'no-store',
      });
      if (response.status === 401 || response.status === 403) {
        return false;
      }
      const payload = await response.json();
      if (response.ok && payload?.ok && payloadHasPremiumUnlock(payload?.data || payload)) {
        setResolvedUnlocked(true);
        markPremiumUnlockedLocal();
        showToast("✨ 자미두수 프리미엄 해금이 확인되었습니다!", "success");
        return true;
      }
    } catch (err) {
      console.error('[AdvancedZiwei] sync error:', err);
    } finally {
      setUnlockSyncing(false);
      endPayment();
    }

    return false;
  }, [isUnlocked]);

  useEffect(() => {
    const curDay = Number(form.birthDay);
    if (!Number.isFinite(curDay)) return;
    if (curDay > maxDayInMonth) {
      setForm((prev) => ({ ...prev, birthDay: String(maxDayInMonth) }));
    }
  }, [form.birthDay, maxDayInMonth]);

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
        if (parsed?.result && parsed?.chart) {
          setResult(parsed.result);
          setChartData(parsed.chart);
          setSavedName(parsed.name || "당신");
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
          setForm({
            birthYear: String(payload.birth.year),
            birthMonth: String(payload.birth.month ?? 1),
            birthDay: String(payload.birth.day ?? 1),
            birthHour: String(payload.birth.hour ?? 12),
            unknownHour: false,
            name: payload.name || "",
            gender: (payload.gender === "F" ? "F" : "M") as "M" | "F",
          });
          autoComputeRef.current = true;
        }
      }
    } catch (_) {}
  }, []);

  const handleCompute = useCallback(() => {
    const y = Number(form.birthYear);
    const m = Number(form.birthMonth);
    const d = Number(form.birthDay);
    const h = form.unknownHour ? 12 : Number(form.birthHour);

    if (!isValidBirthDate(y, m, d)) {
      alert("생년월일을 정확히 입력해 주세요. 월/일 조합이 올바른지 확인해 주세요.");
      return;
    }

    const displayName = form.name.trim() || "당신";
    setStep("computing");
    setProgress(0);

    const texts = [
      "명궁과 신궁의 축을 정렬하는 중...",
      "12궁 에너지 지도를 구성하는 중...",
      "사화(化祿/化權/化科/化忌)를 결합하는 중...",
      "10년 대한 파동을 시뮬레이션하는 중...",
      "카테고리별 전문 리포트를 집필하는 중...",
    ];

    let p = 0;
    const timer = setInterval(() => {
      p += Math.random() * 5 + 1;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
      }
      setProgress(Math.floor(p));
      setLoadingText(texts[Math.floor((p / 100) * texts.length)] || texts[texts.length - 1]);
    }, 140);

    setTimeout(() => {
      try {
        const chart = calcZiweiPalaces(y, m, d, h, 0, form.gender);
        const report = generateAdvancedReport(chart, displayName);
        clearInterval(timer);
        setProgress(100);
        setSavedName(displayName);
        setChartData(chart);
        setResult(report);

        try {
          sessionStorage.setItem(
            RESULT_CACHE_KEY,
            JSON.stringify({
              result: report,
              chart,
              name: displayName,
              unlocked: resolvedUnlocked,
              updatedAt: Date.now(),
            }),
          );
        } catch (_) {}

        setTimeout(() => setStep("result"), 650);
      } catch (_) {
        clearInterval(timer);
        alert("분석 중 오류가 발생했습니다.");
        setStep("form");
      }
    }, 3300);
  }, [form, resolvedUnlocked]);

  useEffect(() => {
    if (autoComputeRef.current && form.birthYear) {
      autoComputeRef.current = false;
      handleCompute();
    }
  }, [form.birthYear, handleCompute]);

  if (showIntro) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[#050816] p-6 md:p-8">
        <StarDust />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-12 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-sky-500 text-xl shadow-lg shadow-cyan-500/30">
              ✦
            </div>
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.28em] text-cyan-200/80">ASTRAL PREMIUM</p>
              <h3 className="text-2xl font-black text-white" style={{ fontFamily: "'Cinzel', 'Noto Serif KR', serif" }}>
                심화 자미두수 성도 리포트
              </h3>
            </div>
          </div>

          <p className="mb-6 text-sm leading-7 text-slate-200/90">
            단편 운세가 아닌, 명궁·신궁·사화·대한을 교차 해석한 장문 보고서입니다. 무료 챕터로 구조를 먼저 확인하고,
            해금 후에는 전체 카테고리의 상세 전략과 실행 지침을 모두 확인할 수 있습니다.
          </p>

          <div className="mb-8 grid gap-2 text-xs text-cyan-100/85 md:grid-cols-2">
            {[
              "12궁 구조 + 주성 조합 해석",
              "사화(祿/權/科/忌) 실전 적용",
              "10년 대한 파동별 의사결정",
              "관계/재물/커리어 실행 체크리스트",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                {item}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onStartGeneration?.()}
              disabled={generationLoading}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-500 px-4 py-4 text-sm font-black text-[#261600] shadow-[0_12px_24px_rgba(251,191,36,0.3)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              전체 챕터 해금하고 바로 분석하기
            </button>
            <button
              onClick={() => setStep("form")}
              className="w-full rounded-2xl border border-cyan-200/25 bg-cyan-100/5 px-4 py-4 text-sm font-bold text-cyan-100 transition hover:bg-cyan-100/10"
            >
              무료 챕터 먼저 보기
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (step === "form") {
    return (
      <section className="relative min-h-[100dvh] overflow-hidden bg-[#030712] px-4 py-10 text-slate-100 sm:px-6">
        <StarDust />
        <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-3xl rounded-[2rem] border border-white/10 bg-[#070f22]/85 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="mb-8 text-center">
            <p className="mb-2 text-[11px] font-extrabold tracking-[0.3em] text-cyan-200/80">ZIWEI STAR MAP</p>
            <h1 className="text-3xl font-black text-white md:text-4xl" style={{ fontFamily: "'Cinzel', 'Noto Serif KR', serif" }}>
              심화 명반 입력 센터
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              입력 정보는 명반 계산에만 사용되며, 분석은 명궁/사화/대한 축을 기준으로 생성됩니다.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold tracking-wide text-cyan-100/80">이름(선택)</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:bg-white/10"
                placeholder={advancedZiweiSectionText("advancedZiwei.016")}
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs font-bold tracking-wide text-cyan-100/80">성별</span>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/15 bg-white/5 p-1">
                {[
                  { key: "M", label: advancedZiweiSectionText("advancedZiwei.017") },
                  { key: "F", label: advancedZiweiSectionText("advancedZiwei.018") },
                ].map((gender) => (
                  <button
                    key={gender.key}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, gender: gender.key as "M" | "F" }))}
                    className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                      form.gender === gender.key
                        ? "bg-cyan-300 text-slate-900"
                        : "bg-transparent text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {gender.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-xs font-bold tracking-wide text-cyan-100/80">출생 연도</span>
              <input
                type="number"
                inputMode="numeric"
                value={form.birthYear}
                onChange={(e) => setForm((prev) => ({ ...prev, birthYear: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:bg-white/10"
                placeholder="1994"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold tracking-wide text-cyan-100/80">출생 시(24시간)</span>
              <select
                value={form.birthHour}
                onChange={(e) => setForm((prev) => ({ ...prev, birthHour: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:bg-white/10"
                disabled={form.unknownHour}
              >
                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, "0")}시
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold tracking-wide text-cyan-100/80">출생 월</span>
              <select
                value={form.birthMonth}
                onChange={(e) => setForm((prev) => ({ ...prev, birthMonth: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:bg-white/10"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {month}월
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold tracking-wide text-cyan-100/80">출생 일</span>
              <select
                value={form.birthDay}
                onChange={(e) => setForm((prev) => ({ ...prev, birthDay: e.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:bg-white/10"
              >
                {Array.from({ length: maxDayInMonth }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}일
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-5 flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.unknownHour}
              onChange={(e) => setForm((prev) => ({ ...prev, unknownHour: e.target.checked }))}
              className="h-4 w-4 accent-cyan-300"
            />
            출생 시간을 모르는 경우 정오(12시) 기준으로 계산합니다.
          </label>

          <button
            type="button"
            onClick={handleCompute}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 via-sky-300 to-cyan-500 px-5 py-4 text-sm font-black text-[#082032] shadow-lg shadow-cyan-500/25 transition hover:brightness-105"
          >
            성도 분석 시작하기
          </button>
        </div>
      </section>
    );
  }

  if (step === "computing") {
    return (
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#020617] px-6 text-center text-slate-100">
        <StarDust />
        <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-8 h-64 w-64 rounded-full bg-amber-200/10 blur-3xl" />

        <div className="relative mb-10 h-36 w-36">
          <m.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-cyan-200/35"
          />
          <m.div
            animate={{ rotate: -360 }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full border border-dashed border-amber-200/50"
          />
          <m.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.6, repeat: Infinity }}
            className="absolute inset-0 grid place-items-center text-5xl"
          >
            ✧
          </m.div>
        </div>

        <h2 className="text-3xl font-black text-white md:text-4xl" style={{ fontFamily: "'Cinzel', 'Noto Serif KR', serif" }}>
          {loadingText}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
          명궁, 사화, 대한 데이터를 교차 검증하면서 카테고리별 장문 해석을 작성하고 있습니다.
        </p>

        <div className="mt-10 w-full max-w-md overflow-hidden rounded-full border border-white/15 bg-white/5">
          <m.div
            className="h-2 bg-gradient-to-r from-cyan-300 via-sky-300 to-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-4 text-xs font-bold tracking-[0.22em] text-cyan-200/80">{progress}% COMPLETE</p>
      </section>
    );
  }

  if (step === "result" && result && chartData) {
    const activeSection = result[activeTab];
    const canReadAll = resolvedUnlocked;
    const canReadCurrent = canReadAll || !!activeChapter?.free;

    return (
      <section className="relative min-h-[100dvh] overflow-hidden bg-[#02050f] pb-28 text-slate-100">
        <StarDust />
        <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-96 w-96 rounded-full bg-amber-200/10 blur-3xl" />

        <header className="relative z-10 border-b border-white/10 px-4 pb-8 pt-10 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/15 bg-gradient-to-br from-slate-900/80 via-[#0a1a30]/75 to-slate-900/80 p-6 backdrop-blur-xl md:p-8">
            <p className="text-[11px] font-extrabold tracking-[0.28em] text-cyan-200/80">ADVANCED ZIWEI DOSSIER</p>
            <h1 className="mt-2 text-3xl font-black text-white md:text-4xl" style={{ fontFamily: "'Cinzel', 'Noto Serif KR', serif" }}>
              {savedName}님의 우주 해석 리포트
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              명궁과 신궁, 사화 변화, 대한의 흐름을 교차 분석한 결과입니다. 카테고리별로 길게 읽고 실행 전략까지 바로 옮길 수 있도록 설계했습니다.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[11px] text-slate-400">명궁 지지</p>
                <p className="mt-1 text-sm font-black text-cyan-200">{chartData.meng}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[11px] text-slate-400">신궁 지지</p>
                <p className="mt-1 text-sm font-black text-cyan-200">{chartData.body}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[11px] text-slate-400">오행국</p>
                <p className="mt-1 text-sm font-black text-cyan-200">{chartData.juInfo}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[11px] text-slate-400">사화 기준</p>
                <p className="mt-1 text-sm font-black text-cyan-200">{chartData.yearGan}년 {chartData.yearZhi}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="sticky top-0 z-20 border-b border-white/10 bg-[#02050f]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
          <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto">
            {CHAPTERS.map((chapter) => {
              const chapterUnlocked = canReadAll || chapter.free;
              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => setActiveTab(chapter.id)}
                  className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                    activeTab === chapter.id
                      ? "border-cyan-200/60 bg-cyan-200 text-[#032035]"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                  title={`${chapter.constellation}${chapterUnlocked ? "" : " · 잠금"}`}
                >
                  {chapter.title}
                  {!chapterUnlocked ? " • 잠금" : ""}
                </button>
              );
            })}
          </nav>
        </div>

        <main className="relative z-10 mx-auto mt-8 w-full max-w-4xl px-4 sm:px-6">
          <AnimatePresence mode="wait">
            <m.article
              key={activeTab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8"
            >
              <header className="mb-8 border-b border-white/10 pb-6">
                <p className="text-[11px] font-bold tracking-[0.18em] text-cyan-200/80">{activeChapter?.constellation || "CONSTELLATION"}</p>
                <h2 className="mt-2 text-2xl font-black text-white md:text-3xl" style={{ fontFamily: "'Cinzel', 'Noto Serif KR', serif" }}>
                  {activeSection.title}
                </h2>
                <p className="mt-4 rounded-xl border border-cyan-200/25 bg-cyan-100/5 px-4 py-3 text-sm leading-7 text-cyan-100/90">
                  {activeSection.summary}
                </p>
              </header>

              {canReadCurrent ? (
                <div className="space-y-4 text-[15px] leading-8 text-slate-200">
                  {activeSection.detail.split("\n").map((line, idx) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <div key={`sp-${idx}`} className="h-2" />;
                    if (trimmed.startsWith("### ")) {
                      return (
                        <h3 key={`h-${idx}`} className="mt-8 text-xl font-black text-cyan-100">
                          {trimmed.replace("### ", "")}
                        </h3>
                      );
                    }
                    return (
                      <p key={`p-${idx}`} className="text-slate-200/95">
                        {line}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="py-2">
                  <PremiumBlurGate
                    lockedTitle={activeSection.title}
                    subDesc="메인 해금과 자동 동기화되는 프리미엄 상세 리포트"
                    isCheckingAccess={unlockSyncing}
                    checkingAccessMessage={ACCESS_CHECKING_MESSAGE}
                    onUnlock={() => onStartGeneration?.()}
                    previewContent={
                      <div className="mb-8 text-center text-cyan-100/55">
                        해금 시 이 챕터의 정밀 해석, 리스크 관리 전략, 실행 체크리스트가 전체 공개됩니다.
                      </div>
                    }
                    lockedItems={[
                      "명궁/사화 기반 장문 해석",
                      "10년 주기 리스크와 기회 포인트",
                      "재물/관계/커리어 실행 체크리스트",
                      "회귀 패턴 차단을 위한 개운 루틴",
                    ]}
                  />
                </div>
              )}
            </m.article>
          </AnimatePresence>
        </main>

        <footer className="relative z-10 mt-12 px-4 text-center sm:px-6">
          <div className="mx-auto max-w-4xl space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-xs text-slate-400">
            <p>
              본 리포트는 자미두수 계산 엔진을 기반으로 생성되며, 실제 삶의 의사결정은 개인의 상황과 선택을 함께 고려해 진행해야 합니다.
            </p>
            {unlockSyncing ? <p className="text-cyan-200/80">{ACCESS_CHECKING_MESSAGE}</p> : null}
          </div>

          <button
            type="button"
            onClick={() => {
              setStep("form");
              sessionStorage.removeItem(RESULT_CACHE_KEY);
            }}
            className="mt-6 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-xs font-bold text-slate-300 transition hover:bg-white/10"
          >
            다른 명반 다시 분석하기
          </button>
        </footer>
      </section>
    );
  }

  return null;
}
