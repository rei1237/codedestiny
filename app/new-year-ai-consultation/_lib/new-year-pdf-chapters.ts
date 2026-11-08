import {
  DOMAIN_CARDS,
  MONTHLY_CHAPTER,
  buildDomainBodies,
  classifySections,
  isGenuineCustomQuestion,
  splitAssistantSections,
} from "./answer-sections";

export type NewYearPdfChapter = { kicker: string; title: string; body: string; speaker: string };
export type NewYearPdfSource = {
  /** 결과 API의 구조화 섹션(llmMeta.sections). 보관함에는 없어 조립본으로 대신한다. */
  sections?: Array<{ key: string; text: string }> | null;
  messages?: Array<{ role: string; content?: string }> | null;
};

export const NEW_YEAR_PDF_SPEAKER = "네오";
export const NEW_YEAR_PDF_QUESTION_TITLE = "질문에 대한 답변";
const FALLBACK_TITLE = "신년운세 상담";

// 화면용 굵은 소제목 줄은 PDF 소제목(●)으로, 문장 속 굵게 표시는 기호만 걷는다. 문장은 그대로다.
function toBookBody(value: string) {
  return value.replace(/\r\n/g, "\n").split("\n")
    .map((line) => {
      const heading = line.trim().match(/^(?:#{1,3}\s*)?\*\*([^*]+)\*\*[:：]?$/);
      return heading ? `● ${heading[1].trim()}` : line.replace(/\*\*/g, "");
    })
    .join("\n");
}

/**
 * 받은 신년운세 전체를 조판 PDF 장 목록으로 바꾼다. 결과 화면의 장 순서(질문 답변 → 분야 장, 열두 달은 건강 앞)를
 * 그대로 따르고 본문 글자는 고치지 않는다. 결과 화면과 보관함이 같은 빌더를 쓴다.
 * 분야 마커가 없는 예전 답변은 통째로 한 장이 된다.
 */
export function buildNewYearPdfChapters(source: NewYearPdfSource): NewYearPdfChapter[] {
  const messages = source.messages || [];
  const answer = String(messages.find((message) => message.role === "assistant")?.content || "").trim();
  const question = String(messages.find((message) => message.role === "user")?.content || "").trim();
  if (!answer) return [];
  const classified = classifySections(splitAssistantSections(answer));
  const bodies = buildDomainBodies(source.sections || [], classified.domains);
  const chapters: NewYearPdfChapter[] = [];
  const push = (kicker: string, title: string, body: string) => {
    if (body.trim()) chapters.push({ kicker, title, body: toBookBody(body), speaker: NEW_YEAR_PDF_SPEAKER });
  };
  if (classified.questionAnswer && isGenuineCustomQuestion(question)) {
    push("네 질문에 대한 답", NEW_YEAR_PDF_QUESTION_TITLE, `“${question}”\n\n${classified.questionAnswer.body}`);
  }
  const months = [...classified.monthLetters.entries()].sort(([a], [b]) => a - b)
    .map(([month, letter]) => `● ${month}월 · ${letter.ganji} · ${letter.keyword}\n${letter.body}`).join("\n\n");
  const cards = DOMAIN_CARDS.filter((card) => bodies.get(card.key));
  let monthlyPlaced = !months;
  for (const card of cards) {
    if (card.key === "health" && !monthlyPlaced) { push(MONTHLY_CHAPTER.kicker, MONTHLY_CHAPTER.label, months); monthlyPlaced = true; }
    push(card.kicker, card.label, bodies.get(card.key) || "");
  }
  if (!monthlyPlaced) push(MONTHLY_CHAPTER.kicker, MONTHLY_CHAPTER.label, months);
  if (!cards.length) return [{ kicker: "", title: FALLBACK_TITLE, body: toBookBody(answer), speaker: NEW_YEAR_PDF_SPEAKER }];
  return chapters;
}
