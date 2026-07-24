"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock3, Moon, Sparkles, Sun } from "lucide-react";
import {
  fetchCurrentDestinyProfile,
  isDestinyProfileStorageKey,
  resolveDestinyProfileBirthParts,
  type DestinyProfileCard,
} from "@/app/_lib/profile-card-storage";
import {
  formatDateOnly,
  getLocalDateOnly,
  validateMayaBirthDate,
} from "@/lib/maya/maya-calendar";
import {
  buildMayaBirthReading,
  buildMayaDailyReading,
  formatMayaResultForCopy,
  type MayaReadingMode,
  type MayaReadingResult,
} from "@/lib/maya/maya-reading";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import MayaCalendarWheel from "./MayaCalendarWheel";
import MayaResultCard from "./MayaResultCard";

const MAYA_ASSET_URL = "https://assets.code-destiny.com/%EB%A7%88%EC%95%BC%EC%A0%90.webp";
const MAYA_FORTUNE_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    profilePrompt: "프로필 생년월일이 있으면 자동으로 채워집니다.",
    profileLoaded: "저장된 프로필 생년월일을 불러왔습니다. 필요하면 직접 수정할 수 있습니다.",
    timezoneFallback: "브라우저 로컬 시간대",
    calculationError: "계산 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    copied: "마야점 결과를 복사했습니다.",
    assetAlt: "금빛 마야 달력판과 밤하늘의 시간 문양",
    loadingText: "마야 달력의 날짜 구조를 계산하는 중입니다.",
    heroEyebrow: "Sacred Calendar Reading",
    heroTitle: "마야점",
    heroSubtitle: "시간의 문양으로 읽는 오늘의 흐름",
    heroDescription: "생년월일 또는 오늘 날짜를 마야 sacred calendar의 Tzolk’in, Haab, Long Count로 변환해 나의 나왈과 오늘의 리듬을 읽습니다.",
    birthCta: "내 마야 나왈 보기",
    dailyCta: "오늘의 마야점 보기",
    interpretationNote: "마야 달력의 날짜 구조와 상징을 바탕으로 만든 현대적 해석형 리딩입니다.",
    birthTab: "내 마야 나왈",
    dailyTab: "오늘의 마야점",
    birthTitle: "내 마야 나왈",
    birthDescription: "생년월일을 마야 sacred calendar로 변환해 나의 기본 나왈과 13수 리듬을 확인합니다.",
    birthDateLabel: "생년월일",
    birthHelperPrefix: "양력 날짜 기준으로 계산합니다.",
    birthSubmit: "내 마야 나왈 계산하기",
    dailyTitle: "오늘의 마야점",
    dailyDescription: "오늘 날짜를 Tzolk’in, Haab, Long Count로 변환해 하루의 흐름과 맞는 행동을 살핍니다.",
    todayDateLabel: "오늘 날짜",
    timezoneLabel: "기준 시간대",
    infoTitle: "시간의 순환을 날짜로 읽습니다",
    infoBody: "마야점 1차 버전은 랜덤 뽑기가 아니라 입력한 날짜를 실제 달력값으로 변환합니다. Tzolk’in의 13수와 20개 날 기호, Haab, Long Count가 함께 놓일 때 나왈의 상징과 오늘의 리듬이 드러납니다.",
    todayDateFormat: (year: number, month: number, day: number) => `${year}년 ${month}월 ${day}일`,
  },
  en: {
    profilePrompt: "If your profile has a birth date, it will be filled in automatically.",
    profileLoaded: "Saved profile birth date loaded. You can edit it if needed.",
    timezoneFallback: "Browser local time zone",
    calculationError: "A problem occurred during calculation. Please try again shortly.",
    copied: "Maya reading result copied.",
    assetAlt: "A golden Maya calendar disk with time patterns in the night sky",
    loadingText: "Calculating the date structure of the Maya calendar.",
    heroEyebrow: "Sacred Calendar Reading",
    heroTitle: "Maya Reading",
    heroSubtitle: "Today’s rhythm through the patterns of time",
    heroDescription: "Convert your birth date or today’s date into the Maya sacred calendar: Tzolk’in, Haab, and Long Count, then read your nawál and daily rhythm.",
    birthCta: "Read My Maya Nawál",
    dailyCta: "Read Today’s Maya Flow",
    interpretationNote: "A modern interpretive reading built from the date structure and symbols of the Maya calendar.",
    birthTab: "My Maya Nawál",
    dailyTab: "Today’s Maya Reading",
    birthTitle: "My Maya Nawál",
    birthDescription: "Convert your birth date into the Maya sacred calendar and read your core nawál with its 13-number rhythm.",
    birthDateLabel: "Birth Date",
    birthHelperPrefix: "Calculated from the solar calendar date.",
    birthSubmit: "Calculate My Maya Nawál",
    dailyTitle: "Today’s Maya Reading",
    dailyDescription: "Convert today’s date into Tzolk’in, Haab, and Long Count to read the day’s flow and fitting action.",
    todayDateLabel: "Today’s Date",
    timezoneLabel: "Time Zone",
    infoTitle: "Reading time’s cycle through a date",
    infoBody: "This first Maya reading version does not draw randomly. It converts the entered date into actual calendar values. When the 13 numbers and 20 day signs of Tzolk’in, Haab, and Long Count are placed together, your nawál symbol and today’s rhythm come forward.",
    todayDateFormat: (year: number, month: number, day: number) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  },
  ja: {
    profilePrompt: "プロフィールに生年月日がある場合は自動入力されます。",
    profileLoaded: "保存済みプロフィールの生年月日を読み込みました。必要に応じて直接修正できます。",
    timezoneFallback: "ブラウザのローカルタイムゾーン",
    calculationError: "計算中に問題が発生しました。しばらくしてからもう一度お試しください。",
    copied: "マヤ占いの結果をコピーしました。",
    assetAlt: "黄金のマヤ暦盤と夜空に浮かぶ時間の文様",
    loadingText: "マヤ暦の日付構造を計算しています。",
    heroEyebrow: "Sacred Calendar Reading",
    heroTitle: "マヤ占い",
    heroSubtitle: "時間の文様から読む今日の流れ",
    heroDescription: "生年月日または今日の日付をマヤの聖なる暦、Tzolk’in・Haab・Long Countへ変換し、あなたのナワールと今日のリズムを読み解きます。",
    birthCta: "私のマヤ・ナワールを見る",
    dailyCta: "今日のマヤ占いを見る",
    interpretationNote: "マヤ暦の日付構造と象徴をもとにした、現代的な解釈リーディングです。",
    birthTab: "私のマヤ・ナワール",
    dailyTab: "今日のマヤ占い",
    birthTitle: "私のマヤ・ナワール",
    birthDescription: "生年月日をマヤの聖なる暦へ変換し、基本のナワールと13数のリズムを確かめます。",
    birthDateLabel: "生年月日",
    birthHelperPrefix: "太陽暦の日付を基準に計算します。",
    birthSubmit: "私のマヤ・ナワールを計算する",
    dailyTitle: "今日のマヤ占い",
    dailyDescription: "今日の日付をTzolk’in・Haab・Long Countへ変換し、一日の流れと合う行動を読みます。",
    todayDateLabel: "今日の日付",
    timezoneLabel: "基準タイムゾーン",
    infoTitle: "日付から時間の循環を読みます",
    infoBody: "マヤ占いの初期版はランダム抽選ではなく、入力した日付を実際の暦値へ変換します。Tzolk’inの13数と20の日のしるし、Haab、Long Countが重なるとき、ナワールの象徴と今日のリズムが浮かび上がります。",
    todayDateFormat: (year: number, month: number, day: number) => `${year}年${month}月${day}日`,
  },
} as const;

