import type { FortuneTeaHouseConsultResponse, FortuneTeaTarotSnapshot, FortuneTeaTarotSpreadCard } from "../data/consult";

// 대표 카드 정체성 필드만 요구한다 — result.tarot(스냅샷의 source 없음)도 그대로 받기 위한 서브셋.
type TarotIdentity = Pick<FortuneTeaTarotSnapshot, "cardId" | "number" | "nameKo" | "nameEn" | "orientation" | "keywords" | "meaning">;

function orientationLabel(orientation: FortuneTeaTarotSnapshot["orientation"]) {
  return orientation === "upright" ? "정방향" : "역방향";
}

// 첫 스프레드 카드는 대표 카드와 같은 정체성으로 노출되므로, 해설 문장도 대표 카드를 말하고 있는지 보증한다.
// (기저장 결과 중 정체성만 덮이고 reading은 다른 카드 문장이 남은 P0 오염 데이터 방어)
export function ensureFirstSpreadCardConsistency(
  cards: FortuneTeaTarotSpreadCard[] | undefined,
  tarotSnapshot: TarotIdentity,
): FortuneTeaTarotSpreadCard[] | undefined {
  if (!Array.isArray(cards) || !cards.length) return cards;
  const [first, ...rest] = cards;
  const readingMentionsCard = typeof first.reading === "string" && first.reading.includes(tarotSnapshot.nameKo);
  return [
    {
      ...first,
      cardId: tarotSnapshot.cardId,
      number: tarotSnapshot.number,
      nameKo: tarotSnapshot.nameKo,
      nameEn: tarotSnapshot.nameEn,
      orientation: tarotSnapshot.orientation,
      keywords: tarotSnapshot.keywords,
      meaning: tarotSnapshot.meaning,
      reading: readingMentionsCard
        ? first.reading
        : `${first.positionLabel} 자리에는 ${tarotSnapshot.nameKo}이 ${orientationLabel(tarotSnapshot.orientation)}으로 떠올라 ${tarotSnapshot.keywords.slice(0, 2).join(", ")}의 결을 비춥니다. 이 카드는 ${tarotSnapshot.meaning}`,
    },
    ...rest,
  ];
}

export function ensureConsultResultConsistency(
  result: FortuneTeaHouseConsultResponse,
  tarotSnapshot: FortuneTeaTarotSnapshot,
): FortuneTeaHouseConsultResponse {
  const safeEmotions = result.emotionAnalysis.map((item) => ({
    ...item,
    value: Math.max(0, Math.min(100, Math.round(item.value))),
  }));

  return {
    ...result,
    tarot: {
      ...result.tarot,
      cardId: tarotSnapshot.cardId,
      number: tarotSnapshot.number,
      nameKo: tarotSnapshot.nameKo,
      nameEn: tarotSnapshot.nameEn,
      orientation: tarotSnapshot.orientation,
      keywords: tarotSnapshot.keywords,
      meaning: tarotSnapshot.meaning,
    },
    tarotSpreadCards: ensureFirstSpreadCardConsistency(result.tarotSpreadCards, tarotSnapshot),
    emotionAnalysis: safeEmotions,
  };
}
