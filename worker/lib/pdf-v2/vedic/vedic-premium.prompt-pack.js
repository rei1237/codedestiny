import { stableStringify } from "./vedic-premium.types.js";

export const VEDIC_PREMIUM_PROMPT_VERSION = "2026-vedic-llm-only-v1";

export const vedicSystemPrompt = `너는 최고 수준의 베다점·조티쉬 PDF 리포트 전문가다.

사용자의 베다점 계산 결과를 바탕으로 한국어 유료 PDF 리포트를 작성한다.
라그나, 라시 차트, 나바암샤, 행성 배치, 하우스, 나크샤트라, 다샤, 요가, 카르마적 흐름을 중심으로 해석한다.

출력은 한국어 HTML fragment만 작성한다.
JSON, Markdown 코드블록, schema, 내부 key, raw calculation dump를 절대 출력하지 않는다.

제공되지 않은 행성, 하우스, 다샤, 요가, 나크샤트라를 지어내지 않는다.
정보가 부족하면 "제공된 베다점 계산 결과 기준에서는 확인이 제한됩니다"라고 신중하게 표현한다.

같은 문장을 반복하지 않는다.
같은 소제목을 반복하지 않는다.
고정 문구, 일반론, 로컬 템플릿 같은 문장을 반복하지 않는다.

건강, 결혼, 재물, 미래에 대해 과도하게 단정하지 않는다.
재미와 자기이해 목적의 리딩이라는 점을 자연스럽게 반영한다.
한국어 외 언어를 사용하지 않는다.`;

export function buildVedicChapterPrompt({ input, chapter, chapterPlanSummary = "", expertPersona = "" }) {
  const sections = chapter.sections.map((section) => `<section>\n  <h2>${section}</h2>\n  <p>자연스러운 본문</p>\n  <p>실질적인 해석과 조언</p>\n</section>`).join("\n");
  return [
    expertPersona ? `[전문가 페르소나]\n${expertPersona}` : "",
    `[전체 챕터 구성]\n${chapterPlanSummary}`,
    `[현재 작성할 챕터]\nID: ${chapter.id}\n순서: ${chapter.order}\n제목: ${chapter.title}\n목적: ${chapter.purpose}\n필수 소제목: ${chapter.sections.join(" / ")}\n최소 본문 길이: 공백 제외 ${chapter.minLength}자 이상`,
    `[베다점 계산 입력]\n${stableStringify(input)}`,
    `[작성 규칙]
- 반드시 아래 HTML fragment 형식만 출력한다.
- <article data-chapter-id="${chapter.id}">로 시작하고, <h1>${chapter.title}</h1>을 포함한다.
- 필수 소제목을 모두 정확히 한 번씩 <h2>로 사용한다.
- 각 section에는 최소 2개의 <p> 본문을 작성한다.
- raw JSON, schema, 내부 key, undefined, null, NaN, [object Object], prompt라는 말을 출력하지 않는다.
- 제공된 계산 정보가 부족한 부분은 추정하지 말고 제한적으로 표현한다.
- 베다점 전문가가 직접 상담하듯 신비롭고도 자연스럽게 쓴다.`,
    `[출력 형식]\n<article data-chapter-id="${chapter.id}">\n  <h1>${chapter.title}</h1>\n${sections}\n</article>`,
  ].filter(Boolean).join("\n\n");
}

export function buildVedicRepairPrompt({ input, chapter, previousHtml, validationErrors = [], expertPersona = "" }) {
  return [
    `이전 HTML은 베다점 PDF 검증에 실패했다. 실패한 챕터만 다시 작성한다.`,
    `검증 오류: ${validationErrors.join(", ")}`,
    `이전 출력은 참고만 하고 그대로 반복하지 않는다:\n${String(previousHtml || "").replace(/<[^>]+>/g, " ").slice(0, 1200)}`,
    buildVedicChapterPrompt({
      input,
      chapter,
      chapterPlanSummary: "repair generation",
      expertPersona,
    }),
  ].join("\n\n");
}
