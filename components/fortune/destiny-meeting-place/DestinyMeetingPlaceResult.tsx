"use client";

import { motion } from "framer-motion";
import { ChevronDown, Compass, Copy, Heart, Luggage, MapPin, MessageCircle, Moon, Palette, Route, ShieldAlert, Sparkles, Star, WandSparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { DestinyMeetingPlaceResult, DestinyPlaceType } from "./destinyMeetingPlaceTypes";

type Props = {
  result: DestinyMeetingPlaceResult;
  chargedCoins: number;
};

type PromptPack = NonNullable<DestinyMeetingPlaceResult["promptPack"]>;

type EnrichedPlace = DestinyMeetingPlaceResult["recommendedPlaces"][number] & {
  secondaryElement?: DestinyMeetingPlaceResult["recommendedPlaces"][number]["element"];
  categoryLabel?: string;
  destinyGrade?: string;
  elementalProfile?: string;
  baziInsight?: string;
  fitStrategy?: string;
  avoidWhen?: string;
  bestTimeHint?: string;
  ritual?: string;
  purposeTags?: string[];
};

type SectionCardProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  index: number;
  children: ReactNode;
};

type GlassChipProps = {
  children: ReactNode;
  className?: string;
};

type ElementBadgeProps = {
  element: string;
  label?: string;
};

type DestinySummaryCardProps = {
  oneLine: string;
  chips: string[];
  chargedCoins: number;
  topPlace?: EnrichedPlace;
};

type TodayPlaceCardProps = {
  place?: EnrichedPlace;
  index: number;
};

type PromptItem = PromptPack["prompts"][number];

type PromptAtelierGridProps = {
  promptPack: PromptPack;
  selectedPrompt: PromptItem | null;
  copiedPromptId: string | null;
  index: number;
  onSelectPrompt: (id: string) => void;
  onCopyPrompt: (id: string, text: string) => void;
};

const serifClass = "font-['Noto_Serif_KR','Cormorant_Garamond',serif]";
const sansClass = "font-['Pretendard','Apple_SD_Gothic_Neo','Noto_Sans_KR',sans-serif]";

function formatCoinValue(amount: number) {
  return `${Math.max(0, Math.floor(Number(amount || 0) * 100)).toLocaleString("ko-KR")}원`;
}

const fadeUpVariant = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

function elementLabel(element: string) {
  const map: Record<string, string> = {
    wood: "목(木)",
    fire: "화(火)",
    earth: "토(土)",
    metal: "금(金)",
    water: "수(水)",
  };
  return map[element] || element;
}

function elementToneClass(element: string) {
  const map: Record<string, string> = {
    wood: "border-emerald-200/45 bg-emerald-300/15 text-emerald-50 shadow-[0_0_18px_rgba(110,231,183,0.12)]",
    fire: "border-rose-200/45 bg-rose-300/15 text-rose-50 shadow-[0_0_18px_rgba(251,113,133,0.12)]",
    earth: "border-amber-200/50 bg-[#D4B483]/20 text-[#fff1d6] shadow-[0_0_18px_rgba(248,223,166,0.14)]",
    metal: "border-slate-100/45 bg-slate-200/15 text-slate-50 shadow-[0_0_18px_rgba(226,232,240,0.12)]",
    water: "border-cyan-200/45 bg-cyan-300/15 text-cyan-50 shadow-[0_0_18px_rgba(103,232,249,0.12)]",
  };
  return map[element] || "border-white/30 bg-white/10 text-white";
}

function GlassChip({ children, className = "" }: GlassChipProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/[0.18] bg-white/10 px-3 py-1.5 text-[11px] font-bold leading-none text-[#f8f2ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md transition-all hover:border-[#f8dfa6]/45 hover:bg-white/15 ${className}`}>
      {children}
    </span>
  );
}

function ElementBadge({ element, label }: ElementBadgeProps) {
  return (
    <GlassChip className={elementToneClass(element)}>
      {label ? <span className="text-white/70">{label}</span> : null}
      {elementLabel(element)}
    </GlassChip>
  );
}

