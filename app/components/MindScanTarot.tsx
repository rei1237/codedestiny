"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

// ── TYPES ─────────────────────────────────────────────────────────────────────
type Stage = "intro" | "shuffle" | "spread" | "result";
interface CrossPosition { id: string; label: string; meaning: string; icon: string; col: number; row: number; isCenter?: boolean; }
interface ReadingSection { slot: number; title: string; content: string; mainCardName?: string; subCardName?: string; }
interface ReadingResult { source: "gemini" | "local"; persona: string; intro: string; sections: ReadingSection[]; masterAdvice?: string; closing: string; }
interface VisualCue { id: number; label: string; }

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const POSITIONS: CrossPosition[] = [
  { id: "top",    label: "위",   meaning: "의식적으로 드러내는 감정", icon: "🌙", col: 2, row: 1 },
  { id: "left",   label: "좌",   meaning: "과거의 감정 흔적",         icon: "🕯",  col: 1, row: 2 },
  { id: "center", label: "중앙", meaning: "현재 진심의 핵심",          icon: "💜", col: 2, row: 2, isCenter: true },
  { id: "right",  label: "우",   meaning: "바라는 미래 방향",          icon: "⭐", col: 3, row: 2 },
  { id: "bottom", label: "아래", meaning: "숨겨둔 무의식적 욕구",      icon: "🔮", col: 2, row: 3 },
];
const SUB_SUFFIX = "_sub";
const READING_COST = 50;
const FAN_SIZE = 19;   // 항상 19장만 렌더: 78장 framer-motion 완전 제거
const DECK_SIZE = 78;

// ── STYLE TOKENS ──────────────────────────────────────────────────────────────
const G  = "backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl";
const GP = "shadow-[0_0_18px_rgba(168,85,247,0.45),0_0_40px_rgba(168,85,247,0.15)]";
const GC = "shadow-[0_0_28px_rgba(232,121,249,0.65),0_0_60px_rgba(168,85,247,0.3)]";
const GG = "shadow-[0_0_18px_rgba(251,191,36,0.45),0_0_36px_rgba(251,191,36,0.12)]";

// ── STARS (28개, deterministic) ───────────────────────────────────────────────
const STARS = Array.from({ length: 28 }, (_, i) => {
  const s = i * 13.7;
  return { id: i, x: +((s * 37.3) % 100).toFixed(1), y: +((s * 17.1) % 100).toFixed(1), size: i % 4 === 0 ? 2 : 1, delay: +((s % 3).toFixed(2)), dur: +(2.5 + (s % 2.5)).toFixed(2) };
});

