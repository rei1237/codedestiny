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

const HEALING_LOADING_COPY: Record<LoadingLocale, string> = {
  ko: "따뜻한 태양 타로 화면을 불러오는 중…",
  en: "Loading the warm sun tarot screen…",
  ja: "あたたかな太陽タロット画面を読み込んでいます…",
  "zh-CN": "正在载入温暖的太阳塔罗画面…",
  "zh-TW": "正在載入溫暖的太陽塔羅畫面…",
  vi: "Đang tải màn hình tarot mặt trời ấm áp…",
  hi: "गर्म सूर्य टैरो स्क्रीन लोड हो रही है…",
  es: "Cargando la pantalla cálida del tarot solar…",
  fr: "Chargement de l'écran chaleureux du tarot solaire…",
  de: "Der warme Sonnen-Tarot-Bildschirm wird geladen…",
  nl: "Het warme zonnetarot-scherm wordt geladen…",
  ms: "Memuatkan skrin tarot matahari yang hangat…",
};

const SunHealingTarot = dynamic(() => import("../../components/SunHealingTarot"), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-amber-50 via-orange-50/80 to-amber-100/90 text-[15px] font-medium text-orange-950/75"
      role="status"
      aria-live="polite"
    >
      {HEALING_LOADING_COPY[getCurrentTarotHealingLocale()] || HEALING_LOADING_COPY.ko}
    </div>
  ),
});

export default function TarotHealingClient() {
  return <SunHealingTarot />;
}