function promptIcon(prompt: PromptItem, index: number) {
  const text = `${prompt.category} ${prompt.title}`.toLowerCase();
  if (text.includes("대화") || text.includes("말")) return <MessageCircle size={18} />;
  if (text.includes("동선") || text.includes("루트")) return <Route size={18} />;
  if (text.includes("여행") || text.includes("도시")) return <Luggage size={18} />;
  if (text.includes("스타일") || text.includes("무드") || text.includes("색")) return <Palette size={18} />;
  if (text.includes("주의") || text.includes("피해야")) return <ShieldAlert size={18} />;
  return index % 2 === 0 ? <Compass size={18} /> : <MapPin size={18} />;
}

const promptAccentClasses = [
  "from-[#f8dfa6]/20 via-[#a78bfa]/10 to-white/[0.04]",
  "from-[#93c5fd]/20 via-[#c4b5fd]/10 to-white/[0.04]",
  "from-[#f0abfc]/20 via-[#a78bfa]/10 to-white/[0.04]",
  "from-[#c4b5fd]/20 via-[#93c5fd]/10 to-white/[0.04]",
  "from-[#f8dfa6]/20 via-[#f0abfc]/10 to-white/[0.04]",
  "from-white/15 via-[#a78bfa]/10 to-white/[0.04]",
];

const PREVIEW_DESTINATION_COUNT = 2;
const PLACE_TYPE_ORDER: (DestinyPlaceType | "other")[] = [
  "city",
  "nature",
  "cafe",
  "culture",
  "travel",
  "spiritual",
  "water",
  "mountain",
  "night",
  "daily",
  "other",
];
const placeTypeLabel: Record<string, string> = {
  city: "도시",
  nature: "자연",
  cafe: "카페",
  culture: "문화",
  travel: "여행",
  spiritual: "정신",
  water: "바다",
  mountain: "산",
  night: "야간",
  daily: "일상",
  other: "기타",
};
const placeTypeIcon: Record<string, string> = {
  city: "도시",
  nature: "정원",
  cafe: "찻잔",
  culture: "전시",
  travel: "여정",
  spiritual: "성소",
  water: "물결",
  mountain: "산길",
  night: "야경",
  daily: "일상",
  other: "좌표",
};

type PlaceTypeGroup = DestinyPlaceType | "other";

function buildPromptPackText(promptPack: PromptPack) {
  return [
    promptPack.title,
    promptPack.intro,
    ...promptPack.prompts.map((prompt, index) => [
      `${index + 1}. ${prompt.title}`,
      `분류: ${prompt.category}`,
      `목적: ${prompt.intent}`,
      prompt.relatedPlace ? `연결 장소: ${prompt.relatedPlace}` : "",
      prompt.prompt,
    ].filter(Boolean).join("\n")),
  ].join("\n\n");
}

function normalizePlaceType(type?: string): PlaceTypeGroup {
  if (!type) return "other";
  return Object.prototype.hasOwnProperty.call(placeTypeLabel, type) ? (type as PlaceTypeGroup) : "other";
}

function placeCategoryLabel(type: PlaceTypeGroup) {
  return `${placeTypeIcon[type]} · ${placeTypeLabel[type] || "기타"}`;
}

function SectionCard({ title, subtitle, icon, index, children }: SectionCardProps) {
  return (
    <motion.section
      variants={fadeUpVariant}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.06 }}
      className="group relative isolate overflow-hidden rounded-[28px] border border-white/[0.16] bg-[radial-gradient(circle_at_12%_10%,rgba(248,223,166,0.12),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(167,139,250,0.16),transparent_35%),linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.045))] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_22px_52px_rgba(5,7,24,0.5)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f8dfa6]/35"
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.42)_0.8px,transparent_0.8px)] [background-size:30px_30px]" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#a78bfa]/20 blur-3xl" />
      <div className="relative p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f8dfa6]/80">{subtitle}</p>
            <h3 className={`mt-1 text-2xl leading-tight text-[#fff7e8] drop-shadow-[0_0_16px_rgba(248,223,166,0.18)] ${serifClass}`}>{title}</h3>
          </div>
          <div className="mt-1 rounded-full border border-[#f8dfa6]/35 bg-[#f8dfa6]/15 p-2.5 text-[#f8dfa6] shadow-[0_0_24px_rgba(248,223,166,0.12)]">{icon}</div>
        </div>
        {children}
      </div>
    </motion.section>
  );
}

