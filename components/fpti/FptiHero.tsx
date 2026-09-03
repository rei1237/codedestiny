"use client";

import { m, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import styles from "./FptiCosmic.module.css";

type Props = {
  onStart: () => void;
};

const ELEMENTS = [
  { label: "木", className: "border-emerald-300/55 bg-emerald-500/10 text-emerald-100" },
  { label: "火", className: "border-rose-300/55 bg-rose-500/10 text-rose-100" },
  { label: "土", className: "border-amber-300/55 bg-amber-500/10 text-amber-100" },
  { label: "金", className: "border-slate-300/55 bg-slate-300/10 text-slate-100" },
  { label: "水", className: "border-sky-300/55 bg-sky-500/10 text-sky-100" },
];

const FPTI_HERO_COPY = {
  ko: {
    homeAriaLabel: "홈으로 가기",
    homeLabel: "홈으로",
    badge: "COSMIC PERSONALITY OBSERVATORY",
    title: "별자리 성향 연구소 FPTI",
    subtitle: "은하 관측소에서 해석하는 당신의 운명 성향 코드",
    description: "입력된 출생 정보를 바탕으로 성향 코드의 흐름을 정교하게 읽어, 단순 성격 테스트가 아닌 프리미엄 운명 성향 리포트 톤으로 결과를 제공합니다. 분석이 완료되면 결과 화면에서 챕터별 해석과 실전 조언을 바로 확인할 수 있습니다.",
    startButton: "성향 코드 관측 시작",
    autoFlowLabel: "AUTO FLOW",
    autoFlowTitle: "별자리 성향 자동 관측",
    autoFlowDesc: "입력값이 바뀌면 흐름을 다시 해석해 결과 단계까지 자동 연결됩니다.",
    steps: ["1. 출생 정보 스캔", "2. 성향 코드 해석", "3. 챕터 리포트 구성", "4. 결과 화면 전환"],
    pillars: [["년주", "자동"], ["월주", "자동"], ["일주", "자동"], ["시주", "자동"]] as [string, string][],
  },
  en: {
    homeAriaLabel: "Go home",
    homeLabel: "Home",
    badge: "COSMIC PERSONALITY OBSERVATORY",
    title: "Constellation Temperament Lab FPTI",
    subtitle: "Your destiny temperament code, interpreted from a galactic observatory",
    description: "Based on your birth details, this precisely reads the flow of your temperament code and delivers results in the tone of a premium destiny temperament report, not a simple personality quiz. Once analysis is complete, you can check chapter-by-chapter interpretation and practical advice right on the result screen.",
    startButton: "Start Observing My Temperament Code",
    autoFlowLabel: "AUTO FLOW",
    autoFlowTitle: "Automatic Constellation Temperament Observation",
    autoFlowDesc: "When your input changes, the flow is reinterpreted and automatically carried through to the result step.",
    steps: ["1. Scan birth details", "2. Interpret temperament code", "3. Build chapter report", "4. Move to result screen"],
    pillars: [["Year", "Auto"], ["Month", "Auto"], ["Day", "Auto"], ["Hour", "Auto"]] as [string, string][],
  },
  ja: {
    homeAriaLabel: "ホームへ戻る",
    homeLabel: "ホームへ",
    badge: "COSMIC PERSONALITY OBSERVATORY",
    title: "星座性向研究所FPTI",
    subtitle: "銀河観測所が解釈するあなたの運命性向コード",
    description: "入力された出生情報をもとに性向コードの流れを精密に読み取り、単なる性格診断ではなくプレミアム運命性向レポートのトーンで結果を提供します。分析が完了すると、結果画面で章ごとの解釈と実践的なアドバイスをすぐに確認できます。",
    startButton: "性向コード観測を始める",
    autoFlowLabel: "AUTO FLOW",
    autoFlowTitle: "星座性向の自動観測",
    autoFlowDesc: "入力値が変わると流れを再解釈し、結果ステップまで自動でつながります。",
    steps: ["1. 出生情報をスキャン", "2. 性向コードを解釈", "3. 章別レポートを構成", "4. 結果画面へ移動"],
    pillars: [["年柱", "自動"], ["月柱", "自動"], ["日柱", "自動"], ["時柱", "自動"]] as [string, string][],
  },
  zh: {
    homeAriaLabel: "返回首页",
    homeLabel: "首页",
    badge: "COSMIC PERSONALITY OBSERVATORY",
    title: "星座性向研究所 FPTI",
    subtitle: "银河观测站解读的你的命运性向代码",
    description: "基于你输入的出生信息，精准解读性向代码的流转，以高级命运性向报告的口吻呈现结果，而非简单的性格测试。分析完成后，可在结果页面立即查看各章节解读与实践建议。",
    startButton: "开始观测性向代码",
    autoFlowLabel: "AUTO FLOW",
    autoFlowTitle: "星座性向自动观测",
    autoFlowDesc: "输入值改变时会重新解读流转，并自动衔接到结果步骤。",
    steps: ["1. 扫描出生信息", "2. 解读性向代码", "3. 构建章节报告", "4. 切换到结果画面"],
    pillars: [["年柱", "自动"], ["月柱", "自动"], ["日柱", "自动"], ["时柱", "自动"]] as [string, string][],
  },
};

function getFptiHeroCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja") return FPTI_HERO_COPY[locale];
  if (locale === "zh-CN" || locale === "zh-TW") return FPTI_HERO_COPY.zh;
  return FPTI_HERO_COPY.ko;
}

