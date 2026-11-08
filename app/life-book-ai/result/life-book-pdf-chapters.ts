export type LifeBookPdfChapter = { kicker: string; title: string; body: string; speaker: string };

type ReportChapter = { chapterNumber?: number; title?: string; summary?: string; content?: string; advice?: string[] };
type ReportReading = { title?: string; content?: string; guidance?: string[] };
type ReportJson = { chapters?: ReportChapter[]; expertReadings?: ReportReading[]; finalMessage?: string };
export type LifeBookPdfSource = {
  /** 결과 API의 조립본. 보관함에는 없어 assistant 메시지의 JSON으로 대신한다. */
  reportJson?: ReportJson | null;
  messages?: Array<{ role: string; content?: string }> | null;
};

export const LIFE_BOOK_PDF_SPEAKER = "윤달";
export const LIFE_BOOK_PDF_FALLBACK_TITLE = "인생의 책";
const ADVICE_HEADING = "윤달의 조언";
const READING_KICKER = "깊은 판독";
const FINAL_KICKER = "맺는 말";

// 장 제목 → 부 이름. 두 상품(인생의 책·인생 총운)의 정본 장 제목을 함께 덮는다. 옛 세션도 같은 제목이라 그대로 붙는다.
const CHAPTER_KICKERS: Array<[RegExp, string]> = [
  [/타고난 (?:사주의 원형|명식의 중심)/, "타고난 결"],
  [/성격과 (?:내면|마음)/, "마음의 결"],
  [/재능과 일/, "일과 재능"],
  [/사랑과 인연/, "인연"],
  [/재물과 (?:현실|생활)/, "재물"],
  [/(?:인간관계|관계)와 가족/, "곁의 사람들"],
  [/건강과 (?:조후|생활)/, "몸의 리듬"],
  [/대운으로 보는/, "큰 흐름"],
  [/가까운 (?:시기의 )?세운/, "가까운 때"],
  [/마지막 문장|앞으로 열릴 선택/, "다음 장"],
];

/** 장 제목으로 부 이름을 찾는다. 모르는 제목(다른 로케일·예전 마크다운)은 빈 문자열이다. */
export function lifeBookChapterKicker(title: string): string {
  const value = String(title || "");
  return CHAPTER_KICKERS.find(([pattern]) => pattern.test(value))?.[1] || "";
}

function parseReport(content: string): ReportJson | null {
  const raw = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? parsed as ReportJson : null;
  } catch {
    return null;
  }
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// 화면용 굵은 소제목 줄은 PDF 소제목(●)으로, 문장 속 굵게 표시는 기호만 걷는다. 문장은 그대로다.
function toBookBody(value: string) {
  return value.replace(/\r\n/g, "\n").split("\n")
    .map((line) => {
      const heading = line.trim().match(/^(?:#{1,3}\s*)?\*\*([^*]+)\*\*[:：]?$/);
      return heading ? `● ${heading[1].trim()}` : line.replace(/\*\*/g, "");
    })
    .join("\n");
}

function withList(body: string, items: unknown) {
  const list = Array.isArray(items) ? items.map(text).filter(Boolean) : [];
  return list.length ? `${body}\n\n● ${ADVICE_HEADING}\n${list.map((item) => `- ${item}`).join("\n")}` : body;
}

/**
 * 받은 인생의 책·인생 총운 전체를 조판 PDF 장 목록으로 바꾼다. 장 → 깊은 판독 → 맺는 말 순서이고,
 * 본문 글자는 고치지 않는다. 결과 화면과 보관함이 같은 빌더를 쓴다. JSON이 아닌 예전 답변은 통째로 한 장이 된다.
 */
export function buildLifeBookPdfChapters(source: LifeBookPdfSource): LifeBookPdfChapter[] {
  const answer = text(source.messages?.find((message) => message.role === "assistant")?.content);
  const report = source.reportJson?.chapters?.length ? source.reportJson : answer ? parseReport(answer) : null;
  const chapters: LifeBookPdfChapter[] = [];
  const push = (kicker: string, title: string, body: string) => {
    if (title && body.trim()) chapters.push({ kicker, title, body: toBookBody(body), speaker: LIFE_BOOK_PDF_SPEAKER });
  };
  for (const chapter of report?.chapters || []) {
    const title = text(chapter?.title);
    const lead = text(chapter?.summary);
    const content = text(chapter?.content);
    push(lifeBookChapterKicker(title), title, withList([lead, content].filter(Boolean).join("\n\n"), chapter?.advice));
  }
  for (const reading of report?.expertReadings || []) {
    push(READING_KICKER, text(reading?.title), withList(text(reading?.content), reading?.guidance));
  }
  const finalMessage = text(report?.finalMessage);
  if (finalMessage) push(FINAL_KICKER, FINAL_KICKER, finalMessage);
  if (!chapters.length && answer && !report) {
    return [{ kicker: "", title: LIFE_BOOK_PDF_FALLBACK_TITLE, body: toBookBody(answer), speaker: LIFE_BOOK_PDF_SPEAKER }];
  }
  return chapters;
}