type MayaFortunePageCopySource = (typeof MAYA_FORTUNE_PAGE_TEXT_TRANSLATIONS)["ko"];
type MayaFortunePageCopy = {
  [Key in keyof MayaFortunePageCopySource]: MayaFortunePageCopySource[Key] extends (...args: infer Args) => infer Return
    ? (...args: Args) => Return
    : string;
};

function getMayaFortunePageCopy(locale: LoadingLocale): MayaFortunePageCopy {
  return (MAYA_FORTUNE_PAGE_TEXT_TRANSLATIONS[locale as "ko" | "en" | "ja"] || MAYA_FORTUNE_PAGE_TEXT_TRANSLATIONS.ko) as MayaFortunePageCopy;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function profileToBirthDate(profile: DestinyProfileCard | null | undefined) {
  const parts = resolveDestinyProfileBirthParts(profile);
  return parts ? formatDateOnly(parts) : "";
}

function getTimezoneLabel(copy: Pick<MayaFortunePageCopy, "timezoneFallback">) {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || copy.timezoneFallback;
  } catch {
    return copy.timezoneFallback;
  }
}

function LoadingPanel({ copy }: { copy: Pick<MayaFortunePageCopy, "loadingText"> }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" role="status" aria-live="polite">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-40 animate-pulse rounded-[8px] border border-white/10 bg-white/[0.07]" />
        ))}
      </div>
      <p className="mt-4 text-sm font-bold text-amber-100">{copy.loadingText}</p>
    </div>
  );
}

