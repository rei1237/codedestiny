"use client";

import React, { useState, useRef } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

// ─────────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────────
interface CharacterData {
  title: string;
  subtitle: string;
  emoji: string;
  starLabel: string;
  primaryStar: string;
  secondaryStar?: string | null;
}

interface PalaceData {
  name: string;
  stars: string[];
  idx: number;
}

interface Chapter1Data {
  archetype: string;
  shadow: string;
  persona: string;
  fullText: string;
}

interface AnalysisResult {
  character: CharacterData;
  palace: { mingong: PalaceData; shingong: PalaceData };
  chapter1: Chapter1Data;
}

interface BokdeokgongPalace {
  name: string;
  stars: string[];
  aux: string[];
  bad: string[];
  idx: number;
}

interface Chapter2Data {
  happiness: string;
  stressTrigger: string;
  refactoring: string;
  fullText: string;
}

interface Chapter2Result {
  palace: { bokdeokgong: BokdeokgongPalace };
  chapter2: Chapter2Data;
}

interface CheonigongPalace {
  name: string;
  stars: string[];
  aux: string[];
  bad: string[];
  idx: number;
}

interface Chapter3Data {
  persona: string;
  branding: string;
  environment: string;
  fullText: string;
}

interface RadarScore {
  axis: string;
  value: number;
}

interface Chapter3Result {
  palace: { cheonigong: CheonigongPalace };
  radarScores: RadarScore[];
  chapter3: Chapter3Data;
}

interface GwanrokgongPalace {
  name: string;
  stars: string[];
  aux: string[];
  bad: string[];
  idx: number;
}

interface WorkStyleScores {
  independence: number;
  independenceLabel: string;
  creativity: number;
  creativityLabel: string;
  leadership: number;
  execution: number;
  strategy: number;
}

interface Chapter4Data {
  drive: string;
  driveQuote: string;
  toolkit: string;
  toolkitQuote: string;
  office: string;
  officeQuote: string;
  fullText: string;
}

interface Chapter4Result {
  palace: { gwanrokgong: GwanrokgongPalace };
  workStyle: WorkStyleScores;
  chapter4: Chapter4Data;
}

interface JaebaekkongPalace {
  name: string;
  stars: string[];
  aux: string[];
  bad: string[];
  idx: number;
}

interface WealthItem {
  key: string;
  icon: string;
  score: number;
}

interface WealthScores {
  income: number;
  loss: number;
  active: number;
  stable: number;
  windfall: number;
  weapons: WealthItem[];
  leaks: WealthItem[];
}

interface Chapter5Data {
  wealth: string;
  wealthQuote: string;
  leak: string;
  leakQuote: string;
  correct: string;
  correctQuote: string;
  fullText: string;
}

interface Chapter5Result {
  palace: { jaebaekkong: JaebaekkongPalace };
  wealthScores: WealthScores;
  chapter5: Chapter5Data;
}

// ─── Chapter 6 types ────────────────────────────────────────────
interface BucheoGongPalace {
  name: string;
  stars: string[];
  aux: string[];
  bad: string[];
  idx: number;
}

interface RelationshipScores {
  attraction: number;
  blindSpot: number;
  bonding: number;
  boundary: number;
}

interface Chapter6Data {
  attraction: string;
  attractionQuote: string;
  blindSpot: string;
  blindSpotQuote: string;
  boundary: string;
  boundaryQuote: string;
  fullText: string;
}

interface Chapter6Result {
  palace: { bucheo: BucheoGongPalace };
  relationshipScores: RelationshipScores;
  chapter6: Chapter6Data;
}

// ─── Chapter 7 types ────────────────────────────────────────────
interface NetworkPalace {
  name: string;
  stars: string[];
  aux: string[];
  bad: string[];
  idx: number;
}

interface NetworkScores {
  supporter: number;
  vampire: number;
  leverage: number;
  harmony: number;
}

interface Chapter7Data {
  terrain: string;
  terrainQuote: string;
  vampire: string;
  vampireQuote: string;
  leverage: string;
  leverageQuote: string;
  fullText: string;
}

interface Chapter7Result {
  palace: { gyoWu: NetworkPalace; hyungje: NetworkPalace };
  networkScores: NetworkScores;
  chapter7: Chapter7Data;
}

// ── Chapter 8 Types ─────────────────────────────────────────────
interface JeonTaekPalace {
  name: string;
  stars: string[];
  aux: string[];
  bad: string[];
  idx: number;
}

interface SpaceScores {
  stability: number;
  asset: number;
  flow: number;
  clutter: number;
}

interface Chapter8Data {
  asset: string;
  assetQuote: string;
  spaceEnergy: string;
  spaceQuote: string;
  minimal: string;
  minimalQuote: string;
  fullText: string;
}

interface Chapter8Result {
  palace: { jeonTaek: JeonTaekPalace };
  spaceScores: SpaceScores;
  chapter8: Chapter8Data;
}

// ── Chapter 9 Types ─────────────────────────────────────────────
interface PalaceEntry { name: string; stars: string[]; aux: string[]; bad: string[]; idx: number; }
interface HealthScores { vitality: number; stress: number; recovery: number; risk: number; }
interface Chapter9Data {
  constitution: string; constitutionQuote: string;
  stress: string; stressQuote: string;
  lifestyle: string; lifestyleQuote: string;
  fullText: string;
}
interface Chapter9Result { palace: { jilAek: PalaceEntry }; healthScores: HealthScores; chapter9: Chapter9Data; }

// ── Chapter 10 Types ────────────────────────────────────────────
interface CreateScores { creativity: number; expression: number; legacy: number; block: number; }
interface Chapter10Data {
  source: string; sourceQuote: string;
  express: string; expressQuote: string;
  legacy: string; legacyQuote: string;
  fullText: string;
}
interface Chapter10Result { palace: { janyeo: PalaceEntry }; createScores: CreateScores; chapter10: Chapter10Data; }

// ── Chapter 11 Types ────────────────────────────────────────────
interface RootScores { rootStrength: number; patternRisk: number; liberation: number; bond: number; }
interface Chapter11Data {
  parentEnergy: string; parentEnergyQuote: string;
  pattern: string; patternQuote: string;
  liberation: string; liberationQuote: string;
  fullText: string;
}
interface Chapter11Result { palace: { bumo: PalaceEntry }; rootScores: RootScores; chapter11: Chapter11Data; }

// ── Chapter 12 Types ────────────────────────────────────────────
interface Chapter12Data {
  coreTheme: string; coreThemeQuote: string;
  cycle: string; cycleQuote: string;
  roadmap: string; roadmapQuote: string;
  fullText: string;
}
interface Chapter12Result { chapter12: Chapter12Data; }

// ─────────────────────────────────────────────────────────────────
// Chapter 13: 대한 분析 타입
// ─────────────────────────────────────────────────────────────────
interface DaehanPeriod {
  index: number; label: string; ageRange: string;
  startYear: number; endYear: number; startAge: number; endAge: number;
  season: string; seasonEmoji: string;
  trend: "bull" | "bear" | "neutral"; score: number; keyword: string;
  isCurrent: boolean; palaceStars: string[];
}
interface DaehanChapterData {
  season: string; seasonQuote: string;
  megaTrend: string; megaTrendQuote: string;
  positioning: string; positioningQuote: string;
  fullText: string;
}
interface DaehanResult {
  daehanList: DaehanPeriod[];
  currentPeriod: DaehanPeriod;
  chapter13: DaehanChapterData;
}

// ─────────────────────────────────────────────────────────────────
// Chapter 14: 유년/유월 타입
// ─────────────────────────────────────────────────────────────────
interface MonthEntry {
  month: number; palaceIdx: number;
  stars: string[]; aux: string[]; bad: string[];
  score: number; trend: "good" | "average" | "caution";
  keyword: string; analysis: string;
}
interface YunnyeonData {
  annual: string; annualQuote: string;
  planning: string; planningQuote: string;
  fullText: string;
}
interface YunnyeonResult {
  yearPalaceStars: string[]; yearGanZhi: string;
  months: MonthEntry[]; yunnyeon: YunnyeonData;
}

// ─────────────────────────────────────────────────────────────────
// Chapter 15: 상하관계와 처세술 타입
// ─────────────────────────────────────────────────────────────────
interface PalaceNode {
  name: string; stars: string[]; aux: string[]; bad: string[];
}
interface Ch15Data {
  superior: string; superiorQuote: string;
  subordinate: string; subordinateQuote: string;
  wisdom: string; wisdomQuote: string;
  fullText: string;
}
interface TreeNodeResult {
  palace: { bumo: PalaceNode; janyeo: PalaceNode };
  chapter15: Ch15Data;
}

// ─────────────────────────────────────────────────────────────────
// Chapter 16: 마스터플랜 타입
// ─────────────────────────────────────────────────────────────────
interface Ch16Data {
  energyBalance: string; energyQuote: string;
  deepAdvice: string; adviceQuote: string;
  masterHabit: string; habitQuote: string;
  fullText: string;
}
interface MasterPlanResult {
  archetypeTitle: string;
  mingongStars: string[]; shingongStars: string[];
  characterTitle: string;
  chapter16: Ch16Data;
}

// ─────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────
function renderTextBlock(text: string) {
  if (!text) return null;
  return text.split(/\n{2,}/).map((para, i) => (
    <p
      key={i}
      className="leading-[2.1] tracking-[0.02em] text-indigo-100/85 text-[0.97rem]"
      style={{ marginBottom: "1.4em" }}
    >
      {para.replace(/\n/g, " ")}
    </p>
  ));
}

