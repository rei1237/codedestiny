"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  HeartHandshake,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  Sun,
  Telescope,
  Footprints,
  Share2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type TarotOrientation = "upright" | "reversed";

type TarotCardDto = {
  cardId: string;
  name?: string;
  nameKr?: string;
  position?: string;
  orientation?: TarotOrientation | string;
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

const SPREAD_TYPE = "healing_rising_four_card" as const;
const SECTION_BREATH_PAUSE_MS = 3400;
const CHAR_DELAY_MS = 22;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeCardTitle(card?: TarotCardDto, idx?: number) {
  const base = (card?.nameKr || card?.name || "").trim();
  if (!base) return `Card ${typeof idx === "number" ? idx + 1 : ""}`.trim();
  const isRev = String(card?.orientation || "").toLowerCase() === "reversed";
  return isRev ? `${base} (역)` : base;
}

function cardImageUrl(cardId: string) {
  // Always use the project’s linked free tarot source via proxy API.
  return `/api/tarot/card-image/${encodeURIComponent(cardId)}`;
}

function useSunFlash() {
  const [flash, setFlash] = useState(0);
  return {
    flash,
    trigger: () => setFlash((v) => v + 1),
  };
}

function SunPattern() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 160"
      className="absolute inset-0 h-full w-full opacity-[0.22]"
    >
      <defs>
        <radialGradient id="sunCore" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="35%" stopColor="rgba(251,191,36,0.55)" />
          <stop offset="75%" stopColor="rgba(249,115,22,0.0)" />
        </radialGradient>
        <linearGradient id="ray" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
        </linearGradient>
      </defs>
      <rect width="120" height="160" fill="transparent" />
      <circle cx="60" cy="62" r="22" fill="url(#sunCore)" />
      {Array.from({ length: 10 }).map((_, i) => (
        <rect
          key={i}
          x="58"
          y="18"
          width="4"
          height="34"
          rx="2"
          fill="url(#ray)"
          transform={`rotate(${i * 36} 60 62)`}
        />
      ))}
    </svg>
  );
}

function TimelineSection({
  title,
  icon: Icon,
  tone,
  children,
  isTyping,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "amber" | "orange" | "cream" | "gold";
  children: React.ReactNode;
  isTyping?: boolean;
}) {
  const toneClass =
    tone === "amber"
      ? "bg-white/60 border-amber-200/70"
      : tone === "orange"
        ? "bg-white/55 border-orange-200/70"
        : tone === "gold"
          ? "bg-white/55 border-yellow-200/70"
          : "bg-white/60 border-amber-100/70";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.18, 0.83, 0.34, 1] }}
      className={`relative rounded-2xl border ${toneClass} p-4 shadow-[0_18px_50px_rgba(249,115,22,0.12)] backdrop-blur-xl`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-200/70 bg-gradient-to-br from-white/80 to-amber-50/70 text-orange-700 shadow-sm">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-[15px] font-bold tracking-tight text-orange-900 md:text-base">
              {title}
            </h3>
            {isTyping ? (
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" aria-hidden="true" />
            ) : null}
          </div>
          <div className="mt-2 text-sm leading-7 text-orange-950/80">{children}</div>
        </div>
      </div>
    </motion.section>
  );
}

