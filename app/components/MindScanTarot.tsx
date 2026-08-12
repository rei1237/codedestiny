"use client";

import { AnimatePresence, m, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "./Toast";
import { showSubscriptionIncludedNotice } from "./subscriptionNotice";
import { useCoinGate } from "../hooks/useCoinGate";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { lookupServerCoinPrice } from "@/app/_lib/serviceCoinPrice";
import { formatKrwFromMonthlyCredits } from "@/lib/payment/coin-pricing";

// ── TYPES ──────────────────────────────────────────────────────────────────────
const MIND_SCAN_TAROT_TEXT_TRANSLATIONS = {
  ko: {
    "mindScanTarot.001": "겉말",
    "mindScanTarot.002": "마음결",
    "mindScanTarot.003": "멈춤",
    "mindScanTarot.004": "바람",
    "mindScanTarot.005": "현실",
    "mindScanTarot.006": "말과 행동 사이 타로",
    "mindScanTarot.007": "예: 요즘 말과 행동이 달라졌는데, 지금은 어떤 거리와 속도로 다가가야 할까요?",
    "mindScanTarot.008": "말과 행동 사이 타로 리딩",
    "mindScanTarot.009": "리딩 열기",
    "mindScanTarot.010": "📷 이미지 저장",
    "mindScanTarot.011": "🔗 공유",
    "mindScanTarot.012": "📋 리딩 문장 복사",
    "mindScanTarot.013": "💛 카카오톡 공유",
    "mindScanTarot.014": "🏠 홈으로 가기",
    "mindScanTarot.015": "말과 행동 사이 타로 AI 질문문",
    "mindScanTarot.016": "이용권 혜택이 적용되어 추가 결제 없이 열렸습니다.",
    "mindScanTarot.017": "오류가 발생했습니다. 다시 시도해주세요.",
  },
} as const;

function mindScanTarotText(key: keyof typeof MIND_SCAN_TAROT_TEXT_TRANSLATIONS.ko): string {
  return MIND_SCAN_TAROT_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
type Stage = "intro" | "picking" | "spread" | "result";
type PickRound = "main" | "sub";

interface TarotPos {
  id: string; label: string; meaning: string; icon: string;
  col: number; row: number; isCenter?: boolean;
}
interface ReadingMessageExample { tone?: string; text: string; }
interface ReadingSummaryCard {
  emotionalTemperature?: number;
  emotionalTemperatureText?: string;
  corePsychology?: string;
  contactChance?: string;
  relationFlow?: string;
  reApproachChance?: string;
  recommendedAction?: string;
  relationshipStage?: string;
  silenceDriver?: string;
  situationPressure?: string;
  emotionalNeed?: string;
}
interface InnerHeartSummary {
  emotionalTemperature?: string;
  hiddenCore?: string;
  contactPossibility?: string;
  relationshipRisk?: string;
  recommendedAttitude?: string;
  finalFlow?: string;
  oracleMessage?: string;
}
interface ReadingInsightCard {
  id: string;
  icon?: string;
  category: string;
  title: string;
  headline?: string;
  summary?: string;
  bullets?: string[];
  riskLevel?: string;
}
interface ReadingSection {
  slot: number;
  icon?: string;
  title: string;
  subtitle?: string;
  positionTitle?: string;
  cardNameKo?: string;
  cardNameEn?: string;
  orientation?: "upright" | "reversed";
  keywords?: string[];
  cardMeaning?: string;
  positionMeaning?: string;
  emotionalReading?: string;
  hiddenMessage?: string;
  caution?: string;
  advice?: string;
  content?: string;
  summary?: string;
  detail?: string[];
  mainCardName?: string;
  subCardName?: string;
  mainCardKeywords?: string[];
  subCardKeywords?: string[];
  loveSignal?: "긍정" | "혼란" | "방어" | "미련" | "거리두기" | "재접근 가능";
  emotionalTemperature?: number;
}
interface ReadingResult {
  source: string;
  persona: string;
  intro: string;
  sections: ReadingSection[];
  summaryCard?: ReadingSummaryCard;
  innerHeartSummary?: InnerHeartSummary;
  insightDeck?: ReadingInsightCard[];
  masterAdvice?: string;
  suggestedMessages?: ReadingMessageExample[];
  oneLineConclusion?: string;
  closing: string;
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const POSITIONS: TarotPos[] = [
  { id: "top",    label: mindScanTarotText("mindScanTarot.001"),   meaning: "겉으로 보이는 태도",       icon: "🎭", col: 2, row: 1 },
  { id: "left",   label: mindScanTarotText("mindScanTarot.002"), meaning: "남은 감정의 결",           icon: "💓", col: 1, row: 2 },
  { id: "center", label: mindScanTarotText("mindScanTarot.003"),   meaning: "멈춰 선 이유",             icon: "🧱", col: 2, row: 2, isCenter: true },
  { id: "right",  label: mindScanTarotText("mindScanTarot.004"),   meaning: "말하지 못한 바람",         icon: "🫧", col: 3, row: 2 },
  { id: "bottom", label: mindScanTarotText("mindScanTarot.005"),   meaning: "관계의 현실 판단",         icon: "⚖️", col: 2, row: 3 },
];

const DECK_SIZE = 78;
const GRID_COUNT = 24;
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const COSMIC_PANEL = "rounded-[1.6rem] border border-indigo-300/20 bg-slate-950/45 backdrop-blur-xl shadow-[0_18px_65px_rgba(76,29,149,0.45)]";
const COSMIC_CARD = "rounded-2xl border border-cyan-300/20 bg-slate-950/40 backdrop-blur-lg";

const MAJOR = ["The Fool","The Magician","The High Priestess","The Empress","The Emperor",
  "The Hierophant","The Lovers","The Chariot","Strength","The Hermit","Wheel of Fortune",
  "Justice","The Hanged Man","Death","Temperance","The Devil","The Tower","The Star",
  "The Moon","The Sun","Judgement","The World"];
const SUITS = ["Wands","Cups","Swords","Pentacles"];
const RANKS = ["Ace","2","3","4","5","6","7","8","9","10","Page","Knight","Queen","King"];

function cardName(id: number): string {
  const n = ((id % 78) + 78) % 78;
  if (n < 22) return MAJOR[n];
  const m = n - 22;
  return `${RANKS[m % 14]} of ${SUITS[Math.floor(m / 14)]}`;
}

function cardGradient(id: number): [string, string] {
  const n = ((id % 78) + 78) % 78;
  const palettes: [string, string][] = [
    ["#f59e0b","#dc2626"],["#8b5cf6","#4c1d95"],["#06b6d4","#0e4b72"],["#10b981","#064e3b"],
    ["#f97316","#9a3412"],["#7c3aed","#3b0764"],["#ec4899","#831843"],["#3b82f6","#1e3a8a"],
    ["#ef4444","#7f1d1d"],["#6b7280","#1f2937"],["#f97316","#b45309"],["#84cc16","#365314"],
    ["#a78bfa","#4c1d95"],["#1f2937","#0f172a"],["#14b8a6","#134e4a"],["#dc2626","#450a0a"],
    ["#b45309","#451a03"],["#38bdf8","#0c4a6e"],["#6d28d9","#2e1065"],["#fbbf24","#92400e"],
    ["#e879f9","#701a75"],["#22d3ee","#083344"],
  ];
  if (n < 22) return palettes[n] || ["#9333ea","#581c87"];
  const m = n - 22;
  const suitPalettes: [string, string][] = [
    ["#f97316","#7c2d12"],["#3b82f6","#1e3a8a"],["#facc15","#78350f"],["#22c55e","#14532d"],
  ];
  return suitPalettes[Math.floor(m / 14)] || ["#9333ea","#581c87"];
}

function cardRomanSymbol(id: number): string {
  const n = ((id % 78) + 78) % 78;
  if (n < 22) return ["0","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI"][n];
  const m = n - 22;
  return ["🔥","💧","⚔️","⭕"][Math.floor(m / 14)] || "✦";
}

function compactMindscanPromptText(value: unknown, fallback = "아직 말로 다 드러나지 않은 흐름입니다."): string {
  const raw = Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean).join(" / ") : String(value || "").trim();
  return raw.replace(/\s+/g, " ").trim() || fallback;
}

function buildMindscanAiPromptText({
  question,
  reading,
  drawn,
  drawnSub,
  readingText,
}: {
  question: string;
  reading: ReadingResult;
  drawn: Record<string, number>;
  drawnSub: Record<string, number>;
  readingText: string;
}): string {
  const cardLines = POSITIONS.map((pos, index) => {
    const section = reading.sections?.[index];
    const mainCard = section?.mainCardName || cardName(drawn[pos.id] ?? index);
    const subCard = section?.subCardName || cardName(drawnSub[pos.id] ?? index + 5);

    return [
      `${index + 1}. ${pos.label} · ${pos.meaning}`,
      `앞장: ${compactMindscanPromptText(mainCard)}`,
      `이면: ${compactMindscanPromptText(subCard)}`,
      `드러난 결: ${compactMindscanPromptText(section?.summary || section?.content)}`,
      `말하지 못한 메시지: ${compactMindscanPromptText(section?.hiddenMessage)}`,
      `조심할 그림자: ${compactMindscanPromptText(section?.caution)}`,
      `내가 건넬 태도: ${compactMindscanPromptText(section?.advice)}`,
    ].join("\n");
  }).join("\n\n");

  return [
    "말과 행동 사이 타로에서 열린 아래 흐름을 바탕으로, 이 관계의 겉말과 실제 행동 사이에 남은 온도를 더 깊게 봐주세요.",
    "관계 타로 리더처럼 말해주세요. 단정적인 결론보다 감정 온도, 방어심, 침묵의 이유, 다시 닿아도 좋은 속도와 지금 건네도 되는 말을 중심으로 읽어주세요.",
    "",
    `내 질문: ${compactMindscanPromptText(question)}`,
    `페르소나: ${compactMindscanPromptText(reading.persona)}`,
    `감정 온도: ${compactMindscanPromptText(reading.summaryCard?.emotionalTemperatureText || reading.innerHeartSummary?.emotionalTemperature)}`,
    `관계 흐름: ${compactMindscanPromptText(reading.summaryCard?.relationFlow || reading.innerHeartSummary?.finalFlow)}`,
    `추천 태도: ${compactMindscanPromptText(reading.summaryCard?.recommendedAction || reading.innerHeartSummary?.recommendedAttitude)}`,
    "",
    "카드가 펼친 다섯 자리",
    cardLines,
    "",
    "방금 열린 리딩의 전체 흐름",
    compactMindscanPromptText(readingText),
    "",
    "마지막에는 지금 보내도 좋은 한 문장, 아직 보내지 말아야 할 말, 앞으로 7일 동안 지켜볼 행동 신호를 부드럽게 정리해주세요.",
  ].join("\n");
}

function pickRandom(used: Set<number>): number {
  const pool: number[] = [];
  for (let i = 0; i < DECK_SIZE; i++) if (!used.has(i)) pool.push(i);
  if (!pool.length) return Math.floor(Math.random() * DECK_SIZE);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── STAR FIELD ─────────────────────────────────────────────────────────────────
const STARS_DATA = Array.from({ length: 70 }, (_, i) => {
  const s = i * 11.37;
  return { id: i, x: +((s * 37.3) % 100).toFixed(1), y: +((s * 17.1) % 100).toFixed(1),
    size: i % 7 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1, delay: +((s % 6).toFixed(2)), dur: +(2.5 + (s % 4)).toFixed(2) };
});

function StarField() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <div style={{ position: "absolute", width: "65%", height: "50%", top: "5%", left: "17%",
        background: "radial-gradient(ellipse, rgba(109,40,217,0.14) 0%, transparent 70%)", filter: "blur(80px)", borderRadius: "50%" }} />
      <div style={{ position: "absolute", width: "40%", height: "35%", top: "55%", right: "5%",
        background: "radial-gradient(ellipse, rgba(236,72,153,0.08) 0%, transparent 70%)", filter: "blur(60px)", borderRadius: "50%" }} />
      <div style={{ position: "absolute", width: "30%", height: "30%", bottom: "10%", left: "5%",
        background: "radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)", filter: "blur(60px)", borderRadius: "50%" }} />
      {STARS_DATA.map(s => (
        <m.div key={s.id} className="absolute rounded-full"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size,
            background: s.id % 5 === 0 ? "#f0abfc" : s.id % 4 === 0 ? "#e879f9" : "#c4b5fd" }}
          animate={{ opacity: [0, s.size > 2 ? 0.9 : 0.5, 0] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }} />
      ))}
      {[0, 1].map((i) => (
        <m.div
          key={`shooting-${i}`}
          className="absolute h-[1px] w-28 rounded-full bg-gradient-to-r from-white/0 via-cyan-200/70 to-white/0"
          style={{ top: i === 0 ? "22%" : "58%", left: i === 0 ? "-10%" : "15%" }}
          animate={{ x: [0, 520, 980], y: [0, 40, 90], opacity: [0, 1, 0] }}
          transition={{ duration: i === 0 ? 4.8 : 6.2, delay: i === 0 ? 1.2 : 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── CARD BACK ─────────────────────────────────────────────────────────────────
function CardBack({ selected = false, hovered = false, orderNum = 0, round = "main" as PickRound }: {
  selected?: boolean; hovered?: boolean; orderNum?: number; round?: PickRound;
}) {
  const mainColor = round === "main" ? "#e879f9" : "#a78bfa";
  const bg = selected
    ? (round === "main"
      ? "linear-gradient(155deg,#3b0764,#7c3aed,#4c0080)"
      : "linear-gradient(155deg,#1e1b4b,#4338ca,#2d1b69)")
    : hovered
      ? "linear-gradient(155deg,#140830,#2d1b69,#0e0525)"
      : "linear-gradient(155deg,#0e0525,#1a0a3a,#0c0420)";
  const border = selected
    ? `2px solid ${mainColor}`
    : hovered ? "1.5px solid rgba(168,85,247,0.6)" : "1px solid rgba(168,85,247,0.18)";
  const shadow = selected
    ? `0 0 18px ${mainColor}99, 0 0 36px ${mainColor}44`
    : hovered ? "0 0 12px rgba(168,85,247,0.4)" : "none";

  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 10, overflow: "hidden", position: "relative",
      background: bg, border, boxShadow: shadow, transition: "all 0.18s ease" }}>
      <div style={{ position: "absolute", inset: 3, borderRadius: 7, border: "1px dashed rgba(192,132,252,0.2)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 3 }}>
        {selected ? (
          <>
            <m.span style={{ fontSize: 14, color: mainColor, lineHeight: 1 }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity }}>✦</m.span>
            <span style={{ fontSize: 13, color: "white", fontWeight: 900, lineHeight: 1 }}>{orderNum}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 10, color: hovered ? "#e879f9" : "#7c3aed", opacity: hovered ? 0.8 : 0.35 }}>✦</span>
            <span style={{ fontSize: 5.5, color: "#a855f7", opacity: 0.25, letterSpacing: "0.3em" }}>TAROT</span>
          </>
        )}
      </div>
      {(hovered || selected) && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 10,
          background: "radial-gradient(ellipse at 38% 28%, rgba(255,255,255,0.11) 0%, transparent 60%)" }} />
      )}
    </div>
  );
}

