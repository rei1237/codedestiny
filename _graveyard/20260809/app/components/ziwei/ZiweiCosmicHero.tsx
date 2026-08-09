"use client";

import { useEffect, useState } from "react";
import { ZiweiDeepChart } from "@/app/_lib/ziwei-types";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface ZiweiCosmicHeroProps {
  chart: ZiweiDeepChart;
}

const ZIWEI_HERO_COPY: Record<LoadingLocale, {
  title: (name: string) => string;
  description: string;
  mingGong: string;
  shenGong: string;
  juInfo: string;
  sihuaBasis: string;
  strengthGuide: string;
  sihuaBadge: string;
  strengths: string[];
}> = {
  ko: {
    title: (name) => `${name}님의 심화 자미두수 명반`,
    description: "명궁, 신궁, 12궁 상호작용과 사화 흐름을 통합해 지금의 운행 구조를 입체적으로 탐색합니다.",
    mingGong: "명궁",
    shenGong: "신궁",
    juInfo: "오행국",
    sihuaBasis: "사화 기준",
    strengthGuide: "강약 기호 기준",
    sihuaBadge: "사화 뱃지",
    strengths: ["◎ 묘", "O 득", "▲ 리", "△ 평", "X 함·실"],
  },
  en: {
    title: (name) => `${name}'s advanced Zi Wei Dou Shu chart`,
    description: "Ming palace, body palace, the 12 palaces, and the Four Transformations are read together to reveal the current structure of movement.",
    mingGong: "Ming palace",
    shenGong: "Body palace",
    juInfo: "Five-element bureau",
    sihuaBasis: "Transformation basis",
    strengthGuide: "Strength symbols",
    sihuaBadge: "Four Transformations",
    strengths: ["◎ Temple", "O Prosperous", "▲ Advantage", "△ Stable", "X Fallen"],
  },
  ja: {
    title: (name) => `${name}様の紫微斗数・精密命盤`,
    description: "命宮、身宮、12宮の相互作用と四化の流れを重ね、今の運行構造を立体的に読み解きます。",
    mingGong: "命宮",
    shenGong: "身宮",
    juInfo: "五行局",
    sihuaBasis: "四化基準",
    strengthGuide: "星の強弱記号",
    sihuaBadge: "四化バッジ",
    strengths: ["◎ 廟", "O 得", "▲ 利", "△ 平", "X 陥・失"],
  },
  "zh-CN": {
    title: (name) => `${name}的紫微斗数精密命盘`,
    description: "综合命宫、身宫、12宫互动与四化流向，立体探索此刻的运势结构。",
    mingGong: "命宫",
    shenGong: "身宫",
    juInfo: "五行局",
    sihuaBasis: "四化基准",
    strengthGuide: "星曜强弱符号",
    sihuaBadge: "四化标记",
    strengths: ["◎ 庙", "O 得", "▲ 利", "△ 平", "X 陷·失"],
  },
  "zh-TW": {
    title: (name) => `${name}的紫微斗數精密命盤`,
    description: "綜合命宮、身宮、12宮互動與四化流向，立體探索此刻的運勢結構。",
    mingGong: "命宮",
    shenGong: "身宮",
    juInfo: "五行局",
    sihuaBasis: "四化基準",
    strengthGuide: "星曜強弱符號",
    sihuaBadge: "四化標記",
    strengths: ["◎ 廟", "O 得", "▲ 利", "△ 平", "X 陷·失"],
  },
  vi: {
    title: (name) => `Lá số Tử Vi Đẩu Số chuyên sâu của ${name}`,
    description: "Mệnh cung, Thân cung, 12 cung và dòng Tứ hóa được đọc cùng nhau để soi rõ cấu trúc vận hành hiện tại.",
    mingGong: "Mệnh cung",
    shenGong: "Thân cung",
    juInfo: "Cục ngũ hành",
    sihuaBasis: "Cơ sở Tứ hóa",
    strengthGuide: "Ký hiệu sức mạnh sao",
    sihuaBadge: "Dấu Tứ hóa",
    strengths: ["◎ Miếu", "O Đắc", "▲ Lợi", "△ Bình", "X Hãm"],
  },
  hi: {
    title: (name) => `${name} की उन्नत ज़ी वेई डोउ शू कुंडली`,
    description: "मिंग पैलेस, बॉडी पैलेस, 12 पैलेस और चार रूपांतरणों को साथ पढ़कर वर्तमान गति संरचना को स्पष्ट किया जाता है.",
    mingGong: "Ming palace",
    shenGong: "Body palace",
    juInfo: "Five-element bureau",
    sihuaBasis: "Transformation basis",
    strengthGuide: "Star strength symbols",
    sihuaBadge: "Four Transformations",
    strengths: ["◎ Temple", "O Prosperous", "▲ Advantage", "△ Stable", "X Fallen"],
  },
  es: {
    title: (name) => `Carta avanzada de Zi Wei Dou Shu de ${name}`,
    description: "El palacio Ming, el palacio del cuerpo, los 12 palacios y las Cuatro Transformaciones se leen juntos para ver la estructura actual del movimiento.",
    mingGong: "Palacio Ming",
    shenGong: "Palacio del cuerpo",
    juInfo: "Buró de cinco elementos",
    sihuaBasis: "Base de transformaciones",
    strengthGuide: "Símbolos de fuerza",
    sihuaBadge: "Cuatro Transformaciones",
    strengths: ["◎ Templo", "O Próspero", "▲ Favorable", "△ Estable", "X Caído"],
  },
  fr: {
    title: (name) => `Thème Zi Wei Dou Shu avancé de ${name}`,
    description: "Le palais Ming, le palais du corps, les 12 palais et les Quatre Transformations sont lus ensemble pour éclairer la structure actuelle du mouvement.",
    mingGong: "Palais Ming",
    shenGong: "Palais du corps",
    juInfo: "Bureau des cinq éléments",
    sihuaBasis: "Base des transformations",
    strengthGuide: "Symboles de force",
    sihuaBadge: "Quatre Transformations",
    strengths: ["◎ Temple", "O Prospère", "▲ Favorable", "△ Stable", "X Affaibli"],
  },
  de: {
    title: (name) => `${name}s erweitertes Zi-Wei-Dou-Shu-Chart`,
    description: "Ming-Palast, Körperpalast, die 12 Paläste und die Vier Transformationen werden gemeinsam gelesen, um die aktuelle Bewegungsstruktur sichtbar zu machen.",
    mingGong: "Ming-Palast",
    shenGong: "Körperpalast",
    juInfo: "Fünf-Elemente-Büro",
    sihuaBasis: "Transformationsbasis",
    strengthGuide: "Stärkesymbole",
    sihuaBadge: "Vier Transformationen",
    strengths: ["◎ Tempel", "O Stark", "▲ Vorteilhaft", "△ Stabil", "X Gefallen"],
  },
  nl: {
    title: (name) => `${name}s geavanceerde Zi Wei Dou Shu-kaart`,
    description: "Mingpaleis, lichaamspaleis, de 12 paleizen en de Vier Transformaties worden samen gelezen om de huidige bewegingsstructuur te tonen.",
    mingGong: "Mingpaleis",
    shenGong: "Lichaamspaleis",
    juInfo: "Vijf-elementenbureau",
    sihuaBasis: "Transformatiebasis",
    strengthGuide: "Sterktesymbolen",
    sihuaBadge: "Vier Transformaties",
    strengths: ["◎ Tempel", "O Sterk", "▲ Gunstig", "△ Stabiel", "X Gevallen"],
  },
  ms: {
    title: (name) => `Carta Zi Wei Dou Shu lanjutan ${name}`,
    description: "Istana Ming, istana tubuh, 12 istana dan Empat Transformasi dibaca bersama untuk menyingkap struktur gerakan semasa.",
    mingGong: "Istana Ming",
    shenGong: "Istana tubuh",
    juInfo: "Biro lima unsur",
    sihuaBasis: "Asas transformasi",
    strengthGuide: "Simbol kekuatan bintang",
    sihuaBadge: "Empat Transformasi",
    strengths: ["◎ Temple", "O Kuat", "▲ Menguntungkan", "△ Stabil", "X Lemah"],
  },
};

