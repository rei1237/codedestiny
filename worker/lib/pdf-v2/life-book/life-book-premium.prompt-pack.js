import { buildLifeBookInputDigest } from "./life-book-premium.normalizer.js";
import { asArray, clean } from "./life-book-premium.types.js";

export const LIFE_BOOK_PREMIUM_PROMPT_VERSION = "life-book-prompt-v1";

export const lifeBookSystemPrompt = [
  "당신은 전문 명리학자이자 인생의 책 원고를 쓰는 상담가입니다.",
  "출력은 반드시 완성된 HTML fragment만 작성합니다.",
  "article, h1, section, h2, p 태그만 사용하고 코드블록이나 마크다운을 쓰지 않습니다.",
  "사용자에게 직접 말하듯 자연스럽고 깊이 있게 씁니다.",
  "내부 시스템명, 요청 구조, 계산 원문, 디버그 표현, 빈 값 표현을 절대 노출하지 않습니다.",
].join("\n");

function chapterSections(chapter) {
  return asArray(chapter.sections).map((section) => `- ${section}`).join("\n");
}

function chapterFocus(chapter) {
  return asArray(chapter.focus).map((item) => `- ${item}`).join("\n");
}

export function buildLifeBookChapterPrompt({ input, chapter, chapterPlanSummary = "" } = {}) {
  return [
    `장 ID: ${clean(chapter.id)}`,
    `장 제목: ${clean(chapter.title)}`,
    "반드시 아래 구조를 지키세요.",
    `<article data-chapter-id="${clean(chapter.id)}">`,
    `<h1>${clean(chapter.title)}</h1>`,
    ...asArray(chapter.sections).map((section) => `<section><h2>${clean(section)}</h2><p>...</p><p>...</p></section>`),
    "</article>",
    "",
    "장 ID, h1 제목, h2 섹션 제목은 위 구조와 한 글자도 다르게 쓰지 마세요.",
    "다른 장의 주제를 끌어오지 말고, 이 장의 초점에 해당하는 계산 근거만 중심으로 다루세요.",
    "각 섹션 첫 문단에는 반드시 이 장의 초점과 연결되는 사주 근거를 하나 이상 자연스럽게 포함하세요.",
    "각 h2는 정확히 한 번만 쓰고, 각 section은 두 문단 이상으로 작성하세요.",
    "해석은 사주 원국, 오행, 십성, 대운, 세운 근거를 자연스럽게 엮어 작성하세요.",
    "같은 문장과 같은 조언을 반복하지 말고, 장마다 다른 결의 상담 문장을 쓰세요.",
    "부족한 정보는 단정하지 말고 '기울어 있습니다', '가능성이 드러납니다'처럼 상담 언어로 다루세요.",
    "금지: JSON, schema, payload, prompt, debug, undefined, null, NaN, [object Object], localAssembly, fallback, template.",
    "",
    "이 장의 섹션:",
    chapterSections(chapter),
    "",
    "이 장의 초점:",
    chapterFocus(chapter),
    "",
    "전체 장 구성:",
    clean(chapterPlanSummary, 5000),
    "",
    "사용자와 계산 근거:",
    buildLifeBookInputDigest(input),
  ].join("\n");
}

export function buildLifeBookRepairPrompt({ input, chapter, previousHtml = "", validationErrors = [] } = {}) {
  return [
    "이전 출력이 검증을 통과하지 못했습니다. 같은 장을 완전히 새로 작성하세요.",
    `장 ID: ${clean(chapter.id)}`,
    `장 제목: ${clean(chapter.title)}`,
    `검증 오류: ${asArray(validationErrors).map((item) => clean(item)).join(", ")}`,
    "이전 출력의 형식 오류와 반복 문장을 되풀이하지 마세요.",
    "반드시 article 하나만 출력하고, 코드블록 없이 HTML fragment만 출력하세요.",
    "금지어와 내부 표현을 쓰지 마세요.",
    "",
    "이전 출력 참고:",
    clean(previousHtml, 2500),
    "",
    buildLifeBookChapterPrompt({ input, chapter }),
  ].join("\n");
}
