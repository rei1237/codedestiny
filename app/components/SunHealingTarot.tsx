"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Footprints,
  HeartHandshake,
  Lightbulb,
  Loader2,
  RotateCcw,
  Share2,
  Sparkles,
  Telescope,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Design Token ───────────────────────────────────────────────────────────
// Primary:  #FFB800 (Golden Hour)   Background: #0A0E1A (Deep Navy)
// Accent:   #FF8C00 (Deep Gold)     Glass:      rgba(255,255,255,0.06)
// ─────────────────────────────────────────────────────────────────────────────

type TarotOrientation = "upright" | "reversed";

type TarotCardDto = {
  cardId: string;
  name?: string;
  nameKr?: string;
  position?: string;
  orientation?: TarotOrientation | string;
  imageUrl?: string;
  proxyImageUrl?: string;
  localImageUrl?: string;
};

type HealingReadingDto = {
  opening?: string;
  hiddenTruth?: string;
  embracePain?: string;
  silverLining?: string;
  stepForward?: string;
  integrationMessage?: string;
  actionPlan?: string[];
};

type Stage = "intro" | "spread" | "result";

type SectionTone = "neutral" | "warm" | "focus";

type ReadingSection = {
  key: keyof HealingReadingDto;
  title: string;
  tone: SectionTone;
  icon: React.ComponentType<{ className?: string }>;
};

const SPREAD_TYPE = "healing_rising_four_card" as const;
const SPREAD_CARD_COUNT = 4 as const;
const CHAR_DELAY_MS = 11;
const SECTION_GAP_MS = 800;
const INITIAL_TEXT_BURST_CHARS = 34;

const SHARE_FALLBACK_URL = "https://code-destiny.com";
const SHARE_TITLE = "태양 회복 타로";
const SHARE_TEXT_PREFIX = "태양 회복 타로 결과를 공유합니다.\n\n";

const READING_SECTIONS: ReadingSection[] = [
  { key: "opening", title: "상담 시작 안내", tone: "neutral", icon: Sparkles },
  { key: "hiddenTruth", title: "1. 마음 깊은 원인", tone: "focus", icon: Telescope },
  { key: "embracePain", title: "2. 감정 수용", tone: "warm", icon: HeartHandshake },
  { key: "silverLining", title: "3. 회복의 단서", tone: "focus", icon: Lightbulb },
  { key: "stepForward", title: "4. 다음 행동", tone: "warm", icon: Footprints },
  { key: "integrationMessage", title: "통합 메시지", tone: "neutral", icon: Sparkles },
  { key: "actionPlan", title: "오늘의 실행 계획", tone: "focus", icon: Sparkles },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function safeCardTitle(card?: TarotCardDto, idx?: number) {
  const base = (card?.nameKr || card?.name || "").trim();
  if (!base) return `카드 ${typeof idx === "number" ? idx + 1 : ""}`.trim();
  const isRev = String(card?.orientation || "").toLowerCase() === "reversed";
  return isRev ? `${base} (역방향)` : `${base} (정방향)`;
}

function cardImageUrl(card?: TarotCardDto) {
  const local = String(card?.localImageUrl || "").trim();
  if (local) return local;

  const proxy = String(card?.proxyImageUrl || "").trim();
  if (proxy) return proxy;

  const cardId = String(card?.cardId || "").trim();
  if (!cardId) return "";
  return `/api/tarot/card-image/${encodeURIComponent(cardId)}`;
}

// ─── SunHero (Pulsing Sun Animation) ─────────────────────────────────────────
function SunHero() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {/* Outermost ambient ring */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 220, height: 220, background: "radial-gradient(circle, #FFB80018 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Mid ring */}
      <motion.div
        className="absolute rounded-full border border-[#FFB800]/20"
        style={{ width: 168, height: 168 }}
        animate={{ scale: [1.02, 1.1, 1.02], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />
      {/* Inner ring */}
      <motion.div
        className="absolute rounded-full border border-[#FFB800]/35"
        style={{ width: 110, height: 110 }}
        animate={{ scale: [1, 1.07, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
      {/* Rotating sun SVG */}
      <motion.svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="relative z-10"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <rect
            key={i}
            x="48"
            y="5"
            width="4"
            height="11"
            rx="2"
            fill="#FFB800"
            opacity={i % 2 === 0 ? "0.9" : "0.45"}
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
        <circle cx="50" cy="50" r="21" fill="#FFB800" opacity="0.15" />
        <circle cx="50" cy="50" r="18" fill="#FFB800" />
        <circle cx="50" cy="50" r="13" fill="#FFCC00" />
        <circle cx="50" cy="50" r="7" fill="#FFE566" />
      </motion.svg>
    </div>
  );
}

// ─── CardBackFace (Solar Symbol) ──────────────────────────────────────────────
function CardBackFace() {
  return (
    <div
      className="absolute inset-0 rounded-xl flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0F1830 0%, #0A0E1A 100%)" }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 opacity-25"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, #FFB80033 0%, transparent 70%)" }}
      />
      {/* Corner ornaments */}
      {[["top-2","left-2","border-t","border-l","rounded-tl"],["top-2","right-2","border-t","border-r","rounded-tr"],["bottom-2","left-2","border-b","border-l","rounded-bl"],["bottom-2","right-2","border-b","border-r","rounded-br"]].map((cls, i) => (
        <div key={i} className={`absolute w-4 h-4 border-[#FFB800]/40 ${cls.join(" ")}`} />
      ))}
      {/* Solar mandala SVG */}
      <svg width="64" height="64" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: 16 }).map((_, i) => (
          <rect
            key={i}
            x="48.5"
            y="7"
            width="3"
            height={i % 2 === 0 ? "10" : "7"}
            rx="1.5"
            fill="#FFB800"
            opacity={i % 2 === 0 ? "0.7" : "0.35"}
            transform={`rotate(${i * 22.5} 50 50)`}
          />
        ))}
        <circle cx="50" cy="50" r="22" fill="none" stroke="#FFB800" strokeWidth="0.8" opacity="0.3" />
        <circle cx="50" cy="50" r="16" fill="none" stroke="#FFB800" strokeWidth="0.8" opacity="0.5" />
        <circle cx="50" cy="50" r="11" fill="#FFB800" opacity="0.75" />
        <circle cx="50" cy="50" r="6" fill="#FFE566" opacity="0.9" />
      </svg>
      <p className="mt-2 text-[8px] tracking-[0.25em] text-[#FFB800]/50 font-light uppercase">Healing Tarot</p>
    </div>
  );
}

