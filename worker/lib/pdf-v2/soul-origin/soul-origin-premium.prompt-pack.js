import { stableStringify } from "./soul-origin-premium.types.js";
import { SOUL_ORIGIN_LLM_SCHEMA_VERSION } from "./soul-origin-premium.types.js";

export const SOUL_ORIGIN_LLM_PROMPT_VERSION = "soul-origin-destiny-karma-json-v2";

export const soulOriginSystemPrompt = [
  "너는 한국어로 상담하는 전문 명리학자이자 통합 운세 상담가다.",
  "출력은 반드시 순수 JSON 하나만 반환한다. 마크다운, 코드블록, 설명문, 주석은 금지한다.",
  "계산값을 상담문으로 바꾸는 모든 문장은 네가 새로 작성해야 한다.",
  "무서운 단정, 질병·죽음·파멸 예언, 결제/서비스/기능 설명, 내부 키 이름 노출은 금지한다.",
  "상담 어조는 신비롭고 따뜻하되 현실적이어야 하며, 사용자의 선택권을 남겨야 한다.",
].join("\n");

function buildChapterAccuracyGuide(input = {}) {
  const chapters = Array.isArray(input.chapterPlan) ? input.chapterPlan : [];
  return chapters
    .map((chapter) => [
      `${chapter.chapterNumber}. ${chapter.title}`,
      `목적: ${chapter.purpose}`,
      `필수 섹션 순서: ${(chapter.requiredSections || []).join(" / ")}`,
    ].join("\n"))
    .join("\n\n");
}

export function buildSoulOriginReportPrompt({ input }) {
  return [
    `schemaVersion: ${SOUL_ORIGIN_LLM_SCHEMA_VERSION}`,
    "아래 정규화된 계산 입력만 근거로 운명의 업 PDF 원고 JSON을 작성하라.",
    "사주, 자미두수, 서양점성, 베다점성, 숙요점의 신호를 억지로 모두 같은 비중으로 쓰지 말고, 해당 장의 목적에 맞는 근거를 골라 상담문으로 풀어라.",
    "반드시 다음 JSON 형태를 지켜라.",
    `{
  "reportTitle": "string",
  "openingSummary": "string",
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "string",
      "subtitle": "string",
      "summary": "string",
      "evidencePoints": [
        { "system": "saju|ziwei|astrology|vedic|sukuyo|timing", "signal": "string", "reading": "string" }
      ],
      "sections": [{ "title": "string", "body": "string" }],
      "practicalAdvice": ["string"],
      "cautionPoints": ["string"]
    }
  ],
  "finalMessage": "string",
  "disclaimer": "string"
}`,
    "요구사항:",
    "- chapters는 1장부터 12장까지 정확히 12개다.",
    "- 각 장은 chapterPlan의 title과 순서를 글자 그대로 유지한다.",
    "- 각 장의 sections는 최소 4개이며, 첫 4개 섹션 제목은 requiredSections 순서를 그대로 따른다.",
    "- 각 section body는 상담문으로 2문장 이상 작성한다.",
    "- evidencePoints는 각 장 3개 이상이며, 최소 2개 이상의 system을 섞는다.",
    "- evidencePoints.signal은 계산 입력에 있는 실제 핵심 신호를 짧게 적고, reading은 그 신호가 해당 장에서 어떻게 드러나는지 상담 문장으로 적는다.",
    "- practicalAdvice는 각 장 3개 이상, cautionPoints는 각 장 2개 이상이다.",
    "- openingSummary와 finalMessage는 PDF에 그대로 들어가는 완성 문장이다.",
    "- disclaimer는 운세 상담의 참고 성격을 부드럽게 알리는 한 문단이다.",
    "- raw JSON, schema, payload, prompt, API, fallback, template, mock, local 같은 내부 단어를 원고에 쓰지 마라.",
    "챕터별 정확도 기준:",
    buildChapterAccuracyGuide(input),
    "정규화 입력:",
    stableStringify(input),
  ].join("\n");
}

export function buildSoulOriginRepairPrompt({ input, previousText = "", validationIssues = [] } = {}) {
  return [
    `schemaVersion: ${SOUL_ORIGIN_LLM_SCHEMA_VERSION}`,
    "이전 응답은 운명의 업 PDF JSON 검증에 실패했다.",
    "아래 검증 이슈를 모두 고쳐 순수 JSON 하나만 다시 반환하라.",
    "장 제목과 순서는 chapterPlan과 완전히 일치해야 한다.",
    "각 장의 첫 4개 섹션 제목은 requiredSections 순서를 그대로 따라야 한다.",
    "evidencePoints가 부족하거나 계산 근거와 연결되지 않은 장은 해당 장만 보강하라.",
    `검증 이슈: ${validationIssues.join(", ")}`,
    "정규화 입력:",
    stableStringify(input),
    "이전 응답:",
    String(previousText || "").slice(0, 12000),
  ].join("\n");
}
