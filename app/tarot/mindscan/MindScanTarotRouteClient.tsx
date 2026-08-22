"use client";

import dynamic from "next/dynamic";

const MIND_SCAN_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW"] as const;
type MindScanLocale = (typeof MIND_SCAN_LOCALES)[number];

function normalizeMindScanLocale(value?: string | null): MindScanLocale {
  const raw = String(value || "").trim();
  if (!raw) return "ko";
  const normalized = raw.replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans" || normalized === "cn") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "tw") return "zh-TW";
  const base = normalized.split("-")[0];
  return (MIND_SCAN_LOCALES as readonly string[]).includes(base) ? (base as MindScanLocale) : "ko";
}

function getCurrentMindScanLocale(): MindScanLocale {
  if (typeof window === "undefined") return "ko";
  const runtimeLanguage = (window as typeof window & { __cdCurrentLang?: string }).__cdCurrentLang;
  if (runtimeLanguage) return normalizeMindScanLocale(runtimeLanguage);
  try {
    const stored =
      window.localStorage.getItem("cd_locale") ||
      window.localStorage.getItem("code-destiny-locale") ||
      window.localStorage.getItem("cd_lang") ||
      window.localStorage.getItem("locale");
    if (stored) return normalizeMindScanLocale(stored);
  } catch {}
  return normalizeMindScanLocale(document.documentElement.lang || navigator.language);
}

const ROUTE_FALLBACK_COPY: Partial<Record<MindScanLocale, string>> = {
  ko: "마음의 카드를 여는 중입니다.",
  en: "Opening your mind-scan cards...",
  ja: "マインドスキャンのカードを開いています...",
  "zh-CN": "正在打开心灵扫描卡牌...",
  "zh-TW": "正在開啟心靈掃描卡牌...",
};

function TarotRouteFallback() {
  return (
    <main className="min-h-dvh bg-[#080612] px-5 py-10 text-[#f5e8ff]" aria-busy="true">
      <p className="mx-auto mt-28 max-w-sm text-center text-sm font-bold">
        {ROUTE_FALLBACK_COPY[getCurrentMindScanLocale()] || ROUTE_FALLBACK_COPY.en}
      </p>
    </main>
  );
}

const MindScanTarot = dynamic(() => import("../../components/MindScanTarot"), {
  loading: TarotRouteFallback,
});

export default function MindScanTarotRouteClient() {
  return <MindScanTarot />;
}
