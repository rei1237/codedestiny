"use client";

import { useMemo, useState } from "react";
import type { TwelveGrowthAnimalResult } from "../lib/types";
import { buildTwelveAnimalSections } from "../lib/twelveGrowthAnimalResults";

type Props = {
  result: TwelveGrowthAnimalResult;
};

const SECTION_HINT: Record<string, { badge: string; guide: string }> = {
  core: {
    badge: "첫인상",
    guide: "이 동물이 어떤 운성의 얼굴을 하고 있는지 먼저 읽어보세요.",
  },
  strengthWeakness: {
    badge: "재능 사용법",
    guide: "강점은 키우고, 약점은 다루는 방식까지 함께 확인하세요.",
  },
  loveRelations: {
    badge: "관계 온도",
    guide: "끌림, 거리감, 오해가 생기는 지점을 부드럽게 살펴보세요.",
  },
  workMoney: {
    badge: "현실 운용",
    guide: "일과 돈은 재능보다 반복 가능한 구조를 찾는 쪽이 중요합니다.",
  },
  lifePattern: {
    badge: "반복 지도",
    guide: "자주 되풀이되는 장면은 운이 막힌 곳이 아니라 실력이 자라는 곳입니다.",
  },
  misunderstanding: {
    badge: "오해 방지",
    guide: "내 의도와 다르게 읽히기 쉬운 태도를 미리 알아두면 관계가 편해집니다.",
  },
  stress: {
    badge: "회복 신호",
    guide: "스트레스는 성격 문제가 아니라 리듬이 흐트러졌다는 알림입니다.",
  },
  today: {
    badge: "오늘 운",
    guide: "큰 결심보다 바로 할 수 있는 작은 행동 하나가 운을 엽니다.",
  },
  compatible: {
    badge: "궁합 리듬",
    guide: "잘 맞는 운성은 시너지를, 조심할 운성은 조율 포인트를 알려줍니다.",
  },
  mission: {
    badge: "성장 주문",
    guide: "이번 주에는 한 가지 미션만 골라 반복하면 변화가 선명해집니다.",
  },
};

export default function TwelveAnimalTabs({ result }: Props) {
  const sections = useMemo(() => buildTwelveAnimalSections(result), [result]);
  const [active, setActive] = useState(sections[0]?.key || "core");
  const current = sections.find((item) => item.key === active) || sections[0];
  const hint = SECTION_HINT[current.key] || SECTION_HINT.core;

  return (
    <section className="min-w-0 rounded-[1.9rem] border border-[#bad6ed] bg-white/88 p-4 shadow-[0_14px_34px_rgba(56,108,153,0.13)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#27537a]">상세 결과</h3>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-[#5b7d9a]">
            {result.animalName}의 운성 흐름을 성격, 관계, 일, 회복, 궁합까지 나누어 읽습니다.
          </p>
        </div>
        <span className="rounded-full border border-[#c8dff1] bg-[#f4faff] px-3 py-1 text-xs font-black text-[#4b789c]">
          {sections.length}개 해석
        </span>
      </div>
      <div className="mt-4 flex snap-x gap-2 overflow-x-auto pb-2">
        {sections.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`min-h-[44px] shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-black transition ${active === tab.key ? "border-[#4f93c4] bg-[#e9f6ff] text-[#24577f]" : "border-[#c8dff1] bg-white text-[#547a9b] hover:bg-[#f4faff]"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <article className="mt-4 rounded-2xl border border-[#c8def0] bg-[linear-gradient(160deg,#fbfeff_0%,#f5faff_100%)] p-4">
        <div className="mb-3 rounded-2xl border border-[#d6e5f1] bg-white/78 p-3">
          <p className="text-[11px] font-black text-[#4b789c]">{hint.badge}</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-[#537693]">{hint.guide}</p>
        </div>
        <h4 className="text-base font-black text-[#2b5a80]">{current.label}</h4>
        <p className="mt-3 whitespace-pre-line text-sm leading-[1.85] text-[#335f82]">{current.content}</p>
      </article>
    </section>
  );
}