function StarField() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {STARS.map(s => (
        <motion.div key={s.id} className="absolute rounded-full bg-purple-200"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.05, 0.48, 0.05] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── CARD BACK (CSS only, SVG 없음) ────────────────────────────────────────────
function CardBack({ w = 48, h = 68 }: { w?: number; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 9, overflow: "hidden",
      background: "linear-gradient(150deg,#1c0f42 0%,#2d1b69 50%,#0f0822 100%)",
      border: "1px solid rgba(168,85,247,0.35)", position: "relative",
    }}>
      <div style={{ position: "absolute", inset: 3, borderRadius: 6, border: "1px dashed rgba(192,132,252,0.3)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 12, color: "#e879f9", opacity: 0.7 }}>✦</span>
        <span style={{ fontSize: 6.5, color: "#c084fc", opacity: 0.45, letterSpacing: "0.2em" }}>TAROT</span>
        <span style={{ fontSize: 6.5, color: "#a855f7", opacity: 0.35 }}>✦</span>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.07) 0%, transparent 55%)", borderRadius: 9 }} />
    </div>
  );
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getNextTarget(main: Record<string, number>, sub: Record<string, number>): string | null {
  for (const p of POSITIONS) {
    if (!(p.id in main)) return p.id;
    if (!(p.id in sub)) return p.id + SUB_SUFFIX;
  }
  return null;
}

function buildPlainText(r: ReadingResult) {
  return [
    "[속마음 타로 리딩]", `페르소나: ${r.persona}`, "",
    r.intro, "",
    ...r.sections.map(s => [`${s.slot}. ${s.title}`, `메인: ${s.mainCardName || "-"} / 보조: ${s.subCardName || "-"}`, s.content].join("\n")),
    "", r.masterAdvice ? `[마스터 조언]\n${r.masterAdvice}` : "", "", r.closing,
  ].join("\n");
}

// ── ARC DECK ─────────────────────────────────────────────────────────────────
// 핵심 성능 픽스: 78개 framer-motion card → 항상 max 19개 CSS div
function ArcDeck({ remaining, onDraw, disabled }: { remaining: number; onDraw: () => void; disabled: boolean }) {
  const [hIdx, setHIdx] = useState(-1);
  const count = Math.min(remaining, FAN_SIZE);
  const angleRange = Math.min(72, count * 3.8);
  if (count === 0) return null;
  return (
    <div style={{ position: "relative", width: "100%", height: 180, userSelect: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const angle = count <= 1 ? 0 : -angleRange / 2 + (i / (count - 1)) * angleRange;
        const hov = hIdx === i && !disabled;
        return (
          <div
            key={i}
            onClick={disabled ? undefined : onDraw}
            onMouseEnter={() => !disabled && setHIdx(i)}
            onMouseLeave={() => setHIdx(-1)}
            style={{
              position: "absolute", bottom: 6, left: "50%", marginLeft: -24,
              transformOrigin: "50% 100%",
              transform: `rotate(${angle}deg) translateY(${hov ? -152 : -126}px) scale(${hov ? 1.2 : 1})`,
              transition: "transform 0.15s ease, filter 0.15s ease",
              cursor: disabled ? "default" : "pointer",
              zIndex: hov ? 100 : i,
              filter: disabled
                ? "brightness(0.35) grayscale(0.6)"
                : hov
                  ? "brightness(1.45) drop-shadow(0 0 10px rgba(232,121,249,0.85))"
                  : "brightness(1)",
              opacity: disabled ? 0.4 : 1,
            }}
          >
            <CardBack w={48} h={68} />
          </div>
        );
      })}
      {!disabled && (
        <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", fontSize: 10, color: "rgba(192,132,252,0.44)", letterSpacing: "0.18em", whiteSpace: "nowrap" }}>
          카드를 클릭해 선택 · 남은 {remaining}장
        </div>
      )}
    </div>
  );
}

// ── PLACED CARD (3D flip) ─────────────────────────────────────────────────────
interface PlacedCardProps {
  pos: CrossPosition;
  isFlipped: boolean;
  isMainPlaced: boolean;
  isSubPlaced: boolean;
  onFlip: () => void;
  delay?: number;
}

function PlacedCard({ pos, isFlipped, isMainPlaced, isSubPlaced, onFlip, delay = 0 }: PlacedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5); const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 140, damping: 22 });
  const sy = useSpring(my, { stiffness: 140, damping: 22 });
  const tX = useTransform(sy, [0, 1], isFlipped ? [5, -5] : [0, 0]);
  const tY = useTransform(sx, [0, 1], isFlipped ? [-5, 5] : [0, 0]);
  const shX = useTransform(sx, [0, 1], ["10%", "90%"]);
  const shY = useTransform(sy, [0, 1], ["10%", "90%"]);
  const W = pos.isCenter ? "w-24 sm:w-28" : "w-20 sm:w-24";
  const H = pos.isCenter ? "h-36 sm:h-40" : "h-28 sm:h-32";

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      style={{ gridColumn: pos.col, gridRow: pos.row }}
      initial={{ opacity: 0, scale: 0.82 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.28 }}
    >
      <span className="text-[9px] text-purple-300/48 tracking-widest">{pos.label}</span>
      <div className={`relative ${W} ${H}`}>
        {isSubPlaced
          ? <div className={`absolute inset-0 rounded-xl overflow-hidden border border-purple-700/22`} style={{ transform: "translate(5px,5px)", zIndex: 0, position: "absolute", width: "100%", height: "100%" }}><CardBack w={96} h={140} /></div>
          : <div className={`absolute rounded-xl border-2 border-dashed border-purple-700/18 w-full h-full`} style={{ transform: "translate(5px,5px)", zIndex: 0 }} />}
        {!isMainPlaced ? (
          <motion.div className={`relative ${W} ${H} rounded-xl border-2 border-dashed border-purple-600/28 flex items-center justify-center z-10`}
            animate={{ opacity: [0.25, 0.65, 0.25] }} transition={{ duration: 2, repeat: Infinity }}>
            <span className="text-purple-500/32 text-xs">대기</span>
          </motion.div>
        ) : (
          <motion.div
            ref={ref}
            className={`relative ${W} ${H} cursor-pointer z-10 rounded-xl`}
            style={{ perspective: 900, rotateX: tX, rotateY: tY }}
            onClick={onFlip}
            onMouseMove={e => {
              if (!ref.current || !isFlipped) return;
              const r = ref.current.getBoundingClientRect();
              mx.set((e.clientX - r.left) / r.width);
              my.set((e.clientY - r.top) / r.height);
            }}
            onMouseLeave={() => { mx.set(0.5); my.set(0.5); }}
            whileHover={{ scale: isFlipped ? 1.02 : 1.05 }} whileTap={{ scale: 0.96 }}
            role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && onFlip()}
            aria-label={`${pos.label} 카드 뒤집기`}
          >
            <motion.div className="w-full h-full"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.62, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ transformStyle: "preserve-3d", position: "relative" }}
            >
              <div className={`absolute inset-0 rounded-xl overflow-hidden ${G} ${pos.isCenter ? GC : GP}`} style={{ backfaceVisibility: "hidden" }}>
                <div className="w-full h-full"><CardBack w={120} h={160} /></div>
                {!isFlipped && (
                  <div className="absolute inset-0 flex items-end justify-center pb-2.5">
                    <span className="text-[9px] text-purple-300/40 tracking-widest">TAP ✦</span>
                  </div>
                )}
              </div>
              <div className={`absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-2 ${G} ${pos.isCenter ? GC : GG}`} style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <span className="text-3xl drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]">{pos.icon}</span>
                <span className="text-[10px] font-bold text-purple-100 tracking-widest">{pos.label}</span>
                <span className="text-[8px] text-purple-300/62 text-center px-2 leading-snug">{pos.meaning}</span>
                <motion.div className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ background: useTransform([shX, shY], ([x, y]) => `radial-gradient(ellipse 55% 38% at ${x} ${y}, rgba(255,255,255,0.17) 0%, transparent 70%)`) }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── STAGE: INTRO ──────────────────────────────────────────────────────────────
