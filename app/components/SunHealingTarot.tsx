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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
const SPREAD_CARD_COUNT = 4 as const;
const SECTION_BREATH_PAUSE_MS = 3400;
const CHAR_DELAY_MS = 22;

const SHARE_FALLBACK_URL = "https://code-destiny.com";
const SHARE_TITLE = "☀ 따뜻한 태양 행복 타로";
const SHARE_TEXT_PREFIX =
  "☀ 따뜻한 태양 행복 타로 ☀\n\n햇살처럼 포근한 빛으로 마음을 어루만지는 4카드 리딩\n\n👉 ";

const READING_SECTIONS = {
  opening: { key: "opening", title: "☀️ 따뜻한 인사 ✨" },
  hiddenTruth: { key: "hiddenTruth", title: "🔮 1. 마음 깊은 곳의 이야기" },
  embracePain: { key: "embracePain", title: "💫 2. 괜찮아, 그 마음 품어주기" },
  silverLining: { key: "silverLining", title: "🌅 3. 빛이 비치는 곳" },
  stepForward: { key: "stepForward", title: "🚀 4. 한 걸음 나아가기" },
  integrationMessage: { key: "integrationMessage", title: "☀️ 따뜻한 마무리 🌟" },
  actionPlan: { key: "actionPlan", title: "🌱 오늘 해볼 만한 것 ✨" },
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
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

function PremiumSunSigil() {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 120" className="h-12 w-12">
      <defs>
        <radialGradient id="sigilCore" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="35%" stopColor="rgba(251,191,36,0.8)" />
          <stop offset="70%" stopColor="rgba(245,158,11,0.25)" />
          <stop offset="100%" stopColor="rgba(245,158,11,0)" />
        </radialGradient>
        <linearGradient id="sigilWave" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.75)" />
          <stop offset="55%" stopColor="rgba(222,102,60,0.65)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="60" r="24" fill="url(#sigilCore)" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="rgba(234,179,8,0.45)" strokeWidth="2" />
      <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(234,179,8,0.22)" strokeWidth="2" />

      {Array.from({ length: 3 }).map((_, i) => (
        <path
          key={i}
          d="M14 64 C 32 42, 46 42, 60 60 C 74 78, 88 78, 106 56"
          fill="none"
          stroke="url(#sigilWave)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity={0.55 - i * 0.12}
          transform={`rotate(${i * 22} 60 60)`}
        />
      ))}
    </svg>
  );
}

