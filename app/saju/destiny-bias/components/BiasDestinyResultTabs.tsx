"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import type { DestinyBiasResultViewModel } from "../lib/types";

type Props = {
  vm: DestinyBiasResultViewModel;
};

type TabItem = {
  id: string;
  label: string;
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
    const baseKeywords = [
      ...vm.moodKeywords,
      ...vm.matchingTags,
      ...vm.connectionKeyword,
      ...vm.stageChemistryKeywords,
    ].filter(Boolean);

    const summary = compact(
      `${nonEmpty(vm.compatibilityReport, vm.chemistrySummary)} 핵심은 ${vm.biasName}의 ${vm.biasEnergyType} 결이 ${vm.userName}의 ${vm.userEnergyType} 흐름과 정확히 붙는다는 점. 설렘은 빠르게 오고, 만족은 루틴에서 길어집니다.`,
      "지금 조합은 한방보다 지속이 강한 타입이에요."
    );

    const attraction = compact(
      `${nonEmpty(vm.biasPersonalityReport, "당신은 분위기 선명한 타입에 강하게 끌려요.")} 특히 ${vm.biasMood} 톤에서 몰입 속도가 급상승. ${vm.biasName}의 매력은 자극과 안정이 동시에 오는 밸런스에 있습니다.`,
      "끌림 포인트는 비주얼 한방보다 결의 합이에요."
    );

    const expectation = compact(
      `${nonEmpty(vm.energyConnectionReport, vm.energyConnectionDetail)} 당신이 기대하는 건 단순 설렘이 아니라 안정 + 성장 동시 체감. 응원할수록 감정 퀄리티가 올라가는 구조입니다. ${nonEmpty(vm.fansignMessage, "기대가 클수록 톤은 차분하게, 리듬은 일정하게.")}`,
      "안정감이 붙을 때 덕심 만족도도 같이 오릅니다."
    );

    const pattern = compact(
      `${nonEmpty(vm.destinySignal, "파동이 강해질수록 반응도 커지는 타입")}. ${vm.relationMood} 모드에서 몰입이 빨리 오르고, 작은 이슈엔 흔들릴 수 있어요. 패턴만 알아도 과몰입 대신 리듬 조절이 가능해집니다.`,
      "핵심은 감정 억제가 아니라 타이밍 운영입니다."
    );

    const fitEnergy = compact(
      `${nonEmpty(vm.biasEnergySummary, "잘 맞는 에너지는 공감 + 방향성이 같이 있는 타입.")} ${vm.pairingAlias}는 차이를 지우기보다 연결 포인트를 선명하게 잡을수록 강해져요. ${vm.todayMission}처럼 작은 루틴이 진짜 효율입니다.`,
      "잘 맞는 조합은 자극보다 지속에서 빛나요."
    );

    const avoidEnergy = compact(
      `${nonEmpty(vm.compatibilityDetail, "기대 과열은 감정 회복력을 갉아먹어요.")} 결과를 빨리 확정하려 할수록 작은 변수도 크게 느껴집니다. 비교, 과추측, 의미 과적재 신호가 보이면 속도를 한 템포 낮추세요.`,
      "감정 보호의 핵심은 멈춤이 아니라 복구 루틴입니다."
    );

    const advice = compact(
      `${nonEmpty(vm.oneLineDestinyMessage, "오늘 조언: 감정 강도보다 방향 먼저.")} ${nonEmpty(vm.cheerPoint, "응원은 오래 가게 설계할수록 승률이 높아요.")} 오늘은 짧고 선명하게 반응하고, 내 경계는 지키면서 설렘만 챙겨가세요.`,
      "작은 실행 하나가 오늘 무드 전체를 바꿉니다."
    );

    return [
      { id: "summary", label: "최애 타입 요약", content: summary, keywords: baseKeywords.slice(0, 5), action: vm.todayMission },
      { id: "attraction", label: "내가 끌리는 매력", content: attraction, keywords: baseKeywords.slice(2, 7), action: vm.cheerPoint },
      { id: "expectation", label: "상대에게 기대하는 감정", content: expectation, keywords: baseKeywords.slice(1, 6), action: vm.fansignMessage },
      { id: "pattern", label: "덕질/연애 감정 패턴", content: pattern, keywords: baseKeywords.slice(0, 5), action: vm.destinySignal },
      { id: "fit", label: "잘 맞는 최애 에너지", content: fitEnergy, keywords: baseKeywords.slice(3, 8), action: vm.stageAuraComment },
      { id: "avoid", label: "피해야 할 관계 패턴", content: avoidEnergy, keywords: baseKeywords.slice(2, 7), action: vm.compatibilityDetail },
      { id: "advice", label: "오늘의 팬라이트 조언", content: advice, keywords: baseKeywords.slice(0, 5), action: vm.todayMission },
    ];
  }, [vm]);

  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || "summary");
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-cyan-100/85">DETAIL RESULT TABS</p>
      <article className="relative overflow-hidden rounded-[28px] border border-gradient-to-br from-white/24 via-white/10 to-white/4 bg-[linear-gradient(140deg,rgba(8,16,42,0.8),rgba(16,13,44,0.62),rgba(12,10,52,0.56))] p-4 shadow-[0_0_50px_rgba(124,58,237,0.18),0_20px_50px_rgba(2,6,28,0.46),inset_0_1px_2px_rgba(255,255,255,0.08)] backdrop-blur-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(96,165,250,0.08),transparent_40%),radial-gradient(circle_at_85%_30%,rgba(244,114,182,0.08),transparent_35%)]" aria-hidden />
        <div className="relative z-10 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold transition ${
                tab.id === activeTab.id
                  ? "border-pink-200/65 bg-pink-300/20 text-white"
                  : "border-white/18 bg-white/6 text-white/80 hover:border-cyan-200/55"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <motion.div
          key={activeTab.id}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-10 mt-4 overflow-hidden rounded-2xl border border-gradient-to-br from-white/20 via-white/10 to-white/4 bg-[linear-gradient(135deg,rgba(6,14,40,0.76),rgba(14,8,48,0.62))] p-4 shadow-[0_12px_32px_rgba(124,58,237,0.12),inset_0_1px_2px_rgba(255,255,255,0.06)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(96,165,250,0.08),transparent_50%)]" aria-hidden />
          <h3 className="relative z-10 text-lg font-black text-white">{activeTab.label}</h3>
          <div className="relative z-10 my-3 h-px bg-[linear-gradient(90deg,rgba(244,114,182,.08),rgba(96,165,250,.7),rgba(244,114,182,.08))]" aria-hidden />
          <p className="relative z-10 text-sm leading-7 text-white/90 md:text-base">{activeTab.content}</p>

          <div className="relative z-10 mt-4 flex flex-wrap gap-1.5">
            {activeTab.keywords.filter(Boolean).slice(0, 5).map((keyword) => (
              <span key={`${activeTab.id}-${keyword}`} className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2 py-0.5 text-xs font-semibold text-cyan-100/90">
                #{keyword}
              </span>
            ))}
          </div>

          <div className="relative z-10 mt-4 overflow-hidden rounded-xl border border-[#FDE68A]/45 bg-[linear-gradient(135deg,rgba(253,230,138,0.14),rgba(251,191,36,0.1))] p-3 shadow-[0_8px_24px_rgba(253,230,138,0.12),inset_0_1px_1px_rgba(255,255,255,0.08)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.06),transparent_45%)]" aria-hidden />
            <p className="relative text-[11px] font-semibold tracking-[0.14em] text-[#FDE68A]/95">✨ 실전 조언 BOX</p>
            <p className="relative mt-1 text-sm leading-7 text-white/90">{nonEmpty(activeTab.action, "감정의 속도를 한 템포 늦추고, 오늘의 작은 행동 하나를 남겨 보세요.")}</p>
          </div>
        </motion.div>
      </article>
    </section>
  );
}