function DestinySummaryCard({ oneLine, chips, chargedCoins, topPlace }: DestinySummaryCardProps) {
  return (
    <motion.section
      variants={fadeUpVariant}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0 }}
      className="relative isolate overflow-hidden rounded-[28px] border border-white/[0.18] bg-[radial-gradient(circle_at_18%_12%,rgba(248,223,166,0.18),transparent_35%),radial-gradient(circle_at_84%_10%,rgba(240,171,252,0.14),transparent_34%),linear-gradient(150deg,rgba(255,255,255,0.1),rgba(255,255,255,0.055))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_58px_rgba(6,8,28,0.54)] backdrop-blur-xl sm:p-6"
    >
      <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:linear-gradient(115deg,transparent_0_48%,rgba(248,223,166,0.14)_48.5%,transparent_49%),radial-gradient(rgba(255,255,255,0.5)_0.8px,transparent_0.8px)] [background-size:180px_180px,34px_34px]" />
      <div className="pointer-events-none absolute -left-16 top-1/2 h-44 w-44 rounded-full bg-[#c4b5fd]/15 blur-3xl" />
      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f8dfa6]/30 bg-[#f8dfa6]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#f8dfa6]/85 shadow-[0_0_22px_rgba(248,223,166,0.12)]">
              <Compass size={14} />
              DESTINY SUMMARY
            </div>
            <h3 className={`mt-3 text-2xl leading-tight text-[#fff8ed] sm:text-3xl ${serifClass}`}>한 줄 요약</h3>
          </div>
          <div className="rounded-full border border-white/[0.16] bg-white/10 p-3 text-[#c4b5fd] shadow-[0_0_28px_rgba(196,181,253,0.18)]">
            <Sparkles size={20} />
          </div>
        </div>
        <p className={`max-w-4xl text-lg leading-8 text-[#fff5e8] sm:text-xl sm:leading-9 ${serifClass}`}>{oneLine}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <GlassChip key={chip} className="border-[#c4b5fd]/25 bg-[#c4b5fd]/15 text-[#f4efff]">
              <Sparkles size={12} />
              {chip}
            </GlassChip>
          ))}
          <GlassChip className="border-[#f8dfa6]/35 bg-[#f8dfa6]/15 text-[#fff1cf]">분석 가치 {formatCoinValue(chargedCoins)}</GlassChip>
          {topPlace ? <GlassChip className="border-[#93c5fd]/35 bg-[#93c5fd]/15 text-[#e6f2ff]">다음 좌표 {topPlace.name}</GlassChip> : null}
        </div>
      </div>
    </motion.section>
  );
}

