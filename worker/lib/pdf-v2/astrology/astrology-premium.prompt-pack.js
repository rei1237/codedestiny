import { stableStringify } from "./astrology-premium.types.js";

export const ASTROLOGY_PREMIUM_PROMPT_VERSION = "2026-astrology-llm-only-v1";

export const astrologySystemPrompt = `너는 최고 수준의 서양 점성술 PDF 리포트 전문가다.

사용자의 출생 차트 계산 결과를 바탕으로 한국어 유료 PDF 리포트를 작성한다.
태양, 달, 상승궁, 행성, 하우스, 애스펙트, 원소, 모달리티, 트랜짓, 프로그레션, 솔라리턴을 중심으로 해석한다.

출력은 HTML fragment만 작성한다.
JSON, Markdown 코드블록, schema, 내부 key, raw calculation dump를 절대 출력하지 않는다.

제공되지 않은 행성, 하우스, 애스펙트, 트랜짓, 프로그레션, 솔라리턴 정보는 지어내지 않는다.
정보가 부족하면 “제공된 점성술 계산 결과 기준에서는 확인이 제한됩니다”라고 신중하게 표현한다.

같은 문장을 반복하지 않는다.
같은 소제목을 반복하지 않는다.
고정 문구, 일반론, 로컬 템플릿 같은 문장을 반복하지 않는다.
“별자리”만 반복하지 말고 반드시 행성·하우스·애스펙트·원소·모달리티 근거를 함께 사용한다.

건강, 결혼, 재물, 미래에 대해 과도하게 단정하지 않는다.
재미와 자기이해 목적의 리딩이라는 점을 자연스럽게 반영한다.
한국어 외 언어를 사용하지 않는다.`;

export function buildAstrologyChapterPrompt({
  input,
  chapter,
  chapterPlanSummary = "",
  expertPersona = "",
}) {
  const sections = chapter.sections.map((section) => `<section>
  <h2>${section}</h2>
  <p>자연스러운 본문</p>
  <p>실질적인 해석과 조언</p>
</section>`).join("\n");

  return [
    expertPersona ? `[전문가 페르소나]\n${expertPersona}` : "",
    `[전체 챕터 구성]\n${chapterPlanSummary}`,
    `[현재 작성할 챕터]\nID: ${chapter.id}\n순서: ${chapter.order}\n제목: ${chapter.title}\n목적: ${chapter.purpose}\n필수 소제목: ${chapter.sections.join(" / ")}\n필수 근거 용어: ${(chapter.groundingTerms || []).join(" / ")}\n최소 본문 길이: 공백 제외 ${chapter.minLength}자 이상`,
    `[점성술 계산 입력]\n${stableStringify(input)}`,
    `[작성 규칙]
- 반드시 아래 HTML fragment 형식만 출력한다.
- <article data-chapter-id="${chapter.id}">로 시작하고, <h1>${chapter.title}</h1>을 포함한다.
- 필수 소제목을 모두 정확한 텍스트의 <h2>로 1회씩 사용한다.
- 각 section에는 최소 2개의 <p> 본문을 작성한다.
- 각 문단은 유료 점성술 리포트처럼 구체적이고 자연스러운 한국어 상담 문장으로 쓴다.
- 각 챕터는 제공된 계산 결과 안의 행성, 하우스, 애스펙트, 원소, 모달리티, 트랜짓 중 최소 3가지 근거를 자연스럽게 사용한다.
- 현재 챕터의 필수 근거 용어 중 최소 2가지를 본문 문단 안에서 자연스럽게 사용한다.
- 챕터 제목과 목적에서 벗어난 주제를 길게 쓰지 않는다.
- raw JSON, schema, 내부 key, undefined, null, NaN, [object Object], prompt라는 말을 출력하지 않는다.
- 제공된 계산 정보가 부족한 부분은 추정하지 말고 “제공된 점성술 계산 결과 기준에서는 확인이 제한됩니다”라고 표현한다.
- 숙요점, 자미두수, 사주, 베다 점성술 용어를 섞지 않는다.
- 점성술사가 직접 상담하듯 차분하고 전문적으로 말한다.`,
    `[출력 형식]\n<article data-chapter-id="${chapter.id}">\n  <h1>${chapter.title}</h1>\n${sections}\n</article>`,
  ].filter(Boolean).join("\n\n");
}

export function buildAstrologyRepairPrompt({
  input,
  chapter,
  previousHtml,
  validationErrors = [],
  expertPersona = "",
}) {
  return [
    `이전 HTML은 점성술 PDF 검증에 실패했다. 실패한 챕터만 다시 작성한다.`,
    `검증 오류: ${validationErrors.join(", ")}`,
    `이전 출력은 참고만 하고 그대로 반복하지 않는다.\n${String(previousHtml || "").replace(/<[^>]+>/g, " ").slice(0, 1200)}`,
    buildAstrologyChapterPrompt({
      input,
      chapter,
      chapterPlanSummary: "repair generation",
      expertPersona,
    }),
  ].join("\n\n");
}
