"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { getApiBaseUrl } from "@/app/_lib/api-config";
import { readSanitizedAuthUser } from "@/app/_lib/auth-storage";

type PersonInputState = {
  name: string;
  gender: "F" | "M" | "OTHER";
  calendarType: "solar" | "lunar" | "lunar_leap";
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  unknownTime: boolean;
};

type ThemePreset = {
  key: string;
  name: string;
  premium: boolean;
  palette?: {
    bg?: string;
    card?: string;
    accent?: string;
    accentSoft?: string;
    text?: string;
  };
};

type DestinyBiasResult = {
  totalScore: number;
  grade: string;
  relationLabel: string;
  card: {
    title: string;
    headline: string;
    summary: string;
    themeKey: string;
  };
  role?: {
    dominantTenGod?: string;
    title?: string;
  };
  reportText: string;
  canonical: Record<string, unknown>;
  sharePayload?: {
    title?: string;
    subtitle?: string;
    hashtags?: string[];
  };
  themes: ThemePreset[];
  gates?: {
    isLoggedIn?: boolean;
    canUsePremiumTheme?: boolean;
    canSaveCollection?: boolean;
    profileTier?: string;
    freeCollectionLimit?: number;
    points?: number;
  };
  pricing?: {
    featureKey?: string;
    perUseCoins?: number;
    chargedCoins?: number;
  };
  warnings?: string[];
};

type SavedCard = {
  id: string;
  title: string;
  headline: string;
  summary: string;
  themeKey: string;
  score: number;
  grade: string;
  reportText: string;
  createdAt?: string;
};

const DEFAULT_THEMES: ThemePreset[] = [
  { key: "moonlight_neon", name: "Moonlight Neon", premium: false },
  { key: "coral_haze", name: "Coral Haze", premium: false },
  { key: "jade_orbit", name: "Jade Orbit", premium: true },
  { key: "gold_nocturne", name: "Gold Nocturne", premium: true },
  { key: "skywave_mint", name: "Skywave Mint", premium: true },
];

const DEFAULT_ANALYZE_COST = 50;

const INITIAL_ME: PersonInputState = {
  name: "나",
  gender: "F",
  calendarType: "solar",
  year: 1998,
  month: 8,
  day: 18,
  hour: 14,
  minute: 0,
  unknownTime: false,
};

const INITIAL_BIAS: PersonInputState = {
  name: "최애",
  gender: "M",
  calendarType: "solar",
  year: 1997,
  month: 5,
  day: 7,
  hour: 19,
  minute: 30,
  unknownTime: false,
};

function readLocalToken() {
  if (typeof window === "undefined") return "";
  try {
    return String(localStorage.getItem("fortune_auth_token") || "").trim();
  } catch {
    return "";
  }
}

function withApiBase(apiBase: string, path: string) {
  if (!apiBase) return path;
  return `${apiBase}${path}`;
}

function toBirthPayload(input: PersonInputState) {
  return {
    calendarType: input.calendarType,
    year: Number(input.year),
    month: Number(input.month),
    day: Number(input.day),
    hour: Number(input.hour),
    minute: Number(input.minute),
    unknownTime: Boolean(input.unknownTime),
  };
}