function TodayPlaceCard({ place, index }: TodayPlaceCardProps) {
  if (!place) return null;

  return (
    <motion.section
      variants={fadeUpVariant}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.06 }}
      className="relative isolate overflow-hidden rounded-[32px] border border-[#f8dfa6]/35 bg-[radial-gradient(circle_at_18%_8%,rgba(248,223,166,0.22),transparent_34%),radial-gradient(circle_at_82%_0%,rgba(147,197,253,0.18),transparent_32%),linear-gradient(140deg,rgba(25,24,56,0.88),rgba(17,20,42,0.82)_48%,rgba(37,27,74,0.78))] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_32px_80px_rgba(4,6,25,0.62)] backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(248,223,166,0.42)_0.8px,transparent_0.8px),linear-gradient(130deg,transparent_0_40%,rgba(196,181,253,0.13)_40.3%,transparent_41%)] [background-size:36px_36px,220px_220px]" />
      <div className="pointer-events-none absolute -bottom-28 left-1/2 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-[#7c3aed]/24 blur-3xl" />
      <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.12fr_0.88fr] lg:p-7">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f8dfa6]/35 bg-[#f8dfa6]/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#f8dfa6]">
                <MapPin size={14} />
                TODAY'S PLACE
              </div>
              <h3 className={`mt-3 text-3xl leading-tight text-[#fff8ed] sm:text-4xl ${serifClass}`}>{place.name}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {place.destinyGrade ? <GlassChip className="border-[#f8dfa6]/45 bg-[#f8dfa6]/15 text-[#fff0cd]">{place.destinyGrade}</GlassChip> : null}
              {place.categoryLabel ? <GlassChip className="border-[#f0abfc]/35 bg-[#f0abfc]/15 text-[#ffe9ff]">{place.categoryLabel}</GlassChip> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ElementBadge element={place.element} label="주기운" />
            {place.secondaryElement ? <ElementBadge element={place.secondaryElement} label="보조기운" /> : null}
            <GlassChip className="border-[#93c5fd]/35 bg-[#93c5fd]/15 text-[#e5f1ff]">궁합 {place.romancePotential}%</GlassChip>
          </div>

          <div className="space-y-3 text-[15px] leading-7 text-[#f0e8dc]">
            {place.elementalProfile ? <p className="font-bold text-[#f8dfa6]">{place.elementalProfile}</p> : null}
            {place.sceneDescription ? <p className={`text-lg leading-8 text-[#fff4e5] ${serifClass}`}>{place.sceneDescription}</p> : null}
            <p>{place.reason}</p>
            {place.baziInsight ? <p className="text-[#e7dcff]">{place.baziInsight}</p> : null}
            {place.fitStrategy ? <p>{place.fitStrategy}</p> : null}
          </div>

          {place.purposeTags?.length ? (
            <div className="flex flex-wrap gap-2">
              {place.purposeTags.slice(0, 4).map((tag) => (
                <GlassChip key={`${place.name}-${tag}`} className="border-white/[0.14] bg-white/10 text-[#eee8ff]">{tag}</GlassChip>
              ))}
            </div>
          ) : null}

          <div className="rounded-[24px] border border-[#f8dfa6]/28 bg-[linear-gradient(135deg,rgba(248,223,166,0.14),rgba(255,255,255,0.055))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f8dfa6]">Moonlit Action</p>
            <p className={`mt-2 text-base leading-7 text-[#fff5df] ${serifClass}`}>{place.ritual || place.actionTip}</p>
            {place.ritual ? <p className="mt-2 text-sm leading-6 text-[#e9dfcf]">{place.actionTip}</p> : null}
          </div>
        </div>

        <div className="relative min-h-[230px] overflow-hidden rounded-[28px] border border-white/[0.16] bg-[radial-gradient(ellipse_at_28%_26%,transparent_0_34%,rgba(248,223,166,0.24)_35%,transparent_37%),radial-gradient(ellipse_at_72%_66%,transparent_0_42%,rgba(196,181,253,0.2)_43%,transparent_45%),linear-gradient(160deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] lg:min-h-full">
          <div className="absolute left-[18%] top-[24%] h-2.5 w-2.5 rounded-full bg-[#f8dfa6] shadow-[0_0_18px_rgba(248,223,166,0.8)]" />
          <div className="absolute left-[44%] top-[38%] h-2 w-2 rounded-full bg-[#c4b5fd] shadow-[0_0_16px_rgba(196,181,253,0.7)]" />
          <div className="absolute right-[22%] top-[22%] h-2 w-2 rounded-full bg-[#93c5fd] shadow-[0_0_16px_rgba(147,197,253,0.7)]" />
          <div className="absolute left-[21%] top-[27%] h-px w-[31%] rotate-[20deg] bg-gradient-to-r from-[#f8dfa6]/50 to-[#c4b5fd]/35" />
          <div className="absolute right-[24%] top-[30%] h-px w-[30%] -rotate-[18deg] bg-gradient-to-r from-[#c4b5fd]/35 to-[#93c5fd]/45" />
          <div className="absolute bottom-0 left-0 h-28 w-full bg-[linear-gradient(180deg,rgba(36,48,86,0.26),rgba(8,10,30,0.82))]" style={{ clipPath: "polygon(0 78%, 13% 58%, 25% 68%, 39% 34%, 54% 71%, 68% 48%, 83% 64%, 100% 30%, 100% 100%, 0 100%)" }} />
          <div className="relative flex h-full min-h-[190px] flex-col justify-between">
            <div className="ml-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#f8dfa6]/35 bg-[#f8dfa6]/10 text-[#f8dfa6] shadow-[0_0_36px_rgba(248,223,166,0.2)]">
              <Compass size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f8dfa6]/85">DESTINY MAP</p>
              <p className={`mt-2 text-2xl leading-tight text-[#fff8ed] ${serifClass}`}>달빛이 머무는 좌표</p>
              {place.bestTimeHint ? <p className="mt-3 text-sm leading-6 text-[#e9e1f8]">{place.bestTimeHint}</p> : null}
              {place.avoidWhen ? <p className="mt-2 text-xs leading-5 text-[#ffdbe4]">피해야 할 흐름: {place.avoidWhen}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function PromptAtelierGrid({ promptPack, selectedPrompt, copiedPromptId, index, onSelectPrompt, onCopyPrompt }: PromptAtelierGridProps) {
  return (
    <SectionCard title="사주 프롬프트 북" subtitle="Prompt Atelier" icon={<WandSparkles size={18} />} index={index}>
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <p className={`text-lg leading-8 text-[#fff0d6] ${serifClass}`}>{promptPack.intro}</p>
          <div className="grid gap-3 sm:grid-cols-2" role="tablist" aria-label="사주 프롬프트 선택">
            {promptPack.prompts.map((prompt, promptIndex) => {
              const isActive = selectedPrompt?.id === prompt.id;
              const accent = promptAccentClasses[promptIndex % promptAccentClasses.length];
              return (
                <button
                  key={prompt.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectPrompt(prompt.id)}
                  className={`group relative min-h-[132px] overflow-hidden rounded-[22px] border p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-all duration-300 hover:-translate-y-0.5 ${isActive ? "border-[#f8dfa6]/55 bg-white/[0.12] text-[#fff8ed] shadow-[0_0_28px_rgba(248,223,166,0.16)]" : "border-white/[0.14] bg-white/[0.07] text-[#e8dece] hover:border-[#f8dfa6]/35 hover:bg-white/10"}`}
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.16] bg-white/10 text-[#f8dfa6] transition-transform duration-300 group-hover:scale-105">
                        {promptIcon(prompt, promptIndex)}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f8dfa6]/80">{prompt.category}</span>
                    </div>
                    <span className={`mt-4 block text-base leading-snug text-[#fff6e8] ${serifClass}`}>{prompt.title}</span>
                    <span className="mt-2 block line-clamp-2 text-xs leading-5 text-[#ded4c8]">{prompt.intent}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => onCopyPrompt("all-prompts", buildPromptPackText(promptPack))}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#f8dfa6]/40 bg-[#f8dfa6]/15 px-4 py-2 text-sm font-black text-[#fff1d7] shadow-[0_12px_28px_rgba(8,8,28,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#f8dfa6]/20"
          >
            <Copy size={15} />
            {copiedPromptId === "all-prompts" ? "전체 세트 복사 완료" : "전체 프롬프트 세트 복사"}
          </button>
        </div>

        {selectedPrompt ? (
          <article className="relative overflow-hidden rounded-[28px] border border-[#f8dfa6]/30 bg-[radial-gradient(circle_at_84%_8%,rgba(248,223,166,0.16),transparent_30%),linear-gradient(150deg,rgba(32,24,55,0.74),rgba(18,24,46,0.68))] p-4 text-[#f3eadf] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] sm:p-5">
            <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.52)_0.8px,transparent_0.8px)] [background-size:28px_28px]" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f8dfa6]">{selectedPrompt.category}</p>
                  <h4 className={`mt-2 text-2xl leading-tight text-[#fff2de] ${serifClass}`}>{selectedPrompt.title}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => onCopyPrompt(selectedPrompt.id, selectedPrompt.prompt)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/[0.18] bg-white/10 px-3 py-2 text-xs font-black text-[#fff4df] transition-all hover:bg-white/15"
                >
                  <Copy size={14} />
                  {copiedPromptId === selectedPrompt.id ? "복사 완료" : "복사"}
                </button>
              </div>
              <p className="mt-3 text-sm leading-7 text-[#dfd5c8]">{selectedPrompt.intent}</p>
              {selectedPrompt.relatedPlace ? (
                <GlassChip className="mt-3 border-[#93c5fd]/35 bg-[#93c5fd]/15 text-[#e4f1ff]">연결 장소: {selectedPrompt.relatedPlace}</GlassChip>
              ) : null}
              <div className="mt-4 max-h-[420px] overflow-auto rounded-[22px] border border-white/[0.14] bg-black/20 p-4 text-sm leading-7 text-[#f8efe4] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] whitespace-pre-wrap break-words">
                {selectedPrompt.prompt}
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </SectionCard>
  );
}

export default function DestinyMeetingPlaceResult({ result, chargedCoins }: Props) {
  const majorKeywordChips = [result.summary.mainEnergy, result.summary.romanceKeyword, result.summary.placeTheme];
  const promptPack = result.promptPack;
  const [selectedPromptId, setSelectedPromptId] = useState(() => promptPack?.prompts[0]?.id || "");
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [expandedPlaceGroups, setExpandedPlaceGroups] = useState<Record<string, boolean>>({});
  const selectedPrompt = promptPack?.prompts.find((prompt) => prompt.id === selectedPromptId) || promptPack?.prompts[0] || null;
  const topPlace = result.recommendedPlaces[0] as EnrichedPlace | undefined;
  const hasPromptPack = Boolean(promptPack?.prompts.length);
  const placeGroups = result.recommendedPlaces.reduce<Record<string, EnrichedPlace[]>>((acc, basePlace) => {
    const place = basePlace as EnrichedPlace;
    const type = normalizePlaceType(place.type);
    if (!acc[type]) acc[type] = [];
    acc[type].push(place);
    return acc;
  }, {});
  const orderedPlaceGroups = PLACE_TYPE_ORDER.map((type) => ({ type, places: placeGroups[type] || [] }))
    .concat(
      Object.entries(placeGroups)
        .filter(([type]) => !PLACE_TYPE_ORDER.includes(type as PlaceTypeGroup))
        .map(([type, places]) => ({ type: (type as PlaceTypeGroup) || "other", places }))
    )
    .filter((group) => group.places.length > 0);

  async function copyPrompt(id: string, text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPromptId(id);
      window.setTimeout(() => setCopiedPromptId(null), 1400);
    } catch {
      setCopiedPromptId(null);
    }
  }

  function togglePlaceGroup(type: string) {
    setExpandedPlaceGroups((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  return (
    <div className={`relative isolate space-y-5 overflow-hidden py-1 ${sansClass}`}>
      <div className="pointer-events-none absolute inset-x-[-12%] top-16 -z-10 h-96 rounded-full bg-[radial-gradient(circle_at_22%_42%,rgba(167,139,250,0.18),transparent_34%),radial-gradient(circle_at_72%_58%,rgba(147,197,253,0.14),transparent_32%),radial-gradient(circle_at_50%_92%,rgba(240,171,252,0.12),transparent_36%)] blur-2xl" />
      <DestinySummaryCard oneLine={result.summary.oneLine} chips={majorKeywordChips} chargedCoins={chargedCoins} topPlace={topPlace} />
      <TodayPlaceCard place={topPlace} index={1} />

      {hasPromptPack && promptPack ? (
        <PromptAtelierGrid
          promptPack={promptPack}
          selectedPrompt={selectedPrompt}
          copiedPromptId={copiedPromptId}
          index={2}
          onSelectPrompt={setSelectedPromptId}
          onCopyPrompt={copyPrompt}
        />
      ) : null}

      <SectionCard title="나의 기운" subtitle="Energy Signature" icon={<Heart size={18} />} index={hasPromptPack ? 3 : 2}>
        <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-2 text-[15px] leading-relaxed text-[#ece5d7]">
            <p className="text-sm text-[#f4dfbb]">일간</p>
            <p className={`text-xl text-[#fff6e8] ${serifClass}`}>{result.energyProfile.dayMaster}</p>
            <p>{result.energyProfile.relationshipPattern}</p>
            <p>{result.energyProfile.meetingStyle}</p>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm text-[#f4dfbb]">오행 밸런스</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {result.energyProfile.usefulElements.map((element) => (
                <span key={`useful-${element}`} className={`rounded-full border px-2.5 py-1 ${elementToneClass(element)}`}>
                  핵심 {elementLabel(element)}
                </span>
              ))}
              {result.energyProfile.avoidElements.map((element) => (
                <span key={`avoid-${element}`} className="rounded-full border border-rose-200/45 bg-rose-300/15 px-2.5 py-1 text-rose-100">
                  과열 주의 {elementLabel(element)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="타이밍" subtitle="Timing Window" icon={<Moon size={18} />} index={hasPromptPack ? 4 : 3}>
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">Season</p>
            <p className={`mt-2 text-lg text-[#fff6e8] ${serifClass}`}>{result.luckyTiming.bestSeasons.join(" · ")}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">Month</p>
            <p className={`mt-2 text-lg text-[#fff6e8] ${serifClass}`}>{result.luckyTiming.bestMonths.join(" · ")}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">Clock</p>
            <p className={`mt-2 text-lg text-[#fff6e8] ${serifClass}`}>{result.luckyTiming.bestTimeOfDay.join(" · ")}</p>
          </article>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[#e5dccd]">{result.luckyTiming.explanation}</p>
      </SectionCard>

      <SectionCard title="장소 TOP 5" subtitle="Where Destiny Opens" icon={<MapPin size={18} />} index={hasPromptPack ? 5 : 4}>
        <div className="space-y-4">
          {orderedPlaceGroups.map((group) => {
            const isExpanded = !!expandedPlaceGroups[group.type];
            const visiblePlaces = isExpanded ? group.places : group.places.slice(0, PREVIEW_DESTINATION_COUNT);
            const hasMore = group.places.length > PREVIEW_DESTINATION_COUNT;

            return (
              <section key={group.type} className="rounded-[22px] border border-white/20 bg-white/5">
                <button
                  type="button"
                  onClick={() => togglePlaceGroup(group.type)}
                  className="flex w-full items-center justify-between gap-3 rounded-[22px] px-4 py-3 text-left transition hover:bg-white/10"
                >
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f8df9f]">{placeCategoryLabel(group.type)}</p>
                    <p className="mt-1 text-sm text-[#f2dfbf]">
                      TOP {group.places.length}곳 • 대표 {Math.min(PREVIEW_DESTINATION_COUNT, group.places.length)}곳 미리보기
                    </p>
                  </div>
                  <ChevronDown size={16} className={`shrink-0 text-[#f8df9f] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                <div className="grid gap-3 p-3 pt-0 md:grid-cols-2">
                  {visiblePlaces.map((basePlace) => {
                    const place = basePlace as EnrichedPlace;
                    return (
                      <article key={place.name} className="rounded-2xl border border-[#efd8b4]/35 bg-[linear-gradient(150deg,rgba(27,34,57,0.45),rgba(34,27,50,0.44))] p-4 text-sm text-[#e8ddca]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#e8b16e]">
                              #{place.rank} {place.destinyGrade || place.categoryLabel || "길지"}
                            </p>
                            <p className={`mt-1 text-xl text-[#f7e5cc] ${serifClass}`}>{place.name}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${elementToneClass(place.element)}`}>{elementLabel(place.element)}</span>
                            {place.secondaryElement ? (
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${elementToneClass(place.secondaryElement)}`}>{elementLabel(place.secondaryElement)}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded-full border border-[#f0d7ad]/40 bg-[#f0d7ad]/15 px-2.5 py-1 text-[#ead4ab]">궁합 {place.romancePotential}%</span>
                          {place.elementalProfile ? (
                            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[#ddd0bd]">{place.elementalProfile}</span>
                          ) : null}
                          {place.purposeTags?.slice(0, 3).map((tag) => (
                            <span key={`${place.name}-${tag}`} className="rounded-full border border-white/[0.14] bg-white/5 px-2.5 py-1 text-[#d3c8b7]">{tag}</span>
                          ))}
                        </div>
                        {place.sceneDescription ? <p className="mt-3 leading-relaxed text-[#e8dabf]">{place.sceneDescription}</p> : null}
                        <p className="mt-2 leading-relaxed text-[#deccba]">{place.reason}</p>
                        {place.baziInsight ? (
                          <div className="mt-3 rounded-xl border border-[#f0d7ad]/25 bg-[#f0d7ad]/10 p-3">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-[#e6c793]">Saju Match</p>
                            <p className="mt-1 leading-relaxed text-[#efdcc1]">{place.baziInsight}</p>
                          </div>
                        ) : null}
                        {place.fitStrategy ? <p className="mt-3 text-[#e7dcc4]">{place.fitStrategy}</p> : null}
                        {place.emotionalHook ? <p className="mt-2 text-[#d7c8b4]">{place.emotionalHook}</p> : null}
                        {place.conversationOpener ? (
                          <div className="mt-3 rounded-xl border border-white/15 bg-white/5 p-3">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-[#e6c793]">Conversation Cue</p>
                            <p className="mt-1 text-[#ede2cf]">{place.conversationOpener}</p>
                          </div>
                        ) : null}
                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                          {place.bestTimeHint ? (
                            <div className="rounded-xl border border-white/[0.14] bg-white/5 p-3">
                              <p className="uppercase tracking-[0.14em] text-[#e6c793]">Time</p>
                              <p className="mt-1 text-[#e9dcc5]">{place.bestTimeHint}</p>
                            </div>
                          ) : null}
                          {place.avoidWhen ? (
                            <div className="rounded-xl border border-rose-200/20 bg-rose-300/10 p-3">
                              <p className="uppercase tracking-[0.14em] text-rose-100">Avoid</p>
                              <p className="mt-1 text-[#edddd9]">{place.avoidWhen}</p>
                            </div>
                          ) : null}
                        </div>
                        {place.ritual ? (
                          <p className={`mt-3 rounded-xl border border-white/[0.14] bg-black/15 p-3 leading-relaxed text-[#f4e2c5] ${serifClass}`}>{place.ritual}</p>
                        ) : null}
                        <p className="mt-3 text-[#dbc9b1]">{place.actionTip}</p>
                      </article>
                    );
                  })}
                </div>
                {hasMore ? (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-[#b8a78d]">
                      나머지 {group.places.length - PREVIEW_DESTINATION_COUNT}곳은 접기/펼치기로 확인
                    </p>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="액션 플랜" subtitle="This Week Ritual" icon={<Star size={18} />} index={hasPromptPack ? 6 : 5}>
        <div className="space-y-3 text-sm text-[#ece4d7]">
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">오늘</p>
            <p className="mt-1 leading-relaxed">{result.practicalPlan.todayAction}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">이번 주</p>
            <p className="mt-1 leading-relaxed">{result.practicalPlan.thisWeekAction}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">이번 달</p>
            <p className="mt-1 leading-relaxed">{result.practicalPlan.thisMonthAction}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">원정 플랜</p>
            <p className="mt-1 leading-relaxed">{result.practicalPlan.travelAction}</p>
          </article>
          {result.practicalPlan.toneReminder ? (
            <article className="rounded-2xl border border-[#f0d7ad]/40 bg-[#f0d7ad]/10 p-4 text-[#f6ebd5]">
              <p className="text-xs uppercase tracking-[0.16em] text-[#f2ddb8]">Tone Reminder</p>
              <p className="mt-1 leading-relaxed">{result.practicalPlan.toneReminder}</p>
            </article>
          ) : null}
          {result.practicalPlan.microActions?.length ? (
            <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">실전 마이크로 액션</p>
              <div className="mt-2 space-y-2 text-[#ede3d4]">
                {result.practicalPlan.microActions.map((action) => (
                  <p key={action}>- {action}</p>
                ))}
              </div>
            </article>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">스타일 시그니처</p>
            <p className={`mt-2 text-lg text-[#fff2de] ${serifClass}`}>{result.stylingGuide.mood}</p>
            <p className="mt-2 text-sm text-[#e8ddcd]">{result.stylingGuide.outfit}</p>
            <p className="mt-1 text-sm text-[#e8ddcd]">컬러: {result.stylingGuide.colors.join(" · ")}</p>
            {result.stylingGuide.fragrance ? <p className="mt-1 text-sm text-[#e8ddcd]">향: {result.stylingGuide.fragrance}</p> : null}
          </article>

          <article className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">도시 무드 추천</p>
            <div className="mt-2 space-y-2">
              {result.recommendedCountries.slice(0, 2).map((city) => (
                <div key={`${city.country}-${city.rank}`} className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <p className={`text-base text-[#fff2de] ${serifClass}`}>{city.country}</p>
                  <p className="text-sm text-[#e9dfd1]">{city.cities.join(" · ")}</p>
                  <p className="text-xs text-[#d9cebd]">{city.travelMood}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-[#e9dfd1]">
          <p className="text-xs uppercase tracking-[0.16em] text-[#e6c793]">주의할 흐름</p>
          <p className="mt-2 leading-relaxed">장소: {result.avoidGuide.avoidPlaces.join(" · ")}</p>
          <p className="mt-1 leading-relaxed">타이밍: {result.avoidGuide.avoidTiming.join(" · ")}</p>
          <p className="mt-1 leading-relaxed">패턴: {result.avoidGuide.avoidPatterns.join(" · ")}</p>
          <p className="mt-2 text-[#dacdb8]">{result.avoidGuide.reason}</p>
        </div>
      </SectionCard>

    </div>
  );
}
