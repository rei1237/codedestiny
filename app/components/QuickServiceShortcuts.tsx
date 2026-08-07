"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FeatureSymbol from "./icons/FeatureSymbol";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

const shortcutHrefs = [
  "/astrology/cosmic",
  "/ziwei/chart",
  "/oracle/rune",
  "/insights",
  "/points",
] as const;

const QUICK_SHORTCUT_COPY: Record<LoadingLocale, {
  title: string;
  description: string;
  labels: Record<(typeof shortcutHrefs)[number], string>;
}> = {
  ko: {
    title: "빠른 서비스 바로가기",
    description: "자주 찾는 운세 서비스를 빠르게 시작하세요.",
    labels: { "/astrology/cosmic": "점성술", "/ziwei/chart": "자미두수", "/oracle/rune": "오라클", "/insights": "인사이트", "/points": "결제" },
  },
  en: {
    title: "Quick Service Shortcuts",
    description: "Start your frequently used readings faster.",
    labels: { "/astrology/cosmic": "Astrology", "/ziwei/chart": "Zi Wei", "/oracle/rune": "Oracle", "/insights": "Insights", "/points": "Payments" },
  },
  ja: {
    title: "クイックサービス",
    description: "よく使う占いサービスをすぐに始められます。",
    labels: { "/astrology/cosmic": "占星術", "/ziwei/chart": "紫微斗数", "/oracle/rune": "オラクル", "/insights": "インサイト", "/points": "決済" },
  },
  "zh-CN": {
    title: "快速服务入口",
    description: "快速开始常用的占卜服务。",
    labels: { "/astrology/cosmic": "占星", "/ziwei/chart": "紫微斗数", "/oracle/rune": "神谕", "/insights": "洞察", "/points": "支付" },
  },
  "zh-TW": {
    title: "快速服務入口",
    description: "快速開始常用的占卜服務。",
    labels: { "/astrology/cosmic": "占星", "/ziwei/chart": "紫微斗數", "/oracle/rune": "神諭", "/insights": "洞察", "/points": "付款" },
  },
  vi: {
    title: "Lối tắt dịch vụ",
    description: "Mở nhanh những dịch vụ luận vận thường dùng.",
    labels: { "/astrology/cosmic": "Chiêm tinh", "/ziwei/chart": "Tử Vi", "/oracle/rune": "Oracle", "/insights": "Góc nhìn", "/points": "Thanh toán" },
  },
  hi: {
    title: "त्वरित सेवा शॉर्टकट",
    description: "अक्सर उपयोग की जाने वाली रीडिंग जल्दी शुरू करें.",
    labels: { "/astrology/cosmic": "ज्योतिष", "/ziwei/chart": "Zi Wei", "/oracle/rune": "Oracle", "/insights": "इनसाइट", "/points": "भुगतान" },
  },
  es: {
    title: "Atajos de servicio",
    description: "Inicia rápidamente tus lecturas frecuentes.",
    labels: { "/astrology/cosmic": "Astrología", "/ziwei/chart": "Zi Wei", "/oracle/rune": "Oráculo", "/insights": "Insights", "/points": "Pagos" },
  },
  fr: {
    title: "Raccourcis de service",
    description: "Lancez rapidement vos lectures fréquentes.",
    labels: { "/astrology/cosmic": "Astrologie", "/ziwei/chart": "Zi Wei", "/oracle/rune": "Oracle", "/insights": "Insights", "/points": "Paiements" },
  },
  de: {
    title: "Schnellzugriff",
    description: "Starte häufig genutzte Deutungen schneller.",
    labels: { "/astrology/cosmic": "Astrologie", "/ziwei/chart": "Zi Wei", "/oracle/rune": "Orakel", "/insights": "Insights", "/points": "Zahlungen" },
  },
  nl: {
    title: "Snelle servicekoppelingen",
    description: "Start je vaak gebruikte lezingen sneller.",
    labels: { "/astrology/cosmic": "Astrologie", "/ziwei/chart": "Zi Wei", "/oracle/rune": "Orakel", "/insights": "Inzichten", "/points": "Betalingen" },
  },
  ms: {
    title: "Pintasan servis",
    description: "Mulakan bacaan yang kerap digunakan dengan lebih pantas.",
    labels: { "/astrology/cosmic": "Astrologi", "/ziwei/chart": "Zi Wei", "/oracle/rune": "Oracle", "/insights": "Wawasan", "/points": "Bayaran" },
  },
};

export default function QuickServiceShortcuts() {
  const [locale, setLocale] = useState<LoadingLocale>("ko");

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  const copy = QUICK_SHORTCUT_COPY[locale] || QUICK_SHORTCUT_COPY.ko;

  return (
    <section className="rounded-[22px] border border-violet-300/30 bg-[linear-gradient(145deg,rgba(32,17,69,0.93),rgba(43,24,88,0.86))] p-4 shadow-[0_18px_36px_rgba(30,14,66,0.28)]">
      <h2 className="text-base font-extrabold text-violet-50">{copy.title}</h2>
      <p className="mt-1 text-sm text-violet-100/75">{copy.description}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {shortcutHrefs.map((href) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-200/25 bg-[rgba(18,10,41,0.72)] px-3 py-3 text-xs font-semibold text-violet-50 transition hover:border-violet-200/55 hover:bg-[rgba(69,42,126,0.55)]"
          >
            <FeatureSymbol route={href} size={16} className="text-violet-100" variant="soft" />
            <span>{copy.labels[href]}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