function IntroStage({ onStart }: { onStart: () => void }) {
  return (
    <motion.div className="fixed inset-0 overflow-y-auto z-10"
      initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.52 }}>
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-14 text-center">
        <motion.div className={`relative w-44 h-44 sm:w-56 sm:h-56 rounded-3xl overflow-hidden mb-8 ${G} ${GC}`}
          initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fuctionassets/mindscantaro.webp" alt="속마음 타로" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e2a]/60 via-transparent to-transparent" />
          <motion.div className="absolute inset-0 rounded-3xl border-2 border-purple-400/33"
            animate={{ scale: [1, 1.06, 1], opacity: [0.38, 0, 0.38] }} transition={{ duration: 2.8, repeat: Infinity }} />
        </motion.div>

        <motion.div className="space-y-2 mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <p className="text-[10px] tracking-[0.45em] text-purple-400/70 uppercase">Mind Scan Tarot</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
            상대방의 정확한<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-fuchsia-400">속마음 알아보기</span>
          </h1>
          <p className="text-sm text-purple-200/56 leading-relaxed max-w-xs mx-auto mt-2">
            78장 덱에서 10장을 직접 고르고 십자 스프레드로<br />상대방의 진짜 감정을 타로 마스터가 해석합니다
          </p>
        </motion.div>

        <motion.div className={`w-full max-w-xs ${G} p-4 mb-8 text-left`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.36 }}>
          <p className="text-[10px] font-bold tracking-widest text-purple-300/52 uppercase mb-3">5 Positions · 10 Cards</p>
          {POSITIONS.map(p => (
            <div key={p.id} className="flex items-center gap-3 mb-2.5">
              <span className="text-base w-5 text-center">{p.icon}</span>
              <div>
                <span className="text-xs font-semibold text-purple-200">{p.label} — </span>
                <span className="text-xs text-purple-300/50">{p.meaning}</span>
              </div>
            </div>
          ))}
          <p className="text-[9px] text-purple-400/36 pt-2 border-t border-white/5">각 포지션 메인+보조 = 총 10장</p>
        </motion.div>

        <motion.button onClick={onStart}
          className={`px-10 py-4 rounded-full text-white font-bold text-sm tracking-widest uppercase relative overflow-hidden ${GP}`}
          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7 50%,#6d28d9)" }}
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
          <motion.span className="absolute inset-0 rounded-full pointer-events-none"
            animate={{ opacity: [0, 0.28, 0] }} transition={{ duration: 2.2, repeat: Infinity }}
            style={{ background: "radial-gradient(ellipse at center,rgba(232,121,249,0.5) 0%,transparent 70%)" }} />
          <span className="relative z-10">🔮 카드 셔플 시작</span>
        </motion.button>
        <motion.p className="text-[10px] text-purple-400/30 mt-4 tracking-widest"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
          ✦ 상대방을 생각하며 마음을 집중하세요 ✦
        </motion.p>
      </div>
    </motion.div>
  );
}