function formatKoreanDate(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "";
  return parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function PersonEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PersonInputState;
  onChange: (next: PersonInputState) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm md:p-5">
      <h3 className="text-sm font-black tracking-[0.08em] text-amber-100">{label}</h3>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-200">
          이름
          <input
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value.slice(0, 24) })}
            className="rounded-xl border border-white/25 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
            placeholder="닉네임"
          />
        </label>

        <label className="grid gap-1 text-xs text-slate-200">
          성별
          <select
            value={value.gender}
            onChange={(event) => onChange({ ...value, gender: event.target.value as PersonInputState["gender"] })}
            className="rounded-xl border border-white/25 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
          >
            <option value="F">여성</option>
            <option value="M">남성</option>
            <option value="OTHER">기타</option>
          </select>
        </label>

        <label className="grid gap-1 text-xs text-slate-200 md:col-span-2">
          달력
          <select
            value={value.calendarType}
            onChange={(event) => onChange({ ...value, calendarType: event.target.value as PersonInputState["calendarType"] })}
            className="rounded-xl border border-white/25 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
            <option value="lunar_leap">음력(윤달)</option>
          </select>
        </label>

        <label className="grid gap-1 text-xs text-slate-200">
          출생 연도
          <input
            type="number"
            min={1900}
            max={2100}
            value={value.year}
            onChange={(event) => onChange({ ...value, year: clampInt(Number(event.target.value), 1900, 2100) })}
            className="rounded-xl border border-white/25 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
          />
        </label>

        <label className="grid gap-1 text-xs text-slate-200">
          월/일
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={1}
              max={12}
              value={value.month}
              onChange={(event) => onChange({ ...value, month: clampInt(Number(event.target.value), 1, 12) })}
              className="rounded-xl border border-white/25 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
            />
            <input
              type="number"
              min={1}
              max={31}
              value={value.day}
              onChange={(event) => onChange({ ...value, day: clampInt(Number(event.target.value), 1, 31) })}
              className="rounded-xl border border-white/25 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
            />
          </div>
        </label>

        <label className="grid gap-1 text-xs text-slate-200">
          시/분
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              max={23}
              disabled={value.unknownTime}
              value={value.hour}
              onChange={(event) => onChange({ ...value, hour: clampInt(Number(event.target.value), 0, 23) })}
              className="rounded-xl border border-white/25 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none disabled:opacity-50 focus:border-amber-300"
            />
            <input
              type="number"
              min={0}
              max={59}
              disabled={value.unknownTime}
              value={value.minute}
              onChange={(event) => onChange({ ...value, minute: clampInt(Number(event.target.value), 0, 59) })}
              className="rounded-xl border border-white/25 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none disabled:opacity-50 focus:border-amber-300"
            />
          </div>
        </label>

        <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/30 px-3 py-2 text-xs text-slate-100 md:col-span-2">
          <input
            type="checkbox"
            checked={value.unknownTime}
            onChange={(event) => onChange({ ...value, unknownTime: event.target.checked })}
            className="h-4 w-4 accent-amber-300"
          />
          출생 시간을 모르면 정오 기준으로 계산
        </label>
      </div>
    </section>
  );
}

