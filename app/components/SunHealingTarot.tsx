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
import { usePaymentProcessing } from "./PaymentProcessingContext";


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
const CHAR_DELAY_MS = 40;
const SECTION_GAP_MS = 800;
const INITIAL_TEXT_BURST_CHARS = 18;

const SHARE_FALLBACK_URL = "https://code-destiny.com";
const SHARE_TITLE = "태양 회복 타로";
const SHARE_TEXT_PREFIX = "태양 회복 타로 결과를 공유합니다.\n\n";

const READING_SECTIONS: ReadingSection[] = [
  { key: "consultingHighlights", title: "핵심 상담 하이라이트", tone: "focus", icon: Sparkles },
  { key: "opening", title: "상담 시작 안내", tone: "neutral", icon: Sparkles },
  { key: "hiddenTruth", title: "1. 마음 깊은 원인", tone: "focus", icon: Telescope },
  { key: "embracePain", title: "2. 감정 수용", tone: "warm", icon: HeartHandshake },
  { key: "silverLining", title: "3. 회복의 단서", tone: "focus", icon: Lightbulb },
  { key: "stepForward", title: "4. 다음 행동", tone: "warm", icon: Footprints },
  { key: "integrationMessage", title: "🌟 종합 풀이: 회복의 흐름", tone: "neutral", icon: Sparkles },
  { key: "actionPlan", title: "🌱 오늘 바로 해볼 수 있는 작은 실천", tone: "focus", icon: Sparkles },
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
  const borderC = tone === "warm" ? "border-orange-200" : tone === "focus" ? "border-amber-300" : "border-amber-100";
  const bgC = tone === "warm" ? "bg-orange-50/80" : tone === "focus" ? "bg-amber-50/90" : "bg-white/80";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38 }}
      className={`rounded-2xl border p-5 shadow-sm backdrop-blur-sm ${borderC} ${bgC}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-100">
          <Icon className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-[15px] font-semibold tracking-tight text-amber-900">{title}</h3>
            {isTyping ? (
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-amber-500"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            ) : null}
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-stone-700">{text}</p>
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
  const [tapToReveal, setTapToReveal] = useState(true);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [typingSection, setTypingSection] = useState<string | null>(null);
  const [glowingCard, setGlowingCard] = useState<number | null>(null);
  const { startProcessing, stopProcessing } = usePaymentProcessing();
  const abortRef = useRef<AbortController | null>(null);


  const progressPct = useMemo(() => clamp((revealedCount / SPREAD_CARD_COUNT) * 100, 0, 100), [revealedCount]);

  const goHome = useCallback(() => {
    window.location.assign("/");
  }, []);

  const start = useCallback(async () => {
    startProcessing("신비로운 기운으로 타로 카드를 준비하고 있습니다...");
    setLoading(true);
    setReading(null);
    setConsultingHighlights([]);
    setEngineMeta(null);
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
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error(error);
      alert("카드를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
      stopProcessing();
    }
  }, [startProcessing, stopProcessing]);


  const canFlip = useCallback((idx: number) => idx === revealedCount && idx < SPREAD_CARD_COUNT && stage === "spread" && !loading, [loading, revealedCount, stage]);

  const flip = useCallback((idx: number) => {
    if (!canFlip(idx)) return;
    setGlowingCard(idx);
    setRevealedCount((v) => v + 1);
    setTimeout(() => setGlowingCard(null), 1000);
  }, [canFlip]);

  const fetchReading = useCallback(async () => {
    if (revealedCount < SPREAD_CARD_COUNT || cards.length !== SPREAD_CARD_COUNT) return;
    
    startProcessing("타로 카드의 깊은 상징을 분석하여 회복의 메시지를 구성하고 있습니다...");
    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const payloadCards = cards.map((c) => ({ cardId: c.cardId, position: c.position, orientation: c.orientation }));
      const res = await fetch("/api/tarot/reading", {
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
      setTapToReveal(true);
      setTyped({});
      setTypingSection(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error(error);
      alert("해석을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
      stopProcessing();
    }
  }, [cards, revealedCount, startProcessing, stopProcessing]);


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
      className="min-h-[100dvh] overflow-x-hidden px-4 py-8 text-stone-900"
      style={{ background: "linear-gradient(180deg, #FFFBF0 0%, #FFF8E1 40%, #FFFDE7 100%)" }}
    >
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(ellipse 75% 28% at 50% 0%, #FDE68A55 0%, transparent 70%)", zIndex: 0 }} />
      <div className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 blur-[70px] opacity-25" style={{ width: 320, height: 180, background: "#FCD34D", borderRadius: "50%", zIndex: 0 }} />
      <div className="relative z-10 mx-auto w-full max-w-[600px]">
        <header className="mb-8 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.24em] text-amber-500 uppercase">Healing Tarot Session</p>
            <h1 className="mt-1.5 font-serif text-[26px] font-semibold leading-tight text-amber-900">태양 회복 타로</h1>
            <p className="mt-1.5 text-sm leading-6 text-stone-600">심리상담가의 시선으로 마음의 패턴을 읽고, 오늘 실행 가능한 회복 행동까지 안내합니다.</p>
          </div>
          <button type="button" onClick={goHome} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-xs font-medium text-stone-600 shadow-sm hover:bg-amber-50 hover:text-amber-800 transition-colors">
            <RotateCcw className="h-3.5 w-3.5" />홈
          </button>
        </header>
        <AnimatePresence mode="wait">
          {stage === "intro" ? (
            <motion.section key="intro" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.42 }} className="space-y-7">
              <div className="flex justify-center py-4"><SunHero /></div>
              <div className="rounded-2xl border border-amber-200 bg-white/75 p-6 shadow-sm backdrop-blur-sm">
                <h2 className="font-serif text-xl font-semibold text-amber-900">마음을 열어볼 준비가 되셨나요?</h2>
                <p className="mt-3 text-sm leading-7 text-stone-700">4장의 카드를 순서대로 열면, 원인 파악부터 실행 계획까지<br className="hidden sm:block" />태양의 따스한 빛으로 당신의 내면을 비춥니다.</p>
                <div className="mt-4 flex flex-wrap gap-2">{["원인 파악", "감정 수용", "회복 단서", "실행 계획"].map((label, i) => (<span key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{label}</span>))}</div>
              </div>
              <button type="button" onClick={start} disabled={loading} className="group relative w-full overflow-hidden rounded-2xl py-4 text-sm font-bold text-white shadow-lg shadow-amber-200 disabled:opacity-50 transition-all active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300" style={{ background: "radial-gradient(circle at 50% 50%, #fff, transparent 60%)" }} />
                <span className="relative flex items-center justify-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? "준비 중…" : "리딩 시작하기"}</span>
              </button>
            </motion.section>
          ) : null}
          {stage === "spread" ? (
            <motion.section key="spread" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.42 }} className="space-y-5">
              <div className="rounded-2xl border border-amber-200 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-base font-semibold text-amber-900">순서대로 카드를 열어보세요</h2>
                  <span className="text-xs font-semibold text-amber-600">{revealedCount}&thinsp;/&thinsp;{SPREAD_CARD_COUNT}</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-100">
                  <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #F59E0B 0%, #D97706 100%)" }} initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: SPREAD_CARD_COUNT }).map((_, idx) => {
                  const card = cards[idx];
                  const isFlipped = idx < revealedCount;
                  const enabled = canFlip(idx);
                  const isGlowing = glowingCard === idx;
                  return (
                    <div key={idx} style={{ perspective: "1200px" }} className="relative aspect-[3/4]">
                      <AnimatePresence>{isGlowing && (<motion.div initial={{ opacity: 0.65, scale: 0.95 }} animate={{ opacity: 0, scale: 1.25 }} exit={{}} transition={{ duration: 0.85, ease: "easeOut" }} className="absolute inset-0 rounded-xl blur-2xl pointer-events-none" style={{ background: "#FCD34D", zIndex: 30 }} />)}</AnimatePresence>
                      <motion.button type="button" onClick={() => flip(idx)} disabled={!enabled} whileHover={enabled ? { y: -7, filter: "drop-shadow(0 8px 24px rgba(245,158,11,0.45))" } : undefined} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="relative w-full h-full rounded-xl" style={{ transformStyle: "preserve-3d" }}>
                        <motion.div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }} animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.72, ease: [0.35, 0, 0.15, 1] }}>
                          <div className="absolute inset-0 rounded-xl shadow-md" style={{ backfaceVisibility: "hidden" }}><CardBackFace />{enabled && (<motion.div className="absolute inset-0 rounded-xl ring-2 ring-amber-300/70" animate={{ opacity: [0.45, 1, 0.45] }} transition={{ duration: 2.2, repeat: Infinity }} />)}</div>
                          <div className="absolute inset-0 rounded-xl overflow-hidden shadow-md" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                            {card?.cardId ? (<Image src={cardImageUrl(card)} alt={safeCardTitle(card, idx)} fill sizes="(max-width: 768px) 45vw, 260px" className="object-cover" unoptimized priority />) : (<div className="absolute inset-0 bg-amber-50" />)}
                            <div className="absolute inset-x-0 bottom-0 px-2 pt-10 pb-2" style={{ background: "linear-gradient(0deg, rgba(255,251,235,0.97) 0%, rgba(255,251,235,0.5) 50%, transparent 100%)" }}>
                              <p className="text-[9px] font-semibold text-amber-600 tracking-widest uppercase">{POSITION_LABELS[idx]}</p>
                              <p className="mt-0.5 text-[11px] font-semibold text-stone-800 leading-tight">{safeCardTitle(card, idx)}</p>
                            </div>
                          </div>
                        </motion.div>
                      </motion.button>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={fetchReading} disabled={loading || revealedCount < SPREAD_CARD_COUNT} className="group relative w-full overflow-hidden rounded-2xl py-4 text-sm font-bold text-white shadow-md shadow-amber-200 disabled:opacity-35 transition-all active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300" style={{ background: "radial-gradient(circle at 50% 50%, #fff, transparent 60%)" }} />
                <span className="relative flex items-center justify-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? "해석 중…" : "카드 해석받기"}</span>
              </button>
            </motion.section>
          ) : null}
          {stage === "result" ? (
            <motion.section key="result" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.42 }} className="space-y-5">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
                <div><h2 className="font-serif text-lg font-semibold text-amber-900">상담 리딩 결과</h2><p className="mt-1 text-xs text-stone-500">천천히 읽고, 한 가지 행동부터 실행해 보세요.</p></div>
                <button type="button" onClick={share} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"><Share2 className="h-3.5 w-3.5" />공유</button>
              </div>
              {cards.length > 0 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {cards.map((card, idx) => (
                    <div key={idx} className="flex-shrink-0 w-[60px]">
                      <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden border border-amber-200 shadow-sm">{card?.cardId ? (<Image src={cardImageUrl(card)} alt={safeCardTitle(card, idx)} fill sizes="60px" className="object-cover" unoptimized />) : (<div className="absolute inset-0 bg-amber-50" />)}</div>
                      <p className="mt-1 text-center text-[9px] font-medium text-amber-600">{POSITION_LABELS_SHORT[idx]}</p>
                    </div>
                  ))}
                </div>
              )}
              {tapToReveal ? (
                <motion.button type="button" onClick={() => setTapToReveal(false)} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} className="w-full rounded-2xl border border-amber-200 bg-white/80 p-8 text-center shadow-sm backdrop-blur-sm">
                  <div className="flex justify-center mb-3"><motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.65, 1, 0.65] }} transition={{ duration: 2.6, repeat: Infinity }}><Sparkles className="h-7 w-7 text-amber-500" /></motion.div></div>
                  <p className="font-serif text-lg font-semibold text-amber-900">화면을 눌러 리딩 열기</p>
                  <p className="mt-2 text-sm text-stone-500">태양의 메시지가 순서대로 펼쳐집니다.</p>
                </motion.button>
              ) : (
                <div className="space-y-3">
                  {READING_SECTIONS.map((section) => {
                    const value = typed[String(section.key)] || "";
                    if (!value) return null;
                    return (<ReadingCard key={String(section.key)} title={section.title} tone={section.tone} icon={section.icon} text={value} isTyping={typingSection === section.title} />);
                  })}
                  {engineMeta?.qualityEnhanced && (<p className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-700">엔진 품질 강화 상담 모드가 적용되었습니다.</p>)}
                  <div className="pt-4 flex flex-col gap-3">
                    <button type="button" onClick={start} className="w-full rounded-2xl border border-amber-200 bg-white/70 py-4 text-sm font-bold text-amber-900 shadow-sm hover:bg-amber-50 transition-all active:scale-[0.98]">다시 복채 던지기</button>
                    <button type="button" onClick={goHome} className="w-full rounded-2xl bg-stone-800 py-4 text-sm font-bold text-white shadow-md hover:bg-stone-900 transition-all active:scale-[0.98]">다른 운세 보러가기</button>
                  </div>
                </div>
              )}
            </motion.section>
          ) : null}
        </AnimatePresence>
      </div>
      <footer className="mt-12 text-center pb-8"><p className="text-[10px] text-stone-400 font-medium tracking-widest uppercase">© Code Destiny • Sun Recovery Tarot</p></footer>
    </main>
  );
}
