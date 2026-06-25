import { buildLifeBookInputDigest } from "./life-book-premium.normalizer.js";
import { asArray, clean } from "./life-book-premium.types.js";

export const LIFE_BOOK_PREMIUM_PROMPT_VERSION = "life-book-prompt-v2-saju-gemini";

export const lifeBookSystemPrompt = [
  "당신은 사주명리 기반의 인생 상담문을 쓰는 전문 명리학자입니다.",
  "사주 원국, 오행, 십성, 용신, 대운, 세운 근거만 사용해 직접 상담하듯 작성하세요.",
  "출력은 HTML fragment 형태이며 article, h1, section, h2, p 태그만 사용하세요.",
  "각 장은 계약된 구조를 엄격히 따르며 섹션 누락, 섹션 추가, 제목 변경 없이 작성하세요.",
  "본문은 전문적이고 신비롭되 자연스러워야 하며 기능 설명이나 개발 용어를 노출하지 마세요.",
].join("\n");

function chapterSections(chapter) {
  return asArray(chapter.sections).map((section) => `- ${section}`).join("\n");
}

function chapterFocus(chapter) {
  return asArray(chapter.focus).map((item) => `- ${item}`).join("\n");
}

function chapterContractSections(chapter, chapterContract = null) {
  const fallbackSections = asArray(chapter.sections).map((section, index) => ({
    chapterId: clean(chapter.id),
    sectionId: `${clean(chapter.id)}-${String(index + 1).padStart(2, "0")}`,
    sectionTitle: clean(section),
    sectionIntent: clean(asArray(chapter.focus)[index] || section, 240),
  }));
  return asArray(chapterContract?.sections).length ? chapterContract.sections : fallbackSections;
}

function chapterContractSectionLines(chapterContractSections = []) {
  return asArray(chapterContractSections)
    .map((section) => `- section-id: ${clean(section.sectionId)} / section-title: ${clean(section.sectionTitle)} / section-intent: ${clean(section.sectionIntent)}`)
    .join("\n");
}

function chapterContractSectionTemplateLines(chapterContractSections = []) {
  return asArray(chapterContractSections)
    .map((section) => `<section data-category-id="${clean(section.sectionId)}"><h2>${clean(section.sectionTitle)}</h2><p>...</p><p>...</p></section>`)
    .join("\n");
}

function formatValidationFailureSummary(summary = {}) {
  const missing = asArray(summary.missingCategories).map((item) => `- missing: ${clean(item.sectionTitle || item.sectionId || item)}`).join("\n");
  const extra = asArray(summary.extraCategories).map((item) => `- extra: ${clean(item.sectionTitle || item.sectionId || item)}`).join("\n");
  const order = asArray(summary.orderIssues).map((item) => `- order: ${clean(item)}`).join("\n");
  const confidence = Number.isFinite(Number(summary.confidence)) ? Number(summary.confidence) : 0;
  return [
    `matchedCount: ${clean(summary.matchedCount || 0)}`,
    `confidence: ${String(confidence)}`,
    missing || "- missing: (none)",
    order || "- order: (none)",
    extra || "- extra: (none)",
  ].join("\n");
}

export function buildLifeBookChapterPrompt({ input, chapter, chapterPlanSummary = "", chapterContract = null } = {}) {
  const sections = chapterContractSections(chapter, chapterContract);
  return [
    `장 ID: ${clean(chapter.id)}`,
    `장 제목: ${clean(chapter.title)}`,
    "요구사항:",
    `<article data-chapter-id="${clean(chapter.id)}" data-chapter-title="${clean(chapter.title)}" data-section-count="${sections.length}">`,
    `<h1>${clean(chapter.title)}</h1>`,
    ...asArray(sections).map((section) => `<section data-category-id="${clean(section.sectionId)}"><h2>${clean(section.sectionTitle)}</h2><p>...</p><p>...</p></section>`),
    "</article>",
    "",
    "장 ID, h1 제목, h2 제목은 반드시 정확히 일치해야 합니다.",
    "각 h2는 section-title과 완전히 대응되어야 하며, section-title의 철자는 유지하세요.",
    "각 h2는 정확히 한 번만 쓰고, 각 section은 두 문단 이상으로 작성하세요.",
    "제목을 임의로 변경하거나 축약하지 말고, 계약 목록의 section-title을 유지하세요.",
    "JSON, schema, payload, prompt, undefined, null, NaN, [object Object], localAssembly, fallback, template, API, LLM 같은 용어를 본문에 노출하지 마세요.",
    "자미두수, 명반, 12궁, 주성, 사화 같은 자미두수 근거는 사용하지 마세요.",
    "명리학자가 사용자에게 직접 말하듯 쓰고, 각 문단은 사주 근거와 현실 조언이 자연스럽게 이어지게 하세요.",
    "",
    "계약 section 목록:",
    chapterContractSectionLines(sections),
    "",
    "출력 템플릿:",
    chapterContractSectionTemplateLines(sections),
    "",
    "원본 section 목록:",
    chapterSections(chapter),
    "",
    "섹션 의도:",
    chapterFocus(chapter),
    "",
    "전체 chapter 요약:",
    clean(chapterPlanSummary, 5000),
    "",
    "사용자 입력 요약:",
    buildLifeBookInputDigest(input),
  ].join("\n");
}

export function buildLifeBookRepairPrompt({ input, chapter, previousHtml = "", validationErrors = [], chapterContract = null } = {}) {
  const summary = typeof validationErrors === "object" && validationErrors !== null ? validationErrors : {};
  return [
    "이전 출력이 계약과 맞지 않았으므로, 같은 chapter 기준으로 정확히 다시 생성하세요.",
    `장 ID: ${clean(chapter.id)}`,
    `장 제목: ${clean(chapter.title)}`,
    `오류: ${asArray(summary.issues || validationErrors).map((item) => clean(item)).join(", ")}`,
    "",
    "재검증 실패 요약:",
    formatValidationFailureSummary(summary),
    "",
    "이전 출력 예시(수정 참고):",
    clean(previousHtml, 2500),
    "",
    buildLifeBookChapterPrompt({ input, chapter, chapterContract }),
  ].join("\n");
}