// ── CARD FACE ──────────────────────────────────────────────────────────────────
function CardFace({ pos, cardId }: { pos: TarotPos; cardId: number }) {
  const name = cardName(cardId);
  const [c1, c2] = cardGradient(cardId);
  const sym = cardRomanSymbol(cardId);
  const isLarge = pos.isCenter;
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 150, damping: 20 });
  const sy = useSpring(my, { stiffness: 150, damping: 20 });
  const rotX = useTransform(sy, [0, 1], [5, -5]);
  const rotY = useTransform(sx, [0, 1], [-5, 5]);
  const ref = useRef<HTMLDivElement>(null);
  const w = isLarge ? 84 : 62;
  const h = isLarge ? 122 : 90;

  return (
    <m.div ref={ref}
      onMouseMove={e => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => { mx.set(0.5); my.set(0.5); }}
      className="rounded-xl overflow-hidden relative select-none"
      style={{ width: w, height: h, rotateX: rotX, rotateY: rotY, perspective: 900, background: `linear-gradient(155deg, ${c1}, ${c2})`,
        boxShadow: isLarge
          ? `0 0 28px ${c1}aa, 0 0 55px ${c1}33, 0 4px 20px rgba(0,0,0,0.6)`
          : `0 0 16px ${c1}77, 0 0 32px ${c1}22, 0 4px 12px rgba(0,0,0,0.5)`,
      }}>
      <div style={{ position: "absolute", inset: 3, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 9 }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: isLarge ? 4 : 2, padding: "6px 4px" }}>
        <span style={{ fontSize: isLarge ? 24 : 18, lineHeight: 1, filter: "drop-shadow(0 0 6px rgba(255,255,255,0.6))" }}>{pos.icon}</span>
        <span style={{ fontSize: isLarge ? 11 : 9, color: "rgba(255,255,255,0.9)", fontWeight: 800, letterSpacing: "0.15em" }}>{sym}</span>
        <span style={{ fontSize: isLarge ? 8 : 7, color: "rgba(255,255,255,0.78)", textAlign: "center", lineHeight: 1.28,
          wordBreak: "break-word", maxWidth: "92%", fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: isLarge ? 9 : 7.5, color: "rgba(255,255,255,0.55)", fontWeight: 700, letterSpacing: "0.22em" }}>{pos.label.toUpperCase()}</span>
      </div>
      <div style={{ position: "absolute", inset: 0, borderRadius: 12,
        background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 45%, rgba(0,0,0,0.25) 100%)" }} />
    </m.div>
  );
}

// ── INTRO STAGE ───────────────────────────────────────────────────────────────
function IntroStage({ onStart }: { onStart: () => void }) {
  return (
    <m.div className="fixed inset-0 flex flex-col items-center justify-center px-6 z-20 overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.65 }}>
      <div className="min-h-full w-full max-w-4xl relative flex flex-col items-center justify-center py-14 text-center">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_24%,rgba(34,211,238,0.14),transparent_38%),radial-gradient(circle_at_84%_16%,rgba(196,181,253,0.14),transparent_36%),radial-gradient(circle_at_50%_82%,rgba(244,114,182,0.10),transparent_42%)]" />
        <m.div className={`${COSMIC_PANEL} relative px-6 sm:px-8 py-8 sm:py-10 w-full max-w-3xl`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="absolute inset-0 rounded-[1.6rem] border border-cyan-200/10" />
        {/* Orb with orbiting rings */}
        <m.div className="relative mb-8"
          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.75, type: "spring", stiffness: 100 }}>
          <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-full overflow-hidden relative"
            style={{ boxShadow: "0 0 60px rgba(168,85,247,0.55), 0 0 120px rgba(168,85,247,0.22), 0 0 200px rgba(168,85,247,0.08)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/fuctionassets/mindscantaro.webp"
              alt={mindScanTarotText("mindScanTarot.006")}
              className="w-full h-full object-cover"
              width={520}
              height={520}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060918]/65 via-transparent to-transparent" />
          </div>
          <m.div className="absolute inset-[-14px] rounded-full"
            style={{ border: "1px solid rgba(168,85,247,0.3)" }}
            animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{ background: "#e879f9", boxShadow: "0 0 12px #e879f9" }} />
          </m.div>
          <m.div className="absolute inset-[-26px] rounded-full"
            style={{ border: "1px solid rgba(99,102,241,0.2)" }}
            animate={{ rotate: -360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}>
            <div className="absolute bottom-0 right-2 w-2 h-2 rounded-full"
              style={{ background: "#818cf8", boxShadow: "0 0 8px #818cf8" }} />
          </m.div>
          <m.div className="absolute inset-[-5px] rounded-full border-2 border-purple-500/20"
            animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.8, repeat: Infinity }} />
        </m.div>

        {/* Title */}
        <m.div className="space-y-3 mb-8" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <span className="px-2.5 py-1 rounded-full border border-cyan-300/30 bg-cyan-400/10 text-[10px] tracking-[0.22em] text-cyan-100/85 uppercase">Stellar Reading</span>
            <span className="px-2.5 py-1 rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 text-[10px] tracking-[0.22em] text-fuchsia-100/85 uppercase">Mind Scan</span>
          </div>
          <p className="text-[11px] tracking-[0.55em] text-purple-300/70 uppercase">Between Words Tarot</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight drop-shadow-[0_0_20px_rgba(192,132,252,0.42)]" style={{ fontFamily: "'Cormorant Garamond','Noto Serif KR',serif" }}>
            말과 행동 사이의 온도<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-pink-400">
              관계 간격 리딩
            </span>
          </h1>
          <p className="text-sm text-indigo-100/70 leading-relaxed max-w-sm mx-auto">
            직관을 따라 10장의 카드를 선택하세요.<br />
            말과 침묵 사이에 놓인 감정의 거리와 다가갈 수 있는 속도를 읽습니다.
          </p>
        </m.div>

        {/* Position icons */}
        <m.div className="flex items-center justify-center gap-4 mb-7 bg-slate-900/45 rounded-2xl px-6 py-3 border border-indigo-200/15 backdrop-blur-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }}>
          {POSITIONS.map(p => (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <span className="text-xl">{p.icon}</span>
              <span className="text-[9px] text-purple-300/50">{p.label}</span>
            </div>
          ))}
        </m.div>

        {/* Flow steps */}
        <m.div className="flex items-center gap-2 mb-8 text-[10px] text-indigo-200/55"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {["메인 5장", "→", "보조 5장", "→", "자리 공개", "→", "심층 리딩"].map((t, i) => (
            <span key={i} className={t === "→" ? "text-purple-800/40" : ""}>{t}</span>
          ))}
        </m.div>

        {/* CTA button */}
        <m.button onClick={onStart}
          className="relative overflow-hidden px-12 py-4 rounded-full text-white font-bold text-sm tracking-[0.22em] uppercase border border-cyan-200/35 bg-gradient-to-r from-indigo-600/90 via-violet-600/90 to-fuchsia-600/90 shadow-[0_0_34px_rgba(34,211,238,0.35),0_0_62px_rgba(168,85,247,0.38)]"
          initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.62, type: "spring" }}
          whileHover={{ scale: 1.07, boxShadow: "0 0 52px rgba(168,85,247,0.7), 0 6px 30px rgba(109,40,217,0.5)" }}
          whileTap={{ scale: 0.95 }}>
          <m.div className="absolute inset-0 rounded-full"
            animate={{ opacity: [0, 0.32, 0] }} transition={{ duration: 2.2, repeat: Infinity }}
            style={{ background: "radial-gradient(ellipse at center, rgba(232,121,249,0.55) 0%, transparent 70%)" }} />
          <span className="relative z-10">🔮 마음의 문 열기</span>
        </m.button>

        <m.p className="mt-5 text-[10px] text-purple-500/40 tracking-widest"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}>
          ✦ 그 사람의 말, 행동, 침묵을 조용히 떠올리며 시작하세요 ✦
        </m.p>
        </m.div>
      </div>
    </m.div>
  );
}