export default function FptiHero({ onStart }: Props) {
  const reducedMotion = useReducedMotion();
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getFptiHeroCopy(locale);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
    };
  }, []);

  return (
    <section className={`${styles.glassPanelStrong} relative isolate overflow-hidden rounded-[32px] p-6 text-slate-50 md:p-10`}>
      <div className={`${styles.starLayerSoft} absolute inset-0`} aria-hidden />
      <div className={`${styles.auroraLine} absolute left-0 top-0 h-[2px] w-full`} aria-hidden />

      <Link
        href="/"
        className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur transition-all duration-200 hover:bg-white/10 hover:text-white"
        aria-label={copy.homeAriaLabel}
      >
        <span>🏠</span> {copy.homeLabel}
      </Link>

      <m.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-end"
      >
        <div>
          <p className={`${styles.autoBadge} inline-flex rounded-full px-3 py-1 text-[11px] tracking-[0.22em] text-[#efe5ff]`}>
            {copy.badge}
          </p>
          <h1
            className={`${styles.heroTitle} mt-4 text-4xl leading-[1.02] text-[#f8fbff] md:text-6xl`}
          >
            {copy.title}
          </h1>
          <p className="mt-4 text-base text-[#d8d5ff] md:text-lg">{copy.subtitle}</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#CBD5E1] md:text-[15px]">
            {copy.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onStart}
              className={`${styles.ctaButton} rounded-full px-5 py-3 text-sm font-semibold`}
            >
              {copy.startButton}
            </button>
          </div>

          <div className="mt-6 grid max-w-xl grid-cols-5 gap-2 text-center text-sm">
            {ELEMENTS.map((item, idx) => (
              <m.div
                key={item.label}
                animate={reducedMotion ? { opacity: 1 } : { y: [0, -4, 0], opacity: [0.82, 1, 0.82] }}
                transition={reducedMotion ? { duration: 0 } : { duration: 3.2, repeat: Infinity, delay: idx * 0.18 }}
                className={`rounded-xl border py-2 backdrop-blur ${item.className}`}
              >
                {item.label}
              </m.div>
            ))}
          </div>
        </div>

        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
          transition={{ delay: 0.15, duration: 0.45, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
          className={`${styles.glassPanel} rounded-[28px] p-5`}
        >
          <p className="text-[11px] tracking-[0.2em] text-[#bfdbfe]">{copy.autoFlowLabel}</p>
          <p className="mt-2 text-2xl font-semibold text-[#f5ebff]">{copy.autoFlowTitle}</p>
          <p className="mt-1 text-sm text-[#d4dcff]">{copy.autoFlowDesc}</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#f8fafc]">
            {copy.steps.map((step) => (
              <div key={step} className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">{step}</div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px] text-[#CBD5E1]">
            {copy.pillars.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/15 bg-black/25 p-2">
                <p>{label}</p>
                <p className="mt-1 text-sm font-semibold text-[#F6D365]">{value}</p>
              </div>
            ))}
          </div>
        </m.div>
      </m.div>
    </section>
  );
}