export default function MayaFortunePage() {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getMayaFortunePageCopy(locale);
  const [activeTab, setActiveTab] = useState<MayaReadingMode>("birth");
  const [birthDate, setBirthDate] = useState("");
  const [profileNote, setProfileNote] = useState<string>(MAYA_FORTUNE_PAGE_TEXT_TRANSLATIONS.ko.profilePrompt);
  const [todayString, setTodayString] = useState(() => formatDateOnly(getLocalDateOnly()));
  const [timezoneLabel, setTimezoneLabel] = useState<string>(MAYA_FORTUNE_PAGE_TEXT_TRANSLATIONS.ko.timezoneFallback);
  const [loadingMode, setLoadingMode] = useState<MayaReadingMode | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MayaReadingResult | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const inputRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  const todayDisplay = useMemo(() => {
    const parts = getLocalDateOnly();
    return copy.todayDateFormat(parts.year, parts.month, parts.day);
  }, [copy, todayString]);

  const syncProfileBirthDate = useCallback(async (eventProfile?: unknown) => {
    const localCandidate = profileToBirthDate(eventProfile as DestinyProfileCard | null);
    if (localCandidate) {
      setBirthDate((prev) => prev || localCandidate);
      setProfileNote(copy.profileLoaded);
      return;
    }

    const profile = await fetchCurrentDestinyProfile((item) => Boolean(resolveDestinyProfileBirthParts(item)));
    const next = profileToBirthDate(profile);
    if (next) {
      setBirthDate((prev) => prev || next);
      setProfileNote(copy.profileLoaded);
    }
  }, [copy.profileLoaded]);

  useEffect(() => {
    setTodayString(formatDateOnly(getLocalDateOnly()));
    setTimezoneLabel(getTimezoneLabel(copy));
    void syncProfileBirthDate();

    const onStorage = (event: StorageEvent) => {
      if (!isDestinyProfileStorageKey(event.key)) return;
      void syncProfileBirthDate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [copy, syncProfileBirthDate]);

  useEffect(() => {
    const profilePrompts: string[] = Object.values(MAYA_FORTUNE_PAGE_TEXT_TRANSLATIONS).map((item) => item.profilePrompt);
    setProfileNote((prev) => profilePrompts.includes(prev) ? copy.profilePrompt : prev);
  }, [copy.profilePrompt]);

  useEffect(() => {
    if (!result && !loadingMode) return;
    const id = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(id);
  }, [result, loadingMode]);

  const runBirthReading = useCallback(async () => {
    if (loadingMode) return;
    setCopyStatus("");
    setError("");
    const validation = validateMayaBirthDate(birthDate, getLocalDateOnly(), locale);
    if (!validation.ok) {
      setError(validation.message);
      setActiveTab("birth");
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    try {
      setActiveTab("birth");
      setLoadingMode("birth");
      await sleep(460);
      setResult(buildMayaBirthReading(validation.parts));
    } catch {
      setError(copy.calculationError);
    } finally {
      setLoadingMode(null);
    }
  }, [birthDate, copy.calculationError, loadingMode, locale]);

  const runDailyReading = useCallback(async () => {
    if (loadingMode) return;
    setCopyStatus("");
    setError("");
    try {
      const today = getLocalDateOnly();
      setTodayString(formatDateOnly(today));
      setTimezoneLabel(getTimezoneLabel(copy));
      setActiveTab("daily");
      setLoadingMode("daily");
      await sleep(460);
      setResult(buildMayaDailyReading(today, getTimezoneLabel(copy)));
    } catch {
      setError(copy.calculationError);
    } finally {
      setLoadingMode(null);
    }
  }, [copy, loadingMode]);

  const copyResult = useCallback(async () => {
    if (!result) return;
    const text = formatMayaResultForCopy(result);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopyStatus(copy.copied);
    window.setTimeout(() => setCopyStatus(""), 2400);
  }, [copy.copied, result]);

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#070816] text-slate-50">
      <section className="relative min-h-[92vh] px-4 py-10 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(250,204,21,0.2),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(147,51,234,0.2),transparent_30%),radial-gradient(circle_at_52%_86%,rgba(20,184,166,0.14),transparent_26%),linear-gradient(180deg,#070816_0%,#11102a_48%,#09111f_100%)]" />
        <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(1px_1px_at_12%_22%,rgba(255,255,255,0.9),transparent),radial-gradient(1px_1px_at_70%_18%,rgba(253,230,138,0.8),transparent),radial-gradient(1px_1px_at_82%_62%,rgba(204,251,241,0.72),transparent),radial-gradient(1px_1px_at_34%_74%,rgba(255,255,255,0.65),transparent)] [background-size:180px_180px,240px_240px,310px_310px,390px_390px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:min-h-[78vh] lg:grid-cols-[1fr_0.92fr]">
          <div className="pt-8 lg:pt-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-100">
              <Moon className="h-4 w-4" />
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-6 text-5xl font-black leading-tight tracking-0 text-amber-50 md:text-7xl">{copy.heroTitle}</h1>
            <p className="mt-4 text-2xl font-black text-teal-100 md:text-3xl">{copy.heroSubtitle}</p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-100/82 md:text-lg">
              {copy.heroDescription}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("birth");
                  inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-100"
              >
                <Sparkles className="h-4 w-4" />
                {copy.birthCta}
              </button>
              <button
                type="button"
                onClick={runDailyReading}
                disabled={Boolean(loadingMode)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-200/40 bg-teal-200/12 px-5 py-3 text-sm font-black text-teal-50 transition hover:bg-teal-200/18 disabled:cursor-wait disabled:opacity-70"
              >
                <Sun className="h-4 w-4" />
                {copy.dailyCta}
              </button>
            </div>
            <p className="mt-5 max-w-2xl rounded-[8px] border border-white/12 bg-white/[0.06] p-4 text-sm leading-7 text-slate-100/78">
              {copy.interpretationNote}
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-x-4 bottom-0 h-20 rounded-[50%] bg-emerald-950/50 blur-2xl" />
            <div className="relative overflow-hidden rounded-[8px] border border-amber-200/24 bg-white/[0.06] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[8px] bg-[#0b1022]">
                <img
                  src={MAYA_ASSET_URL}
                  alt={copy.assetAlt}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,22,0.08),rgba(7,8,22,0.72)),radial-gradient(circle_at_50%_46%,rgba(250,204,21,0.12),transparent_40%)]" />
                <div className="absolute bottom-4 left-4 right-4 rounded-[8px] border border-amber-100/20 bg-slate-950/55 p-4 backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100/72">GMT 584283</p>
                  <p className="mt-1 text-lg font-black text-amber-50">Tzolk’in · Haab · Long Count</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={inputRef} className="relative border-y border-white/10 bg-[#0b1022] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="inline-flex rounded-full border border-white/12 bg-white/[0.06] p-1">
            {[
              ["birth", copy.birthTab],
              ["daily", copy.dailyTab],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveTab(mode as MayaReadingMode)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${activeTab === mode ? "bg-amber-200 text-slate-950" : "text-slate-200 hover:bg-white/10"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <article className={`${activeTab === "birth" ? "block" : "hidden lg:block"} rounded-[8px] border border-white/12 bg-white/[0.07] p-5 backdrop-blur`}>
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-1 h-5 w-5 shrink-0 text-amber-100" />
                <div>
                  <h2 className="text-xl font-black text-amber-50">{copy.birthTitle}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-100/78">
                    {copy.birthDescription}
                  </p>
                </div>
              </div>
              <label className="mt-5 block text-sm font-black text-slate-100" htmlFor="mayaBirthDate">
                {copy.birthDateLabel}
              </label>
              <input
                id="mayaBirthDate"
                type="date"
                value={birthDate}
                max={todayString}
                onChange={(event) => {
                  setBirthDate(event.target.value);
                  setError("");
                }}
                className="mt-2 w-full rounded-[8px] border border-amber-200/30 bg-slate-950/70 px-4 py-3 text-base font-bold text-slate-50 outline-none transition focus:border-amber-200"
              />
              <p className="mt-2 text-xs leading-6 text-slate-300">{copy.birthHelperPrefix} {profileNote}</p>
              <button
                type="button"
                onClick={runBirthReading}
                disabled={Boolean(loadingMode)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
              >
                <Sparkles className="h-4 w-4" />
                {copy.birthSubmit}
              </button>
            </article>

            <article className={`${activeTab === "daily" ? "block" : "hidden lg:block"} rounded-[8px] border border-white/12 bg-white/[0.07] p-5 backdrop-blur`}>
              <div className="flex items-start gap-3">
                <Clock3 className="mt-1 h-5 w-5 shrink-0 text-teal-100" />
                <div>
                  <h2 className="text-xl font-black text-teal-50">{copy.dailyTitle}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-100/78">
                    {copy.dailyDescription}
                  </p>
                </div>
              </div>
              <dl className="mt-5 grid gap-3 text-sm">
                <div className="rounded-[8px] border border-white/10 bg-slate-950/45 p-4">
                  <dt className="text-slate-300">{copy.todayDateLabel}</dt>
                  <dd className="mt-1 text-lg font-black text-slate-50">{todayDisplay}</dd>
                </div>
                <div className="rounded-[8px] border border-white/10 bg-slate-950/45 p-4">
                  <dt className="text-slate-300">{copy.timezoneLabel}</dt>
                  <dd className="mt-1 text-lg font-black text-slate-50">{timezoneLabel}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={runDailyReading}
                disabled={Boolean(loadingMode)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal-200 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-teal-100 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
              >
                <Sun className="h-4 w-4" />
                {copy.dailyCta}
              </button>
            </article>
          </div>

          {error ? (
            <p className="mt-4 rounded-[8px] border border-rose-200/35 bg-rose-500/12 p-4 text-sm font-bold text-rose-100">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      <div ref={resultRef}>
        {loadingMode ? <LoadingPanel copy={copy} /> : null}
        {!loadingMode && result ? <MayaResultCard result={result} onCopy={copyResult} copyStatus={copyStatus} /> : null}
      </div>

      {!result && !loadingMode ? (
        <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div className="rounded-[8px] border border-white/12 bg-white/[0.06] p-5">
            <MayaCalendarWheel />
          </div>
          <div className="rounded-[8px] border border-white/12 bg-white/[0.06] p-5 text-sm leading-7 text-slate-100/82">
            <h2 className="text-xl font-black text-amber-50">{copy.infoTitle}</h2>
            <p className="mt-3">
              {copy.infoBody}
            </p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