// ── PICKING STAGE ─────────────────────────────────────────────────────────────
interface PickingStageProps {
  round: PickRound;
  mainSelected: number[];
  subSelected: number[];
  onPick: (gridIdx: number) => void;
}

const GRID_ROTATIONS = Array.from({ length: GRID_COUNT }, (_, i) =>
  (((i * 7 + 3) % 11) - 5) * 0.35
);

function PickingStage({ round, mainSelected, subSelected, onPick }: PickingStageProps) {
  const [hovIdx, setHovIdx] = useState(-1);
  const currentSelected = round === "main" ? mainSelected : subSelected;
  const done = currentSelected.length >= 5;

  const isDisabled = useCallback((idx: number) =>
    round === "main"
      ? mainSelected.includes(idx)
      : mainSelected.includes(idx) || subSelected.includes(idx),
    [round, mainSelected, subSelected]);

  const pickOrder = useCallback((idx: number) =>
    round === "main" ? mainSelected.indexOf(idx) + 1 : subSelected.indexOf(idx) + 1,
    [round, mainSelected, subSelected]);

  const nextPos = useMemo(() =>
    currentSelected.length < POSITIONS.length ? POSITIONS[currentSelected.length] : null,
    [currentSelected.length]);

  return (
    <m.div className="fixed inset-0 flex flex-col z-20 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.09),transparent_40%),radial-gradient(circle_at_78%_22%,rgba(217,70,239,0.10),transparent_36%)]"
      initial={{ opacity: 0, x: round === "sub" ? 30 : 0 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: round === "main" ? -30 : 0 }}
      transition={{ duration: 0.35 }}>

      {/* Header */}
      <div className={`flex-shrink-0 pt-5 pb-3 px-4 text-center mx-auto mt-3 w-[min(100%,34rem)] ${COSMIC_PANEL}`}>
        <p className="text-[10px] tracking-[0.42em] text-purple-400/60 uppercase mb-1">Between Words Tarot</p>
        <m.h2 key={round} className="text-xl sm:text-2xl font-bold text-white"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {round === "main"
            ? <><span className="text-fuchsia-300">메인 카드</span> 5장 선택</>
            : <><span className="text-violet-300">보조 카드</span> 5장 선택</>}
        </m.h2>
        <AnimatePresence mode="wait">
          <m.p key={done ? "done" : `pos-${nextPos?.id}`}
            className="text-xs text-purple-300/45 mt-1 h-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {done
              ? (round === "main" ? "✨ 완료! 보조 카드로 이동합니다..." : "✨ 모든 카드 선택 완료!")
              : nextPos
                ? `선택 중: ${nextPos.icon} ${nextPos.label} — ${nextPos.meaning}`
                : "카드를 선택하세요"}
          </m.p>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {[0, 1, 2, 3, 4].map(i => (
            <m.div key={i} className="rounded-full h-2"
              animate={{
                width: i < currentSelected.length ? 24 : 8,
                backgroundColor: i < currentSelected.length
                  ? (round === "main" ? "#e879f9" : "#a78bfa")
                  : "rgba(168,85,247,0.18)",
              }}
              transition={{ duration: 0.26 }} />
          ))}
          <span className="text-[11px] text-purple-300/55 ml-1">{currentSelected.length} / 5</span>
        </div>

        {/* Round tabs */}
        <div className="flex items-center justify-center gap-2 mt-2.5">
          <div className={`text-[10px] px-3 py-0.5 rounded-full border transition-colors ${round === "main" ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300" : "border-purple-800/30 text-purple-600/50"}`}>
            메인 카드
          </div>
          <span className="text-purple-800/35 text-xs">→</span>
          <div className={`text-[10px] px-3 py-0.5 rounded-full border transition-colors ${round === "sub" ? "border-violet-500/40 bg-violet-500/10 text-violet-300" : "border-purple-800/30 text-purple-600/50"}`}>
            보조 카드
          </div>
        </div>
      </div>

      {/* Card Grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-8 pt-2">
        <div className={`${COSMIC_CARD} mx-auto w-[min(100%,32rem)] p-3 sm:p-4`}>
          <div className="grid gap-2.5 sm:gap-3 mx-auto" style={{ gridTemplateColumns: "repeat(6, 1fr)", maxWidth: 444 }}>
          {Array.from({ length: GRID_COUNT }, (_, idx) => {
            const disabled = isDisabled(idx);
            const order = pickOrder(idx);
            const isSel = order > 0;
            const isHov = hovIdx === idx && !disabled && !done;

            return (
              <m.div key={idx}
                className="relative"
                style={{ cursor: disabled || done ? "default" : "pointer" }}
                animate={{ opacity: disabled && !isSel ? 0.27 : 1 }}
                whileHover={!disabled && !done ? { scale: 1.14, rotate: 0 } : {}}
                whileTap={!disabled && !done ? { scale: 0.9 } : {}}
                initial={{ rotate: GRID_ROTATIONS[idx] }}
                onClick={() => !disabled && !done && onPick(idx)}
                onHoverStart={() => setHovIdx(idx)}
                onHoverEnd={() => setHovIdx(-1)}>
                <div style={{ aspectRatio: "2/3" }}>
                  <CardBack selected={isSel} hovered={isHov} orderNum={order} round={round} />
                </div>
                {isSel && (
                  <m.div className="absolute inset-0 rounded-[10px]"
                    initial={{ opacity: 0.85 }} animate={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    style={{ background: round === "main" ? "rgba(232,121,249,0.38)" : "rgba(167,139,250,0.38)" }} />
                )}
              </m.div>
            );
          })}
          </div>
        </div>
      </div>
    </m.div>
  );
}

// ── SPREAD STAGE ───────────────────────────────────────────────────────────────
interface SpreadStageProps {
  drawn: Record<string, number>;
  drawnSub: Record<string, number>;
  revealedCount: number;
  readingLoading: boolean;
  readingError: string;
  question: string;
  onQuestionChange: (value: string) => void;
  onGenerateReading: () => void;
}

function SpreadStage({ drawn, drawnSub, revealedCount, readingLoading, readingError, question, onQuestionChange, onGenerateReading }: SpreadStageProps) {
  const allRevealed = revealedCount >= POSITIONS.length;
  const questionReady = String(question || "").trim().length > 0;

  return (
    <m.div className="fixed inset-0 flex flex-col items-center justify-center z-20 overflow-y-auto bg-[radial-gradient(circle_at_24%_14%,rgba(56,189,248,0.10),transparent_35%),radial-gradient(circle_at_76%_16%,rgba(217,70,239,0.11),transparent_34%)]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}>
      <div className="min-h-full w-full max-w-4xl flex flex-col items-center justify-center px-4 py-10">

        {/* Header */}
        <m.div className={`text-center mb-7 w-full max-w-2xl px-5 py-5 ${COSMIC_PANEL}`} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[10px] tracking-[0.45em] text-purple-400/60 uppercase mb-1">Between Words Tarot</p>
          <AnimatePresence mode="wait">
            <m.h2 key={allRevealed ? "done" : `r${revealedCount}`}
              className="text-xl sm:text-2xl font-bold text-white"
              initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }}
              transition={{ duration: 0.28 }}>
              {allRevealed
                ? <>마음의 결이 모두 <span className="text-fuchsia-300">펼쳐졌습니다</span> ✨</>
                : <>{POSITIONS[revealedCount]?.icon} <span className="text-fuchsia-300">{POSITIONS[revealedCount]?.label}</span> 포지션이 열립니다</>
              }
            </m.h2>
          </AnimatePresence>
          {!allRevealed && (
            <m.p className="text-xs text-purple-400/40 mt-1"
              animate={{ opacity: [0.38, 0.65, 0.38] }} transition={{ duration: 1.6, repeat: Infinity }}>
              {POSITIONS[revealedCount]?.meaning}
            </m.p>
          )}
        </m.div>

        {/* Cross layout */}
        <div className={`${COSMIC_CARD} grid gap-5 sm:gap-7 mb-8 flex-shrink-0 p-4 sm:p-6`}
          style={{ gridTemplateColumns: "repeat(3, auto)", gridTemplateRows: "repeat(3, auto)" }}>
          {POSITIONS.map((pos, i) => {
            const revealed = i < revealedCount;
            const active = i === revealedCount;
            const [c1, c2] = revealed ? cardGradient(drawn[pos.id] ?? i) : ["#1a0a3a","#0e0525"];

            return (
              <div key={pos.id} style={{ gridColumn: pos.col, gridRow: pos.row }}
                className="flex flex-col items-center gap-1.5">
                <m.span animate={{ opacity: revealed ? 0.7 : 0.28 }}
                  className="text-[9px] text-purple-300 tracking-widest uppercase font-medium">{pos.label}</m.span>

                <div className="relative">
                  {/* Sub card shadow (behind main) */}
                  {revealed && pos.id in drawnSub && (
                    <m.div initial={{ opacity: 0 }} animate={{ opacity: 0.55 }}
                      className="absolute z-0 rounded-xl overflow-hidden"
                      style={{ transform: "translate(8px, 8px)", width: pos.isCenter ? 84 : 62, height: pos.isCenter ? 122 : 90,
                        background: `linear-gradient(155deg, ${cardGradient(drawnSub[pos.id])[0]}, ${cardGradient(drawnSub[pos.id])[1]})` }}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white/25 text-[10px]">{cardRomanSymbol(drawnSub[pos.id])}</span>
                      </div>
                    </m.div>
                  )}

                  <m.div className="relative z-10">
                    <AnimatePresence mode="wait">
                      {revealed ? (
                        <m.div key="face"
                          initial={{ rotateY: -85, scale: 0.72, opacity: 0 }}
                          animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                          transition={{ duration: 0.6, ease: [0.2, 0.65, 0, 1.15] }}>
                          <CardFace pos={pos} cardId={drawn[pos.id] ?? i} />
                        </m.div>
                      ) : (
                        <m.div key="back">
                          <div style={{
                            width: pos.isCenter ? 84 : 62, height: pos.isCenter ? 122 : 90, borderRadius: 10,
                            background: active ? "linear-gradient(155deg,#1a0a3a,#2d1b69)" : "linear-gradient(155deg,#0c0420,#150830)",
                            border: active ? "1.5px solid rgba(168,85,247,0.55)" : "1px solid rgba(168,85,247,0.15)",
                            boxShadow: active ? "0 0 22px rgba(168,85,247,0.4)" : "none",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.4s ease",
                          }}>
                            <m.span style={{ fontSize: pos.isCenter ? 24 : 18 }}
                              animate={active ? { opacity: [0.35, 1, 0.35], scale: [1, 1.12, 1] } : { opacity: 0.18 }}
                              transition={active ? { duration: 1.1, repeat: Infinity } : {}}>
                              {pos.icon}
                            </m.span>
                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </m.div>
                </div>

                <m.span animate={{ opacity: revealed ? 0.48 : 0 }}
                  className="text-[8px] text-purple-300 text-center max-w-[76px] leading-tight">
                  {pos.meaning}
                </m.span>
              </div>
            );
          })}
        </div>

        {/* Reading CTA (shows after all revealed) */}
        <AnimatePresence>
          {allRevealed && (
            <m.div className="flex-shrink-0 text-center"
              initial={{ opacity: 0, y: 22, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 18 }}>
              <div className="mx-auto mb-4 w-full max-w-xl rounded-[1.2rem] border border-fuchsia-300/20 bg-slate-950/45 px-4 py-4 text-left backdrop-blur-md">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold tracking-[0.18em] text-fuchsia-100/80 uppercase">
                    상담 질문
                  </span>
                  <textarea
                    value={question}
                    onChange={(event) => onQuestionChange(event.target.value)}
                    placeholder={mindScanTarotText("mindScanTarot.007")}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-fuchsia-200/20 bg-slate-900/70 px-4 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-fuchsia-300/45 focus:bg-slate-900"
                  />
                </label>
                <p className="mt-2 text-[11px] leading-relaxed text-purple-200/55">
                  질문은 필수입니다. 질문의 맥락이 있어야 카드 상징과 감정 흐름을 구체적으로 결합할 수 있습니다.
                </p>
              </div>
              <p className="text-xs text-purple-300/45 mb-4 tracking-wide">
                10장의 카드가 모두 준비되었습니다
              </p>
              {readingError && (
                <p className="text-xs text-rose-300/80 mb-3 max-w-xs mx-auto leading-relaxed">{readingError}</p>
              )}
              <m.button onClick={onGenerateReading} disabled={readingLoading || !questionReady}
                className="relative overflow-hidden px-11 py-4 rounded-full text-white font-bold text-sm tracking-widest uppercase disabled:opacity-60"
                style={{
                  background: readingLoading
                    ? "rgba(109,40,217,0.55)"
                    : "linear-gradient(135deg,#7c3aed,#ec4899 55%,#a855f7)",
                  boxShadow: readingLoading ? "none" : "0 0 36px rgba(168,85,247,0.55), 0 0 60px rgba(236,72,153,0.25)",
                }}
                whileHover={!readingLoading ? { scale: 1.07 } : {}}
                whileTap={!readingLoading ? { scale: 0.95 } : {}}>
                {!readingLoading && (
                  <m.div className="absolute inset-0 rounded-full"
                    animate={{ opacity: [0, 0.3, 0] }} transition={{ duration: 2, repeat: Infinity }}
                    style={{ background: "radial-gradient(ellipse, rgba(232,121,249,0.5) 0%, transparent 70%)" }} />
                )}
                <span className="relative z-10 flex items-center gap-2.5">
                  {readingLoading
                    ? <>
                      <m.span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white inline-block"
                        animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
                      카드의 간격을 읽는 중...
                    </>
                    : "✨ 마음의 결 리딩 열기"}
                </span>
              </m.button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.div>
  );
}

// ── RESULT STAGE ───────────────────────────────────────────────────────────────
const SLOT_ICONS = ["🎭", "💓", "🧱", "🫧", "⚖️", "🛰️", "📝"];
const LOVE_SIGNAL_CLASS: Record<string, string> = {
  "긍정": "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
  "혼란": "border-amber-400/35 bg-amber-500/15 text-amber-100",
  "방어": "border-sky-400/35 bg-sky-500/15 text-sky-100",
  "미련": "border-pink-400/35 bg-pink-500/15 text-pink-100",
  "거리두기": "border-slate-300/35 bg-slate-500/15 text-slate-100",
  "재접근 가능": "border-violet-300/45 bg-violet-500/20 text-violet-100",
};
const RISK_LEVEL_CLASS: Record<string, string> = {
  "낮음": "border-emerald-300/35 bg-emerald-500/15 text-emerald-100",
  "중간": "border-amber-300/35 bg-amber-500/15 text-amber-100",
  "중상": "border-orange-300/35 bg-orange-500/15 text-orange-100",
  "높음": "border-rose-300/35 bg-rose-500/15 text-rose-100",
};

interface ResultStageProps {
  drawn: Record<string, number>;
  drawnSub: Record<string, number>;
  reading: ReadingResult;
  question: string;
  onRestart: () => void;
  reportRef: React.RefObject<HTMLDivElement>;
}

function ResultStage({ drawn, drawnSub, reading, question, onRestart, reportRef }: ResultStageProps) {
  const [shareMsg, setShareMsg] = useState("");
  const [aiPromptMsg, setAiPromptMsg] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);
  const LUXE_PANEL = "rounded-[1.5rem] border border-amber-200/25 bg-[linear-gradient(145deg,rgba(36,20,10,0.84),rgba(22,14,22,0.9)_48%,rgba(10,10,18,0.92))] backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.58),0_0_28px_rgba(251,191,36,0.14)]";
  const LUXE_CARD = "rounded-[1.2rem] border border-amber-100/20 bg-[linear-gradient(150deg,rgba(30,20,16,0.78),rgba(16,16,26,0.82))] backdrop-blur-lg";
  const summaryCard = reading.summaryCard || {};
  const innerHeartSummary = reading.innerHeartSummary || {};
  const emotionalTemp = Math.min(5, Math.max(1, Math.round(Number(summaryCard.emotionalTemperature)) || 3));
  const insightDeck = useMemo(
    () => (Array.isArray(reading.insightDeck) ? reading.insightDeck.slice(0, 6) : []),
    [reading.insightDeck],
  );
  const suggestedMessages = Array.isArray(reading.suggestedMessages) ? reading.suggestedMessages.slice(0, 3) : [];
  const [openedInsightIds, setOpenedInsightIds] = useState<string[]>([]);
  const [activeInsightId, setActiveInsightId] = useState<string>("");

  const activeInsight = useMemo(() => {
    if (!insightDeck.length) return null;
    const picked = insightDeck.find((item) => item.id === activeInsightId);
    return picked || insightDeck[0];
  }, [insightDeck, activeInsightId]);

  useEffect(() => {
    if (!insightDeck.length) {
      setOpenedInsightIds([]);
      setActiveInsightId("");
      return;
    }
    const first = insightDeck[0];
    setOpenedInsightIds([first.id]);
    setActiveInsightId(first.id);
  }, [insightDeck]);

  const handleDrawInsight = useCallback((card: ReadingInsightCard) => {
    const id = String(card?.id || "");
    if (!id) return;
    setActiveInsightId(id);
    setOpenedInsightIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  // Stagger-reveal sections
  useEffect(() => {
    const total = (reading.sections?.length ?? 0) + 10;
    let n = 0;
    const t = setInterval(() => { n++; setVisibleCount(n); if (n >= total) clearInterval(t); }, 200);
    return () => clearInterval(t);
  }, [reading.sections?.length]);

  const buildText = useCallback(() => [
    "[말과 행동 사이 타로 리딩]", `페르소나: ${reading.persona}`, "",
    `감정 온도: ${summaryCard.emotionalTemperatureText || `${summaryCard.emotionalTemperature || 3} / 5`}`,
    `현재 심리: ${summaryCard.corePsychology || "미련은 있지만 먼저 다가오기는 조심스러운 상태"}`,
    `다시 닿을 여지: ${summaryCard.contactChance || "낮지는 않지만, 방어심리가 변수"}`,
    `관계 흐름: ${summaryCard.relationFlow || "단절보다 거리두기에 가까운 흐름"}`,
    `관계 단계: ${summaryCard.relationshipStage || "유보형 거리두기 단계"}`,
    `침묵 동인: ${summaryCard.silenceDriver || "자존심과 상처 재발 우려가 먼저 작동"}`,
    `상황 압력: ${summaryCard.situationPressure || "접근 강도 조절이 필요한 중간 구간"}`,
    `감정 욕구: ${summaryCard.emotionalNeed || "안전감과 존중 확인 욕구"}`,
    `추천 행동: ${summaryCard.recommendedAction || "부담 없는 안부로 접점 만들기"}`,
    "",
    "[관계 간격 종합 상담]",
    `감정 온도: ${innerHeartSummary.emotionalTemperature || "감정과 방어가 동시에 움직이는 흐름"}`,
    `겉말 아래 남은 감정: ${innerHeartSummary.hiddenCore || "겉표현 아래에 망설임과 미련이 함께 남아 있습니다."}`,
    `다시 닿을 여지: ${innerHeartSummary.contactPossibility || "타이밍을 존중한 접근에서 반응 가능성이 열립니다."}`,
    `관계의 위험 신호: ${innerHeartSummary.relationshipRisk || "확답 요구와 감정 압박은 방어를 강화할 수 있습니다."}`,
    `내가 취할 태도: ${innerHeartSummary.recommendedAttitude || "짧고 안정적인 메시지로 리듬을 맞추는 태도"}`,
    `최종 흐름: ${innerHeartSummary.finalFlow || "조정 구간을 거치며 관계 방향이 정해지는 흐름"}`,
    `오라클 메시지: ${innerHeartSummary.oracleMessage || "안전감을 주는 말 한 줄이 흐름을 바꿉니다."}`,
    "",
    "[감정과 상황의 딥다이브 카드]",
    ...(insightDeck || []).map((card, idx) =>
      [
        `${idx + 1}. ${card.category} - ${card.title}`,
        card.headline ? `핵심: ${card.headline}` : "",
        card.summary || "",
        ...(Array.isArray(card.bullets) ? card.bullets : []),
      ].filter(Boolean).join("\n")
    ),
    "",
    reading.intro, "",
    ...(reading.sections || []).map(s =>
      [
        `${s.slot}. ${s.title}`,
        s.subtitle ? `소제목: ${s.subtitle}` : "",
        `메인: ${s.mainCardName || "-"} / 보조: ${s.subCardName || "-"}`,
        s.summary || s.content || "",
        ...(Array.isArray(s.detail) ? s.detail : []),
      ].filter(Boolean).join("\n")
    ),
    "",
    "[지금 보내기 좋은 메시지 예시]",
    ...suggestedMessages.map((item, idx) => `${idx + 1}. ${item.tone || "메시지"}: ${item.text}`),
    "",
    reading.masterAdvice || "",
    "",
    reading.oneLineConclusion || reading.closing,
  ].join("\n"), [innerHeartSummary, insightDeck, reading, suggestedMessages, summaryCard]);

  const aiPromptText = useMemo(() => buildMindscanAiPromptText({
    question,
    reading,
    drawn,
    drawnSub,
    readingText: buildText(),
  }), [buildText, drawn, drawnSub, question, reading]);

  const showMsg = (msg: string) => { setShareMsg(msg); setTimeout(() => setShareMsg(""), 2500); };
  const showAiPromptMsg = (msg: string) => { setAiPromptMsg(msg); setTimeout(() => setAiPromptMsg(""), 2500); };

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: mindScanTarotText("mindScanTarot.008"), text: reading.intro }); showMsg("공유 완료!"); return; } catch (e) {}
    }
    try { await navigator.clipboard.writeText(buildText()); showMsg("리딩 문장이 복사되었습니다."); } catch (e) { showMsg("공유 실패"); }
  }, [reading, buildText]);

  const handleKakaoShare = useCallback(async () => {
    const currentUrl = typeof window !== "undefined"
      ? window.location.href
      : "https://code-destiny.com/tarot/mindscan";
    const shareTitle = "말과 행동 사이 타로 리딩";
    const shortIntro = String(reading?.intro || "")
      .replace(/\s+/g, " ")
      .slice(0, 90);
    const shareDesc = shortIntro || "말과 행동 사이의 온도를 섬세하게 읽는 관계 간격 타로";

    try {
      const kakao = (window as Window & {
        Kakao?: {
          isInitialized?: () => boolean;
          Share?: {
            sendDefault: (payload: {
              objectType: "feed";
              content: {
                title: string;
                description: string;
                imageUrl: string;
                link: { mobileWebUrl: string; webUrl: string };
              };
              buttons?: Array<{
                title: string;
                link: { mobileWebUrl: string; webUrl: string };
              }>;
            }) => void;
          };
        };
      }).Kakao;

      if (kakao?.isInitialized?.() && kakao?.Share?.sendDefault) {
        kakao.Share.sendDefault({
          objectType: "feed",
          content: {
            title: shareTitle,
            description: shareDesc,
            imageUrl: "https://code-destiny.com/fuctionassets/mindscantaro.webp",
            link: { mobileWebUrl: currentUrl, webUrl: currentUrl },
          },
          buttons: [{
            title: mindScanTarotText("mindScanTarot.009"),
            link: { mobileWebUrl: currentUrl, webUrl: currentUrl },
          }],
        });
        showMsg("카카오톡 공유 창을 열었어요!");
        return;
      }

      const fallbackUrl =
        `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(currentUrl)}` +
        `&text=${encodeURIComponent(`${shareTitle}\n${shareDesc}`)}`;
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      showMsg("카카오 공유 링크를 열었어요!");
    } catch (e) {
      try {
        await navigator.clipboard.writeText(`${shareTitle}\n${shareDesc}\n${currentUrl}`);
        showMsg("카카오 공유 대체로 링크를 복사했어요!");
      } catch (e) {
        showMsg("카카오 공유를 열지 못했습니다.");
      }
    }
  }, [reading, showMsg]);

  const handleGoHome = useCallback(() => {
    if (typeof window === "undefined") return;
    window.location.assign("/");
  }, []);

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(buildText()); showMsg("클립보드에 복사됨!"); }
    catch (e) { showMsg("복사 실패"); }
  }, [buildText]);

  const handleCopyAiPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(aiPromptText);
      showAiPromptMsg("질문문이 복사되었습니다.");
    } catch (e) {
      showAiPromptMsg("직접 선택해 복사해 주세요.");
    }
  }, [aiPromptText]);

  const handleSaveImage = useCallback(async () => {
    if (!reportRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(reportRef.current, { backgroundColor: "#0a0820", scale: 2, useCORS: true });
      const a = document.createElement("a"); a.download = `mindscan-${Date.now()}.png`; a.href = canvas.toDataURL("image/png"); a.click();
      showMsg("이미지 저장 완료!");
    } catch (e) { showMsg("이미지 저장 실패"); }
  }, [reportRef]);

  return (
    <m.div className="fixed inset-0 overflow-y-auto z-20 bg-[radial-gradient(circle_at_16%_8%,rgba(245,158,11,0.14),transparent_38%),radial-gradient(circle_at_80%_12%,rgba(217,70,239,0.1),transparent_40%),radial-gradient(circle_at_50%_85%,rgba(56,189,248,0.07),transparent_42%)]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}>
      <div className="min-h-full px-4 py-8 flex flex-col items-center">

        <div className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: "linear-gradient(transparent 95%, rgba(251,191,36,0.18) 96%), linear-gradient(90deg, transparent 95%, rgba(251,191,36,0.13) 96%)",
            backgroundSize: "34px 34px",
          }}
        />

        {/* Hero header */}
        <m.div className={`relative text-center mb-7 w-full max-w-2xl px-5 py-6 ${LUXE_PANEL}`}
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: visibleCount >= 1 ? 1 : 0, y: visibleCount >= 1 ? 0 : -12 }}
          transition={{ duration: 0.4 }}>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/35 bg-amber-200/10 text-lg text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.38)]">
            ✦
          </div>
          <p className="text-[11px] tracking-[0.55em] text-amber-200/70 uppercase mb-2">Between Words Tarot · 관계 간격 리딩</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-[0_0_20px_rgba(251,191,36,0.2)]" style={{ fontFamily: "'Cormorant Garamond','Noto Serif KR',serif" }}>
            말과 행동 사이의 온도가{" "}
            <span className="text-amber-200">열렸습니다</span>
          </h2>
          <div className="flex items-center justify-center gap-3 mt-2.5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400/45 max-w-[72px]" />
            <span className="text-xs text-amber-100/70">{reading.persona}</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/45 max-w-[72px]" />
          </div>
        </m.div>

        {/* Mini card spread */}
        <m.div className={`flex items-end justify-center gap-2 mb-8 px-4 py-3 ${LUXE_CARD}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: visibleCount >= 2 ? 1 : 0, scale: visibleCount >= 2 ? 1 : 0.9 }}>
          {POSITIONS.map((pos, i) => {
            const [c1, c2] = cardGradient(drawn[pos.id] ?? i);
            return (
              <m.div key={pos.id} className="flex flex-col items-center gap-0.5"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: visibleCount >= 2 ? 1 : 0, y: visibleCount >= 2 ? 0 : 10 }}
                transition={{ delay: i * 0.06 }}>
                <div className={`rounded-xl overflow-hidden relative ${pos.isCenter ? "w-14 h-20" : "w-10 h-14"}`}
                  style={{ background: `linear-gradient(155deg,${c1},${c2})`,
                    boxShadow: pos.isCenter ? `0 0 22px ${c1}99` : `0 0 12px ${c1}66` }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                    <span style={{ fontSize: pos.isCenter ? 20 : 14 }} className="text-white/90 drop-shadow">{pos.icon}</span>
                    <span style={{ fontSize: pos.isCenter ? 9 : 7 }} className="text-white/55">{cardRomanSymbol(drawn[pos.id] ?? i)}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <span className="text-[8px] text-amber-100/60">{pos.label}</span>
              </m.div>
            );
          })}
        </m.div>

        {/* Report content */}
        <div ref={reportRef} className="w-full max-w-2xl space-y-4">

          {/* Intro */}
          <m.div className={`${LUXE_CARD} p-5 sm:p-6`}
            style={{ background: "linear-gradient(135deg,rgba(120,53,15,0.2),rgba(127,29,29,0.08),rgba(15,23,42,0.4))" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: visibleCount >= 3 ? 1 : 0, y: visibleCount >= 3 ? 0 : 14 }}
            transition={{ duration: 0.38 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(251,191,36,0.16)", border: "1px solid rgba(251,191,36,0.32)" }}>
                <span className="text-lg">🔮</span>
              </div>
              <h3 className="text-sm font-bold text-amber-50 tracking-wide">마음의 문턱</h3>
            </div>
            <p className="text-[15px] sm:text-base text-stone-100/90 leading-8 tracking-[0.01em] whitespace-pre-line">{reading.intro}</p>
          </m.div>

          {/* Summary card */}
          <m.article className="rounded-2xl border border-amber-300/30 p-5 sm:p-6"
            style={{ background: "linear-gradient(130deg,rgba(120,53,15,0.28),rgba(146,64,14,0.12),rgba(30,41,59,0.3))" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: visibleCount >= 4 ? 1 : 0, y: visibleCount >= 4 ? 0 : 14 }}>
            <h3 className="text-base sm:text-lg font-black text-amber-50 mb-3" style={{ fontFamily: "'Cormorant Garamond','Noto Serif KR',serif" }}>관계 간격의 전체 기류</h3>
            <div className="rounded-xl border border-amber-100/15 bg-black/25 px-3 py-2.5 text-stone-100/95 text-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span>감정 온도</span>
                <b>{summaryCard.emotionalTemperatureText || `${emotionalTemp} / 5`}</b>
              </div>
              <div className="flex gap-1" role="img" aria-label={`감정 온도 5단계 중 ${emotionalTemp}단계`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                    <m.div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400"
                      style={{ transformOrigin: "left" }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: visibleCount >= 4 && n <= emotionalTemp ? 1 : 0 }}
                      transition={{ duration: 0.4, delay: 0.15 + n * 0.06 }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-sm">
              <div className="rounded-xl border border-amber-100/15 bg-black/25 px-3 py-2 text-stone-100/95">
                다시 열릴 여지: <b>{summaryCard.reApproachChance || "중간"}</b>
              </div>
              <div className="rounded-xl border border-amber-100/15 bg-black/25 px-3 py-2 text-stone-100/95">
                다시 닿을 여지: <b>{summaryCard.contactChance || "낮지는 않지만, 방어심리가 변수"}</b>
              </div>
              <div className="rounded-xl border border-amber-100/15 bg-black/25 px-3 py-2 text-stone-100/95">
                관계 흐름: <b>{summaryCard.relationFlow || "단절보다 거리두기에 가까움"}</b>
              </div>
            </div>
            <p className="mt-3 text-sm text-amber-50/95 leading-7">
              겉으로 숨긴 중심: {summaryCard.corePsychology || "미련은 있지만 먼저 다가오기는 조심스러운 상태"}
            </p>
            <p className="text-sm text-amber-50/90 leading-7">
              오늘 건넬 태도: {summaryCard.recommendedAction || "무거운 확인보다 가벼운 안부로 시작"}
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-xl border border-amber-100/15 bg-black/25 px-3 py-2 text-stone-100/90">
                관계의 현재 문턱: <b>{summaryCard.relationshipStage || "유보형 거리두기 단계"}</b>
              </div>
              <div className="rounded-xl border border-amber-100/15 bg-black/25 px-3 py-2 text-stone-100/90">
                침묵의 그림자: <b>{summaryCard.silenceDriver || "자존심과 상처 재발 우려"}</b>
              </div>
              <div className="rounded-xl border border-amber-100/15 bg-black/25 px-3 py-2 text-stone-100/90 sm:col-span-2">
                흐름을 누르는 힘: <b>{summaryCard.situationPressure || "접근 강도 조절이 필요한 구간"}</b>
              </div>
            </div>
          </m.article>

          {/* Insight card draw */}
          {insightDeck.length > 0 && (
            <m.article className="rounded-2xl border border-amber-200/25 p-5 sm:p-6"
              style={{ background: "linear-gradient(130deg,rgba(51,28,22,0.65),rgba(59,39,26,0.5),rgba(30,41,59,0.35))" }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: visibleCount >= 5 ? 1 : 0, y: visibleCount >= 5 ? 0 : 14 }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-base sm:text-lg font-black text-amber-50">숨은 감정 보조 카드</h3>
                <span className="text-[11px] text-amber-100/80 tracking-wide">한 장씩 열어 마음의 단서를 확인하세요</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                {insightDeck.map((card, idx) => {
                  const id = String(card.id || `insight-${idx}`);
                  const opened = openedInsightIds.includes(id);
                  const active = activeInsight?.id === id;
                  return (
                    <m.button
                      key={id}
                      type="button"
                      onClick={() => handleDrawInsight(card)}
                      className="rounded-xl p-3 text-left border transition-all"
                      style={{
                        borderColor: active ? "rgba(196,181,253,0.75)" : "rgba(196,181,253,0.28)",
                        background: opened
                          ? "linear-gradient(155deg, rgba(30,41,59,0.75), rgba(67,56,202,0.25))"
                          : "linear-gradient(155deg, rgba(2,6,23,0.88), rgba(30,27,75,0.8))",
                        boxShadow: active ? "0 0 24px rgba(129,140,248,0.35)" : "none",
                      }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}>
                      {opened ? (
                        <>
                          <p className="text-[10px] text-amber-100/80 mb-1 tracking-[0.12em] uppercase">{card.category}</p>
                          <p className="text-sm text-stone-50 font-semibold leading-5">{card.title}</p>
                          <p className="text-[11px] text-amber-100/85 mt-2">{card.icon || "🃏"} 열림</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] text-amber-100/65 tracking-[0.18em] uppercase mb-2">Mindscan Deck</p>
                          <p className="text-xs text-stone-50/90 font-semibold">숨은 조각 {idx + 1}</p>
                          <p className="text-[11px] text-amber-100/75 mt-2">열어보기</p>
                        </>
                      )}
                    </m.button>
                  );
                })}
              </div>

              {activeInsight && (
                <m.div
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={activeInsight.id}>
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div>
                      <p className="text-[10px] text-indigo-200/70 tracking-[0.16em] uppercase">{activeInsight.category}</p>
                      <h4 className="text-sm sm:text-base font-bold text-indigo-50 mt-1">{activeInsight.icon || "🃏"} {activeInsight.title}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${RISK_LEVEL_CLASS[activeInsight.riskLevel || "중간"] || RISK_LEVEL_CLASS["중간"]}`}>
                      그림자 {activeInsight.riskLevel || "중간"}
                    </span>
                  </div>
                  {activeInsight.headline && (
                    <p className="text-sm text-indigo-100/95 leading-7">드러난 결: {activeInsight.headline}</p>
                  )}
                  {activeInsight.summary && (
                    <p className="text-sm text-indigo-100/85 leading-7 mt-1.5">{activeInsight.summary}</p>
                  )}
                  {(Array.isArray(activeInsight.bullets) && activeInsight.bullets.length > 0) && (
                    <div className="mt-2.5 space-y-1.5">
                      {activeInsight.bullets.map((line, idx) => (
                        <p key={`${activeInsight.id}-line-${idx}`} className="text-[13px] text-indigo-100/80 leading-6">• {line}</p>
                      ))}
                    </div>
                  )}
                </m.div>
              )}
            </m.article>
          )}

          {/* Sections */}
          {(reading.sections || []).map((s, i) => (
            <m.article key={s.slot} className={`${LUXE_CARD} p-5 sm:p-6`}
              style={{ background: i % 2 === 0 ? "linear-gradient(140deg,rgba(48,23,29,0.74),rgba(30,19,34,0.66))" : "linear-gradient(140deg,rgba(39,26,18,0.74),rgba(19,20,36,0.66))" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: visibleCount >= i + 7 ? 1 : 0, y: visibleCount >= i + 7 ? 0 : 16 }}
              transition={{ duration: 0.38 }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.22)" }}>
                  <span className="text-lg">{s.icon || SLOT_ICONS[i] || "✦"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-semibold text-amber-50 leading-snug">{s.slot}. {s.title}</h4>
                  {s.subtitle && <p className="text-xs text-amber-100/70 mt-1">{s.subtitle}</p>}
                  {(s.mainCardName || s.subCardName) && (
                    <div className="flex flex-wrap items-center gap-x-1 mt-0.5">
                      <span className="text-[10px] text-amber-100/60">앞장:</span>
                      <span className="text-[10px] text-stone-100 font-medium">{s.mainCardName || "—"}</span>
                      <span className="text-[10px] text-amber-200/35 mx-0.5">·</span>
                      <span className="text-[10px] text-amber-100/60">이면:</span>
                      <span className="text-[10px] text-stone-100 font-medium">{s.subCardName || "—"}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {s.loveSignal && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${LOVE_SIGNAL_CLASS[s.loveSignal] || "border-purple-300/35 bg-purple-500/15 text-purple-100"}`}>
                        {s.loveSignal}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-violet-300/35 bg-violet-500/15 text-violet-100">
                      감정 온도 {s.emotionalTemperature || 3}/5
                    </span>
                    {(s.mainCardKeywords || []).slice(0, 2).map((kw) => (
                      <span key={`m-${s.slot}-${kw}`} className="px-2 py-0.5 rounded-full text-[10px] border border-fuchsia-300/30 text-fuchsia-100/90 bg-fuchsia-500/10">#{kw}</span>
                    ))}
                    {(s.subCardKeywords || []).slice(0, 2).map((kw) => (
                      <span key={`s-${s.slot}-${kw}`} className="px-2 py-0.5 rounded-full text-[10px] border border-sky-300/30 text-sky-100/90 bg-sky-500/10">#{kw}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-[15px] sm:text-base text-stone-100/90 leading-8 tracking-[0.01em] sm:pl-12 whitespace-pre-line">
                {s.summary || s.content}
              </p>
              {Array.isArray(s.keywords) && s.keywords.length > 0 && (
                <div className="sm:pl-12 mt-2 flex flex-wrap gap-1.5">
                  {s.keywords.slice(0, 5).map((kw) => (
                    <span key={`${s.slot}-kw-${kw}`} className="px-2 py-0.5 rounded-full text-[10px] border border-cyan-300/35 bg-cyan-500/10 text-cyan-100/95">
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
              <div className="sm:pl-12 mt-3 grid grid-cols-1 gap-2">
                <p className="text-[13px] sm:text-sm text-purple-100/85 leading-7"><b>카드의 얼굴:</b> {s.cardNameKo || s.mainCardName || "카드"} {s.orientation ? `(${s.orientation === "reversed" ? "역방향" : "정방향"})` : ""}</p>
                {s.cardMeaning && s.cardMeaning !== (s.summary || s.content) && (
                  <p className="text-[13px] sm:text-sm text-purple-100/85 leading-7"><b>카드가 비춘 장면:</b> {s.cardMeaning}</p>
                )}
                <p className="text-[13px] sm:text-sm text-purple-100/85 leading-7"><b>이 자리의 속삭임:</b> {s.positionMeaning || s.subtitle || "이 자리의 질문에 맞춘 해석"}</p>
                {s.emotionalReading && s.emotionalReading !== (s.summary || s.content) && (
                  <p className="text-[13px] sm:text-sm text-purple-100/85 leading-7"><b>남은 감정의 결:</b> {s.emotionalReading}</p>
                )}
                <p className="text-[13px] sm:text-sm text-purple-100/85 leading-7"><b>말하지 못한 메시지:</b> {s.hiddenMessage || "확답보다 안전한 대화 환경을 먼저 원하고 있습니다."}</p>
                <p className="text-[13px] sm:text-sm text-amber-100/90 leading-7"><b>조심할 그림자:</b> {s.caution || "감정 확인을 몰아붙이면 방어가 강화될 수 있습니다."}</p>
                <p className="text-[13px] sm:text-sm text-emerald-100/90 leading-7"><b>내가 건넬 태도:</b> {s.advice || "짧고 부담 없는 메시지로 리듬을 회복하세요."}</p>
              </div>
            </m.article>
          ))}

          {/* Suggested messages */}
          {suggestedMessages.length > 0 && (
            <m.article className="rounded-2xl border border-cyan-300/25 p-5 sm:p-6"
              style={{ background: "linear-gradient(135deg,rgba(6,182,212,0.12),rgba(109,40,217,0.06),transparent)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: visibleCount >= 14 ? 1 : 0, y: visibleCount >= 14 ? 0 : 16 }}>
              <h4 className="text-sm sm:text-base font-bold text-cyan-50 mb-3">지금 보내기 좋은 메시지 예시</h4>
              <div className="space-y-2.5">
                {suggestedMessages.map((item, idx) => (
                  <div key={`msg-${idx}`} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                    <p className="text-[11px] text-cyan-200/75 mb-1">{item.tone || `메시지 ${idx + 1}`}</p>
                    <p className="text-sm text-cyan-50/90 leading-7">“{item.text}”</p>
                  </div>
                ))}
              </div>
            </m.article>
          )}

          {/* Master advice */}
          {reading.masterAdvice && (
            <m.article className={`${LUXE_CARD} p-5 sm:p-6`}
              style={{ background: "linear-gradient(135deg,rgba(146,64,14,0.2),rgba(127,29,29,0.12),transparent)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: visibleCount >= 15 ? 1 : 0, y: visibleCount >= 15 ? 0 : 16 }}
              transition={{ duration: 0.38 }}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(236,72,153,0.14)", border: "1px solid rgba(236,72,153,0.22)" }}>
                  <span className="text-lg">✨</span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-amber-50">현실적인 행동 가이드</h4>
              </div>
              <p className="text-[15px] sm:text-base text-stone-100/90 leading-8 tracking-[0.01em] whitespace-pre-line">{reading.masterAdvice}</p>
            </m.article>
          )}

          <m.article className={`${LUXE_CARD} p-5 sm:p-6`}
            style={{ background: "linear-gradient(135deg,rgba(6,182,212,0.12),rgba(59,130,246,0.06),transparent)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: visibleCount >= 15 ? 1 : 0, y: visibleCount >= 15 ? 0 : 16 }}
            transition={{ duration: 0.38 }}>
            <h4 className="text-sm sm:text-base font-bold text-amber-50 mb-3">전체 종합 상담</h4>
            <div className="space-y-2">
              <p className="text-[13px] sm:text-sm text-cyan-100/90 leading-7"><b>겉말 아래 남은 감정:</b> {innerHeartSummary.hiddenCore || "겉표현 아래에 망설임과 미련이 함께 남아 있습니다."}</p>
              <p className="text-[13px] sm:text-sm text-cyan-100/90 leading-7"><b>관계의 위험 신호:</b> {innerHeartSummary.relationshipRisk || "확답을 강요하면 관계 방어가 강화될 수 있습니다."}</p>
              <p className="text-[13px] sm:text-sm text-cyan-100/90 leading-7"><b>오늘 내가 취할 태도:</b> {innerHeartSummary.recommendedAttitude || "짧고 안전한 대화 리듬을 먼저 만드세요."}</p>
              <p className="text-[13px] sm:text-sm text-cyan-100/90 leading-7"><b>최종 흐름:</b> {innerHeartSummary.finalFlow || "관계는 조정 단계를 거쳐 방향을 결정할 가능성이 큽니다."}</p>
              <p className="text-[13px] sm:text-sm text-cyan-50/95 leading-7"><b>오라클 메시지:</b> {innerHeartSummary.oracleMessage || "안전감을 주는 말 한 줄이 상대의 방어를 낮춥니다."}</p>
            </div>
          </m.article>

          {/* Closing */}
          <m.div className={`${LUXE_CARD} p-5 sm:p-6 text-center`}
            style={{ background: "rgba(255,255,255,0.02)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: visibleCount >= 16 ? 1 : 0 }}
            transition={{ duration: 0.4 }}>
            <p className="text-[10px] tracking-[0.45em] text-amber-100/60 uppercase mb-3">One Line Conclusion</p>
            <p className="text-[15px] sm:text-base text-stone-100/90 leading-8 tracking-[0.01em] italic">{reading.oneLineConclusion || reading.closing}</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-8 h-px bg-amber-600/35" />
              <p className="text-[9px] text-amber-100/45 tracking-widest">
                {reading.source === "rule-engine" ? "✦ 카드 의미 기반 리딩" : "✦ 관계 간격 리딩"}
              </p>
              <div className="w-8 h-px bg-amber-600/35" />
            </div>
          </m.div>
        </div>

        {/* Quick actions under result */}
        <m.div className="mt-6 w-full max-w-2xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: visibleCount >= 15 ? 1 : 0, y: visibleCount >= 15 ? 0 : 8 }}>
          <div className={`${LUXE_CARD} p-4 sm:p-5`}>
            <p className="text-[11px] text-amber-100/70 mb-3 tracking-[0.24em] uppercase text-center">리딩 저장과 공유</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleSaveImage}
                className="px-4 py-3 rounded-xl text-sm font-bold tracking-wide border border-amber-300/45 bg-amber-500/20 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.15)] hover:bg-amber-400/30 transition-colors"
              >
                {mindScanTarotText("mindScanTarot.010")}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="px-4 py-3 rounded-xl text-sm font-bold tracking-wide border border-amber-300/45 bg-amber-500/20 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.15)] hover:bg-amber-400/30 transition-colors"
              >
                {mindScanTarotText("mindScanTarot.011")}
              </button>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-2 py-3 rounded-xl text-xs font-semibold tracking-wide border border-white/15 bg-white/5 text-stone-200/80 hover:bg-white/10 hover:text-stone-50 transition-colors"
              >
                {mindScanTarotText("mindScanTarot.012")}
              </button>
              <button
                type="button"
                onClick={handleKakaoShare}
                className="px-2 py-3 rounded-xl text-xs font-semibold tracking-wide border border-white/15 bg-white/5 text-stone-200/80 hover:bg-white/10 hover:text-stone-50 transition-colors"
              >
                {mindScanTarotText("mindScanTarot.013")}
              </button>
              <button
                type="button"
                onClick={handleGoHome}
                className="px-2 py-3 rounded-xl text-xs font-semibold tracking-wide border border-white/15 bg-white/5 text-stone-200/80 hover:bg-white/10 hover:text-stone-50 transition-colors"
              >
                {mindScanTarotText("mindScanTarot.014")}
              </button>
            </div>
          </div>
        </m.div>
        {shareMsg && (
          <m.p className="mt-2 text-xs text-purple-200/60"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {shareMsg}
          </m.p>
        )}

        <m.article
          className={`mt-6 w-full max-w-2xl p-5 sm:p-6 ${LUXE_CARD}`}
          data-marker="tarot-mindscan-ai-prompt-bottom-v20260621"
          style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.16),rgba(147,51,234,0.12),rgba(15,23,42,0.68))" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: visibleCount >= 16 ? 1 : 0, y: visibleCount >= 16 ? 0 : 14 }}
          transition={{ duration: 0.38 }}>
          <p className="text-[10px] tracking-[0.4em] text-amber-100/60 uppercase mb-3 text-center">Next Oracle Prompt</p>
          <h4 className="text-base sm:text-lg font-black text-amber-50 mb-2 text-center" style={{ fontFamily: "'Cormorant Garamond','Noto Serif KR',serif" }}>
            말과 행동 사이의 온도를 한 번 더 비추기
          </h4>
          <p className="text-[13px] sm:text-sm text-stone-100/80 leading-7 mb-3 text-center">
            방금 열린 다섯 자리의 결을 그대로 건네면, 상대의 말과 행동 사이에 남은 신호를 더 깊게 이어 볼 수 있습니다.
          </p>
          <textarea
            className="min-h-[230px] max-h-[44dvh] w-full resize-y rounded-2xl border border-amber-200/20 bg-black/40 p-3 text-[12px] sm:text-[13px] leading-7 text-stone-100/90 outline-none focus:border-amber-200/50 focus:ring-2 focus:ring-amber-200/20"
            value={aiPromptText}
            readOnly
            aria-label={mindScanTarotText("mindScanTarot.015")}
          />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-[max-content_1fr] items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyAiPrompt}
              className="px-5 py-3 rounded-xl text-sm font-bold tracking-wide border border-amber-300/45 bg-amber-400/20 text-amber-50 hover:bg-amber-400/30 transition-colors">
              질문문 복사
            </button>
            <span className="min-h-5 text-center sm:text-left text-xs text-amber-100/80" aria-live="polite">
              {aiPromptMsg}
            </span>
          </div>
        </m.article>

        <button type="button" onClick={onRestart}
          className="mt-6 mb-12 px-8 py-3 rounded-full border border-amber-300/35 text-amber-100/80 text-sm font-medium tracking-wide hover:bg-amber-400/15 hover:text-amber-50 transition-all">
          🔄 다시 카드 열기
        </button>
      </div>
    </m.div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function MindScanTarot() {
  const { ensurePaidAccess } = useCoinGate();
  const [stage, setStage] = useState<Stage>("intro");
  const [question, setQuestion] = useState("");
  const [pickRound, setPickRound] = useState<PickRound>("main");
  const [mainPicks, setMainPicks] = useState<number[]>([]);
  const [subPicks, setSubPicks] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<Record<string, number>>({});
  const [drawnSub, setDrawnSub] = useState<Record<string, number>>({});
  const [usedCardIds, setUsedCardIds] = useState<Set<number>>(new Set());
  const [revealedCount, setRevealedCount] = useState(0);
  const [reading, setReading] = useState<ReadingResult | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);
  const usedRef = useRef<Set<number>>(new Set());
  const drawnRef = useRef<Record<string, number>>({});
  const drawnSubRef = useRef<Record<string, number>>({});
  // 결제 확인이 끝난 뒤 리딩 생성이 실패했을 때, 재시도에서 중복 과금을 막는 세션 플래그.
  const paidAccessGrantedRef = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
    };
  }, []);

  useEffect(() => { usedRef.current = usedCardIds; }, [usedCardIds]);
  useEffect(() => { drawnRef.current = drawn; }, [drawn]);
  useEffect(() => { drawnSubRef.current = drawnSub; }, [drawnSub]);

  // Auto-reveal cards sequentially on entering spread stage
  useEffect(() => {
    if (stage !== "spread") return;
    setRevealedCount(0);
    let n = 0;
    const t = setInterval(() => { n++; setRevealedCount(n); if (n >= POSITIONS.length) clearInterval(t); }, 700);
    return () => clearInterval(t);
  }, [stage]);

  const handlePick = useCallback((gridIdx: number) => {
    if (pickRound === "main") {
      if (mainPicks.includes(gridIdx) || mainPicks.length >= 5) return;
      const cardId = pickRandom(usedRef.current);
      const newUsed = new Set([...usedRef.current, cardId]);
      const newPicks = [...mainPicks, gridIdx];
      const posId = POSITIONS[newPicks.length - 1].id;
      usedRef.current = newUsed;
      setUsedCardIds(newUsed);
      setMainPicks(newPicks);
      const newDrawn = { ...drawnRef.current, [posId]: cardId };
      setDrawn(newDrawn);
      drawnRef.current = newDrawn;
      if (newPicks.length === 5) setTimeout(() => setPickRound("sub"), 900);
    } else {
      if (mainPicks.includes(gridIdx) || subPicks.includes(gridIdx) || subPicks.length >= 5) return;
      const cardId = pickRandom(usedRef.current);
      const newUsed = new Set([...usedRef.current, cardId]);
      const newPicks = [...subPicks, gridIdx];
      const posId = POSITIONS[newPicks.length - 1].id;
      usedRef.current = newUsed;
      setUsedCardIds(newUsed);
      setSubPicks(newPicks);
      const newDrawnSub = { ...drawnSubRef.current, [posId]: cardId };
      setDrawnSub(newDrawnSub);
      drawnSubRef.current = newDrawnSub;
      if (newPicks.length === 5) setTimeout(() => setStage("spread"), 900);
    }
  }, [pickRound, mainPicks, subPicks]);

  const handleGenerateReading = useCallback(async () => {
    if (readingLoading || reading) return;
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setReadingError("상담 질문을 입력해 주세요.");
      return;
    }
    const pairs = POSITIONS.map((pos, idx) => ({
      slot: idx + 1,
      positionId: pos.id,
      positionLabel: pos.label,
      positionMeaning: pos.meaning,
      mainCardId: drawnRef.current[pos.id] ?? idx,
      subCardId: drawnSubRef.current[pos.id] ?? (idx + 5),
    }));
    setReadingLoading(true);
    setReadingError("");
    try {
      const isAdminLikeUser = () => {
        if (typeof window === "undefined") return false;
        try {
          if (String(sessionStorage.getItem("flower_admin_password_ok") || "") !== "1") return false;
        } catch (_) {}
        try {
          const sTok = String(sessionStorage.getItem("flower_admin_token") || "");
          if (FLOWER_ADMIN_TOKEN_RE.test(sTok)) return true;
        } catch (_) {}
        try {
          const lTok = String(localStorage.getItem("flower_admin_token") || "");
          if (FLOWER_ADMIN_TOKEN_RE.test(lTok)) return true;
        } catch (_) {}
        return false;
      };

      const isFlowerAdminMode = isAdminLikeUser();

      const executeReading = async () => {
        const res = await fetch("/api/tarot/mindscan", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pairs, question: trimmedQuestion }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && Array.isArray(data.sections)) {
          setReading(data as ReadingResult);
          setStage("result");
          return;
        }
        throw new Error(String(data?.message || data?.error || `요청 실패 (${res.status})`));
      };

      if (isFlowerAdminMode) {
        await executeReading();
        return;
      }

      // 직전 제출에서 결제가 이미 확인된 재시도라면 게이트를 건너뛰고 리딩만 다시 생성한다(중복 과금 방지).
      if (paidAccessGrantedRef.current) {
        await executeReading();
        paidAccessGrantedRef.current = false;
        return;
      }

      const paymentResult = await ensurePaidAccess({
        featureKey: "tarot-mindscan",
        cost: lookupServerCoinPrice("tarot-mindscan"),
        reason: "말과 행동 사이 타로 리딩",
        requestId: `tarot-mindscan:req:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        // 이용권/결제 확인 단계에서는 과금 안내만 처리한다 — LLM 생성은 게이트가 닫힌 뒤 진행.
        onPaid: ({ chargedCoins, accessSource, monthlyCreditsSpent, monthlyBalanceAfter, balanceAfter }) => {
          // 🔴 판정은 accessSource 로만 한다. chargedCoins 는 이용권·월정석·재열람 모두 0 이라
          // (useCoinGate 의 chargedCoins 계산) 이용권 여부를 가릴 수 없다.
          if (accessSource === "subscription") {
            showSubscriptionIncludedNotice({
              message: mindScanTarotText("mindScanTarot.016"),
              reason: "말과 행동 사이 타로",
            });
            return;
          }
          if (accessSource === "moonlight_stone") {
            showToast(`월정석 ${formatKrwFromMonthlyCredits(monthlyCreditsSpent)} 상당으로 말과 행동 사이 타로가 열렸습니다.${typeof monthlyBalanceAfter === "number" ? ` 남은 월정석: ${formatKrwFromMonthlyCredits(monthlyBalanceAfter)} 상당` : ""}`, "info");
            return;
          }
          if (chargedCoins > 0) {
            showToast(`말과 행동 사이 타로 ${Math.max(0, chargedCoins * 100).toLocaleString("ko-KR")}원 결제가 승인되었습니다. 잔여 원화 가치: ${Math.max(0, balanceAfter * 100).toLocaleString("ko-KR")}원`, "info");
          }
        },
      });

      if (!paymentResult.ok) {
        if (paymentResult.code === "AUTH_REQUIRED") {
          setReadingError("로그인이 필요합니다. 로그인 후 다시 시도해 주세요.");
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.setTimeout(() => {
              window.location.href = `/login?next=${next}`;
            }, 600);
          }
          return;
        }
        if (paymentResult.code === "INSUFFICIENT_COINS") {
          setReadingError(`결제 가능 금액이 부족합니다. ${Math.max(0, Number(paymentResult.requiredCoins || 0) * 100).toLocaleString("ko-KR")}원 결제가 필요합니다.`);
          return;
        }
        if (paymentResult.code === "FEATURE_EXECUTION_FAILED" && paymentResult.refunded) {
          showToast("리딩 생성이 완료되지 않아 이번 결제가 환불되었습니다.", "info");
        }
        if (!paymentResult.ok) {
          setReadingError(String(paymentResult.message || "결제 확인이 완료되지 않았습니다."));
          return;
        }
      }

      // 게이트(이용권/결제 확인)가 닫힌 뒤에 리딩을 생성한다 — 실패 시 플래그가 남아 재시도는 무과금.
      paidAccessGrantedRef.current = true;
      await executeReading();
      paidAccessGrantedRef.current = false;
    } catch (e) {
      setReadingError(friendlyErrorMessage(e, mindScanTarotText("mindScanTarot.017")));
    } finally {
      setReadingLoading(false);
    }
  }, [ensurePaidAccess, question, readingLoading, reading]);

  const restart = useCallback(() => {
    setStage("intro"); setPickRound("main");
    setQuestion("");
    setMainPicks([]); setSubPicks([]);
    setDrawn({}); setDrawnSub({}); setUsedCardIds(new Set());
    setRevealedCount(0); setReading(null); setReadingError("");
    drawnRef.current = {}; drawnSubRef.current = {}; usedRef.current = new Set();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-[linear-gradient(150deg,#020617_0%,#050b24_28%,#160726_58%,#040916_100%)]">
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_76%_52%_at_50%_10%,rgba(109,40,217,0.16)_0%,transparent_65%),radial-gradient(ellipse_35%_28%_at_12%_82%,rgba(34,211,238,0.11)_0%,transparent_60%),radial-gradient(ellipse_30%_22%_at_88%_78%,rgba(244,114,182,0.09)_0%,transparent_58%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-30 bg-[linear-gradient(transparent_96%,rgba(148,163,184,0.18)_97%),linear-gradient(90deg,transparent_96%,rgba(148,163,184,0.16)_97%)] bg-[length:32px_32px]" />
      <StarField />
      <AnimatePresence mode="wait">
        {stage === "intro" && (
          <IntroStage key="intro" onStart={() => setStage("picking")} />
        )}
        {stage === "picking" && (
          <PickingStage key={`picking-${pickRound}`}
            round={pickRound} mainSelected={mainPicks} subSelected={subPicks} onPick={handlePick} />
        )}
        {stage === "spread" && (
          <SpreadStage key="spread"
            drawn={drawn} drawnSub={drawnSub} revealedCount={revealedCount}
            readingLoading={readingLoading} readingError={readingError}
            question={question} onQuestionChange={setQuestion}
            onGenerateReading={handleGenerateReading} />
        )}
        {stage === "result" && reading && (
          <ResultStage key="result"
            drawn={drawn} drawnSub={drawnSub} reading={reading} question={question} onRestart={restart} reportRef={reportRef} />
        )}
      </AnimatePresence>
    </div>
  );
}
