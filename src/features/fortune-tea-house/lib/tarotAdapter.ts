import { buildOraclePrompt } from "@/app/tarot/prompt-maker/utils/buildOraclePrompt";
import type { DrawnTarotCard, TarotSpread, TarotSpreadCategory } from "@/app/tarot/prompt-maker/types";
import type { FortuneTeaHouseConsultRequest, FortuneTeaTarotSnapshot, FortuneTeaTarotSpread, FortuneTeaTarotSpreadCard } from "../data/consult";
import { drawTarotCard, drawTarotOrientation, tarotDeckCards, type TeaHouseTarotCard, type TarotOrientation } from "../data/tarotCards";

/** 스프레드 위치 한 칸. 라벨·설명은 화면에 그대로 렌더되므로 사전 조회 대상이다. */
export type TarotSpreadPosition = { positionId: string; positionLabel: string; positionMeaning: string };

/** 🔴 export 인 이유: 결과 화면이 렌더 직전에 이 표를 사전으로 덮어 위치 라벨을 로케일화한다
    (src/features/fortune-tea-house/lib/localizeConsultResult.ts). payload 자체는 한국어 정본을 유지한다. */
export const tarotSpreadPositions: Record<FortuneTeaTarotSpread, TarotSpreadPosition[]> = {
  three: [
    { positionId: "present", positionLabel: "현재", positionMeaning: "지금 질문의 중심 장면" },
    { positionId: "flow", positionLabel: "흐름", positionMeaning: "가까운 흐름과 감정의 방향" },
    { positionId: "advice", positionLabel: "조언", positionMeaning: "오늘 붙잡을 현실적인 기준" },
  ],
  five: [
    { positionId: "present", positionLabel: "현재", positionMeaning: "지금 질문의 중심 장면" },
    { positionId: "other", positionLabel: "상대/상황", positionMeaning: "상대 또는 상황이 드러내는 온도" },
    { positionId: "block", positionLabel: "장애", positionMeaning: "흐름을 막는 반복 패턴" },
    { positionId: "possibility", positionLabel: "가능성", positionMeaning: "조심스럽게 열려 있는 길" },
    { positionId: "advice", positionLabel: "조언", positionMeaning: "오늘 붙잡을 현실적인 기준" },
  ],
};

export function normalizeFortuneTeaTarotSpread(value: unknown): FortuneTeaTarotSpread {
  return value === "five" ? "five" : "three";
}

function orientationLabel(orientation: TarotOrientation) {
  return orientation === "upright" ? "정방향" : "역방향";
}

function categoryFromTeaCup(request: FortuneTeaHouseConsultRequest): TarotSpreadCategory {
  const source = `${request.selectedTeaCupId} ${request.selectedTeaCupTopic} ${request.concernTopic || ""}`;
  if (/연애|재회|lotus|인연|썸|peach/.test(source)) return "love";
  if (/진로|사업|직장|이직|career|black-tea/.test(source)) return "career";
  if (/금전|돈|수입|지출|money|cinnamon/.test(source)) return "money";
  if (/회복|불안|자존감|healing/.test(source)) return "self";
  if (/이별|위기|결단|crisis|black-moon/.test(source)) return "crisis";
  return "special";
}

function buildSpread(category: TarotSpreadCategory): TarotSpread {
  return {
    id: "fortune-tea-house-one-card",
    title: "운명의 찻집 달빛 한 장",
    category,
    cardCount: 1,
    difficulty: "deep",
    purpose: "사용자가 고른 찻잔과 현재 고민을 한 장의 타로 상징으로 연결합니다.",
    positions: [
      {
        index: 0,
        label: "찻잔 위에 떠오른 상징",
        description: "오늘의 질문에서 가장 먼저 읽어야 할 마음의 방향",
        x: 50,
        y: 50,
        rotate: 0,
        emphasis: true,
      },
    ],
    interpretationGuide: ["찻잔의 주제와 카드 방향을 함께 읽습니다.", "결론을 단정하지 않고 지금의 선택 기준을 정리합니다."],
    tags: ["운명의 찻집", "연이", "찻잔", "타로"],
    mood: "달빛이 고인 찻잔 위에 카드 한 장이 천천히 떠오릅니다.",
    ritual: "찻잔의 향이 가장 진한 순간 카드를 펼칩니다.",
  };
}

