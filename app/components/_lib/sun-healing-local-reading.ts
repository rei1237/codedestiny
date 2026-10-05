// 태양 회복 타로는 무료 기능이라 로그인이 필요한 /api/tarot/reading 대신 같은 결정론 엔진을 브라우저에서 돌린다.
// 호출 순서는 worker/routes/tarot.js buildReadingPayload 와 같아야 결과가 서버와 일치한다.
// 엔진·카드 의미 데이터가 커서 정적 import 는 금지 — 동적 import 로 별도 청크에만 싣는다.

export const SUN_HEALING_SPREAD_TYPE = "healing_rising_four_card";
// 워커 라우트는 body.serviceKey 가 없으면 "tarot-reading" 을 넘긴다(worker/routes/tarot.js).
const WORKER_SERVICE_KEY = "tarot-reading";

export type LocalReadingInputCard = {
  cardId: string;
  position?: string;
  orientation?: string;
};

export type LocalReadingResult<TReading> = {
  reading: TReading | null;
  highlights: string[];
};

type TarotEngine = typeof import("@/lib/tarot/tarot-interpretation-engine.mjs");

let enginePromise: Promise<TarotEngine> | null = null;

export function loadSunHealingEngine(): Promise<TarotEngine> {
  if (!enginePromise) {
    enginePromise = import("@/lib/tarot/tarot-interpretation-engine.mjs").catch((error) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

export async function computeSunHealingReading<TReading>(cards: LocalReadingInputCard[]): Promise<LocalReadingResult<TReading>> {
  const engine = await loadSunHealingEngine();
  const drawn = cards.map((c) => ({ cardId: c.cardId, position: c.position, orientation: c.orientation }));
  const normalized = engine.normalizeDrawnCardsForSpread(SUN_HEALING_SPREAD_TYPE, drawn);
  const questionType = engine.inferQuestionType({ questionType: undefined, category: "healing", spreadId: SUN_HEALING_SPREAD_TYPE, serviceKey: WORKER_SERVICE_KEY });
  const interpreted = engine.interpretTarotReading({
    serviceKey: WORKER_SERVICE_KEY,
    questionType,
    spreadId: SUN_HEALING_SPREAD_TYPE,
    drawnCards: normalized,
    userQuestion: "",
    userContext: undefined,
  });
  const reading = engine.buildLegacyReadingPayload(interpreted, { spreadId: SUN_HEALING_SPREAD_TYPE }) as TReading | null;
  const rawHighlights = reading ? engine.buildConsultingHighlights(reading) : [];
  const highlights = Array.isArray(rawHighlights)
    ? rawHighlights.map((line: unknown) => String(line || "").trim()).filter(Boolean).slice(0, 4)
    : [];
  return { reading, highlights };
}
