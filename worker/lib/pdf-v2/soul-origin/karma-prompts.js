import { clean, stableStringify } from "./soul-origin-premium.types.js";
import { usedSystemsLabel } from "./karma-data-orchestrator.js";

export const KARMA_INTEGRATED_PROMPT_VERSION = "karma-integrated-chapter-html-v1";
const KARMA_INTEGRATED_LLM_VERSION = "2026-06-karma-integrated-llm-v1";

export const karmaIntegratedSystemPrompt = [
  "너는 사주 명리학, 베다 점성술, 서양 점성술을 모두 이해하는 통합 운세 상담 전문가다.",
  "사용자의 사주 원국, 베다 차트, 서양 점성술 차트, 대운·세운·다샤·트랜짓 데이터를 바탕으로 운명의 업을 해석한다.",
  "여기서 업은 공포스러운 업보나 저주가 아니라, 삶에서 반복되는 선택 패턴, 관계의 숙제, 감정의 습관, 재능이 막히는 방식, 그리고 회복해야 할 방향을 상징적으로 표현한 것이다.",
  "제공된 계산 데이터만 해석하며 사주, 라그나, 행성 위치, 나크샤트라, 다샤, 하우스, 어스펙트를 임의 계산하거나 추측하지 않는다.",
  "출력은 순수 HTML 조각 하나만 반환한다. JSON, 코드블록, 설명문, 프롬프트 원문, 전체 HTML 문서는 금지한다.",
  "문체는 한국어 상담체이며, 프리미엄 통합 운세 PDF 리포트처럼 신비롭고 고급스럽되 현실적인 선택권을 남긴다.",
].join("\n");

function limitationGuide(input = {}, chapterData = {}) {
  const notes = [];
  if (!clean(input.birthTime)) {
    notes.push("출생시간이 없으면 시주, 라그나, 하우스, 상승궁, D9, 다샤 해석을 단정하지 않는다.");
  }
  if (!Number.isFinite(Number(input.latitude)) || !Number.isFinite(Number(input.longitude))) {
    notes.push("위치 정보가 없거나 불완전하면 점성술 하우스와 베다 라그나 정확도 제한을 자연스럽게 밝힌다.");
  }
  for (const system of chapterData.systems || []) {
    if (system === "saju" && !chapterData.saju) notes.push("사주 데이터가 없으므로 사주 일반론으로 채우지 않는다.");
    if (system === "vedic" && !chapterData.vedic) notes.push("베다점 데이터가 없으므로 라그나, 나크샤트라, 다샤를 새로 만들지 않는다.");
    if (system === "astrology" && !chapterData.astrology) notes.push("서양 점성술 데이터가 없으므로 행성, 하우스, 어스펙트를 새로 만들지 않는다.");
  }
  return notes.length ? notes.map((note) => `- ${note}`).join("\n") : "- 제공된 계산 데이터 범위 안에서만 해석한다.";
}

function htmlContract(chapter = {}, label = "") {
  return [
    `<section class="karma-integrated-chapter" data-chapter-id="${chapter.id}">`,
    `  <h2>${chapter.title}</h2>`,
    "",
    "  <div class=\"chapter-meta\">",
    `    <p>참조 로직: ${label}</p>`,
    "  </div>",
    "",
    "  <div class=\"chapter-summary\">",
    "    <p>핵심 요약 3~5문장</p>",
    "  </div>",
    "",
    "  <div class=\"chapter-body\">",
    "    <p>통합 운세 데이터를 바탕으로 한 상담형 본문</p>",
    "    <p>사주·베다점·점성술 중 해당 챕터에 필요한 근거</p>",
    "    <p>반복되는 삶의 패턴과 카르마적 의미</p>",
    "    <p>현실에서 드러나는 문제와 회복 가능성</p>",
    "    <p>주의점과 실천 조언</p>",
    "  </div>",
    "",
    "  <div class=\"chapter-advice\">",
    "    <h3>업을 푸는 실천 처방</h3>",
    "    <ul>",
    "      <li>실천 조언 1</li>",
    "      <li>실천 조언 2</li>",
    "      <li>실천 조언 3</li>",
    "    </ul>",
    "  </div>",
    "</section>",
  ].join("\n");
}

export function buildKarmaChapterPrompt({ input = {}, chapter = {}, chapterData = {} } = {}) {
  const label = usedSystemsLabel(chapterData.systems);
  return [
    `engineVersion: ${KARMA_INTEGRATED_LLM_VERSION}`,
    `promptVersion: ${KARMA_INTEGRATED_PROMPT_VERSION}`,
    `chapterId: ${chapter.id}`,
    `chapterTitle: ${chapter.title}`,
    `chapterOrder: ${chapter.order}`,
    `chapterCategory: ${chapter.category}`,
    `chapterPurpose: ${chapter.purpose}`,
    `requiredSystems: ${(chapterData.systems || []).join(", ")}`,
    `usedSystemsLabel: ${label}`,
    "",
    "작성 원칙:",
    "- 기존 챕터 제목과 카테고리를 바꾸지 않는다.",
    "- 각 체계를 따로 나열하지 말고 하나의 운명의 업 해석으로 통합한다.",
    "- 각 챕터에는 참조 로직, 계산 데이터 근거, 반복되는 삶의 패턴, 카르마적 의미, 회복 가능성, 실천 조언을 반드시 담는다.",
    "- 전생, 저주, 파멸, 업보를 확정적으로 단정하지 않는다.",
    "- 의료·법률·투자 확정 조언을 하지 않는다.",
    "- 샘플, 예시, placeholder, Lorem ipsum, JSON, markdown, prompt라는 말을 쓰지 않는다.",
    "- <html>, <head>, <body>를 반환하지 않는다.",
    "",
    "출력 형식:",
    htmlContract(chapter, label),
    "",
    "해석 제한:",
    limitationGuide(input, chapterData),
    "",
    "사용자 입력 요약:",
    stableStringify({
      userName: input.userName,
      gender: input.gender,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      calendarType: input.calendarType,
      birthPlace: input.birthPlace,
      timezone: input.timezone,
      question: input.question,
    }),
    "",
    "이 챕터에 전달된 계산 완료 데이터:",
    stableStringify({
      saju: chapterData.saju,
      vedic: chapterData.vedic,
      astrology: chapterData.astrology,
      extra: chapterData.extra,
      warnings: chapterData.warnings,
    }),
  ].join("\n");
}

export function buildKarmaChapterRepairPrompt({ input = {}, chapter = {}, chapterData = {}, invalidHtml = "", errors = [] } = {}) {
  return [
    "이전 HTML 조각은 운명의 업 챕터 검증에 실패했다.",
    "아래 검증 오류를 모두 고쳐 같은 챕터만 다시 작성한다.",
    `검증 오류: ${(errors || []).map((item) => clean(item)).join(", ")}`,
    "기존 챕터 id, 제목, 카테고리, 참조 로직은 그대로 유지한다.",
    "반드시 section.karma-integrated-chapter HTML 조각 하나만 반환한다.",
    "",
    buildKarmaChapterPrompt({ input, chapter, chapterData }),
    "",
    "이전 HTML:",
    String(invalidHtml || "").slice(0, 9000),
  ].join("\n");
}
