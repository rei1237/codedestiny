"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  Clipboard,
  Loader2,
  RotateCcw,
  Share2,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSunHealingTarotCopy, type SunHealingTarotCopy } from "./_lib/sun-healing-tarot-copy";


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
  subtitle?: string;
  oneLineMessage?: string;
  sunLine?: string;
  summary?: string;
  opening?: string;
  cardDeepDive?: string[];
  cardReadings?: SunRecoveryCardReadingDto[];
  hiddenTruth?: string;
  embracePain?: string;
  silverLining?: string;
  stepForward?: string;
  storyFlow?: string;
  recoveryRoutines?: RecoveryRoutineDto[];
  affirmation?: string;
  notice?: string;
  integrationMessage?: string;
  consultingHighlights?: string[];
  actionPlan?: string[];
};

type SunRecoveryCardReadingDto = {
  position?: string;
  positionLabel?: string;
  cardName?: string;
  cardNameEn?: string;
  orientation?: TarotOrientation | string;
  orientationLabel?: string;
  keywords?: string[];
  shortMessage?: string;
  meaning?: string;
  shadow?: string;
  recoveryAdvice?: string;
};

type RecoveryRoutineDto = {
  title?: string;
  description?: string;
  action?: string;
  timeGuide?: string;
};

type EngineMetaDto = {
  qualityEnhanced?: boolean;
  source?: string;
  spreadType?: string;
  cardCount?: number;
};

type ReadingFetchResult = {
  reading: HealingReadingDto | null;
  highlights: string[];
  engineMeta: EngineMetaDto | null;
};

type Stage = "intro" | "spread" | "result";

type SectionTone = "neutral" | "warm" | "focus";

const SPREAD_TYPE = "healing_rising_four_card" as const;
const SPREAD_CARD_COUNT = 4 as const;
const READING_ENDPOINT = "/api/tarot/reading";
const API_TIMEOUT_MS = 30000;
// lib/tarot/spreads.mjs의 healing_rising_four_card 포지션 키와 동일해야 한다.
const HEALING_POSITIONS = ["hidden_truth", "embrace_pain", "silver_lining", "step_forward"] as const;

