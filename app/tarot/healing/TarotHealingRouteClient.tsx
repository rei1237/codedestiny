"use client";

import dynamic from "next/dynamic";

const TAROT_HEALING_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"] as const;
type LoadingLocale = (typeof TAROT_HEALING_LOCALES)[number];

function normalizeTarotHealingLocale(value?: string | null): LoadingLocale {
  const raw = String(value || "").trim();
  if (!raw) return "ko";
  const normalized = raw.replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans" || normalized === "cn") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "tw") return "zh-TW";
  const base = normalized.split("-")[0];
  return TAROT_HEALING_LOCALES.includes(base as LoadingLocale) ? (base as LoadingLocale) : "ko";
}

function getCurrentTarotHealingLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  const runtimeLanguage = (window as typeof window & { __cdCurrentLang?: string }).__cdCurrentLang;
  if (runtimeLanguage) return normalizeTarotHealingLocale(runtimeLanguage);
  try {
    const stored =
      window.localStorage.getItem("cd_locale") ||
      window.localStorage.getItem("code-destiny-locale") ||
      window.localStorage.getItem("cd_lang") ||
      window.localStorage.getItem("locale");
    if (stored) return normalizeTarotHealingLocale(stored);
  } catch {}
  return normalizeTarotHealingLocale(document.documentElement.lang || navigator.language);
}

const ROUTE_FALLBACK_COPY: Record<LoadingLocale, string> = {
  ko: "치유의 카드를 여는 중입니다.",
  en: "Opening the healing cards…",
  ja: "癒しのカードを開いています…",
  "zh-CN": "正在打开疗愈卡牌…",
  "zh-TW": "正在開啟療癒卡牌…",
  vi: "Đang mở các lá bài chữa lành…",
  hi: "उपचार कार्ड खोले जा रहे हैं…",
  es: "Abriendo las cartas sanadoras…",
  fr: "Ouverture des cartes de guérison…",
  de: "Die Heilungskarten werden geöffnet…",
  nl: "De helende kaarten worden geopend…",
  ms: "Membuka kad penyembuhan…",
};

function TarotRouteFallback() {
  return (
    <main className="min-h-dvh bg-[#080612] px-5 py-10 text-[#f5e8ff]" aria-busy="true">
      <p className="mx-auto mt-28 max-w-sm text-center text-sm font-bold">
        {ROUTE_FALLBACK_COPY[getCurrentTarotHealingLocale()] || ROUTE_FALLBACK_COPY.ko}
      </p>
    </main>
  );
}

const TarotHealingLandingContent = dynamic(() => import("./TarotHealingLandingContent"), {
  loading: TarotRouteFallback,
});

export default function TarotHealingRouteClient() {
  return <TarotHealingLandingContent />;
}
