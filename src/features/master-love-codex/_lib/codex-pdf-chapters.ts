import { actForChapter, type CodexActMode } from "../data/acts";
import type { CodexConsultation } from "./consultation";
import type { CodexChapterData } from "../components/CodexChapter";

/** 조판 PDF 한 장(lib/pdf/export-consultation-book-pdf 의 ConsultationBookChapter 와 같은 모양). */
export type CodexPdfChapter = { kicker: string; title: string; body: string; speaker: string };

/** 책 전체를 쓰는 화자. 결과 화면 장 머리의 칩과 PDF 장 머리·표지 지은이 줄이 같은 이름을 쓴다. */
export const MASTER_LOVE_CODEX_SPEAKER = "연애 고수";
export const MASTER_LOVE_CODEX_PDF_BYLINE = MASTER_LOVE_CODEX_SPEAKER;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** "제3장 · 제목" 접두는 서버가 붙이는 기계 표기라 장 제목에서 걷는다(CodexChapter.stripChapterPrefix 와 같은 규칙). */
function chapterTitle(title: unknown) {
  return text(title).replace(/^제\s*\d+\s*장\s*·\s*/, "");
}

/** 장 머리의 부 이름 = 그 장이 속한 막 이름. */
export function codexChapterKicker(order: number, mode: CodexActMode = "solo"): string {
  return Number(order) > 0 ? actForChapter(Number(order), mode).title : "";
}

// 화면용 굵은 소제목·`##` 줄은 PDF 소제목(●)으로, 문장 속 굵게 표시는 기호만 걷는다. 문장은 그대로다.
function toBookBody(value: string) {
  return value.replace(/\r\n/g, "\n").split("\n")
    .map((line) => {
      const heading = line.trim().match(/^(?:#{1,3}\s*)?\*\*([^*]+)\*\*[:：]?$/) || line.trim().match(/^#{1,3}\s+(.+)$/);
      return heading ? `● ${heading[1].replace(/\*\*/g, "").trim()}` : line.replace(/\*\*/g, "");
    })
    .join("\n");
}

const section = (heading: string, lines: string[]) => {
  const rows = lines.map(text).filter(Boolean);
  return rows.length ? `● ${heading}\n${rows.join("\n")}` : "";
};

/**
 * 한 장의 화면 구성(질문 답 → 해설 → 근거 → 핵심 → 주의 → 할 일 → 본문 → 다음 장 잇기)을
 * 같은 순서의 책 본문으로 엮는다. 생성된 문장은 고치지 않고 순서만 붙인다.
 */
function chapterBody(chapter: CodexChapterData, consultation?: CodexConsultation | null) {
  const content = chapter.content || {};
  const questions = new Map((consultation?.questions || []).map((question) => [question.id, question.text]));
  const periods = new Map((consultation?.periods || []).map((period) => [period.id, `${period.from} ~ ${period.until}`]));
  const parts = [
    ...(content.questionAnswers || []).map((answer) => section(text(questions.get(answer.questionId)) || "질문에 대한 답", [
      answer.answer, answer.reasoning, answer.outlook, ...(answer.actions || []).map((action) => `- ${text(action)}`), answer.reassess,
    ])),
    section("시기별 흐름", (content.periodReadings || []).map((reading) =>
      [periods.get(reading.periodId), reading.interpretation, reading.action].map(text).filter(Boolean).join(" · "))),
    text(content.narration),
    section("이 장의 근거", (content.evidence || []).map((item) => [text(item.label), text(item.explanation)].filter(Boolean).join(" — "))
      .concat((content.crossChecks || []).map((check) => check.explanation))),
    text(content.insight),
    text(content.keySentence) ? `“${text(content.keySentence)}”` : "",
    section("조심할 점", [content.caution || ""]),
    section("이번 장의 할 일", (content.actions || []).map((action) => `- ${text(action)}`)),
    toBookBody(text(chapter.body)),
    text(content.bridge),
  ];
  return parts.filter(Boolean).join("\n\n");
}

/**
 * 받은 마스터 인연의 서 전체를 조판 PDF 장 목록으로 바꾼다. 결과 화면과 보관함이 같은 리더(CodexReader)를
 * 쓰므로 이 빌더 하나로 두 곳이 같은 책을 받는다. 장 순서대로 싣고 빈 장은 넣지 않는다.
 */
export function buildMasterLoveCodexPdfChapters({ chapters, mode = "solo", consultation = null }: {
  chapters: CodexChapterData[] | null | undefined;
  mode?: CodexActMode;
  consultation?: CodexConsultation | null;
}): CodexPdfChapter[] {
  return (Array.isArray(chapters) ? chapters : [])
    .filter((chapter) => chapter && text(chapter.body))
    .slice()
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((chapter) => ({
      kicker: codexChapterKicker(chapter.order, mode),
      title: chapterTitle(chapter.title),
      body: chapterBody(chapter, consultation),
      speaker: MASTER_LOVE_CODEX_SPEAKER,
    }))
    .filter((chapter) => chapter.title && chapter.body.trim());
}