const SHARE_FALLBACK_URL = "https://code-destiny.com";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeCardTitle(copy: SunHealingTarotCopy, card?: TarotCardDto, idx?: number) {
  const base = (card?.nameKr || card?.name || "").trim();
  if (!base) return typeof idx === "number" ? copy.cardFallbackTitle(idx) : "";
  return `${base} (${copy.orientationLabel(card?.orientation)})`;
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

// 카드 표기명은 lib/tarot/tarot-cards.mjs(nameKo/nameEn)와 동일해야 한다.
// (엔진 직접 import는 rich-card-meanings 대용량 모듈이 클라 번들에 딸려와 금지)
const MAJOR_CARD_NAMES: Record<string, [string, string]> = {
  M00: ["바보", "The Fool"], M01: ["마법사", "The Magician"], M02: ["여사제", "The High Priestess"],
  M03: ["여황제", "The Empress"], M04: ["황제", "The Emperor"], M05: ["교황", "The Hierophant"],
  M06: ["연인", "The Lovers"], M07: ["전차", "The Chariot"], M08: ["힘", "Strength"],
  M09: ["은둔자", "The Hermit"], M10: ["운명의 수레바퀴", "Wheel of Fortune"], M11: ["정의", "Justice"],
  M12: ["매달린 사람", "The Hanged Man"], M13: ["죽음", "Death"], M14: ["절제", "Temperance"],
  M15: ["악마", "The Devil"], M16: ["탑", "The Tower"], M17: ["별", "The Star"],
  M18: ["달", "The Moon"], M19: ["태양", "The Sun"], M20: ["심판", "Judgement"], M21: ["세계", "The World"],
};
const SUIT_NAMES: Record<string, [string, string]> = {
  W: ["완드", "Wands"], C: ["컵", "Cups"], S: ["소드", "Swords"], P: ["펜타클", "Pentacles"],
};
const RANK_NAMES: [string, string][] = [
  ["에이스", "Ace"], ["투", "Two"], ["쓰리", "Three"], ["포", "Four"], ["파이브", "Five"],
  ["식스", "Six"], ["세븐", "Seven"], ["에잇", "Eight"], ["나인", "Nine"], ["텐", "Ten"],
  ["페이지", "Page"], ["나이트", "Knight"], ["퀸", "Queen"], ["킹", "King"],
];

function cardNamesOf(cardId: string): [string, string] {
  const major = MAJOR_CARD_NAMES[cardId];
  if (major) return major;
  const suit = SUIT_NAMES[cardId[0]];
  const rank = RANK_NAMES[Number(cardId.slice(1)) - 1];
  if (suit && rank) return [`${suit[0]} ${rank[0]}`, `${rank[1]} of ${suit[1]}`];
  return [cardId, cardId];
}

function drawHealingCards(): TarotCardDto[] {
  const pool = Object.keys(TAROT_IMAGE_MAP);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return HEALING_POSITIONS.map((position, idx) => {
    const cardId = pool[idx];
    const [nameKr, name] = cardNamesOf(cardId);
    return {
      cardId,
      name,
      nameKr,
      position,
      orientation: Math.random() < 0.5 ? "reversed" : "upright",
    };
  });
}

function SunHero() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      <m.div
        className="absolute rounded-full"
        style={{ width: 220, height: 220, background: "radial-gradient(circle, #F59E0B26 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <m.div
        className="absolute rounded-full border-2 border-amber-300/45"
        style={{ width: 168, height: 168 }}
        animate={{ scale: [1.02, 1.1, 1.02], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />
      <m.div
        className="absolute rounded-full border-2 border-amber-400/55"
        style={{ width: 110, height: 110 }}
        animate={{ scale: [1, 1.07, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
      <m.svg
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
      </m.svg>
    </div>
  );
}

function CardBackFace({ copy }: { copy: SunHealingTarotCopy }) {
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
      <p className="mt-2 text-[8px] tracking-[0.25em] text-amber-600/70 font-medium uppercase">{copy.cardBackLabel}</p>
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
    <m.section
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
              <m.span
                className="h-1.5 w-1.5 rounded-full bg-amber-500"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            ) : null}
          </div>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-8 text-stone-700">{text}</p>
        </div>
      </div>
    </m.section>
  );
}

function normalizeReadingCards(reading: HealingReadingDto | null, cards: TarotCardDto[]) {
  const structured = Array.isArray(reading?.cardReadings) ? reading.cardReadings : [];
  if (structured.length) return structured.slice(0, SPREAD_CARD_COUNT);
  return cards.slice(0, SPREAD_CARD_COUNT).map((card, idx) => ({
    positionLabel: ["마음이 지친 자리", "감정의 온도", "회복의 단서", "오늘의 회복 행동"][idx],
    cardName: card.nameKr || card.name || `카드 ${idx + 1}`,
    orientation: card.orientation === "reversed" ? "reversed" : "upright",
    orientationLabel: card.orientation === "reversed" ? "역방향" : "정방향",
    keywords: [],
    shortMessage: "",
    meaning: Array.isArray(reading?.cardDeepDive) ? reading.cardDeepDive[idx] : "",
    shadow: "",
    recoveryAdvice: "",
  }));
}

function orientationLabelOf(value?: string) {
  return value === "reversed" ? "역방향" : "정방향";
}

function ResultCardSummary({ item, idx, card, copy }: { item: SunRecoveryCardReadingDto; idx: number; card?: TarotCardDto; copy: SunHealingTarotCopy }) {
  const orientation = copy.orientationLabel(item.orientation || card?.orientation);
  const keywords = Array.isArray(item.keywords) ? item.keywords.slice(0, 3) : [];
  return (
    <article className="rounded-lg border border-amber-200/70 bg-white/82 p-3 shadow-[0_12px_30px_rgba(180,120,35,0.12)]">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-amber-100 bg-amber-50">
        {card?.cardId ? (<Image src={cardImageUrl(card)} alt={safeCardTitle(copy, card, idx)} fill sizes="120px" className="object-cover" unoptimized />) : null}
      </div>
      <p className="mt-3 text-[11px] font-semibold text-teal-700">{idx + 1}. {copy.positionLabels[idx]}</p>
      <h4 className="mt-1 text-sm font-bold leading-tight text-amber-950">{item.cardName}</h4>
      <p className="mt-1 text-xs font-semibold text-stone-500">{orientation}</p>
      {keywords.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {keywords.map((keyword) => (
            <span key={keyword} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">{keyword}</span>
          ))}
        </div>
      ) : null}
      {item.shortMessage ? <p className="mt-3 text-xs leading-5 text-stone-700">{item.shortMessage}</p> : null}
    </article>
  );
}

function ResultDetailCard({ item, idx, copy }: { item: SunRecoveryCardReadingDto; idx: number; copy: SunHealingTarotCopy }) {
  const orientation = copy.orientationLabel(item.orientation);
  const keywords = Array.isArray(item.keywords) ? item.keywords.slice(0, 3) : [];
  return (
    <article className="rounded-lg border border-white/80 bg-white/86 p-5 shadow-[0_18px_52px_rgba(180,120,35,0.14)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-teal-700">{idx + 1}. {copy.positionLabels[idx]}</p>
          <h3 className="mt-1 font-serif text-xl font-semibold leading-tight text-amber-950">{item.cardName}</h3>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{orientation}</span>
      </div>
      {keywords.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <span key={keyword} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{keyword}</span>
          ))}
        </div>
      ) : null}
      {item.meaning ? (
        <div className="mt-5">
          <p className="text-xs font-bold tracking-normal text-amber-700">{copy.meaningLabel}</p>
          <p className="mt-2 text-sm leading-7 text-stone-700">{item.meaning}</p>
        </div>
      ) : null}
      {item.shadow ? (
        <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50/70 p-4">
          <p className="text-xs font-bold text-rose-700">{copy.shadowLabel}</p>
          <p className="mt-2 text-sm leading-7 text-stone-700">{item.shadow}</p>
        </div>
      ) : null}
      {item.recoveryAdvice ? (
        <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50/70 p-4">
          <p className="text-xs font-bold text-teal-700">{copy.recoveryActionLabel}</p>
          <p className="mt-2 text-sm leading-7 text-stone-700">{item.recoveryAdvice}</p>
        </div>
      ) : null}
    </article>
  );
}