export default function DestinyBiasClient() {
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const [meInput, setMeInput] = useState<PersonInputState>(INITIAL_ME);
  const [biasInput, setBiasInput] = useState<PersonInputState>(INITIAL_BIAS);
  const [activeThemeKey, setActiveThemeKey] = useState("moonlight_neon");

  const [result, setResult] = useState<DestinyBiasResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const [token, setToken] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const themes = result?.themes?.length ? result.themes : DEFAULT_THEMES;

  const selectedTheme = useMemo(() => {
    return themes.find((theme) => theme.key === activeThemeKey) || themes[0] || DEFAULT_THEMES[0];
  }, [activeThemeKey, themes]);

  const canUsePremiumTheme = Boolean(result?.gates?.canUsePremiumTheme);
  const canSaveCollection = Boolean(result?.gates?.canSaveCollection);
  const currentAnalyzeCost = Number(result?.pricing?.perUseCoins || DEFAULT_ANALYZE_COST);

  const ogImagePath = useMemo(() => {
    if (!result) return "/api/destiny-bias/og";
    const params = new URLSearchParams({
      title: result.card?.title || "최애운명 카드",
      score: String(result.totalScore || 0),
      grade: String(result.grade || "B"),
      relation: String(result.relationLabel || "운명 공명"),
      price: String(currentAnalyzeCost),
    });
    return `/api/destiny-bias/og?${params.toString()}`;
  }, [currentAnalyzeCost, result]);

  const loadCards = useCallback(async () => {
    setCardsLoading(true);
    try {
      const response = await authFetch("/api/destiny-bias/cards?limit=12", {
        method: "GET",
      }, {
        apiBase,
      });

      if (!response.ok) {
        setCards([]);
        return;
      }

      const payload = await response.json();
      setCards(Array.isArray(payload?.items) ? payload.items : []);
    } catch {
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    const localToken = readLocalToken();
    const user = readSanitizedAuthUser();
    setToken(localToken);
    setIsLoggedIn(Boolean(localToken || user?.id || user?.userId));
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setCards([]);
      return;
    }
    loadCards().catch(() => {
      setCards([]);
    });
  }, [isLoggedIn, loadCards]);

  const analyze = useCallback(async () => {
    if (!isLoggedIn) {
      setError("최애운명 분석은 1회 50코인 서비스입니다. 로그인 후 이용해 주세요.");
      return;
    }

    setAnalyzing(true);
    setError("");

    try {
      const response = await fetch(withApiBase(apiBase, "/api/destiny-bias/analyze"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user: {
            name: meInput.name,
            gender: meInput.gender,
            birth: toBirthPayload(meInput),
          },
          bias: {
            name: biasInput.name,
            gender: biasInput.gender,
            birth: toBirthPayload(biasInput),
          },
          themeKey: activeThemeKey,
        }),
      });

      const raw = await response.text();
      const payload = raw ? JSON.parse(raw) : {};
      if (!response.ok || !payload?.ok) {
        throw new Error(String(payload?.message || payload?.error || "최애운명 분석에 실패했습니다."));
      }

      setResult(payload.result as DestinyBiasResult);
      if (payload?.result?.card?.themeKey) {
        setActiveThemeKey(String(payload.result.card.themeKey));
      }
    } catch (analysisError) {
      setResult(null);
      setError(analysisError instanceof Error ? analysisError.message : "분석 요청 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }, [activeThemeKey, apiBase, biasInput, isLoggedIn, meInput, token]);

  const saveCard = useCallback(async () => {
    if (!result) return;
    setSaving(true);
    setError("");

    try {
      const response = await authFetch("/api/destiny-bias/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.card.title,
          headline: result.card.headline,
          summary: result.card.summary,
          themeKey: activeThemeKey,
          score: result.totalScore,
          grade: result.grade,
          reportText: result.reportText,
          canonical: result.canonical,
          sharePayload: result.sharePayload,
        }),
      }, {
        apiBase,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(String(payload?.message || payload?.error || "카드 저장에 실패했습니다."));
      }

      const item = payload?.item as SavedCard;
      setCards((prev) => [item, ...prev.filter((card) => card.id !== item.id)]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "카드 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [activeThemeKey, apiBase, result]);

  const deleteCard = useCallback(async (id: string) => {
    try {
      const response = await authFetch(`/api/destiny-bias/cards/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }, {
        apiBase,
      });
      if (!response.ok) return;
      setCards((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // no-op
    }
  }, [apiBase]);

  const downloadCardImage = useCallback(async () => {
    const target = document.getElementById("destiny-bias-card-preview");
    if (!target) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(target, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `destiny-bias-${Date.now()}.png`;
      link.click();
    } catch {
      setError("이미지 저장 중 오류가 발생했습니다.");
    }
  }, []);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#060d1f] text-slate-100"
      style={{ fontFamily: "Poppins, Pretendard Variable, IBM Plex Sans KR, Noto Sans KR, sans-serif" }}
    >
      <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 top-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden />

      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-6 md:pt-14">
        <header className="rounded-3xl border border-white/15 bg-[radial-gradient(circle_at_18%_16%,rgba(251,191,36,0.18),transparent_32%),radial-gradient(circle_at_86%_24%,rgba(34,211,238,0.16),transparent_34%),linear-gradient(150deg,#0b132b,#131f46_52%,#1a133b)] p-6 shadow-[0_24px_60px_rgba(4,7,20,0.45)] md:p-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-amber-200/90">MY DESTINY BIAS</p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-white md:text-4xl">
            최애운명: 내부 명식 엔진 기반 팬덤 공명 분석
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200/85 md:text-base">
            계산은 내부 사주 엔진이 수행하고, AI는 계산 결과를 해석만 합니다.
            내 사주와 최애 사주의 오행 보완·십성 역할·오늘 액션을 카드로 확인하세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-100">
            <span className="rounded-full border border-cyan-200/35 bg-cyan-200/10 px-3 py-1">AI 비계산 원칙</span>
            <span className="rounded-full border border-amber-200/35 bg-amber-200/10 px-3 py-1">사주 canonical JSON</span>
            <span className="rounded-full border border-violet-200/35 bg-violet-200/10 px-3 py-1">모바일 우선 카드 저장</span>
            <span className="rounded-full border border-rose-200/35 bg-rose-200/10 px-3 py-1">1회 50코인</span>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <PersonEditor label="내 정보" value={meInput} onChange={setMeInput} />
          <PersonEditor label="최애 정보" value={biasInput} onChange={setBiasInput} />
        </section>

        <section className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4 md:p-5">
          <p className="text-xs font-semibold tracking-[0.08em] text-slate-200">카드 테마</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {themes.map((theme) => {
              const isDisabled = Boolean(theme.premium && !canUsePremiumTheme);
              const isActive = theme.key === activeThemeKey;
              return (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => setActiveThemeKey(theme.key)}
                  disabled={isDisabled}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "border-amber-200 bg-amber-200/20 text-amber-100"
                      : "border-white/25 bg-slate-950/35 text-slate-200"
                  } ${isDisabled ? "cursor-not-allowed opacity-50" : "hover:border-amber-200/65"}`}
                >
                  {theme.name}
                  {theme.premium ? " · PREMIUM" : " · FREE"}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => analyze().catch(() => null)}
              disabled={analyzing}
              className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-2.5 text-sm font-black text-slate-900 shadow-[0_10px_24px_rgba(251,191,36,0.35)] transition hover:brightness-105 disabled:opacity-60"
            >
              {analyzing ? "분석 중..." : `최애운명 분석 시작 (${DEFAULT_ANALYZE_COST}코인)`}
            </button>

            <button
              type="button"
              onClick={downloadCardImage}
              disabled={!result}
              className="rounded-xl border border-cyan-200/35 bg-cyan-200/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-200/20 disabled:opacity-45"
            >
              카드 이미지 저장
            </button>

            <a
              href={ogImagePath}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-emerald-200/35 bg-emerald-200/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-200/20"
            >
              OG 공유 이미지 보기
            </a>

            <button
              type="button"
              onClick={() => saveCard().catch(() => null)}
              disabled={!result || !canSaveCollection || saving}
              className="rounded-xl border border-violet-200/35 bg-violet-300/10 px-4 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-300/20 disabled:opacity-45"
            >
              {saving ? "저장 중..." : "컬렉션 저장"}
            </button>

            {!isLoggedIn && (
              <Link
                href="/login?next=%2Fsaju%2Fdestiny-bias"
                className="rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                로그인 후 저장
              </Link>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-xl border border-rose-300/45 bg-rose-300/15 px-3 py-2 text-sm text-rose-100">
              {error}
            </p>
          )}

          {result?.pricing && (
            <p className="mt-2 text-xs text-amber-100/90">
              이번 분석 차감: {Number(result.pricing.chargedCoins || currentAnalyzeCost)}코인
              {typeof result?.gates?.points === "number" ? ` · 현재 잔액 ${Number(result.gates.points).toLocaleString("ko-KR")}코인` : ""}
            </p>
          )}
        </section>

        {result && (
          <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-2xl border border-white/15 bg-white/5 p-4 md:p-5">
              <h2 className="text-lg font-black text-white">해석 리포트</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-amber-200/35 bg-amber-200/10 px-2 py-1">공명 {result.totalScore}점</span>
                <span className="rounded-full border border-cyan-200/35 bg-cyan-200/10 px-2 py-1">등급 {result.grade}</span>
                <span className="rounded-full border border-violet-200/35 bg-violet-200/10 px-2 py-1">{result.relationLabel}</span>
              </div>

              {Array.isArray(result.warnings) && result.warnings.length > 0 && (
                <ul className="mt-3 grid gap-1 text-xs text-amber-100/90">
                  {result.warnings.map((warning) => (
                    <li key={warning} className="rounded-lg border border-amber-200/30 bg-amber-200/10 px-3 py-2">
                      {warning}
                    </li>
                  ))}
                </ul>
              )}

              <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/15 bg-slate-950/50 p-3 text-sm leading-7 text-slate-100">
                {result.reportText}
              </pre>
            </article>

            <article className="rounded-2xl border border-white/15 bg-white/5 p-4 md:p-5">
              <h2 className="text-lg font-black text-white">최애운명 카드</h2>
              <div
                id="destiny-bias-card-preview"
                className="relative mt-3 overflow-hidden rounded-2xl border border-white/20 p-4"
                style={{
                  background: selectedTheme?.palette?.bg || "linear-gradient(145deg, #091431 0%, #13213f 48%, #221248 100%)",
                  color: selectedTheme?.palette?.text || "#e6f3ff",
                }}
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-2xl"
                  style={{ background: selectedTheme?.palette?.accentSoft || "rgba(139, 233, 253, 0.28)" }}
                  aria-hidden
                />
                <p className="text-xs font-semibold tracking-[0.11em] opacity-90">MY DESTINY BIAS CARD</p>
                <h3 className="mt-2 text-xl font-black leading-tight">{result.card.title}</h3>
                <p className="mt-2 text-sm font-semibold opacity-95">{result.card.headline}</p>
                <p className="mt-3 text-sm leading-7 opacity-90">{result.card.summary}</p>

                <div className="mt-3 inline-flex items-center rounded-full border border-white/30 bg-black/20 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em]">
                  1회 {currentAnalyzeCost}코인
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                  <div className="rounded-lg border border-white/25 bg-black/20 px-2 py-2">
                    <p className="opacity-80">공명 점수</p>
                    <p className="mt-1 text-base">{result.totalScore}</p>
                  </div>
                  <div className="rounded-lg border border-white/25 bg-black/20 px-2 py-2">
                    <p className="opacity-80">등급</p>
                    <p className="mt-1 text-base">{result.grade}</p>
                  </div>
                  <div className="rounded-lg border border-white/25 bg-black/20 px-2 py-2">
                    <p className="opacity-80">핵심 십성</p>
                    <p className="mt-1 text-base">{result.role?.dominantTenGod || "-"}</p>
                  </div>
                </div>

                <p className="mt-4 text-[11px] opacity-75">Code Destiny | 최애운명</p>
              </div>
            </article>
          </section>
        )}

        <section className="mt-7 rounded-2xl border border-white/15 bg-white/5 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-black text-white">내 최애운명 컬렉션</h2>
            {cardsLoading && <span className="text-xs text-slate-300">불러오는 중...</span>}
          </div>

          {!isLoggedIn && (
            <p className="mt-3 text-sm text-slate-300">
              로그인하면 분석 카드를 저장하고 삭제할 수 있습니다.
            </p>
          )}

          {isLoggedIn && cards.length === 0 && !cardsLoading && (
            <p className="mt-3 text-sm text-slate-300">아직 저장된 카드가 없습니다.</p>
          )}

          {cards.length > 0 && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {cards.map((card) => (
                <article key={card.id} className="rounded-xl border border-white/15 bg-slate-950/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">{card.title}</h3>
                      <p className="mt-1 text-xs text-slate-300">{card.headline}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCard(card.id)}
                      className="rounded-lg border border-rose-300/35 bg-rose-300/10 px-2 py-1 text-xs font-semibold text-rose-100 hover:bg-rose-300/20"
                    >
                      삭제
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-300">{card.summary || card.reportText}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{formatKoreanDate(card.createdAt)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
