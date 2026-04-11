"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────────
type Stage = "intro" | "picking" | "spread" | "result";
type PickRound = "main" | "sub";

interface TarotPos {
  id: string; label: string; meaning: string; icon: string;
  col: number; row: number; isCenter?: boolean;
}
interface ReadingSection { slot: number; title: string; content: string; mainCardName?: string; subCardName?: string; }
interface ReadingResult { source: string; persona: string; intro: string; sections: ReadingSection[]; masterAdvice?: string; closing: string; }

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const POSITIONS: TarotPos[] = [
  { id: "top",    label: "위",   meaning: "의식적으로 드러내는 감정", icon: "🌙", col: 2, row: 1 },
  { id: "left",   label: "좌",   meaning: "과거의 감정 흔적",         icon: "🕯", col: 1, row: 2 },
  { id: "center", label: "중앙", meaning: "현재 진심의 핵심",          icon: "💜", col: 2, row: 2, isCenter: true },
  { id: "right",  label: "우",   meaning: "바라는 미래 방향",          icon: "⭐", col: 3, row: 2 },
  { id: "bottom", label: "아래", meaning: "숨겨둔 무의식적 욕구",      icon: "🔮", col: 2, row: 3 },
];

const DECK_SIZE = 78;
const GRID_COUNT = 24;

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
        <motion.div key={s.id} className="absolute rounded-full"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size,
            background: s.id % 5 === 0 ? "#f0abfc" : s.id % 4 === 0 ? "#e879f9" : "#c4b5fd" }}
          animate={{ opacity: [0, s.size > 2 ? 0.9 : 0.5, 0] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }} />
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
            <motion.span style={{ fontSize: 14, color: mainColor, lineHeight: 1 }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity }}>✦</motion.span>
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
    <motion.div ref={ref} style={{ width: w, height: h, rotateX: rotX, rotateY: rotY, perspective: 900 }}
      onMouseMove={e => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => { mx.set(0.5); my.set(0.5); }}
      className="rounded-xl overflow-hidden relative select-none"
      style={{
        background: `linear-gradient(155deg, ${c1}, ${c2})`,
        boxShadow: isLarge
          ? `0 0 28px ${c1}aa, 0 0 55px ${c1}33, 0 4px 20px rgba(0,0,0,0.6)`
          : `0 0 16px ${c1}77, 0 0 32px ${c1}22, 0 4px 12px rgba(0,0,0,0.5)`,
        width: w, height: h,
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
    </motion.div>
  );
}

