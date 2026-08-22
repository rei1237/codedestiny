"use client";

import dynamic from "next/dynamic";

const TAROT_SELF_ESTEEM_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"] as const;
type LoadingLocale = (typeof TAROT_SELF_ESTEEM_LOCALES)[number];

function normalizeTarotSelfEsteemLocale(value?: string | null): LoadingLocale {
  const raw = String(value || "").trim();
  if (!raw) return "ko";
  const normalized = raw.replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans" || normalized === "cn") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "tw") return "zh-TW";
  const base = normalized.split("-")[0];
  return TAROT_SELF_ESTEEM_LOCALES.includes(base as LoadingLocale) ? (base as LoadingLocale) : "ko";
}

function getCurrentTarotSelfEsteemLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  const runtimeLanguage = (window as typeof window & { __cdCurrentLang?: string }).__cdCurrentLang;
  if (runtimeLanguage) return normalizeTarotSelfEsteemLocale(runtimeLanguage);
  try {
    const stored =
      window.localStorage.getItem("cd_locale") ||
      window.localStorage.getItem("code-destiny-locale") ||
      window.localStorage.getItem("cd_lang") ||
      window.localStorage.getItem("locale");
    if (stored) return normalizeTarotSelfEsteemLocale(stored);
  } catch {}
  return normalizeTarotSelfEsteemLocale(document.documentElement.lang || navigator.language);
}

const ROUTE_FALLBACK_COPY: Record<LoadingLocale, string> = {
  ko: "자존감의 카드를 여는 중입니다.",
  en: "Opening the self-esteem cards…",
  ja: "自己肯定感のカードを開いています…",
  "zh-CN": "正在打开自尊卡牌…",
  "zh-TW": "正在開啟自尊卡牌…",
  vi: "Đang mở các lá bài lòng tự trọng…",
  hi: "आत्म-सम्मान कार्ड खोले जा रहे हैं…",
  es: "Abriendo las cartas de autoestima…",
  fr: "Ouverture des cartes d'estime de soi…",
  de: "Die Selbstwertgefühl-Karten werden geöffnet…",
  nl: "De zelfwaardering-kaarten worden geopend…",
  ms: "Membuka kad harga diri…",
};

function TarotRouteFallback() {
  return (
    <main className="min-h-dvh bg-[#080612] px-5 py-10 text-[#f5e8ff]" aria-busy="true">
      <p className="mx-auto mt-28 max-w-sm text-center text-sm font-bold">
        {ROUTE_FALLBACK_COPY[getCurrentTarotSelfEsteemLocale()] || ROUTE_FALLBACK_COPY.ko}
      </p>
    </main>
  );
}

const TarotSelfEsteemLandingContent = dynamic(() => import("./TarotSelfEsteemLandingContent"), {
  loading: TarotRouteFallback,
});

export default function TarotSelfEsteemRouteClient() {
  return <TarotSelfEsteemLandingContent />;
}
