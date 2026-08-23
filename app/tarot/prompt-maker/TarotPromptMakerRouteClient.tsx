"use client";

import dynamic from "next/dynamic";

const TAROT_PROMPT_MAKER_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"] as const;
type LoadingLocale = (typeof TAROT_PROMPT_MAKER_LOCALES)[number];

function normalizeTarotPromptMakerLocale(value?: string | null): LoadingLocale {
  const raw = String(value || "").trim();
  if (!raw) return "ko";
  const normalized = raw.replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans" || normalized === "cn") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "tw") return "zh-TW";
  const base = normalized.split("-")[0];
  return TAROT_PROMPT_MAKER_LOCALES.includes(base as LoadingLocale) ? (base as LoadingLocale) : "ko";
}

function getCurrentTarotPromptMakerLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  const runtimeLanguage = (window as typeof window & { __cdCurrentLang?: string }).__cdCurrentLang;
  if (runtimeLanguage) return normalizeTarotPromptMakerLocale(runtimeLanguage);
  try {
    const stored =
      window.localStorage.getItem("cd_locale") ||
      window.localStorage.getItem("code-destiny-locale") ||
      window.localStorage.getItem("cd_lang") ||
      window.localStorage.getItem("locale");
    if (stored) return normalizeTarotPromptMakerLocale(stored);
  } catch {}
  return normalizeTarotPromptMakerLocale(document.documentElement.lang || navigator.language);
}

const ROUTE_FALLBACK_COPY: Record<LoadingLocale, string> = {
  ko: "스프레드의 문을 여는 중입니다.",
  en: "Opening the spread…",
  ja: "スプレッドの扉を開いています…",
  "zh-CN": "正在打开牌阵之门…",
  "zh-TW": "正在開啟牌陣之門…",
  vi: "Đang mở cánh cửa trải bài…",
  hi: "स्प्रेड का द्वार खोला जा रहा है…",
  es: "Abriendo la puerta de la tirada…",
  fr: "Ouverture de la porte du tirage…",
  de: "Das Legesystem-Tor wird geöffnet…",
  nl: "De spreiddeur wordt geopend…",
  ms: "Membuka pintu susunan…",
};

function TarotRouteFallback() {
  return (
    <main className="min-h-dvh bg-[#080612] px-5 py-10 text-[#f5e8ff]" aria-busy="true">
      <p className="mx-auto mt-28 max-w-sm text-center text-sm font-bold">
        {ROUTE_FALLBACK_COPY[getCurrentTarotPromptMakerLocale()] || ROUTE_FALLBACK_COPY.ko}
      </p>
    </main>
  );
}

const TarotPromptMakerClient = dynamic(() => import("./TarotPromptMakerClient"), {
  loading: TarotRouteFallback,
});

export default function TarotPromptMakerRouteClient() {
  return <TarotPromptMakerClient />;
}
