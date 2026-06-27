import type { FortuneTeaHouseConsultResponse, FortuneTeaTarotSnapshot } from "../data/consult";

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
    emotionAnalysis: safeEmotions,
  };
}
