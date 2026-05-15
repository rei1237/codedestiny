import { VEDIC_KNOWLEDGE_BASE } from "./vedicPdfKnowledgeBase";
import type { VedicPdfChapterDefinition, VedicPdfContext } from "./types";

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

export function buildVedicGeminiPrompt(input: {
  chapter: VedicPdfChapterDefinition;
  context: VedicPdfContext;
  previousChapterTexts?: string[];
}): string {
  const previousChapterTexts = Array.isArray(input.previousChapterTexts)
    ? input.previousChapterTexts.filter((text) => String(text || "").trim().length > 0).slice(-3)
    : [];

  return [
    "[SYSTEM ROLE]",
    "너는 베다점 PDF용 해석 생성기다. 계산기가 아니다.",
    "라그나, 나크샤트라, 다샤, 요가, D9, D10을 임의 생성하거나 추정하지 마라.",
    "없는 데이터는 null, [], fallbackUsed=true로 처리하고 본문에 추정으로 쓰지 마라.",
    "건강/수명/사망을 단정하지 말고, 경향/루틴/권장 행동 중심으로 작성하라.",
    "",
    "[CHAPTER TARGET]",
    `chapterNumber: ${input.chapter.number}`,
    `chapterId: ${input.chapter.id}`,
    `chapterTitle: ${input.chapter.titleKo}`,
    `objective: ${input.chapter.objective}`,
    "",
    "[VEDIC KNOWLEDGE BASE]",
    safeJson(VEDIC_KNOWLEDGE_BASE),
    "",
    "[NORMALIZED CONTEXT]",
    safeJson(input.context),
    "",
    "[PREVIOUS CHAPTER TEXTS - OPTIONAL]",
    safeJson(previousChapterTexts),
    "",
    "[OUTPUT RULES]",
    "반드시 JSON만 출력하라. 마크다운 코드펜스 금지.",
    "JSON 스키마:",
    safeJson({
      chapterNumber: input.chapter.number,
      chapterId: input.chapter.id,
      title: input.chapter.titleKo,
      summary: "핵심 요약 6~10문장",
      sections: [
        { title: "섹션 제목", body: "2~4문단" },
      ],
      actionItems: ["실행 항목 1", "실행 항목 2", "실행 항목 3"],
      cautions: ["주의 1", "주의 2"],
      missingFields: ["context 내 누락된 경로"],
      fallbackUsed: false,
      confidence: 0.0,
    }),
    "",
    "[CONSTRAINTS]",
    "- sections는 최소 4개",
    "- actionItems는 3~7개",
    "- confidence는 0~1 사이 숫자",
    "- missingFields는 context.missingSummary와 일치하거나 그 부분집합",
    "- compatibility 모드면 관계/소통 문맥 포함",
  ].join("\n");
}