function SunflowerFooterPattern() {
  return (
    <svg aria-hidden="true" viewBox="0 0 600 120" className="h-full w-full">
      <defs>
        <linearGradient id="petal" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(245,158,11,0)" />
          <stop offset="35%" stopColor="rgba(245,158,11,0.26)" />
          <stop offset="65%" stopColor="rgba(222,102,60,0.22)" />
          <stop offset="100%" stopColor="rgba(245,158,11,0)" />
        </linearGradient>
      </defs>
      <rect width="600" height="120" fill="transparent" />
      {Array.from({ length: 10 }).map((_, i) => (
        <g key={i} transform={`translate(${30 + i * 58} 88)`} opacity="0.85">
          <circle cx="0" cy="0" r="7" fill="rgba(234,179,8,0.22)" />
          {Array.from({ length: 12 }).map((__, j) => (
            <rect
              key={j}
              x="-1.2"
              y="-26"
              width="2.4"
              height="14"
              rx="1.2"
              fill="url(#petal)"
              transform={`rotate(${j * 30})`}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

function ChildHorseScarfArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 680 260" className="h-full w-full">
      <defs>
        <radialGradient id="sunAura" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="28%" stopColor="rgba(251,191,36,0.85)" />
          <stop offset="55%" stopColor="rgba(245,158,11,0.25)" />
          <stop offset="100%" stopColor="rgba(245,158,11,0)" />
        </radialGradient>
        <linearGradient id="horseGlass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.72)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.14)" />
        </linearGradient>
        <linearGradient id="scarf" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(222,102,60,0.0)" />
          <stop offset="35%" stopColor="rgba(222,102,60,0.78)" />
          <stop offset="65%" stopColor="rgba(222,102,60,0.5)" />
          <stop offset="100%" stopColor="rgba(222,102,60,0.0)" />
        </linearGradient>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.7 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Abstract sun symbol (no face) */}
      <g transform="translate(340 58)">
        <circle cx="0" cy="0" r="40" fill="url(#sunAura)" filter="url(#softGlow)" />
        <circle cx="0" cy="0" r="18" fill="rgba(255,255,255,0.75)" />
        <circle cx="0" cy="0" r="28" fill="none" stroke="rgba(234,179,8,0.35)" strokeWidth="3" />
        {Array.from({ length: 10 }).map((_, i) => (
          <path
            key={i}
            d="M0 -64 C 10 -46, 10 -46, 0 -28 C -10 -10, -10 -10, 0 8"
            fill="none"
            stroke="rgba(234,179,8,0.26)"
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${i * 36})`}
          />
        ))}
      </g>

      {/* Horse (minimal glass silhouette) */}
      <g transform="translate(170 128)">
        <path
          d="M44 92c28-36 74-54 132-54 44 0 78 10 106 26 12 7 20 16 28 26 8 10 20 18 34 22 18 5 42 6 62 0 10-3 20 5 18 16-3 18-18 26-36 30-26 6-56 2-78-6-20-7-34-18-48-32-12-12-26-20-48-24-18-3-42-2-62 6-20 8-38 22-52 42-6 10-20 12-28 4-8-8-10-18-6-26z"
          fill="url(#horseGlass)"
          stroke="rgba(234,179,8,0.22)"
          strokeWidth="2"
        />
        <path
          d="M154 40c-2-18 10-34 28-40 18-6 36 0 46 14 8 10 10 22 6 34"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M210 48c14-10 34-10 48 2 10 9 14 22 10 34"
          fill="none"
          stroke="rgba(255,255,255,0.38)"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Child (simple hopeful form) */}
        <g transform="translate(238 22)">
          <circle cx="0" cy="0" r="12" fill="rgba(255,255,255,0.62)" />
          <path
            d="M-10 18 C -4 10, 4 10, 10 18 C 14 26, 10 40, 0 46 C -10 40, -14 26, -10 18Z"
            fill="rgba(255,255,255,0.34)"
            stroke="rgba(234,179,8,0.18)"
            strokeWidth="2"
          />
        </g>
      </g>

      {/* Terracotta silk scarf */}
      <path
        d="M140 196 C 240 156, 318 158, 420 186 C 500 208, 560 220, 640 206"
        fill="none"
        stroke="url(#scarf)"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M168 206 C 260 178, 338 180, 430 206 C 506 228, 570 238, 642 226"
        fill="none"
        stroke="rgba(255,255,255,0.38)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.65"
      />
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
  const router = useRouter();
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

  const energyPct = useMemo(
    () => clamp((revealedCount / SPREAD_CARD_COUNT) * 100, 0, 100),
    [revealedCount],
  );

  const reset = useCallback(() => {
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
  }, []);

  const goHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const start = useCallback(async () => {
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
      setCards(drawn.slice(0, SPREAD_CARD_COUNT));
      setStage("spread");
    } catch (e) {
      console.error(e);
      alert("카드를 뽑는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요. ☀️");
    } finally {
      setLoading(false);
    }
  }, [trigger]);

  const canFlip = useCallback(
    (idx: number) =>
      idx === revealedCount && idx < SPREAD_CARD_COUNT && stage === "spread" && !loading,
    [loading, revealedCount, stage],
  );

  const flip = useCallback(
    (idx: number) => {
      if (!canFlip(idx)) return;
      trigger();
      setRevealedCount((v) => v + 1);
    },
    [canFlip, trigger],
  );

  const fetchReading = useCallback(async () => {
    if (revealedCount < SPREAD_CARD_COUNT || cards.length !== SPREAD_CARD_COUNT) return;
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
  }, [cards, revealedCount, trigger]);

  const share = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : SHARE_FALLBACK_URL;
    const text = SHARE_TEXT_PREFIX + url;
    try {
      // @ts-expect-error navigator.share exists on mobile
      if (navigator.share) {
        // @ts-expect-error navigator.share exists on mobile
        await navigator.share({ title: SHARE_TITLE, text, url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
      alert("링크를 클립보드에 복사했어요. 💬");
    } catch {
      alert("공유를 지원하지 않는 환경이에요.");
    }
  }, []);

  useEffect(() => {
    if (!reading || tapToReveal || stage !== "result") return;
    let cancelled = false;

    const sections: Array<{ key: string; title: string; text?: string | string[] }> = [
      { ...READING_SECTIONS.opening, text: reading.opening },
      { ...READING_SECTIONS.hiddenTruth, text: reading.hiddenTruth },
      { ...READING_SECTIONS.embracePain, text: reading.embracePain },
      { ...READING_SECTIONS.silverLining, text: reading.silverLining },
      { ...READING_SECTIONS.stepForward, text: reading.stepForward },
      { ...READING_SECTIONS.integrationMessage, text: reading.integrationMessage },
      { ...READING_SECTIONS.actionPlan, text: reading.actionPlan || [] },
    ].filter((s) => (Array.isArray(s.text) ? s.text.length : Boolean(String(s.text || "").trim())));

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
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.95)_0%,rgba(255,246,230,0.9)_25%,rgba(255,213,167,0.35)_55%,rgba(255,255,255,0)_78%),linear-gradient(180deg,#fff7ed_0%,#fffbeb_42%,#ffffff_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-[600px]">
        <div className="relative overflow-hidden rounded-[30px] border border-amber-200/55 bg-white/58 shadow-[0_28px_90px_rgba(249,115,22,0.14)] backdrop-blur-2xl">
          {/* Ambient golden hour */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(251,191,36,0.52)_0%,rgba(245,158,11,0.22)_22%,rgba(222,102,60,0.12)_38%,rgba(255,255,255,0)_72%)]" />
          {/* Subtle “stone” texture */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:radial-gradient(circle_at_20%_30%,rgba(120,113,108,0.28)_0px,transparent_38px),radial-gradient(circle_at_75%_22%,rgba(120,113,108,0.22)_0px,transparent_44px),radial-gradient(circle_at_55%_70%,rgba(120,113,108,0.18)_0px,transparent_56px)]" />
          {/* Slim glossy border sheen */}
          <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-white/45" />

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
            <div className="mb-6 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-white/55 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-orange-900/75 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[rgba(222,102,60,0.85)] shadow-[0_0_0_3px_rgba(222,102,60,0.12)]" aria-hidden="true" />
                  XIX. THE SUN
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/65 bg-white/55 shadow-[inset_6px_6px_14px_rgba(0,0,0,0.04),inset_-6px_-6px_14px_rgba(255,255,255,0.7)] backdrop-blur">
                    <PremiumSunSigil />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold tracking-tight text-orange-950/90">
                      태양 행복 타로
                    </div>
                    <div className="truncate text-xs font-medium tracking-wide text-orange-950/60">
                      Golden Hour • Glass + Neumorphism
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={goHome}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-amber-200/55 bg-white/55 px-3 py-2 text-sm font-semibold text-orange-950/70 shadow-[inset_6px_6px_14px_rgba(0,0,0,0.04),inset_-6px_-6px_14px_rgba(255,255,255,0.7)] backdrop-blur transition hover:scale-[1.02]"
              >
                <RotateCcw className="h-4 w-4" />
                홈페이지
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
                  <div className="relative overflow-hidden rounded-3xl border border-amber-200/55 bg-white/55 p-5 shadow-[0_24px_70px_rgba(249,115,22,0.12)] backdrop-blur-2xl">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.45),rgba(255,255,255,0.02))]" />
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 opacity-[0.9]">
                      <SunflowerFooterPattern />
                    </div>

                    <div className="relative">
                      <div className="mx-auto mb-4 max-w-[520px] rounded-2xl border border-amber-200/55 bg-white/55 px-4 py-3 text-center shadow-[inset_6px_6px_14px_rgba(0,0,0,0.04),inset_-6px_-6px_14px_rgba(255,255,255,0.7)] backdrop-blur">
                        <div className="text-[12px] font-semibold tracking-[0.18em] text-orange-950/60">XIX • THE SUN</div>
                      </div>

                      <div className="mx-auto mb-3 h-[150px] max-w-[560px] overflow-hidden rounded-3xl border border-amber-200/45 bg-white/35 shadow-[0_22px_60px_rgba(249,115,22,0.12)] backdrop-blur-2xl">
                        <div className="pointer-events-none absolute left-1/2 top-[86px] h-40 w-40 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.35),transparent_68%)]" />
                        <div className="h-full w-full p-3">
                          <ChildHorseScarfArt />
                        </div>
                      </div>

                      <h1 className="text-center text-2xl font-semibold tracking-tight text-orange-950/90 md:text-[28px]">
                        따뜻한 태양 행복 타로
                      </h1>
                      <p className="mx-auto mt-3 max-w-[52ch] text-center text-sm leading-7 text-orange-950/70">
                        햇살처럼 포근한 빛으로 마음을 어루만지고, 다시 일어설 힘을 찾아가는 4카드 리딩이에요.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={start}
                    disabled={loading}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#FFF7ED_0%,#FDE68A_28%,#FBBF24_55%,#EAB308_78%,#DC6A3C_125%)] px-5 py-4 font-semibold text-amber-950 shadow-[0_18px_60px_rgba(249,115,22,0.22)] transition hover:scale-[1.02] disabled:opacity-60"
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
                  <div className="rounded-3xl border border-amber-200/55 bg-white/55 p-4 shadow-[inset_6px_6px_14px_rgba(0,0,0,0.04),inset_-6px_-6px_14px_rgba(255,255,255,0.7)] backdrop-blur-2xl">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight text-orange-950/90">Flip in Order</h2>
                        <p className="mt-1 text-sm leading-6 text-orange-950/65">순서대로 4장을 열면 해석 버튼이 활성화돼요.</p>
                      </div>
                      <div className="hidden rounded-xl border border-amber-200/70 bg-white/70 px-3 py-2 text-xs font-semibold text-orange-900/70 md:block">
                        진행 {revealedCount}/4
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: SPREAD_CARD_COUNT }).map((_, idx) => {
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
                    disabled={loading || revealedCount < SPREAD_CARD_COUNT}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#FDE68A_0%,#FBBF24_35%,#EAB308_70%,#DC6A3C_115%)] px-5 py-4 font-semibold text-amber-950 shadow-[0_18px_60px_rgba(249,115,22,0.22)] transition hover:scale-[1.02] disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                    Card Meaning (카드 해석)
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
                  <div className="sticky top-3 z-20 rounded-3xl border border-amber-200/55 bg-white/60 p-4 shadow-[0_18px_60px_rgba(249,115,22,0.12)] backdrop-blur-2xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold tracking-tight text-orange-950/90">Result</h2>
                        <p className="mt-1 text-xs tracking-wide text-orange-950/55">ENERGY METER</p>
                      </div>
                      <button
                        type="button"
                        onClick={share}
                        className="inline-flex items-center gap-2 rounded-2xl border border-amber-200/55 bg-white/55 px-3 py-2 text-sm font-semibold text-orange-950/70 shadow-[inset_6px_6px_14px_rgba(0,0,0,0.04),inset_-6px_-6px_14px_rgba(255,255,255,0.7)] backdrop-blur transition hover:scale-[1.02]"
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
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#FDE68A_0%,#FBBF24_35%,#EAB308_70%,#DC6A3C_115%)] px-5 py-4 font-semibold text-amber-950 shadow-[0_18px_60px_rgba(249,115,22,0.22)] transition hover:scale-[1.02]"
                    >
                      <Share2 className="h-5 w-5" />
                      결과 공유하기
                    </button>

                    <button
                      type="button"
                      onClick={goHome}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200/60 bg-white/55 px-5 py-4 font-semibold text-orange-950/75 shadow-[inset_6px_6px_14px_rgba(0,0,0,0.04),inset_-6px_-6px_14px_rgba(255,255,255,0.7)] backdrop-blur transition hover:scale-[1.02]"
                    >
                      <RotateCcw className="h-5 w-5" />
                      홈페이지로 이동
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