function SectionCard({
  index,
  title,
  icon,
  children,
}: {
  index: number;
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="rounded-2xl border border-indigo-400/20 bg-white/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <span
            className="font-bold tracking-[0.06em] text-amber-300"
            style={{ fontSize: "1.05rem" }}
          >
            {String(index + 1).padStart(2, "0")}. {title}
          </span>
        </div>
        <span
          className={`text-indigo-300 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-6 pb-6 pt-1 border-t border-indigo-400/10">
          {children}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 별자리 스피너 (로딩)
// ─────────────────────────────────────────────────────────────────
function ConstellationLoader() {
  return (
    <div className="flex flex-col items-center gap-5 py-16">
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-spin" />
        <div
          className="absolute inset-2 rounded-full border-2 border-indigo-400/40 animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "1.8s" }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">
          ✦
        </div>
      </div>
      <div className="text-center">
        <p
          className="font-semibold tracking-[0.2em] text-amber-300/80"
          style={{ fontSize: "0.85rem" }}
        >
          별의 지도를 펼치는 중
        </p>
        <p className="mt-1 tracking-[0.1em] text-indigo-300/60" style={{ fontSize: "0.75rem" }}>
          명궁과 신궁의 주성을 계산하고 있습니다…
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 캐릭터 타이틀 블록 (결과 핵심)
// ─────────────────────────────────────────────────────────────────
function CharacterHero({ character, palace }: { character: CharacterData; palace: AnalysisResult["palace"] }) {
  return (
    <div className="relative text-center pt-8 pb-10 px-4">
      {/* 별빛 장식 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-6 text-amber-400/30 select-none pointer-events-none">
        <span className="text-xs animate-pulse">✦</span>
        <span className="text-sm animate-pulse" style={{ animationDelay: "0.4s" }}>✦</span>
        <span className="text-xs animate-pulse" style={{ animationDelay: "0.8s" }}>✦</span>
      </div>

      {/* 이모지 + 별 라벨 */}
      <div className="mb-4">
        <span
          className="inline-block text-5xl mb-3 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]"
          aria-hidden
        >
          {character.emoji}
        </span>
        <p
          className="uppercase tracking-[0.35em] text-amber-400/70 font-medium"
          style={{ fontSize: "0.72rem" }}
        >
          {character.starLabel}
        </p>
      </div>

      {/* 캐릭터 타이틀 — 핵심 타이포그래피 */}
      <h3
        className="font-black text-white"
        style={{
          fontSize: "clamp(2rem, 6vw, 3rem)",
          lineHeight: 1.25,
          letterSpacing: "0.04em",
          textShadow: "0 0 40px rgba(167,139,250,0.4)",
        }}
      >
        {character.title}
      </h3>

      {/* 서브타이틀 */}
      <p
        className="mt-4 mx-auto text-indigo-200/70 font-light"
        style={{
          maxWidth: "480px",
          lineHeight: 1.9,
          letterSpacing: "0.06em",
          fontSize: "0.95rem",
        }}
      >
        {character.subtitle}
      </p>

      {/* 명궁 / 신궁 뱃지 */}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <div className="rounded-full border border-violet-400/30 bg-violet-950/50 px-5 py-2 backdrop-blur-sm">
          <span className="text-xs tracking-[0.15em] text-violet-300 font-medium">
            명궁 <span className="text-amber-300 font-bold">{palace.mingong.stars.join(" · ") || "—"}</span>
          </span>
        </div>
        <div className="rounded-full border border-indigo-400/30 bg-indigo-950/50 px-5 py-2 backdrop-blur-sm">
          <span className="text-xs tracking-[0.15em] text-indigo-300 font-medium">
            신궁 <span className="text-amber-300 font-bold">{palace.shingong.stars.join(" · ") || "—"}</span>
          </span>
        </div>
      </div>

      {/* 구분선 */}
      <div className="mt-8 mx-auto h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" style={{ maxWidth: "320px" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 쳃터 2 아코디언 아이템 (풀래스모피즘)
// ─────────────────────────────────────────────────────────────────

const CH2_SECTIONS = [
  {
    key: "happiness" as const,
    title: "나의 행복 스위치",
    icon: "🌟",
    accent: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.2)",
    label: "rgba(251,191,36,0.85)",
    labelText: "happiness trigger",
  },
  {
    key: "stressTrigger" as const,
    title: "스트레스의 진짜 원인",
    icon: "⚡",
    accent: "rgba(239,68,68,0.1)",
    border: "rgba(244,63,94,0.2)",
    label: "rgba(251,113,133,0.85)",
    labelText: "stress mechanism",
  },
  {
    key: "refactoring" as const,
    title: "무의식 리팩토링",
    icon: "🌿",
    accent: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
    label: "rgba(52,211,153,0.85)",
    labelText: "mental care routine",
  },
] as const;

function Ch2GlassAccordion({
  section,
  index,
  text,
}: {
  section: (typeof CH2_SECTIONS)[number];
  index: number;
  text: string;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div
      className="overflow-hidden rounded-2xl transition-all duration-300"
      style={{
        background: open ? section.accent : "rgba(255,255,255,0.03)",
        border: `1px solid ${open ? section.border : "rgba(255,255,255,0.07)"}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{section.icon}</span>
          <div>
            <p
              className="font-bold tracking-[0.06em]"
              style={{ color: open ? section.label : "rgba(226,232,240,0.7)", fontSize: "0.98rem" }}
            >
              {section.title}
            </p>
            <p
              className="uppercase tracking-[0.15em] mt-0.5"
              style={{ fontSize: "0.62rem", color: "rgba(148,163,184,0.5)" }}
            >
              {section.labelText}
            </p>
          </div>
        </div>
        <span
          className="shrink-0 transition-transform duration-300"
          style={{
            color: section.label,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            fontSize: "0.8rem",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          className="px-5 pb-6 pt-2"
          style={{ borderTop: `1px solid ${section.border}` }}
        >
          {text
            ? text.split(/\n{2,}/).map((para, i) => (
                <p
                  key={i}
                  style={{
                    lineHeight: 2.05,
                    letterSpacing: "0.025em",
                    color: "rgba(203,213,225,0.85)",
                    fontSize: "0.95rem",
                    marginBottom: "1.3em",
                  }}
                >
                  {para.replace(/\n/g, " ")}
                </p>
              ))
            : null}
        </div>
      )}
    </div>
  );
}

function Chapter2GlassCard({
  step,
  result,
  onRequest,
  characterTitle,
}: {
  step: "idle" | "loading" | "done";
  result: Chapter2Result | null;
  onRequest: () => void;
  characterTitle?: string;
}) {
  // ── 로딩 ──────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div
        className="rounded-3xl overflow-hidden px-6 py-12 flex flex-col items-center gap-5"
        style={{
          background: "rgba(8,145,178,0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(6,182,212,0.15)",
        }}
      >
        <div className="relative h-16 w-16">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{ border: "2px solid rgba(6,182,212,0.3)" }}
          />
          <div
            className="absolute inset-2 rounded-full animate-spin"
            style={{
              border: "2px solid rgba(16,185,129,0.3)",
              animationDirection: "reverse",
              animationDuration: "2s",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🌙</div>
        </div>
        <div className="text-center">
          <p
            className="font-semibold tracking-[0.2em]"
            style={{ color: "rgba(103,232,249,0.8)", fontSize: "0.82rem" }}
          >
            무의식의 도화지를 펼치는 중
          </p>
          <p
            className="mt-1 tracking-[0.08em]"
            style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.73rem" }}
          >
            복덕궁의 별들을 해석하고 있습니다…
          </p>
        </div>
      </div>
    );
  }

  // ── 결과 ────────────────────────────────────────────────────────────
  if (step === "done" && result) {
    const bd = result.palace.bokdeokgong;
    return (
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, rgba(8,145,178,0.08) 0%, rgba(6,78,59,0.08) 60%, rgba(15,23,42,0.3) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(6,182,212,0.2)",
          boxShadow:
            "0 8px 40px rgba(8,145,178,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* 헤더 */}
        <div
          className="px-6 pt-7 pb-5"
          style={{
            borderBottom: "1px solid rgba(6,182,212,0.12)",
            background:
              "linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(16,185,129,0.06) 100%)",
          }}
        >
          <p
            className="uppercase tracking-[0.25em] font-medium"
            style={{ color: "rgba(103,232,249,0.7)", fontSize: "0.68rem" }}
          >
            Chapter 02 · Unconscious Mind
          </p>
          <h3
            className="mt-2 font-black text-white"
            style={{
              fontSize: "clamp(1.4rem, 3.5vw, 1.9rem)",
              lineHeight: 1.3,
              letterSpacing: "0.03em",
              textShadow: "0 0 30px rgba(6,182,212,0.3)",
            }}
          >
            무의식의 도화지
          </h3>
          <p
            className="mt-2 font-light"
            style={{
              color: "rgba(186,230,253,0.6)",
              lineHeight: 1.95,
              letterSpacing: "0.04em",
              fontSize: "0.88rem",
            }}
          >
            복덕궁의 별들이 말하는 당신의 무의식 패턴과 행복의 비밀
          </p>

          {/* 복덕궁 별 리스트 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {bd.stars.length > 0 &&
              bd.stars.map((s) => (
                <span
                  key={s}
                  className="rounded-full px-3 py-1 text-xs font-semibold tracking-[0.1em]"
                  style={{
                    background: "rgba(6,182,212,0.15)",
                    border: "1px solid rgba(6,182,212,0.3)",
                    color: "rgba(103,232,249,0.9)",
                  }}
                >
                  {s}
                </span>
              ))}
            {bd.aux.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1 text-xs font-medium tracking-[0.1em]"
                style={{
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  color: "rgba(52,211,153,0.8)",
                }}
              >
                {s}
              </span>
            ))}
            {bd.bad.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1 text-xs font-medium tracking-[0.1em]"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.22)",
                  color: "rgba(251,113,133,0.8)",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 아코디언 */}
        <div className="px-5 py-5 space-y-3">
          {CH2_SECTIONS.map((sec, i) => (
            <Ch2GlassAccordion
              key={sec.key}
              section={sec}
              index={i}
              text={result.chapter2[sec.key]}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── 티저(상태) ─────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg, rgba(8,145,178,0.06) 0%, rgba(15,23,42,0.5) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(6,182,212,0.15)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* 숫자 탭 */}
      <div
        className="px-6 pt-6 pb-5"
        style={{ borderBottom: "1px solid rgba(6,182,212,0.1)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
            style={{
              background: "rgba(8,145,178,0.15)",
              border: "1px solid rgba(6,182,212,0.3)",
            }}
          >
            🌙
          </div>
          <div>
            <p
              className="uppercase tracking-[0.2em] font-medium"
              style={{ color: "rgba(103,232,249,0.65)", fontSize: "0.65rem" }}
            >
              Chapter 02 · Unlock
            </p>
            <p
              className="font-bold tracking-[0.04em] text-white"
              style={{ fontSize: "1.05rem" }}
            >
              무의식의 도화지
            </p>
          </div>
        </div>

        <p
          className="font-light"
          style={{
            color: "rgba(186,230,253,0.6)",
            lineHeight: 1.95,
            letterSpacing: "0.04em",
            fontSize: "0.88rem",
          }}
        >
          복덕궁(福德宮)은 당신의 내면 세계가 폼츻어 있는 궁입니다.
          이 별들이 만들어내는{" "}
          <span style={{ color: "rgba(52,211,153,0.85)", fontWeight: 600 }}>
            행복의 스위치
          </span>
          ,{" "}
          <span style={{ color: "rgba(251,113,133,0.8)", fontWeight: 600 }}>
            스트레스의 진짜 원인
          </span>
          , 그리고{" "}
          <span style={{ color: "rgba(103,232,249,0.85)", fontWeight: 600 }}>
            무의식을 리디자인하는 명상력
          </span>
          을 확인하세요.
        </p>

        {/* 콘텐츠 리스트 */}
        <div className="mt-4 space-y-1.5">
          {CH2_SECTIONS.map((sec) => (
            <div
              key={sec.key}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-base">{sec.icon}</span>
              <span
                className="text-sm font-medium tracking-[0.04em]"
                style={{ color: "rgba(203,213,225,0.7)" }}
              >
                {sec.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 py-5">
        <button
          type="button"
          onClick={onRequest}
          className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, #0e7490 0%, #0d9488 50%, #0891b2 100%)",
            boxShadow: "0 8px 30px rgba(8,145,178,0.35)",
            letterSpacing: "0.08em",
            fontSize: "0.95rem",
          }}
        >
          🌙 무의식의 도화지 열기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 챕터 3 아코디언 섹션 정의 + 레이더 대시보드
// ─────────────────────────────────────────────────────────────────

const CH3_SECTIONS = [
  {
    key: "persona" as const,
    title: "사회적 페르소나",
    icon: "🎭",
    accent: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.25)",
    label: "rgba(52,211,153,0.85)",
    labelText: "social persona",
  },
  {
    key: "branding" as const,
    title: "퍼스널 브랜딩 전략",
    icon: "✨",
    accent: "rgba(20,184,166,0.12)",
    border: "rgba(20,184,166,0.25)",
    label: "rgba(45,212,191,0.85)",
    labelText: "personal branding",
  },
  {
    key: "environment" as const,
    title: "환경 세팅",
    icon: "🌍",
    accent: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.22)",
    label: "rgba(103,232,249,0.85)",
    labelText: "environment setup",
  },
] as const;

function Ch3Accordion({
  section,
  index,
  text,
}: {
  section: (typeof CH3_SECTIONS)[number];
  index: number;
  text: string;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div
      className="overflow-hidden rounded-2xl transition-all duration-300"
      style={{
        background: open ? section.accent : "rgba(255,255,255,0.03)",
        border: `1px solid ${open ? section.border : "rgba(255,255,255,0.07)"}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{section.icon}</span>
          <div>
            <p
              className="font-bold tracking-[0.06em]"
              style={{ color: open ? section.label : "rgba(226,232,240,0.7)", fontSize: "0.98rem" }}
            >
              {section.title}
            </p>
            <p
              className="uppercase tracking-[0.15em] mt-0.5"
              style={{ fontSize: "0.62rem", color: "rgba(148,163,184,0.5)" }}
            >
              {section.labelText}
            </p>
          </div>
        </div>
        <span
          className="shrink-0 transition-transform duration-300"
          style={{
            color: section.label,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            fontSize: "0.8rem",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          className="px-5 pb-6 pt-2"
          style={{ borderTop: `1px solid ${section.border}` }}
        >
          {text
            ? text.split(/\n{2,}/).map((para, i) => (
                <p
                  key={i}
                  style={{
                    lineHeight: 2.05,
                    letterSpacing: "0.025em",
                    color: "rgba(203,213,225,0.85)",
                    fontSize: "0.95rem",
                    marginBottom: "1.3em",
                  }}
                >
                  {para.replace(/\n/g, " ")}
                </p>
              ))
            : null}
        </div>
      )}
    </div>
  );
}

function Chapter3RadarDashboard({
  step,
  result,
  onRequest,
}: {
  step: "idle" | "loading" | "done";
  result: Chapter3Result | null;
  onRequest: () => void;
  characterTitle?: string;
}) {
  if (step === "loading") {
    return (
      <div
        className="rounded-3xl overflow-hidden px-6 py-12 flex flex-col items-center gap-5"
        style={{
          background: "rgba(16,185,129,0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(16,185,129,0.15)",
        }}
      >
        <div className="relative h-16 w-16">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{ border: "2px solid rgba(16,185,129,0.3)" }}
          />
          <div
            className="absolute inset-2 rounded-full animate-spin"
            style={{
              border: "2px solid rgba(45,212,191,0.3)",
              animationDirection: "reverse",
              animationDuration: "2s",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🌍</div>
        </div>
        <div className="text-center">
          <p
            className="font-semibold tracking-[0.2em]"
            style={{ color: "rgba(52,211,153,0.8)", fontSize: "0.82rem" }}
          >
            세상이라는 무대를 펼치는 중
          </p>
          <p
            className="mt-1 tracking-[0.08em]"
            style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.73rem" }}
          >
            천이궁의 별들을 해석하고 있습니다…
          </p>
        </div>
      </div>
    );
  }

  if (step === "done" && result) {
    const ci = result.palace.cheonigong;
    const radarData = result.radarScores.map((r) => ({
      subject: r.axis,
      value: r.value,
      fullMark: 100,
    }));

    return (
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, rgba(5,150,105,0.08) 0%, rgba(8,145,178,0.06) 60%, rgba(15,23,42,0.3) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(16,185,129,0.2)",
          boxShadow: "0 8px 40px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* 헤더 */}
        <div
          className="px-6 pt-7 pb-5"
          style={{
            borderBottom: "1px solid rgba(16,185,129,0.12)",
            background:
              "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.05) 100%)",
          }}
        >
          <p
            className="uppercase tracking-[0.25em] font-medium"
            style={{ color: "rgba(52,211,153,0.7)", fontSize: "0.68rem" }}
          >
            Chapter 03 · Social Stage
          </p>
          <h3
            className="mt-2 font-black text-white"
            style={{
              fontSize: "clamp(1.4rem, 3.5vw, 1.9rem)",
              lineHeight: 1.3,
              letterSpacing: "0.03em",
              textShadow: "0 0 30px rgba(16,185,129,0.3)",
            }}
          >
            세상이라는 무대
          </h3>
          <p
            className="mt-2 font-light"
            style={{
              color: "rgba(167,243,208,0.6)",
              lineHeight: 1.95,
              letterSpacing: "0.04em",
              fontSize: "0.88rem",
            }}
          >
            천이궁의 별들이 그리는 당신의 사회적 에너지와 퍼스널 브랜딩 지도
          </p>

          {/* 천이궁 별 뱃지 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {ci.stars.length > 0 &&
              ci.stars.map((s) => (
                <span
                  key={s}
                  className="rounded-full px-3 py-1 text-xs font-semibold tracking-[0.1em]"
                  style={{
                    background: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    color: "rgba(52,211,153,0.9)",
                  }}
                >
                  {s}
                </span>
              ))}
            {ci.aux.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1 text-xs font-medium tracking-[0.1em]"
                style={{
                  background: "rgba(20,184,166,0.12)",
                  border: "1px solid rgba(20,184,166,0.25)",
                  color: "rgba(45,212,191,0.8)",
                }}
              >
                {s}
              </span>
            ))}
            {ci.bad.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1 text-xs font-medium tracking-[0.1em]"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.22)",
                  color: "rgba(251,113,133,0.8)",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 레이더 차트 */}
        <div
          className="px-4 pt-5 pb-2"
          style={{ borderBottom: "1px solid rgba(16,185,129,0.08)" }}
        >
          <p
            className="text-center font-medium tracking-[0.18em] mb-3"
            style={{ color: "rgba(52,211,153,0.6)", fontSize: "0.68rem" }}
          >
            사회 에너지 지수 RADAR
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
              <PolarGrid stroke="rgba(52,211,153,0.12)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{
                  fill: "rgba(167,243,208,0.8)",
                  fontSize: 11,
                  fontWeight: 500,
                }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="에너지 지수"
                dataKey="value"
                stroke="rgba(52,211,153,0.85)"
                fill="rgba(52,211,153,0.18)"
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* 점수 바 리스트 */}
          <div className="mt-2 mb-4 space-y-2.5">
            {result.radarScores.map((r) => (
              <div key={r.axis}>
                <div className="flex items-center justify-between mb-1">
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "rgba(167,243,208,0.75)",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {r.axis}
                  </span>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "rgba(52,211,153,0.9)",
                    }}
                  >
                    {r.value}
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${r.value}%`,
                      background:
                        "linear-gradient(90deg, rgba(16,185,129,0.6) 0%, rgba(52,211,153,0.9) 100%)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 아코디언 */}
        <div className="px-5 py-5 space-y-3">
          {CH3_SECTIONS.map((sec, i) => (
            <Ch3Accordion
              key={sec.key}
              section={sec}
              index={i}
              text={
                sec.key === "persona"
                  ? result.chapter3.persona
                  : sec.key === "branding"
                    ? result.chapter3.branding
                    : result.chapter3.environment
              }
            />
          ))}
        </div>
      </div>
    );
  }

  // ── 티저 (idle) ────────────────────────────────────────────────
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg, rgba(5,150,105,0.06) 0%, rgba(15,23,42,0.5) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(16,185,129,0.15)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="px-6 pt-6 pb-5"
        style={{ borderBottom: "1px solid rgba(16,185,129,0.1)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
            style={{
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.3)",
            }}
          >
            🌍
          </div>
          <div>
            <p
              className="uppercase tracking-[0.2em] font-medium"
              style={{ color: "rgba(52,211,153,0.65)", fontSize: "0.65rem" }}
            >
              Chapter 03 · Unlock
            </p>
            <p
              className="font-bold tracking-[0.04em] text-white"
              style={{ fontSize: "1.05rem" }}
            >
              세상이라는 무대
            </p>
          </div>
        </div>

        <p
          className="font-light"
          style={{
            color: "rgba(167,243,208,0.6)",
            lineHeight: 1.95,
            letterSpacing: "0.04em",
            fontSize: "0.88rem",
          }}
        >
          천이궁(遷移宮)은 집 밖의 세상과 당신이 만나는 방식을 지배합니다.{" "}
          당신의{" "}
          <span style={{ color: "rgba(52,211,153,0.85)", fontWeight: 600 }}>
            사회적 페르소나
          </span>
          ,{" "}
          <span style={{ color: "rgba(45,212,191,0.8)", fontWeight: 600 }}>
            퍼스널 브랜딩 전략
          </span>
          , 그리고{" "}
          <span style={{ color: "rgba(103,232,249,0.85)", fontWeight: 600 }}>
            최적 환경 세팅
          </span>
          을 레이더 차트로 확인하세요.
        </p>

        <div className="mt-4 space-y-1.5">
          {CH3_SECTIONS.map((sec) => (
            <div
              key={sec.key}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-base">{sec.icon}</span>
              <span
                className="text-sm font-medium tracking-[0.04em]"
                style={{ color: "rgba(203,213,225,0.7)" }}
              >
                {sec.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        <button
          type="button"
          onClick={onRequest}
          className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)",
            boxShadow: "0 8px 30px rgba(16,185,129,0.35)",
            letterSpacing: "0.08em",
            fontSize: "0.95rem",
          }}
        >
          🌍 세상이라는 무대 열기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 챕터 4 컴포넌트: 커리어 대시보드
// ─────────────────────────────────────────────────────────────────

/** 양방향 프로그레스 바 (0=왼쪽 극단, 100=오른쪽 극단) */
function WorkStyleBiBar({
  value,
  leftLabel,
  rightLabel,
}: {
  value: number;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ fontSize: "0.78rem", color: "rgba(253,186,116,0.85)", fontWeight: 600 }}>
          {leftLabel}
        </span>
        <span style={{ fontSize: "0.78rem", color: "rgba(251,191,36,0.9)", fontWeight: 600 }}>
          {rightLabel}
        </span>
      </div>
      <div
        className="relative h-3 rounded-full"
        style={{ background: "rgba(255,255,255,0.07)" }}
      >
        {/* 왼쪽 절반 배경 tint */}
        <div
          className="absolute inset-y-0 left-0 right-1/2 rounded-l-full"
          style={{ background: "rgba(253,186,116,0.08)" }}
        />
        {/* 오른쪽 절반 배경 tint */}
        <div
          className="absolute inset-y-0 left-1/2 right-0 rounded-r-full"
          style={{ background: "rgba(251,191,36,0.08)" }}
        />
        {/* 중앙 마커 */}
        <div
          className="absolute inset-y-0 w-px"
          style={{ left: "50%", background: "rgba(255,255,255,0.15)" }}
        />
        {/* 포지션 인디케이터 */}
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            left: `${Math.min(Math.max(value - 8, 0), 84)}%`,
            width: "16%",
            background:
              value >= 50
                ? "linear-gradient(90deg, rgba(251,191,36,0.5) 0%, rgba(251,191,36,0.9) 100%)"
                : "linear-gradient(90deg, rgba(253,186,116,0.9) 0%, rgba(253,186,116,0.5) 100%)",
            transition: "left 0.5s ease",
          }}
        />
        {/* 포인터 마커 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full"
          style={{
            left: `calc(${value}% - 1.5px)`,
            background: value >= 50 ? "rgba(251,191,36,1)" : "rgba(253,186,116,1)",
            boxShadow: `0 0 6px ${value >= 50 ? "rgba(251,191,36,0.8)" : "rgba(253,186,116,0.8)"}`,
          }}
        />
      </div>
      {/* 현재 위치 레이블 */}
      <div className="mt-1 text-center">
        <span
          style={{
            fontSize: "0.7rem",
            color: "rgba(253,230,138,0.7)",
            letterSpacing: "0.06em",
          }}
        >
          ◆ {value >= 65 ? rightLabel : value >= 35 ? "균형형" : leftLabel}
          {" "}({value}점)
        </span>
      </div>
    </div>
  );
}

/** 단방향 프로그레스 바 */
function CareerProgressBar({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: "0.9rem" }}>{icon}</span>
          <span style={{ fontSize: "0.8rem", color: "rgba(253,230,138,0.8)", fontWeight: 500 }}>
            {label}
          </span>
        </div>
        <span
          style={{ fontSize: "0.82rem", fontWeight: 700, color: "rgba(251,191,36,0.9)" }}
        >
          {value}
        </span>
      </div>
      <div
        className="h-2 rounded-full"
        style={{ background: "rgba(255,255,255,0.07)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background:
              "linear-gradient(90deg, rgba(180,120,20,0.7) 0%, rgba(251,191,36,0.9) 100%)",
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

/** 핵심 인사이트 블록인용구 */
function CareerBlockquote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div
      className="my-5 rounded-xl px-5 py-4"
      style={{
        background: "rgba(251,191,36,0.07)",
        borderLeft: "3px solid rgba(251,191,36,0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <p
        className="italic leading-[1.9]"
        style={{
          color: "rgba(253,230,138,0.9)",
          fontSize: "0.95rem",
          letterSpacing: "0.03em",
        }}
      >
        &ldquo;{text}&rdquo;
      </p>
    </div>
  );
}

const CH4_SECTIONS = [
  {
    key: "drive" as const,
    quoteKey: "driveQuote" as const,
    title: "업무 적성과 드라이브",
    icon: "🚀",
    accent: "rgba(180,83,9,0.12)",
    border: "rgba(217,119,6,0.25)",
    label: "rgba(251,191,36,0.9)",
    labelText: "work drive",
  },
  {
    key: "toolkit" as const,
    quoteKey: "toolkitQuote" as const,
    title: "강점 극대화 툴킷",
    icon: "🛠️",
    accent: "rgba(161,98,7,0.12)",
    border: "rgba(202,138,4,0.25)",
    label: "rgba(253,224,71,0.85)",
    labelText: "strength toolkit",
  },
  {
    key: "office" as const,
    quoteKey: "officeQuote" as const,
    title: "오피스 심리학",
    icon: "🎯",
    accent: "rgba(120,53,15,0.12)",
    border: "rgba(180,83,9,0.25)",
    label: "rgba(253,186,116,0.9)",
    labelText: "office psychology",
  },
] as const;

function Ch4Accordion({
  section,
  index,
  text,
  quote,
}: {
  section: (typeof CH4_SECTIONS)[number];
  index: number;
  text: string;
  quote: string;
}) {
  const [open, setOpen] = useState(index === 0);

  const paragraphs = text
    ? text
        .replace(/\[QUOTE\]:[^\n]*/g, "")   // QUOTE 마커 제거
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className="overflow-hidden rounded-2xl transition-all duration-300"
      style={{
        background: open ? section.accent : "rgba(255,255,255,0.03)",
        border: `1px solid ${open ? section.border : "rgba(255,255,255,0.07)"}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{section.icon}</span>
          <div>
            <p
              className="font-bold tracking-[0.06em]"
              style={{ color: open ? section.label : "rgba(226,232,240,0.7)", fontSize: "0.98rem" }}
            >
              {section.title}
            </p>
            <p
              className="uppercase tracking-[0.15em] mt-0.5"
              style={{ fontSize: "0.62rem", color: "rgba(148,163,184,0.5)" }}
            >
              {section.labelText}
            </p>
          </div>
        </div>
        <span
          className="shrink-0 transition-transform duration-300"
          style={{
            color: section.label,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            fontSize: "0.8rem",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          className="px-5 pb-6 pt-2"
          style={{ borderTop: `1px solid ${section.border}` }}
        >
          {/* 핵심 인사이트 블록인용구 */}
          {quote && <CareerBlockquote text={quote} />}
          {/* 본문 — 단락 사이에 blockquote 간격 */}
          {paragraphs.map((para, i) => (
            <p
              key={i}
              style={{
                lineHeight: 2.05,
                letterSpacing: "0.025em",
                color: "rgba(203,213,225,0.85)",
                fontSize: "0.95rem",
                marginBottom: "1.3em",
              }}
            >
              {para.replace(/\n/g, " ")}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Chapter4CareerDashboard({
  step,
  result,
  onRequest,
}: {
  step: "idle" | "loading" | "done";
  result: Chapter4Result | null;
  onRequest: () => void;
  characterTitle?: string;
}) {
  if (step === "loading") {
    return (
      <div
        className="rounded-3xl overflow-hidden px-6 py-12 flex flex-col items-center gap-5"
        style={{
          background: "rgba(180,83,9,0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(217,119,6,0.15)",
        }}
      >
        <div className="relative h-16 w-16">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{ border: "2px solid rgba(217,119,6,0.35)" }}
          />
          <div
            className="absolute inset-2 rounded-full animate-spin"
            style={{
              border: "2px solid rgba(251,191,36,0.3)",
              animationDirection: "reverse",
              animationDuration: "2s",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🚀</div>
        </div>
        <div className="text-center">
          <p
            className="font-semibold tracking-[0.2em]"
            style={{ color: "rgba(251,191,36,0.8)", fontSize: "0.82rem" }}
          >
            커리어의 별지도를 그리는 중
          </p>
          <p
            className="mt-1 tracking-[0.08em]"
            style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.73rem" }}
          >
            관록궁의 별들을 해석하고 있습니다…
          </p>
        </div>
      </div>
    );
  }

  if (step === "done" && result) {
    const gw = result.palace.gwanrokgong;
    const ws = result.workStyle;

    return (
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, rgba(120,53,15,0.1) 0%, rgba(30,20,5,0.3) 60%, rgba(15,12,3,0.4) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(217,119,6,0.22)",
          boxShadow:
            "0 8px 40px rgba(180,83,9,0.13), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* 헤더 */}
        <div
          className="px-6 pt-7 pb-5"
          style={{
            borderBottom: "1px solid rgba(217,119,6,0.12)",
            background:
              "linear-gradient(135deg, rgba(180,83,9,0.1) 0%, rgba(120,53,15,0.08) 100%)",
          }}
        >
          <p
            className="uppercase tracking-[0.25em] font-medium"
            style={{ color: "rgba(251,191,36,0.7)", fontSize: "0.68rem" }}
          >
            Chapter 04 · Career &amp; Achievement
          </p>
          <h3
            className="mt-2 font-black text-white"
            style={{
              fontSize: "clamp(1.4rem, 3.5vw, 1.9rem)",
              lineHeight: 1.3,
              letterSpacing: "0.03em",
              textShadow: "0 0 30px rgba(217,119,6,0.3)",
            }}
          >
            커리어와 성취
          </h3>
          <p
            className="mt-2 font-light"
            style={{
              color: "rgba(253,230,138,0.6)",
              lineHeight: 1.95,
              letterSpacing: "0.04em",
              fontSize: "0.88rem",
            }}
          >
            관록궁의 별들이 드러내는 당신의 업무 DNA와 성취 패턴
          </p>

          {/* 관록궁 별 뱃지 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {gw.stars.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1 text-xs font-semibold tracking-[0.1em]"
                style={{
                  background: "rgba(217,119,6,0.15)",
                  border: "1px solid rgba(217,119,6,0.3)",
                  color: "rgba(251,191,36,0.9)",
                }}
              >
                {s}
              </span>
            ))}
            {gw.aux.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1 text-xs font-medium tracking-[0.1em]"
                style={{
                  background: "rgba(161,98,7,0.12)",
                  border: "1px solid rgba(202,138,4,0.25)",
                  color: "rgba(253,224,71,0.8)",
                }}
              >
                {s}
              </span>
            ))}
            {gw.bad.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1 text-xs font-medium tracking-[0.1em]"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.22)",
                  color: "rgba(251,113,133,0.8)",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 업무 스타일 대시보드 */}
        <div
          className="px-6 py-5 space-y-6"
          style={{ borderBottom: "1px solid rgba(217,119,6,0.1)" }}
        >
          <p
            className="text-center font-medium tracking-[0.18em]"
            style={{ color: "rgba(251,191,36,0.6)", fontSize: "0.68rem" }}
          >
            업무 스타일 DNA
          </p>

          {/* 양방향 프로그레스 바 */}
          <div className="space-y-5">
            <WorkStyleBiBar
              value={ws.independence}
              leftLabel="팀워크 지향"
              rightLabel="독립 지향"
            />
            <WorkStyleBiBar
              value={ws.creativity}
              leftLabel="원칙주의"
              rightLabel="창의성"
            />
          </div>

          {/* 구분선 */}
          <div
            className="h-px"
            style={{ background: "rgba(251,191,36,0.08)" }}
          />

          {/* 단방향 바 */}
          <div className="space-y-3.5">
            <CareerProgressBar label="리더십 지향도" value={ws.leadership} icon="👑" />
            <CareerProgressBar label="실행력" value={ws.execution} icon="⚡" />
            <CareerProgressBar label="전략적 사고" value={ws.strategy} icon="🧠" />
          </div>
        </div>

        {/* 섹션 아코디언 */}
        <div className="px-5 py-5 space-y-3">
          {CH4_SECTIONS.map((sec, i) => (
            <Ch4Accordion
              key={sec.key}
              section={sec}
              index={i}
              text={result.chapter4[sec.key]}
              quote={result.chapter4[sec.quoteKey]}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── 티저 (idle) ──────────────────────────────────────────────
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg, rgba(120,53,15,0.07) 0%, rgba(15,23,42,0.5) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(217,119,6,0.15)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="px-6 pt-6 pb-5"
        style={{ borderBottom: "1px solid rgba(217,119,6,0.1)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
            style={{
              background: "rgba(180,83,9,0.15)",
              border: "1px solid rgba(217,119,6,0.3)",
            }}
          >
            🚀
          </div>
          <div>
            <p
              className="uppercase tracking-[0.2em] font-medium"
              style={{ color: "rgba(251,191,36,0.65)", fontSize: "0.65rem" }}
            >
              Chapter 04 · Unlock
            </p>
            <p
              className="font-bold tracking-[0.04em] text-white"
              style={{ fontSize: "1.05rem" }}
            >
              커리어와 성취
            </p>
          </div>
        </div>

        <p
          className="font-light"
          style={{
            color: "rgba(253,230,138,0.6)",
            lineHeight: 1.95,
            letterSpacing: "0.04em",
            fontSize: "0.88rem",
          }}
        >
          관록궁(官祿宮)은 당신의 업무 DNA가 새겨진 궁입니다.{" "}
          <span style={{ color: "rgba(251,191,36,0.85)", fontWeight: 600 }}>
            업무 적성과 드라이브
          </span>
          ,{" "}
          <span style={{ color: "rgba(253,224,71,0.8)", fontWeight: 600 }}>
            강점 극대화 툴킷
          </span>
          , 그리고{" "}
          <span style={{ color: "rgba(253,186,116,0.85)", fontWeight: 600 }}>
            오피스 심리학
          </span>
          을 레이더로 분석합니다.
        </p>

        <div className="mt-4 space-y-1.5">
          {CH4_SECTIONS.map((sec) => (
            <div
              key={sec.key}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-base">{sec.icon}</span>
              <span
                className="text-sm font-medium tracking-[0.04em]"
                style={{ color: "rgba(203,213,225,0.7)" }}
              >
                {sec.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        <button
          type="button"
          onClick={onRequest}
          className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)",
            boxShadow: "0 8px 30px rgba(180,83,9,0.35)",
            letterSpacing: "0.08em",
            fontSize: "0.95rem",
          }}
        >
          🚀 커리어 DNA 분석하기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 챕터 5 컴포넌트: 재물 흐름 맵
// ─────────────────────────────────────────────────────────────────

/** 재물 Blockquote */
function WealthBlockquote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div
      className="my-5 rounded-xl px-5 py-4"
      style={{
        background: "rgba(134,239,172,0.07)",
        borderLeft: "3px solid rgba(74,222,128,0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <p
        className="italic leading-[1.9]"
        style={{
          color: "rgba(187,247,208,0.9)",
          fontSize: "0.95rem",
          letterSpacing: "0.03em",
        }}
      >
        &ldquo;{text}&rdquo;
      </p>
    </div>
  );
}

/** 재물 흐름 맵: 수익 창출 무기 vs 재정 누수 포인트 */
function WealthFlowMap({ weapons, leaks }: { weapons: WealthItem[]; leaks: WealthItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* 수익 창출 무기 */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(22,163,74,0.08)",
          border: "1px solid rgba(74,222,128,0.2)",
        }}
      >
        <p
          className="font-bold tracking-[0.12em] mb-3"
          style={{ color: "rgba(74,222,128,0.85)", fontSize: "0.68rem" }}
        >
          ⚔ 수익 창출 무기
        </p>
        <ul className="space-y-2.5">
          {weapons.map((w) => (
            <li key={w.key} className="flex items-start gap-2">
              <span className="text-lg leading-none mt-0.5">{w.icon}</span>
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "rgba(187,247,208,0.85)",
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}
              >
                {w.key}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 재정 누수 포인트 */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(220,38,38,0.07)",
          border: "1px solid rgba(248,113,113,0.2)",
        }}
      >
        <p
          className="font-bold tracking-[0.12em] mb-3"
          style={{ color: "rgba(248,113,113,0.85)", fontSize: "0.68rem" }}
        >
          🕳 재정 누수 포인트
        </p>
        <ul className="space-y-2.5">
          {leaks.map((l) => (
            <li key={l.key} className="flex items-start gap-2">
              <span className="text-lg leading-none mt-0.5">{l.icon}</span>
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "rgba(254,202,202,0.85)",
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}
              >
                {l.key}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 재물 단방향 프로그레스 바 */
function WealthProgressBar({ label, value, colorFrom, colorTo, icon }: {
  label: string; value: number; colorFrom: string; colorTo: string; icon: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: "0.9rem" }}>{icon}</span>
          <span style={{ fontSize: "0.8rem", color: "rgba(187,247,208,0.8)", fontWeight: 500 }}>
            {label}
          </span>
        </div>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "rgba(74,222,128,0.9)" }}>
          {value}
        </span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${colorFrom} 0%, ${colorTo} 100%)`,
          }}
        />
      </div>
    </div>
  );
}

const CH5_SECTIONS = [
  {
    key: "wealth" as const,
    quoteKey: "wealthQuote" as const,
    title: "부의 창출 패턴",
    icon: "💎",
    accent: "rgba(22,163,74,0.1)",
    border: "rgba(74,222,128,0.22)",
    label: "rgba(74,222,128,0.9)",
    labelText: "wealth creation",
  },
  {
    key: "leak" as const,
    quoteKey: "leakQuote" as const,
    title: "재정 누수 원인",
    icon: "🕳️",
    accent: "rgba(220,38,38,0.08)",
    border: "rgba(248,113,113,0.22)",
    label: "rgba(248,113,113,0.85)",
    labelText: "financial leakage",
  },
  {
    key: "correct" as const,
    quoteKey: "correctQuote" as const,
    title: "현대적 액땜: 금융 행동 교정",
    icon: "🌿",
    accent: "rgba(20,184,166,0.1)",
    border: "rgba(45,212,191,0.22)",
    label: "rgba(45,212,191,0.85)",
    labelText: "behavioral finance fix",
  },
] as const;

function Ch5Accordion({
  section,
  index,
  text,
  quote,
}: {
  section: (typeof CH5_SECTIONS)[number];
  index: number;
  text: string;
  quote: string;
}) {
  const [open, setOpen] = useState(index === 0);
  const paragraphs = text
    ? text.replace(/\[QUOTE\]:[^\n]*/g, "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <div
      className="overflow-hidden rounded-2xl transition-all duration-300"
      style={{
        background: open ? section.accent : "rgba(255,255,255,0.03)",
        border: `1px solid ${open ? section.border : "rgba(255,255,255,0.07)"}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* ── Sticky 섹션 헤더 ── */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: open
            ? `linear-gradient(135deg, ${section.accent}, rgba(10,10,30,0.92))`
            : "rgba(10,10,30,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: open ? `1px solid ${section.border}` : "none",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{section.icon}</span>
            <div>
              <p
                className="font-bold tracking-[0.06em]"
                style={{ color: open ? section.label : "rgba(226,232,240,0.7)", fontSize: "0.98rem" }}
              >
                {section.title}
              </p>
              <p
                className="uppercase tracking-[0.15em] mt-0.5"
                style={{ fontSize: "0.62rem", color: "rgba(148,163,184,0.5)" }}
              >
                {section.labelText}
              </p>
            </div>
          </div>
          <span
            className="shrink-0 transition-transform duration-300"
            style={{
              color: section.label,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              fontSize: "0.8rem",
            }}
          >
            ▾
          </span>
        </button>
      </div>

      {open && (
        <div className="px-5 pb-6 pt-3">
          {quote && <WealthBlockquote text={quote} />}
          {paragraphs.map((para, i) => (
            <p
              key={i}
              style={{
                lineHeight: 2.05,
                letterSpacing: "0.025em",
                color: "rgba(203,213,225,0.85)",
                fontSize: "0.95rem",
                marginBottom: "1.3em",
              }}
            >
              {para.replace(/\n/g, " ")}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Chapter5WealthDashboard({
  step,
  result,
  onRequest,
}: {
  step: "idle" | "loading" | "done";
  result: Chapter5Result | null;
  onRequest: () => void;
  characterTitle?: string;
}) {
  if (step === "loading") {
    return (
      <div
        className="rounded-3xl overflow-hidden px-6 py-12 flex flex-col items-center gap-5"
        style={{
          background: "rgba(22,163,74,0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(74,222,128,0.15)",
        }}
      >
        <div className="relative h-16 w-16">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{ border: "2px solid rgba(74,222,128,0.3)" }}
          />
          <div
            className="absolute inset-2 rounded-full animate-spin"
            style={{
              border: "2px solid rgba(45,212,191,0.25)",
              animationDirection: "reverse",
              animationDuration: "2s",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">💎</div>
        </div>
        <div className="text-center">
          <p
            className="font-semibold tracking-[0.2em]"
            style={{ color: "rgba(74,222,128,0.8)", fontSize: "0.82rem" }}
          >
            재물 흐름 지도를 그리는 중
          </p>
          <p
            className="mt-1 tracking-[0.08em]"
            style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.73rem" }}
          >
            재백궁의 별들을 해석하고 있습니다…
          </p>
        </div>
      </div>
    );
  }

  if (step === "done" && result) {
    const jb = result.palace.jaebaekkong;
    const ws = result.wealthScores;

    return (
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, rgba(5,46,22,0.15) 0%, rgba(5,30,18,0.2) 60%, rgba(15,23,42,0.35) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(74,222,128,0.2)",
          boxShadow:
            "0 8px 40px rgba(22,163,74,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* 헤더 */}
        <div
          className="px-6 pt-7 pb-5"
          style={{
            borderBottom: "1px solid rgba(74,222,128,0.1)",
            background:
              "linear-gradient(135deg, rgba(22,163,74,0.1) 0%, rgba(5,150,105,0.07) 100%)",
          }}
        >
          <p
            className="uppercase tracking-[0.25em] font-medium"
            style={{ color: "rgba(74,222,128,0.7)", fontSize: "0.68rem" }}
          >
            Chapter 05 · Wealth &amp; Assets
          </p>
          <h3
            className="mt-2 font-black text-white"
            style={{
              fontSize: "clamp(1.4rem, 3.5vw, 1.9rem)",
              lineHeight: 1.3,
              letterSpacing: "0.03em",
              textShadow: "0 0 30px rgba(74,222,128,0.25)",
            }}
          >
            재화와 자산의 흐름
          </h3>
          <p
            className="mt-2 font-light"
            style={{
              color: "rgba(187,247,208,0.6)",
              lineHeight: 1.95,
              letterSpacing: "0.04em",
              fontSize: "0.88rem",
            }}
          >
            재백궁의 별이 만드는 당신의 재물 DNA와 자산 흐름 지도
          </p>

          {/* 재백궁 별 뱃지 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {jb.stars.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1 text-xs font-semibold tracking-[0.1em]"
                style={{
                  background: "rgba(22,163,74,0.15)",
                  border: "1px solid rgba(74,222,128,0.3)",
                  color: "rgba(74,222,128,0.9)",
                }}
              >
                {s}
              </span>
            ))}
            {jb.aux.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1 text-xs font-medium tracking-[0.1em]"
                style={{
                  background: "rgba(5,150,105,0.12)",
                  border: "1px solid rgba(45,212,191,0.25)",
                  color: "rgba(45,212,191,0.8)",
                }}
              >
                {s}
              </span>
            ))}
            {jb.bad.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1 text-xs font-medium tracking-[0.1em]"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.22)",
                  color: "rgba(251,113,133,0.8)",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 재물 흐름 맵 */}
        <div
          className="px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(74,222,128,0.08)" }}
        >
          <p
            className="text-center font-medium tracking-[0.18em] mb-3"
            style={{ color: "rgba(74,222,128,0.6)", fontSize: "0.68rem" }}
          >
            재물 흐름 MAP
          </p>
          <WealthFlowMap weapons={ws.weapons} leaks={ws.leaks} />
        </div>

        {/* 재물 지표 바 */}
        <div
          className="px-6 py-5 space-y-3.5"
          style={{ borderBottom: "1px solid rgba(74,222,128,0.08)" }}
        >
          <p
            className="text-center font-medium tracking-[0.18em] mb-1"
            style={{ color: "rgba(74,222,128,0.6)", fontSize: "0.68rem" }}
          >
            재물 지표
          </p>
          <WealthProgressBar label="수익 창출력" value={ws.income} icon="📈"
            colorFrom="rgba(21,128,61,0.6)" colorTo="rgba(74,222,128,0.9)" />
          <WealthProgressBar label="횡재·기회 수익" value={ws.windfall} icon="⚡"
            colorFrom="rgba(5,150,105,0.6)" colorTo="rgba(45,212,191,0.9)" />
          <WealthProgressBar label="안정 자산 성향" value={ws.stable} icon="🏛️"
            colorFrom="rgba(30,64,175,0.5)" colorTo="rgba(96,165,250,0.85)" />
          <WealthProgressBar label="능동적 투자 성향" value={ws.active} icon="🎯"
            colorFrom="rgba(120,53,15,0.5)" colorTo="rgba(251,191,36,0.85)" />
          <WealthProgressBar label="재정 누수 위험" value={ws.loss} icon="🕳️"
            colorFrom="rgba(153,27,27,0.5)" colorTo="rgba(248,113,113,0.85)" />
        </div>

        {/* 섹션 아코디언 (Sticky Header 내장) */}
        <div className="px-5 py-5 space-y-3">
          {CH5_SECTIONS.map((sec, i) => (
            <Ch5Accordion
              key={sec.key}
              section={sec}
              index={i}
              text={result.chapter5[sec.key]}
              quote={result.chapter5[sec.quoteKey]}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── 티저 (idle) ──────────────────────────────────────────────
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg, rgba(5,46,22,0.08) 0%, rgba(15,23,42,0.5) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(74,222,128,0.15)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="px-6 pt-6 pb-5"
        style={{ borderBottom: "1px solid rgba(74,222,128,0.1)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
            style={{
              background: "rgba(22,163,74,0.15)",
              border: "1px solid rgba(74,222,128,0.3)",
            }}
          >
            💎
          </div>
          <div>
            <p
              className="uppercase tracking-[0.2em] font-medium"
              style={{ color: "rgba(74,222,128,0.65)", fontSize: "0.65rem" }}
            >
              Chapter 05 · Unlock
            </p>
            <p
              className="font-bold tracking-[0.04em] text-white"
              style={{ fontSize: "1.05rem" }}
            >
              재화와 자산의 흐름
            </p>
          </div>
        </div>

        <p
          className="font-light"
          style={{
            color: "rgba(187,247,208,0.6)",
            lineHeight: 1.95,
            letterSpacing: "0.04em",
            fontSize: "0.88rem",
          }}
        >
          재백궁(財帛宮)은 당신의 재물 DNA가 새겨진 궁입니다.{" "}
          <span style={{ color: "rgba(74,222,128,0.85)", fontWeight: 600 }}>
            수익 창출 무기
          </span>
          ,{" "}
          <span style={{ color: "rgba(248,113,113,0.8)", fontWeight: 600 }}>
            재정 누수 포인트
          </span>
          , 그리고{" "}
          <span style={{ color: "rgba(45,212,191,0.85)", fontWeight: 600 }}>
            현대적 자산 교정법
          </span>
          을 재물 흐름 맵으로 확인하세요.
        </p>

        <div className="mt-4 space-y-1.5">
          {CH5_SECTIONS.map((sec) => (
            <div
              key={sec.key}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-base">{sec.icon}</span>
              <span
                className="text-sm font-medium tracking-[0.04em]"
                style={{ color: "rgba(203,213,225,0.7)" }}
              >
                {sec.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        <button
          type="button"
          onClick={onRequest}
          className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, #14532d 0%, #15803d 50%, #16a34a 100%)",
            boxShadow: "0 8px 30px rgba(22,163,74,0.35)",
            letterSpacing: "0.08em",
            fontSize: "0.95rem",
          }}
        >
          💎 재물 흐름 맵 열기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chapter 6: 파트너십과 로맨스 컴포넌트
// ─────────────────────────────────────────────────────────────────

const ROMANCE_ARCHETYPE_MAP: Record<string, { label: string; icon: string; desc: string }> = {
  "자미":   { label: "왕좌의 연인",    icon: "👑", desc: "존재만으로 상대를 끌어당기는 자력형" },
  "천기":   { label: "관계 전략가",    icon: "🧠", desc: "상대를 깊이 이해하기 전엔 쉽게 열지 않는 분석형" },
  "태양":   { label: "열정의 태양",    icon: "☀️", desc: "관계에 빛과 열정을 공급하는 에너지 발산형" },
  "무곡":   { label: "신뢰의 기둥",    icon: "⚔️", desc: "실질적인 안정과 헌신으로 사랑하는 현실파" },
  "천동":   { label: "영원한 청춘",    icon: "🌸", desc: "사랑 안에서 자유롭고 유쾌한 낙천형" },
  "염정":   { label: "불꽃의 연인",    icon: "🔥", desc: "뜨겁고 강렬하게 사랑하고 이별도 극적인 불꽃형" },
  "천부":   { label: "헌신의 수호자",  icon: "🛡️", desc: "상대를 보호하고 안정감을 주는 든든한 보호자형" },
  "태음":   { label: "달빛 공감자",    icon: "🌙", desc: "감성적 교감으로 상대의 마음을 어루만지는 치유형" },
  "탐랑":   { label: "매혹의 마그넷",  icon: "🐺", desc: "자연스러운 카리스마로 상대를 끌어들이는 유혹형" },
  "거문":   { label: "영혼의 대화자",  icon: "🗣️", desc: "깊은 대화와 지적 교감으로 연결되는 내면형" },
  "천상":   { label: "완벽한 조력자",  icon: "🤝", desc: "상대를 빛나게 해주는 사심 없는 서포터형" },
  "천량":   { label: "현명한 동반자",  icon: "🏛️", desc: "성숙한 시각으로 관계를 가이드하는 멘토형" },
  "칠살":   { label: "독립적 연인",    icon: "⚡", desc: "자신만의 세계를 지키면서 깊이 사랑하는 고독형" },
  "파군":   { label: "혁명적 파트너", icon: "💥", desc: "관계의 틀을 깨고 새로운 방식으로 사랑하는 이단아형" },
};

const CORAL = "rgba(255,107,107,1)";
const CORAL_SOFT = "rgba(255,160,130,1)";
const CORAL_GLOW = "rgba(255,107,107,0.55)";

function RomanceBlockquote({ children }: { children: string }) {
  if (!children) return null;
  return (
    <blockquote
      className="my-4 rounded-xl px-4 py-3 italic"
      style={{
        borderLeft: `3px solid ${CORAL}`,
        background: "rgba(255,107,107,0.07)",
        color: CORAL_SOFT,
        fontSize: "0.93rem",
        lineHeight: 1.85,
        letterSpacing: "0.03em",
      }}
    >
      &ldquo;{children}&rdquo;
    </blockquote>
  );
}

// Ch6 미니 점수 바
function Ch6MiniBar({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  const fill = danger
    ? `rgba(251,113,133,${0.5 + value / 200})`
    : `linear-gradient(90deg, ${CORAL}, ${CORAL_SOFT})`;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span style={{ color: "rgba(203,213,225,0.75)", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <span style={{ color: danger ? "rgba(251,113,133,0.9)" : CORAL_SOFT, fontSize: "0.72rem", fontWeight: 700 }}>
          {value}점
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: fill }}
        />
      </div>
    </div>
  );
}

// 3D 플립 카드
function FlipCard({
  isFlipped,
  onFlip,
  frontContent,
  backContent,
}: {
  isFlipped: boolean;
  onFlip: () => void;
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
}) {
  return (
    <div
      onClick={onFlip}
      style={{ perspective: "1200px", cursor: "pointer", minHeight: "400px" }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "400px",
          transformStyle: "preserve-3d",
          transition: "transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* 앞면 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {frontContent}
        </div>
        {/* 뒷면 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            overflow: "hidden",
          }}
        >
          {backContent}
        </div>
      </div>
    </div>
  );
}

const CH6_CARD_DEFS = [
  {
    key:        "attraction" as const,
    quoteKey:   "attractionQuote" as const,
    sectionNum: "01",
    title:      "무의식적 끌림",
    subtitle:   "거울 효과",
    frontIcon:  "💞",
    scoreLabel: "매력 지수",
    scoreKey:   "attraction" as const,
  },
  {
    key:        "blindSpot" as const,
    quoteKey:   "blindSpotQuote" as const,
    sectionNum: "02",
    title:      "관계의 맹점",
    subtitle:   "반복 패턴 분석",
    frontIcon:  "🧿",
    scoreLabel: "맹점 위험도",
    scoreKey:   "blindSpot" as const,
  },
  {
    key:        "boundary" as const,
    quoteKey:   "boundaryQuote" as const,
    sectionNum: "03",
    title:      "바운더리 훈련",
    subtitle:   "경계선 설정법",
    frontIcon:  "🛡️",
    scoreLabel: "경계선 능력",
    scoreKey:   "boundary" as const,
  },
] as const;

function Chapter6RomanceDashboard({
  step,
  result,
  onRequest,
}: {
  step: "idle" | "loading" | "done";
  result: Chapter6Result | null;
  onRequest: () => void;
}) {
  const [flipped, setFlipped] = React.useState([false, false, false]);

  function toggleCard(idx: number) {
    setFlipped((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  }

  if (step === "loading") {
    return (
      <div
        className="rounded-3xl overflow-hidden px-6 py-12 flex flex-col items-center gap-5"
        style={{
          background: "rgba(255,107,107,0.05)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: `1px solid rgba(255,107,107,0.15)`,
        }}
      >
        <div className="relative h-16 w-16">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{ border: `2px solid rgba(255,107,107,0.35)` }}
          />
          <div
            className="absolute inset-2 rounded-full animate-spin"
            style={{
              border: `2px solid rgba(255,160,130,0.2)`,
              animationDirection: "reverse",
              animationDuration: "2s",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">💞</div>
        </div>
        <div className="text-center">
          <p
            className="font-semibold tracking-[0.2em]"
            style={{ color: "rgba(255,160,130,0.85)", fontSize: "0.82rem" }}
          >
            관계의 지도를 그리는 중
          </p>
          <p
            className="mt-1 tracking-[0.08em]"
            style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.73rem" }}
          >
            부처궁의 별들을 해석하고 있습니다…
          </p>
        </div>
      </div>
    );
  }

  if (step === "done" && result) {
    const bucheo = result.palace.bucheo;
    const rs = result.relationshipScores;
    const ch6 = result.chapter6;
    const primaryStar = bucheo.stars[0] || "";
    const archetype = ROMANCE_ARCHETYPE_MAP[primaryStar] || { label: "낭만적 영혼", icon: "🌹", desc: "깊고 진실한 방식으로 사랑하는 타입" };

    return (
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, rgba(55,10,10,0.18) 0%, rgba(40,10,10,0.22) 60%, rgba(15,23,42,0.35) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: `1px solid rgba(255,107,107,0.2)`,
          boxShadow: `0 8px 40px rgba(255,107,107,0.08), inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        {/* 헤더 */}
        <div
          className="px-6 pt-7 pb-5"
          style={{
            borderBottom: `1px solid rgba(255,107,107,0.1)`,
            background:
              "linear-gradient(135deg, rgba(255,107,107,0.1) 0%, rgba(255,160,130,0.06) 100%)",
          }}
        >
          <p
            className="uppercase tracking-[0.25em] font-medium"
            style={{ color: "rgba(255,160,130,0.7)", fontSize: "0.68rem" }}
          >
            Chapter 06 · Partnership &amp; Romance
          </p>
          <h3
            className="mt-2 font-black text-white"
            style={{
              fontSize: "clamp(1.4rem, 3.5vw, 1.9rem)",
              lineHeight: 1.3,
              letterSpacing: "0.03em",
              textShadow: `0 0 30px rgba(255,107,107,0.25)`,
            }}
          >
            파트너십과 로맨스
          </h3>
          <p
            className="mt-2 font-light"
            style={{
              color: "rgba(255,214,200,0.6)",
              lineHeight: 1.95,
              letterSpacing: "0.04em",
              fontSize: "0.88rem",
            }}
          >
            부처궁의 별이 만드는 당신의 사랑 DNA — 끌림의 근원과 관계의 패턴
          </p>
        </div>

        {/* 아키타입 배너 */}
        <div className="px-6 pt-6 pb-4">
          <div
            className="rounded-2xl px-5 py-4 flex items-center gap-4"
            style={{
              background: "rgba(255,107,107,0.08)",
              border: `1px solid rgba(255,107,107,0.2)`,
            }}
          >
            <span className="text-4xl">{archetype.icon}</span>
            <div>
              <p style={{ color: "rgba(255,160,130,0.7)", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                연애 아키타입
              </p>
              <p className="font-black text-white" style={{ fontSize: "1.2rem", letterSpacing: "0.04em" }}>
                {archetype.label}
              </p>
              <p style={{ color: "rgba(255,200,185,0.65)", fontSize: "0.82rem", marginTop: "0.2rem" }}>
                {archetype.desc}
              </p>
            </div>
          </div>

          {/* 관계 점수 4종 바 */}
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
            <Ch6MiniBar label="💞 매력 지수"    value={rs.attraction} />
            <Ch6MiniBar label="🤝 유대감"        value={rs.bonding}    />
            <Ch6MiniBar label="🛡️ 경계선 능력"  value={rs.boundary}   />
            <Ch6MiniBar label="⚠️ 맹점 위험도"  value={rs.blindSpot}  danger />
          </div>
        </div>

        {/* 플립 카드 3종 */}
        <div className="px-4 pb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CH6_CARD_DEFS.map((def, cardIdx) => {
            const sectionText: string = ch6[def.key] || "";
            const quoteText: string   = ch6[def.quoteKey] || "";
            const score               = rs[def.scoreKey];
            const isDanger            = def.key === "blindSpot";

            const bodyText = sectionText
              .replace(/\[QUOTE\]:[^\n]*/g, "")
              .replace(/^#{1,3}[^\n]*\n?/gm, "")
              .trim();

            const frontContent = (
              <div
                className="h-full rounded-2xl flex flex-col justify-between p-5 select-none"
                style={{
                  background: `linear-gradient(145deg, rgba(40,5,5,0.7) 0%, rgba(60,10,10,0.65) 100%)`,
                  border: `1px solid rgba(255,107,107,0.25)`,
                  boxShadow: `0 4px 24px rgba(255,107,107,0.1)`,
                }}
              >
                {/* 상단 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="rounded-full px-2 py-0.5 font-black tabular-nums"
                      style={{
                        background: "rgba(255,107,107,0.15)",
                        color: CORAL_SOFT,
                        fontSize: "0.65rem",
                        letterSpacing: "0.18em",
                      }}
                    >
                      SECTION {def.sectionNum}
                    </span>
                    <span style={{ color: "rgba(255,160,130,0.4)", fontSize: "0.65rem" }}>탭하여 분석 보기 →</span>
                  </div>
                  <div className="text-5xl mb-3">{def.frontIcon}</div>
                  <p className="font-black text-white" style={{ fontSize: "1.1rem", letterSpacing: "0.03em" }}>
                    {def.title}
                  </p>
                  <p style={{ color: "rgba(255,200,185,0.55)", fontSize: "0.78rem", marginTop: "0.25rem" }}>
                    {def.subtitle}
                  </p>
                </div>
                {/* 하단 점수 */}
                <div className="mt-3">
                  <Ch6MiniBar label={def.scoreLabel} value={score} danger={isDanger} />
                  <p
                    className="mt-3 text-center"
                    style={{
                      color: "rgba(255,160,130,0.35)",
                      fontSize: "0.65rem",
                      letterSpacing: "0.1em",
                    }}
                  >
                    ↕ tap to flip
                  </p>
                </div>
              </div>
            );

            const backContent = (
              <div
                className="h-full rounded-2xl flex flex-col"
                style={{
                  background: "rgba(10,5,5,0.92)",
                  border: `1px solid rgba(255,107,107,0.3)`,
                  boxShadow: `0 0 24px rgba(255,107,107,0.12)`,
                }}
              >
                {/* 뒷면 헤더 */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,107,107,0.12)" }}
                >
                  <p className="font-bold text-white" style={{ fontSize: "0.88rem", letterSpacing: "0.04em" }}>
                    {def.frontIcon} {def.title}
                  </p>
                  <span style={{ color: "rgba(255,160,130,0.45)", fontSize: "0.65rem", letterSpacing: "0.08em" }}>
                    탭하여 닫기 ↩
                  </span>
                </div>
                {/* 스크롤 본문 */}
                <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: "320px" }}>
                  {quoteText && <RomanceBlockquote>{quoteText}</RomanceBlockquote>}
                  {bodyText
                    ? bodyText.split(/\n{2,}/).map((para, pi) => (
                        <p
                          key={pi}
                          style={{
                            color: "rgba(255,214,200,0.78)",
                            fontSize: "0.83rem",
                            lineHeight: 1.95,
                            letterSpacing: "0.02em",
                            marginBottom: "0.9em",
                          }}
                        >
                          {para.replace(/\n/g, " ")}
                        </p>
                      ))
                    : (
                      <p style={{ color: "rgba(255,200,185,0.4)", fontSize: "0.8rem" }}>
                        분석 내용을 불러오는 중입니다.
                      </p>
                    )}
                </div>
              </div>
            );

            return (
              <FlipCard
                key={def.key}
                isFlipped={flipped[cardIdx]}
                onFlip={() => toggleCard(cardIdx)}
                frontContent={frontContent}
                backContent={backContent}
              />
            );
          })}
        </div>

        {/* 부처궁 별 배지 */}
        {(bucheo.stars.length > 0 || bucheo.aux.length > 0 || bucheo.bad.length > 0) && (
          <div
            className="mx-4 mb-5 rounded-2xl px-5 py-4"
            style={{
              background: "rgba(255,107,107,0.05)",
              border: `1px solid rgba(255,107,107,0.12)`,
            }}
          >
            <p
              className="uppercase tracking-[0.2em] mb-3"
              style={{ color: "rgba(255,160,130,0.55)", fontSize: "0.65rem" }}
            >
              부처궁(夫妻宮) 성반
            </p>
            <div className="flex flex-wrap gap-2">
              {bucheo.stars.map((s) => (
                <span key={s} className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: "rgba(255,107,107,0.18)", color: CORAL_SOFT }}>
                  {s}
                </span>
              ))}
              {bucheo.aux.map((s) => (
                <span key={s} className="rounded-full px-2.5 py-0.5 text-xs"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(203,213,225,0.6)" }}>
                  {s}
                </span>
              ))}
              {bucheo.bad.map((s) => (
                <span key={s} className="rounded-full px-2.5 py-0.5 text-xs"
                  style={{ background: "rgba(239,68,68,0.12)", color: "rgba(252,165,165,0.7)" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // step === "idle"
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "rgba(30,10,10,0.35)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid rgba(255,107,107,0.18)`,
      }}
    >
      <div className="px-6 pt-7 pb-5 space-y-4">
        <div className="flex items-center gap-4">
          <div
            className="flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{
              background: "rgba(255,107,107,0.15)",
              border: `1px solid rgba(255,107,107,0.3)`,
            }}
          >
            💞
          </div>
          <div>
            <p
              className="uppercase tracking-[0.2em] font-medium"
              style={{ color: "rgba(255,160,130,0.65)", fontSize: "0.65rem" }}
            >
              Chapter 06 · Unlock
            </p>
            <p
              className="font-bold tracking-[0.04em] text-white"
              style={{ fontSize: "1.05rem" }}
            >
              파트너십과 로맨스
            </p>
          </div>
        </div>

        <p
          className="font-light"
          style={{
            color: "rgba(255,214,200,0.6)",
            lineHeight: 1.95,
            letterSpacing: "0.04em",
            fontSize: "0.88rem",
          }}
        >
          부처궁(夫妻宮)은 당신이 사랑하는 방식이 새겨진 궁입니다.{" "}
          <span style={{ color: CORAL_SOFT, fontWeight: 600 }}>무의식적 끌림의 거울 효과</span>,{" "}
          <span style={{ color: "rgba(251,113,133,0.85)", fontWeight: 600 }}>반복 연애 패턴</span>, 그리고{" "}
          <span style={{ color: "rgba(255,200,185,0.85)", fontWeight: 600 }}>건강한 경계선 설정법</span>을 플립 카드로 확인하세요.
        </p>

        <div className="space-y-1.5">
          {CH6_CARD_DEFS.map((sec) => (
            <div
              key={sec.key}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-base">{sec.frontIcon}</span>
              <span
                className="text-sm font-medium tracking-[0.04em]"
                style={{ color: "rgba(203,213,225,0.7)" }}
              >
                {sec.title} — {sec.subtitle}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        <button
          type="button"
          onClick={onRequest}
          className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background:
              `linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #ef4444 100%)`,
            boxShadow: `0 8px 30px rgba(239,68,68,0.3)`,
            letterSpacing: "0.08em",
            fontSize: "0.95rem",
          }}
        >
          💞 파트너십 분석 열기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chapter 7: 팀워크와 수평적 네트워크 컴포넌트
// ─────────────────────────────────────────────────────────────────

const SKY = "rgba(56,189,248,1)";
const SKY_SOFT = "rgba(125,211,252,1)";

const CH7_TABS = [
  { key: "terrain"  as const, quoteKey: "terrainQuote"  as const, label: "나의 서포터",     icon: "🤝", color: SKY },
  { key: "vampire"  as const, quoteKey: "vampireQuote"  as const, label: "주의할 유형",     icon: "🧛", color: "rgba(251,113,133,1)" },
  { key: "leverage" as const, quoteKey: "leverageQuote" as const, label: "관계 전략",       icon: "⚙️", color: "rgba(167,243,208,1)" },
] as const;

function NetworkBlockquote({ children, color }: { children: string; color?: string }) {
  if (!children) return null;
  const c = color || SKY;
  return (
    <blockquote
      className="my-4 rounded-xl px-4 py-3 italic"
      style={{
        borderLeft: `3px solid ${c}`,
        background: `${c.replace("1)", "0.07)")}`,
        color: SKY_SOFT,
        fontSize: "0.93rem",
        lineHeight: 1.85,
        letterSpacing: "0.03em",
      }}
    >
      &ldquo;{children}&rdquo;
    </blockquote>
  );
}

function Ch7MiniBar({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  const fill = danger
    ? `rgba(251,113,133,${0.5 + value / 200})`
    : `linear-gradient(90deg, ${SKY}, ${SKY_SOFT})`;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span style={{ color: "rgba(203,213,225,0.75)", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <span style={{ color: danger ? "rgba(251,113,133,0.9)" : SKY_SOFT, fontSize: "0.72rem", fontWeight: 700 }}>
          {value}점
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: fill }}
        />
      </div>
    </div>
  );
}

function FadeTabContent({ tabKey, children }: { tabKey: string; children: React.ReactNode }) {
  return (
    <div key={tabKey} style={{ animation: "ch7FadeIn 0.32s ease-out both" }}>
      <style>{`@keyframes ch7FadeIn{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {children}
    </div>
  );
}

function Chapter7NetworkDashboard({
  step,
  result,
  onRequest,
}: {
  step: "idle" | "loading" | "done";
  result: Chapter7Result | null;
  onRequest: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<0 | 1 | 2>(0);

  if (step === "loading") {
    return (
      <div
        className="rounded-3xl overflow-hidden px-6 py-12 flex flex-col items-center gap-5"
        style={{
          background: "rgba(8,37,55,0.35)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(56,189,248,0.15)",
        }}
      >
        <div className="relative h-16 w-16">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{ border: "2px solid rgba(56,189,248,0.35)" }}
          />
          <div
            className="absolute inset-2 rounded-full animate-spin"
            style={{
              border: "2px solid rgba(125,211,252,0.2)",
              animationDirection: "reverse",
              animationDuration: "2s",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🤝</div>
        </div>
        <div className="text-center">
          <p
            className="font-semibold tracking-[0.2em]"
            style={{ color: "rgba(56,189,248,0.85)", fontSize: "0.82rem" }}
          >
            인간관계 지형도를 그리는 중
          </p>
          <p
            className="mt-1 tracking-[0.08em]"
            style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.73rem" }}
          >
            교우궁과 형제궁의 별들을 해석하고 있습니다…
          </p>
        </div>
      </div>
    );
  }

  if (step === "done" && result) {
    const { gyoWu, hyungje } = result.palace;
    const ns = result.networkScores;
    const ch7 = result.chapter7;
    const tab = CH7_TABS[activeTab];

    const sectionText  = (ch7[tab.key]      || "").replace(/\[QUOTE\]:[^\n]*/g, "").replace(/^#{1,3}[^\n]*\n?/gm, "").trim();
    const quoteText    = ch7[tab.quoteKey]  || "";

    return (
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(3,29,50,0.18) 0%, rgba(5,20,35,0.22) 60%, rgba(15,23,42,0.35) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(56,189,248,0.2)",
          boxShadow: "0 8px 40px rgba(56,189,248,0.07), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* 헤더 */}
        <div
          className="px-6 pt-7 pb-5"
          style={{
            borderBottom: "1px solid rgba(56,189,248,0.1)",
            background: "linear-gradient(135deg, rgba(56,189,248,0.09) 0%, rgba(125,211,252,0.05) 100%)",
          }}
        >
          <p
            className="uppercase tracking-[0.25em] font-medium"
            style={{ color: "rgba(56,189,248,0.7)", fontSize: "0.68rem" }}
          >
            Chapter 07 · Network &amp; Teamwork
          </p>
          <h3
            className="mt-2 font-black text-white"
            style={{
              fontSize: "clamp(1.4rem, 3.5vw, 1.9rem)",
              lineHeight: 1.3,
              letterSpacing: "0.03em",
              textShadow: "0 0 30px rgba(56,189,248,0.22)",
            }}
          >
            팀워크와 수평적 네트워크
          </h3>
          <p
            className="mt-2 font-light"
            style={{ color: "rgba(186,230,253,0.6)", lineHeight: 1.95, letterSpacing: "0.04em", fontSize: "0.88rem" }}
          >
            교우궁·형제궁이 만드는 나의 인적 자원 생태계
          </p>
        </div>

        {/* 네트워크 점수 4종 */}
        <div className="px-6 pt-5 pb-3 grid grid-cols-2 gap-x-6 gap-y-4">
          <Ch7MiniBar label="🤝 서포터 풍부도"    value={ns.supporter} />
          <Ch7MiniBar label="⚙️ 레버리지 역량"   value={ns.leverage}  />
          <Ch7MiniBar label="🎵 팀 결속력"        value={ns.harmony}   />
          <Ch7MiniBar label="🧛 에너지 뱀파이어"  value={ns.vampire}   danger />
        </div>

        {/* 탭 메뉴 */}
        <div
          className="mx-4 mb-0 flex gap-1 rounded-2xl p-1"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(56,189,248,0.1)" }}
        >
          {CH7_TABS.map((t, i) => {
            const isActive = activeTab === i;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(i as 0 | 1 | 2)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all duration-200"
                style={{
                  background: isActive ? "rgba(56,189,248,0.12)" : "transparent",
                  border: isActive ? "1px solid rgba(56,189,248,0.3)" : "1px solid transparent",
                  color: isActive ? SKY_SOFT : "rgba(148,163,184,0.55)",
                  fontSize: "0.72rem",
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                }}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* 탭 콘텐츠 — Framer Motion 페이드인 */}
        <div className="px-5 pt-4 pb-5" style={{ minHeight: "280px" }}>
          <FadeTabContent tabKey={`${activeTab}-${tab.key}`}>
            <div>
              {quoteText && (
                <NetworkBlockquote color={tab.color}>{quoteText}</NetworkBlockquote>
              )}
              {sectionText
                ? sectionText.split(/\n{2,}/).map((para, pi) => (
                    <p
                      key={pi}
                      style={{
                        color: "rgba(186,230,253,0.78)",
                        fontSize: "0.88rem",
                        lineHeight: 2.0,
                        letterSpacing: "0.02em",
                        marginBottom: "0.9em",
                      }}
                    >
                      {para.replace(/\n/g, " ")}
                    </p>
                  ))
                : (
                  <p style={{ color: "rgba(148,163,184,0.4)", fontSize: "0.83rem" }}>
                    분석 내용을 불러오는 중입니다.
                  </p>
                )}
            </div>
          </FadeTabContent>
        </div>

        {/* 궁 별 배지 */}
        {(gyoWu.stars.length > 0 || hyungje.stars.length > 0) && (
          <div
            className="mx-4 mb-5 rounded-2xl px-5 py-4 grid grid-cols-2 gap-4"
            style={{ background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.1)" }}
          >
            {[{ label: "교우궁(노복궁)", palace: gyoWu }, { label: "형제궁", palace: hyungje }].map(({ label, palace }) => (
              <div key={label}>
                <p
                  className="uppercase tracking-[0.18em] mb-2"
                  style={{ color: "rgba(56,189,248,0.5)", fontSize: "0.62rem" }}
                >
                  {label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {palace.stars.map((s) => (
                    <span key={s} className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ background: "rgba(56,189,248,0.14)", color: SKY_SOFT }}>
                      {s}
                    </span>
                  ))}
                  {palace.aux.map((s) => (
                    <span key={s} className="rounded-full px-2 py-0.5 text-xs"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(203,213,225,0.55)" }}>
                      {s}
                    </span>
                  ))}
                  {palace.bad.map((s) => (
                    <span key={s} className="rounded-full px-2 py-0.5 text-xs"
                      style={{ background: "rgba(239,68,68,0.1)", color: "rgba(252,165,165,0.65)" }}>
                      {s}
                    </span>
                  ))}
                  {palace.stars.length === 0 && palace.aux.length === 0 && palace.bad.length === 0 && (
                    <span style={{ color: "rgba(148,163,184,0.4)", fontSize: "0.75rem" }}>빈 궁</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // step === "idle" — 잠금 티저
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "rgba(5,20,38,0.35)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(56,189,248,0.18)",
      }}
    >
      <div className="px-6 pt-7 pb-5 space-y-4">
        <div className="flex items-center gap-4">
          <div
            className="flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.28)" }}
          >
            🤝
          </div>
          <div>
            <p
              className="uppercase tracking-[0.2em] font-medium"
              style={{ color: "rgba(56,189,248,0.65)", fontSize: "0.65rem" }}
            >
              Chapter 07 · Unlock
            </p>
            <p className="font-bold tracking-[0.04em] text-white" style={{ fontSize: "1.05rem" }}>
              팀워크와 수평적 네트워크
            </p>
          </div>
        </div>

        <p
          className="font-light"
          style={{ color: "rgba(186,230,253,0.6)", lineHeight: 1.95, letterSpacing: "0.04em", fontSize: "0.88rem" }}
        >
          교우궁(노복궁)과 형제궁은 당신 주변의 인적 자원을 지배하는 궁입니다.{" "}
          <span style={{ color: SKY_SOFT, fontWeight: 600 }}>나를 돕는 서포터</span>,{" "}
          <span style={{ color: "rgba(251,113,133,0.85)", fontWeight: 600 }}>에너지 뱀파이어</span>, 그리고{" "}
          <span style={{ color: "rgba(167,243,208,0.85)", fontWeight: 600 }}>레버리지 전략</span>을 인간관계 탭 대시보드로 확인하세요.
        </p>

        <div className="space-y-1.5">
          {CH7_TABS.map((t) => (
            <div
              key={t.key}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-base">{t.icon}</span>
              <span className="text-sm font-medium tracking-[0.04em]" style={{ color: "rgba(203,213,225,0.7)" }}>
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        <button
          type="button"
          onClick={onRequest}
          className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)",
            boxShadow: "0 8px 28px rgba(56,189,248,0.28)",
            letterSpacing: "0.08em",
            fontSize: "0.95rem",
          }}
        >
          🤝 인간관계 대시보드 열기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chapter 8: 공간과 환경 (전택궁) 컴포넌트
// ─────────────────────────────────────────────────────────────────

const SAGE  = "rgba(134,179,138,1)";   // 세이지 그린
const SAGE_SOFT = "rgba(187,215,190,1)";
const WARM_GREY = "rgba(168,162,158,1)";

const CH8_TABS = [
  { key: "asset"       as const, quoteKey: "assetQuote"  as const, label: "자산과 터전",   icon: "🏡" },
  { key: "spaceEnergy" as const, quoteKey: "spaceQuote"  as const, label: "공간 에너지학", icon: "🕯️" },
  { key: "minimal"     as const, quoteKey: "minimalQuote" as const, label: "공간 순환",    icon: "🌿" },
] as const;

// Warm Grey·Sage 컬러 인용구 박스
function SpaceBlockquote({ children, color }: { children: string; color?: string }) {
  if (!children) return null;
  const c = color || SAGE;
  return (
    <blockquote
      className="my-4 rounded-xl px-4 py-3 italic"
      style={{
        borderLeft: `3px solid ${c}`,
        background: `${c.replace("1)", "0.07)")}`,
        color: SAGE_SOFT,
        fontSize: "0.93rem",
        lineHeight: 1.88,
        letterSpacing: "0.03em",
      }}
    >
      &ldquo;{children}&rdquo;
    </blockquote>
  );
}

// 거주 환경 무드 이미지 플레이스홀더
function SpaceImagePlaceholder({
  label,
  aspectRatio = "16/9",
  icon = "🏡",
}: {
  label: string;
  aspectRatio?: string;
  icon?: string;
}) {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-2 my-5"
      style={{
        aspectRatio,
        background: "linear-gradient(135deg, rgba(168,162,158,0.10) 0%, rgba(134,179,138,0.08) 60%, rgba(99,94,90,0.12) 100%)",
        border: "1px dashed rgba(134,179,138,0.28)",
      }}
    >
      <span className="text-4xl opacity-40">{icon}</span>
      <span
        className="tracking-[0.14em] uppercase font-medium"
        style={{ color: "rgba(168,162,158,0.45)", fontSize: "0.68rem" }}
      >
        {label}
      </span>
      <span
        style={{ color: "rgba(134,179,138,0.28)", fontSize: "0.6rem", letterSpacing: "0.1em" }}
      >
        Image placeholder
      </span>
    </div>
  );
}

// Warm Grey 진행 바
function SpaceMiniBar({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) {
  const fill = inverse
    ? `rgba(251,191,36,${0.45 + value / 250})`
    : `linear-gradient(90deg, ${SAGE}, ${SAGE_SOFT})`;
  const displayColor = inverse ? "rgba(251,191,36,0.85)" : SAGE_SOFT;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span style={{ color: "rgba(203,213,225,0.65)", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <span style={{ color: displayColor, fontSize: "0.72rem", fontWeight: 700 }}>
          {value}점
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: fill }}
        />
      </div>
    </div>
  );
}

function FadeTabContent8({ tabKey, children }: { tabKey: string; children: React.ReactNode }) {
  return (
    <div key={tabKey} style={{ animation: "ch8FadeIn 0.32s ease-out both" }}>
      <style>{`@keyframes ch8FadeIn{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {children}
    </div>
  );
}

// 탭별 이미지 플레이스홀더 설정
const SPACE_TAB_IMAGES: Record<string, { label: string; icon: string; ratio: string }> = {
  asset:       { label: "주거 환경 무드", icon: "🏡", ratio: "16/9" },
  spaceEnergy: { label: "인테리어 톤앤매너",  icon: "🕯️", ratio: "4/3"  },
  minimal:     { label: "미니멀 공간",        icon: "🌿", ratio: "16/9" },
};

function Chapter8SpaceDashboard({
  step,
  result,
  onRequest,
}: {
  step: "idle" | "loading" | "done";
  result: Chapter8Result | null;
  onRequest: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<0 | 1 | 2>(0);

  if (step === "loading") {
    return (
      <div
        className="rounded-3xl overflow-hidden px-6 py-12 flex flex-col items-center gap-5"
        style={{
          background: "rgba(40,36,33,0.35)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(134,179,138,0.15)",
        }}
      >
        <div className="relative h-16 w-16">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{ border: "2px solid rgba(134,179,138,0.38)" }}
          />
          <div
            className="absolute inset-2 rounded-full animate-spin"
            style={{
              border: "2px solid rgba(168,162,158,0.2)",
              animationDirection: "reverse",
              animationDuration: "2.4s",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🏡</div>
        </div>
        <div className="text-center">
          <p
            className="font-semibold tracking-[0.2em]"
            style={{ color: "rgba(134,179,138,0.85)", fontSize: "0.82rem" }}
          >
            공간과 환경의 기운을 해석하는 중
          </p>
          <p
            className="mt-1 tracking-[0.08em]"
            style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.73rem" }}
          >
            전택궁의 별들이 당신의 터전을 이야기합니다…
          </p>
        </div>
      </div>
    );
  }

  if (step === "done" && result) {
    const { jeonTaek } = result.palace;
    const ss = result.spaceScores;
    const ch8 = result.chapter8;
    const tab = CH8_TABS[activeTab];
    const imgMeta = SPACE_TAB_IMAGES[tab.key];

    const sectionText = (ch8[tab.key] || "")
      .replace(/\[QUOTE\]:[^\n]*/g, "")
      .replace(/^#{1,3}[^\n]*\n?/gm, "")
      .trim();
    const quoteText = ch8[tab.quoteKey] || "";

    return (
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(38,34,30,0.20) 0%, rgba(30,28,25,0.26) 60%, rgba(20,18,16,0.38) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(134,179,138,0.18)",
          boxShadow: "0 8px 40px rgba(134,179,138,0.07), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* 헤더 */}
        <div
          className="px-6 pt-7 pb-5"
          style={{
            borderBottom: "1px solid rgba(134,179,138,0.1)",
            background: "linear-gradient(135deg, rgba(134,179,138,0.09) 0%, rgba(168,162,158,0.05) 100%)",
          }}
        >
          <p
            className="uppercase tracking-[0.25em] font-medium"
            style={{ color: "rgba(134,179,138,0.65)", fontSize: "0.68rem" }}
          >
            Chapter 08 · Space &amp; Environment
          </p>
          <h3
            className="mt-2 font-black text-white"
            style={{
              fontSize: "clamp(1.4rem, 3.5vw, 1.9rem)",
              lineHeight: 1.3,
              letterSpacing: "0.03em",
              textShadow: "0 0 30px rgba(134,179,138,0.20)",
            }}
          >
            공간과 환경
          </h3>
          <p
            className="mt-2 font-light"
            style={{ color: "rgba(187,215,190,0.55)", lineHeight: 1.95, letterSpacing: "0.04em", fontSize: "0.88rem" }}
          >
            전택궁이 그리는 터전·자산·공간 에너지 리포트
          </p>
        </div>

        {/* 공간 지수 4종 */}
        <div className="px-6 pt-5 pb-3 grid grid-cols-2 gap-x-6 gap-y-4">
          <SpaceMiniBar label="🏡 거주 안정성"      value={ss.stability} />
          <SpaceMiniBar label="💼 부동산 자산 감각" value={ss.asset} />
          <SpaceMiniBar label="🌬️ 공간 에너지 흐름"  value={ss.flow} />
          <SpaceMiniBar label="🗂️ 혼잡·집착 경향"    value={ss.clutter} inverse />
        </div>

        {/* 탭 메뉴 */}
        <div
          className="mx-4 mb-0 flex gap-1 rounded-2xl p-1"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(134,179,138,0.12)" }}
        >
          {CH8_TABS.map((t, i) => {
            const isActive = activeTab === i;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(i as 0 | 1 | 2)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all duration-200"
                style={{
                  background: isActive ? "rgba(134,179,138,0.13)" : "transparent",
                  border: isActive ? "1px solid rgba(134,179,138,0.32)" : "1px solid transparent",
                  color: isActive ? SAGE_SOFT : "rgba(148,163,184,0.5)",
                  fontSize: "0.72rem",
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                }}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* 탭 콘텐츠 — 이미지 플레이스홀더 포함 */}
        <div className="px-5 pt-4 pb-5" style={{ minHeight: "340px" }}>
          <FadeTabContent8 tabKey={`${activeTab}-${tab.key}`}>
            <div>
              {/* 이미지 플레이스홀더 */}
              <SpaceImagePlaceholder
                label={imgMeta.label}
                icon={imgMeta.icon}
                aspectRatio={imgMeta.ratio}
              />

              {quoteText && (
                <SpaceBlockquote color={SAGE}>{quoteText}</SpaceBlockquote>
              )}
              {sectionText
                ? sectionText.split(/\n{2,}/).map((para, pi) => (
                    <p
                      key={pi}
                      style={{
                        color: "rgba(212,208,200,0.78)",
                        fontSize: "0.88rem",
                        lineHeight: 2.0,
                        letterSpacing: "0.02em",
                        marginBottom: "0.9em",
                      }}
                    >
                      {para.replace(/\n/g, " ")}
                    </p>
                  ))
                : (
                  <p style={{ color: "rgba(148,163,184,0.4)", fontSize: "0.83rem" }}>
                    분석 내용을 불러오는 중입니다.
                  </p>
                )}
            </div>
          </FadeTabContent8>
        </div>

        {/* 전택궁 별 배지 */}
        {(jeonTaek.stars.length > 0 || jeonTaek.aux.length > 0 || jeonTaek.bad.length > 0) && (
          <div
            className="mx-4 mb-5 rounded-2xl px-5 py-4"
            style={{ background: "rgba(134,179,138,0.04)", border: "1px solid rgba(134,179,138,0.10)" }}
          >
            <p
              className="uppercase tracking-[0.18em] mb-2"
              style={{ color: "rgba(134,179,138,0.5)", fontSize: "0.62rem" }}
            >
              전택궁 (Field &amp; Property)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {jeonTaek.stars.map((s) => (
                <span key={s} className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ background: "rgba(134,179,138,0.14)", color: SAGE_SOFT }}>
                  {s}
                </span>
              ))}
              {jeonTaek.aux.map((s) => (
                <span key={s} className="rounded-full px-2 py-0.5 text-xs"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(168,162,158,0.65)" }}>
                  {s}
                </span>
              ))}
              {jeonTaek.bad.map((s) => (
                <span key={s} className="rounded-full px-2 py-0.5 text-xs"
                  style={{ background: "rgba(239,68,68,0.10)", color: "rgba(252,165,165,0.65)" }}>
                  {s}
                </span>
              ))}
              {jeonTaek.stars.length === 0 && jeonTaek.aux.length === 0 && jeonTaek.bad.length === 0 && (
                <span style={{ color: "rgba(148,163,184,0.4)", fontSize: "0.75rem" }}>빈 궁</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // step === "idle" — 잠금 티저
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "rgba(30,27,24,0.38)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(134,179,138,0.18)",
      }}
    >
      <div className="px-6 pt-7 pb-5 space-y-4">
        <div className="flex items-center gap-4">
          <div
            className="flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: "rgba(134,179,138,0.10)", border: "1px solid rgba(134,179,138,0.28)" }}
          >
            🏡
          </div>
          <div>
            <p
              className="uppercase tracking-[0.2em] font-medium"
              style={{ color: "rgba(134,179,138,0.62)", fontSize: "0.65rem" }}
            >
              Chapter 08 · Unlock
            </p>
            <p className="font-bold tracking-[0.04em] text-white" style={{ fontSize: "1.05rem" }}>
              공간과 환경 (전택궁)
            </p>
          </div>
        </div>

        <p
          className="font-light"
          style={{ color: "rgba(187,215,190,0.58)", lineHeight: 1.95, letterSpacing: "0.04em", fontSize: "0.88rem" }}
        >
          전택궁은 당신이 뿌리 내리는 땅과 공간의 에너지를 지배합니다.{" "}
          <span style={{ color: SAGE_SOFT, fontWeight: 600 }}>자산 축적의 감각</span>,{" "}
          <span style={{ color: WARM_GREY, fontWeight: 600 }}>공간 에너지학</span>, 그리고{" "}
          <span style={{ color: "rgba(167,243,208,0.85)", fontWeight: 600 }}>미니멀 공간 순환법</span>을 탭 대시보드로 확인하세요.
        </p>

        {/* 탭 프리뷰 */}
        <div className="space-y-1.5">
          {CH8_TABS.map((t) => (
            <div
              key={t.key}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-base">{t.icon}</span>
              <span className="text-sm font-medium tracking-[0.04em]" style={{ color: "rgba(203,213,225,0.65)" }}>
                {t.label}
              </span>
            </div>
          ))}
        </div>

        {/* 이미지 플레이스홀더 미리보기 */}
        <SpaceImagePlaceholder label="주거 환경 무드 이미지" icon="🏡" aspectRatio="21/9" />
      </div>

      <div className="px-6 py-5">
        <button
          type="button"
          onClick={onRequest}
          className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #1a2e1c 0%, #2d5a31 50%, #3a7a3e 100%)",
            boxShadow: "0 8px 28px rgba(134,179,138,0.26)",
            letterSpacing: "0.08em",
            fontSize: "0.95rem",
          }}
        >
          🏡 공간 에너지 리포트 열기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 공통 유틸: 탭 기반 콘텐츠 섹션 렌더러
// ─────────────────────────────────────────────────────────────────
type TabStep = "idle" | "loading" | "done";

function GenericMiniBar({ label, value, accent, inverse = false }: {
  label: string; value: number; accent: string; inverse?: boolean;
}) {
  const fill = inverse
    ? `rgba(251,113,133,${0.4 + value / 250})`
    : `linear-gradient(90deg, ${accent}, ${accent.replace("1)", "0.6)")})`;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span style={{ color: "rgba(203,213,225,0.65)", fontSize: "0.72rem", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ color: inverse ? "rgba(251,113,133,0.85)" : accent, fontSize: "0.72rem", fontWeight: 700 }}>{value}점</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: fill }} />
      </div>
    </div>
  );
}

function GenericBlockquote({ children, accent }: { children: string; accent: string }) {
  if (!children) return null;
  return (
    <blockquote className="my-4 rounded-xl px-4 py-3 italic"
      style={{ borderLeft: `3px solid ${accent}`, background: `${accent.replace("1)", "0.07)")}`,
        color: accent, fontSize: "0.93rem", lineHeight: 1.88, letterSpacing: "0.03em" }}>
      &ldquo;{children}&rdquo;
    </blockquote>
  );
}

function FadeTab({ tabKey, children }: { tabKey: string; children: React.ReactNode }) {
  return (
    <div key={tabKey} style={{ animation: "genericFadeIn 0.3s ease-out both" }}>
      <style>{`@keyframes genericFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {children}
    </div>
  );
}

function TabTextBody({ text, accent }: { text: string; accent: string }) {
  if (!text) return <p style={{ color: "rgba(148,163,184,0.4)", fontSize: "0.83rem" }}>분석 내용을 불러오는 중입니다.</p>;
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} style={{ color: "rgba(212,208,200,0.78)", fontSize: "0.88rem", lineHeight: 2.0,
          letterSpacing: "0.02em", marginBottom: "0.9em" }}>
          {para.replace(/\n/g, " ")}
        </p>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chapter 9: 건강과 몸의 에너지 (질액궁)
// ─────────────────────────────────────────────────────────────────

const TEAL = "rgba(20,184,166,1)";
const TEAL_SOFT = "rgba(94,234,212,1)";

const CH9_TABS = [
  { key: "constitution" as const, quoteKey: "constitutionQuote" as const, label: "체질 에너지", icon: "⚡" },
  { key: "stress"       as const, quoteKey: "stressQuote"       as const, label: "스트레스 회복", icon: "🌊" },
  { key: "lifestyle"    as const, quoteKey: "lifestyleQuote"    as const, label: "생활 습관 처방", icon: "🌿" },
] as const;

function Chapter9HealthDashboard({ step, result, onRequest }: {
  step: TabStep; result: Chapter9Result | null; onRequest: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<0|1|2>(0);
  if (step === "loading") return (
    <div className="rounded-3xl px-6 py-12 flex flex-col items-center gap-5"
      style={{ background: "rgba(10,40,38,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(20,184,166,0.15)" }}>
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "2px solid rgba(20,184,166,0.4)" }} />
        <div className="absolute inset-2 rounded-full animate-spin" style={{ border: "2px solid rgba(94,234,212,0.2)", animationDirection: "reverse", animationDuration: "2.2s" }} />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">⚡</div>
      </div>
      <p className="font-semibold tracking-[0.2em]" style={{ color: "rgba(20,184,166,0.85)", fontSize: "0.82rem" }}>신체 에너지 패턴을 분석하는 중</p>
      <p className="tracking-[0.08em]" style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.73rem" }}>질액궁의 별들이 당신의 몸을 이야기합니다…</p>
    </div>
  );

  if (step === "done" && result) {
    const tab = CH9_TABS[activeTab];
    const hs = result.healthScores;
    const ch9 = result.chapter9;
    const sectionText = (ch9[tab.key] || "").replace(/\[QUOTE\]:[^\n]*/g, "").replace(/^#{1,3}[^\n]*\n?/gm, "").trim();
    return (
      <div className="rounded-3xl overflow-hidden" style={{
        background: "linear-gradient(145deg, rgba(5,30,28,0.20) 0%, rgba(3,20,18,0.28) 60%, rgba(2,12,12,0.38) 100%)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(20,184,166,0.18)",
        boxShadow: "0 8px 40px rgba(20,184,166,0.07), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        <div className="px-6 pt-7 pb-5" style={{ borderBottom: "1px solid rgba(20,184,166,0.1)", background: "linear-gradient(135deg, rgba(20,184,166,0.09) 0%, rgba(94,234,212,0.04) 100%)" }}>
          <p className="uppercase tracking-[0.25em] font-medium" style={{ color: "rgba(20,184,166,0.65)", fontSize: "0.68rem" }}>Chapter 09 · Health &amp; Vitality</p>
          <h3 className="mt-2 font-black text-white" style={{ fontSize: "clamp(1.4rem,3.5vw,1.9rem)", lineHeight: 1.3, textShadow: "0 0 30px rgba(20,184,166,0.20)" }}>건강과 몸의 에너지</h3>
          <p className="mt-2 font-light" style={{ color: "rgba(94,234,212,0.55)", lineHeight: 1.95, fontSize: "0.88rem" }}>질액궁으로 읽는 체질·스트레스·생활 처방</p>
        </div>
        <div className="px-6 pt-5 pb-3 grid grid-cols-2 gap-x-6 gap-y-4">
          <GenericMiniBar label="⚡ 생명력·체력"    value={hs.vitality}  accent={TEAL} />
          <GenericMiniBar label="💚 회복 탄력성"   value={hs.recovery}  accent={TEAL} />
          <GenericMiniBar label="🌊 스트레스 민감도" value={hs.stress}    accent={TEAL} inverse />
          <GenericMiniBar label="⚠️ 건강 취약 신호" value={hs.risk}      accent={TEAL} inverse />
        </div>
        <div className="mx-4 mb-0 flex gap-1 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(20,184,166,0.12)" }}>
          {CH9_TABS.map((t, i) => {
            const a = activeTab === i;
            return <button key={t.key} type="button" onClick={() => setActiveTab(i as 0|1|2)} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all duration-200"
              style={{ background: a ? "rgba(20,184,166,0.13)" : "transparent", border: a ? "1px solid rgba(20,184,166,0.32)" : "1px solid transparent", color: a ? TEAL_SOFT : "rgba(148,163,184,0.5)", fontSize: "0.72rem", fontWeight: a ? 700 : 400, cursor: "pointer" }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>;
          })}
        </div>
        <div className="px-5 pt-4 pb-5" style={{ minHeight: "280px" }}>
          <FadeTab tabKey={`ch9-${activeTab}`}>
            <GenericBlockquote accent={TEAL}>{ch9[tab.quoteKey]}</GenericBlockquote>
            <TabTextBody text={sectionText} accent={TEAL} />
          </FadeTab>
        </div>
        {result.palace.jilAek.stars.length > 0 && (
          <div className="mx-4 mb-5 rounded-2xl px-5 py-4" style={{ background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.10)" }}>
            <p className="uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(20,184,166,0.5)", fontSize: "0.62rem" }}>질액궁 (Health &amp; Vitality)</p>
            <div className="flex flex-wrap gap-1.5">
              {result.palace.jilAek.stars.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "rgba(20,184,166,0.14)", color: TEAL_SOFT }}>{s}</span>)}
              {result.palace.jilAek.aux.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(148,163,184,0.55)" }}>{s}</span>)}
              {result.palace.jilAek.bad.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(239,68,68,0.10)", color: "rgba(252,165,165,0.65)" }}>{s}</span>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(5,25,22,0.38)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(20,184,166,0.18)" }}>
      <div className="px-6 pt-7 pb-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "rgba(20,184,166,0.10)", border: "1px solid rgba(20,184,166,0.28)" }}>⚡</div>
          <div>
            <p className="uppercase tracking-[0.2em] font-medium" style={{ color: "rgba(20,184,166,0.62)", fontSize: "0.65rem" }}>Chapter 09 · Unlock</p>
            <p className="font-bold tracking-[0.04em] text-white" style={{ fontSize: "1.05rem" }}>건강과 몸의 에너지</p>
          </div>
        </div>
        <p className="font-light" style={{ color: "rgba(94,234,212,0.58)", lineHeight: 1.95, fontSize: "0.88rem" }}>
          질액궁은 당신의 신체 에너지 패턴을 지배합니다. <span style={{ color: TEAL_SOFT, fontWeight: 600 }}>체질과 활력</span>, <span style={{ color: TEAL, fontWeight: 600 }}>스트레스 회복</span>, <span style={{ color: "rgba(167,243,208,0.85)", fontWeight: 600 }}>생활 습관 처방</span>을 확인하세요.
        </p>
        <div className="space-y-1.5">
          {CH9_TABS.map(t => <div key={t.key} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}><span className="text-base">{t.icon}</span><span className="text-sm font-medium" style={{ color: "rgba(203,213,225,0.65)" }}>{t.label}</span></div>)}
        </div>
      </div>
      <div className="px-6 py-5">
        <button type="button" onClick={onRequest} className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #0d4038 0%, #0f766e 50%, #14b8a6 100%)", boxShadow: "0 8px 28px rgba(20,184,166,0.26)", letterSpacing: "0.08em", fontSize: "0.95rem" }}>
          ⚡ 건강 에너지 리포트 열기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chapter 10: 창조성과 계승 (자녀궁)
// ─────────────────────────────────────────────────────────────────

const ORANGE = "rgba(251,146,60,1)";
const ORANGE_SOFT = "rgba(254,215,170,1)";

const CH10_TABS = [
  { key: "source"  as const, quoteKey: "sourceQuote"  as const, label: "창조성 원천", icon: "✨" },
  { key: "express" as const, quoteKey: "expressQuote" as const, label: "표현과 특기", icon: "🎨" },
  { key: "legacy"  as const, quoteKey: "legacyQuote"  as const, label: "계승과 레거시", icon: "🌱" },
] as const;

function Chapter10CreativityDashboard({ step, result, onRequest }: {
  step: TabStep; result: Chapter10Result | null; onRequest: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<0|1|2>(0);
  if (step === "loading") return (
    <div className="rounded-3xl px-6 py-12 flex flex-col items-center gap-5"
      style={{ background: "rgba(40,18,5,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(251,146,60,0.15)" }}>
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "2px solid rgba(251,146,60,0.4)" }} />
        <div className="absolute inset-2 rounded-full animate-spin" style={{ border: "2px solid rgba(254,215,170,0.2)", animationDirection: "reverse", animationDuration: "2.2s" }} />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
      </div>
      <p className="font-semibold tracking-[0.2em]" style={{ color: "rgba(251,146,60,0.85)", fontSize: "0.82rem" }}>창조성의 원천을 탐색하는 중</p>
      <p className="tracking-[0.08em]" style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.73rem" }}>자녀궁의 별들이 당신의 창의 에너지를 이야기합니다…</p>
    </div>
  );

  if (step === "done" && result) {
    const tab = CH10_TABS[activeTab];
    const cs = result.createScores;
    const ch10 = result.chapter10;
    const sectionText = (ch10[tab.key] || "").replace(/\[QUOTE\]:[^\n]*/g, "").replace(/^#{1,3}[^\n]*\n?/gm, "").trim();
    return (
      <div className="rounded-3xl overflow-hidden" style={{
        background: "linear-gradient(145deg, rgba(35,15,3,0.20) 0%, rgba(25,10,2,0.28) 60%, rgba(15,8,2,0.38) 100%)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(251,146,60,0.18)",
        boxShadow: "0 8px 40px rgba(251,146,60,0.07), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        <div className="px-6 pt-7 pb-5" style={{ borderBottom: "1px solid rgba(251,146,60,0.1)", background: "linear-gradient(135deg, rgba(251,146,60,0.09) 0%, rgba(254,215,170,0.04) 100%)" }}>
          <p className="uppercase tracking-[0.25em] font-medium" style={{ color: "rgba(251,146,60,0.65)", fontSize: "0.68rem" }}>Chapter 10 · Creativity &amp; Legacy</p>
          <h3 className="mt-2 font-black text-white" style={{ fontSize: "clamp(1.4rem,3.5vw,1.9rem)", lineHeight: 1.3, textShadow: "0 0 30px rgba(251,146,60,0.18)" }}>창조성과 계승</h3>
          <p className="mt-2 font-light" style={{ color: "rgba(254,215,170,0.55)", lineHeight: 1.95, fontSize: "0.88rem" }}>자녀궁으로 읽는 창의 원천·표현 양식·레거시</p>
        </div>
        <div className="px-6 pt-5 pb-3 grid grid-cols-2 gap-x-6 gap-y-4">
          <GenericMiniBar label="✨ 창의력"      value={cs.creativity}  accent={ORANGE} />
          <GenericMiniBar label="🎨 표현·전달력" value={cs.expression}  accent={ORANGE} />
          <GenericMiniBar label="🌱 레거시 욕구" value={cs.legacy}      accent={ORANGE} />
          <GenericMiniBar label="🧱 창의 블록"   value={cs.block}       accent={ORANGE} inverse />
        </div>
        <div className="mx-4 mb-0 flex gap-1 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(251,146,60,0.12)" }}>
          {CH10_TABS.map((t, i) => {
            const a = activeTab === i;
            return <button key={t.key} type="button" onClick={() => setActiveTab(i as 0|1|2)} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all duration-200"
              style={{ background: a ? "rgba(251,146,60,0.13)" : "transparent", border: a ? "1px solid rgba(251,146,60,0.32)" : "1px solid transparent", color: a ? ORANGE_SOFT : "rgba(148,163,184,0.5)", fontSize: "0.72rem", fontWeight: a ? 700 : 400, cursor: "pointer" }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>;
          })}
        </div>
        <div className="px-5 pt-4 pb-5" style={{ minHeight: "280px" }}>
          <FadeTab tabKey={`ch10-${activeTab}`}>
            <GenericBlockquote accent={ORANGE}>{ch10[tab.quoteKey]}</GenericBlockquote>
            <TabTextBody text={sectionText} accent={ORANGE} />
          </FadeTab>
        </div>
        {result.palace.janyeo.stars.length > 0 && (
          <div className="mx-4 mb-5 rounded-2xl px-5 py-4" style={{ background: "rgba(251,146,60,0.04)", border: "1px solid rgba(251,146,60,0.10)" }}>
            <p className="uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(251,146,60,0.5)", fontSize: "0.62rem" }}>자녀궁 (Creativity &amp; Children)</p>
            <div className="flex flex-wrap gap-1.5">
              {result.palace.janyeo.stars.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "rgba(251,146,60,0.14)", color: ORANGE_SOFT }}>{s}</span>)}
              {result.palace.janyeo.aux.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(148,163,184,0.55)" }}>{s}</span>)}
              {result.palace.janyeo.bad.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(239,68,68,0.10)", color: "rgba(252,165,165,0.65)" }}>{s}</span>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(30,12,3,0.38)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(251,146,60,0.18)" }}>
      <div className="px-6 pt-7 pb-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "rgba(251,146,60,0.10)", border: "1px solid rgba(251,146,60,0.28)" }}>✨</div>
          <div>
            <p className="uppercase tracking-[0.2em] font-medium" style={{ color: "rgba(251,146,60,0.62)", fontSize: "0.65rem" }}>Chapter 10 · Unlock</p>
            <p className="font-bold tracking-[0.04em] text-white" style={{ fontSize: "1.05rem" }}>창조성과 계승 (자녀궁)</p>
          </div>
        </div>
        <p className="font-light" style={{ color: "rgba(254,215,170,0.58)", lineHeight: 1.95, fontSize: "0.88rem" }}>
          자녀궁은 당신의 창조 에너지와 레거시를 지배합니다. <span style={{ color: ORANGE_SOFT, fontWeight: 600 }}>창조성 원천</span>, <span style={{ color: ORANGE, fontWeight: 600 }}>표현 특기</span>, <span style={{ color: "rgba(254,215,170,0.85)", fontWeight: 600 }}>삶의 유산</span>을 확인하세요.
        </p>
        <div className="space-y-1.5">
          {CH10_TABS.map(t => <div key={t.key} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}><span className="text-base">{t.icon}</span><span className="text-sm font-medium" style={{ color: "rgba(203,213,225,0.65)" }}>{t.label}</span></div>)}
        </div>
      </div>
      <div className="px-6 py-5">
        <button type="button" onClick={onRequest} className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #431407 0%, #9a3412 50%, #c2410c 100%)", boxShadow: "0 8px 28px rgba(251,146,60,0.26)", letterSpacing: "0.08em", fontSize: "0.95rem" }}>
          ✨ 창조성 에너지 리포트 열기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chapter 11: 뿌리와 기원 (부모궁)
// ─────────────────────────────────────────────────────────────────

const ROSE = "rgba(244,114,182,1)";
const ROSE_SOFT = "rgba(251,207,232,1)";

const CH11_TABS = [
  { key: "parentEnergy" as const, quoteKey: "parentEnergyQuote" as const, label: "부모 에너지", icon: "🌳" },
  { key: "pattern"      as const, quoteKey: "patternQuote"      as const, label: "가족 패턴", icon: "🔄" },
  { key: "liberation"   as const, quoteKey: "liberationQuote"   as const, label: "원형 해방", icon: "🦋" },
] as const;

function Chapter11RootsDashboard({ step, result, onRequest }: {
  step: TabStep; result: Chapter11Result | null; onRequest: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<0|1|2>(0);
  if (step === "loading") return (
    <div className="rounded-3xl px-6 py-12 flex flex-col items-center gap-5"
      style={{ background: "rgba(40,8,25,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(244,114,182,0.15)" }}>
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "2px solid rgba(244,114,182,0.4)" }} />
        <div className="absolute inset-2 rounded-full animate-spin" style={{ border: "2px solid rgba(251,207,232,0.2)", animationDirection: "reverse", animationDuration: "2.4s" }} />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🌳</div>
      </div>
      <p className="font-semibold tracking-[0.2em]" style={{ color: "rgba(244,114,182,0.85)", fontSize: "0.82rem" }}>뿌리와 원가족의 에너지를 탐색하는 중</p>
      <p className="tracking-[0.08em]" style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.73rem" }}>부모궁의 별들이 당신의 기원을 이야기합니다…</p>
    </div>
  );

  if (step === "done" && result) {
    const tab = CH11_TABS[activeTab];
    const rs = result.rootScores;
    const ch11 = result.chapter11;
    const sectionText = (ch11[tab.key] || "").replace(/\[QUOTE\]:[^\n]*/g, "").replace(/^#{1,3}[^\n]*\n?/gm, "").trim();
    return (
      <div className="rounded-3xl overflow-hidden" style={{
        background: "linear-gradient(145deg, rgba(38,5,22,0.20) 0%, rgba(25,3,15,0.28) 60%, rgba(15,2,10,0.38) 100%)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(244,114,182,0.18)",
        boxShadow: "0 8px 40px rgba(244,114,182,0.07), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        <div className="px-6 pt-7 pb-5" style={{ borderBottom: "1px solid rgba(244,114,182,0.1)", background: "linear-gradient(135deg, rgba(244,114,182,0.09) 0%, rgba(251,207,232,0.04) 100%)" }}>
          <p className="uppercase tracking-[0.25em] font-medium" style={{ color: "rgba(244,114,182,0.65)", fontSize: "0.68rem" }}>Chapter 11 · Roots &amp; Origin</p>
          <h3 className="mt-2 font-black text-white" style={{ fontSize: "clamp(1.4rem,3.5vw,1.9rem)", lineHeight: 1.3, textShadow: "0 0 30px rgba(244,114,182,0.18)" }}>뿌리와 기원</h3>
          <p className="mt-2 font-light" style={{ color: "rgba(251,207,232,0.55)", lineHeight: 1.95, fontSize: "0.88rem" }}>부모궁으로 읽는 원가족 에너지·가족 패턴·자기 해방</p>
        </div>
        <div className="px-6 pt-5 pb-3 grid grid-cols-2 gap-x-6 gap-y-4">
          <GenericMiniBar label="🌳 원가족 유대감"     value={rs.bond}          accent={ROSE} />
          <GenericMiniBar label="🏛️ 뿌리 안정성"       value={rs.rootStrength}  accent={ROSE} />
          <GenericMiniBar label="🦋 해방·자기재탄생"   value={rs.liberation}    accent={ROSE} />
          <GenericMiniBar label="🔄 패턴 반복 위험"    value={rs.patternRisk}   accent={ROSE} inverse />
        </div>
        <div className="mx-4 mb-0 flex gap-1 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(244,114,182,0.12)" }}>
          {CH11_TABS.map((t, i) => {
            const a = activeTab === i;
            return <button key={t.key} type="button" onClick={() => setActiveTab(i as 0|1|2)} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all duration-200"
              style={{ background: a ? "rgba(244,114,182,0.13)" : "transparent", border: a ? "1px solid rgba(244,114,182,0.32)" : "1px solid transparent", color: a ? ROSE_SOFT : "rgba(148,163,184,0.5)", fontSize: "0.72rem", fontWeight: a ? 700 : 400, cursor: "pointer" }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>;
          })}
        </div>
        <div className="px-5 pt-4 pb-5" style={{ minHeight: "280px" }}>
          <FadeTab tabKey={`ch11-${activeTab}`}>
            <GenericBlockquote accent={ROSE}>{ch11[tab.quoteKey]}</GenericBlockquote>
            <TabTextBody text={sectionText} accent={ROSE} />
          </FadeTab>
        </div>
        {result.palace.bumo.stars.length > 0 && (
          <div className="mx-4 mb-5 rounded-2xl px-5 py-4" style={{ background: "rgba(244,114,182,0.04)", border: "1px solid rgba(244,114,182,0.10)" }}>
            <p className="uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(244,114,182,0.5)", fontSize: "0.62rem" }}>부모궁 (Roots &amp; Parents)</p>
            <div className="flex flex-wrap gap-1.5">
              {result.palace.bumo.stars.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "rgba(244,114,182,0.14)", color: ROSE_SOFT }}>{s}</span>)}
              {result.palace.bumo.aux.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(148,163,184,0.55)" }}>{s}</span>)}
              {result.palace.bumo.bad.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(239,68,68,0.10)", color: "rgba(252,165,165,0.65)" }}>{s}</span>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(30,4,18,0.38)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(244,114,182,0.18)" }}>
      <div className="px-6 pt-7 pb-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "rgba(244,114,182,0.10)", border: "1px solid rgba(244,114,182,0.28)" }}>🌳</div>
          <div>
            <p className="uppercase tracking-[0.2em] font-medium" style={{ color: "rgba(244,114,182,0.62)", fontSize: "0.65rem" }}>Chapter 11 · Unlock</p>
            <p className="font-bold tracking-[0.04em] text-white" style={{ fontSize: "1.05rem" }}>뿌리와 기원 (부모궁)</p>
          </div>
        </div>
        <p className="font-light" style={{ color: "rgba(251,207,232,0.58)", lineHeight: 1.95, fontSize: "0.88rem" }}>
          부모궁은 당신이 어디서 왔는지를 보여줍니다. <span style={{ color: ROSE_SOFT, fontWeight: 600 }}>부모 에너지의 내면화</span>, <span style={{ color: ROSE, fontWeight: 600 }}>가족 패턴</span>, <span style={{ color: "rgba(251,207,232,0.85)", fontWeight: 600 }}>원형 해방</span>을 확인하세요.
        </p>
        <div className="space-y-1.5">
          {CH11_TABS.map(t => <div key={t.key} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}><span className="text-base">{t.icon}</span><span className="text-sm font-medium" style={{ color: "rgba(203,213,225,0.65)" }}>{t.label}</span></div>)}
        </div>
      </div>
      <div className="px-6 py-5">
        <button type="button" onClick={onRequest} className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #4a0424 0%, #9d174d 50%, #be185d 100%)", boxShadow: "0 8px 28px rgba(244,114,182,0.26)", letterSpacing: "0.08em", fontSize: "0.95rem" }}>
          🌳 뿌리와 기원 탐색 열기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chapter 12: 인생 종합 설계 (그랜드 피날레)
// ─────────────────────────────────────────────────────────────────

const GOLD = "rgba(251,191,36,1)";
const GOLD_SOFT = "rgba(254,240,138,1)";

const CH12_TABS = [
  { key: "coreTheme" as const, quoteKey: "coreThemeQuote" as const, label: "인생 핵심 테마", icon: "🌟" },
  { key: "cycle"     as const, quoteKey: "cycleQuote"     as const, label: "시기별 사이클",  icon: "🔮" },
  { key: "roadmap"   as const, quoteKey: "roadmapQuote"   as const, label: "인생 로드맵",    icon: "🗺️" },
] as const;

function Chapter12GrandFinale({ step, result, onRequest }: {
  step: TabStep; result: Chapter12Result | null; onRequest: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<0|1|2>(0);
  if (step === "loading") return (
    <div className="rounded-3xl px-6 py-14 flex flex-col items-center gap-6"
      style={{ background: "linear-gradient(145deg, rgba(30,20,5,0.6) 0%, rgba(20,10,2,0.7) 100%)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", border: "1px solid rgba(251,191,36,0.2)" }}>
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "2px solid rgba(251,191,36,0.5)" }} />
        <div className="absolute inset-2 rounded-full animate-spin" style={{ border: "2px solid rgba(254,240,138,0.25)", animationDirection: "reverse", animationDuration: "2.8s" }} />
        <div className="absolute inset-4 rounded-full animate-spin" style={{ border: "1px solid rgba(251,191,36,0.15)", animationDuration: "4s" }} />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">🌟</div>
      </div>
      <div className="text-center">
        <p className="font-bold tracking-[0.25em]" style={{ color: "rgba(251,191,36,0.9)", fontSize: "0.88rem" }}>인생 종합 로드맵을 완성하는 중</p>
        <p className="mt-2 tracking-[0.08em]" style={{ color: "rgba(148,163,184,0.55)", fontSize: "0.75rem" }}>12궁 전체의 별을 통합하여 당신의 인생 지도를 그리고 있습니다…</p>
      </div>
    </div>
  );

  if (step === "done" && result) {
    const tab = CH12_TABS[activeTab];
    const ch12 = result.chapter12;
    const sectionText = (ch12[tab.key] || "").replace(/\[QUOTE\]:[^\n]*/g, "").replace(/^#{1,3}[^\n]*\n?/gm, "").trim();
    return (
      <div className="rounded-3xl overflow-hidden" style={{
        background: "linear-gradient(145deg, rgba(30,20,4,0.25) 0%, rgba(20,14,3,0.32) 60%, rgba(12,8,2,0.45) 100%)",
        backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
        border: "1px solid rgba(251,191,36,0.25)",
        boxShadow: "0 12px 50px rgba(251,191,36,0.12), inset 0 1px 0 rgba(254,240,138,0.08)",
      }}>
        {/* 황금 상단 글로우 라인 */}
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.7), rgba(254,240,138,0.5), rgba(251,191,36,0.7), transparent)" }} />

        <div className="px-6 pt-8 pb-6" style={{ borderBottom: "1px solid rgba(251,191,36,0.12)", background: "linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(254,240,138,0.04) 100%)" }}>
          <p className="uppercase tracking-[0.3em] font-medium" style={{ color: "rgba(251,191,36,0.7)", fontSize: "0.68rem" }}>Chapter 12 · Grand Finale</p>
          <h3 className="mt-2 font-black" style={{
            fontSize: "clamp(1.6rem,4vw,2.2rem)", lineHeight: 1.25,
            background: "linear-gradient(135deg, #fbbf24, #fef08a, #fbbf24)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "0.02em",
          }}>인생 종합 설계</h3>
          <p className="mt-2 font-light" style={{ color: "rgba(254,240,138,0.6)", lineHeight: 1.95, fontSize: "0.9rem" }}>
            12궁 전체가 만들어내는 당신의 인생 지도 · 사이클 · 로드맵
          </p>
        </div>

        <div className="mx-4 mt-5 mb-0 flex gap-1 rounded-2xl p-1" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
          {CH12_TABS.map((t, i) => {
            const a = activeTab === i;
            return <button key={t.key} type="button" onClick={() => setActiveTab(i as 0|1|2)} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 transition-all duration-200"
              style={{ background: a ? "rgba(251,191,36,0.15)" : "transparent", border: a ? "1px solid rgba(251,191,36,0.4)" : "1px solid transparent", color: a ? GOLD_SOFT : "rgba(148,163,184,0.5)", fontSize: "0.72rem", fontWeight: a ? 700 : 400, cursor: "pointer", letterSpacing: "0.04em" }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>;
          })}
        </div>

        <div className="px-5 pt-5 pb-6" style={{ minHeight: "320px" }}>
          <FadeTab tabKey={`ch12-${activeTab}`}>
            <GenericBlockquote accent={GOLD}>{ch12[tab.quoteKey]}</GenericBlockquote>
            <TabTextBody text={sectionText} accent={GOLD} />
          </FadeTab>
        </div>

        {/* 하단 마무리 메시지 */}
        <div className="mx-4 mb-6 rounded-2xl px-6 py-5 text-center" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
          <p className="text-xl mb-2">🌟</p>
          <p className="font-semibold tracking-[0.08em]" style={{ color: GOLD_SOFT, fontSize: "0.85rem" }}>자미두수 인생 총론 완독</p>
          <p className="mt-1 font-light" style={{ color: "rgba(148,163,184,0.55)", fontSize: "0.78rem", lineHeight: 1.8 }}>
            12궁의 별자리가 완성하는 당신만의 인생 지도입니다.<br/>이 분석은 당신의 선택을 돕는 나침반입니다.
          </p>
        </div>
      </div>
    );
  }

  // idle 티저 — 특별 디자인
  return (
    <div className="rounded-3xl overflow-hidden" style={{
      background: "linear-gradient(145deg, rgba(25,18,4,0.55) 0%, rgba(15,10,2,0.65) 100%)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(251,191,36,0.22)",
      boxShadow: "0 0 60px rgba(251,191,36,0.06)",
    }}>
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)" }} />
      <div className="px-6 pt-8 pb-5 space-y-5">
        <div className="text-center">
          <span className="text-5xl">🌟</span>
          <div className="mt-3">
            <p className="uppercase tracking-[0.3em] font-medium" style={{ color: "rgba(251,191,36,0.65)", fontSize: "0.65rem" }}>Chapter 12 · Grand Finale</p>
            <p className="mt-1 font-black tracking-[0.04em] text-white" style={{ fontSize: "1.25rem" }}>인생 종합 설계</p>
          </div>
        </div>
        <p className="font-light text-center" style={{ color: "rgba(254,240,138,0.6)", lineHeight: 2.0, fontSize: "0.88rem" }}>
          12궁 전체를 아우르는 <span style={{ color: GOLD_SOFT, fontWeight: 600 }}>인생 핵심 테마</span>, <span style={{ color: GOLD, fontWeight: 600 }}>시기별 사이클</span>, <span style={{ color: "rgba(254,240,138,0.9)", fontWeight: 600 }}>3년·10년 로드맵</span>—<br />
          자미두수 최종 종합 리포트를 열어보세요.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CH12_TABS.map(t => (
            <div key={t.key} className="rounded-2xl px-2 py-3 text-center" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.12)" }}>
              <div className="text-2xl mb-1">{t.icon}</div>
              <p className="font-semibold" style={{ color: "rgba(254,240,138,0.7)", fontSize: "0.68rem", letterSpacing: "0.04em" }}>{t.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 py-5">
        <button type="button" onClick={onRequest} className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #451a03 0%, #92400e 30%, #b45309 60%, #d97706 100%)",
            boxShadow: "0 10px 35px rgba(251,191,36,0.32)",
            letterSpacing: "0.1em", fontSize: "0.98rem",
          }}>
          🌟 인생 종합 로드맵 완성하기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chapter 13: 10년의 메가 트렌드 (대한 분析)
// ─────────────────────────────────────────────────────────────────

const TREND_COLORS = {
  bull:    { bg: "rgba(21,128,61,0.20)", border: "rgba(34,197,94,0.35)",   text: "rgba(74,222,128,1)",   arrow: "▲", fill: "#22c55e" },
  bear:    { bg: "rgba(127,29,29,0.20)", border: "rgba(239,68,68,0.35)",    text: "rgba(252,165,165,1)",  arrow: "▼", fill: "#ef4444" },
  neutral: { bg: "rgba(120,53,15,0.20)", border: "rgba(234,179,8,0.32)",    text: "rgba(253,224,71,1)",   arrow: "▶", fill: "#eab308" },
};

const DAEHAN_TABS = [
  { key: "season"      as const, qKey: "seasonQuote"      as const, label: "인생의 계절",   icon: "🌸" },
  { key: "megaTrend"   as const, qKey: "megaTrendQuote"   as const, label: "메가 트렌드",   icon: "📈" },
  { key: "positioning" as const, qKey: "positioningQuote" as const, label: "포지셔닝 전략", icon: "🎯" },
] as const;

function MiniSparkline({ score, trend }: { score: number; trend: "bull" | "bear" | "neutral" }) {
  const tc = TREND_COLORS[trend];
  // 5 bar mini chart — last bar is tallest for bull, shortest for bear
  const bars = trend === "bull"
    ? [0.35, 0.52, 0.61, 0.72, 0.88]
    : trend === "bear"
    ? [0.78, 0.65, 0.52, 0.40, 0.28]
    : [0.50, 0.58, 0.46, 0.60, 0.52];
  return (
    <div className="flex items-end gap-0.5 h-4">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 rounded-sm" style={{ height: `${h * 100}%`, background: `${tc.fill}${i === bars.length - 1 ? "dd" : "66"}` }} />
      ))}
    </div>
  );
}

function DaehanCard({ period, isSelected, isCurrentRef, onClick }: {
  period: DaehanPeriod;
  isSelected: boolean;
  isCurrentRef?: React.Ref<HTMLDivElement>;
  onClick: () => void;
}) {
  const tc = TREND_COLORS[period.trend];
  return (
    <div
      ref={period.isCurrent ? (isCurrentRef as React.RefObject<HTMLDivElement>) : undefined}
      onClick={onClick}
      className="flex-shrink-0 rounded-2xl cursor-pointer select-none transition-all duration-200"
      style={{
        width: "88px", scrollSnapAlign: "start",
        background: period.isCurrent
          ? "linear-gradient(145deg, rgba(45,30,4,0.60), rgba(70,45,8,0.70))"
          : tc.bg,
        border: `1.5px solid ${isSelected ? "rgba(251,191,36,0.75)" : period.isCurrent ? "rgba(251,191,36,0.45)" : tc.border}`,
        boxShadow: isSelected ? "0 4px 20px rgba(251,191,36,0.18)" : "none",
        transform: isSelected ? "translateY(-4px) scale(1.02)" : "none",
        padding: "10px 7px 8px",
        outline: period.isCurrent && !isSelected ? "1px solid rgba(251,191,36,0.2)" : "none",
      }}
    >
      {period.isCurrent && (
        <div className="text-center rounded mb-1.5" style={{ background: "rgba(251,191,36,0.18)", color: "rgba(254,240,138,0.9)", fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.12em", padding: "1.5px 0" }}>
          현재
        </div>
      )}
      <div className="text-center" style={{ fontSize: "1.25rem", lineHeight: 1 }}>{period.seasonEmoji}</div>
      <div className="text-center font-extrabold mt-1" style={{ color: "rgba(255,255,255,0.92)", fontSize: "0.8rem", letterSpacing: "0.04em" }}>{period.label}</div>
      <div className="text-center mt-0.5" style={{ color: "rgba(148,163,184,0.50)", fontSize: "0.58rem" }}>{period.ageRange}</div>
      <div className="mt-2">
        <MiniSparkline score={period.score} trend={period.trend} />
      </div>
      <div className="flex items-center justify-between mt-1.5 px-0.5">
        <span style={{ color: tc.text, fontSize: "0.75rem", fontWeight: 800 }}>{tc.arrow}</span>
        <span style={{ color: tc.text, fontSize: "0.65rem", fontWeight: 700 }}>{period.score}</span>
      </div>
      <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${period.score}%`, background: `linear-gradient(90deg, ${tc.fill}99, ${tc.fill})` }} />
      </div>
      <div className="mt-1.5 text-center" style={{ color: "rgba(148,163,184,0.48)", fontSize: "0.56rem", lineHeight: 1.3, height: "1.6em", overflow: "hidden" }}>
        {period.season}
      </div>
    </div>
  );
}

function ChapterDaehanMegaTrend({ step, result, onRequest }: {
  step: TabStep; result: DaehanResult | null; onRequest: () => void;
}) {
  const [selectedIdx, setSelectedIdx] = React.useState<number>(-1);
  const [openAccordion, setOpenAccordion] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<0 | 1 | 2>(0);
  const currentCardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (result && selectedIdx === -1) {
      const idx = result.daehanList.findIndex(d => d.isCurrent);
      const safeIdx = idx >= 0 ? idx : 3;
      setSelectedIdx(safeIdx);
      setOpenAccordion(true);
      setTimeout(() => {
        currentCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }, 150);
    }
  }, [result, selectedIdx]);

  const handleCard = (idx: number) => {
    if (selectedIdx === idx) {
      setOpenAccordion(prev => !prev);
    } else {
      setSelectedIdx(idx);
      setOpenAccordion(true);
      setActiveTab(0);
    }
  };

  if (step === "loading") return (
    <div className="rounded-3xl px-6 py-14 flex flex-col items-center gap-6"
      style={{ background: "linear-gradient(145deg, rgba(10,20,40,0.50), rgba(5,15,30,0.65))", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(99,179,237,0.14)" }}>
      <div className="relative h-18 w-18" style={{ height: "72px", width: "72px" }}>
        <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "2px solid rgba(99,179,237,0.45)" }} />
        <div className="absolute inset-2 rounded-full animate-spin" style={{ border: "2px solid rgba(191,219,254,0.2)", animationDirection: "reverse", animationDuration: "2.5s" }} />
        <div className="absolute inset-4 rounded-full animate-spin" style={{ border: "1px solid rgba(59,130,246,0.15)", animationDuration: "4s" }} />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">📈</div>
      </div>
      <div className="text-center">
        <p className="font-bold tracking-[0.22em]" style={{ color: "rgba(147,197,253,0.9)", fontSize: "0.85rem" }}>10년 대한 주기를 계산하는 중</p>
        <p className="mt-2" style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.75rem" }}>거시 경제 애널리스트가 당신의 인생 시장을 분析합니다…</p>
      </div>
    </div>
  );

  if (step === "done" && result) {
    const sel = selectedIdx >= 0 ? result.daehanList[selectedIdx] : result.currentPeriod;
    const isCurrentSel = sel?.isCurrent ?? false;
    const tc = sel ? TREND_COLORS[sel.trend] : TREND_COLORS.neutral;
    const tab = DAEHAN_TABS[activeTab];
    const ch13 = result.chapter13;
    const sectionRaw = ch13[tab.key] || "";
    const sectionText = sectionRaw.replace(/\[QUOTE\]:[^\n]*/g, "").replace(/^#{1,3}[^\n]*\n?/gm, "").trim();

    return (
      <div className="rounded-3xl overflow-hidden" style={{
        background: "linear-gradient(145deg, rgba(8,18,38,0.22) 0%, rgba(5,12,28,0.30) 60%, rgba(3,8,20,0.42) 100%)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(99,179,237,0.16)",
        boxShadow: "0 8px 40px rgba(59,130,246,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        {/* Header */}
        <div className="px-6 pt-7 pb-4" style={{ borderBottom: "1px solid rgba(99,179,237,0.08)", background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,179,237,0.04) 100%)" }}>
          <p className="uppercase tracking-[0.25em] font-medium" style={{ color: "rgba(99,179,237,0.65)", fontSize: "0.68rem" }}>대한 분析 · Mega Trend</p>
          <h3 className="mt-2 font-black text-white" style={{ fontSize: "clamp(1.4rem,3.5vw,1.9rem)", lineHeight: 1.3 }}>10년의 메가 트렌드</h3>
          <p className="mt-1.5 font-light" style={{ color: "rgba(147,197,253,0.55)", fontSize: "0.88rem" }}>
            대한 흐름으로 읽는 인생의 계절 · 상승장/하락장 전략
          </p>
        </div>

        {/* 캐러셀 */}
        <div className="px-4 pt-5 pb-3">
          <p className="uppercase tracking-[0.18em] mb-3" style={{ color: "rgba(99,179,237,0.45)", fontSize: "0.62rem" }}>전 생애 대한 흐름 · 클릭하여 상세 확인</p>
          <div
            className="overflow-x-auto"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
          >
            <style>{`.daehan-scroll::-webkit-scrollbar{display:none}`}</style>
            <div className="daehan-scroll flex gap-2 pb-1" style={{ width: "max-content" }}>
              {result.daehanList.map((period, i) => (
                <DaehanCard
                  key={i}
                  period={period}
                  isSelected={selectedIdx === i}
                  isCurrentRef={currentCardRef}
                  onClick={() => handleCard(i)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="px-4 pb-3 flex gap-3">
          {(["bull", "bear", "neutral"] as const).map(t => {
            const c = TREND_COLORS[t];
            const label = t === "bull" ? "상승장" : t === "bear" ? "하락장" : "횡보";
            return (
              <div key={t} className="flex items-center gap-1.5">
                <span style={{ color: c.text, fontSize: "0.7rem", fontWeight: 700 }}>{c.arrow}</span>
                <span style={{ color: "rgba(148,163,184,0.50)", fontSize: "0.62rem" }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* 아코디언 */}
        <div style={{ overflow: "hidden", maxHeight: openAccordion && sel ? "1200px" : "0px", transition: "max-height 0.4s ease-in-out" }}>
          {sel && (
            <div className="mx-4 mb-2 rounded-2xl overflow-hidden" style={{
              border: `1px solid ${isCurrentSel ? "rgba(251,191,36,0.25)" : tc.border}`,
              background: isCurrentSel ? "rgba(40,28,4,0.25)" : tc.bg,
            }}>
              {/* 선택 기간 헤더 */}
              <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span style={{ fontSize: "1.4rem" }}>{sel.seasonEmoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold" style={{ color: "white", fontSize: "1.05rem" }}>{sel.label}</span>
                        {sel.isCurrent && (
                          <span className="rounded px-1.5 py-0.5" style={{ background: "rgba(251,191,36,0.2)", color: "rgba(254,240,138,0.9)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em" }}>현재</span>
                        )}
                      </div>
                      <div style={{ color: "rgba(148,163,184,0.55)", fontSize: "0.72rem" }}>{sel.ageRange} · {sel.startYear}–{sel.endYear}년</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div style={{ color: tc.text, fontSize: "1.1rem", fontWeight: 800 }}>{tc.arrow} {sel.score}</div>
                    <div style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.65rem" }}>{sel.keyword}</div>
                  </div>
                </div>
                {/* 계절 미니 설명 */}
                <div className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: "0.75rem" }}>인생의 계절:</span>
                  <span style={{ color: tc.text, fontSize: "0.78rem", fontWeight: 600 }}>{sel.season}</span>
                  {sel.palaceStars.length > 0 && (
                    <>
                      <span style={{ color: "rgba(148,163,184,0.3)", fontSize: "0.65rem" }}>|</span>
                      <span style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.65rem" }}>{sel.palaceStars.slice(0, 3).join(" · ")} 지배</span>
                    </>
                  )}
                </div>
              </div>

              {/* 탭 (현재 기간만 AI 분析 제공) */}
              {isCurrentSel ? (
                <>
                  {/* 탭 바 */}
                  <div className="flex gap-1 px-3 pt-3 pb-1">
                    {DAEHAN_TABS.map((t, i) => {
                      const a = activeTab === i;
                      return (
                        <button key={t.key} type="button" onClick={() => setActiveTab(i as 0 | 1 | 2)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl py-2 transition-all duration-200"
                          style={{
                            background: a ? "rgba(99,179,237,0.13)" : "transparent",
                            border: a ? "1px solid rgba(99,179,237,0.32)" : "1px solid transparent",
                            color: a ? "rgba(191,219,254,1)" : "rgba(148,163,184,0.5)",
                            fontSize: "0.68rem", fontWeight: a ? 700 : 400, cursor: "pointer",
                          }}>
                          <span>{t.icon}</span><span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* 탭 콘텐츠 */}
                  <div className="px-4 pb-4 pt-2" style={{ minHeight: "260px" }}>
                    <FadeTab tabKey={`daehan-${activeTab}`}>
                      <GenericBlockquote accent="rgba(99,179,237,1)">{ch13[tab.qKey]}</GenericBlockquote>
                      <TabTextBody text={sectionText} accent="rgba(99,179,237,1)" />
                    </FadeTab>
                  </div>
                </>
              ) : (
                <div className="px-4 py-5 text-center">
                  <p style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.82rem", lineHeight: 1.8 }}>
                    {sel.season} 시기의 {sel.label} ({sel.ageRange})<br/>
                    <span style={{ color: tc.text, fontWeight: 600 }}>{sel.keyword}</span>
                  </p>
                  <p className="mt-2 text-xs" style={{ color: "rgba(148,163,184,0.35)" }}>상세 AI 분析은 현재 대한 기간에만 제공됩니다.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 닫기/열기 버튼 */}
        {sel && (
          <button type="button" onClick={() => setOpenAccordion(prev => !prev)}
            className="w-full py-2.5 transition-all duration-200"
            style={{ color: "rgba(148,163,184,0.4)", fontSize: "0.7rem", letterSpacing: "0.1em", cursor: "pointer", background: "transparent", border: "none" }}>
            {openAccordion ? "▲ 접기" : "▼ 상세 보기"}
          </button>
        )}
      </div>
    );
  }

  // ── idle 티저 ──
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(8,15,30,0.45)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(99,179,237,0.18)" }}>
      <div className="px-6 pt-7 pb-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-13 w-13 rounded-2xl flex items-center justify-center text-2xl" style={{ width: "52px", height: "52px", background: "rgba(59,130,246,0.10)", border: "1px solid rgba(99,179,237,0.28)" }}>📈</div>
          <div>
            <p className="uppercase tracking-[0.2em] font-medium" style={{ color: "rgba(99,179,237,0.62)", fontSize: "0.65rem" }}>대한 분析 · Unlock</p>
            <p className="font-bold tracking-[0.04em] text-white" style={{ fontSize: "1.05rem", marginTop: "2px" }}>10년의 메가 트렌드</p>
          </div>
        </div>
        {/* 미니 프리뷰 캐러셀 */}
        <div className="flex gap-2 overflow-hidden">
          {(["봄","여름","가을","겨울","봄"] as const).map((s, i) => {
            const t = (["bull","bull","neutral","bear","neutral"] as const)[i];
            const e = { "봄": "🌸", "여름": "☀️", "가을": "🍂", "겨울": "❄️" }[s];
            const c = TREND_COLORS[t];
            return (
              <div key={i} className="flex-1 rounded-xl p-2 text-center opacity-60" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: "1rem" }}>{e}</div>
                <div style={{ color: c.text, fontSize: "0.65rem", fontWeight: 700 }}>{c.arrow}</div>
              </div>
            );
          })}
        </div>
        <p className="font-light" style={{ color: "rgba(147,197,253,0.58)", lineHeight: 1.95, fontSize: "0.88rem" }}>
          주식의 상승장·하락장처럼 10년 단위로 읽는 인생 사이클. <span style={{ color: "rgba(191,219,254,0.85)", fontWeight: 600 }}>인생의 계절</span>, <span style={{ color: "rgba(99,179,237,0.9)", fontWeight: 600 }}>메가 트렌드</span>, <span style={{ color: "rgba(147,197,253,0.85)", fontWeight: 600 }}>포지셔닝 전략</span>을 확인하세요.
        </p>
      </div>
      <div className="px-6 py-5">
        <button type="button" onClick={onRequest} className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #3b82f6 100%)", boxShadow: "0 8px 28px rgba(59,130,246,0.28)", letterSpacing: "0.08em", fontSize: "0.95rem" }}>
          📈 10년 대한 흐름 분析 열기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chapter 14: 올해의 마이크로 전술 (유년/유월 분析)
// ─────────────────────────────────────────────────────────────────

const MONTH_PALETTE = {
  good:    { bg: "rgba(16,185,129,0.14)", border: "rgba(52,211,153,0.38)", text: "rgba(110,231,183,1)", bar: "#10b981", icon: "▲", label: "상승" },
  average: { bg: "rgba(14,165,233,0.11)", border: "rgba(56,189,248,0.28)", text: "rgba(125,211,252,1)", bar: "#0ea5e9", icon: "→", label: "보통" },
  caution: { bg: "rgba(245,158,11,0.11)", border: "rgba(251,191,36,0.28)", text: "rgba(253,224,71,1)",  bar: "#f59e0b", icon: "▽", label: "신중" },
};
const MONTH_SEASON: Record<number, string> = {
  1:"❄️", 2:"❄️", 3:"🌸", 4:"🌸", 5:"🌸", 6:"☀️", 7:"☀️", 8:"☀️", 9:"🍂", 10:"🍂", 11:"🍂", 12:"❄️",
};
const YUNNYEON_TABS = [
  { key: "annual"   as const, qKey: "annualQuote"   as const, label: "연간 기조",   icon: "📅" },
  { key: "planning" as const, qKey: "planningQuote" as const, label: "플래닝 스킬", icon: "📋" },
] as const;

function CalendarCell({ data, isSelected, isCurrent, onClick }: {
  data: MonthEntry; isSelected: boolean; isCurrent: boolean; onClick: () => void;
}) {
  const pal = MONTH_PALETTE[data.trend];
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl flex flex-col items-center justify-between transition-all duration-200 select-none focus:outline-none"
      style={{
        padding: "8px 4px 6px",
        minHeight: "86px",
        background: isSelected
          ? `linear-gradient(145deg, rgba(251,191,36,0.18), rgba(254,240,138,0.08))`
          : isCurrent
          ? `linear-gradient(145deg, ${pal.bg}, rgba(255,255,255,0.03))`
          : pal.bg,
        border: `1.5px solid ${isSelected ? "rgba(251,191,36,0.75)" : isCurrent ? "rgba(251,191,36,0.38)" : pal.border}`,
        boxShadow: isSelected ? "0 4px 18px rgba(251,191,36,0.18)" : "none",
        transform: isSelected ? "translateY(-2px) scale(1.03)" : "none",
        cursor: "pointer",
      }}
    >
      {/* 상단: 시즌 이모지 + 현재 뱃지 */}
      <div className="w-full flex items-center justify-between px-1">
        <span style={{ fontSize: "0.75rem" }}>{MONTH_SEASON[data.month]}</span>
        {isCurrent && (
          <span style={{ background: "rgba(251,191,36,0.2)", color: "rgba(254,240,138,0.9)", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.08em", padding: "1px 4px", borderRadius: "4px" }}>NOW</span>
        )}
      </div>
      {/* 월 숫자 */}
      <div className="font-extrabold" style={{ color: isSelected ? "rgba(254,240,138,0.95)" : "rgba(255,255,255,0.88)", fontSize: "1.1rem", lineHeight: 1.1 }}>{data.month}<span style={{ fontSize: "0.6rem", fontWeight: 500, marginLeft: "1px" }}>월</span></div>
      {/* 트렌드 + 점수 */}
      <div className="flex items-center gap-1">
        <span style={{ color: pal.text, fontSize: "0.62rem", fontWeight: 800 }}>{pal.icon}</span>
        <span style={{ color: pal.text, fontSize: "0.6rem", fontWeight: 700 }}>{data.score}</span>
      </div>
      {/* 키워드 */}
      <div style={{ color: "rgba(148,163,184,0.55)", fontSize: "0.52rem", letterSpacing: "0.03em", textAlign: "center", lineHeight: 1.2, height: "1.6em", overflow: "hidden" }}>{data.keyword}</div>
      {/* 점수 바 */}
      <div className="w-full mt-1 rounded-full overflow-hidden" style={{ height: "3px", background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${data.score}%`, background: `linear-gradient(90deg, ${pal.bar}88, ${pal.bar})` }} />
      </div>
    </button>
  );
}

function MonthDetailPanel({ data, accent }: { data: MonthEntry; accent: string }) {
  const pal = MONTH_PALETTE[data.trend];
  return (
    <div style={{ animation: "genericFadeIn 0.3s ease-out both" }}>
      {/* 월 헤더 */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 rounded-xl mb-2"
        style={{ background: pal.bg, border: `1px solid ${pal.border}` }}>
        <span style={{ fontSize: "1.5rem" }}>{MONTH_SEASON[data.month]}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-extrabold" style={{ color: "rgba(255,255,255,0.92)", fontSize: "1.1rem" }}>{data.month}월</span>
            <span className="rounded px-1.5 py-0.5 font-bold" style={{ background: pal.bg, border: `1px solid ${pal.border}`, color: pal.text, fontSize: "0.62rem", letterSpacing: "0.08em" }}>{pal.icon} {pal.label}</span>
          </div>
          <div style={{ color: "rgba(148,163,184,0.55)", fontSize: "0.7rem" }}>{data.keyword} · 에너지 {data.score}/100</div>
        </div>
        {/* 점수 원형 */}
        <div className="flex-shrink-0 rounded-full flex items-center justify-center"
          style={{ width: "44px", height: "44px", background: `conic-gradient(${pal.bar} ${data.score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`, boxShadow: `0 0 10px ${pal.bar}33` }}>
          <div className="rounded-full flex items-center justify-center" style={{ width: "34px", height: "34px", background: "#0a0f1e" }}>
            <span style={{ color: pal.text, fontSize: "0.65rem", fontWeight: 800 }}>{data.score}</span>
          </div>
        </div>
      </div>
      {/* AI 분析 텍스트 */}
      {data.analysis ? (
        <div className="px-1">
          {data.analysis.split(/\n+/).map((line, i) => (
            <p key={i} style={{ color: "rgba(203,213,225,0.75)", fontSize: "0.88rem", lineHeight: 2.0, marginBottom: "0.55em", letterSpacing: "0.02em" }}>{line}</p>
          ))}
        </div>
      ) : (
        <p style={{ color: "rgba(148,163,184,0.35)", fontSize: "0.8rem", textAlign: "center", padding: "8px 0" }}>이 달의 상세 분析이 준비되어 있지 않습니다.</p>
      )}
      {/* 지배 주성 */}
      {data.stars.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {data.stars.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: `${pal.bar}22`, color: pal.text }}>{s}</span>)}
          {data.aux.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(148,163,184,0.5)" }}>{s}</span>)}
          {data.bad.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(239,68,68,0.10)", color: "rgba(252,165,165,0.6)" }}>{s}</span>)}
        </div>
      )}
    </div>
  );
}

function ChapterYunnyeonCalendar({ step, result, onRequest }: {
  step: TabStep; result: YunnyeonResult | null; onRequest: () => void;
}) {
  const [selectedMonth, setSelectedMonth] = React.useState<number | null>(null);
  const [activeTab, setActiveTab] = React.useState<0 | 1>(0);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  React.useEffect(() => {
    if (result && selectedMonth === null) {
      setSelectedMonth(currentMonth);
    }
  }, [result, selectedMonth, currentMonth]);

  const handleCellClick = (m: number) => {
    setSelectedMonth(prev => (prev === m ? null : m));
  };

  if (step === "loading") return (
    <div className="rounded-3xl px-6 py-14 flex flex-col items-center gap-6"
      style={{ background: "linear-gradient(145deg, rgba(4,20,40,0.55), rgba(2,12,28,0.65))", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(56,189,248,0.14)" }}>
      <div className="relative" style={{ height: "72px", width: "72px" }}>
        <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "2px solid rgba(56,189,248,0.45)" }} />
        <div className="absolute inset-2 rounded-full animate-spin" style={{ border: "2px solid rgba(125,211,252,0.2)", animationDirection: "reverse", animationDuration: "2.5s" }} />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">📅</div>
      </div>
      <div className="text-center">
        <p className="font-bold tracking-[0.22em]" style={{ color: "rgba(125,211,252,0.9)", fontSize: "0.85rem" }}>{currentYear}년 연간 운세 캘린더를 계산하는 중</p>
        <p className="mt-2" style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.75rem" }}>유년·유월 에너지 흐름을 월별로 분析합니다…</p>
      </div>
    </div>
  );

  if (step === "done" && result) {
    const selData = selectedMonth !== null ? result.months.find(m => m.month === selectedMonth) ?? null : null;
    const ym = result.yunnyeon;
    const tab = YUNNYEON_TABS[activeTab];
    const tabText = ym[tab.key] || "";

    // 길한 달 / 신중 달 요약
    const goodMonths = result.months.filter(m => m.trend === "good").map(m => `${m.month}월`);
    const cautionMonths = result.months.filter(m => m.trend === "caution").map(m => `${m.month}월`);

    return (
      <div className="rounded-3xl overflow-hidden" style={{
        background: "linear-gradient(145deg, rgba(4,12,30,0.22) 0%, rgba(2,8,22,0.30) 60%, rgba(1,6,18,0.42) 100%)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(56,189,248,0.16)",
        boxShadow: "0 8px 40px rgba(14,165,233,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        {/* Header */}
        <div className="px-6 pt-7 pb-4" style={{ borderBottom: "1px solid rgba(56,189,248,0.08)", background: "linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(56,189,248,0.04) 100%)" }}>
          <p className="uppercase tracking-[0.25em] font-medium" style={{ color: "rgba(56,189,248,0.65)", fontSize: "0.68rem" }}>유년 · 유월 분析 · {currentYear}</p>
          <h3 className="mt-2 font-black text-white" style={{ fontSize: "clamp(1.4rem,3.5vw,1.9rem)", lineHeight: 1.3 }}>올해의 마이크로 전술</h3>
          <p className="mt-1.5 font-light" style={{ color: "rgba(125,211,252,0.55)", fontSize: "0.88rem" }}>{result.yearGanZhi}년 유년 운세 · 월별 타이밍 지도</p>
          {/* 길신중 요약 배지 */}
          <div className="flex flex-wrap gap-2 mt-3">
            {goodMonths.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
                <span style={{ color: "rgba(110,231,183,0.9)", fontSize: "0.65rem" }}>▲ 길한 달:</span>
                <span style={{ color: "rgba(110,231,183,0.7)", fontSize: "0.65rem" }}>{goodMonths.join(" · ")}</span>
              </div>
            )}
            {cautionMonths.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(251,191,36,0.22)" }}>
                <span style={{ color: "rgba(253,224,71,0.85)", fontSize: "0.65rem" }}>▽ 신중 달:</span>
                <span style={{ color: "rgba(253,224,71,0.65)", fontSize: "0.65rem" }}>{cautionMonths.join(" · ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 12개월 캘린더 그리드 ── */}
        <div className="px-4 pt-5 pb-3">
          <p className="uppercase tracking-[0.18em] mb-3" style={{ color: "rgba(56,189,248,0.45)", fontSize: "0.62rem" }}>월별 에너지 캘린더 · 셀을 눌러 상세 분析</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "6px",
            }}
            className="sm:grid-cols-4"
          >
            <style>{`@media(min-width:480px){.yun-grid{grid-template-columns:repeat(4,1fr)!important}}`}</style>
            <div
              className="yun-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "6px",
                gridColumn: "1 / -1",
              }}
            >
              {result.months.map(m => (
                <CalendarCell
                  key={m.month}
                  data={m}
                  isSelected={selectedMonth === m.month}
                  isCurrent={m.month === currentMonth}
                  onClick={() => handleCellClick(m.month)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── 범례 ── */}
        <div className="px-4 pb-3 flex gap-4">
          {(["good","average","caution"] as const).map(t => {
            const p = MONTH_PALETTE[t];
            return (
              <div key={t} className="flex items-center gap-1.5">
                <span style={{ color: p.text, fontSize: "0.7rem", fontWeight: 700 }}>{p.icon}</span>
                <span style={{ color: "rgba(148,163,184,0.48)", fontSize: "0.62rem" }}>{t === "good" ? "상승 (65+)" : t === "average" ? "보통 (45-64)" : "신중 (~44)"}</span>
              </div>
            );
          })}
        </div>

        {/* ── 선택된 월 상세 아코디언 ── */}
        <div className="px-4" style={{
          overflow: "hidden",
          maxHeight: selData ? "560px" : "0px",
          transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)",
        }}>
          {selData && (
            <div className="rounded-2xl px-4 pt-3 pb-5 mb-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(56,189,248,0.10)" }}>
              <MonthDetailPanel data={selData} accent="rgba(56,189,248,1)" />
            </div>
          )}
        </div>

        {/* ── 분析 탭 ── */}
        <div className="mx-4 mb-0 flex gap-1 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(56,189,248,0.12)" }}>
          {YUNNYEON_TABS.map((t, i) => {
            const a = activeTab === i;
            return (
              <button key={t.key} type="button" onClick={() => setActiveTab(i as 0 | 1)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all duration-200"
                style={{ background: a ? "rgba(14,165,233,0.13)" : "transparent", border: a ? "1px solid rgba(56,189,248,0.32)" : "1px solid transparent", color: a ? "rgba(125,211,252,1)" : "rgba(148,163,184,0.5)", fontSize: "0.72rem", fontWeight: a ? 700 : 400, cursor: "pointer" }}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className="px-5 pt-4 pb-5" style={{ minHeight: "240px" }}>
          <FadeTab tabKey={`yun-${activeTab}`}>
            <GenericBlockquote accent="rgba(56,189,248,1)">{ym[tab.qKey]}</GenericBlockquote>
            <TabTextBody text={tabText} accent="rgba(56,189,248,1)" />
          </FadeTab>
        </div>

        {/* 유년궁 별 */}
        {result.yearPalaceStars.length > 0 && (
          <div className="mx-4 mb-5 rounded-2xl px-5 py-4" style={{ background: "rgba(14,165,233,0.04)", border: "1px solid rgba(56,189,248,0.10)" }}>
            <p className="uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(56,189,248,0.5)", fontSize: "0.62rem" }}>유년궁 주성 ({result.yearGanZhi})</p>
            <div className="flex flex-wrap gap-1.5">
              {result.yearPalaceStars.map(s => <span key={s} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "rgba(14,165,233,0.14)", color: "rgba(125,211,252,1)" }}>{s}</span>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── idle 티저 ──
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(4,10,25,0.45)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(56,189,248,0.18)" }}>
      <div className="px-6 pt-7 pb-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 rounded-2xl flex items-center justify-center text-2xl" style={{ width: "52px", height: "52px", background: "rgba(14,165,233,0.10)", border: "1px solid rgba(56,189,248,0.28)" }}>📅</div>
          <div>
            <p className="uppercase tracking-[0.2em] font-medium" style={{ color: "rgba(56,189,248,0.62)", fontSize: "0.65rem" }}>유년 · 유월 분석 · Unlock</p>
            <p className="font-bold tracking-[0.04em] text-white" style={{ fontSize: "1.05rem", marginTop: "2px" }}>올해의 마이크로 전술</p>
          </div>
        </div>
        {/* 프리뷰 달력 (greyed) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "5px", opacity: 0.4 }}>
          {Array.from({ length: 12 }, (_, i) => {
            const tArr: Array<"good" | "average" | "caution"> = ["good","average","good","caution","average","good","good","caution","average","good","average","caution"];
            const p = MONTH_PALETTE[tArr[i]];
            return (
              <div key={i} className="rounded-xl flex flex-col items-center justify-center" style={{ height: "52px", background: p.bg, border: `1px solid ${p.border}` }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", fontWeight: 700 }}>{i+1}월</span>
                <span style={{ color: p.text, fontSize: "0.6rem" }}>{p.icon}</span>
              </div>
            );
          })}
        </div>
        <p className="font-light" style={{ color: "rgba(125,211,252,0.58)", lineHeight: 1.95, fontSize: "0.88rem" }}>
          1월~12월 인터랙티브 운세 캘린더. <span style={{ color: "rgba(110,231,183,0.85)", fontWeight: 600 }}>길한 달</span>과 <span style={{ color: "rgba(253,224,71,0.85)", fontWeight: 600 }}>신중 달</span>을 한눈에 파악하고, 각 월 셀을 눌러 상세 분析을 확인하세요.
        </p>
      </div>
      <div className="px-6 py-5">
        <button type="button" onClick={onRequest} className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #0c2340 0%, #075985 50%, #0284c7 100%)", boxShadow: "0 8px 28px rgba(14,165,233,0.28)", letterSpacing: "0.08em", fontSize: "0.95rem" }}>
          📅 {currentYear}년 운세 캘린더 열기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chapter 15: 상하관계와 처세술 (부모궁·자녀궁 Tree Node UI)
// ─────────────────────────────────────────────────────────────────

/** 수직 연결선 */
function TreeConnector({ color = "rgba(139,92,246,0.35)" }: { color?: string }) {
  return (
    <div className="flex justify-center py-0">
      <div style={{ width: "2px", height: "32px", background: `linear-gradient(180deg, ${color}, ${color})`, borderRadius: "2px", opacity: 0.6 }} />
    </div>
  );
}

/** 개별 노드 카드 (클릭 시 팝업) */
function TreeCardNode({ icon, label, sublabel, stars, isCenter = false, color, onClick }: {
  icon: string; label: string; sublabel?: string; stars: string[];
  isCenter?: boolean; color: { bg: string; border: string; glow: string; text: string };
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl transition-all duration-200"
      style={{
        padding: isCenter ? "14px 20px" : "12px 16px",
        minWidth: isCenter ? "112px" : "96px",
        background: color.bg,
        border: `1.5px solid ${color.border}`,
        boxShadow: onClick ? `0 4px 22px ${color.glow}` : "none",
        cursor: onClick ? "pointer" : "default",
        transform: "none",
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-3px) scale(1.04)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
    >
      <span style={{ fontSize: isCenter ? "1.6rem" : "1.35rem" }}>{icon}</span>
      <span className="font-extrabold text-center leading-tight" style={{ color: color.text, fontSize: isCenter ? "0.82rem" : "0.72rem" }}>{label}</span>
      {sublabel && <span style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.6rem", textAlign: "center" }}>{sublabel}</span>}
      {stars.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center mt-0.5">
          {stars.slice(0, 3).map(s => <span key={s} style={{ background: `${color.border}33`, color: color.text, fontSize: "0.5rem", padding: "1px 5px", borderRadius: "6px" }}>{s}</span>)}
        </div>
      )}
      {onClick && <span style={{ color: color.text, fontSize: "0.52rem", opacity: 0.5, marginTop: "2px" }}>눌러서 상세 보기</span>}
    </button>
  );
}

/** 팝업 오버레이 */
function TreePopup({ title, icon, quote, body, onClose, color }: {
  title: string; icon: string; quote: string; body: string; onClose: () => void;
  color: { border: string; text: string; glow: string };
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(10,14,35,0.98), rgba(6,10,26,0.99))",
          border: `1.5px solid ${color.border}`,
          boxShadow: `0 20px 70px ${color.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
          animation: "genericFadeIn 0.25s ease-out both",
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: `1px solid ${color.border}33` }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "1.6rem" }}>{icon}</span>
            <span className="font-extrabold text-white" style={{ fontSize: "1.05rem" }}>{title}</span>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-full flex items-center justify-center transition-colors"
            style={{ width: "32px", height: "32px", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", cursor: "pointer" }}>✕</button>
        </div>
        {/* 인용구 */}
        <div className="px-6 pt-4 flex-shrink-0">
          <blockquote className="rounded-xl px-4 py-3 italic font-medium" style={{ background: `${color.border}15`, borderLeft: `3px solid ${color.border}`, color: color.text, fontSize: "0.87rem", lineHeight: 1.85 }}>
            &ldquo;{quote}&rdquo;
          </blockquote>
        </div>
        {/* 본문 스크롤 */}
        <div className="overflow-y-auto px-6 py-4 flex-1">
          {body.split(/\n+/).filter(Boolean).map((line, i) => (
            <p key={i} style={{ color: "rgba(203,213,225,0.75)", fontSize: "0.9rem", lineHeight: 2.1, marginBottom: "0.6em", letterSpacing: "0.015em" }}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

const TREE_COLORS = {
  parent: {
    bg:     "linear-gradient(145deg, rgba(109,40,217,0.18), rgba(139,92,246,0.06))",
    border: "rgba(139,92,246,0.5)",
    glow:   "rgba(139,92,246,0.22)",
    text:   "rgba(196,181,253,1)",
  },
  self: {
    bg:     "linear-gradient(145deg, rgba(99,102,241,0.22), rgba(165,180,252,0.06))",
    border: "rgba(165,180,252,0.6)",
    glow:   "rgba(165,180,252,0.28)",
    text:   "rgba(224,231,255,1)",
  },
  child: {
    bg:     "linear-gradient(145deg, rgba(45,212,191,0.14), rgba(52,211,153,0.04))",
    border: "rgba(52,211,153,0.48)",
    glow:   "rgba(52,211,153,0.20)",
    text:   "rgba(167,243,208,1)",
  },
};

const TREE_CHAP_TABS = [
  { key: "superior"    as const, qKey: "superiorQuote"    as const, label: "윗사람 처세술",   icon: "👑" },
  { key: "subordinate" as const, qKey: "subordinateQuote" as const, label: "부하직원 처세술", icon: "🌱" },
  { key: "wisdom"      as const, qKey: "wisdomQuote"      as const, label: "관계 지혜 전략",  icon: "🔮" },
] as const;

function ChapterTreeNode({ step, result, onRequest }: {
  step: TabStep; result: TreeNodeResult | null; onRequest: () => void;
}) {
  const [popup, setPopup] = React.useState<null | "parent" | "self" | "child">(null);
  const [activeTab, setActiveTab] = React.useState<0 | 1 | 2>(0);

  if (step === "loading") return (
    <div className="rounded-3xl px-6 py-14 flex flex-col items-center gap-6"
      style={{ background: "linear-gradient(145deg, rgba(20,4,40,0.55), rgba(10,2,28,0.65))", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(139,92,246,0.18)" }}>
      <div className="relative" style={{ height: "72px", width: "72px" }}>
        <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "2px solid rgba(139,92,246,0.5)" }} />
        <div className="absolute inset-2 rounded-full animate-spin" style={{ border: "2px solid rgba(196,181,253,0.2)", animationDirection: "reverse", animationDuration: "2.5s" }} />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">🌳</div>
      </div>
      <div className="text-center">
        <p className="font-bold tracking-[0.22em]" style={{ color: "rgba(196,181,253,0.9)", fontSize: "0.85rem" }}>수직 관계망 분석 중</p>
        <p className="mt-2" style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.75rem" }}>부모궁·자녀궁 에너지를 인터랙티브 트리로 구성합니다…</p>
      </div>
    </div>
  );

  if (step === "done" && result) {
    const pal = result.palace;
    const tab = TREE_CHAP_TABS[activeTab];
    const ch = result.chapter15;

    // 팝업 데이터 매핑
    const popupData: Record<"parent" | "self" | "child", { title: string; icon: string; quote: string; body: string; color: typeof TREE_COLORS.parent }> = {
      parent: { title: "멘토 · 투자자 (부모궁)", icon: "👑", quote: ch.superiorQuote, body: ch.superior, color: TREE_COLORS.parent },
      self:   { title: "나 · 나의 포지션",       icon: "⭐", quote: ch.wisdomQuote,    body: ch.wisdom,   color: TREE_COLORS.self },
      child:  { title: "멘티 · 창작물 (자녀궁)", icon: "🌱", quote: ch.subordinateQuote, body: ch.subordinate, color: TREE_COLORS.child },
    };
    const currentPopup = popup ? popupData[popup] : null;

    return (
      <div className="rounded-3xl overflow-hidden" style={{
        background: "linear-gradient(145deg, rgba(10,4,28,0.22), rgba(6,2,18,0.30))",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(139,92,246,0.16)",
        boxShadow: "0 8px 40px rgba(139,92,246,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        {/* 헤더 */}
        <div className="px-6 pt-7 pb-4" style={{ borderBottom: "1px solid rgba(139,92,246,0.09)", background: "linear-gradient(135deg, rgba(109,40,217,0.08) 0%, rgba(99,102,241,0.04) 100%)" }}>
          <p className="uppercase tracking-[0.25em] font-medium" style={{ color: "rgba(196,181,253,0.6)", fontSize: "0.68rem" }}>수직 관계망 · VERTICAL NETWORK</p>
          <h3 className="mt-2 font-black text-white" style={{ fontSize: "clamp(1.4rem,3.5vw,1.9rem)", lineHeight: 1.3 }}>상하관계와 처세술</h3>
          <p className="mt-1.5 font-light" style={{ color: "rgba(196,181,253,0.5)", fontSize: "0.88rem" }}>각 노드를 클릭하면 상세 분석을 볼 수 있습니다</p>
        </div>

        {/* ── 트리 다이어그램 ── */}
        <div className="px-6 py-8 flex flex-col items-center gap-0">
          {/* 라벨: 부모궁 */}
          <p className="uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(196,181,253,0.4)", fontSize: "0.6rem" }}>부모궁 — 윗사람 영역</p>
          {/* 부모 노드 */}
          <div className="flex justify-center gap-4">
            <TreeCardNode
              icon="🏛️" label="직장 상사" sublabel="멘토 · 투자자"
              stars={pal.bumo.stars}
              color={TREE_COLORS.parent}
              onClick={() => setPopup("parent")}
            />
            <TreeCardNode
              icon="💼" label="권위자" sublabel="후원자 · 파트너"
              stars={pal.bumo.aux.slice(0, 2)}
              color={TREE_COLORS.parent}
              onClick={() => setPopup("parent")}
            />
          </div>

          <TreeConnector color="rgba(139,92,246,0.4)" />

          {/* 나(중앙) */}
          <p className="uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(165,180,252,0.45)", fontSize: "0.6rem" }}>명궁 — 나의 포지션</p>
          <TreeCardNode
            icon="⭐" label="나" sublabel="처세술 허브"
            stars={[]}
            isCenter
            color={TREE_COLORS.self}
            onClick={() => setPopup("self")}
          />

          <TreeConnector color="rgba(52,211,153,0.38)" />

          {/* 자녀궁 */}
          <p className="uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(167,243,208,0.4)", fontSize: "0.6rem" }}>자녀궁 — 아랫사람 영역</p>
          <div className="flex justify-center gap-4">
            <TreeCardNode
              icon="🌱" label="부하직원" sublabel="팀원 · 후배"
              stars={pal.janyeo.stars}
              color={TREE_COLORS.child}
              onClick={() => setPopup("child")}
            />
            <TreeCardNode
              icon="💡" label="창작물" sublabel="프로젝트 · 지식재산"
              stars={pal.janyeo.aux.slice(0, 2)}
              color={TREE_COLORS.child}
              onClick={() => setPopup("child")}
            />
          </div>
        </div>

        {/* ── 분析 탭 ── */}
        <div className="mx-4 mb-0 flex gap-1 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}>
          {TREE_CHAP_TABS.map((t, i) => {
            const a = activeTab === i;
            return (
              <button key={t.key} type="button" onClick={() => setActiveTab(i as 0 | 1 | 2)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-1 py-2.5 transition-all duration-200"
                style={{ background: a ? "rgba(109,40,217,0.16)" : "transparent", border: a ? "1px solid rgba(139,92,246,0.35)" : "1px solid transparent", color: a ? "rgba(196,181,253,1)" : "rgba(148,163,184,0.5)", fontSize: "0.68rem", fontWeight: a ? 700 : 400, cursor: "pointer" }}>
                <span style={{ fontSize: "0.8rem" }}>{t.icon}</span><span>{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className="px-5 pt-4 pb-6" style={{ minHeight: "200px" }}>
          <FadeTab tabKey={`tree-${activeTab}`}>
            <GenericBlockquote accent="rgba(139,92,246,1)">{ch[tab.qKey]}</GenericBlockquote>
            <TabTextBody text={ch[tab.key]} accent="rgba(139,92,246,1)" />
          </FadeTab>
        </div>

        {/* 팝업 오버레이 */}
        {currentPopup && (
          <TreePopup
            title={currentPopup.title}
            icon={currentPopup.icon}
            quote={currentPopup.quote}
            body={currentPopup.body}
            color={currentPopup.color}
            onClose={() => setPopup(null)}
          />
        )}
      </div>
    );
  }

  // idle 티저
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(10,4,28,0.45)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(139,92,246,0.20)" }}>
      <div className="px-6 pt-7 pb-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 rounded-2xl flex items-center justify-center text-2xl" style={{ width: "52px", height: "52px", background: "rgba(109,40,217,0.12)", border: "1px solid rgba(139,92,246,0.30)" }}>🌳</div>
          <div>
            <p className="uppercase tracking-[0.2em] font-medium" style={{ color: "rgba(196,181,253,0.62)", fontSize: "0.65rem" }}>수직 관계망 · VERTICAL NETWORK</p>
            <p className="font-bold tracking-[0.04em] text-white" style={{ fontSize: "1.05rem", marginTop: "2px" }}>상하관계와 처세술</p>
          </div>
        </div>
        {/* 프리뷰 미니 트리 */}
        <div className="flex flex-col items-center gap-1 py-3 opacity-40 pointer-events-none select-none">
          <div className="flex gap-3">
            {["🏛️ 상사","💼 후원자"].map(l => <div key={l} className="rounded-xl px-3 py-2 text-xs font-semibold text-center" style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.4)", color: "rgba(196,181,253,0.8)", minWidth: "72px" }}>{l}</div>)}
          </div>
          <div style={{ width: "2px", height: "20px", background: "rgba(139,92,246,0.35)" }} />
          <div className="rounded-xl px-4 py-2 text-sm font-bold" style={{ background: "rgba(99,102,241,0.20)", border: "1px solid rgba(165,180,252,0.5)", color: "rgba(224,231,255,0.9)" }}>⭐ 나</div>
          <div style={{ width: "2px", height: "20px", background: "rgba(52,211,153,0.35)" }} />
          <div className="flex gap-3">
            {["🌱 부하","💡 창작물"].map(l => <div key={l} className="rounded-xl px-3 py-2 text-xs font-semibold text-center" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.38)", color: "rgba(167,243,208,0.8)", minWidth: "72px" }}>{l}</div>)}
          </div>
        </div>
        <p className="font-light" style={{ color: "rgba(196,181,253,0.55)", lineHeight: 1.95, fontSize: "0.88rem" }}>
          부모궁(윗사람·멘토)과 자녀궁(아랫사람·창작물)의 에너지를 인터랙티브 조직도로 분析합니다.
        </p>
      </div>
      <div className="px-6 py-5">
        <button type="button" onClick={onRequest} className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #1e0a3c 0%, #5b21b6 50%, #7c3aed 100%)", boxShadow: "0 8px 28px rgba(139,92,246,0.30)", letterSpacing: "0.08em", fontSize: "0.95rem" }}>
          🌳 수직 관계망 분석 열기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chapter 16: 인생 설계도 총결산 (마스터플랜)
// ─────────────────────────────────────────────────────────────────

const MASTER_TABS = [
  { key: "energyBalance" as const, qKey: "energyQuote" as const, label: "에너지 총평", icon: "⚡" },
  { key: "deepAdvice"    as const, qKey: "adviceQuote" as const, label: "심층 조언",   icon: "🔍" },
  { key: "masterHabit"   as const, qKey: "habitQuote"  as const, label: "마스터 해빗", icon: "🎯" },
] as const;

/* html2canvas를 런타임에 동적 임포트하여 SSR 오류 방지 */
async function captureAndDownload(elementId: string, filename: string) {
  // html2canvas를 dynamic import로 로드
  const html2canvas = (await import("html2canvas")).default;
  const el = document.getElementById(elementId);
  if (!el) return;
  try {
    const canvas = await html2canvas(el, {
      backgroundColor: "#06090f",  // 어두운 배경 강제
      scale: 2,                    // 2x 고해상도
      useCORS: true,               // 외부 이미지 허용
      logging: false,
    });
    // PNG 다운로드 링크 생성
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error("[MasterPlan] html2canvas 실패:", err);
    alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

function ArchetypeCardInner({ result }: { result: MasterPlanResult }) {
  const ch = result.chapter16;
  const stars = result.mingongStars;
  return (
    <div
      id="masterplan-card"
      className="rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #060912 0%, #0a0e1e 35%, #050814 70%, #0a0614 100%)",
        border: "1.5px solid rgba(251,191,36,0.35)",
        boxShadow: "0 0 60px rgba(251,191,36,0.10), inset 0 1px 0 rgba(255,255,255,0.06)",
        padding: "32px 28px",
      }}
    >
      {/* 상단 타이틀 */}
      <div className="text-center mb-6">
        <p className="uppercase tracking-[0.35em] font-medium" style={{ color: "rgba(251,191,36,0.55)", fontSize: "0.62rem" }}>CODE : DESTINY · MASTER PLAN</p>
        <div className="mt-4 mb-3" style={{ fontSize: "3rem", lineHeight: 1 }}>🌟</div>
        <h2 className="font-black text-white" style={{ fontSize: "clamp(1.3rem,4vw,2rem)", lineHeight: 1.25 }}>{result.archetypeTitle}</h2>
        <p className="mt-2 font-semibold" style={{ color: "rgba(251,191,36,0.7)", fontSize: "0.82rem", letterSpacing: "0.12em" }}>{result.characterTitle}</p>
      </div>

      {/* 명궁 별 배지 */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {stars.map(s => (
          <span key={s} className="rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", color: "rgba(253,224,71,0.9)" }}>
            {s}
          </span>
        ))}
        {result.shingongStars.map(s => (
          <span key={`sh-${s}`} className="rounded-full px-3 py-1 text-xs"
            style={{ background: "rgba(165,180,252,0.10)", border: "1px solid rgba(165,180,252,0.30)", color: "rgba(196,181,253,0.7)" }}>
            {s}
          </span>
        ))}
      </div>

      {/* 3개 핵심 이슈 */}
      {[
        { icon: "⚡", label: "에너지 밸런스", quote: ch.energyQuote },
        { icon: "🔍", label: "심층 조언",     quote: ch.adviceQuote },
        { icon: "🎯", label: "마스터 해빗",   quote: ch.habitQuote },
      ].map((item, i) => (
        <div key={i} className="rounded-2xl px-4 py-3 mb-3"
          style={{ background: i === 2 ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid rgba(251,191,36,${i === 2 ? 0.25 : 0.10})` }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: "1rem" }}>{item.icon}</span>
            <span className="font-bold" style={{ color: "rgba(251,191,36,0.8)", fontSize: "0.72rem", letterSpacing: "0.08em" }}>{item.label}</span>
          </div>
          <p className="italic" style={{ color: "rgba(224,231,255,0.7)", fontSize: "0.82rem", lineHeight: 1.85 }}>&ldquo;{item.quote}&rdquo;</p>
        </div>
      ))}

      {/* 하단 워터마크 */}
      <div className="text-center mt-5">
        <p style={{ color: "rgba(251,191,36,0.25)", fontSize: "0.6rem", letterSpacing: "0.2em" }}>CODE : DESTINY · ZIWEI DOUSHU LIFE ANALYSIS</p>
      </div>
    </div>
  );
}

function ChapterMasterPlan({ step, result, onRequest }: {
  step: TabStep; result: MasterPlanResult | null; onRequest: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<0 | 1 | 2>(0);
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    await captureAndDownload("masterplan-card", "code-destiny-masterplan.png");
    setDownloading(false);
  };

  if (step === "loading") return (
    <div className="rounded-3xl px-6 py-16 flex flex-col items-center gap-6"
      style={{ background: "linear-gradient(145deg, rgba(20,14,4,0.6), rgba(10,8,2,0.7))", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", border: "1px solid rgba(251,191,36,0.20)" }}>
      <div className="relative" style={{ height: "80px", width: "80px" }}>
        <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "2px solid rgba(251,191,36,0.5)" }} />
        <div className="absolute inset-2 rounded-full animate-spin" style={{ border: "2px solid rgba(253,224,71,0.2)", animationDirection: "reverse", animationDuration: "3s" }} />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">🌟</div>
      </div>
      <div className="text-center">
        <p className="font-black tracking-[0.22em]" style={{ color: "rgba(253,224,71,0.9)", fontSize: "0.9rem" }}>마스터플랜 리포트 생성 중</p>
        <p className="mt-2" style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.76rem" }}>전체 명반을 종합하여 당신만의 운명 지도를 완성합니다…</p>
      </div>
    </div>
  );

  if (step === "done" && result) {
    const ch = result.chapter16;
    const tab = MASTER_TABS[activeTab];
    return (
      <div className="space-y-5">
        {/* 아키타입 카드 (다운로드 대상) */}
        <ArchetypeCardInner result={result} />

        {/* 다운로드 버튼 */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #451a03 0%, #92400e 50%, #d97706 100%)", boxShadow: "0 8px 28px rgba(217,119,6,0.30)", letterSpacing: "0.08em", fontSize: "0.92rem" }}>
          {downloading ? "⏳ 이미지 저장 중…" : "📥 마스터플랜 카드 이미지 저장"}
        </button>

        {/* 분析 탭 (상세 텍스트) */}
        <div className="rounded-3xl overflow-hidden" style={{
          background: "rgba(10,8,4,0.45)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(251,191,36,0.14)",
        }}>
          <div className="flex gap-1 p-1" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(251,191,36,0.10)" }}>
            {MASTER_TABS.map((t, i) => {
              const a = activeTab === i;
              return (
                <button key={t.key} type="button" onClick={() => setActiveTab(i as 0 | 1 | 2)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-1 py-2.5 transition-all duration-200"
                  style={{ background: a ? "rgba(251,191,36,0.12)" : "transparent", border: a ? "1px solid rgba(251,191,36,0.38)" : "1px solid transparent", color: a ? "rgba(253,224,71,1)" : "rgba(148,163,184,0.5)", fontSize: "0.68rem", fontWeight: a ? 700 : 400, cursor: "pointer" }}>
                  <span style={{ fontSize: "0.8rem" }}>{t.icon}</span><span>{t.label}</span>
                </button>
              );
            })}
          </div>
          <div className="px-5 pt-4 pb-6" style={{ minHeight: "220px" }}>
            <FadeTab tabKey={`master-${activeTab}`}>
              <GenericBlockquote accent="rgba(251,191,36,1)">{ch[tab.qKey]}</GenericBlockquote>
              <TabTextBody text={ch[tab.key]} accent="rgba(251,191,36,1)" />
            </FadeTab>
          </div>
        </div>
      </div>
    );
  }

  // idle 티저
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(12,8,4,0.50)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(251,191,36,0.22)" }}>
      <div className="px-6 pt-8 pb-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 rounded-2xl flex items-center justify-center text-2xl" style={{ width: "56px", height: "56px", background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.32)" }}>🌟</div>
          <div>
            <p className="uppercase tracking-[0.2em] font-medium" style={{ color: "rgba(253,224,71,0.58)", fontSize: "0.65rem" }}>CODE : DESTINY · FINAL CHAPTER</p>
            <p className="font-black tracking-[0.04em] text-white" style={{ fontSize: "1.1rem", marginTop: "2px" }}>인생 설계도 총결산</p>
          </div>
        </div>
        {/* 프리뷰 카드 썸네일 */}
        <div className="rounded-2xl p-4 opacity-45 pointer-events-none select-none" style={{ background: "linear-gradient(135deg, #060912, #0a0e1e)", border: "1.5px solid rgba(251,191,36,0.30)" }}>
          <div className="text-center mb-3">
            <p style={{ color: "rgba(251,191,36,0.5)", fontSize: "0.52rem", letterSpacing: "0.3em" }}>CODE : DESTINY · MASTER PLAN</p>
            <div style={{ fontSize: "1.8rem", marginTop: "8px" }}>🌟</div>
            <p className="font-black text-white mt-1" style={{ fontSize: "0.9rem" }}>나만의 아키타입 카드</p>
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            {["⚡ 에너지 총평","🔍 심층 조언","🎯 마스터 해빗"].map(l => (
              <div key={l} className="rounded-full px-2.5 py-1" style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.25)", color: "rgba(253,224,71,0.7)", fontSize: "0.55rem" }}>{l}</div>
            ))}
          </div>
        </div>
        <p className="font-light" style={{ color: "rgba(253,224,71,0.55)", lineHeight: 1.95, fontSize: "0.88rem" }}>
          12개 궁의 모든 에너지를 융합한 <span style={{ color: "rgba(253,224,71,0.85)", fontWeight: 600 }}>최종 마스터플랜 리포트</span>. 나만의 아키타입 카드를 이미지로 저장할 수 있습니다.
        </p>
      </div>
      <div className="px-6 pb-6">
        <button type="button" onClick={onRequest} className="w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #1c1004 0%, #78350f 50%, #d97706 100%)", boxShadow: "0 8px 30px rgba(217,119,6,0.32)", letterSpacing: "0.08em", fontSize: "0.95rem" }}>
          🌟 인생 설계도 총결산 열기
        </button>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────
export default function HPremiumZiweiSection() {
  const [step, setStep] = useState<"intro" | "form" | "loading" | "result">("intro");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthHour, setBirthHour] = useState("12");
  const [unknownHour, setUnknownHour] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [ch2Step, setCh2Step] = useState<"idle" | "loading" | "done">("idle");
  const [ch2Result, setCh2Result] = useState<Chapter2Result | null>(null);
  const [ch3Step, setCh3Step] = useState<"idle" | "loading" | "done">("idle");
  const [ch3Result, setCh3Result] = useState<Chapter3Result | null>(null);
  const [ch4Step, setCh4Step] = useState<"idle" | "loading" | "done">("idle");
  const [ch4Result, setCh4Result] = useState<Chapter4Result | null>(null);
  const [ch5Step, setCh5Step] = useState<"idle" | "loading" | "done">("idle");
  const [ch5Result, setCh5Result] = useState<Chapter5Result | null>(null);
  const [ch6Step, setCh6Step] = useState<"idle" | "loading" | "done">("idle");
  const [ch6Result, setCh6Result] = useState<Chapter6Result | null>(null);
  const [ch7Step, setCh7Step] = useState<"idle" | "loading" | "done">("idle");
  const [ch7Result, setCh7Result] = useState<Chapter7Result | null>(null);
  const [ch8Step, setCh8Step] = useState<"idle" | "loading" | "done">("idle");
  const [ch8Result, setCh8Result] = useState<Chapter8Result | null>(null);
  const [ch9Step, setCh9Step] = useState<"idle" | "loading" | "done">("idle");
  const [ch9Result, setCh9Result] = useState<Chapter9Result | null>(null);
  const [ch10Step, setCh10Step] = useState<"idle" | "loading" | "done">("idle");
  const [ch10Result, setCh10Result] = useState<Chapter10Result | null>(null);
  const [ch11Step, setCh11Step] = useState<"idle" | "loading" | "done">("idle");
  const [ch11Result, setCh11Result] = useState<Chapter11Result | null>(null);
  const [ch12Step, setCh12Step] = useState<"idle" | "loading" | "done">("idle");
  const [ch12Result, setCh12Result] = useState<Chapter12Result | null>(null);
  const [chDaehanStep, setChDaehanStep] = useState<"idle" | "loading" | "done">("idle");
  const [chDaehanResult, setChDaehanResult] = useState<DaehanResult | null>(null);
  const [chYunStep, setChYunStep] = useState<"idle" | "loading" | "done">("idle");
  const [chYunResult, setChYunResult] = useState<YunnyeonResult | null>(null);
  const [chTreeStep, setChTreeStep] = useState<"idle" | "loading" | "done">("idle");
  const [chTreeResult, setChTreeResult] = useState<TreeNodeResult | null>(null);
  const [chMasterStep, setChMasterStep] = useState<"idle" | "loading" | "done">("idle");
  const [chMasterResult, setChMasterResult] = useState<MasterPlanResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleChapter2() {
    setCh2Step("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 2,
        }),
      });
      const data: Chapter2Result = await res.json();
      setCh2Result(data);
      setCh2Step("done");
    } catch {
      setCh2Step("idle");
    }
  }

  async function handleChapter3() {
    setCh3Step("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 3,
        }),
      });
      const data: Chapter3Result = await res.json();
      setCh3Result(data);
      setCh3Step("done");
    } catch {
      setCh3Step("idle");
    }
  }

  async function handleChapter4() {
    setCh4Step("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 4,
        }),
      });
      const data: Chapter4Result = await res.json();
      setCh4Result(data);
      setCh4Step("done");
    } catch {
      setCh4Step("idle");
    }
  }

  async function handleChapter5() {
    setCh5Step("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 5,
        }),
      });
      const data: Chapter5Result = await res.json();
      setCh5Result(data);
      setCh5Step("done");
    } catch {
      setCh5Step("idle");
    }
  }

  async function handleChapter6() {
    setCh6Step("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 6,
        }),
      });
      const data: Chapter6Result = await res.json();
      setCh6Result(data);
      setCh6Step("done");
    } catch {
      setCh6Step("idle");
    }
  }

  async function handleChapter7() {
    setCh7Step("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 7,
        }),
      });
      const data: Chapter7Result = await res.json();
      setCh7Result(data);
      setCh7Step("done");
    } catch {
      setCh7Step("idle");
    }
  }

  async function handleChapter8() {
    setCh8Step("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 8,
        }),
      });
      const data: Chapter8Result = await res.json();
      setCh8Result(data);
      setCh8Step("done");
    } catch {
      setCh8Step("idle");
    }
  }

  async function handleChapter9() {
    setCh9Step("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 9,
        }),
      });
      const data: Chapter9Result = await res.json();
      setCh9Result(data);
      setCh9Step("done");
    } catch {
      setCh9Step("idle");
    }
  }

  async function handleChapter10() {
    setCh10Step("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 10,
        }),
      });
      const data: Chapter10Result = await res.json();
      setCh10Result(data);
      setCh10Step("done");
    } catch {
      setCh10Step("idle");
    }
  }

  async function handleChapter11() {
    setCh11Step("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 11,
        }),
      });
      const data: Chapter11Result = await res.json();
      setCh11Result(data);
      setCh11Step("done");
    } catch {
      setCh11Step("idle");
    }
  }

  async function handleChapter12() {
    setCh12Step("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 12,
        }),
      });
      const data: Chapter12Result = await res.json();
      setCh12Result(data);
      setCh12Step("done");
    } catch {
      setCh12Step("idle");
    }
  }

  async function handleChapterDaehan() {
    setChDaehanStep("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 13,
        }),
      });
      const data: DaehanResult = await res.json();
      setChDaehanResult(data);
      setChDaehanStep("done");
    } catch {
      setChDaehanStep("idle");
    }
  }

  async function handleChapterYunnyeon() {
    setChYunStep("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 14,
        }),
      });
      const data: YunnyeonResult = await res.json();
      setChYunResult(data);
      setChYunStep("done");
    } catch {
      setChYunStep("idle");
    }
  }

  async function handleChapterTree() {
    setChTreeStep("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 15,
        }),
      });
      const data: TreeNodeResult = await res.json();
      setChTreeResult(data);
      setChTreeStep("done");
    } catch {
      setChTreeStep("idle");
    }
  }

  async function handleChapterMaster() {
    setChMasterStep("loading");
    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
          chapter: 16,
        }),
      });
      const data: MasterPlanResult = await res.json();
      setChMasterResult(data);
      setChMasterStep("done");
    } catch {
      setChMasterStep("idle");
    }
  }

  async function handleAnalyze() {
    if (!birthYear || !birthMonth || !birthDay) {
      setErrorMsg("생년월일을 모두 입력해 주세요.");
      return;
    }
    setErrorMsg("");
    setStep("loading");

    try {
      const res = await fetch("/api/premium/ziwei-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthYear: Number(birthYear),
          birthMonth: Number(birthMonth),
          birthDay: Number(birthDay),
          birthHour: unknownHour ? 12 : Number(birthHour),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "분석 오류");
      }
      const data: AnalysisResult = await res.json();
      setResult(data);
      setCh2Step("idle");
      setCh2Result(null);
      setCh3Step("idle");
      setCh3Result(null);
      setCh4Step("idle");
      setCh4Result(null);
      setCh5Step("idle");
      setCh5Result(null);
      setCh6Step("idle");
      setCh6Result(null);
      setCh7Step("idle");
      setCh7Result(null);
      setCh8Step("idle");
      setCh8Result(null);
      setCh9Step("idle");
      setCh9Result(null);
      setCh10Step("idle");
      setCh10Result(null);
      setCh11Step("idle");
      setCh11Result(null);
      setCh12Step("idle");
      setCh12Result(null);
      setChDaehanStep("idle");
      setChDaehanResult(null);
      setChYunStep("idle");
      setChYunResult(null);
      setChTreeStep("idle");
      setChTreeResult(null);
      setChMasterStep("idle");
      setChMasterResult(null);
      setStep("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setStep("form");
    }
  }

  // ── Intro 카드 ──────────────────────────────────────────────────
  const introView = (
    <>
      {/* 배너 이미지 */}
      <div className="relative w-full overflow-hidden" style={{ maxHeight: 340 }}>
        <img
          src="/fuctionassets/jamipremiun.webp"
          alt="H 프리미엄 자미두수 인생 총론"
          className="w-full object-cover object-center"
          style={{ display: "block", minHeight: 200 }}
        />
        {/* 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-indigo-950/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/40 via-transparent to-indigo-950/40" />

        {/* 이미지 위 배지 */}
        <div className="absolute top-4 left-4">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-black/50 px-3 py-1 text-amber-300 backdrop-blur-sm"
            style={{ fontSize: "0.7rem", letterSpacing: "0.2em" }}
          >
            ✦ H PREMIUM
          </span>
        </div>
      </div>

      {/* 본문 */}
      <div className="px-6 pb-8 pt-2">
        {/* 헤더 */}
        <p
          className="uppercase tracking-[0.28em] text-amber-400/70 font-medium"
          style={{ fontSize: "0.72rem" }}
        >
          Ziwei Doushu · Premium Life Analysis
        </p>
        <h2
          className="mt-2 font-black text-white"
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.1rem)",
            lineHeight: 1.3,
            letterSpacing: "0.02em",
          }}
        >
          자미두수 인생 총론
        </h2>
        <p
          className="mt-3 text-indigo-200/70 font-light"
          style={{ lineHeight: 1.95, letterSpacing: "0.04em", fontSize: "0.92rem" }}
        >
          당신의 명궁과 신궁에 자리한 별은{" "}
          <span className="text-amber-300/90 font-medium">당신이 태어날 때 이미 선택된 시나리오</span>입니다.
          그 별의 이름을 찾아 인생의 주인공 캐릭터를 발견하세요.
        </p>

        {/* 챕터 미리보기 */}
        <div className="mt-6 space-y-2">
          {[
            { no: "01", label: "영혼의 아키타입", desc: "별의 신화적 특성과 당신의 근본 성향" },
            { no: "02", label: "빛과 그림자", desc: "천재성과 그 이면의 맹점(Shadow) 분석" },
            { no: "03", label: "페르소나 스위칭 개운법", desc: "과학적 근거의 아침·저녁 루틴과 전략" },
          ].map((ch) => (
            <div
              key={ch.no}
              className="flex items-start gap-3 rounded-xl border border-indigo-400/15 bg-white/5 px-4 py-3"
            >
              <span
                className="shrink-0 font-black text-amber-400/50 tabular-nums"
                style={{ fontSize: "0.82rem", letterSpacing: "0.1em", paddingTop: 1 }}
              >
                {ch.no}
              </span>
              <div>
                <p className="text-sm font-semibold tracking-[0.05em] text-indigo-100">{ch.label}</p>
                <p className="text-xs text-indigo-300/60 mt-0.5 tracking-[0.03em]">{ch.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA 버튼 */}
        <button
          type="button"
          onClick={() => setStep("form")}
          className="mt-7 w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          style={{
            background: "linear-gradient(135deg, #6d28d9 0%, #4338ca 50%, #7c3aed 100%)",
            boxShadow: "0 8px 32px rgba(109,40,217,0.4)",
            letterSpacing: "0.08em",
            fontSize: "0.97rem",
          }}
        >
          ✦ 나의 별자리 캐릭터 찾기
        </button>
        <p className="mt-3 text-center text-xs tracking-[0.08em] text-indigo-400/50">
          생년월일 입력만으로 시작합니다 · 무료 체험
        </p>
      </div>
    </>
  );

  // ── 입력 폼 ────────────────────────────────────────────────────
  const formView = (
    <div className="px-6 py-8">
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={() => setStep("intro")}
        className="mb-5 flex items-center gap-1.5 text-xs tracking-[0.12em] text-indigo-400/70 hover:text-indigo-300 transition-colors"
      >
        ← 돌아가기
      </button>

      <div className="mb-6 text-center">
        <span className="text-3xl">✦</span>
        <h3
          className="mt-2 font-bold text-amber-300"
          style={{ letterSpacing: "0.12em", fontSize: "1.05rem" }}
        >
          생년월일 입력
        </h3>
        <p className="mt-1 text-xs tracking-[0.06em] text-indigo-300/60">
          정확한 별 계산을 위해 생년월일을 입력해 주세요
        </p>
      </div>

      <div className="space-y-4 max-w-sm mx-auto">
        {/* 년/월/일 */}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { label: "년도", value: birthYear, setter: setBirthYear, ph: "1990", min: "1900", max: "2099", maxLen: 4 },
              { label: "월", value: birthMonth, setter: setBirthMonth, ph: "7", min: "1", max: "12", maxLen: 2 },
              { label: "일", value: birthDay, setter: setBirthDay, ph: "15", min: "1", max: "31", maxLen: 2 },
            ] as {
              label: string; value: string;
              setter: React.Dispatch<React.SetStateAction<string>>;
              ph: string; min: string; max: string; maxLen: number;
            }[]
          ).map((f) => (
            <div key={f.label}>
              <label className="block mb-1.5 text-xs tracking-[0.1em] text-indigo-300/70 font-medium">
                {f.label}
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={f.min}
                max={f.max}
                value={f.value}
                onChange={(e) => f.setter(e.target.value)}
                placeholder={f.ph}
                maxLength={f.maxLen}
                className="w-full rounded-xl border border-indigo-400/25 bg-indigo-950/60 px-3 py-2.5 text-center font-semibold text-white placeholder-indigo-400/30 focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/30 transition-all"
                style={{ fontSize: "1rem", letterSpacing: "0.05em" }}
              />
            </div>
          ))}
        </div>

        {/* 시간 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs tracking-[0.1em] text-indigo-300/70 font-medium">출생 시각</label>
            <label className="flex items-center gap-1.5 text-xs text-indigo-400/60 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={unknownHour}
                onChange={(e) => setUnknownHour(e.target.checked)}
                className="accent-amber-400 w-3.5 h-3.5"
              />
              모름 (정오 기준)
            </label>
          </div>
          <select
            value={birthHour}
            onChange={(e) => setBirthHour(e.target.value)}
            disabled={unknownHour}
            className="w-full rounded-xl border border-indigo-400/25 bg-indigo-950/60 px-3 py-2.5 font-medium text-white focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/30 transition-all disabled:opacity-40"
            style={{ fontSize: "0.92rem", letterSpacing: "0.04em",
              color: "#fff",
              colorScheme: "dark",
            }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i} style={{ background: "#1e1b4b" }}>
                {String(i).padStart(2, "0")}:00 ({
                  ["子", "子", "丑", "丑", "寅", "寅", "卯", "卯", "辰", "辰",
                   "巳", "巳", "午", "午", "未", "未", "申", "申", "酉", "酉",
                   "戌", "戌", "亥", "亥"][i]
                }시)
              </option>
            ))}
          </select>
        </div>

        {/* 오류 메시지 */}
        {errorMsg && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-xs text-rose-300 tracking-[0.05em]">
            {errorMsg}
          </p>
        )}

        {/* 분석 시작 버튼 */}
        <button
          type="button"
          onClick={handleAnalyze}
          className="mt-2 w-full rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #6d28d9 0%, #4338ca 50%, #7c3aed 100%)",
            boxShadow: "0 8px 32px rgba(109,40,217,0.4)",
            letterSpacing: "0.1em",
            fontSize: "0.95rem",
          }}
        >
          별의 언어로 나를 분석하기 ✦
        </button>
      </div>
    </div>
  );

  // ── 결과 뷰 ────────────────────────────────────────────────────
  const resultView = result && (
    <div ref={resultRef}>
      {/* 캐릭터 히어로 블록 */}
      <CharacterHero character={result.character} palace={result.palace} />

      {/* 분석 섹션들 */}
      <div className="px-5 pb-8 space-y-3">
        <SectionCard index={0} title="영혼의 아키타입" icon="🌌">
          <div className="mt-3">{renderTextBlock(result.chapter1.archetype)}</div>
        </SectionCard>

        {result.chapter1.shadow && (
          <SectionCard index={1} title="빛과 그림자" icon="🌓">
            <div className="mt-3">{renderTextBlock(result.chapter1.shadow)}</div>
          </SectionCard>
        )}

        {result.chapter1.persona && (
          <SectionCard index={2} title="페르소나 스위칭 개운법" icon="🔄">
            <div className="mt-3">{renderTextBlock(result.chapter1.persona)}</div>
          </SectionCard>
        )}

        {/* 쳃터 1 끝 라인 */}
        <div
          className="mt-4 mb-6 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(6,182,212,0.35), transparent)",
          }}
        />

        {/* 쳃터 2 부제 */}
        <div className="mb-2 flex items-center gap-2 px-1">
          <span
            className="font-black tabular-nums"
            style={{ color: "rgba(103,232,249,0.4)", fontSize: "0.72rem", letterSpacing: "0.15em" }}
          >
            CHAPTER 02
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "rgba(6,182,212,0.15)" }}
          />
        </div>

        {/* 쳃터 2 글래스모피즘 카드 */}
        <Chapter2GlassCard
          step={ch2Step}
          result={ch2Result}
          onRequest={handleChapter2}
          characterTitle={result.character.title}
        />

        {/* 챕터 3 구분선 */}
        <div
          className="mt-4 mb-6 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(52,211,153,0.35), transparent)",
          }}
        />
        <div className="mb-2 flex items-center gap-2 px-1">
          <span
            className="font-black tabular-nums"
            style={{ color: "rgba(52,211,153,0.4)", fontSize: "0.72rem", letterSpacing: "0.15em" }}
          >
            CHAPTER 03
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "rgba(52,211,153,0.15)" }}
          />
        </div>

        {/* 챕터 3 레이더 대시보드 */}
        <Chapter3RadarDashboard
          step={ch3Step}
          result={ch3Result}
          onRequest={handleChapter3}
          characterTitle={result.character.title}
        />

        {/* 챕터 4 구분선 */}
        <div
          className="mt-4 mb-6 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(217,119,6,0.4), transparent)",
          }}
        />
        <div className="mb-2 flex items-center gap-2 px-1">
          <span
            className="font-black tabular-nums"
            style={{ color: "rgba(217,119,6,0.45)", fontSize: "0.72rem", letterSpacing: "0.15em" }}
          >
            CHAPTER 04
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "rgba(217,119,6,0.15)" }}
          />
        </div>

        {/* 챕터 4 커리어 대시보드 */}
        <Chapter4CareerDashboard
          step={ch4Step}
          result={ch4Result}
          onRequest={handleChapter4}
          characterTitle={result.character.title}
        />

        {/* 챕터 5 구분선 */}
        <div
          className="mt-4 mb-6 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(74,222,128,0.4), transparent)",
          }}
        />
        <div className="mb-2 flex items-center gap-2 px-1">
          <span
            className="font-black tabular-nums"
            style={{ color: "rgba(74,222,128,0.45)", fontSize: "0.72rem", letterSpacing: "0.15em" }}
          >
            CHAPTER 05
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "rgba(74,222,128,0.15)" }}
          />
        </div>

        {/* 챕터 5 재물 흐름 대시보드 */}
        <Chapter5WealthDashboard
          step={ch5Step}
          result={ch5Result}
          onRequest={handleChapter5}
          characterTitle={result.character.title}
        />

        {/* ── CHAPTER 06 구분선 ── */}
        <div
          className="mt-4 mb-6 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,107,107,0.4), transparent)",
          }}
        />
        <div className="mb-2 flex items-center gap-2 px-1">
          <span
            className="font-black tabular-nums"
            style={{ color: "rgba(255,107,107,0.45)", fontSize: "0.72rem", letterSpacing: "0.15em" }}
          >
            CHAPTER 06
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "rgba(255,107,107,0.15)" }}
          />
        </div>

        {/* 챕터 6 파트너십 대시보드 */}
        <Chapter6RomanceDashboard
          step={ch6Step}
          result={ch6Result}
          onRequest={handleChapter6}
        />

        {/* ── CHAPTER 07 구분선 ── */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.4))" }} />
          <span className="text-xs font-bold tracking-[0.22em] uppercase"
            style={{ color: "rgba(56,189,248,0.55)" }}>Chapter 07</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(56,189,248,0.4), transparent)" }} />
        </div>

        {/* 챕터 7 인간관계 대시보드 */}
        <Chapter7NetworkDashboard
          step={ch7Step}
          result={ch7Result}
          onRequest={handleChapter7}
        />

        {/* ── CHAPTER 08 구분선 ── */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(134,179,138,0.4))" }} />
          <span className="text-xs font-bold tracking-[0.22em] uppercase"
            style={{ color: "rgba(134,179,138,0.55)" }}>Chapter 08</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(134,179,138,0.4), transparent)" }} />
        </div>

        {/* 챕터 8 공간 에너지 대시보드 */}
        <Chapter8SpaceDashboard
          step={ch8Step}
          result={ch8Result}
          onRequest={handleChapter8}
        />

        {/* ─── CHAPTER 09 ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(20,184,166,0.4))" }} />
          <span className="text-xs font-bold tracking-[0.22em] uppercase"
            style={{ color: "rgba(20,184,166,0.55)" }}>Chapter 09</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(20,184,166,0.4), transparent)" }} />
        </div>
        <Chapter9HealthDashboard
          step={ch9Step}
          result={ch9Result}
          onRequest={handleChapter9}
        />

        {/* ─── CHAPTER 10 ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(251,146,60,0.4))" }} />
          <span className="text-xs font-bold tracking-[0.22em] uppercase"
            style={{ color: "rgba(251,146,60,0.55)" }}>Chapter 10</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(251,146,60,0.4), transparent)" }} />
        </div>
        <Chapter10CreativityDashboard
          step={ch10Step}
          result={ch10Result}
          onRequest={handleChapter10}
        />

        {/* ─── CHAPTER 11 ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(244,114,182,0.4))" }} />
          <span className="text-xs font-bold tracking-[0.22em] uppercase"
            style={{ color: "rgba(244,114,182,0.55)" }}>Chapter 11</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(244,114,182,0.4), transparent)" }} />
        </div>
        <Chapter11RootsDashboard
          step={ch11Step}
          result={ch11Result}
          onRequest={handleChapter11}
        />

        {/* ─── CHAPTER 12 — 상하관계와 처세술 ─────────────────────── */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5))" }} />
          <span className="text-xs font-bold tracking-[0.22em] uppercase"
            style={{ color: "rgba(196,181,253,0.65)" }}>Chapter 12 · 상하관계 처세술</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.5), transparent)" }} />
        </div>
        <ChapterTreeNode
          step={chTreeStep}
          result={chTreeResult}
          onRequest={handleChapterTree}
        />

        {/* ─── 심화 分析 · 대한 10년 메가 트렌드 ──────────────────── */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(99,179,237,0.4))" }} />
          <span className="text-xs font-bold tracking-[0.22em] uppercase"
            style={{ color: "rgba(99,179,237,0.55)" }}>심화 분석 · 대한 Mega Trend</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(99,179,237,0.4), transparent)" }} />
        </div>
        <ChapterDaehanMegaTrend
          step={chDaehanStep}
          result={chDaehanResult}
          onRequest={handleChapterDaehan}
        />

        {/* ── 심화 분석 · 유년 마이크로 전술 ───────────────────────── */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.38))" }} />
          <span className="text-xs font-bold tracking-[0.22em] uppercase" style={{ color: "rgba(56,189,248,0.55)" }}>심화 분석 · 유년 Micro Tactics</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(56,189,248,0.38), transparent)" }} />
        </div>
        <ChapterYunnyeonCalendar
          step={chYunStep}
          result={chYunResult}
          onRequest={handleChapterYunnyeon}
        />

        {/* ─── CHAPTER 13 — 인생 설계도 총결산 ✦ ─────────────────── */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.55))" }} />
          <span className="text-xs font-bold tracking-[0.28em] uppercase"
            style={{ color: "rgba(253,224,71,0.75)", letterSpacing: "0.28em" }}>✦ Chapter 13 · 마스터플랜 ✦</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(251,191,36,0.55), transparent)" }} />
        </div>
        <ChapterMasterPlan
          step={chMasterStep}
          result={chMasterResult}
          onRequest={handleChapterMaster}
        />

        {/* 다시 분析 */}
        <button
          type="button"
          onClick={() => setStep("form")}
          className="w-full mt-4 rounded-2xl border border-indigo-400/25 bg-white/5 px-4 py-3 text-sm font-semibold tracking-[0.08em] text-indigo-300 hover:border-indigo-400/40 hover:bg-white/8 transition-all"
        >
          다른 생년월일로 다시 분석
        </button>
      </div>
    </div>
  );

  return (
    <section
      className="overflow-hidden rounded-3xl"
      style={{
        background: "linear-gradient(145deg, #0f0c29 0%, #1a1040 30%, #0d1035 60%, #0a0a2e 100%)",
        border: "1px solid rgba(167,139,250,0.2)",
        boxShadow: "0 25px 60px rgba(67,56,202,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* 상단 스타더스트 라인 */}
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)" }}
      />

      {step === "intro" && introView}
      {step === "form" && formView}
      {step === "loading" && <ConstellationLoader />}
      {step === "result" && resultView}

      {/* 하단 장식 라인 */}
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(90deg, transparent, rgba(109,40,217,0.4), transparent)" }}
      />
    </section>
  );
}