// ── INTRO STAGE ───────────────────────────────────────────────────────────────
function IntroStage({ onStart }: { onStart: () => void }) {
  return (
    <motion.div className="fixed inset-0 flex flex-col items-center justify-center px-6 z-20 overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.65 }}>
      <div className="min-h-full w-full flex flex-col items-center justify-center py-14 text-center">
        {/* Orb with orbiting rings */}
        <motion.div className="relative mb-8"
          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.75, type: "spring", stiffness: 100 }}>
          <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-full overflow-hidden relative"
            style={{ boxShadow: "0 0 60px rgba(168,85,247,0.55), 0 0 120px rgba(168,85,247,0.22), 0 0 200px rgba(168,85,247,0.08)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fuctionassets/mindscantaro.webp" alt="속마음 타로" className="w-full h-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060918]/65 via-transparent to-transparent" />
          </div>
          <motion.div className="absolute inset-[-14px] rounded-full"
            style={{ border: "1px solid rgba(168,85,247,0.3)" }}
            animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{ background: "#e879f9", boxShadow: "0 0 12px #e879f9" }} />
          </motion.div>
          <motion.div className="absolute inset-[-26px] rounded-full"
            style={{ border: "1px solid rgba(99,102,241,0.2)" }}
            animate={{ rotate: -360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}>
            <div className="absolute bottom-0 right-2 w-2 h-2 rounded-full"
              style={{ background: "#818cf8", boxShadow: "0 0 8px #818cf8" }} />
          </motion.div>
          <motion.div className="absolute inset-[-5px] rounded-full border-2 border-purple-500/18"
            animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.8, repeat: Infinity }} />
        </motion.div>

        {/* Title */}
        <motion.div className="space-y-3 mb-8" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p className="text-[11px] tracking-[0.55em] text-purple-400/65 uppercase">Mind Scan Tarot</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            상대방의 정확한<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-pink-400">
              속마음 읽기
            </span>
          </h1>
          <p className="text-sm text-purple-200/52 leading-relaxed max-w-sm mx-auto">
            직관을 따라 10장의 카드를 선택하세요.<br />
            타로 마스터가 상대방의 진짜 감정과 숨겨진 의도를 깊이 해석합니다.
          </p>
        </motion.div>

        {/* Position icons */}
        <motion.div className="flex items-center justify-center gap-4 mb-7 bg-white/[0.04] rounded-2xl px-6 py-3 border border-white/[0.06]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }}>
          {POSITIONS.map(p => (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <span className="text-xl">{p.icon}</span>
              <span className="text-[9px] text-purple-300/50">{p.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Flow steps */}
        <motion.div className="flex items-center gap-2 mb-8 text-[10px] text-purple-400/42"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {["메인 5장", "→", "보조 5장", "→", "포지션 공개", "→", "AI 리딩"].map((t, i) => (
            <span key={i} className={t === "→" ? "text-purple-800/40" : ""}>{t}</span>
          ))}
        </motion.div>

        {/* CTA button */}
        <motion.button onClick={onStart}
          className="relative overflow-hidden px-12 py-4 rounded-full text-white font-bold text-sm tracking-[0.22em] uppercase"
          style={{ background: "linear-gradient(135deg,#6d28d9,#a855f7 50%,#7c3aed)",
            boxShadow: "0 0 32px rgba(168,85,247,0.52), 0 4px 24px rgba(109,40,217,0.4)" }}
          initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.62, type: "spring" }}
          whileHover={{ scale: 1.07, boxShadow: "0 0 52px rgba(168,85,247,0.7), 0 6px 30px rgba(109,40,217,0.5)" }}
          whileTap={{ scale: 0.95 }}>
          <motion.div className="absolute inset-0 rounded-full"
            animate={{ opacity: [0, 0.32, 0] }} transition={{ duration: 2.2, repeat: Infinity }}
            style={{ background: "radial-gradient(ellipse at center, rgba(232,121,249,0.55) 0%, transparent 70%)" }} />
          <span className="relative z-10">🔮 시작하기</span>
        </motion.button>

        <motion.p className="mt-5 text-[10px] text-purple-500/38 tracking-widest"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}>
          ✦ 상대방을 마음속으로 떠올리며 시작하세요 ✦
        </motion.p>
      </div>
    </motion.div>
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
    <motion.div className="fixed inset-0 flex flex-col z-20"
      initial={{ opacity: 0, x: round === "sub" ? 30 : 0 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: round === "main" ? -30 : 0 }}
      transition={{ duration: 0.35 }}>

      {/* Header */}
      <div className="flex-shrink-0 pt-5 pb-3 px-4 text-center">
        <p className="text-[10px] tracking-[0.42em] text-purple-400/58 uppercase mb-1">Mind Scan Tarot</p>
        <motion.h2 key={round} className="text-xl sm:text-2xl font-bold text-white"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {round === "main"
            ? <><span className="text-fuchsia-300">메인 카드</span> 5장 선택</>
            : <><span className="text-violet-300">보조 카드</span> 5장 선택</>}
        </motion.h2>
        <AnimatePresence mode="wait">
          <motion.p key={done ? "done" : `pos-${nextPos?.id}`}
            className="text-xs text-purple-300/45 mt-1 h-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {done
              ? (round === "main" ? "✨ 완료! 보조 카드로 이동합니다..." : "✨ 모든 카드 선택 완료!")
              : nextPos
                ? `선택 중: ${nextPos.icon} ${nextPos.label} — ${nextPos.meaning}`
                : "카드를 선택하세요"}
          </motion.p>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {[0, 1, 2, 3, 4].map(i => (
            <motion.div key={i} className="rounded-full h-2"
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
      <div className="flex-1 overflow-y-auto px-3 pb-8">
        <div className="grid gap-2.5 sm:gap-3 mx-auto" style={{ gridTemplateColumns: "repeat(6, 1fr)", maxWidth: 444 }}>
          {Array.from({ length: GRID_COUNT }, (_, idx) => {
            const disabled = isDisabled(idx);
            const order = pickOrder(idx);
            const isSel = order > 0;
            const isHov = hovIdx === idx && !disabled && !done;

            return (
              <motion.div key={idx}
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
                  <motion.div className="absolute inset-0 rounded-[10px]"
                    initial={{ opacity: 0.85 }} animate={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    style={{ background: round === "main" ? "rgba(232,121,249,0.38)" : "rgba(167,139,250,0.38)" }} />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── SPREAD STAGE ───────────────────────────────────────────────────────────────
interface SpreadStageProps {
  drawn: Record<string, number>;
  drawnSub: Record<string, number>;
  revealedCount: number;
  readingLoading: boolean;
  readingError: string;
  onGenerateReading: () => void;
}

function SpreadStage({ drawn, drawnSub, revealedCount, readingLoading, readingError, onGenerateReading }: SpreadStageProps) {
  const allRevealed = revealedCount >= POSITIONS.length;

  return (
    <motion.div className="fixed inset-0 flex flex-col items-center justify-center z-20 overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}>
      <div className="min-h-full w-full flex flex-col items-center justify-center px-4 py-10">

        {/* Header */}
        <motion.div className="text-center mb-7" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[10px] tracking-[0.45em] text-purple-400/60 uppercase mb-1">Mind Scan Tarot</p>
          <AnimatePresence mode="wait">
            <motion.h2 key={allRevealed ? "done" : `r${revealedCount}`}
              className="text-xl sm:text-2xl font-bold text-white"
              initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }}
              transition={{ duration: 0.28 }}>
              {allRevealed
                ? <>모든 속마음이 <span className="text-fuchsia-300">드러났습니다</span> ✨</>
                : <>{POSITIONS[revealedCount]?.icon} <span className="text-fuchsia-300">{POSITIONS[revealedCount]?.label}</span> 포지션이 열립니다</>
              }
            </motion.h2>
          </AnimatePresence>
          {!allRevealed && (
            <motion.p className="text-xs text-purple-400/38 mt-1"
              animate={{ opacity: [0.38, 0.65, 0.38] }} transition={{ duration: 1.6, repeat: Infinity }}>
              {POSITIONS[revealedCount]?.meaning}
            </motion.p>
          )}
        </motion.div>

        {/* Cross layout */}
        <div className="grid gap-5 sm:gap-7 mb-8 flex-shrink-0"
          style={{ gridTemplateColumns: "repeat(3, auto)", gridTemplateRows: "repeat(3, auto)" }}>
          {POSITIONS.map((pos, i) => {
            const revealed = i < revealedCount;
            const active = i === revealedCount;
            const [c1, c2] = revealed ? cardGradient(drawn[pos.id] ?? i) : ["#1a0a3a","#0e0525"];

            return (
              <div key={pos.id} style={{ gridColumn: pos.col, gridRow: pos.row }}
                className="flex flex-col items-center gap-1.5">
                <motion.span animate={{ opacity: revealed ? 0.7 : 0.28 }}
                  className="text-[9px] text-purple-300 tracking-widest uppercase font-medium">{pos.label}</motion.span>

                <div className="relative">
                  {/* Sub card shadow (behind main) */}
                  {revealed && pos.id in drawnSub && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.55 }}
                      className="absolute z-0 rounded-xl overflow-hidden"
                      style={{ transform: "translate(8px, 8px)", width: pos.isCenter ? 84 : 62, height: pos.isCenter ? 122 : 90,
                        background: `linear-gradient(155deg, ${cardGradient(drawnSub[pos.id])[0]}, ${cardGradient(drawnSub[pos.id])[1]})` }}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white/25 text-[10px]">{cardRomanSymbol(drawnSub[pos.id])}</span>
                      </div>
                    </motion.div>
                  )}

                  <motion.div className="relative z-10">
                    <AnimatePresence mode="wait">
                      {revealed ? (
                        <motion.div key="face"
                          initial={{ rotateY: -85, scale: 0.72, opacity: 0 }}
                          animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                          transition={{ duration: 0.6, ease: [0.2, 0.65, 0, 1.15] }}>
                          <CardFace pos={pos} cardId={drawn[pos.id] ?? i} />
                        </motion.div>
                      ) : (
                        <motion.div key="back">
                          <div style={{
                            width: pos.isCenter ? 84 : 62, height: pos.isCenter ? 122 : 90, borderRadius: 10,
                            background: active ? "linear-gradient(155deg,#1a0a3a,#2d1b69)" : "linear-gradient(155deg,#0c0420,#150830)",
                            border: active ? "1.5px solid rgba(168,85,247,0.55)" : "1px solid rgba(168,85,247,0.15)",
                            boxShadow: active ? "0 0 22px rgba(168,85,247,0.4)" : "none",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.4s ease",
                          }}>
                            <motion.span style={{ fontSize: pos.isCenter ? 24 : 18 }}
                              animate={active ? { opacity: [0.35, 1, 0.35], scale: [1, 1.12, 1] } : { opacity: 0.18 }}
                              transition={active ? { duration: 1.1, repeat: Infinity } : {}}>
                              {pos.icon}
                            </motion.span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                <motion.span animate={{ opacity: revealed ? 0.48 : 0 }}
                  className="text-[8px] text-purple-300 text-center max-w-[76px] leading-tight">
                  {pos.meaning}
                </motion.span>
              </div>
            );
          })}
        </div>

        {/* Reading CTA (shows after all revealed) */}
        <AnimatePresence>
          {allRevealed && (
            <motion.div className="flex-shrink-0 text-center"
              initial={{ opacity: 0, y: 22, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 18 }}>
              <p className="text-xs text-purple-300/45 mb-4 tracking-wide">
                10장의 카드가 모두 준비되었습니다
              </p>
              {readingError && (
                <p className="text-xs text-rose-300/80 mb-3 max-w-xs mx-auto leading-relaxed">{readingError}</p>
              )}
              <motion.button onClick={onGenerateReading} disabled={readingLoading}
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
                  <motion.div className="absolute inset-0 rounded-full"
                    animate={{ opacity: [0, 0.3, 0] }} transition={{ duration: 2, repeat: Infinity }}
                    style={{ background: "radial-gradient(ellipse, rgba(232,121,249,0.5) 0%, transparent 70%)" }} />
                )}
                <span className="relative z-10 flex items-center gap-2.5">
                  {readingLoading
                    ? <>
                      <motion.span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white inline-block"
                        animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
                      타로 마스터가 해석 중...
                    </>
                    : "✨ 속마음 리딩 받기"}
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── RESULT STAGE ───────────────────────────────────────────────────────────────
const SLOT_ICONS = ["🧠", "🎭", "👁", "💬", "💜"];

interface ResultStageProps {
  drawn: Record<string, number>;
  drawnSub: Record<string, number>;
  reading: ReadingResult;
  onRestart: () => void;
  reportRef: React.RefObject<HTMLDivElement | null>;
}

function ResultStage({ drawn, drawnSub, reading, onRestart, reportRef }: ResultStageProps) {
  const [shareMsg, setShareMsg] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);

  // Stagger-reveal sections
  useEffect(() => {
    const total = (reading.sections?.length ?? 0) + 4;
    let n = 0;
    const t = setInterval(() => { n++; setVisibleCount(n); if (n >= total) clearInterval(t); }, 200);
    return () => clearInterval(t);
  }, [reading.sections?.length]);

  const buildText = useCallback(() => [
    "[속마음 타로 리딩]", `페르소나: ${reading.persona}`, "",
    reading.intro, "",
    ...(reading.sections || []).map(s =>
      [`${s.slot}. ${s.title}`, `메인: ${s.mainCardName || "-"} / 보조: ${s.subCardName || "-"}`, s.content].join("\n")),
    "", reading.masterAdvice || "", "", reading.closing,
  ].join("\n"), [reading]);

  const showMsg = (msg: string) => { setShareMsg(msg); setTimeout(() => setShareMsg(""), 2500); };

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "속마음 타로 리딩", text: reading.intro }); showMsg("공유 완료!"); return; } catch {}
    }
    try { await navigator.clipboard.writeText(buildText()); showMsg("텍스트 복사됨!"); } catch { showMsg("공유 실패"); }
  }, [reading, buildText]);

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(buildText()); showMsg("클립보드에 복사됨!"); }
    catch { showMsg("복사 실패"); }
  }, [buildText]);

  const handleSaveImage = useCallback(async () => {
    if (!reportRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(reportRef.current, { backgroundColor: "#0a0820", scale: 2, useCORS: true });
      const a = document.createElement("a"); a.download = `mindscan-${Date.now()}.png`; a.href = canvas.toDataURL("image/png"); a.click();
      showMsg("이미지 저장 완료!");
    } catch { showMsg("이미지 저장 실패"); }
  }, [reportRef]);

  return (
    <motion.div className="fixed inset-0 overflow-y-auto z-20"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}>
      <div className="min-h-full px-4 py-8 flex flex-col items-center">

        {/* Hero header */}
        <motion.div className="text-center mb-7 w-full max-w-2xl"
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: visibleCount >= 1 ? 1 : 0, y: visibleCount >= 1 ? 0 : -12 }}
          transition={{ duration: 0.4 }}>
          <p className="text-[11px] tracking-[0.55em] text-purple-400/62 uppercase mb-2">Mind Scan Tarot · 심층 리딩</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            상대방의 진심이{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-pink-400">열렸습니다</span>
          </h2>
          <div className="flex items-center justify-center gap-3 mt-2.5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-purple-500/35 max-w-[72px]" />
            <span className="text-xs text-purple-300/50">{reading.persona}</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-purple-500/35 max-w-[72px]" />
          </div>
        </motion.div>

        {/* Mini card spread */}
        <motion.div className="flex items-end justify-center gap-2 mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: visibleCount >= 2 ? 1 : 0, scale: visibleCount >= 2 ? 1 : 0.9 }}>
          {POSITIONS.map((pos, i) => {
            const [c1, c2] = cardGradient(drawn[pos.id] ?? i);
            return (
              <motion.div key={pos.id} className="flex flex-col items-center gap-0.5"
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
                <span className="text-[8px] text-purple-400/48">{pos.label}</span>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Report content */}
        <div ref={reportRef} className="w-full max-w-2xl space-y-4">

          {/* Intro */}
          <motion.div className="rounded-2xl border border-purple-500/15 p-5 sm:p-6"
            style={{ background: "linear-gradient(135deg,rgba(109,40,217,0.1),rgba(168,85,247,0.04))" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: visibleCount >= 3 ? 1 : 0, y: visibleCount >= 3 ? 0 : 14 }}
            transition={{ duration: 0.38 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.26)" }}>
                <span className="text-lg">🔮</span>
              </div>
              <h3 className="text-sm font-bold text-purple-100 tracking-wide">타로 마스터의 도입</h3>
            </div>
            <p className="text-sm text-purple-100/80 leading-7">{reading.intro}</p>
          </motion.div>

          {/* Sections */}
          {(reading.sections || []).map((s, i) => (
            <motion.article key={s.slot} className="rounded-2xl border border-white/7 p-5 sm:p-6"
              style={{ background: i % 2 === 0 ? "rgba(109,40,217,0.07)" : "rgba(168,85,247,0.05)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: visibleCount >= i + 4 ? 1 : 0, y: visibleCount >= i + 4 ? 0 : 16 }}
              transition={{ duration: 0.38 }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.22)" }}>
                  <span className="text-lg">{SLOT_ICONS[i] ?? "✦"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-semibold text-purple-100 leading-snug">{s.slot}. {s.title}</h4>
                  {(s.mainCardName || s.subCardName) && (
                    <div className="flex flex-wrap items-center gap-x-1 mt-0.5">
                      <span className="text-[10px] text-purple-400/55">메인:</span>
                      <span className="text-[10px] text-purple-200 font-medium">{s.mainCardName || "—"}</span>
                      <span className="text-[10px] text-purple-700/45 mx-0.5">·</span>
                      <span className="text-[10px] text-purple-400/55">보조:</span>
                      <span className="text-[10px] text-purple-200 font-medium">{s.subCardName || "—"}</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-purple-100/82 leading-7 sm:pl-12 whitespace-pre-line">{s.content}</p>
            </motion.article>
          ))}

          {/* Master advice */}
          {reading.masterAdvice && (
            <motion.article className="rounded-2xl border border-purple-400/18 p-5 sm:p-6"
              style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(236,72,153,0.06),transparent)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: visibleCount >= 10 ? 1 : 0, y: visibleCount >= 10 ? 0 : 16 }}
              transition={{ duration: 0.38 }}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(236,72,153,0.14)", border: "1px solid rgba(236,72,153,0.22)" }}>
                  <span className="text-lg">✨</span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-purple-100">마스터의 종합 조언</h4>
              </div>
              <p className="text-sm text-purple-50/85 leading-7 whitespace-pre-line">{reading.masterAdvice}</p>
            </motion.article>
          )}

          {/* Closing */}
          <motion.div className="rounded-2xl border border-white/5 p-5 sm:p-6 text-center"
            style={{ background: "rgba(255,255,255,0.02)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: visibleCount >= 11 ? 1 : 0 }}
            transition={{ duration: 0.4 }}>
            <p className="text-[10px] tracking-[0.45em] text-purple-400/45 uppercase mb-3">Closing Message</p>
            <p className="text-sm text-purple-100/76 leading-7 italic">{reading.closing}</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-8 h-px bg-purple-700/35" />
              <p className="text-[9px] text-purple-500/35 tracking-widest">
                {reading.source === "gemini" ? "✦ Gemini AI 해석" : "✦ 타로 카드 DB 해석"}
              </p>
              <div className="w-8 h-px bg-purple-700/35" />
            </div>
          </motion.div>
        </div>

        {/* Action buttons */}
        <motion.div className="mt-6 w-full max-w-2xl flex flex-wrap gap-2 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: visibleCount >= 12 ? 1 : 0 }}>
          {[
            { label: "📷 이미지 저장", fn: handleSaveImage, cls: "border-emerald-400/22 bg-emerald-500/8 text-emerald-100 hover:bg-emerald-500/18" },
            { label: "🔗 공유",       fn: handleShare,     cls: "border-fuchsia-400/22 bg-fuchsia-500/8 text-fuchsia-100 hover:bg-fuchsia-500/18" },
            { label: "📋 텍스트 복사", fn: handleCopy,      cls: "border-amber-400/22 bg-amber-500/8 text-amber-100 hover:bg-amber-500/18" },
          ].map(b => (
            <button key={b.label} type="button" onClick={b.fn}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide border transition-colors ${b.cls}`}>
              {b.label}
            </button>
          ))}
        </motion.div>
        {shareMsg && (
          <motion.p className="mt-2 text-xs text-purple-200/62"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {shareMsg}
          </motion.p>
        )}

        <button type="button" onClick={onRestart}
          className="mt-6 mb-12 px-8 py-3 rounded-full border border-purple-500/22 text-purple-300/52 text-sm font-medium tracking-wide hover:bg-purple-500/10 hover:text-purple-100 transition-all">
          🔄 처음부터 다시 하기
        </button>
      </div>
    </motion.div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function MindScanTarot() {
  const [stage, setStage] = useState<Stage>("intro");
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
  const reportRef = useRef<HTMLDivElement | null>(null);
  const usedRef = useRef<Set<number>>(new Set());
  const drawnRef = useRef<Record<string, number>>({});
  const drawnSubRef = useRef<Record<string, number>>({});

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

  // Free reading — no coin gate
  const handleGenerateReading = useCallback(async () => {
    if (readingLoading || reading) return;
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
      const res = await fetch("/api/tarot/mindscan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairs }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && Array.isArray(data.sections)) {
        setReading(data as ReadingResult);
        setStage("result");
      } else {
        throw new Error(String(data?.error || `요청 실패 (${res.status})`));
      }
    } catch (e) {
      setReadingError(e instanceof Error ? e.message : "오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setReadingLoading(false);
    }
  }, [readingLoading, reading]);

  const restart = useCallback(() => {
    setStage("intro"); setPickRound("main");
    setMainPicks([]); setSubPicks([]);
    setDrawn({}); setDrawnSub({}); setUsedCardIds(new Set());
    setRevealedCount(0); setReading(null); setReadingError("");
    drawnRef.current = {}; drawnSubRef.current = {}; usedRef.current = new Set();
  }, []);

  return (
    <div className="fixed inset-0 z-[60]"
      style={{ background: "linear-gradient(145deg,#040814 0%,#0a0920 30%,#120722 65%,#040916 100%)" }}>
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 75% 50% at 50% 12%,rgba(109,40,217,0.15) 0%,transparent 65%)" }} />
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
            onGenerateReading={handleGenerateReading} />
        )}
        {stage === "result" && reading && (
          <ResultStage key="result"
            drawn={drawn} drawnSub={drawnSub} reading={reading} onRestart={restart} reportRef={reportRef} />
        )}
      </AnimatePresence>
    </div>
  );
}
