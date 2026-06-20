import {
  SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
  SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
  clean,
} from "./saju-new-year-premium.types.js";

export const sajuNewYearSystemPrompt = [
  "당신은 프리미엄 신년운세를 쓰는 명리학 상담가입니다.",
  "제공된 사주 계산 JSON은 이미 확정된 계산 결과입니다. 천간, 지지, 오행, 십성, 월운 점수, Go/Watch/Stop 판단을 다시 계산하거나 고치지 마세요.",
  "출력은 반드시 JSON 객체 하나만 반환하세요. 마크다운, 코드블록, 설명문, 주석을 붙이지 마세요.",
  "개발 용어, 시스템 용어, 데이터 용어, API 용어, fallback/local/template/debug/schema/prompt/json/llm 같은 단어를 상담문 안에 쓰지 마세요.",
  "불안 조장, 의학적 진단, 투자 확정 조언, 단정적 재난 표현을 피하고 전문적이며 신비로운 존댓말 상담체로 씁니다.",
].join("\n");

function compactForPrompt(value) {
  return JSON.stringify(value, null, 2);
}

function chapterPlanLine(chapter) {
  return `${chapter.no}. ${chapter.title}: ${(chapter.categories || []).join(" / ")}`;
}

function chapterDomainGuide(chapter = {}) {
  const guides = {
    1: "총운, 세운, 원국, 오행 균형, 올해 기준",
    2: "커리어, 일, 직장, 조직, 평가, 성과, 전환",
    3: "재물, 돈, 수입, 지출, 계약, 가격, 소비 습관",
    4: "인간관계, 귀인, 협업, 파트너십, 갈등 조율",
    5: "연애, 결혼, 가족, 가까운 관계, 감정 거리",
    6: "건강, 생활 리듬, 피로, 스트레스, 회복, 마음",
    7: "1분기, 2분기, 3분기, 4분기, 결정 타이밍",
    8: "위험 관리, 합충형파해, 반복 실수, 반전 전략, 회복 플랜",
    9: "1월부터 12월까지 월별 실행, 관망, 정비 지도",
    10: "최종 메시지, 정리, 밀어붙일 것, 내려놓을 것, 1년 루틴",
  };
  return guides[Number(chapter?.no || 0)] || "해당 챕터 제목과 소제목의 실제 주제";
}

export function buildSajuNewYearChapterPrompt({ input, chapter, chapterPlanSummary }) {
  return [
    `promptVersion: ${SAJU_NEW_YEAR_LLM_PROMPT_VERSION}`,
    `schemaVersion: ${SAJU_NEW_YEAR_LLM_SCHEMA_VERSION}`,
    "",
    "아래 계산 입력만 근거로 신년운세 PDF의 한 챕터를 작성하세요.",
    "각 section.body는 공백 제외 850자 이상이어야 하며, 최소 3개 문단으로 나누세요.",
    "각 section.body에는 해당 소제목, 원국, 세운, 월운, 오행, 십성 중 최소 4개 이상의 실제 근거 단어가 자연스럽게 들어가야 합니다.",
    `이번 챕터의 주제 anchor는 반드시 반복해서 살아 있어야 합니다: ${chapterDomainGuide(chapter)}`,
    "각 section.body는 그 소제목의 현실 영역을 정확히 다루어야 하며, 다른 챕터의 주제로 일반화하지 마세요.",
    "section.title은 요청한 제목과 정확히 같아야 합니다.",
    "chapter 9에서는 monthlyFortunes 12개를 반드시 함께 작성하세요. 각 달은 LLM 상담문으로 title, flow, advice, caution, action, luckyRoutine을 모두 채우세요.",
    "",
    "전체 챕터 구조:",
    chapterPlanSummary,
    "",
    "이번에 작성할 챕터:",
    chapterPlanLine(chapter),
    "",
    "반환 JSON 형식:",
    compactForPrompt({
      schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
      targetYear: input.targetYear,
      chapterNo: chapter.no,
      title: chapter.title,
      focus: "이 챕터의 핵심 상담 초점",
      sections: (chapter.categories || []).map((title) => ({
        title,
        body: "공백 제외 850자 이상의 상담문. 최소 3문단.",
        sajuEvidence: ["계산 근거 문장 1", "계산 근거 문장 2"],
        keyPoints: ["핵심 포인트"],
        actionGuide: ["실천 조언"],
        checklist: ["확인할 것"],
        caution: ["주의할 점"],
      })),
      monthlyFortunes: chapter.no === 9 ? Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        title: `${index + 1}월의 흐름`,
        flow: "월별 운세 상담문",
        advice: "실천 조언",
        caution: "주의점",
        action: "이번 달 실행",
        luckyRoutine: "운을 살리는 루틴",
      })) : undefined,
      finalAdvice: chapter.no === 10 ? {
        title: "마지막 조언",
        body: "공백 제외 700자 이상의 최종 상담문",
      } : undefined,
    }),
    "",
    "계산 입력:",
    compactForPrompt(input),
  ].join("\n");
}

export function buildSajuNewYearRepairPrompt({ input, chapter, previousJsonText, validationErrors }) {
  return [
    `promptVersion: ${SAJU_NEW_YEAR_LLM_PROMPT_VERSION}`,
    `schemaVersion: ${SAJU_NEW_YEAR_LLM_SCHEMA_VERSION}`,
    "",
    "이전 응답은 검증을 통과하지 못했습니다. 계산값은 바꾸지 말고 해당 챕터 JSON만 다시 작성하세요.",
    `검증 오류: ${(validationErrors || []).map((item) => clean(item, 200)).join(", ")}`,
    "반드시 JSON 객체 하나만 반환하세요.",
    "",
    "작성 대상:",
    chapterPlanLine(chapter),
    "",
    "이전 응답:",
    clean(previousJsonText, 60000),
    "",
    "계산 입력:",
    compactForPrompt(input),
  ].join("\n");
}
