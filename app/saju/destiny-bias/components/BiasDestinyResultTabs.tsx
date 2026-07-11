"use client";

import { m, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import type { DestinyBiasResultViewModel } from "../lib/types";

type Props = {
  vm: DestinyBiasResultViewModel;
};

type TabItem = {
  id: "chemi" | "element" | "dayMaster" | "branch" | "booster";
  label: string;
  shortLabel: string;
  title: string;
  content: string;
  keywords: string[];
  action: string;
};

function nonEmpty(value: string, fallback: string) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function compact(text: string, fallback: string) {
  const normalized = nonEmpty(text, fallback);
  return normalized.length > 210 ? `${normalized.slice(0, 210).trimEnd()}...` : normalized;
}

export default function BiasDestinyResultTabs({ vm }: Props) {
  const reduceMotion = useReducedMotion();
  const tabs = useMemo<TabItem[]>(() => {
    if (Array.isArray(vm.detailedTabs) && vm.detailedTabs.length) {
      return vm.detailedTabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        shortLabel: tab.shortLabel,
        title: tab.title,
        content: compact(tab.sections.map((section) => section.text).join(" "), `${tab.label} 내용을 준비 중입니다.`),
        keywords: (tab.keywords || []).slice(0, 5),
        action: nonEmpty(tab.sections.find((section) => section.action)?.action || "", "오늘 루틴 한 가지를 가볍게 실행해 보세요."),
      }));
    }

    const baseKeywords = [...vm.moodKeywords, ...vm.matchingTags, ...vm.connectionKeyword, ...vm.stageChemistryKeywords].filter(Boolean);
    return [
      { id: "chemi", label: "한줄 케미", shortLabel: "케미", title: "한줄 케미 요약", content: compact(vm.oneLineDestinyMessage, "한줄 케미를 준비 중입니다."), keywords: baseKeywords.slice(0, 5), action: vm.chemistrySummary },
      { id: "element", label: "오행 궁합", shortLabel: "오행", title: "오행 궁합 분석", content: compact(vm.compatibilityDetail, "오행 궁합을 준비 중입니다."), keywords: baseKeywords.slice(0, 5), action: vm.cheerPoint },
      { id: "dayMaster", label: "일간 관계", shortLabel: "일간", title: "일간으로 보는 관계의 결", content: compact(vm.biasPersonalityReport, "일간 관계를 준비 중입니다."), keywords: baseKeywords.slice(0, 5), action: vm.fansignMessage },
      { id: "branch", label: "지지 케미", shortLabel: "지지", title: "지지 케미 포인트", content: compact(vm.energyConnectionDetail, "지지 케미를 준비 중입니다."), keywords: baseKeywords.slice(0, 5), action: vm.todayMission },
      { id: "booster", label: "부스터 팁", shortLabel: "부스터", title: "케미 부스터 팁", content: compact(vm.biasEnergySummary, "부스터 팁을 준비 중입니다."), keywords: baseKeywords.slice(0, 5), action: vm.todayMission },
    ];
  }, [vm]);

  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || "chemi");
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-cyan-100/85">DETAIL RESULT TABS</p>
      <article className="relative overflow-hidden rounded-[28px] border border-gradient-to-br from-white/24 via-white/10 to-white/4 bg-[linear-gradient(140deg,rgba(8,16,42,0.8),rgba(16,13,44,0.62),rgba(12,10,52,0.56))] p-4 shadow-[0_0_50px_rgba(124,58,237,0.18),0_20px_50px_rgba(2,6,28,0.46),inset_0_1px_2px_rgba(255,255,255,0.08)] backdrop-blur-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(96,165,250,0.08),transparent_40%),radial-gradient(circle_at_85%_30%,rgba(244,114,182,0.08),transparent_35%)]" aria-hidden />
        <div className="relative z-10 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`shrink-0 min-w-[72px] whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                tab.id === activeTab.id
                  ? "border-pink-200/65 bg-pink-300/20 text-white"
                  : "border-white/18 bg-white/6 text-white/80 hover:border-cyan-200/55"
              }`}
              title={tab.label}
            >
              {tab.shortLabel}
            </button>
          ))}
        </div>

        <m.div
          key={activeTab.id}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-10 mt-4 overflow-hidden rounded-2xl border border-gradient-to-br from-white/20 via-white/10 to-white/4 bg-[linear-gradient(135deg,rgba(6,14,40,0.76),rgba(14,8,48,0.62))] p-4 shadow-[0_12px_32px_rgba(124,58,237,0.12),inset_0_1px_2px_rgba(255,255,255,0.06)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(96,165,250,0.08),transparent_50%)]" aria-hidden />
          <h3 className="relative z-10 min-w-0 break-keep text-lg font-black text-white">{activeTab.title}</h3>
          <div className="relative z-10 my-3 h-px bg-[linear-gradient(90deg,rgba(244,114,182,.08),rgba(96,165,250,.7),rgba(244,114,182,.08))]" aria-hidden />
          <p className="relative z-10 min-w-0 break-keep text-sm leading-7 text-white/90 md:text-base">{activeTab.content}</p>

          <div className="relative z-10 mt-4 flex flex-wrap gap-1.5">
            {activeTab.keywords.filter(Boolean).slice(0, 5).map((keyword) => (
              <span key={`${activeTab.id}-${keyword}`} className="max-w-[120px] truncate rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2 py-0.5 text-xs font-semibold text-cyan-100/90">
                #{keyword}
              </span>
            ))}
          </div>

          <div className="relative z-10 mt-4 overflow-hidden rounded-xl border border-[#FDE68A]/45 bg-[linear-gradient(135deg,rgba(253,230,138,0.14),rgba(251,191,36,0.1))] p-3 shadow-[0_8px_24px_rgba(253,230,138,0.12),inset_0_1px_1px_rgba(255,255,255,0.08)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.06),transparent_45%)]" aria-hidden />
            <p className="relative text-[11px] font-semibold tracking-[0.14em] text-[#FDE68A]/95">✨ 실전 조언 BOX</p>
            <p className="relative mt-1 min-w-0 break-keep text-sm leading-7 text-white/90">{nonEmpty(activeTab.action, "감정의 속도를 한 템포 늦추고, 오늘의 작은 행동 하나를 남겨 보세요.")}</p>
          </div>
        </m.div>
      </article>
    </section>
  );
}