// ─── ReadingCard (Glassmorphism / Dark Theme) ─────────────────────────────────
function ReadingCard({
  title,
  tone,
  icon: Icon,
  text,
  isTyping,
}: {
  title: string;
  tone: SectionTone;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  isTyping?: boolean;
}) {
  const borderC =
    tone === "warm" ? "border-[#FFB800]/30" : tone === "focus" ? "border-amber-400/25" : "border-white/12";
  const bg =
    tone === "warm"
      ? "rgba(255,184,0,0.07)"
      : tone === "focus"
        ? "rgba(255,200,50,0.06)"
        : "rgba(255,255,255,0.04)";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38 }}
      className={`rounded-2xl border p-5 backdrop-blur-sm ${borderC}`}
      style={{ background: bg }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-[#FFB800]/30 bg-[#FFB800]/10">
          <Icon className="h-4 w-4 text-[#FFB800]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-[15px] font-semibold tracking-tight text-[#FFE566]">{title}</h3>
            {isTyping ? (
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-[#FFB800]"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            ) : null}
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-white/78">{text}</p>
        </div>
      </div>
    </motion.section>
  );
}

export default function SunHealingTarot() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [cards, setCards] = useState<TarotCardDto[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<HealingReadingDto | null>(null);
  const [tapToReveal, setTapToReveal] = useState(true);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [typingSection, setTypingSection] = useState<string | null>(null);
  const [glowingCard, setGlowingCard] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const progressPct = useMemo(
    () => clamp((revealedCount / SPREAD_CARD_COUNT) * 100, 0, 100),
    [revealedCount],
  );

  const goHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const start = useCallback(async () => {
    setLoading(true);
    setReading(null);
    setTapToReveal(true);
    setTyped({});
    setTypingSection(null);
    setRevealedCount(0);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/tarot/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadType: SPREAD_TYPE }),
        signal: ac.signal,
      });

      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "draw failed");
      }

      const drawn = Array.isArray(data?.cards) ? (data.cards as TarotCardDto[]) : [];
      setCards(drawn.slice(0, SPREAD_CARD_COUNT));
      setStage("spread");
    } catch (error) {
      console.error(error);
      alert("카드를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  const canFlip = useCallback(
    (idx: number) => idx === revealedCount && idx < SPREAD_CARD_COUNT && stage === "spread" && !loading,
    [loading, revealedCount, stage],
  );

  const flip = useCallback(
    (idx: number) => {
      if (!canFlip(idx)) return;
      setGlowingCard(idx);
      setRevealedCount((v) => v + 1);
      setTimeout(() => setGlowingCard(null), 1000);
    },
    [canFlip],
  );

  const fetchReading = useCallback(async () => {
    if (revealedCount < SPREAD_CARD_COUNT || cards.length !== SPREAD_CARD_COUNT) return;

    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const payloadCards = cards.map((c) => ({
        cardId: c.cardId,
        position: c.position,
        orientation: c.orientation,
      }));

      const res = await fetch("/api/tarot/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "healing", spreadType: SPREAD_TYPE, cards: payloadCards }),
        signal: ac.signal,
      });

      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "reading failed");
      }

      setReading((data?.reading || null) as HealingReadingDto | null);
      setStage("result");
      setTapToReveal(true);
      setTyped({});
      setTypingSection(null);
    } catch (error) {
      console.error(error);
      alert("해석을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [cards, revealedCount]);

  const share = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : SHARE_FALLBACK_URL;
    const text = `${SHARE_TEXT_PREFIX}${url}`;

    try {
      const nav = navigator as Navigator & { share?: (data: object) => Promise<void> };
      if (nav.share) {
        await nav.share({ title: SHARE_TITLE, text, url });
        return;
      }
    } catch {
      // no-op
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("링크를 복사했습니다.");
    } catch {
      alert("공유를 지원하지 않는 환경입니다.");
    }
  }, []);

  useEffect(() => {
    if (!reading || tapToReveal || stage !== "result") return;

    let cancelled = false;

    async function typeInto(key: string, title: string, text: string) {
      setTypingSection(title);
      const initial = text.slice(0, INITIAL_TEXT_BURST_CHARS);
      setTyped((prev) => ({ ...prev, [key]: initial }));

      for (let i = initial.length; i < text.length; i += 1) {
        if (cancelled) return;
        setTyped((prev) => ({ ...prev, [key]: (prev[key] || "") + text[i] }));
        // eslint-disable-next-line no-await-in-loop
        await sleep(CHAR_DELAY_MS);
      }

      setTypingSection(null);
    }

    (async () => {
      for (let i = 0; i < READING_SECTIONS.length; i += 1) {
        if (cancelled) return;

        const section = READING_SECTIONS[i];
        const raw = reading[section.key];
        const text = Array.isArray(raw)
          ? raw.map((v) => `• ${v}`).join("\n")
          : String(raw || "").trim();

        if (!text) continue;

        // eslint-disable-next-line no-await-in-loop
        await typeInto(String(section.key), section.title, text);

        if (i < READING_SECTIONS.length - 1) {
          // eslint-disable-next-line no-await-in-loop
          await sleep(SECTION_GAP_MS);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reading, stage, tapToReveal]);

  const POSITION_LABELS = ["마음 깊은 원인", "감정 수용", "회복의 단서", "다음 행동"] as const;
  const POSITION_LABELS_SHORT = ["원인", "수용", "회복", "행동"] as const;

  return (
    <main
      className="min-h-[100dvh] overflow-x-hidden px-4 py-8 text-white"
      style={{ background: "linear-gradient(180deg, #0A0E1A 0%, #0F1628 45%, #0A0E1A 100%)" }}
    >
      {/* ── 배경 환경광 ── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 35% at 50% 0%, #FFB80028 0%, transparent 65%)",
          zIndex: 0,
        }}
      />
      <div
        className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 blur-[80px] opacity-15"
        style={{ width: 300, height: 200, background: "#FFB800", borderRadius: "50%", zIndex: 0 }}
      />

      {/* ── 컨텐츠 래퍼 ── */}
      <div className="relative z-10 mx-auto w-full max-w-[600px]">

        {/* 헤더 */}
        <header className="mb-8 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.24em] text-[#FFB800]/60 uppercase">
              Healing Tarot Session
            </p>
            <h1 className="mt-1.5 font-serif text-[26px] font-semibold leading-tight text-white">
              태양 회복 타로
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-white/50">
              심리상담가의 시선으로 마음의 패턴을 읽고, 오늘 실행 가능한 회복 행동까지 안내합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={goHome}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-xs font-medium text-white/60 backdrop-blur hover:bg-white/10 hover:text-white/80 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            홈
          </button>
        </header>

        <AnimatePresence mode="wait">

          {/* ══════════ INTRO ══════════ */}
          {stage === "intro" ? (
            <motion.section
              key="intro"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.42 }}
              className="space-y-7"
            >
              {/* Hero Sun */}
              <div className="flex justify-center py-4">
                <SunHero />
              </div>

              {/* Intro card */}
              <div
                className="rounded-2xl border border-[#FFB800]/22 p-6 backdrop-blur-sm"
                style={{ background: "linear-gradient(135deg, rgba(255,184,0,0.09) 0%, rgba(255,140,0,0.04) 100%)" }}
              >
                <h2 className="font-serif text-xl font-semibold text-white/95">
                  마음을 열어볼 준비가 되셨나요?
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  4장의 카드를 순서대로 열면, 원인 파악부터 실행 계획까지<br className="hidden sm:block" />
                  태양의 따스한 빛으로 당신의 내면을 비춥니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["원인 파악", "감정 수용", "회복 단서", "실행 계획"].map((label, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-[#FFB800]/22 bg-[#FFB800]/8 px-3 py-1 text-xs text-[#FFB800]/75"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={start}
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-2xl py-4 text-sm font-bold text-[#0A0E1A] shadow-lg shadow-[#FFB80030] disabled:opacity-50 transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #FFB800 0%, #FF8C00 100%)" }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-25 transition-opacity duration-300"
                  style={{ background: "radial-gradient(circle at 50% 50%, #fff, transparent 60%)" }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? "준비 중…" : "리딩 시작하기"}
                </span>
              </button>
            </motion.section>
          ) : null}

          {/* ══════════ SPREAD ══════════ */}
          {stage === "spread" ? (
            <motion.section
              key="spread"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.42 }}
              className="space-y-5"
            >
              {/* Progress bar */}
              <div
                className="rounded-2xl border border-white/10 p-4 backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-base font-semibold text-white/90">
                    순서대로 카드를 열어보세요
                  </h2>
                  <span className="text-xs font-medium text-[#FFB800]/80">
                    {revealedCount}&thinsp;/&thinsp;{SPREAD_CARD_COUNT}
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #FFB800 0%, #FF8C00 100%)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Card grid */}
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: SPREAD_CARD_COUNT }).map((_, idx) => {
                  const card = cards[idx];
                  const isFlipped = idx < revealedCount;
                  const enabled = canFlip(idx);
                  const isGlowing = glowingCard === idx;

                  return (
                    <div key={idx} style={{ perspective: "1200px" }} className="relative aspect-[3/4]">

                      {/* Flip burst glow */}
                      <AnimatePresence>
                        {isGlowing && (
                          <motion.div
                            initial={{ opacity: 0.75, scale: 0.95 }}
                            animate={{ opacity: 0, scale: 1.25 }}
                            exit={{}}
                            transition={{ duration: 0.85, ease: "easeOut" }}
                            className="absolute inset-0 rounded-xl blur-2xl pointer-events-none"
                            style={{ background: "#FFB800", zIndex: 30 }}
                          />
                        )}
                      </AnimatePresence>

                      <motion.button
                        type="button"
                        onClick={() => flip(idx)}
                        disabled={!enabled}
                        whileHover={
                          enabled
                            ? {
                                y: -7,
                                filter: "drop-shadow(0 0 20px rgba(255,184,0,0.55))",
                              }
                            : undefined
                        }
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        className="relative w-full h-full rounded-xl"
                        style={{ transformStyle: "preserve-3d" }}
                      >
                        <motion.div
                          className="absolute inset-0"
                          style={{ transformStyle: "preserve-3d" }}
                          animate={{ rotateY: isFlipped ? 180 : 0 }}
                          transition={{ duration: 0.72, ease: [0.35, 0, 0.15, 1] }}
                        >
                          {/* ── 카드 뒷면 (태양 문양) ── */}
                          <div className="absolute inset-0 rounded-xl" style={{ backfaceVisibility: "hidden" }}>
                            <CardBackFace />
                            {enabled && (
                              <motion.div
                                className="absolute inset-0 rounded-xl ring-1 ring-[#FFB800]/55"
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            )}
                            {enabled && (
                              <p className="absolute inset-x-0 bottom-7 text-center text-[9px] tracking-[0.2em] text-[#FFB800]/60 uppercase">
                                탭하여 열기
                              </p>
                            )}
                          </div>

                          {/* ── 카드 앞면 (타로 이미지) ── */}
                          <div
                            className="absolute inset-0 rounded-xl overflow-hidden"
                            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                          >
                            {card?.cardId ? (
                              <Image
                                src={cardImageUrl(card)}
                                alt={safeCardTitle(card, idx)}
                                fill
                                sizes="(max-width: 768px) 45vw, 260px"
                                className="object-cover"
                                unoptimized
                                priority
                              />
                            ) : (
                              <div className="absolute inset-0 bg-[#0F1525]" />
                            )}
                            {/* Gradient overlay + labels */}
                            <div
                              className="absolute inset-x-0 bottom-0 px-2 pt-8 pb-2"
                              style={{
                                background: "linear-gradient(0deg, rgba(10,14,26,0.95) 0%, transparent 100%)",
                              }}
                            >
                              <p className="text-[9px] font-medium text-[#FFB800]/75 tracking-widest uppercase">
                                {POSITION_LABELS[idx]}
                              </p>
                              <p className="mt-0.5 text-[11px] font-semibold text-white/90 leading-tight">
                                {safeCardTitle(card, idx)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      </motion.button>
                    </div>
                  );
                })}
              </div>

              {/* Interpret CTA */}
              <button
                type="button"
                onClick={fetchReading}
                disabled={loading || revealedCount < SPREAD_CARD_COUNT}
                className="group relative w-full overflow-hidden rounded-2xl py-4 text-sm font-bold text-[#0A0E1A] shadow-lg shadow-[#FFB80020] disabled:opacity-35 transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #FFB800 0%, #FF8C00 100%)" }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-25 transition-opacity duration-300"
                  style={{ background: "radial-gradient(circle at 50% 50%, #fff, transparent 60%)" }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? "해석 중…" : "카드 해석받기"}
                </span>
              </button>
            </motion.section>
          ) : null}

          {/* ══════════ RESULT ══════════ */}
          {stage === "result" ? (
            <motion.section
              key="result"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.42 }}
              className="space-y-5"
            >
              {/* Result header */}
              <div
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#FFB800]/22 p-5 backdrop-blur-sm"
                style={{ background: "rgba(255,184,0,0.07)" }}
              >
                <div>
                  <h2 className="font-serif text-lg font-semibold text-white/95">상담 리딩 결과</h2>
                  <p className="mt-1 text-xs text-white/45">천천히 읽고, 한 가지 행동부터 실행해 보세요.</p>
                </div>
                <button
                  type="button"
                  onClick={share}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-xs font-medium text-white/65 hover:bg-white/10 transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  공유
                </button>
              </div>

              {/* Card thumbnails */}
              {cards.length > 0 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {cards.map((card, idx) => (
                    <div key={idx} className="flex-shrink-0 w-[60px]">
                      <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden border border-[#FFB800]/22">
                        {card?.cardId ? (
                          <Image
                            src={cardImageUrl(card)}
                            alt={safeCardTitle(card, idx)}
                            fill
                            sizes="60px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[#0F1525]" />
                        )}
                      </div>
                      <p className="mt-1 text-center text-[9px] text-[#FFB800]/60 tracking-wide">
                        {POSITION_LABELS_SHORT[idx]}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tap to reveal */}
              {tapToReveal ? (
                <motion.button
                  type="button"
                  onClick={() => setTapToReveal(false)}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-2xl border border-[#FFB800]/28 p-8 text-center backdrop-blur-sm"
                  style={{ background: "rgba(255,184,0,0.06)" }}
                >
                  <div className="flex justify-center mb-3">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], opacity: [0.65, 1, 0.65] }}
                      transition={{ duration: 2.6, repeat: Infinity }}
                    >
                      <Sparkles className="h-7 w-7 text-[#FFB800]" />
                    </motion.div>
                  </div>
                  <p className="font-serif text-lg font-semibold text-white/95">화면을 눌러 리딩 열기</p>
                  <p className="mt-2 text-sm text-white/45">태양의 메시지가 순서대로 펼쳐집니다.</p>
                </motion.button>
              ) : (
                <div className="space-y-3">
                  {READING_SECTIONS.map((section) => {
                    const value = typed[String(section.key)] || "";
                    if (!value) return null;

                    return (
                      <ReadingCard
                        key={String(section.key)}
                        title={section.title}
                        tone={section.tone}
                        icon={section.icon}
                        text={value}
                        isTyping={typingSection === section.title}
                      />
                    );
                  })}
                </div>
              )}

              {/* Footer actions */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={share}
                  className="group relative overflow-hidden rounded-2xl py-3.5 text-sm font-bold text-[#0A0E1A] shadow-md shadow-[#FFB80020] transition-all active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #FFB800 0%, #FF8C00 100%)" }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                    style={{ background: "radial-gradient(circle at 50% 50%, #fff, transparent 60%)" }}
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    <Share2 className="h-4 w-4" />
                    결과 공유하기
                  </span>
                </button>

                <button
                  type="button"
                  onClick={goHome}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white/90 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  홈으로 이동
                </button>
              </div>
            </motion.section>
          ) : null}

        </AnimatePresence>
      </div>
    </main>
  );
}
