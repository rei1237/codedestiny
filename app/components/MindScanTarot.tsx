"use client";

import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useCallback, useRef, useState } from "react";

// --- TYPES ---

type Stage = "intro" | "shuffle" | "spread";

interface CrossPosition {
  id: string;
  label: string;
  meaning: string;
  icon: string;
  col: number;
  row: number;
  isCenter?: boolean;
}

interface DeckCard {
  deckId: number;
  posId: string | null;
}

interface ReadingSection {
  slot: number;
  title: string;
  content: string;
  mainCardName?: string;
  subCardName?: string;
}

interface ReadingResult {
  source: "gemini" | "local";
  persona: string;
  intro: string;
  sections: ReadingSection[];
  masterAdvice?: string;
  closing: string;
}

interface VisualCue {
  id: number;
  kind: "swish" | "thud";
  label: string;
}

function buildReadingPlainText(reading: ReadingResult) {
  const sectionText = reading.sections
    .map((s) => {
      return [
        `${s.slot}번 구역 - ${s.title}`,
        `메인 카드: ${s.mainCardName || "-"}`,
        `보조 카드: ${s.subCardName || "-"}`,
        s.content,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "[상대방 속마음 타로 리딩]",
    `페르소나: ${reading.persona}`,
    `생성 소스: ${reading.source === "gemini" ? "Gemini API" : "Local Deep Engine"}`,
    "",
    "[도입]",
    reading.intro,
    "",
    "[구역별 심층 해석]",
    sectionText,
    "",
    "[마스터의 조언]",
    reading.masterAdvice || "",
    "",
    "[마무리]",
    reading.closing,
  ].join("\n");
}

// --- POSITIONS ---

const POSITIONS: CrossPosition[] = [
  { id: "top",    label: "위",   meaning: "의식적으로 드러내는 감정", icon: "🌙", col: 2, row: 1 },
  { id: "left",   label: "좌",   meaning: "과거의 감정 흔적",          icon: "🕯",  col: 1, row: 2 },
  { id: "center", label: "중앙", meaning: "현재 진심의 핵심",           icon: "💜", col: 2, row: 2, isCenter: true },
  { id: "right",  label: "우",   meaning: "바라는 미래 방향",           icon: "⭐", col: 3, row: 2 },
  { id: "bottom", label: "아래", meaning: "숨겨둔 무의식적 욕구",       icon: "🔮", col: 2, row: 3 },
];

const SUB_SUFFIX = "_sub";
const MINDSCAN_READING_COST = 50;

// --- STYLE CONSTANTS ---

const GLASS = "backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl";
const GLOW_PUR = "shadow-[0_0_18px_rgba(168,85,247,0.45),0_0_40px_rgba(168,85,247,0.15)]";
const GLOW_CTR = "shadow-[0_0_28px_rgba(232,121,249,0.65),0_0_60px_rgba(168,85,247,0.3)]";
const GLOW_GOLD = "shadow-[0_0_18px_rgba(251,191,36,0.45),0_0_36px_rgba(251,191,36,0.12)]";

// --- STARS (deterministic) ---

const STARS = Array.from({ length: 35 }, (_, i) => {
  const seed = i * 13.7;
  return {
    id: i,
    x: +((seed * 37.3) % 100).toFixed(1),
    y: +((seed * 17.1) % 100).toFixed(1),
    size: i % 4 === 0 ? 2 : 1,
    delay: +((seed % 3).toFixed(2)),
    dur: +(2.5 + (seed % 2.5)).toFixed(2),
  };
});

function StarField() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {STARS.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-purple-200"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.08, 0.65, 0.08] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// --- CARD PATTERN SVG ---

function CardPatternSvg({ id }: { id: string }) {
  const gid = id.replace(/[^a-zA-Z0-9]/g, "_");
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full" aria-hidden="true">
      <defs>
        <radialGradient id={`rg_${gid}`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`shine_${gid}`} cx="30%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="140" fill={`url(#rg_${gid})`} />
      <rect x="3" y="3" width="94" height="134" rx="5" fill="none" stroke="#c084fc" strokeWidth="0.7" strokeDasharray="4 2" />
      <rect x="7" y="7" width="86" height="126" rx="4" fill="none" stroke="#a855f7" strokeWidth="0.4" />
      <text x="50" y="58" textAnchor="middle" fontSize="20" fill="#e879f9" opacity="0.75">✦</text>
      <text x="50" y="80" textAnchor="middle" fontSize="8" fill="#c084fc" opacity="0.65" letterSpacing="3">TAROT</text>
      <text x="50" y="96" textAnchor="middle" fontSize="7" fill="#a855f7" opacity="0.5"> ✦ </text>
      <text x="12" y="22" fontSize="7" fill="#c084fc" opacity="0.4">✦</text>
      <text x="82" y="22" fontSize="7" fill="#c084fc" opacity="0.4">✦</text>
      <text x="12" y="128" fontSize="7" fill="#c084fc" opacity="0.4">✦</text>
      <text x="82" y="128" fontSize="7" fill="#c084fc" opacity="0.4">✦</text>
      <rect width="100" height="140" fill={`url(#shine_${gid})`} />
    </svg>
  );
}

// --- FAN CARD ---

interface FanCardProps {
  index: number;
  total: number;
  onSelect: () => void;
  layoutId: string;
}

function FanCard({ index, total, onSelect, layoutId }: FanCardProps) {
  const [hovered, setHovered] = useState(false);
  const angleRange = 78;
  const rotation = -angleRange / 2 + (index / (total - 1)) * angleRange;
  const rad = (rotation * Math.PI) / 180;
  const tx = Math.sin(rad) * 156;
  const ty = -(Math.cos(Math.abs(rad)) * 40 + 40);

  return (
    <motion.div
      layoutId={layoutId}
      className="absolute cursor-pointer select-none"
      style={{ width: 64, height: 90, bottom: 0, left: "50%", marginLeft: -32, zIndex: hovered ? 100 : index, originY: 1 }}
      initial={{ rotate: rotation, x: tx, y: 80, opacity: 0 }}
      animate={{ rotate: rotation, x: tx, y: hovered ? ty - 18 : ty, opacity: 1, scale: hovered ? 1.2 : 1 }}
      exit={{ opacity: 0, scale: 0.4, y: -300 }}
      transition={{ type: "spring", stiffness: 200, damping: 22, opacity: { duration: 0.3 }, delay: index * 0.006 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      aria-label={`타로 카드 ${index + 1} 선택`}
      whileTap={{ scale: 1.05 }}
    >
      <div
        className={`w-full h-full rounded-xl overflow-hidden relative ${GLASS} border-purple-500/40`}
        style={{ boxShadow: hovered ? "0 0 22px rgba(232,121,249,0.7),0 8px 32px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.4)" }}
      >
        <CardPatternSvg id={`fan_${index}`} />
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="absolute inset-0 rounded-xl"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(232,121,249,0.3) 0%, transparent 65%)" }}
            />
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute -top-7 left-1/2 -translate-x-1/2 bg-purple-900/90 px-2 py-0.5 rounded text-[9px] text-purple-200 whitespace-nowrap pointer-events-none"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            클릭하여 선택
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- PLACED CARD (3D flip + light reflection) ---

interface PlacedCardProps {
  pos: CrossPosition;
  mainLayoutId: string;
  subLayoutId: string;
  isFlipped: boolean;
  isMainPlaced: boolean;
  isSubPlaced: boolean;
  onFlip: () => void;
  arrivalDelay?: number;
}

function PlacedCard({ pos, mainLayoutId, subLayoutId, isFlipped, isMainPlaced, isSubPlaced, onFlip, arrivalDelay = 0 }: PlacedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 150, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 25 });
  const tiltX = useTransform(springY, [0, 1], isFlipped ? [8, -8] : [0, 0]);
  const tiltY = useTransform(springX, [0, 1], isFlipped ? [-8, 8] : [0, 0]);
  const shineX = useTransform(springX, [0, 1], ["10%", "90%"]);
  const shineY = useTransform(springY, [0, 1], ["10%", "90%"]);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current || !isFlipped) return;
    const r = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width);
    mouseY.set((e.clientY - r.top) / r.height);
  }
  function onMouseLeave() { mouseX.set(0.5); mouseY.set(0.5); }

  const w = pos.isCenter ? "w-28 sm:w-32" : "w-24 sm:w-28";
  const h = pos.isCenter ? "h-40 sm:h-44" : "h-36 sm:h-40";

  return (
    <motion.div
      className="relative flex flex-col items-center gap-1.5"
      style={{ gridColumn: pos.col, gridRow: pos.row }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: arrivalDelay }}
    >
      <span className="text-[9px] sm:text-[10px] font-semibold tracking-[0.18em] text-purple-300/55 uppercase">{pos.label}</span>

      <div className={`relative ${w} ${h}`}>
        {/* sub card */}
        {isSubPlaced ? (
          <motion.div
            layoutId={subLayoutId}
            className={`absolute ${w} ${h} rounded-2xl overflow-hidden ${GLASS} border-purple-700/25`}
            style={{ transform: "translate(6px,6px)", zIndex: 0 }}
          >
            <CardPatternSvg id={subLayoutId} />
          </motion.div>
        ) : (
          <div className={`absolute ${w} ${h} rounded-2xl border-2 border-dashed border-purple-700/20`} style={{ transform: "translate(6px,6px)", zIndex: 0 }} />
        )}

        {/* main card */}
        {!isMainPlaced ? (
          <motion.div
            className={`relative ${w} ${h} rounded-2xl border-2 border-dashed border-purple-600/30 flex items-center justify-center z-10`}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <span className="text-purple-500/40 text-xs">선택</span>
          </motion.div>
        ) : (
          <motion.div
            layoutId={mainLayoutId}
            ref={ref}
            className={`relative ${w} ${h} cursor-pointer z-10 rounded-2xl`}
            style={{ perspective: 1000, rotateX: tiltX, rotateY: tiltY }}
            onClick={onFlip}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onFlip()}
            aria-label={`${pos.label} 카드 뒤집기`}
            whileHover={{ scale: isFlipped ? 1.03 : 1.06 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.div
              className="w-full h-full"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.72, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ transformStyle: "preserve-3d", position: "relative" }}
            >
              {/* back face */}
              <div
                className={`absolute inset-0 rounded-2xl overflow-hidden ${GLASS} ${pos.isCenter ? GLOW_CTR : GLOW_PUR} border-purple-500/35`}
                style={{ backfaceVisibility: "hidden" }}
              >
                <CardPatternSvg id={`back_${pos.id}`} />
                {pos.isCenter && (
                  <motion.div className="absolute inset-0" animate={{ opacity: [0.25, 0.6, 0.25] }} transition={{ duration: 2.2, repeat: Infinity }}
                    style={{ background: "radial-gradient(ellipse at center, rgba(232,121,249,0.18) 0%, transparent 65%)" }} />
                )}
                {!isFlipped && (
                  <div className="absolute inset-0 flex items-end justify-center pb-3">
                    <span className="text-[9px] text-purple-300/50 tracking-widest">TAP ✦</span>
                  </div>
                )}
              </div>

              {/* front face */}
              <div
                className={`absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-2 ${GLASS} ${pos.isCenter ? GLOW_CTR : GLOW_GOLD} border-purple-300/35`}
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <span className="text-3xl sm:text-4xl drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]">{pos.icon}</span>
                <span className="text-[10px] sm:text-xs font-bold text-purple-100 tracking-widest uppercase">{pos.label}</span>
                <span className="text-[8px] sm:text-[9px] text-purple-300/70 text-center px-3 leading-snug">{pos.meaning}</span>
                {/* light reflection */}
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    background: useTransform(
                      [shineX, shineY],
                      ([sx, sy]) => `radial-gradient(ellipse 55% 38% at ${sx} ${sy}, rgba(255,255,255,0.2) 0%, transparent 70%)`
                    ),
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>

      <motion.p
        className="text-[8px] sm:text-[9px] text-center text-purple-300/45 leading-tight max-w-[80px]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: arrivalDelay + 0.3 }}
      >
        {pos.meaning}
      </motion.p>
    </motion.div>
  );
}