export default function ZiweiCosmicHero({ chart }: ZiweiCosmicHeroProps) {
  const [locale, setLocale] = useState<LoadingLocale>("ko");

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  const copy = ZIWEI_HERO_COPY[locale] || ZIWEI_HERO_COPY.ko;

  return (
    <header className="relative overflow-hidden rounded-3xl border border-cyan-200/25 bg-[#071227]/80 p-6 shadow-[0_20px_70px_rgba(2,6,23,0.65)] backdrop-blur-xl md:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />

      <p className="text-[11px] font-semibold tracking-[0.28em] text-cyan-200/90">COSMIC ZIWEI IMMERSIVE REPORT</p>
      <h1 className="mt-2 text-2xl font-black leading-tight text-slate-100 md:text-4xl">{copy.title(chart.user.name)}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200/90">
        {copy.description}
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/15 bg-[#0b1a36]/70 px-4 py-3">
          <p className="text-xs text-slate-300">{copy.mingGong}</p>
          <p className="mt-1 text-base font-black text-cyan-100">{chart.mingGong}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-[#0b1a36]/70 px-4 py-3">
          <p className="text-xs text-slate-300">{copy.shenGong}</p>
          <p className="mt-1 text-base font-black text-cyan-100">{chart.shenGong}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-[#0b1a36]/70 px-4 py-3">
          <p className="text-xs text-slate-300">{copy.juInfo}</p>
          <p className="mt-1 text-base font-black text-cyan-100">{chart.juInfo}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-[#0b1a36]/70 px-4 py-3">
          <p className="text-xs text-slate-300">{copy.sihuaBasis}</p>
          <p className="mt-1 text-base font-black text-cyan-100">{chart.yearGan}{chart.yearZhi}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/15 bg-[#0b1a36]/70 px-4 py-3">
          <p className="text-xs font-bold text-slate-300">{copy.strengthGuide}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded-full border border-emerald-300/60 bg-emerald-200/15 px-2 py-1 text-emerald-100">{copy.strengths[0]}</span>
            <span className="rounded-full border border-cyan-300/60 bg-cyan-200/15 px-2 py-1 text-cyan-100">{copy.strengths[1]}</span>
            <span className="rounded-full border border-violet-300/60 bg-violet-200/15 px-2 py-1 text-violet-100">{copy.strengths[2]}</span>
            <span className="rounded-full border border-amber-300/60 bg-amber-200/15 px-2 py-1 text-amber-100">{copy.strengths[3]}</span>
            <span className="rounded-full border border-rose-300/60 bg-rose-200/15 px-2 py-1 text-rose-100">{copy.strengths[4]}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-[#0b1a36]/70 px-4 py-3">
          <p className="text-xs font-bold text-slate-300">{copy.sihuaBadge}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
            {chart.sihua.hualu ? <span className="rounded-full border border-lime-300/50 bg-lime-200/15 px-2 py-1 text-lime-100">化祿 {chart.sihua.hualu}</span> : null}
            {chart.sihua.huaquan ? <span className="rounded-full border border-orange-300/50 bg-orange-200/15 px-2 py-1 text-orange-100">化權 {chart.sihua.huaquan}</span> : null}
            {chart.sihua.huake ? <span className="rounded-full border border-sky-300/50 bg-sky-200/15 px-2 py-1 text-sky-100">化科 {chart.sihua.huake}</span> : null}
            {chart.sihua.huaji ? <span className="rounded-full border border-rose-300/50 bg-rose-200/15 px-2 py-1 text-rose-100">化忌 {chart.sihua.huaji}</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {chart.summary.keywords.map((keyword) => (
          <span key={keyword} className="rounded-full border border-cyan-200/35 bg-cyan-200/10 px-3 py-1 text-xs text-cyan-100">
            {keyword}
          </span>
        ))}
      </div>
    </header>
  );
}
