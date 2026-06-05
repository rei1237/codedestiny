"use client";

import React, { useMemo, useState } from "react";
import type { LoveCharacter } from "../_data/loveCodeMvp";
import { getLoveCharacterStory } from "../_data/loveCharacterStories";

type StoryTab = "novel" | "love" | "routes" | "mission";

const STORY_TABS: Array<{ id: StoryTab; label: string }> = [
  { id: "novel", label: "세계관" },
  { id: "love", label: "연애 성향" },
  { id: "routes", label: "엔딩 루트" },
  { id: "mission", label: "미션" },
];

type StoryPanel = {
  title: string;
  body: string;
};

function StoryAccordion({ panels }: { panels: StoryPanel[] }) {
  return (
    <div className="grid gap-3">
      {panels.map((panel, index) => (
        <details key={panel.title} className="group rounded-2xl border border-white/10 bg-black/22 p-4 backdrop-blur-sm" open={index === 0}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-left text-sm font-black text-white">
            <span>{panel.title}</span>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-lg leading-none text-white/70 transition group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 text-sm font-medium leading-7 text-white/72">{panel.body}</p>
        </details>
      ))}
    </div>
  );
}

export default function LoveCharacterStorySection({ character }: { character: LoveCharacter }) {
  const [activeTab, setActiveTab] = useState<StoryTab>("novel");
  const story = useMemo(() => getLoveCharacterStory(character.id), [character.id]);

  const panelsByTab: Record<StoryTab, StoryPanel[]> = {
    novel: [
      { title: "캐릭터 한 줄 소개", body: story.summary },
      { title: "세계관 속 포지션", body: story.worldRole },
      { title: "첫 등장 장면", body: story.firstScene },
      { title: "외형과 분위기", body: story.appearance },
      { title: "말투와 대사 샘플", body: `${story.speech.tone} ${story.speech.samples.join(" ")}` },
    ],
    love: [
      { title: "사랑을 시작하는 방식", body: story.loveStyle.start },
      { title: "좋아하는 사람 앞에서 보이는 행동", body: story.loveStyle.crushBehavior },
      { title: "상대에게 끌리는 포인트", body: story.loveStyle.attractionPoint },
      { title: "연애에서 반복되는 약점", body: story.loveStyle.weakness },
      { title: "숨겨진 결핍", body: story.loveStyle.hiddenLack },
      { title: "질투/불안/거리두기 패턴", body: story.loveStyle.distancePattern },
    ],
    routes: [
      { title: "고백 루트", body: story.routes.confession },
      { title: "연애 초반 루트", body: story.routes.earlyLove },
      { title: "장기 연애 루트", body: story.routes.longTerm },
      { title: "갈등 이벤트", body: story.routes.conflict },
      { title: "화해 이벤트", body: story.routes.reconciliation },
      { title: "해피엔딩 루트", body: story.routes.happyEnding },
      { title: "배드엔딩 루트", body: story.routes.badEnding },
      { title: "성장 엔딩 루트", body: story.routes.growthEnding },
    ],
    mission: [
      { title: "사용자를 향한 캐릭터 메시지", body: story.userMessage },
      { title: "오늘의 러브 미션", body: story.mission },
    ],
  };

  return (
    <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-pink-100/18 bg-[radial-gradient(circle_at_top_left,rgba(251,207,232,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(0,0,0,0.24))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.2em] ${character.palette.accent}`}>Character Story</p>
          <h3 className="mt-2 text-2xl font-black text-white">{story.alias}</h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-white/72">{story.summary}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left sm:max-w-[220px]">
          <p className="text-xs font-black text-white/42">Love Mission</p>
          <p className="mt-2 text-sm font-bold leading-6 text-rose-50/82">{story.mission}</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={`${character.name} 캐릭터 스토리 탭`}>
        {STORY_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-black transition ${
                isActive ? `border-transparent bg-gradient-to-r text-zinc-950 shadow-lg ${character.palette.button}` : "border-white/10 bg-white/8 text-white/66 hover:bg-white/14"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4" role="tabpanel">
        <StoryAccordion panels={panelsByTab[activeTab]} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {story.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black text-white/62">
            #{tag}
          </span>
        ))}
      </div>
    </section>
  );
}
