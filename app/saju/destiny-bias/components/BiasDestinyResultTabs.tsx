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

function ensureLong(text: string, add: string) {
  if (text.length >= 250) return text;
  return `${text} ${add}`;
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

    const summary = ensureLong(
      `${nonEmpty(vm.compatibilityReport, vm.chemistrySummary)} 이 리포트에서 가장 핵심은 ${vm.biasName}에게서 느끼는 ${vm.biasEnergyType} 결이 ${vm.userName}의 ${vm.userEnergyType} 흐름을 자극한다는 점입니다. 처음에는 설렘 중심으로 시작되지만 시간이 지날수록 관계의 템포를 조율해야 더 깊고 안정적인 연결로 이어집니다. ${nonEmpty(vm.stageAuraComment, "무대의 빛이 감정을 확장시키는 만큼 리듬을 조절하는 태도가 필요합니다.")}`,
      "이 문장은 예언이 아니라 현재의 감정 패턴을 읽어 앞으로의 선택을 더 부드럽게 만드는 안내입니다."
    );

    const attraction = ensureLong(
      `${nonEmpty(vm.biasPersonalityReport, "당신은 분명한 분위기와 감정의 밀도를 가진 대상에 강하게 끌립니다.")} 특히 ${vm.biasMood} 결의 무드가 눈에 들어올 때 감정 몰입이 빠르게 올라갑니다. ${vm.biasName}의 존재에서 읽히는 핵심은 선명한 에너지와 여백의 균형이며, 이 균형이 ${vm.userName}의 내면에서 오래된 기대와 새로운 열망을 동시에 깨웁니다.`,
      "끌림이 깊어질수록 상대를 이상화하기보다 실제 내 감정 변화를 관찰하면 덕질의 만족감이 더 길게 이어집니다."
    );

    const expectation = ensureLong(
      `${nonEmpty(vm.energyConnectionReport, vm.energyConnectionDetail)} 이 흐름은 관계에서 무엇을 바라는지 명확하게 보여줍니다. 당신은 단순한 설렘보다 마음의 안전과 성장감을 동시에 주는 상호작용을 기대하며, 응원할수록 감정의 품질이 높아지길 원합니다. ${nonEmpty(vm.fansignMessage, "기대가 커지는 시기에는 감정 표현의 온도를 낮추고 리듬을 맞추는 태도가 중요합니다.")}`,
      "기대가 충족되지 않는 순간에도 나를 지키는 기준을 세우면 감정 소모를 크게 줄일 수 있습니다."
    );

    const pattern = ensureLong(
      `${nonEmpty(vm.destinySignal, "관계의 파동이 강해질수록 감정 반응도 커지는 패턴")}. ${vm.relationMood} 모드에서 특히 반응성이 올라가며, 좋은 신호가 보이면 몰입이 급격히 높아지고 작은 불일치에는 쉽게 흔들릴 수 있습니다. 이 패턴을 부정하기보다 인식하고 조절하면 덕질과 현실의 균형이 훨씬 안정적으로 유지됩니다.`,
      "패턴을 알면 감정의 파도를 피하는 것이 아니라 타이밍을 조절해 더 오래 즐길 수 있는 루틴을 만들 수 있습니다."
    );

    const fitEnergy = ensureLong(
      `${nonEmpty(vm.biasEnergySummary, "당신과 잘 맞는 에너지는 따뜻한 공감과 선명한 방향성을 동시에 갖는 타입입니다.")} ${vm.pairingAlias} 시그널은 서로의 차이를 지우기보다 연결 포인트를 명확히 할 때 가장 강하게 작동합니다. ${vm.todayMission}처럼 작고 현실적인 행동을 쌓으면 감정의 밀도가 올라가도 안정감이 함께 유지됩니다.`,
      "잘 맞는 에너지는 즉각적인 자극보다 반복 가능한 안정감을 주며, 그 안정감이 장기적인 만족을 만들어 줍니다."
    );

    const avoidEnergy = ensureLong(
      `${nonEmpty(vm.compatibilityDetail, "과열된 기대는 관계의 해석을 좁히고 감정 회복 시간을 줄일 수 있습니다.")} 특히 결과를 빠르게 확정하려는 마음이 커질 때 현실의 작은 변수도 과하게 받아들이기 쉽습니다. 피해야 할 패턴은 나를 소모시키는 비교, 과도한 추측, 일방적 의미부여이며, 이 신호가 보이면 속도를 늦추는 것이 좋습니다.`,
      "감정을 지키는 핵심은 절제보다 복구 루틴입니다. 흔들린 뒤 다시 중심을 찾는 개인 리듬을 먼저 준비하세요."
    );

    const advice = ensureLong(
      `${nonEmpty(vm.oneLineDestinyMessage, "오늘의 팬라이트 조언은 감정의 강도보다 방향을 먼저 선택하라는 신호입니다.")} ${nonEmpty(vm.cheerPoint, "응원은 내 에너지를 채우는 방식으로 설계할수록 오래갑니다.")} 오늘은 무대의 빛처럼 분명하지만 부드러운 태도로 반응하고, 나를 지키는 경계를 유지한 채 설렘을 즐겨보세요.`,
      "작은 실행 하나를 남기면 운명 해석은 단순 문장이 아니라 실제 하루를 바꾸는 행동 가이드가 됩니다."
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
