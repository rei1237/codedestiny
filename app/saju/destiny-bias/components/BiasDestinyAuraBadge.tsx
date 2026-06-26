"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type Props = {
  auraType: string;
  auraMaterial: string;
  energyColor: string;
};

const BIAS_DESTINY_AURA_BADGE_COPY = {
  ko: {
    label: "팬라이트 오라",
  },
  en: {
    label: "Fanlight Aura",
  },
  ja: {
    label: "ペンライトオーラ",
  },
  zh: {
    label: "应援灯光环",
  },
};

function getBiasDestinyAuraBadgeCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja") return BIAS_DESTINY_AURA_BADGE_COPY[locale];
  if (locale === "zh-CN" || locale === "zh-TW") return BIAS_DESTINY_AURA_BADGE_COPY.zh;
  return BIAS_DESTINY_AURA_BADGE_COPY.ko;
}

export default function BiasDestinyAuraBadge({ auraType, auraMaterial, energyColor }: Props) {
  const color = String(energyColor || "#C4B5FD").trim() || "#C4B5FD";
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getBiasDestinyAuraBadgeCopy(locale);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white/90">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }} aria-hidden />
      <span>{copy.label}</span>
      <span className="text-[#FDE68A]">{auraType}</span>
      <span className="text-white/65">· {auraMaterial}</span>
    </div>
  );
}
