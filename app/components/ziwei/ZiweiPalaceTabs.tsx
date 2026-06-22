"use client";

import { useEffect, useState } from "react";
import { ZIWEI_SECTIONS, ZiweiSectionId } from "@/app/_lib/ziwei-types";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface ZiweiPalaceTabsProps {
  activeSection: ZiweiSectionId;
  onChange: (section: ZiweiSectionId) => void;
}

type ZiweiTabsCopy = {
  move: string;
  titles: Record<ZiweiSectionId, string>;
};

const ZIWEI_TABS_COPY: Record<LoadingLocale, ZiweiTabsCopy> = {
  ko: {
    move: "이동",
    titles: {
      overview: "사화 자미두수 요약",
      ming: "명궁·신궁",
      siblings: "형제궁",
      spouse: "부부궁",
      children: "자녀궁",
      wealth: "재백궁",
      health: "질액궁",
      travel: "천이궁",
      friends: "교우궁",
      career: "관록궁",
      property: "전택궁",
      fortune: "복덕궁",
      parents: "부모궁",
      master: "사화·대운 전략",
    },
  },
  en: {
    move: "open",
    titles: {
      overview: "Four Transformations Summary",
      ming: "Life and Body Palace",
      siblings: "Siblings Palace",
      spouse: "Spouse Palace",
      children: "Children Palace",
      wealth: "Wealth Palace",
      health: "Health Palace",
      travel: "Travel Palace",
      friends: "Friends Palace",
      career: "Career Palace",
      property: "Property Palace",
      fortune: "Fortune Palace",
      parents: "Parents Palace",
      master: "Four Transformations and Major Luck Strategy",
    },
  },
  ja: {
    move: "へ移動",
    titles: {
      overview: "四化・紫微斗数サマリー",
      ming: "命宮・身宮",
      siblings: "兄弟宮",
      spouse: "夫妻宮",
      children: "子女宮",
      wealth: "財帛宮",
      health: "疾厄宮",
      travel: "遷移宮",
      friends: "交友宮",
      career: "官禄宮",
      property: "田宅宮",
      fortune: "福徳宮",
      parents: "父母宮",
      master: "四化・大運戦略",
    },
  },
  "zh-CN": {
    move: "打开",
    titles: {
      overview: "四化紫微斗数摘要",
      ming: "命宫·身宫",
      siblings: "兄弟宫",
      spouse: "夫妻宫",
      children: "子女宫",
      wealth: "财帛宫",
      health: "疾厄宫",
      travel: "迁移宫",
      friends: "交友宫",
      career: "官禄宫",
      property: "田宅宫",
      fortune: "福德宫",
      parents: "父母宫",
      master: "四化与大运策略",
    },
  },
  "zh-TW": {
    move: "開啟",
    titles: {
      overview: "四化紫微斗數摘要",
      ming: "命宮·身宮",
      siblings: "兄弟宮",
      spouse: "夫妻宮",
      children: "子女宮",
      wealth: "財帛宮",
      health: "疾厄宮",
      travel: "遷移宮",
      friends: "交友宮",
      career: "官祿宮",
      property: "田宅宮",
      fortune: "福德宮",
      parents: "父母宮",
      master: "四化與大運策略",
    },
  },
  vi: {
    move: "mở",
    titles: {
      overview: "Tóm tắt Tứ hóa Tử Vi",
      ming: "Cung Mệnh · Cung Thân",
      siblings: "Cung Huynh Đệ",
      spouse: "Cung Phu Thê",
      children: "Cung Tử Tức",
      wealth: "Cung Tài Bạch",
      health: "Cung Tật Ách",
      travel: "Cung Thiên Di",
      friends: "Cung Nô Bộc",
      career: "Cung Quan Lộc",
      property: "Cung Điền Trạch",
      fortune: "Cung Phúc Đức",
      parents: "Cung Phụ Mẫu",
      master: "Chiến lược Tứ hóa và Đại vận",
    },
  },
  hi: {
    move: "खोलें",
    titles: {
      overview: "चार परिवर्तन सारांश",
      ming: "जीवन और शरीर महल",
      siblings: "भाई-बहन महल",
      spouse: "जीवनसाथी महल",
      children: "संतान महल",
      wealth: "धन महल",
      health: "स्वास्थ्य महल",
      travel: "यात्रा महल",
      friends: "मित्र महल",
      career: "करियर महल",
      property: "संपत्ति महल",
      fortune: "भाग्य महल",
      parents: "माता-पिता महल",
      master: "चार परिवर्तन और प्रमुख भाग्य रणनीति",
    },
  },
  es: {
    move: "abrir",
    titles: {
      overview: "Resumen de las cuatro transformaciones",
      ming: "Palacio de vida y cuerpo",
      siblings: "Palacio de hermanos",
      spouse: "Palacio de pareja",
      children: "Palacio de hijos",
      wealth: "Palacio de riqueza",
      health: "Palacio de salud",
      travel: "Palacio de viaje",
      friends: "Palacio de amistades",
      career: "Palacio de carrera",
      property: "Palacio de propiedad",
      fortune: "Palacio de fortuna",
      parents: "Palacio de padres",
      master: "Estrategia de transformaciones y gran suerte",
    },
  },
  fr: {
    move: "ouvrir",
    titles: {
      overview: "Synthèse des quatre transformations",
      ming: "Palais de vie et de corps",
      siblings: "Palais des frères et soeurs",
      spouse: "Palais du couple",
      children: "Palais des enfants",
      wealth: "Palais des richesses",
      health: "Palais de la santé",
      travel: "Palais du déplacement",
      friends: "Palais des relations",
      career: "Palais de carrière",
      property: "Palais du foyer",
      fortune: "Palais de fortune",
      parents: "Palais des parents",
      master: "Stratégie des transformations et grande chance",
    },
  },
  de: {
    move: "öffnen",
    titles: {
      overview: "Zusammenfassung der vier Transformationen",
      ming: "Lebens- und Körperpalast",
      siblings: "Geschwisterpalast",
      spouse: "Partnerpalast",
      children: "Kinderpalast",
      wealth: "Vermögenspalast",
      health: "Gesundheitspalast",
      travel: "Reisepalast",
      friends: "Freundschaftspalast",
      career: "Karrierepalast",
      property: "Besitzpalast",
      fortune: "Glückspalast",
      parents: "Elternpalast",
      master: "Strategie der Transformationen und großen Luck",
    },
  },
  nl: {
    move: "openen",
    titles: {
      overview: "Samenvatting van de vier transformaties",
      ming: "Levens- en lichaamspaleis",
      siblings: "Paleis van broers en zussen",
      spouse: "Partnerpaleis",
      children: "Kinderpaleis",
      wealth: "Welvaartspaleis",
      health: "Gezondheidspaleis",
      travel: "Reispaleis",
      friends: "Vriendenpaleis",
      career: "Loopbaanpaleis",
      property: "Woningpaleis",
      fortune: "Fortuinpaleis",
      parents: "Ouderpaleis",
      master: "Strategie van transformaties en grote luck",
    },
  },
  ms: {
    move: "buka",
    titles: {
      overview: "Ringkasan Empat Transformasi",
      ming: "Istana Hidup dan Tubuh",
      siblings: "Istana Adik-beradik",
      spouse: "Istana Pasangan",
      children: "Istana Anak",
      wealth: "Istana Kekayaan",
      health: "Istana Kesihatan",
      travel: "Istana Perjalanan",
      friends: "Istana Sahabat",
      career: "Istana Kerjaya",
      property: "Istana Harta",
      fortune: "Istana Tuah",
      parents: "Istana Ibu Bapa",
      master: "Strategi Empat Transformasi dan Nasib Besar",
    },
  },
};

export default function ZiweiPalaceTabs({ activeSection, onChange }: ZiweiPalaceTabsProps) {
  const [locale, setLocale] = useState<LoadingLocale>("ko");

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  const copy = ZIWEI_TABS_COPY[locale] || ZIWEI_TABS_COPY.ko;

  return (
    <nav className="flex gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ZIWEI_SECTIONS.map((section) => {
        const active = activeSection === section.id;
        const title = copy.titles[section.id] || section.title;

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition ${
              active
                ? "border-cyan-300/80 bg-cyan-200/15 text-cyan-100 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
                : "border-white/10 bg-[#0d1831]/70 text-slate-300 hover:border-cyan-200/40 hover:bg-[#112042]"
            }`}
            aria-label={`${title} ${copy.move}`}
          >
            {title}
          </button>
        );
      })}
    </nav>
  );
}