export default function SunHealingTarot() {
  const [stage, setStage] = useState<Stage>("intro");
  const [cards, setCards] = useState<TarotCardDto[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<HealingReadingDto | null>(null);
  const [tapToReveal, setTapToReveal] = useState(true);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [typingSection, setTypingSection] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { flash, trigger } = useSunFlash();

  const energyPct = useMemo(() => clamp((revealedCount / 4) * 100, 0, 100), [revealedCount]);

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStage("intro");
    setCards([]);
    setRevealedCount(0);
    setLoading(false);
    setReading(null);
    setTapToReveal(true);
    setTyped({});
    setTypingSection(null);
  }

  async function start() {
    trigger();
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
      if (!res.ok || data?.ok === false) throw new Error(data?.message || "draw failed");
      const drawn = Array.isArray(data?.cards) ? (data.cards as TarotCardDto[]) : [];
      setCards(drawn.slice(0, 4));
      setStage("spread");
    } catch (e) {
      console.error(e);
      alert("카드를 뽑는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요. ☀️");
    } finally {
      setLoading(false);
    }
  }

  function canFlip(idx: number) {
    return idx === revealedCount && idx < 4 && stage === "spread" && !loading;
  }

  function flip(idx: number) {
    if (!canFlip(idx)) return;
    trigger();
    setRevealedCount((v) => v + 1);
  }

  async function fetchReading() {
    if (revealedCount < 4 || cards.length !== 4) return;
    trigger();
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
      if (!res.ok || data?.ok === false) throw new Error(data?.message || "reading failed");
      setReading((data?.reading || null) as HealingReadingDto | null);
      setStage("result");
      setTapToReveal(true);
      setTyped({});
      setTypingSection(null);
    } catch (e) {
      console.error(e);
      alert("해석을 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요. ☀️");
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "https://code-destiny.com";
    const text = "☀ 따뜻한 태양 회복 타로 ☀\n\n햇살처럼 포근한 빛으로 마음을 어루만지는 4카드 리딩\n\n👉 " + url;
    try {
      // @ts-expect-error navigator.share exists on mobile
      if (navigator.share) {
        // @ts-expect-error navigator.share exists on mobile
        await navigator.share({ title: "☀ 따뜻한 태양 회복 타로", text, url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
      alert("링크를 클립보드에 복사했어요. 💬");
    } catch {
      alert("공유를 지원하지 않는 환경이에요.");
    }
  }

  useEffect(() => {
    if (!reading || tapToReveal || stage !== "result") return;
    let cancelled = false;

    const sections: Array<{ key: string; title: string; text?: string | string[] }> = [
      { key: "opening", title: "☀️ 따뜻한 인사 ✨", text: reading.opening },
      { key: "hiddenTruth", title: "🔮 1. 마음 깊은 곳의 이야기", text: reading.hiddenTruth },
      { key: "embracePain", title: "💫 2. 괜찮아, 그 마음 품어주기", text: reading.embracePain },
      { key: "silverLining", title: "🌅 3. 빛이 비치는 곳", text: reading.silverLining },
      { key: "stepForward", title: "🚀 4. 한 걸음 나아가기", text: reading.stepForward },
      { key: "integrationMessage", title: "☀️ 따뜻한 마무리 🌟", text: reading.integrationMessage },
      { key: "actionPlan", title: "🌱 오늘 해볼 만한 것 ✨", text: reading.actionPlan || [] },
    ].filter((s) => (Array.isArray(s.text) ? s.text.length : Boolean(String(s.text || "").trim())));

    async function sleep(ms: number) {
      await new Promise((r) => setTimeout(r, ms));
    }

    async function typeInto(key: string, sectionTitle: string, text: string) {
      setTypingSection(sectionTitle);
      setTyped((prev) => ({ ...prev, [key]: "" }));
      for (let i = 0; i < text.length; i += 1) {
        if (cancelled) return;
        setTyped((prev) => ({ ...prev, [key]: (prev[key] || "") + text[i] }));
        // eslint-disable-next-line no-await-in-loop
        await sleep(CHAR_DELAY_MS);
      }
      setTypingSection(null);
    }

    (async () => {
      for (let i = 0; i < sections.length; i += 1) {
        const sec = sections[i];
        if (cancelled) return;

        const raw = sec.text;
        if (Array.isArray(raw)) {
          const joined = raw.map((v) => `• ${v}`).join("\n");
          // eslint-disable-next-line no-await-in-loop
          await typeInto(sec.key, sec.title, joined);
        } else {
          // eslint-disable-next-line no-await-in-loop
          await typeInto(sec.key, sec.title, String(raw || ""));
        }

        if (i < sections.length - 1) {
          // 숨고르기 텀 (섹션 단위)
          // eslint-disable-next-line no-await-in-loop
          await sleep(SECTION_BREATH_PAUSE_MS);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reading, stage, tapToReveal]);

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-orange-50 via-amber-50 to-white px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-[600px]">
        <div className="relative overflow-hidden rounded-[28px] border border-amber-200/70 bg-white/55 shadow-xl backdrop-blur-2xl">
          {/* Ambient sun glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(251,191,36,0.45)_0%,rgba(249,115,22,0.14)_34%,rgba(255,255,255,0)_72%)]" />

          {/* Flash overlay (interactive sun burst) */}
          <AnimatePresence>
            {flash ? (
              <motion.div
                key={`flash-${flash}`}
                initial={{ opacity: 0, scale: 0.96, x: "-6%" }}
                animate={{ opacity: [0, 0.92, 0], scale: [0.96, 1.02, 1.06], x: ["-6%", "6%", "16%"] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.56, ease: "easeOut" }}
                className="pointer-events-none absolute inset-[-40%] bg-[radial-gradient(circle_at_40%_18%,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.35)_18%,transparent_46%),linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.35)_35%,rgba(255,255,255,0.0)_70%)] mix-blend-screen"
              />
            ) : null}
          </AnimatePresence>

          <div className="relative p-6 md:p-7">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-white/60 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-orange-900/80">
                <Sun className="h-4 w-4 text-orange-600" />
                SUN HEALING TAROT
              </div>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-orange-900/75 shadow-sm transition hover:scale-[1.02]"
              >
                <RotateCcw className="h-4 w-4" />
                초기화
              </button>
            </div>

            <AnimatePresence mode="wait">
              {stage === "intro" ? (
                <motion.section
                  key="intro"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.42, ease: [0.18, 0.83, 0.34, 1] }}
                  className="space-y-5"
                >
                  <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-white/60 p-5 shadow-[0_22px_60px_rgba(249,115,22,0.14)] backdrop-blur-xl">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.35),rgba(255,255,255,0.0))]" />
                    <div className="relative text-center">
                      <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/70 bg-gradient-to-br from-white/80 to-amber-100/60 shadow-sm">
                        <motion.div
                          animate={{ scale: [1, 1.06, 1], opacity: [0.9, 1, 0.9] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                          className="relative"
                        >
                          <Sun className="h-7 w-7 text-orange-600 drop-shadow-[0_0_18px_rgba(251,191,36,0.7)]" />
                        </motion.div>
                      </div>

                      <h1 className="font-serif text-2xl font-extrabold tracking-tight text-orange-900">
                        따뜻한 태양 회복 타로
                      </h1>
                      <p className="mx-auto mt-3 max-w-[46ch] rounded-2xl border border-amber-100/70 bg-white/70 px-4 py-3 text-sm leading-7 text-orange-950/80">
                        햇살처럼 포근한 빛으로 마음을 어루만지고, 다시 일어설 힘을 찾아가는 4카드 리딩이에요.
                        <span className="font-semibold text-orange-800"> 당신 안의 빛</span>을 함께 찾아볼까요?
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={start}
                    disabled={loading}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-4 font-semibold text-white shadow-[0_18px_60px_rgba(249,115,22,0.32)] transition hover:scale-[1.02] disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                    햇살의 카드 펼치기
                  </button>
                </motion.section>
              ) : null}

              {stage === "spread" ? (
                <motion.section
                  key="spread"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.42, ease: [0.18, 0.83, 0.34, 1] }}
                  className="space-y-5"
                >
                  <div className="rounded-2xl border border-amber-200/70 bg-white/60 p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-serif text-lg font-bold text-orange-900">카드를 한 장씩 열어보세요</h2>
                        <p className="mt-1 text-sm leading-6 text-orange-950/70">
                          순서대로 4장을 열면, 따뜻한 이야기(결과)를 보여드릴게요.
                        </p>
                      </div>
                      <div className="hidden rounded-xl border border-amber-200/70 bg-white/70 px-3 py-2 text-xs font-semibold text-orange-900/70 md:block">
                        진행 {revealedCount}/4
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, idx) => {
                      const card = cards[idx];
                      const isFlipped = idx < revealedCount;
                      const enabled = canFlip(idx);
                      return (
                        <motion.button
                          key={idx}
                          type="button"
                          onClick={() => flip(idx)}
                          disabled={!enabled}
                          whileHover={enabled ? { y: -10 } : undefined}
                          className={[
                            "relative aspect-[3/4] w-full overflow-hidden rounded-2xl border shadow-sm transition",
                            enabled
                              ? "border-orange-200/70 bg-white/40 shadow-orange-200/30 hover:shadow-[0_22px_60px_rgba(249,115,22,0.18)]"
                              : "border-amber-200/60 bg-white/30 opacity-80",
                          ].join(" ")}
                        >
                          <motion.div
                            className="absolute inset-0 [transform-style:preserve-3d]"
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                          >
                            {/* Back */}
                            <div className="absolute inset-0 overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-white/70 via-amber-50/80 to-orange-100/70 [backface-visibility:hidden]">
                              <SunPattern />
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(251,191,36,0.38),transparent_52%)]" />
                              <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-amber-200/70 bg-white/70 px-3 py-2 text-center text-xs font-semibold text-orange-900/75 backdrop-blur">
                                {enabled ? "지금 이 카드를 열어보세요" : "순서대로 열 수 있어요"}
                              </div>
                            </div>

                            {/* Front */}
                            <div className="absolute inset-0 overflow-hidden rounded-2xl border border-amber-200/60 bg-white/70 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                              {card?.cardId ? (
                                <Image
                                  src={cardImageUrl(card.cardId)}
                                  alt={safeCardTitle(card, idx)}
                                  fill
                                  sizes="(max-width: 768px) 45vw, 260px"
                                  className="object-cover"
                                  priority
                                />
                              ) : (
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(251,191,36,0.32),transparent_45%),linear-gradient(145deg,#fff7ed_0%,#fde68a_48%,#fed7aa_100%)]" />
                              )}
                              <div className="absolute inset-x-3 bottom-3 rounded-xl border border-amber-200/70 bg-white/80 px-3 py-2 text-center text-xs font-semibold text-orange-900/80 backdrop-blur">
                                {safeCardTitle(card, idx)}
                              </div>
                            </div>
                          </motion.div>
                        </motion.button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={fetchReading}
                    disabled={loading || revealedCount < 4}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-4 font-semibold text-white shadow-[0_18px_60px_rgba(249,115,22,0.32)] transition hover:scale-[1.02] disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                    따뜻한 이야기 보기
                  </button>
                </motion.section>
              ) : null}

              {stage === "result" ? (
                <motion.section
                  key="result"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.42, ease: [0.18, 0.83, 0.34, 1] }}
                  className="space-y-4"
                >
                  <div className="sticky top-3 z-20 rounded-2xl border border-amber-200/70 bg-white/70 p-4 shadow-[0_18px_50px_rgba(249,115,22,0.14)] backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-serif text-lg font-extrabold text-orange-900">
                          ☀️ 따뜻한 태양 회복 타로 결과
                        </h2>
                        <p className="mt-1 text-xs text-orange-950/65">Energy Meter</p>
                      </div>
                      <button
                        type="button"
                        onClick={share}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-orange-900/75 shadow-sm transition hover:scale-[1.02]"
                      >
                        <Share2 className="h-4 w-4" />
                        공유
                      </button>
                    </div>

                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${energyPct}%` }}
                        transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {tapToReveal ? (
                      <button
                        type="button"
                        onClick={() => {
                          trigger();
                          setTapToReveal(false);
                        }}
                        className="relative w-full overflow-hidden rounded-2xl border border-amber-200/70 bg-white/70 p-6 text-center shadow-[0_18px_50px_rgba(249,115,22,0.12)] backdrop-blur-xl"
                      >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(251,191,36,0.35),transparent_58%)]" />
                        <div className="relative">
                          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/70 bg-gradient-to-br from-white/80 to-amber-50/70 shadow-sm">
                            <Sparkles className="h-6 w-6 text-orange-600" />
                          </div>
                          <p className="font-serif text-lg font-extrabold text-orange-900">화면을 탭하면</p>
                          <p className="mt-1 text-sm leading-7 text-orange-950/75">
                            당신의 따뜻한 이야기가 열려요
                          </p>
                          <p className="mt-3 text-xs font-semibold tracking-[0.12em] text-orange-900/60">
                            TAP TO REVEAL
                          </p>
                        </div>
                      </button>
                    ) : (
                      <>
                        <TimelineSection
                          title="마음 깊은 곳의 이야기"
                          icon={Telescope}
                          tone="amber"
                          isTyping={typingSection === "🔮 1. 마음 깊은 곳의 이야기"}
                        >
                          <pre className="whitespace-pre-wrap font-sans">{typed.hiddenTruth || ""}</pre>
                        </TimelineSection>

                        <TimelineSection
                          title="괜찮아, 그 마음 품어주기"
                          icon={HeartHandshake}
                          tone="cream"
                          isTyping={typingSection === "💫 2. 괜찮아, 그 마음 품어주기"}
                        >
                          <pre className="whitespace-pre-wrap font-sans">{typed.embracePain || ""}</pre>
                        </TimelineSection>

                        <TimelineSection
                          title="빛이 비치는 곳"
                          icon={Lightbulb}
                          tone="gold"
                          isTyping={typingSection === "🌅 3. 빛이 비치는 곳"}
                        >
                          <pre className="whitespace-pre-wrap font-sans">{typed.silverLining || ""}</pre>
                        </TimelineSection>

                        <TimelineSection
                          title="한 걸음 나아가기"
                          icon={Footprints}
                          tone="orange"
                          isTyping={typingSection === "🚀 4. 한 걸음 나아가기"}
                        >
                          <pre className="whitespace-pre-wrap font-sans">{typed.stepForward || ""}</pre>
                        </TimelineSection>

                        {typed.actionPlan ? (
                          <TimelineSection title="오늘 해볼 만한 것" icon={Sparkles} tone="amber">
                            <pre className="whitespace-pre-wrap font-sans">{typed.actionPlan}</pre>
                          </TimelineSection>
                        ) : null}
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={share}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-4 font-semibold text-white shadow-[0_18px_60px_rgba(249,115,22,0.32)] transition hover:scale-[1.02]"
                    >
                      <Share2 className="h-5 w-5" />
                      결과 공유하기
                    </button>

                    <button
                      type="button"
                      onClick={reset}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200/70 bg-white/70 px-5 py-4 font-semibold text-orange-900/80 shadow-sm transition hover:scale-[1.02]"
                    >
                      <RotateCcw className="h-5 w-5" />
                      다시 리딩하기
                    </button>
                  </div>
                </motion.section>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}

