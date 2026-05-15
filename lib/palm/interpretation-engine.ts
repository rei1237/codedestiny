import type { CanonicalPalmReading, PalmAnalysisPurpose } from "@/types/palm-reading";
import {
  buildPalmNarrativeBundle,
  type PalmNarrativeCard,
  type PalmNarrativeSection,
} from "@/lib/palm/palm-narrative-mapper";

type CardKey =
  | "lifeLine"
  | "headLine"
  | "heartLine"
  | "fateLine"
  | "sunLine"
  | "moneyLine"
  | "marriageLine"
  | "mounts";

export type PalmInterpretationCard = PalmNarrativeCard & {
  key: CardKey;
};

export type PalmInterpretationReport = {
  generatedAt: string;
  analysisPurpose: PalmAnalysisPurpose;
  tone: string;
  policy: {
    imageDirectVisionUsed: false;
    source: "canonicalPalmReading";
    forbiddenExpressionFiltered: boolean;
    forbiddenMatches: string[];
  };
  oneLiner: string;
  focusSummary: string;
  sections: PalmNarrativeSection[];
  report: {
    oneLiner: string;
    summary: string;
    love: string;
    wealth: string;
    career: string;
    personality: string;
    healthEnergy: string;
    relationship: string;
    advice: string;
    tips: string[];
  };
  cards: PalmInterpretationCard[];
};

const FORBIDDEN_PHRASES: readonly string[] = [
  "수명이 짧다",
  "단명",
  "오래 못 산다",
  "병이 있다",
  "큰 병",
  "죽음이 보인다",
  "죽음",
  "사고가 난다",
  "이혼한다",
  "결혼을 몇 번 한다",
  "반드시 결혼한다",
  "반드시 부자가 된다",
  "투자 성공",
  "자녀 문제가 있다",
  "자녀 문제",
  "불임",
  "임신",
  "성적 능력",
  "의학적 진단",
];

function sanitizeForbiddenExpressionsInText(text: string, found: Set<string>): string {
  let out = String(text || "");
  for (const phrase of FORBIDDEN_PHRASES) {
    if (out.includes(phrase)) {
      found.add(phrase);
      out = out.split(phrase).join("단정할 수 없습니다");
    }
  }
  return out;
}

function sanitizeCard(card: PalmInterpretationCard, found: Set<string>): PalmInterpretationCard {
  return {
    ...card,
    oneLiner: sanitizeForbiddenExpressionsInText(card.oneLiner, found),
    details: card.details.map((x) => sanitizeForbiddenExpressionsInText(x, found)),
    strengths: card.strengths.map((x) => sanitizeForbiddenExpressionsInText(x, found)),
    cautions: card.cautions.map((x) => sanitizeForbiddenExpressionsInText(x, found)),
    todayAdvice: sanitizeForbiddenExpressionsInText(card.todayAdvice, found),
    sevenDayPractice: sanitizeForbiddenExpressionsInText(card.sevenDayPractice, found),
  };
}

function uniquifySentence(text: string, cardTitle: string, seen: Set<string>): string {
  const trimmed = String(text || "").trim();
  if (!trimmed) return trimmed;
  if (!seen.has(trimmed)) {
    seen.add(trimmed);
    return trimmed;
  }

  const tagged = `${trimmed} (${cardTitle})`;
  if (!seen.has(tagged)) {
    seen.add(tagged);
    return tagged;
  }

  let index = 2;
  while (true) {
    const candidate = `${tagged} ${index}`;
    if (!seen.has(candidate)) {
      seen.add(candidate);
      return candidate;
    }
    index += 1;
  }
}

function enforceCardSentenceUniqueness(cards: PalmInterpretationCard[]): PalmInterpretationCard[] {
  const seen = new Set<string>();

  return cards.map((card) => ({
    ...card,
    oneLiner: uniquifySentence(card.oneLiner, card.title, seen),
    details: card.details.map((line) => uniquifySentence(line, card.title, seen)),
    strengths: card.strengths.map((line) => uniquifySentence(line, card.title, seen)),
    cautions: card.cautions.map((line) => uniquifySentence(line, card.title, seen)),
    todayAdvice: uniquifySentence(card.todayAdvice, card.title, seen),
    sevenDayPractice: uniquifySentence(card.sevenDayPractice, card.title, seen),
  }));
}

export function buildPalmInterpretationReport(canonical: CanonicalPalmReading): PalmInterpretationReport {
  const purpose = canonical.profile.analysisPurpose || "general";
  const narrative = buildPalmNarrativeBundle(canonical);

  const forbiddenFound = new Set<string>(narrative.forbiddenMatches);
  const sanitizedCards = narrative.cards.map((card) => sanitizeCard(card, forbiddenFound));
  const uniqueCards = enforceCardSentenceUniqueness(sanitizedCards);

  const sanitizedSections = narrative.sections.map((section) => ({
    ...section,
    summary: sanitizeForbiddenExpressionsInText(section.summary, forbiddenFound),
    detail: sanitizeForbiddenExpressionsInText(section.detail, forbiddenFound),
    advice: sanitizeForbiddenExpressionsInText(section.advice, forbiddenFound),
  }));

  const report = {
    oneLiner: sanitizeForbiddenExpressionsInText(narrative.report.oneLiner, forbiddenFound),
    summary: sanitizeForbiddenExpressionsInText(narrative.report.summary, forbiddenFound),
    love: sanitizeForbiddenExpressionsInText(narrative.report.love, forbiddenFound),
    wealth: sanitizeForbiddenExpressionsInText(narrative.report.wealth, forbiddenFound),
    career: sanitizeForbiddenExpressionsInText(narrative.report.career, forbiddenFound),
    personality: sanitizeForbiddenExpressionsInText(narrative.report.personality, forbiddenFound),
    healthEnergy: sanitizeForbiddenExpressionsInText(narrative.report.healthEnergy, forbiddenFound),
    relationship: sanitizeForbiddenExpressionsInText(narrative.report.relationship, forbiddenFound),
    advice: sanitizeForbiddenExpressionsInText(narrative.report.advice, forbiddenFound),
    tips: narrative.report.tips.map((tip) => sanitizeForbiddenExpressionsInText(tip, forbiddenFound)),
  };

  return {
    generatedAt: new Date().toISOString(),
    analysisPurpose: purpose,
    tone: "쉽고 따뜻한 친구형 손금 리딩",
    policy: {
      imageDirectVisionUsed: false,
      source: "canonicalPalmReading",
      forbiddenExpressionFiltered: true,
      forbiddenMatches: Array.from(forbiddenFound),
    },
    oneLiner: sanitizeForbiddenExpressionsInText(narrative.oneLiner, forbiddenFound),
    focusSummary: sanitizeForbiddenExpressionsInText(narrative.focusSummary, forbiddenFound),
    sections: sanitizedSections,
    report,
    cards: uniqueCards,
  };
}
