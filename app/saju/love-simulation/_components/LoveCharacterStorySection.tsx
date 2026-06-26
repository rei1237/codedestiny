"use client";

import React, { useMemo, useState } from "react";
import type { LoveCharacter } from "../_data/loveCodeMvp";
import { getLoveCharacterStory } from "../_data/loveCharacterStories";

const LOVE_CHARACTER_STORY_TEXT_TRANSLATIONS = {
  ko: {
    "loveCharacterStory.001": "Character Story",
    "loveCharacterStory.002": "Love Mission",
    "loveCharacterStory.003": "캐릭터 스토리 탭",
    "loveCharacterStory.004": "세계관",
    "loveCharacterStory.005": "연애 성향",
    "loveCharacterStory.006": "엔딩 루트",
    "loveCharacterStory.007": "미션",
    "loveCharacterStory.008": "캐릭터 한 줄 소개",
    "loveCharacterStory.009": "세계관 속 포지션",
    "loveCharacterStory.010": "첫 등장 장면",
    "loveCharacterStory.011": "외형과 분위기",
    "loveCharacterStory.012": "말투와 대사 샘플",
    "loveCharacterStory.013": "사랑을 시작하는 방식",
    "loveCharacterStory.014": "좋아하는 사람 앞에서 보이는 행동",
    "loveCharacterStory.015": "상대에게 끌리는 포인트",
    "loveCharacterStory.016": "연애에서 반복되는 약점",
    "loveCharacterStory.017": "숨겨진 결핍",
    "loveCharacterStory.018": "질투/불안/거리두기 패턴",
    "loveCharacterStory.019": "고백 루트",
    "loveCharacterStory.020": "연애 초반 루트",
    "loveCharacterStory.021": "장기 연애 루트",
    "loveCharacterStory.022": "갈등 이벤트",
    "loveCharacterStory.023": "화해 이벤트",
    "loveCharacterStory.024": "해피엔딩 루트",
    "loveCharacterStory.025": "배드엔딩 루트",
    "loveCharacterStory.026": "성장 엔딩 루트",
    "loveCharacterStory.027": "사용자를 향한 캐릭터 메시지",
    "loveCharacterStory.028": "오늘의 러브 미션",
  },
} as const;

function loveCharacterStoryText(key: keyof typeof LOVE_CHARACTER_STORY_TEXT_TRANSLATIONS.ko) {
  return LOVE_CHARACTER_STORY_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
type StoryTab = "novel" | "love" | "routes" | "mission";

const STORY_TABS: Array<{ id: StoryTab; label: string }> = [
  { id: "novel", label: loveCharacterStoryText("loveCharacterStory.004") },
  { id: "love", label: loveCharacterStoryText("loveCharacterStory.005") },
  { id: "routes", label: loveCharacterStoryText("loveCharacterStory.006") },
  { id: "mission", label: loveCharacterStoryText("loveCharacterStory.007") },
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
      { title: loveCharacterStoryText("loveCharacterStory.008"), body: story.summary },
      { title: loveCharacterStoryText("loveCharacterStory.009"), body: story.worldRole },
      { title: loveCharacterStoryText("loveCharacterStory.010"), body: story.firstScene },
      { title: loveCharacterStoryText("loveCharacterStory.011"), body: story.appearance },
      { title: loveCharacterStoryText("loveCharacterStory.012"), body: `${story.speech.tone} ${story.speech.samples.join(" ")}` },
    ],
    love: [
      { title: loveCharacterStoryText("loveCharacterStory.013"), body: story.loveStyle.start },
      { title: loveCharacterStoryText("loveCharacterStory.014"), body: story.loveStyle.crushBehavior },
      { title: loveCharacterStoryText("loveCharacterStory.015"), body: story.loveStyle.attractionPoint },
      { title: loveCharacterStoryText("loveCharacterStory.016"), body: story.loveStyle.weakness },
      { title: loveCharacterStoryText("loveCharacterStory.017"), body: story.loveStyle.hiddenLack },
      { title: loveCharacterStoryText("loveCharacterStory.018"), body: story.loveStyle.distancePattern },
    ],
    routes: [
      { title: loveCharacterStoryText("loveCharacterStory.019"), body: story.routes.confession },
      { title: loveCharacterStoryText("loveCharacterStory.020"), body: story.routes.earlyLove },
      { title: loveCharacterStoryText("loveCharacterStory.021"), body: story.routes.longTerm },
      { title: loveCharacterStoryText("loveCharacterStory.022"), body: story.routes.conflict },
      { title: loveCharacterStoryText("loveCharacterStory.023"), body: story.routes.reconciliation },
      { title: loveCharacterStoryText("loveCharacterStory.024"), body: story.routes.happyEnding },
      { title: loveCharacterStoryText("loveCharacterStory.025"), body: story.routes.badEnding },
      { title: loveCharacterStoryText("loveCharacterStory.026"), body: story.routes.growthEnding },
    ],
    mission: [
      { title: loveCharacterStoryText("loveCharacterStory.027"), body: story.userMessage },
      { title: loveCharacterStoryText("loveCharacterStory.028"), body: story.mission },
    ],
  };

  return (
    <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-pink-100/18 bg-[radial-gradient(circle_at_top_left,rgba(251,207,232,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(0,0,0,0.24))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.2em] ${character.palette.accent}`}>{loveCharacterStoryText("loveCharacterStory.001")}</p>
          <h3 className="mt-2 text-2xl font-black text-white">{story.alias}</h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-white/72">{story.summary}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left sm:max-w-[220px]">
          <p className="text-xs font-black text-white/42">{loveCharacterStoryText("loveCharacterStory.002")}</p>
          <p className="mt-2 text-sm font-bold leading-6 text-rose-50/82">{story.mission}</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={`${character.name} ${loveCharacterStoryText("loveCharacterStory.003")}`}>
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