// --- SHUFFLE STAGE ---

interface ShuffleStageProps {
  deck: DeckCard[];
  drawn: Record<string, number>;
  drawnSub: Record<string, number>;
  nextTarget: string | null;
  onDraw: (deckId: number) => void;
  visualCue: VisualCue | null;
  impactPulse: number;
}

function ShuffleStage({ deck, drawn, drawnSub, nextTarget, onDraw, visualCue, impactPulse }: ShuffleStageProps) {
  const remaining = deck.filter((c) => !Object.values(drawn).includes(c.deckId) && !Object.values(drawnSub).includes(c.deckId));
  const targetPos = POSITIONS.find((p) => p.id === nextTarget || p.id === nextTarget?.replace(SUB_SUFFIX, ""));
  const isSub = nextTarget?.endsWith(SUB_SUFFIX) ?? false;

  return (
    <motion.div
      key="shuffle"
      className="flex flex-col items-center min-h-screen px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center pt-12 pb-4 z-10 relative">
        <p className="text-[10px] tracking-[0.4em] text-purple-400/70 uppercase">Mind Scan Tarot</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
          {!nextTarget ? "✨ 배치 완료 — 전환 중..." : (
            <>
              <span className="text-purple-300">{targetPos?.label}</span>
              <span className="text-white/80 text-base">
                {isSub ? " 포지션 보조 카드" : " 포지션 메인 카드"}를 선택하세요
              </span>
            </>
          )}
        </h2>
        {targetPos && (
          <p className="text-xs text-purple-300/55 mt-1.5">{targetPos.icon} {targetPos.meaning}</p>
        )}
        {/* progress dots */}
        <div className="flex justify-center gap-2 mt-3">
          {POSITIONS.map((p) => {
            const isMain = p.id in drawn;
            const isSub2 = p.id in drawnSub;
            return (
              <div key={p.id} className="flex gap-0.5 items-center">
                <motion.div className="w-2 h-2 rounded-full"
                  animate={{ backgroundColor: isMain ? "rgb(168,85,247)" : nextTarget === p.id ? "rgb(232,121,249)" : "rgba(168,85,247,0.2)", scale: nextTarget === p.id ? 1.4 : 1 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.div className="w-1.5 h-1.5 rounded-full"
                  animate={{ backgroundColor: isSub2 ? "rgb(139,92,246)" : nextTarget === p.id + SUB_SUFFIX ? "rgb(196,181,253)" : "rgba(139,92,246,0.2)" }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* FAN DECK */}
      <div className="relative flex-1 w-full flex items-end justify-center" style={{ minHeight: 240, maxHeight: 320 }}>
        <div className="relative w-full" style={{ height: 200 }}>
          {remaining.map((card) => (
            <FanCard
              key={card.deckId}
              index={card.deckId}
              total={78}
              layoutId={`card_${card.deckId}`}
              onSelect={() => onDraw(card.deckId)}
            />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-purple-400/35 tracking-widest pb-8 relative z-10">
        ✦ 남은 카드 {remaining.length}장 ✦
      </p>

      <AnimatePresence>
        {visualCue ? (
          <motion.div
            key={visualCue.id}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full border border-white/20 bg-black/45 text-purple-100 text-xs tracking-[0.25em] z-30"
            initial={{ opacity: 0, y: 22, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.92 }}
            transition={{ duration: 0.28 }}
          >
            {visualCue.label}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        key={`impact_${impactPulse}`}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 pointer-events-none z-20"
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.1, 1.4], opacity: [0, 0.36, 0] }}
        transition={{ duration: 0.45 }}
      >
        <div className="w-20 h-20 rounded-full border border-purple-300/45" />
      </motion.div>
    </motion.div>
  );
}

// --- SPREAD VIEW ---

interface SpreadViewProps {
  drawn: Record<string, number>;
  drawnSub: Record<string, number>;
  flipped: Set<string>;
  onFlip: (id: string) => void;
  onGenerateReading: () => void;
  reading: ReadingResult | null;
  readingLoading: boolean;
  readingError: string;
  paymentError: string;
  paymentDone: boolean;
  visualCue: VisualCue | null;
  onSaveImage: () => void;
  onSavePdf: () => void;
  onShare: () => void;
  onCopyText: () => void;
  shareMessage: string;
  reportRef: React.RefObject<HTMLDivElement>;
}

function SpreadView({ drawn, drawnSub, flipped, onFlip, onGenerateReading, reading, readingLoading, readingError, paymentError, paymentDone, visualCue, onSaveImage, onSavePdf, onShare, onCopyText, shareMessage, reportRef }: SpreadViewProps) {
  const allFlipped = POSITIONS.every((p) => flipped.has(p.id));
  return (
    <motion.div
      key="spread"
      className="flex flex-col items-center justify-center min-h-screen px-4 py-10"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-6">
        <p className="text-[10px] tracking-[0.4em] text-purple-400/70 uppercase">Mind Scan</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
          상대방의 <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">속마음</span>을 열어보세요
        </h2>
        <p className="text-xs text-purple-300/50 mt-1.5">카드를 클릭하면 뒤집힙니다</p>
      </div>

      {/* Desktop grid */}
      <div className="hidden sm:grid gap-5 mb-8" style={{ gridTemplateColumns: "repeat(3,auto)", gridTemplateRows: "repeat(3,auto)" }}>
        {POSITIONS.map((pos, i) => (
          <PlacedCard key={pos.id} pos={pos}
            mainLayoutId={`card_${drawn[pos.id] ?? -1}`}
            subLayoutId={`card_${drawnSub[pos.id] ?? -99}`}
            isFlipped={flipped.has(pos.id)}
            isMainPlaced={pos.id in drawn}
            isSubPlaced={pos.id in drawnSub}
            onFlip={() => onFlip(pos.id)}
            arrivalDelay={i * 0.08}
          />
        ))}
      </div>

      {/* Mobile stack */}
      <div className="flex sm:hidden flex-col items-center gap-4 mb-8 w-full max-w-xs">
        {["top", "center", "left", "right", "bottom"].map((id, i) => {
          const pos = POSITIONS.find((p) => p.id === id)!;
          return (
            <PlacedCard key={pos.id} pos={pos}
              mainLayoutId={`card_${drawn[pos.id] ?? -1}`}
              subLayoutId={`card_${drawnSub[pos.id] ?? -99}`}
              isFlipped={flipped.has(pos.id)}
              isMainPlaced={pos.id in drawn}
              isSubPlaced={pos.id in drawnSub}
              onFlip={() => onFlip(pos.id)}
              arrivalDelay={i * 0.08}
            />
          );
        })}
      </div>

      <div className={`${GLASS} px-5 py-2.5 flex items-center gap-3`}>
        <div className="flex gap-1.5">
          {POSITIONS.map((p) => (
            <motion.div key={p.id} className="w-2 h-2 rounded-full"
              animate={{ backgroundColor: flipped.has(p.id) ? "rgb(168,85,247)" : "rgba(168,85,247,0.2)" }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
        <span className="text-[11px] text-purple-300/60">{flipped.size} / {POSITIONS.length} 오픈</span>
      </div>

      <AnimatePresence>
        {allFlipped && (
          <motion.div
            className={`mt-6 ${GLASS} ${GLOW_PUR} px-8 py-5 text-center max-w-sm`}
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
          >
            <p className="text-base font-bold text-white mb-1">✨ 모든 속마음이 열렸어요</p>
            <p className="text-xs text-purple-300/70 leading-relaxed">
              10장의 카드가 상대방의 진심을 모두 드러냈습니다.<br />
              이제 심층 리딩을 생성해 보세요.
            </p>
            <button
              type="button"
              className="mt-4 rounded-full px-5 py-2 text-xs font-bold tracking-wider bg-purple-600 hover:bg-purple-500 transition-colors disabled:opacity-60"
              onClick={onGenerateReading}
              disabled={readingLoading}
            >
              {readingLoading ? "리딩 생성 중..." : paymentDone ? "심층 해석 다시 생성" : `대한민국 최고 타로 마스터 해석 받기 (${MINDSCAN_READING_COST}코인)`}
            </button>
            <p className="mt-2 text-[11px] text-amber-200/80">최초 해석 생성 시 {MINDSCAN_READING_COST}코인이 차감됩니다.</p>
            {paymentError ? (
              <p className="mt-2 text-[11px] text-rose-300/90">{paymentError}</p>
            ) : null}
            {readingError ? (
              <p className="mt-3 text-[11px] text-rose-300/85">{readingError}</p>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {reading ? (
        <motion.section
          ref={reportRef}
          className={`mt-8 w-full max-w-5xl ${GLASS} p-5 sm:p-7`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h3 className="text-lg sm:text-xl font-bold text-white">최종 심층 타로 리딩</h3>
            <span className="text-[11px] text-purple-300/65">
              소스: {reading.source === "gemini" ? "Gemini API" : "Local Deep Engine"}
            </span>
          </div>

          <p className="text-sm sm:text-[15px] text-purple-100/85 leading-relaxed whitespace-pre-wrap">
            {reading.intro}
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={onSaveImage}
              className="rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide border border-emerald-300/35 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 transition-colors"
            >
              결과 이미지 저장
            </button>
            <button
              type="button"
              onClick={onSavePdf}
              className="rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide border border-sky-300/35 bg-sky-500/15 hover:bg-sky-500/25 text-sky-100 transition-colors"
            >
              PDF 저장
            </button>
            <button
              type="button"
              onClick={onShare}
              className="rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide border border-fuchsia-300/35 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-100 transition-colors"
            >
              공유하기
            </button>
            <button
              type="button"
              onClick={onCopyText}
              className="rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide border border-amber-300/35 bg-amber-500/15 hover:bg-amber-500/25 text-amber-100 transition-colors"
            >
              텍스트 복사
            </button>
          </div>
          {shareMessage ? <p className="mt-2 text-xs text-purple-200/75">{shareMessage}</p> : null}

          <div className="mt-6 space-y-5">
            {reading.sections.map((section) => (
              <article key={section.slot} className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <h4 className="text-base sm:text-lg font-semibold text-purple-100">
                  {section.slot}번 구역. {section.title}
                </h4>
                {(section.mainCardName || section.subCardName) && (
                  <p className="mt-1 text-xs text-purple-300/75">
                    메인: {section.mainCardName || "-"} / 보조: {section.subCardName || "-"}
                  </p>
                )}
                <p className="mt-3 text-sm sm:text-[15px] text-purple-100/90 leading-8 whitespace-pre-wrap">
                  {section.content}
                </p>
              </article>
            ))}
          </div>

          {reading.masterAdvice ? (
            <article className="mt-7 rounded-2xl border border-purple-200/25 bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-transparent p-5 sm:p-6">
              <h4 className="text-base sm:text-lg font-semibold text-purple-100">마스터의 조언</h4>
              <p className="mt-3 text-sm sm:text-[15px] text-purple-50/90 leading-8 whitespace-pre-wrap">
                {reading.masterAdvice}
              </p>
            </article>
          ) : null}

          <p className="mt-6 text-sm sm:text-[15px] text-purple-100/85 leading-relaxed whitespace-pre-wrap">
            {reading.closing}
          </p>
        </motion.section>
      ) : null}

      <AnimatePresence>
        {visualCue ? (
          <motion.div
            key={`spread_cue_${visualCue.id}`}
            className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border border-white/20 bg-black/40 text-purple-100 text-[11px] tracking-[0.25em] z-30"
            initial={{ opacity: 0, y: -12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ duration: 0.26 }}
          >
            {visualCue.label}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

// --- INTRO ---

function IntroStage({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      key="intro"
      className="flex flex-col items-center justify-center min-h-screen px-6 py-16 text-center"
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className={`relative w-48 h-48 sm:w-60 sm:h-60 rounded-3xl overflow-hidden mb-8 ${GLASS} ${GLOW_CTR}`}
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/fuctionassets/mindscantaro.webp" alt="속마음 알아보기 타로" className="w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e2a]/70 via-transparent to-transparent" />
        <motion.div
          className="absolute inset-0 rounded-3xl border-2 border-purple-400/40"
          animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.8, repeat: Infinity }}
        />
      </motion.div>

      <motion.div className="mb-5 space-y-1.5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}>
        <p className="text-[10px] tracking-[0.45em] text-purple-400/80 uppercase">Mind Scan Tarot</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
          상대방의 정확한<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-purple-400">속마음 알아보기</span>
        </h1>
        <p className="text-sm text-purple-200/65 mt-2 leading-relaxed max-w-sm mx-auto">
          78장 덱에서 직접 카드를 골라 십자 스프레드를 완성하고<br />상대방의 진짜 감정을 읽어보세요
        </p>
      </motion.div>

      <motion.div
        className={`w-full max-w-sm ${GLASS} p-5 mb-8 text-left space-y-2.5`}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
      >
        <p className="text-[10px] font-bold tracking-widest text-purple-300/75 uppercase mb-2.5">10 Card Cross Spread</p>
        {POSITIONS.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <span className="text-base w-5 text-center">{p.icon}</span>
            <div>
              <span className="text-xs font-semibold text-purple-200">{p.label} — </span>
              <span className="text-xs text-purple-300/65">{p.meaning}</span>
            </div>
          </div>
        ))}
        <p className="text-[9px] text-purple-400/45 pt-2 border-t border-white/5">각 포지션 메인+보조  총 10장</p>
      </motion.div>

      <motion.button
        onClick={onStart}
        className={`relative px-10 py-4 rounded-full text-white font-bold text-sm tracking-widest uppercase overflow-hidden cursor-pointer ${GLOW_PUR}`}
        style={{ background: "linear-gradient(135deg,#7c3aed 0%,#a855f7 50%,#6d28d9 100%)" }}
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.55 }}
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}
      >
        <motion.span
          className="absolute inset-0 rounded-full"
          animate={{ opacity: [0, 0.35, 0] }} transition={{ duration: 2.2, repeat: Infinity }}
          style={{ background: "radial-gradient(ellipse at center,rgba(232,121,249,0.55) 0%,transparent 70%)" }}
        />
        <span className="relative z-10">🔮 카드 셔플 시작</span>
      </motion.button>

      <motion.p className="text-[10px] text-purple-400/35 mt-4 tracking-widest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}>
        ✦ 상대방을 생각하며 마음을 집중하세요 ✦
      </motion.p>
    </motion.div>
  );
}

// --- MAIN ---

export default function MindScanTarot() {
  const [stage, setStage] = useState<Stage>("intro");
  const [deck] = useState<DeckCard[]>(() => Array.from({ length: 78 }, (_, i) => ({ deckId: i, posId: null })));
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
  const [impactPulse, setImpactPulse] = useState(0);
  const [shareMessage, setShareMessage] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  const nextTarget = useCallback((): string | null => {
    for (const p of POSITIONS) {
      if (!(p.id in drawn)) return p.id;
      if (!(p.id in drawnSub)) return p.id + SUB_SUFFIX;
    }
    return null;
  }, [drawn, drawnSub]);

  const handleDraw = useCallback((deckId: number) => {
    if (usedIds.has(deckId)) return;
    const target = nextTarget();
    if (!target) return;
    const now = Date.now();
    setVisualCue({ id: now, kind: "swish", label: "슥 - 카드 스치기" });
    window.setTimeout(() => {
      setVisualCue({ id: now + 1, kind: "thud", label: "툭 - 슬롯 안착" });
      setImpactPulse((prev) => prev + 1);
    }, 250);
    window.setTimeout(() => setVisualCue(null), 780);

    const newUsed = new Set([...usedIds, deckId]);
    setUsedIds(newUsed);

    if (target.endsWith(SUB_SUFFIX)) {
      const posId = target.replace(SUB_SUFFIX, "");
      const newSub = { ...drawnSub, [posId]: deckId };
      setDrawnSub(newSub);
      if (Object.keys(drawn).length === POSITIONS.length && Object.keys(newSub).length === POSITIONS.length) {
        setTimeout(() => setStage("spread"), 600);
      }
    } else {
      setDrawn((prev) => ({ ...prev, [target]: deckId }));
    }
  }, [usedIds, nextTarget, drawn, drawnSub]);

  const handleFlip = useCallback((id: string) => {
    setFlipped((prev) => new Set([...prev, id]));
  }, []);

  const handleGenerateReading = useCallback(async () => {
    if (readingLoading) return;
    const allFlipped = POSITIONS.every((p) => flipped.has(p.id));
    if (!allFlipped) {
      setReadingError("모든 카드를 먼저 뒤집어 주세요.");
      return;
    }

    const payloadPairs = POSITIONS.map((pos, idx) => ({
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
          setPaymentError("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
          window.setTimeout(() => {
            window.location.href = "/login?next=%2Ftarot%2Fmindscan";
          }, 700);
          return;
        }

        const consumeRes = await fetch("/api/fortune/pig-coin/consume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cost: MINDSCAN_READING_COST,
            reason: "mindscan 타로 심층 해석",
            featureKey: "tarot-mindscan-reading",
          }),
        });
        const consumeData = await consumeRes.json().catch(() => ({}));

        if (consumeRes.status === 402) {
          setPaymentError(`코인이 부족합니다. ${MINDSCAN_READING_COST}코인이 필요합니다.`);
          return;
        }
        if (!consumeRes.ok) {
          setPaymentError(String(consumeData?.message || "코인 차감에 실패했습니다."));
          return;
        }
        setPaymentDone(true);
      }

      const response = await fetch("/api/tarot/mindscan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairs: payloadPairs }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(data?.error || `해석 요청 실패 (${response.status})`));
      }
      if (!data || !Array.isArray(data.sections)) {
        throw new Error("해석 결과 형식이 올바르지 않습니다.");
      }
      setReading(data as ReadingResult);
    } catch (error) {
      setReadingError(error instanceof Error ? error.message : "해석 생성 중 오류가 발생했습니다.");
    } finally {
      setReadingLoading(false);
    }
  }, [drawn, drawnSub, flipped, paymentDone, readingLoading]);

  const handleSaveImage = useCallback(async () => {
    if (!reading || !reportRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#0b0b1f",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `mindscan-reading-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setShareMessage("이미지로 저장되었습니다.");
    } catch {
      setShareMessage("이미지 저장에 실패했습니다. 다시 시도해 주세요.");
    }
  }, [reading]);

  const handleSavePdf = useCallback(() => {
    if (!reading || !reportRef.current) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=980,height=720");
    if (!win) {
      setShareMessage("팝업이 차단되어 PDF 저장 창을 열 수 없습니다.");
      return;
    }
    const html = reportRef.current.innerHTML;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>MindScan Tarot Report</title><style>body{font-family: 'Noto Sans KR',sans-serif;background:#0b0b1f;color:#f5f3ff;padding:28px;line-height:1.8}h3,h4{margin:0 0 12px}article{margin:0 0 16px;padding:14px;border:1px solid rgba(255,255,255,.15);border-radius:14px;background:rgba(255,255,255,.04)}@media print{body{padding:0;background:#fff;color:#111}article{background:#fff;color:#111;border-color:#ddd}}</style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    setShareMessage("PDF 인쇄 창을 열었습니다.");
  }, [reading]);

  const handleShare = useCallback(async () => {
    if (!reading) return;
    const text = buildReadingPlainText(reading);
    if (navigator.share) {
      try {
        await navigator.share({
          title: "상대방 속마음 타로 리딩",
          text: text.slice(0, 4000),
        });
        setShareMessage("공유가 완료되었습니다.");
        return;
      } catch {
        // 공유 취소 포함 fallback 진행
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareMessage("공유 API를 사용할 수 없어, 결과 텍스트를 복사했습니다.");
    } catch {
      setShareMessage("공유/복사에 실패했습니다.");
    }
  }, [reading]);

  const handleCopyText = useCallback(async () => {
    if (!reading) return;
    try {
      await navigator.clipboard.writeText(buildReadingPlainText(reading));
      setShareMessage("해석 텍스트를 클립보드에 복사했습니다.");
    } catch {
      setShareMessage("클립보드 복사에 실패했습니다.");
    }
  }, [reading]);

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,#060918 0%,#0d0b2a 40%,#140827 70%,#06091a 100%)" }}
    >
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true"
        style={{ background: "radial-gradient(ellipse 80% 55% at 50% 15%,rgba(109,40,217,0.13) 0%,transparent 60%)" }}
      />
      <StarField />
      <LayoutGroup>
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {stage === "intro" && <IntroStage key="intro" onStart={() => setStage("shuffle")} />}
            {stage === "shuffle" && (
              <ShuffleStage
                key="shuffle"
                deck={deck}
                drawn={drawn}
                drawnSub={drawnSub}
                nextTarget={nextTarget()}
                onDraw={handleDraw}
                visualCue={visualCue}
                impactPulse={impactPulse}
              />
            )}
            {stage === "spread" && (
              <SpreadView
                key="spread"
                drawn={drawn}
                drawnSub={drawnSub}
                flipped={flipped}
                onFlip={handleFlip}
                onGenerateReading={handleGenerateReading}
                reading={reading}
                readingLoading={readingLoading}
                readingError={readingError}
                paymentError={paymentError}
                paymentDone={paymentDone}
                visualCue={visualCue}
                onSaveImage={handleSaveImage}
                onSavePdf={handleSavePdf}
                onShare={handleShare}
                onCopyText={handleCopyText}
                shareMessage={shareMessage}
                reportRef={reportRef}
              />
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </div>
  );
}