function RoutineCard({ item }: { item: RecoveryRoutineDto }) {
  return (
    <article className="rounded-lg border border-amber-200/70 bg-amber-50/82 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-serif text-lg font-semibold leading-tight text-amber-950">{item.title}</h4>
        {item.timeGuide ? <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-800">{item.timeGuide}</span> : null}
      </div>
      {item.description ? <p className="mt-2 text-sm leading-6 text-stone-700">{item.description}</p> : null}
      {item.action ? <p className="mt-3 text-sm font-semibold leading-6 text-stone-800">{item.action}</p> : null}
    </article>
  );
}

function compactHealingPromptText(value: unknown, fallback = "") {
  const text = Array.isArray(value)
    ? value.map((line) => String(line || "").trim()).filter(Boolean).join(" / ")
    : String(value || "").trim();
  const compacted = text.replace(/\s+/g, " ").trim();
  return compacted ? compacted.slice(0, 520) : fallback;
}

function buildSunHealingAiPromptText(args: {
  reading: HealingReadingDto | null;
  cards: TarotCardDto[];
  resultCards: SunRecoveryCardReadingDto[];
  resultRoutines: RecoveryRoutineDto[];
}) {
  const { reading, cards, resultCards, resultRoutines } = args;
  if (!reading) return "";

  const cardLines = resultCards.slice(0, SPREAD_CARD_COUNT).map((item, idx) => {
    const card = cards[idx];
    const position = compactHealingPromptText(item.positionLabel || item.position || card?.position, `자리 ${idx + 1}`);
    const cardName = compactHealingPromptText(item.cardName || card?.nameKr || card?.name, `카드 ${idx + 1}`);
    const orientation = compactHealingPromptText(item.orientationLabel || orientationLabelOf(String(item.orientation || card?.orientation || "upright")));
    const keywords = Array.isArray(item.keywords) ? item.keywords.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 4).join(", ") : "";
    const meaning = compactHealingPromptText(item.meaning || item.shortMessage);
    const recoveryAdvice = compactHealingPromptText(item.recoveryAdvice || item.shadow);
    return `${idx + 1}. ${position}: ${cardName} ${orientation}${keywords ? ` | 키워드: ${keywords}` : ""}${meaning ? ` | 메시지: ${meaning}` : ""}${recoveryAdvice ? ` | 회복 조언: ${recoveryAdvice}` : ""}`;
  });

  const routineLines = resultRoutines.slice(0, 3).map((item, idx) => {
    const title = compactHealingPromptText(item.title, `회복 루틴 ${idx + 1}`);
    const action = compactHealingPromptText(item.action || item.description);
    const timeGuide = compactHealingPromptText(item.timeGuide);
    return `${idx + 1}. ${title}${timeGuide ? ` (${timeGuide})` : ""}${action ? ` - ${action}` : ""}`;
  });

  const highlightLines = Array.isArray(reading.consultingHighlights)
    ? reading.consultingHighlights.map((line) => compactHealingPromptText(line)).filter(Boolean).slice(0, 4)
    : [];

  return [
    "태양 회복 타로에서 받은 아래 흐름을 바탕으로, 지금 내 마음이 다시 온기를 되찾는 길을 깊게 봐주세요.",
    "",
    "따뜻하지만 단정한 타로 리더의 상담처럼 말해주세요. 단정적인 예언보다 현재의 감정, 회복 방향, 오늘부터 가능한 선택을 중심으로 읽어주세요.",
    "",
    `[오늘의 태양 문장] ${compactHealingPromptText(reading.oneLineMessage || reading.sunLine || reading.summary, "아직 한 문장 메시지가 비어 있습니다.")}`,
    `[처음 비춘 장면] ${compactHealingPromptText(reading.opening || reading.subtitle, "마음이 쉬어 갈 자리를 먼저 짚어주세요.")}`,
    highlightLines.length ? `[상담의 빛] ${highlightLines.join(" / ")}` : "",
    "",
    "[펼쳐진 카드]",
    cardLines.join("\n"),
    "",
    `[종합 흐름] ${compactHealingPromptText(reading.storyFlow || reading.integrationMessage, "카드들이 함께 가리키는 회복의 흐름을 연결해 주세요.")}`,
    routineLines.length ? `[오늘의 회복 루틴]\n${routineLines.join("\n")}` : "",
    reading.affirmation ? `[마음에 남은 문장] ${compactHealingPromptText(reading.affirmation)}` : "",
    "",
    "이 흐름에서 내가 붙잡고 있는 감정의 이름, 놓아도 되는 부담, 다시 따뜻해지는 작은 행동을 차례로 봐주세요. 마지막에는 오늘 밤 바로 해볼 수 있는 3문장 회복 의식을 건네주세요.",
  ].filter(Boolean).join("\n");
}