// ── STAGE: SHUFFLE ────────────────────────────────────────────────────────────
interface ShuffleProps {
  drawn: Record<string, number>;
  drawnSub: Record<string, number>;
  usedCount: number;
  nextTarget: string | null;
  onDraw: () => void;
  visualCue: VisualCue | null;
}

function ShuffleStage({ drawn, drawnSub, usedCount, nextTarget, onDraw, visualCue }: ShuffleProps) {
  const remaining = DECK_SIZE - usedCount;
  const isSub = nextTarget?.endsWith(SUB_SUFFIX) ?? false;
  const posId = isSub ? nextTarget?.replace(SUB_SUFFIX, "") : nextTarget;
  const targetPos = POSITIONS.find(p => p.id === posId);
  const pct = Math.min(100, (usedCount / 10) * 100);

  return (
    <motion.div className="fixed inset-0 flex flex-col z-10"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-8 pb-3 text-center">
        <p className="text-[10px] tracking-[0.42em] text-purple-400/58 uppercase">Mind Scan Tarot</p>
        {!nextTarget ? (
          <h2 className="text-xl font-bold text-white mt-1">✨ 배치 완료 — 전환 중...</h2>
        ) : (
          <>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              <span className="text-fuchsia-300">{targetPos?.icon} {targetPos?.label}</span>
              <span className="text-white/70 text-base ml-2">포지션 {isSub ? "보조" : "메인"} 카드</span>
            </h2>
            <p className="text-xs text-purple-300/46 mt-1">{targetPos?.meaning}</p>
          </>
        )}
        <div className="mt-3 w-full max-w-xs mx-auto">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-purple-400/52">{usedCount} / 10 선택됨</span>
            <span className="text-[10px] text-purple-400/52">{remaining}장 남음</span>
          </div>
          <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
              animate={{ width: `${pct}%` }} transition={{ duration: 0.26 }} />
          </div>
        </div>
      </div>

      {/* Position tracker */}
      <div className="flex-shrink-0 px-4">
        <div className={`${G} px-3 py-2.5 max-w-sm mx-auto`}>
          <div className="grid grid-cols-5 gap-1.5">
            {POSITIONS.map(p => {
              const hasMain = p.id in drawn;
              const hasSub = p.id in drawnSub;
              const activeMain = nextTarget === p.id;
              const activeSub = nextTarget === p.id + SUB_SUFFIX;
              return (
                <div key={p.id} className={`rounded-xl px-1.5 py-2 text-center transition-colors ${(activeMain || activeSub) ? "bg-purple-500/16 border border-purple-400/32" : "bg-black/16 border border-white/5"}`}>
                  <p className="text-[9px] text-purple-200/62 mb-1.5">{p.label}</p>
                  <div className="flex justify-center gap-0.5">
                    <div className={`w-2 h-2 rounded-full transition-colors ${hasMain ? "bg-purple-400" : activeMain ? "bg-pink-400 animate-pulse" : "bg-purple-900/42"}`} />
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${hasSub ? "bg-indigo-400" : activeSub ? "bg-violet-300 animate-pulse" : "bg-indigo-900/42"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Arc deck — 항상 max 19장만 렌더, CSS transform 사용 */}
      <div className="flex-1 flex flex-col justify-end pb-10 px-4">
        <p className="text-center text-xs text-purple-300/50 mb-3">
          {nextTarget ? "직관에 따라 차오르는 카드를 선택하세요" : "모든 카드가 배치되었습니다"}
        </p>
        <ArcDeck remaining={remaining} onDraw={onDraw} disabled={!nextTarget} />
      </div>

      <AnimatePresence>
        {visualCue && (
          <motion.div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full border border-white/14 bg-black/50 text-purple-100 text-xs tracking-[0.22em] z-30"
            initial={{ opacity: 0, y: 16, scale: 0.88 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
            {visualCue.label}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── STAGE: SPREAD ─────────────────────────────────────────────────────────────
interface SpreadProps {
  drawn: Record<string, number>;
  drawnSub: Record<string, number>;
  flipped: Set<string>;
  onFlip: (id: string) => void;
  onGenerateReading: () => void;
  readingLoading: boolean;
  readingError: string;
  paymentError: string;
  paymentDone: boolean;
  visualCue: VisualCue | null;
}

function SpreadStage({ drawn, drawnSub, flipped, onFlip, onGenerateReading, readingLoading, readingError, paymentError, paymentDone, visualCue }: SpreadProps) {
  const allFlipped = POSITIONS.every(p => flipped.has(p.id));
  return (
    <motion.div className="fixed inset-0 overflow-y-auto z-10"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.38 }}>
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
        <div className="text-center mb-6 flex-shrink-0">
          <p className="text-[10px] tracking-[0.42em] text-purple-400/60 uppercase">Mind Scan</p>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            카드를 탭해서{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">속마음을 열어보세요</span>
          </h2>
          <p className="text-xs text-purple-300/40 mt-1">각 포지션 카드를 클릭하면 뒤집힙니다</p>
        </div>

        {/* Desktop cross layout */}
        <div className="hidden sm:grid gap-4 mb-6 flex-shrink-0" style={{ gridTemplateColumns: "repeat(3,auto)", gridTemplateRows: "repeat(3,auto)" }}>
          {POSITIONS.map((pos, i) => (
            <PlacedCard key={pos.id} pos={pos}
              isFlipped={flipped.has(pos.id)} isMainPlaced={pos.id in drawn} isSubPlaced={pos.id in drawnSub}
              onFlip={() => onFlip(pos.id)} delay={i * 0.07} />
          ))}
        </div>

        {/* Mobile vertical */}
        <div className="flex sm:hidden flex-col items-center gap-3 mb-6 w-full max-w-[260px] flex-shrink-0">
          {["top", "center", "left", "right", "bottom"].map((id, i) => {
            const pos = POSITIONS.find(p => p.id === id)!;
            return (
              <PlacedCard key={pos.id} pos={pos}
                isFlipped={flipped.has(pos.id)} isMainPlaced={pos.id in drawn} isSubPlaced={pos.id in drawnSub}
                onFlip={() => onFlip(pos.id)} delay={i * 0.07} />
            );
          })}
        </div>

        <div className={`${G} px-5 py-2.5 flex items-center gap-3 mb-4`}>
          <div className="flex gap-1.5">
            {POSITIONS.map(p => (
              <motion.div key={p.id} className="w-2 h-2 rounded-full"
                animate={{ backgroundColor: flipped.has(p.id) ? "rgb(168,85,247)" : "rgba(168,85,247,0.17)" }}
                transition={{ duration: 0.28 }} />
            ))}
          </div>
          <span className="text-[11px] text-purple-300/50">{flipped.size} / {POSITIONS.length} 오픈</span>
        </div>

        <AnimatePresence>
          {allFlipped && (
            <motion.div className={`${G} ${GP} px-6 py-5 text-center w-full max-w-sm flex-shrink-0`}
              initial={{ opacity: 0, scale: 0.88, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}>
              <p className="text-base font-bold text-white mb-1.5">✨ 모든 속마음이 열렸어요</p>
              <p className="text-xs text-purple-300/60 leading-relaxed mb-4">
                10장의 카드가 모두 준비되었습니다.<br />타로 마스터의 심층 해석을 받아보세요.
              </p>
              <button type="button" onClick={onGenerateReading} disabled={readingLoading}
                className="w-full rounded-full py-3 text-sm font-bold tracking-wide text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: readingLoading ? "rgba(109,40,217,0.5)" : "linear-gradient(135deg,#7c3aed,#a855f7 50%,#6d28d9)",
                  boxShadow: readingLoading ? "none" : "0 0 20px rgba(168,85,247,0.4)",
                }}>
                {readingLoading
                  ? <span className="flex items-center justify-center gap-2">
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 rounded-full border-2 border-white/28 border-t-white inline-block" />
                    해석 생성 중...
                  </span>
                  : paymentDone ? "심층 해석 다시 보기" : `타로 마스터 심층 해석 (${READING_COST}코인)`}
              </button>
              {!paymentDone && <p className="mt-1.5 text-[10px] text-amber-200/60">최초 생성 시 {READING_COST}코인 차감</p>}
              {paymentError && <p className="mt-2 text-[11px] text-rose-300/80">{paymentError}</p>}
              {readingError && <p className="mt-2 text-[11px] text-rose-300/76">{readingError}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {visualCue && (
            <motion.div className="fixed top-14 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border border-white/14 bg-black/45 text-purple-100 text-[11px] tracking-[0.22em] z-30"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.22 }}>
              {visualCue.label}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── STAGE: RESULT ─────────────────────────────────────────────────────────────
const SLOT_ICONS = ["🧠", "🎭", "👁", "💬", "💜"];

interface ResultProps {
  reading: ReadingResult;
  onRestart: () => void;
  onSaveImage: () => void;
  onSavePdf: () => void;
  onShare: () => void;
  onCopyText: () => void;
  shareMessage: string;
  reportRef: React.RefObject<HTMLDivElement>;
}

function ResultStage({ reading, onRestart, onSaveImage, onSavePdf, onShare, onCopyText, shareMessage, reportRef }: ResultProps) {
  return (
    <motion.div className="fixed inset-0 overflow-y-auto z-10"
      initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}>
      <div className="min-h-full px-4 py-10 flex flex-col items-center">
        <motion.div className="text-center mb-8 w-full max-w-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <p className="text-[10px] tracking-[0.5em] text-purple-400/70 uppercase mb-2">Mind Scan Tarot · 심층 해석</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            상대방의{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-fuchsia-400">진심이 열렸습니다</span>
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="w-8 h-px bg-purple-500/30" />
            <span className="text-xs text-purple-300/46">{reading.persona}</span>
            <span className="w-8 h-px bg-purple-500/30" />
          </div>
        </motion.div>

        <div ref={reportRef} className="w-full max-w-2xl space-y-4">
          <motion.div className={`${G} ${GP} p-5 sm:p-6`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔮</span>
              <h3 className="text-sm font-bold text-purple-100 tracking-wide">타로 마스터의 도입</h3>
            </div>
            <p className="text-sm text-purple-100/80 leading-7">{reading.intro}</p>
          </motion.div>

          {reading.sections.map((s, i) => (
            <motion.article key={s.slot}
              className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/4 to-transparent p-5 sm:p-6"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 + i * 0.07 }}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl mt-0.5 shrink-0">{SLOT_ICONS[i] ?? "✦"}</span>
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-purple-100 leading-snug">{s.slot}. {s.title}</h4>
                  {(s.mainCardName || s.subCardName) && (
                    <p className="mt-0.5 text-[11px] text-purple-400/70">
                      메인: <span className="text-purple-200">{s.mainCardName || "-"}</span>
                      <span className="mx-1.5 text-purple-600/62">·</span>
                      보조: <span className="text-purple-200">{s.subCardName || "-"}</span>
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-purple-100/82 leading-7 sm:pl-9 whitespace-pre-line">{s.content}</p>
            </motion.article>
          ))}

          {reading.masterAdvice && (
            <motion.article className="rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-600/10 via-fuchsia-600/7 to-transparent p-5 sm:p-6"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✨</span>
                <h4 className="text-sm sm:text-base font-bold text-purple-100">마스터의 종합 조언</h4>
              </div>
              <p className="text-sm text-purple-50/86 leading-7 whitespace-pre-line">{reading.masterAdvice}</p>
            </motion.article>
          )}

          <motion.div className={`${G} p-5 text-center`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            <p className="text-[10px] tracking-[0.4em] text-purple-400/50 uppercase mb-2">Closing</p>
            <p className="text-sm text-purple-100/80 leading-7">{reading.closing}</p>
            <p className="mt-2.5 text-[9px] text-purple-500/40 tracking-widest">
              {reading.source === "gemini" ? "Gemini AI 해석" : "타로 카드 DB 해석"}
            </p>
          </motion.div>
        </div>

        <motion.div className="mt-7 w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
          {[
            { l: "📷 이미지", fn: onSaveImage, c: "border-emerald-400/22 bg-emerald-500/8 text-emerald-100 hover:bg-emerald-500/18" },
            { l: "📄 PDF",    fn: onSavePdf,   c: "border-sky-400/22 bg-sky-500/8 text-sky-100 hover:bg-sky-500/18" },
            { l: "🔗 공유",   fn: onShare,     c: "border-fuchsia-400/22 bg-fuchsia-500/8 text-fuchsia-100 hover:bg-fuchsia-500/18" },
            { l: "📋 복사",   fn: onCopyText,  c: "border-amber-400/22 bg-amber-500/8 text-amber-100 hover:bg-amber-500/18" },
          ].map(b => (
            <button key={b.l} type="button" onClick={b.fn}
              className={`rounded-xl px-3 py-2.5 text-xs font-semibold tracking-wide border transition-colors ${b.c}`}>{b.l}</button>
          ))}
        </motion.div>
        {shareMessage && <p className="mt-2 text-xs text-purple-200/60 text-center">{shareMessage}</p>}

        <motion.button type="button" onClick={onRestart}
          className="mt-8 mb-14 px-8 py-3 rounded-full border border-purple-500/26 text-purple-300/62 text-sm font-medium tracking-wide hover:bg-purple-500/10 hover:text-purple-100 transition-all"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}>
          🔄 처음부터 다시 하기
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function MindScanTarot() {
  const [stage, setStage] = useState<Stage>("intro");
  const [drawn, setDrawn] = useState<Record<string, number>>({});
  const [drawnSub, setDrawnSub] = useState<Record<string, number>>({});
  const [usedIds, setUsedIds] = useState<Set<number>>(new Set());
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [reading, setReading] = useState<ReadingResult | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentDone, setPaymentDone] = useState(false);
  const [visualCue, setVisualCue] = useState<VisualCue | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);
  const drawBusy = useRef(false);
  const drawnRef = useRef<Record<string, number>>({});
  const drawnSubRef = useRef<Record<string, number>>({});
  const usedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    drawnRef.current = drawn;
    drawnSubRef.current = drawnSub;
    usedRef.current = usedIds;
  }, [drawn, drawnSub, usedIds]);

  // 모든 슬롯 채워지면 spread로 자동 전환
  useEffect(() => {
    if (stage !== "shuffle") return;
    if (Object.keys(drawn).length === POSITIONS.length && Object.keys(drawnSub).length === POSITIONS.length) {
      const t = setTimeout(() => setStage("spread"), 380);
      return () => clearTimeout(t);
    }
  }, [drawn, drawnSub, stage]);

  const nextTarget = getNextTarget(drawn, drawnSub);

  // 랜덤 카드 뽑기 — ArcDeck 클릭 시 78장 중 미사용 카드 무작위 선택
  const handleDraw = useCallback(() => {
    if (drawBusy.current) return;
    const target = getNextTarget(drawnRef.current, drawnSubRef.current);
    if (!target) return;

    const available: number[] = [];
    for (let i = 0; i < DECK_SIZE; i++) {
      if (!usedRef.current.has(i)) available.push(i);
    }
    if (available.length === 0) return;

    drawBusy.current = true;
    setTimeout(() => { drawBusy.current = false; }, 100);

    const cardId = available[Math.floor(Math.random() * available.length)];
    const now = Date.now();
    setVisualCue({ id: now, label: "✦ 카드 선택됨" });
    setTimeout(() => setVisualCue(null), 650);

    const newUsed = new Set([...usedRef.current, cardId]);
    setUsedIds(newUsed);
    usedRef.current = newUsed;

    if (target.endsWith(SUB_SUFFIX)) {
      const posId = target.replace(SUB_SUFFIX, "");
      const ns = { ...drawnSubRef.current, [posId]: cardId };
      setDrawnSub(ns); drawnSubRef.current = ns;
    } else {
      const nm = { ...drawnRef.current, [target]: cardId };
      setDrawn(nm); drawnRef.current = nm;
    }
  }, []);

  const handleFlip = useCallback((id: string) => {
    setFlipped(prev => new Set([...prev, id]));
  }, []);

  const handleGenerateReading = useCallback(async () => {
    if (readingLoading) return;
    const allFlipped = POSITIONS.every(p => flipped.has(p.id));
    if (!allFlipped) { setReadingError("모든 카드를 먼저 뒤집어 주세요."); return; }

    const pairs = POSITIONS.map((pos, idx) => ({
      slot: idx + 1,
      positionId: pos.id,
      positionLabel: pos.label,
      positionMeaning: pos.meaning,
      mainCardId: drawn[pos.id],
      subCardId: drawnSub[pos.id],
    }));

    setReadingLoading(true);
    setReadingError("");
    setPaymentError("");
    try {
      if (!paymentDone) {
        const token = localStorage.getItem("fortune_auth_token");
        if (!token) {
          setPaymentError("로그인이 필요합니다. 이동합니다...");
          setTimeout(() => { window.location.href = "/login?next=%2Ftarot%2Fmindscan"; }, 700);
          return;
        }
        const cr = await fetch("/api/fortune/pig-coin/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cost: READING_COST, reason: "mindscan 타로 심층 해석", featureKey: "tarot-mindscan-reading" }),
        });
        const cd = await cr.json().catch(() => ({}));
        if (cr.status === 402) { setPaymentError(`코인 부족 — ${READING_COST}코인 필요`); return; }
        if (!cr.ok) { setPaymentError(String(cd?.message || "코인 차감 실패")); return; }
        setPaymentDone(true);
      }

      const res = await fetch("/api/tarot/mindscan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error || `요청 실패 (${res.status})`));
      if (!data || !Array.isArray(data.sections)) throw new Error("결과 형식 오류");
      setReading(data as ReadingResult);
      setStage("result");
    } catch (e) {
      setReadingError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setReadingLoading(false);
    }
  }, [drawn, drawnSub, flipped, paymentDone, readingLoading]);

  const restart = useCallback(() => {
    setStage("intro");
    setDrawn({}); setDrawnSub({}); setUsedIds(new Set());
    setFlipped(new Set()); setReading(null);
    setPaymentDone(false); setReadingError(""); setPaymentError(""); setShareMessage("");
    drawnRef.current = {}; drawnSubRef.current = {}; usedRef.current = new Set();
  }, []);

  const handleSaveImage = useCallback(async () => {
    if (!reading || !reportRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(reportRef.current, { backgroundColor: "#0b0b1f", scale: 2, useCORS: true });
      const a = document.createElement("a");
      a.download = `mindscan-reading-${Date.now()}.png`;
      a.href = canvas.toDataURL("image/png"); a.click();
      setShareMessage("이미지 저장 완료");
    } catch { setShareMessage("이미지 저장 실패"); }
  }, [reading]);

  const handleSavePdf = useCallback(() => {
    if (!reading || !reportRef.current) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!win) { setShareMessage("팝업 차단됨"); return; }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>MindScan Reading</title><style>body{font-family:'Noto Sans KR',sans-serif;background:#0b0b1f;color:#f5f3ff;padding:24px;line-height:1.8}h3,h4{margin:0 0 10px}article{margin:0 0 14px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.03)}@media print{body{background:#fff;color:#111}article{border-color:#ddd;background:#fff}}</style></head><body>${reportRef.current.innerHTML}</body></html>`);
    win.document.close(); win.focus(); win.print();
    setShareMessage("PDF 인쇄 창 열림");
  }, [reading]);

  const handleShare = useCallback(async () => {
    if (!reading) return;
    const text = buildPlainText(reading);
    if (navigator.share) {
      try { await navigator.share({ title: "속마음 타로 리딩", text: text.slice(0, 4000) }); setShareMessage("공유 완료"); return; } catch {}
    }
    try { await navigator.clipboard.writeText(text); setShareMessage("텍스트 복사됨"); } catch { setShareMessage("공유 실패"); }
  }, [reading]);

  const handleCopyText = useCallback(async () => {
    if (!reading) return;
    try { await navigator.clipboard.writeText(buildPlainText(reading)); setShareMessage("클립보드에 복사됨"); }
    catch { setShareMessage("복사 실패"); }
  }, [reading]);

  return (
    <div className="fixed inset-0"
      style={{ background: "linear-gradient(135deg,#060918 0%,#0d0b2a 40%,#140827 70%,#06091a 100%)" }}>
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 55% at 50% 15%,rgba(109,40,217,0.11) 0%,transparent 60%)" }} />
      <StarField />
      <AnimatePresence mode="wait">
        {stage === "intro" && (
          <IntroStage key="intro" onStart={() => setStage("shuffle")} />
        )}
        {stage === "shuffle" && (
          <ShuffleStage key="shuffle"
            drawn={drawn} drawnSub={drawnSub} usedCount={usedIds.size}
            nextTarget={nextTarget} onDraw={handleDraw} visualCue={visualCue} />
        )}
        {stage === "spread" && (
          <SpreadStage key="spread"
            drawn={drawn} drawnSub={drawnSub} flipped={flipped}
            onFlip={handleFlip} onGenerateReading={handleGenerateReading}
            readingLoading={readingLoading} readingError={readingError}
            paymentError={paymentError} paymentDone={paymentDone} visualCue={visualCue} />
        )}
        {stage === "result" && reading && (
          <ResultStage key="result"
            reading={reading} onRestart={restart}
            onSaveImage={handleSaveImage} onSavePdf={handleSavePdf}
            onShare={handleShare} onCopyText={handleCopyText}
            shareMessage={shareMessage} reportRef={reportRef} />
        )}
      </AnimatePresence>
    </div>
  );
}