function buildDrawnCard(card: TeaHouseTarotCard, orientation: TarotOrientation): DrawnTarotCard {
  const meaning = orientation === "upright" ? card.upright : card.reversed;
  return {
    slotIndex: 0,
    positionLabel: "찻잔 위에 떠오른 상징",
    positionDescription: "오늘의 질문에서 가장 먼저 읽어야 할 마음의 방향",
    cardCode: `M${String(card.number).padStart(2, "0")}`,
    cardNameKo: card.nameKo,
    cardNameEn: card.nameEn,
    keywords: meaning.keywords,
    orientation,
    orientationLabel: orientationLabel(orientation),
    image: "",
    focus: meaning.meaning,
  };
}

export function buildFortuneTeaTarotSnapshot(request: FortuneTeaHouseConsultRequest, seed: string): FortuneTeaTarotSnapshot {
  const card = drawTarotCard(seed);
  const orientation = drawTarotOrientation(seed);
  const meaning = orientation === "upright" ? card.upright : card.reversed;
  const category = categoryFromTeaCup(request);

  try {
    const spread = buildSpread(category);
    const drawnCard = buildDrawnCard(card, orientation);
    const promptResult = buildOraclePrompt(spread, request.question, [drawnCard], {
      questionCategory: category,
      locale: "ko",
    });

    return {
      cardId: card.id,
      number: card.number,
      nameKo: card.nameKo,
      nameEn: card.nameEn,
      orientation,
      keywords: meaning.keywords,
      meaning: meaning.meaning,
      topicReadingSeed: [promptResult.summary, ...promptResult.cardDigest, ...promptResult.guidance.slice(0, 4)].join("\n"),
      source: "existing-ai-tarot",
    };
  } catch {
    return {
      cardId: card.id,
      number: card.number,
      nameKo: card.nameKo,
      nameEn: card.nameEn,
      orientation,
      keywords: meaning.keywords,
      meaning: meaning.meaning,
      source: "existing-card-data",
    };
  }
}

function pickSpreadCards(seed: string, count: number) {
  const picked: TeaHouseTarotCard[] = [];
  for (let index = 0; picked.length < count && index < tarotDeckCards.length * 2; index += 1) {
    const card = drawTarotCard(`${seed}:spread:${index}`);
    if (!picked.some((item) => item.id === card.id)) picked.push(card);
  }
  if (picked.length < count) {
    for (const card of tarotDeckCards) {
      if (picked.length >= count) break;
      if (!picked.some((item) => item.id === card.id)) picked.push(card);
    }
  }
  return picked;
}

export function buildFortuneTeaTarotSpreadCards(
  request: FortuneTeaHouseConsultRequest,
  seed: string,
): { tarotSpread: FortuneTeaTarotSpread; tarotSpreadCards: FortuneTeaTarotSpreadCard[] } {
  const tarotSpread = normalizeFortuneTeaTarotSpread(request.tarotSpread);
  const positions = tarotSpreadPositions[tarotSpread];
  const cards = pickSpreadCards(seed, positions.length);
  const tarotSpreadCards = positions.map((position, index) => {
    const card = cards[index] || drawTarotCard(`${seed}:spread:fallback:${index}`);
    const orientation = drawTarotOrientation(`${seed}:spread:${position.positionId}:${card.id}`);
    const meaning = orientation === "upright" ? card.upright : card.reversed;
    return {
      cardId: card.id,
      number: card.number,
      nameKo: card.nameKo,
      nameEn: card.nameEn,
      orientation,
      keywords: meaning.keywords,
      meaning: meaning.meaning,
      source: "existing-card-data" as const,
      positionId: position.positionId,
      positionLabel: position.positionLabel,
      positionMeaning: position.positionMeaning,
      reading: `${position.positionLabel} 자리에는 ${card.nameKo}이 ${orientationLabel(orientation)}으로 떠올라 ${meaning.keywords.slice(0, 2).join(", ")}의 결을 비춥니다.`,
    };
  });
  return { tarotSpread, tarotSpreadCards };
}
