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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";


// ─── Design Token ───────────────────────────────────────────────────────────
// Bg:      #FFFBF0 (믻 크림)  Surface: 백황색 반투명
// Primary: #F59E0B (Amber-500)    Text:    amber-900 / stone-800
// Accent:  #FFB800 (Golden Hour)  Shadow:  rgba(245,158,11,0.2)
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
  cardDeepDive?: string[];
  hiddenTruth?: string;
  embracePain?: string;
  silverLining?: string;
  stepForward?: string;
  integrationMessage?: string;
  consultingHighlights?: string[];
  actionPlan?: string[];
};

type EngineMetaDto = {
  qualityEnhanced?: boolean;
  source?: string;
  spreadType?: string;
  cardCount?: number;
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
const CHAR_DELAY_MS = 12;
const SECTION_GAP_MS = 320;
const INITIAL_TEXT_BURST_CHARS = 72;

const SHARE_FALLBACK_URL = "https://code-destiny.com";
const SHARE_TITLE = "태양 회복 타로";
const SHARE_TEXT_PREFIX = "태양 회복 타로 결과를 공유합니다.\n\n";

const READING_SECTIONS: ReadingSection[] = [
  { key: "consultingHighlights", title: "핵심 상담 하이라이트", tone: "focus", icon: Sparkles },
  { key: "opening", title: "오늘의 상담 프롤로그", tone: "neutral", icon: Sparkles },
  { key: "cardDeepDive", title: "카드별 심층 해석", tone: "focus", icon: Telescope },
  { key: "hiddenTruth", title: "1. 마음 깊은 원인", tone: "focus", icon: Telescope },
  { key: "embracePain", title: "2. 감정 안아주기", tone: "warm", icon: HeartHandshake },
  { key: "silverLining", title: "3. 회복의 단서", tone: "focus", icon: Lightbulb },
  { key: "stepForward", title: "4. 오늘의 한 걸음", tone: "warm", icon: Footprints },
  { key: "integrationMessage", title: "종합 풀이: 회복의 흐름", tone: "neutral", icon: Sparkles },
  { key: "actionPlan", title: "오늘 바로 해볼 수 있는 작은 실천", tone: "focus", icon: Sparkles },
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

function readingFingerprint(text: string) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[.,!?~`'"()\[\]{}:;\-_/\\]/g, "")
    .slice(0, 120);
}

const TAROT_IMAGE_MAP: Record<string, string> = {
  M00:"thefool.webp",M01:"themagician.webp",M02:"thehighpriestess.webp",M03:"theempress.webp",
  M04:"theemperor.webp",M05:"thehierophant.webp",M06:"TheLovers.webp",M07:"thechariot.webp",
  M08:"thestrength.webp",M09:"thehermit.webp",M10:"wheeloffortune.webp",M11:"justice.webp",
  M12:"thehangedman.webp",M13:"death.webp",M14:"temperance.webp",M15:"thedevil.webp",
  M16:"thetower.webp",M17:"thestar.webp",M18:"themoon.webp",M19:"thesun.webp",
  M20:"judgement.webp",M21:"theworld.webp",
  W01:"aceofwands.webp",W02:"twoofwands.webp",W03:"threeofwands.webp",W04:"fourofwands.webp",
  W05:"fiveofwands.webp",W06:"sixofwands.webp",W07:"sevenofwands.webp",W08:"eightofwands.webp",
  W09:"nineofwands.webp",W10:"tenofwands.webp",W11:"pageofwands.webp",W12:"knightofwands.webp",
  W13:"queenofwands.webp",W14:"kingofwands.webp",
  C01:"aceofcups.webp",C02:"twoofcups.webp",C03:"threeofcups.webp",C04:"fourofcups.webp",
  C05:"fiveofcups.webp",C06:"sixofcups.webp",C07:"sevenofcups.webp",C08:"eightofcups.webp",
  C09:"nineofcups.webp",C10:"tenofcups.webp",C11:"pageofcups.webp",C12:"knightofcups.webp",
  C13:"queenofcups.webp",C14:"kingofcups.webp",
  S01:"aceofswords.webp",S02:"twoofswords.webp",S03:"threeofswords.webp",S04:"fourofswords.webp",
  S05:"fiveofswords.webp",S06:"sixofswords.webp",S07:"sevenofswords.webp",S08:"eightofswords.webp",
  S09:"nineofswords.webp",S10:"tenofswords.webp",S11:"pageofswords.webp",S12:"knightofswords.webp",
  S13:"queenofswords.webp",S14:"kingofswords.webp",
  P01:"aceofpentacles.webp",P02:"twoofpentacles.webp",P03:"threeofpentacles.webp",P04:"fourofpentacles.webp",
  P05:"fiveofpentacles.webp",P06:"sixofpentacles.webp",P07:"sevenofpentacles.webp",P08:"eightofpentacles.webp",
  P09:"nineofpentacles.webp",P10:"tenofpentacles.webp",P11:"pageofpentacles.webp",P12:"knightofpentacles.webp",
  P13:"queenofpentacles.webp",P14:"kingofpentacles.webp",
};

function cardImageUrl(card?: TarotCardDto) {
  const cardId = String(card?.cardId || "").trim().toUpperCase();
  if (cardId) {
    const fn = TAROT_IMAGE_MAP[cardId];
    if (fn) return `/tarot-cards/${fn}`;
  }
  const local = String(card?.localImageUrl || "").trim();
  if (local && !local.includes("/fuctionassets/")) return local;
  return `/tarot-cards/thefool.webp`;
}

function SunHero() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      <motion.div
        className="absolute rounded-full"
        style={{ width: 220, height: 220, background: "radial-gradient(circle, #F59E0B26 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full border-2 border-amber-300/45"
        style={{ width: 168, height: 168 }}
        animate={{ scale: [1.02, 1.1, 1.02], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />
      <motion.div
        className="absolute rounded-full border-2 border-amber-400/55"
        style={{ width: 110, height: 110 }}
        animate={{ scale: [1, 1.07, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
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
            fill="#F59E0B"
            opacity={i % 2 === 0 ? "0.95" : "0.55"}
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
        <circle cx="50" cy="50" r="21" fill="#FDE68A" opacity="0.55" />
        <circle cx="50" cy="50" r="18" fill="#F59E0B" />
        <circle cx="50" cy="50" r="13" fill="#FCD34D" />
        <circle cx="50" cy="50" r="7" fill="#FEF3C7" />
      </motion.svg>
    </div>
  );
}

function CardBackFace() {
  return (
    <div
      className="absolute inset-0 rounded-xl flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, #FFFBF0 0%, #FEF3C7 50%, #FFF8E1 100%)" }}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 35%, #FDE68A55 0%, transparent 70%)" }}
      />
      {[["top-2","left-2","border-t-2","border-l-2","rounded-tl"],["top-2","right-2","border-t-2","border-r-2","rounded-tr"],["bottom-2","left-2","border-b-2","border-l-2","rounded-bl"],["bottom-2","right-2","border-b-2","border-r-2","rounded-br"]].map((cls, i) => (
        <div key={i} className={`absolute w-4 h-4 border-amber-400/55 ${cls.join(" ")}`} />
      ))}
      <svg width="64" height="64" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: 16 }).map((_, i) => (
          <rect
            key={i}
            x="48.5"
            y="7"
            width="3"
            height={i % 2 === 0 ? "10" : "7"}
            rx="1.5"
            fill="#F59E0B"
            opacity={i % 2 === 0 ? "0.85" : "0.45"}
            transform={`rotate(${i * 22.5} 50 50)`}
          />
        ))}
        <circle cx="50" cy="50" r="22" fill="none" stroke="#F59E0B" strokeWidth="0.8" opacity="0.4" />
        <circle cx="50" cy="50" r="16" fill="none" stroke="#F59E0B" strokeWidth="0.8" opacity="0.6" />
        <circle cx="50" cy="50" r="11" fill="#F59E0B" opacity="0.85" />
        <circle cx="50" cy="50" r="6" fill="#FEF3C7" opacity="1" />
      </svg>
      <p className="mt-2 text-[8px] tracking-[0.25em] text-amber-600/70 font-medium uppercase">Tap to Reveal</p>
    </div>
  );
}

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
  const toneClass = tone === "warm"
    ? "border-rose-200/75 bg-rose-50/80"
    : tone === "focus"
      ? "border-amber-300/75 bg-amber-50/85"
      : "border-teal-200/65 bg-white/85";
  const iconClass = tone === "warm"
    ? "border-rose-200 bg-rose-100 text-rose-700"
    : tone === "focus"
      ? "border-amber-300 bg-amber-100 text-amber-700"
      : "border-teal-200 bg-teal-50 text-teal-700";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38 }}
      className={`rounded-2xl border p-5 shadow-[0_18px_52px_rgba(180,120,35,0.16)] backdrop-blur-xl ${toneClass}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-[16px] font-semibold tracking-tight text-amber-950">{title}</h3>
            {isTyping ? (
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-amber-500"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            ) : null}
          </div>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-8 text-stone-700">{text}</p>
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
  const [consultingHighlights, setConsultingHighlights] = useState<string[]>([]);
  const [engineMeta, setEngineMeta] = useState<EngineMetaDto | null>(null);
  const [tapToReveal, setTapToReveal] = useState(false);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [typingSection, setTypingSection] = useState<string | null>(null);
  const [glowingCard, setGlowingCard] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);


  const progressPct = useMemo(() => clamp((revealedCount / SPREAD_CARD_COUNT) * 100, 0, 100), [revealedCount]);

  const goHome = useCallback(() => {
    window.location.assign("/");
  }, []);

  const start = useCallback(async () => {
    setLoading(true);
    setReading(null);
    setConsultingHighlights([]);
    setEngineMeta(null);
    setTapToReveal(false);
    setTyped({});
    setTypingSection(null);
    setRevealedCount(0);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/tarot/draw/", {
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
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error(error);
      alert("카드를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, []);


  const canFlip = useCallback((idx: number) => idx === revealedCount && idx < SPREAD_CARD_COUNT && stage === "spread" && !loading, [loading, revealedCount, stage]);

  const flip = useCallback((idx: number) => {
    if (!canFlip(idx)) return;
    setGlowingCard(idx);
    setRevealedCount((v) => v + 1);
    setTimeout(() => setGlowingCard(null), 1000);
  }, [canFlip]);

  const fetchReading = useCallback(async () => {
    if (revealedCount < SPREAD_CARD_COUNT || cards.length !== SPREAD_CARD_COUNT) return;

    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const payloadCards = cards.map((c) => ({ cardId: c.cardId, position: c.position, orientation: c.orientation }));
      const res = await fetch("/api/tarot/reading/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "healing", spreadType: SPREAD_TYPE, cards: payloadCards }),
        signal: ac.signal,
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.message || "reading failed");
      const nextReading = (data?.reading || null) as HealingReadingDto | null;
      const highlights = Array.isArray(data?.consultingHighlights) ? data.consultingHighlights.map((line: unknown) => String(line || "").trim()).filter(Boolean).slice(0, 4) : [];
      if (nextReading) nextReading.consultingHighlights = highlights;
      setReading(nextReading);
      setConsultingHighlights(highlights);
      setEngineMeta(data?.engineMeta && typeof data.engineMeta === "object" ? (data.engineMeta as EngineMetaDto) : null);
      setStage("result");
      setTapToReveal(false);
      setTyped({});
      setTypingSection(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error(error);
      alert("해석을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [cards, revealedCount]);


  const share = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : SHARE_FALLBACK_URL;
    const highlightText = consultingHighlights.length ? `\n🔭 핵심 상담 하이라이트\n${consultingHighlights.slice(0, 2).map((line) => `• ${line}`).join("\n")}\n` : "";
    const text = `${SHARE_TEXT_PREFIX}${highlightText}\n${url}`;
    try {
      const nav = navigator as Navigator & { share?: (data: object) => Promise<void> };
      if (nav.share) {
        await nav.share({ title: SHARE_TITLE, text, url });
        return;
      }
    } catch (e) {}
    try {
      await navigator.clipboard.writeText(text);
      alert("링크를 복사했습니다.");
    } catch (e) {
      alert("공유를 지원하지 않는 환경입니다.");
    }
  }, [consultingHighlights]);

  useEffect(() => {
    if (!reading || tapToReveal || stage !== "result") return;
    let cancelled = false;
    const seen = new Set<string>();
    async function typeInto(key: string, title: string, text: string) {
      setTypingSection(title);
      const initial = text.slice(0, INITIAL_TEXT_BURST_CHARS);
      setTyped((prev) => ({ ...prev, [key]: initial }));
      for (let i = initial.length; i < text.length; i += 1) {
        if (cancelled) return;
        setTyped((prev) => ({ ...prev, [key]: (prev[key] || "") + text[i] }));
        await sleep(CHAR_DELAY_MS);
      }
      setTypingSection(null);
    }
    (async () => {
      for (let i = 0; i < READING_SECTIONS.length; i += 1) {
        if (cancelled) return;
        const section = READING_SECTIONS[i];
        const raw = reading[section.key];
        const text = Array.isArray(raw) ? raw.map((v) => `• ${v}`).join("\n") : String(raw || "").trim();
        if (!text) continue;
        const fp = readingFingerprint(text);
        if (fp.length > 18 && seen.has(fp)) continue;
        if (fp.length > 18) seen.add(fp);
        await typeInto(String(section.key), section.title, text);
        if (i < READING_SECTIONS.length - 1) await sleep(SECTION_GAP_MS);
      }
    })();
    return () => { cancelled = true; };
  }, [reading, stage, tapToReveal]);

  const POSITION_LABELS = ["마음 깊은 원인", "감정 수용", "회복의 단서", "다음 행동"] as const;
  const POSITION_LABELS_SHORT = ["원인", "수용", "회복", "행동"] as const;

  return (
    <main
      className="relative min-h-[100dvh] overflow-x-hidden bg-[#fff7e6] px-0 py-0 text-stone-900"
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-95"
        style={{
          backgroundImage: "linear-gradient(115deg, rgba(255,252,239,0.9) 0%, rgba(255,245,216,0.82) 45%, rgba(255,225,168,0.66) 100%), url('/fuctionassets/healing.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(circle at 18% 12%, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0) 30%), radial-gradient(circle at 80% 8%, rgba(125,211,252,0.24) 0%, rgba(125,211,252,0) 28%), radial-gradient(circle at 52% 100%, rgba(251,191,36,0.32) 0%, rgba(251,191,36,0) 46%), linear-gradient(180deg, rgba(255,250,235,0.34) 0%, rgba(255,250,235,0.76) 100%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.18] mix-blend-multiply"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(120,83,30,0.18) 0px, rgba(120,83,30,0.18) 1px, transparent 1px, transparent 5px), repeating-linear-gradient(90deg, rgba(255,255,255,0.36) 0px, rgba(255,255,255,0.36) 1px, transparent 1px, transparent 7px)",
        }}
      />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1440px] flex-col px-4 py-5 md:px-8 md:py-7">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700/80">Sun Recovery Tarot</p>
            <h1 className="mt-1 font-serif text-[24px] font-semibold leading-tight text-amber-950 md:text-[32px]">태양 회복 타로</h1>
          </div>
          <button type="button" onClick={goHome} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-amber-200/70 bg-white/70 px-4 text-xs font-semibold text-amber-950 shadow-[0_12px_34px_rgba(180,120,35,0.14)] backdrop-blur-xl transition-colors hover:bg-white">
            <RotateCcw className="h-3.5 w-3.5" />홈
          </button>
        </header>
        <AnimatePresence mode="wait">
          {stage === "intro" ? (
            <motion.section key="intro" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.42 }} className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-0">
              <div className="max-w-[760px]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700/80">Therapeutic Tarot Room</p>
                <h2 className="mt-4 max-w-[720px] font-serif text-[34px] font-semibold leading-[1.14] text-amber-950 drop-shadow-[0_10px_30px_rgba(255,255,255,0.64)] sm:text-[44px] md:text-[64px]">
                  마음이 돌아올 자리를 <br className="hidden md:block" />조용히 밝혀드립니다
                </h2>
                <p className="mt-6 max-w-[640px] text-[16px] leading-8 text-stone-700 md:text-[18px]">
                  네 장의 카드는 상처의 원인, 감정의 수용, 회복의 단서, 오늘 가능한 한 걸음을 차례로 비춥니다. 해석은 단정하지 않고, 마음이 스스로를 다시 믿을 수 있는 방향으로 안내합니다.
                </p>
                <div className="mt-7 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
                  {["원인", "수용", "회복", "행동"].map((label) => (
                    <span key={label} className="rounded-full border border-amber-200/70 bg-white/65 px-4 py-2 text-center text-xs font-semibold text-amber-900 shadow-[0_8px_24px_rgba(180,120,35,0.1)] backdrop-blur-xl">{label}</span>
                  ))}
                </div>
                <button type="button" onClick={start} disabled={loading} className="group relative mt-8 inline-flex min-h-14 w-full items-center justify-center overflow-hidden rounded-full border border-amber-200/70 px-8 text-sm font-bold text-[#2d1b08] shadow-[0_24px_70px_rgba(217,144,42,0.24)] transition-all active:scale-[0.98] disabled:opacity-50 sm:w-auto" style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #FFF2BF 42%, #F7C35E 100%)" }}>
                  <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.5),transparent)] transition-transform duration-700 group-hover:translate-x-[120%]" />
                  <span className="relative flex items-center justify-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? "준비 중…" : "태양 리딩 시작"}</span>
                </button>
              </div>
              <div className="relative mx-auto w-full max-w-[420px]">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                  className="rounded-[32px] border border-white/80 bg-white/64 p-5 shadow-[0_28px_90px_rgba(180,120,35,0.22)] backdrop-blur-2xl"
                >
                  <div className="flex justify-center"><SunHero /></div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {POSITION_LABELS_SHORT.map((label, idx) => (
                      <div key={label} className="aspect-[3/4] rounded-2xl border border-amber-200/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.82),rgba(255,236,186,0.58))] p-2 shadow-inner">
                        <div className="flex h-full items-end justify-center rounded-xl border border-amber-100 bg-white/70 pb-2 text-[10px] font-semibold text-amber-900">{idx + 1}. {label}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.section>
          ) : null}
          {stage === "spread" ? (
            <motion.section key="spread" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.42 }} className="grid flex-1 gap-5 pb-5 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div className="flex min-h-[calc(100dvh-132px)] flex-col justify-center rounded-[30px] border border-white/80 bg-white/70 p-4 shadow-[0_30px_90px_rgba(180,120,35,0.18)] backdrop-blur-2xl md:p-6">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700/75">Solar Spread</p>
                    <h2 className="mt-1 font-serif text-[26px] font-semibold text-amber-950 md:text-[34px]">카드를 하나씩 열어보세요</h2>
                  </div>
                  <span className="rounded-full border border-amber-200/70 bg-amber-50/90 px-4 py-2 text-sm font-bold text-amber-800 shadow-sm">{revealedCount}&thinsp;/&thinsp;{SPREAD_CARD_COUNT}</span>
                </div>
                <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-amber-100">
                  <motion.div className="h-full rounded-full shadow-[0_0_18px_rgba(245,158,11,0.38)]" style={{ background: "linear-gradient(90deg, #67e8f9 0%, #fde68a 45%, #f59e0b 100%)" }} initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                </div>
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {Array.from({ length: SPREAD_CARD_COUNT }).map((_, idx) => {
                    const card = cards[idx];
                    const isFlipped = idx < revealedCount;
                    const enabled = canFlip(idx);
                    const isGlowing = glowingCard === idx;
                    return (
                      <div key={idx} style={{ perspective: "1200px" }} className="relative aspect-[3/4] min-h-[210px]">
                        <AnimatePresence>{isGlowing && (<motion.div initial={{ opacity: 0.7, scale: 0.95 }} animate={{ opacity: 0, scale: 1.28 }} exit={{}} transition={{ duration: 0.85, ease: "easeOut" }} className="pointer-events-none absolute inset-0 rounded-[24px] bg-amber-200 blur-2xl" style={{ zIndex: 30 }} />)}</AnimatePresence>
                        <motion.button type="button" onClick={() => flip(idx)} disabled={!enabled} whileHover={enabled ? { y: -8, filter: "drop-shadow(0 22px 34px rgba(217,144,42,0.3))" } : undefined} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="relative h-full w-full rounded-[24px]" style={{ transformStyle: "preserve-3d" }}>
                          <motion.div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }} animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.72, ease: [0.35, 0, 0.15, 1] }}>
                            <div className="absolute inset-0 rounded-[24px] shadow-[0_20px_48px_rgba(180,120,35,0.18)]" style={{ backfaceVisibility: "hidden" }}><CardBackFace />{enabled && (<motion.div className="absolute inset-0 rounded-[24px] ring-2 ring-amber-300/80" animate={{ opacity: [0.42, 1, 0.42] }} transition={{ duration: 2.2, repeat: Infinity }} />)}</div>
                            <div className="absolute inset-0 overflow-hidden rounded-[24px] shadow-[0_20px_56px_rgba(180,120,35,0.24)]" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                              {card?.cardId ? (<Image src={cardImageUrl(card)} alt={safeCardTitle(card, idx)} fill sizes="(max-width: 768px) 45vw, 260px" className="object-cover" unoptimized priority />) : (<div className="absolute inset-0 bg-amber-50" />)}
                              <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-16" style={{ background: "linear-gradient(0deg, rgba(255,251,235,0.97) 0%, rgba(255,251,235,0.72) 58%, transparent 100%)" }}>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">{POSITION_LABELS[idx]}</p>
                                <p className="mt-1 text-[13px] font-semibold leading-tight text-stone-800">{safeCardTitle(card, idx)}</p>
                              </div>
                            </div>
                          </motion.div>
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={fetchReading} disabled={loading || revealedCount < SPREAD_CARD_COUNT} className="group relative mt-6 w-full overflow-hidden rounded-full border border-amber-200/70 py-4 text-sm font-bold text-[#2d1b08] shadow-[0_20px_60px_rgba(217,144,42,0.2)] transition-all active:scale-[0.98] disabled:opacity-35" style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #FFF0B7 48%, #F4B84E 100%)" }}>
                  <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.48),transparent)] transition-transform duration-700 group-hover:translate-x-[120%]" />
                  <span className="relative flex items-center justify-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? "해석 중…" : "상담 리딩 열기"}</span>
                </button>
              </div>
              <aside className="rounded-[30px] border border-white/80 bg-white/64 p-5 shadow-[0_24px_70px_rgba(180,120,35,0.16)] backdrop-blur-2xl lg:min-h-[calc(100dvh-132px)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700/75">Current Focus</p>
                <h3 className="mt-3 font-serif text-2xl font-semibold text-amber-950">{revealedCount < SPREAD_CARD_COUNT ? POSITION_LABELS[revealedCount] : "상담 준비 완료"}</h3>
                <p className="mt-4 text-sm leading-7 text-stone-700">
                  카드를 여는 순서는 마음의 흐름과 같습니다. 급하게 결론으로 뛰어가지 않고, 지금 드러난 감정을 한 장씩 받아들이면 리딩이 더 선명해집니다.
                </p>
                <div className="mt-6 space-y-2">
                  {POSITION_LABELS.map((label, idx) => (
                    <div key={label} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm shadow-sm ${idx < revealedCount ? "border-amber-300/70 bg-amber-50/90 text-amber-900" : idx === revealedCount ? "border-teal-200/80 bg-teal-50/80 text-teal-900" : "border-stone-200/70 bg-white/60 text-stone-500"}`}>
                      <span>{idx + 1}. {label}</span>
                      <span className="text-xs font-semibold">{idx < revealedCount ? "완료" : idx === revealedCount ? "진행" : "대기"}</span>
                    </div>
                  ))}
                </div>
              </aside>
            </motion.section>
          ) : null}
          {stage === "result" ? (
            <motion.section key="result" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.42 }} className="grid flex-1 gap-5 pb-5 lg:grid-cols-[330px_minmax(0,1fr)]">
              <aside className="rounded-[30px] border border-white/80 bg-white/68 p-5 shadow-[0_24px_70px_rgba(180,120,35,0.16)] backdrop-blur-2xl lg:sticky lg:top-6 lg:max-h-[calc(100dvh-48px)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700/75">Reading Result</p>
                <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-amber-950">상담 리딩 결과</h2>
                <p className="mt-3 text-sm leading-7 text-stone-700">카드의 의미를 마음의 회복 언어로 다시 풀었습니다. 천천히 읽어도 괜찮습니다.</p>
                {cards.length > 0 && (
                  <div className="mt-6 grid grid-cols-4 gap-2 lg:grid-cols-2">
                    {cards.map((card, idx) => (
                      <div key={idx}>
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-amber-200/70 shadow-[0_16px_34px_rgba(180,120,35,0.18)]">{card?.cardId ? (<Image src={cardImageUrl(card)} alt={safeCardTitle(card, idx)} fill sizes="120px" className="object-cover" unoptimized />) : (<div className="absolute inset-0 bg-amber-50" />)}</div>
                        <p className="mt-1 text-center text-[10px] font-semibold text-amber-800">{POSITION_LABELS_SHORT[idx]}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6 grid gap-2">
                  <button type="button" onClick={share} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/90 px-4 text-sm font-bold text-amber-900 shadow-sm transition-colors hover:bg-white"><Share2 className="h-4 w-4" />공유</button>
                  <button type="button" onClick={start} className="min-h-11 rounded-full border border-stone-200 bg-white/70 px-4 text-sm font-bold text-stone-800 shadow-sm transition-colors hover:bg-white">다시 리딩하기</button>
                  <button type="button" onClick={goHome} className="min-h-11 rounded-full bg-stone-900 px-4 text-sm font-bold text-white shadow-[0_16px_34px_rgba(68,64,60,0.18)] transition-colors hover:bg-amber-950">다른 운세 보기</button>
                </div>
              </aside>
              <div className="min-w-0 rounded-[30px] border border-white/80 bg-white/72 p-4 shadow-[0_30px_90px_rgba(180,120,35,0.18)] backdrop-blur-2xl md:p-6">
                <div className="mb-5 rounded-3xl border border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(254,243,199,0.74),rgba(204,251,241,0.42))] p-5 shadow-inner">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700/78">Healing Counsel</p>
                  <h3 className="mt-2 font-serif text-2xl font-semibold text-amber-950">심리 상담사와 타로 마스터의 종합 해석</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-700">지금의 마음을 문제로 만들지 않고, 카드가 비춘 상징을 회복 가능한 언어로 정리합니다.</p>
                </div>
                <div className="space-y-3">
                  {READING_SECTIONS.map((section) => {
                    const value = typed[String(section.key)] || "";
                    if (!value) return null;
                    return (<ReadingCard key={String(section.key)} title={section.title} tone={section.tone} icon={section.icon} text={value} isTyping={typingSection === section.title} />);
                  })}
                  {engineMeta?.qualityEnhanced && (<p className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-xs font-semibold text-amber-800">엔진 품질 강화 상담 모드가 적용되었습니다.</p>)}
                </div>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}
