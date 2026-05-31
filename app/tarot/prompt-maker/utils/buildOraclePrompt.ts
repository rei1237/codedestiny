import { CATEGORY_LABEL, DEFAULT_QUESTION_BY_CATEGORY } from "../data/tarotSpreadLibrary";
import type { DrawnTarotCard, TarotSpread } from "../types";

type OraclePromptResult = {
  prompt: string;
  summary: string;
  cardDigest: string[];
  guidance: string[];
  effectiveQuestion: string;
};

function ensureText(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function buildOraclePrompt(spread: TarotSpread, question: string, drawnCards: DrawnTarotCard[]): OraclePromptResult {
  const effectiveQuestion = ensureText(question) || DEFAULT_QUESTION_BY_CATEGORY[spread.category];
  const cardDigest = drawnCards.map((card, index) => {
    return `${index + 1}. ${card.positionLabel} - ${card.cardNameKo} (${card.orientationLabel}) | 핵심 키워드: ${card.keywords.slice(0, 4).join(", ") || card.focus}`;
  });
  const guidance = [
    "질문자의 감정을 먼저 요약하고 스프레드 전체 흐름을 한 문단으로 정리합니다.",
    "각 카드 해석은 포지션 의미와 카드 방향을 동시에 반영합니다.",
    "상대 속마음, 미래, 재회 같은 주제는 단정 대신 가능성과 정황으로 씁니다.",
    "좋은 가능성과 경계 포인트를 모두 제시하고 마지막에는 행동 조언 3가지를 제안합니다.",
    "문장은 한국어로, 과장 없이 따뜻하지만 현실적인 어조로 작성합니다.",
  ];
  const summary = `${spread.title}에서 ${drawnCards.map((card) => `${card.cardNameKo} ${card.orientationLabel}`).join(", ")} 흐름이 잡혔습니다. 이 프롬프트는 ${CATEGORY_LABEL[spread.category]} 질문을 한 번에 읽을 수 있도록 설계되었습니다.`;

  const prompt = [
    "당신은 감정 과잉 없이 따뜻하고 정확하게 흐름을 읽는 한국어 타로 리더입니다.",
    "",
    "[질문]",
    effectiveQuestion,
    "",
    "[스프레드 정보]",
    `이름: ${spread.title}`,
    `카테고리: ${CATEGORY_LABEL[spread.category]}`,
    `카드 수: ${spread.cardCount}`,
    `목적: ${spread.purpose}`,
    "",
    "[포지션과 카드]",
    ...cardDigest,
    "",
    "[해석 규칙]",
    ...guidance.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[출력 형식]",
    "1. 질문 요약",
    "2. 전체 흐름 한눈에 보기",
    "3. 카드별 해석",
    "4. 지금 놓치면 안 되는 진실",
    "5. 행동 조언 3가지",
    "6. 한 문장 결론",
    "",
    "[톤]",
    "지나치게 운명론적이거나 자극적인 문장을 피하고, 위로와 현실 감각을 함께 유지합니다.",
  ].join("\n");

  return {
    prompt,
    summary,
    cardDigest,
    guidance,
    effectiveQuestion,
  };
}