export default function SunHealingTarot() {
  const copy = useSunHealingTarotCopy();
  const [stage, setStage] = useState<Stage>("intro");
  const [cards, setCards] = useState<TarotCardDto[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<HealingReadingDto | null>(null);
  const [consultingHighlights, setConsultingHighlights] = useState<string[]>([]);
  const [engineMeta, setEngineMeta] = useState<EngineMetaDto | null>(null);
  const [glowingCard, setGlowingCard] = useState<number | null>(null);
  const [aiPromptCopyStatus, setAiPromptCopyStatus] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const readingPromiseRef = useRef<Promise<ReadingFetchResult> | null>(null);


  const progressPct = useMemo(() => clamp((revealedCount / SPREAD_CARD_COUNT) * 100, 0, 100), [revealedCount]);

  const goHome = useCallback(() => {
    window.location.assign("/");
  }, []);

  const requestReading = useCallback(async (cardsToRead: TarotCardDto[]): Promise<ReadingFetchResult> => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const timeoutId = window.setTimeout(() => ac.abort(), API_TIMEOUT_MS);
    try {
      const payloadCards = cardsToRead.map((c) => ({ cardId: c.cardId, position: c.position, orientation: c.orientation }));
      const res = await fetch(READING_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "healing", spreadType: SPREAD_TYPE, cards: payloadCards }),
        signal: ac.signal,
      });
      if (res.status === 401 || res.status === 403) throw new Error("LOGIN_REQUIRED");
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.message || "reading failed");
      const nextReading = (data?.reading || null) as HealingReadingDto | null;
      const highlights = Array.isArray(data?.consultingHighlights) ? data.consultingHighlights.map((line: unknown) => String(line || "").trim()).filter(Boolean).slice(0, 4) : [];
      if (nextReading) nextReading.consultingHighlights = highlights;
      return {
        reading: nextReading,
        highlights,
        engineMeta: data?.engineMeta && typeof data.engineMeta === "object" ? (data.engineMeta as EngineMetaDto) : null,
      };
    } finally {
      window.clearTimeout(timeoutId);
      if (abortRef.current === ac) abortRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setReading(null);
    setConsultingHighlights([]);
    setEngineMeta(null);
    setAiPromptCopyStatus("");
    setRevealedCount(0);
    abortRef.current?.abort();
    // 카드 뽑기는 서버 왕복 없이 즉시 처리하고, 해석은 카드를 뒤집는 동안 미리 받아 둔다.
    const drawn = drawHealingCards();
    setCards(drawn);
    setStage("spread");
    const prefetch = requestReading(drawn);
    prefetch.catch(() => {});
    readingPromiseRef.current = prefetch;
  }, [requestReading]);


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
    setAiPromptCopyStatus("");
    try {
      const pending = readingPromiseRef.current;
      readingPromiseRef.current = null;
      let result: ReadingFetchResult;
      try {
        result = pending ? await pending : await requestReading(cards);
      } catch (error) {
        if (error instanceof Error && error.message === "LOGIN_REQUIRED") throw error;
        // 프리페치가 실패했으면 한 번 새로 요청한다.
        result = await requestReading(cards);
      }
      setReading(result.reading);
      setConsultingHighlights(result.highlights);
      setEngineMeta(result.engineMeta);
      setStage("result");
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message === "LOGIN_REQUIRED") {
        alert(copy.loginRequiredAlert);
      } else if (error instanceof DOMException && error.name === "AbortError") {
        alert(copy.delayedAlert);
      } else {
        alert(copy.fetchErrorAlert);
      }
    } finally {
      setLoading(false);
    }
  }, [cards, copy, requestReading, revealedCount]);


  const share = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : SHARE_FALLBACK_URL;
    const firstLine = String(reading?.oneLineMessage || reading?.sunLine || "").trim();
    const highlightText = consultingHighlights.length ? `\n핵심 회복 메시지\n${consultingHighlights.slice(0, 2).map((line) => `• ${line}`).join("\n")}\n` : "";
    const text = `${copy.shareTextPrefix}${firstLine ? `${firstLine}\n` : ""}${highlightText}\n${url}`;
    try {
      const nav = navigator as Navigator & { share?: (data: object) => Promise<void> };
      if (nav.share) {
        await nav.share({ title: copy.shareTitle, text, url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
      alert(copy.linkCopiedAlert);
    } catch {
      alert(copy.shareUnsupportedAlert);
    }
  }, [consultingHighlights, copy, reading]);

  const POSITION_LABELS = copy.positionLabels;
  const POSITION_LABELS_SHORT = copy.positionLabelsShort;
  const resultCards = useMemo(() => normalizeReadingCards(reading, cards), [reading, cards]);
  const resultRoutines = useMemo(() => {
    if (Array.isArray(reading?.recoveryRoutines) && reading.recoveryRoutines.length) return reading.recoveryRoutines.slice(0, 3);
    return (reading?.actionPlan || []).slice(0, 3).map((line) => ({ title: line.split(":")[0] || "회복 루틴", action: line.includes(":") ? line.split(":").slice(1).join(":").trim() : line, timeGuide: "10분" }));
  }, [reading]);
  const resultStory = String(reading?.storyFlow || reading?.integrationMessage || "").trim();
  const resultSunLine = String(reading?.oneLineMessage || reading?.sunLine || reading?.summary || "").trim();
  const aiPromptText = useMemo(() => buildSunHealingAiPromptText({ reading, cards, resultCards, resultRoutines }), [cards, reading, resultCards, resultRoutines]);

  const copyAiPrompt = useCallback(async () => {
    if (!aiPromptText) return;
    try {
      await navigator.clipboard.writeText(aiPromptText);
      setAiPromptCopyStatus(copy.promptCopiedStatus);
      return;
    } catch {}
    try {
      const textarea = document.createElement("textarea");
      textarea.value = aiPromptText;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setAiPromptCopyStatus(copy.promptCopiedStatus);
    } catch {
      setAiPromptCopyStatus(copy.promptCopyManualStatus);
    }
  }, [aiPromptText, copy]);

  useEffect(() => {
    setAiPromptCopyStatus("");
  }, [aiPromptText]);

  return (
    <main
      className="relative overflow-x-hidden bg-[#fff7e6] px-0 py-0 text-stone-900"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{
          backgroundImage: "linear-gradient(115deg, rgba(255,252,239,0.5) 0%, rgba(255,245,216,0.42) 45%, rgba(255,225,168,0.3) 100%), url('/fuctionassets/healing.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at 18% 12%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 32%), radial-gradient(circle at 80% 8%, rgba(125,211,252,0.24) 0%, rgba(125,211,252,0) 28%), radial-gradient(circle at 52% 100%, rgba(251,191,36,0.32) 0%, rgba(251,191,36,0) 46%), linear-gradient(180deg, rgba(255,250,235,0.18) 0%, rgba(255,250,235,0.5) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-multiply"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(120,83,30,0.18) 0px, rgba(120,83,30,0.18) 1px, transparent 1px, transparent 5px), repeating-linear-gradient(90deg, rgba(255,255,255,0.36) 0px, rgba(255,255,255,0.36) 1px, transparent 1px, transparent 7px)",
        }}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col px-4 py-5 md:px-8 md:py-7">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-amber-700/80">{copy.headerEyebrow}</p>
            <h2 className="mt-1 font-serif text-[24px] font-semibold leading-tight text-amber-950 md:text-[32px]">{copy.headerTitle}</h2>
          </div>
          <button type="button" onClick={goHome} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-amber-200/70 bg-white/70 px-4 text-xs font-semibold text-amber-950 shadow-[0_12px_34px_rgba(180,120,35,0.14)] backdrop-blur-xl transition-colors hover:bg-white">
            <RotateCcw className="h-3.5 w-3.5" />{copy.homeButton}
          </button>
        </header>
        <AnimatePresence mode="wait">
          {stage === "intro" ? (
            <m.section key="intro" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.42 }} className="grid items-center gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="max-w-[760px]">
                <p className="text-xs font-semibold tracking-[0.18em] text-teal-700/80">{copy.introEyebrow}</p>
                <h2 className="mt-4 max-w-[720px] font-serif text-[34px] font-semibold leading-[1.14] text-amber-950 drop-shadow-[0_10px_30px_rgba(255,255,255,0.64)] sm:text-[42px] md:text-[52px]">
                  {copy.introHeadingLine1} <br className="hidden md:block" />{copy.introHeadingLine2}
                </h2>
                <p className="mt-6 max-w-[640px] text-[16px] leading-8 text-stone-700 md:text-[18px]">
                  {copy.introDescription}
                </p>
                <div className="mt-7 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
                  {POSITION_LABELS_SHORT.map((label) => (
                    <span key={label} className="rounded-full border border-amber-200/70 bg-white/65 px-4 py-2 text-center text-xs font-semibold text-amber-900 shadow-[0_8px_24px_rgba(180,120,35,0.1)] backdrop-blur-xl">{label}</span>
                  ))}
                </div>
                <button type="button" onClick={start} disabled={loading} className="group relative mt-8 inline-flex min-h-14 w-full items-center justify-center overflow-hidden rounded-full border border-amber-200/70 px-8 text-sm font-bold text-[#2d1b08] shadow-[0_24px_70px_rgba(217,144,42,0.24)] transition-all active:scale-[0.98] disabled:opacity-50 sm:w-auto" style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #FFF2BF 42%, #F7C35E 100%)" }}>
                  <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.5),transparent)] transition-transform duration-700 group-hover:translate-x-[120%]" />
                  <span className="relative flex items-center justify-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? copy.preparingLabel : copy.startButton}</span>
                </button>
              </div>
              <div className="relative mx-auto w-full max-w-[420px]">
                <m.div
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
                </m.div>
              </div>
            </m.section>
          ) : null}
          {stage === "spread" ? (
            <m.section key="spread" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.42 }} className="grid flex-1 gap-5 pb-5 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div className="flex min-h-[calc(100dvh-132px)] flex-col justify-center rounded-[30px] border border-white/80 bg-white/70 p-4 shadow-[0_30px_90px_rgba(180,120,35,0.18)] backdrop-blur-2xl md:p-6">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-teal-700/75">{copy.spreadEyebrow}</p>
                    <h2 className="mt-1 font-serif text-[26px] font-semibold text-amber-950 md:text-[34px]">{copy.spreadHeading}</h2>
                  </div>
                  <span className="rounded-full border border-amber-200/70 bg-amber-50/90 px-4 py-2 text-sm font-bold text-amber-800 shadow-sm">{revealedCount}&thinsp;/&thinsp;{SPREAD_CARD_COUNT}</span>
                </div>
                <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-amber-100">
                  <m.div className="h-full rounded-full shadow-[0_0_18px_rgba(245,158,11,0.38)]" style={{ background: "linear-gradient(90deg, #67e8f9 0%, #fde68a 45%, #f59e0b 100%)" }} initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                </div>
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {Array.from({ length: SPREAD_CARD_COUNT }).map((_, idx) => {
                    const card = cards[idx];
                    const isFlipped = idx < revealedCount;
                    const enabled = canFlip(idx);
                    const isGlowing = glowingCard === idx;
                    return (
                      <div key={idx} style={{ perspective: "1200px" }} className="relative aspect-[3/4] min-h-[210px]">
                        <AnimatePresence>{isGlowing && (<m.div initial={{ opacity: 0.7, scale: 0.95 }} animate={{ opacity: 0, scale: 1.28 }} exit={{}} transition={{ duration: 0.85, ease: "easeOut" }} className="pointer-events-none absolute inset-0 rounded-[24px] bg-amber-200 blur-2xl" style={{ zIndex: 30 }} />)}</AnimatePresence>
                        <m.button type="button" onClick={() => flip(idx)} disabled={!enabled} whileHover={enabled ? { y: -8, filter: "drop-shadow(0 22px 34px rgba(217,144,42,0.3))" } : undefined} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="relative h-full w-full rounded-[24px]" style={{ transformStyle: "preserve-3d" }}>
                          <m.div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }} animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.72, ease: [0.35, 0, 0.15, 1] }}>
                            <div className="absolute inset-0 rounded-[24px] shadow-[0_20px_48px_rgba(180,120,35,0.18)]" style={{ backfaceVisibility: "hidden" }}><CardBackFace copy={copy} />{enabled && (<m.div className="absolute inset-0 rounded-[24px] ring-2 ring-amber-300/80" animate={{ opacity: [0.42, 1, 0.42] }} transition={{ duration: 2.2, repeat: Infinity }} />)}</div>
                            <div className="absolute inset-0 overflow-hidden rounded-[24px] shadow-[0_20px_56px_rgba(180,120,35,0.24)]" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                              {card?.cardId ? (<Image src={cardImageUrl(card)} alt={safeCardTitle(copy, card, idx)} fill sizes="(max-width: 768px) 45vw, 260px" className="object-cover" unoptimized priority />) : (<div className="absolute inset-0 bg-amber-50" />)}
                              <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-16" style={{ background: "linear-gradient(0deg, rgba(255,251,235,0.97) 0%, rgba(255,251,235,0.72) 58%, transparent 100%)" }}>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">{POSITION_LABELS[idx]}</p>
                                <p className="mt-1 text-[13px] font-semibold leading-tight text-stone-800">{safeCardTitle(copy, card, idx)}</p>
                              </div>
                            </div>
                          </m.div>
                        </m.button>
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={fetchReading} disabled={loading || revealedCount < SPREAD_CARD_COUNT} className="group relative mt-6 w-full overflow-hidden rounded-full border border-amber-200/70 py-4 text-sm font-bold text-[#2d1b08] shadow-[0_20px_60px_rgba(217,144,42,0.2)] transition-all active:scale-[0.98] disabled:opacity-35" style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #FFF0B7 48%, #F4B84E 100%)" }}>
                  <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.48),transparent)] transition-transform duration-700 group-hover:translate-x-[120%]" />
                  <span className="relative flex items-center justify-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? copy.interpretingLabel : copy.openReadingButton}</span>
                </button>
              </div>
              <aside className="rounded-[30px] border border-white/80 bg-white/64 p-5 shadow-[0_24px_70px_rgba(180,120,35,0.16)] backdrop-blur-2xl lg:min-h-[calc(100dvh-132px)]">
                <p className="text-xs font-semibold tracking-[0.18em] text-teal-700/75">{copy.sidebarEyebrow}</p>
                <h3 className="mt-3 font-serif text-2xl font-semibold text-amber-950">{revealedCount < SPREAD_CARD_COUNT ? POSITION_LABELS[revealedCount] : copy.sidebarReadyHeading}</h3>
                <p className="mt-4 text-sm leading-7 text-stone-700">
                  {copy.sidebarDescription}
                </p>
                <div className="mt-6 space-y-2">
                  {POSITION_LABELS.map((label, idx) => (
                    <div key={label} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm shadow-sm ${idx < revealedCount ? "border-amber-300/70 bg-amber-50/90 text-amber-900" : idx === revealedCount ? "border-teal-200/80 bg-teal-50/80 text-teal-900" : "border-stone-200/70 bg-white/60 text-stone-500"}`}>
                      <span>{idx + 1}. {label}</span>
                      <span className="text-xs font-semibold">{idx < revealedCount ? copy.statusDone : idx === revealedCount ? copy.statusInProgress : copy.statusWaiting}</span>
                    </div>
                  ))}
                </div>
              </aside>
            </m.section>
          ) : null}
          {stage === "result" ? (
            <m.section key="result" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.42 }} className="grid flex-1 gap-5 pb-5 lg:grid-cols-[330px_minmax(0,1fr)]">
              <aside className="rounded-lg border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,247,237,0.76),rgba(240,253,250,0.42))] p-5 shadow-[0_24px_70px_rgba(180,120,35,0.16)] backdrop-blur-2xl lg:sticky lg:top-6 lg:max-h-[calc(100dvh-48px)] lg:overflow-auto">
                <p className="text-xs font-semibold tracking-normal text-teal-700/75">{copy.resultEyebrow}</p>
                <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-amber-950">{copy.resultHeading}</h2>
                <p className="mt-3 text-sm leading-7 text-stone-700">{reading?.subtitle || copy.resultSubtitleFallback}</p>
                <div className="mt-5 rounded-lg border border-amber-200/70 bg-white/80 p-4">
                  <p className="text-xs font-bold text-amber-700">{copy.todayLineLabel}</p>
                  <p className="mt-2 font-serif text-xl font-semibold leading-8 text-amber-950">{resultSunLine}</p>
                </div>
                {cards.length > 0 && (
                  <div className="mt-5 grid grid-cols-4 gap-2 lg:grid-cols-2">
                    {cards.map((card, idx) => (
                      <div key={idx}>
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-amber-200/70 shadow-[0_16px_34px_rgba(180,120,35,0.18)]">{card?.cardId ? (<Image src={cardImageUrl(card)} alt={safeCardTitle(copy, card, idx)} fill sizes="120px" className="object-cover" unoptimized />) : (<div className="absolute inset-0 bg-amber-50" />)}</div>
                        <p className="mt-1 text-center text-[10px] font-semibold text-amber-800">{POSITION_LABELS_SHORT[idx]}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6 grid gap-2">
                  <button type="button" onClick={share} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/90 px-4 text-sm font-bold text-amber-900 shadow-sm transition-colors hover:bg-white"><Share2 className="h-4 w-4" />{copy.shareButton}</button>
                  <button type="button" onClick={start} className="min-h-11 rounded-full border border-stone-200 bg-white/70 px-4 text-sm font-bold text-stone-800 shadow-sm transition-colors hover:bg-white">{copy.rereadButton}</button>
                  <button type="button" onClick={goHome} className="min-h-11 rounded-full bg-stone-900 px-4 text-sm font-bold text-white shadow-[0_16px_34px_rgba(68,64,60,0.18)] transition-colors hover:bg-amber-950">{copy.otherFortuneButton}</button>
                </div>
              </aside>
              <div className="min-w-0 space-y-5 rounded-lg border border-white/80 bg-white/76 p-4 shadow-[0_30px_90px_rgba(180,120,35,0.18)] backdrop-blur-2xl md:p-6">
                <section className="rounded-lg border border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(254,243,199,0.82),rgba(255,237,213,0.68),rgba(204,251,241,0.4))] p-5 shadow-inner">
                  <p className="text-xs font-semibold tracking-normal text-amber-700/78">{copy.adviceEyebrow}</p>
                  <h3 className="mt-2 font-serif text-2xl font-semibold leading-tight text-amber-950">{copy.adviceHeading}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-700">{reading?.opening || copy.adviceFallback}</p>
                </section>
                <section>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-teal-700">{copy.cardSummaryEyebrow}</p>
                      <h3 className="mt-1 font-serif text-2xl font-semibold text-amber-950">{copy.cardSummaryHeading}</h3>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {resultCards.map((item, idx) => (
                      <ResultCardSummary key={`${item.cardName}-${idx}`} item={item} idx={idx} card={cards[idx]} copy={copy} />
                    ))}
                  </div>
                </section>
                <section className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-teal-700">{copy.cardDetailEyebrow}</p>
                    <h3 className="mt-1 font-serif text-2xl font-semibold text-amber-950">{copy.cardDetailHeading}</h3>
                  </div>
                  {resultCards.map((item, idx) => (
                    <ResultDetailCard key={`${item.positionLabel}-${idx}`} item={item} idx={idx} copy={copy} />
                  ))}
                </section>
                {resultStory ? (
                  <ReadingCard title={copy.overallFlowTitle} tone="neutral" icon={Sparkles} text={resultStory} />
                ) : null}
                {resultRoutines.length ? (
                  <section>
                    <p className="text-xs font-semibold text-teal-700">{copy.routineEyebrow}</p>
                    <h3 className="mt-1 font-serif text-2xl font-semibold text-amber-950">{copy.routineHeading}</h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      {resultRoutines.map((item, idx) => (
                        <RoutineCard key={`${item.title}-${idx}`} item={item} />
                      ))}
                    </div>
                  </section>
                ) : null}
                {reading?.affirmation ? (
                  <section className="rounded-lg border border-teal-200/70 bg-teal-50/76 p-5">
                    <p className="text-xs font-semibold text-teal-700">{copy.affirmationLabel}</p>
                    <p className="mt-2 font-serif text-xl font-semibold leading-8 text-stone-900">{reading.affirmation}</p>
                  </section>
                ) : null}
                {reading?.notice ? <p className="text-xs leading-6 text-stone-500">{reading.notice}</p> : null}
                {engineMeta?.qualityEnhanced && (<p className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-xs font-semibold text-amber-800">{copy.qualityEnhancedNote}</p>)}
                {aiPromptText ? (
                  <section
                    className="tarot-healing-ai-prompt-panel rounded-lg border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,247,237,0.9),rgba(240,253,250,0.5))] p-5 shadow-[0_20px_58px_rgba(180,120,35,0.16)]"
                    data-marker="tarot-healing-ai-prompt-bottom-v20260621"
                  >
                    <p className="tarot-healing-ai-prompt-kicker text-xs font-semibold tracking-normal text-teal-700">{copy.promptPanelKicker}</p>
                    <h3 className="tarot-healing-ai-prompt-title mt-1 font-serif text-2xl font-semibold leading-tight text-amber-950">{copy.promptPanelTitle}</h3>
                    <p className="tarot-healing-ai-prompt-lead mt-3 text-sm leading-7 text-stone-700">
                      {copy.promptPanelLead}
                    </p>
                    <textarea
                      id="tarotHealingAiPromptOutput"
                      className="tarot-healing-ai-prompt-output mt-4 min-h-[230px] w-full resize-y rounded-lg border border-amber-200/80 bg-white/86 p-4 text-sm leading-7 text-stone-800 outline-none shadow-inner focus:border-amber-400"
                      value={aiPromptText}
                      readOnly
                    />
                    <div className="tarot-healing-ai-prompt-actions mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={copyAiPrompt}
                        className="tarot-healing-ai-prompt-copy inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/92 px-5 text-sm font-bold text-amber-900 shadow-sm transition-colors hover:bg-white"
                      >
                        <Clipboard className="h-4 w-4" />
                        {copy.promptCopyButton}
                      </button>
                      <span className="tarot-healing-ai-prompt-status text-xs font-semibold text-teal-700" aria-live="polite">
                        {aiPromptCopyStatus}
                      </span>
                    </div>
                  </section>
                ) : null}
              </div>
            </m.section>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}
