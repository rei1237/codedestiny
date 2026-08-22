"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type Props = {
  scores: {
    expression: number;
    officer: number;
    wealth: number;
    resource: number;
    peer: number;
  };
};

const FPTI_TEN_GODS_TEXT_TRANSLATIONS = {
  ko: {
    title: "내 행동 패턴",
    strongest: "가장 강한 성향",
    labels: {
      expression: "표현/창조 (식상)",
      officer: "규범/책임 (관성)",
      wealth: "성과/실리 (재성)",
      resource: "학습/통찰 (인성)",
      peer: "독립/자율 (비겁)",
    },
  },
  en: {
    title: "My Behavior Pattern",
    strongest: "Strongest tendency",
    labels: {
      expression: "Expression / creation",
      officer: "Structure / responsibility",
      wealth: "Results / practicality",
      resource: "Learning / insight",
      peer: "Independence / autonomy",
    },
  },
  ja: {
    title: "私の行動パターン",
    strongest: "最も強い傾向",
    labels: {
      expression: "表現・創造（食傷）",
      officer: "規範・責任（官星）",
      wealth: "成果・実利（財星）",
      resource: "学習・洞察（印星）",
      peer: "独立・自律（比劫）",
    },
  },
  "zh-CN": {
    title: "我的行为模式",
    strongest: "最强性向",
    labels: {
      expression: "表达/创造（食伤）",
      officer: "规范/责任（官星）",
      wealth: "成果/实利（财星）",
      resource: "学习/洞察（印星）",
      peer: "独立/自主（比劫）",
    },
  },
  "zh-TW": {
    title: "我的行為模式",
    strongest: "最強性向",
    labels: {
      expression: "表達/創造（食傷）",
      officer: "規範/責任（官星）",
      wealth: "成果/實利（財星）",
      resource: "學習/洞察（印星）",
      peer: "獨立/自主（比劫）",
    },
  },
} as const;

const ITEMS = [
  { key: "expression", color: "bg-fuchsia-500" },
  { key: "officer", color: "bg-indigo-500" },
  { key: "wealth", color: "bg-amber-500" },
  { key: "resource", color: "bg-cyan-500" },
  { key: "peer", color: "bg-emerald-500" },
] as const;

function fptiTenGodsCopy(locale: LoadingLocale) {
  return FPTI_TEN_GODS_TEXT_TRANSLATIONS[locale as keyof typeof FPTI_TEN_GODS_TEXT_TRANSLATIONS] || FPTI_TEN_GODS_TEXT_TRANSLATIONS.en;
}

export default function FptiTenGodsPanel({ scores }: Props) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = fptiTenGodsCopy(locale);
  const items = useMemo(
    () => ITEMS.map((item) => ({ ...item, label: copy.labels[item.key] })),
    [copy],
  );
  const max = Math.max(...Object.values(scores), 1);
  const strongest = items.reduce((acc, cur) => (scores[cur.key] > scores[acc.key] ? cur : acc), items[0]);

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

  return (
    <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
      <h4 className="text-sm font-semibold text-slate-100">{copy.title}</h4>
      <p className="mt-1 text-xs text-slate-300">{copy.strongest}: {strongest.label}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const value = scores[item.key];
          const width = Math.max(6, Math.round((value / max) * 100));

          return (
            <div key={item.key}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                <span>{item.label}</span>
                <span>{value.toFixed(1)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
