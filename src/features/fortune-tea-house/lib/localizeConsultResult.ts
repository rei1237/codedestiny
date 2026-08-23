import type { FortuneTeaHouseConsultResponse, FortuneTeaTarotSpreadCard } from "../data/consult";
import type { TeaHouseCup } from "../data/teaCups";
import type { TeaHouseTarotCard } from "../data/tarotCards";
import type { TarotSpreadPosition } from "./tarotAdapter";

/**
 * 상담 결과 payload 의 **결정론 조각**을 화면에 그리기 직전에 사전 값으로 갈아끼운다.
 *
 * 🔴 왜 필요한가: 워커의 `mergeLlmResult` 는 찻잔·타로 카드 정체성·스프레드 위치를 **LLM 출력으로
 * 덮지 않고 클라 초안 그대로 고정**한다(카드가 바뀌면 안 되니 당연한 설계다). 그런데 그 초안은
 * 한국어라서, LLM 산문이 사용자 언어로 잘 와도 카드 이름·키워드·찻잔 이름은 **모든 로케일에서
 * 한국어로 렌더됐다.** 실패 경로만의 문제가 아니라 정상 응답에서도 그랬다.
 *
 * 그래서 payload 는 건드리지 않고(저장·전송·프롬프트의 정본은 계속 한국어 id 데이터다) **렌더
 * 직전에만** id 로 사전을 다시 조회한다. 한국어에서는 사전 값이 소스 원문과 같으므로 출력이 그대로다.
 *
 * 조각을 인자로 받는 순수 함수인 이유: 훅은 컴포넌트에서만 부를 수 있고, 조립을 데이터 쪽에 두면
 * 테스트가 쉬워진다(`buildTarotAlbumCards` 와 같은 형태).
 */
export type ConsultLocalizationParts = {
  /** `useTeaHouseCopy("teaCups", teaHouseCups, …)` 결과 */
  cups: readonly TeaHouseCup[];
  /** `useTeaHouseCopy("consultTarotCards", majorArcanaCards, …)` 결과 */
  cards: readonly TeaHouseTarotCard[];
  /** `useTeaHouseCopy("tarotSpreadPositions", tarotSpreadPositions, …)` 결과 */
  positions: Record<string, readonly TarotSpreadPosition[]>;
  /** `tarotSpreadCards` 가 비어 대표 카드 한 장을 세울 때 쓰는 위치 라벨. */
  representativePosition?: { positionLabel: string; positionMeaning: string };
};

function indexById<T extends { id: string }>(list: readonly T[]) {
  const map = new Map<string, T>();
  for (const item of list) map.set(item.id, item);
  return map;
}

/** 위치 id → 라벨. 스프레드가 달라도 같은 positionId 는 같은 뜻이라 한 표로 합친다. */
function indexPositions(positions: Record<string, readonly TarotSpreadPosition[]>) {
  const map = new Map<string, TarotSpreadPosition>();
  for (const list of Object.values(positions || {})) {
    for (const position of list || []) {
      if (position?.positionId && !map.has(position.positionId)) map.set(position.positionId, position);
    }
  }
  return map;
}

function localizeCard<T extends { cardId: string; orientation: string; nameKo: string; keywords: string[]; meaning: string }>(
  card: T,
  cards: Map<string, TeaHouseTarotCard>,
): T {
  const source = cards.get(card.cardId);
  if (!source) return card;
  const face = card.orientation === "reversed" ? source.reversed : source.upright;
  return {
    ...card,
    nameKo: source.nameKo || card.nameKo,
    keywords: face?.keywords?.length ? [...face.keywords] : card.keywords,
    meaning: face?.meaning || card.meaning,
  };
}

function localizeSpreadCard(
  card: FortuneTeaTarotSpreadCard,
  cards: Map<string, TeaHouseTarotCard>,
  positions: Map<string, TarotSpreadPosition>,
  representative?: { positionLabel: string; positionMeaning: string },
): FortuneTeaTarotSpreadCard {
  const next = localizeCard(card, cards);
  // 대표 카드는 스프레드 표에 없다 — 호출부가 넘긴 라벨을 쓴다.
  const position = card.positionId === "representative" ? representative : positions.get(card.positionId);
  if (!position) return next;
  return {
    ...next,
    positionLabel: position.positionLabel || card.positionLabel,
    positionMeaning: position.positionMeaning || card.positionMeaning,
  };
}

export function localizeConsultResult(
  result: FortuneTeaHouseConsultResponse,
  parts: ConsultLocalizationParts,
): FortuneTeaHouseConsultResponse {
  const cups = indexById(parts.cups || []);
  const cards = indexById(parts.cards || []);
  const positions = indexPositions(parts.positions);

  const cup = result.teaCup ? cups.get(result.teaCup.id) : undefined;
  const teaCup = cup && result.teaCup
    ? {
        ...result.teaCup,
        name: cup.name || result.teaCup.name,
        topic: cup.topic || result.teaCup.topic,
        reading: cup.reading || result.teaCup.reading,
        // 저장된 옛 결과에는 resultPrelude 가 없을 수 있다 — 그 자리는 사전 값으로 채운다.
        resultPrelude: cup.resultPrelude || result.teaCup.resultPrelude,
      }
    : result.teaCup;

  return {
    ...result,
    teaCup,
    tarot: result.tarot ? localizeCard(result.tarot, cards) : result.tarot,
    tarotSpreadCards: result.tarotSpreadCards?.length
      ? result.tarotSpreadCards.map((card) => localizeSpreadCard(card, cards, positions, parts.representativePosition))
      : result.tarotSpreadCards,
  };
}
