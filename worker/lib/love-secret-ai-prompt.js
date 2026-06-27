const FORBIDDEN_RESULT_PATTERNS = Object.freeze([
  /\bAI\b/i,
  /프롬프트/g,
  /시스템/g,
  /\bPDF\b/i,
  /챕터/g,
  /\bchapter\b/i,
  /\bjob\b/i,
  /\bprogress\b/i,
  /\bmock\b/i,
  /\btemplate\b/i,
]);

const UNSAFE_ADVICE_PATTERNS = Object.freeze([
  /스토킹/g,
  /감시하/g,
  /뒤쫓/g,
  /심리\s*조종/g,
  /죄책감을\s*유발/g,
  /무조건\s*(연락|기다|붙잡|밀어붙)/g,
  /반드시\s*(돌아|좋아|싫어|연락)/g,
]);

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return "{}";
  }
}

function stripCodeFence(text) {
  const raw = clean(text);
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? clean(fenced[1]) : raw;
}

function extractJsonObject(text) {
  const raw = stripCodeFence(text);
  if (raw.startsWith("{") && raw.endsWith("}")) return raw;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return "";
}

function hasForbiddenResultText(text) {
  return FORBIDDEN_RESULT_PATTERNS.some((pattern) => pattern.test(String(text || "")));
}

function hasUnsafeAdvice(text) {
  return UNSAFE_ADVICE_PATTERNS.some((pattern) => pattern.test(String(text || "")));
}

export const LOVE_SECRET_AI_SYSTEM_PROMPT = `당신은 연애 비책을 상담하는 최고 수준의 명리학 상담가이자 관계 상담가입니다.

사용자의 생년월일, 성별, 출생시간, 양력/음력 정보, 현재 관계 상태, 상담 주제, 자유 질문, 그리고 계산된 명식/궁합 데이터를 바탕으로 사용자의 연애 상황을 상담형으로 해석합니다.

반드시 지켜야 할 원칙:

1. 실제 연애 상담사가 조용히 마주 앉아 말하듯 부드럽고 현실적으로 답변합니다.
2. 명리학적 근거를 사용하되 사용자가 이해하기 쉬운 관계 언어로 풀이합니다.
3. 상대방 정보가 있을 경우 두 사람의 끌림, 갈등, 안정성, 관계 지속 가능성을 함께 봅니다.
4. 상대방 정보가 없을 경우 사용자의 연애 패턴, 감정 방식, 선택 습관, 반복되는 관계 문제를 중심으로 봅니다.
5. 상대방의 마음을 확정적으로 단정하지 않고 가능성과 흐름으로 설명합니다.
6. 불안감을 조장하거나 집착, 감시, 압박, 심리 조종을 조언하지 않습니다.
7. "무조건 연락이 온다", "반드시 헤어진다", "상대는 당신을 사랑한다" 같은 단정 표현을 쓰지 않습니다.
8. 재회, 고백, 결혼, 갈등 상담에서는 사용자가 실제로 할 수 있는 행동을 제시합니다.
9. 필요한 경우 기다림, 거리두기, 대화 방식, 자기 보호를 균형 있게 안내합니다.
10. 같은 문장을 반복하지 않습니다.
11. "AI", "프롬프트", "시스템", "PDF", "챕터", "job", "progress", "mock", "template" 같은 표현을 결과에 노출하지 않습니다.
12. 사용자가 선택한 관계 상태와 상담 주제를 가장 깊게 다룹니다.`;

export function buildFirstConsultationPrompt(input = {}, sajuResult = {}) {
  const partnerMode = sajuResult?.partnerChart ? "상대 포함 연애 상담 모드" : "단독 연애 상담 모드";
  return [
    "[상담 모드]",
    partnerMode,
    "",
    "[입력 정보]",
    safeJson({
      myInfo: input.myInfo,
      partnerInfo: input.partnerInfo || null,
      relationshipStatus: input.relationshipStatus,
      topic: input.topic,
      userQuestion: input.userQuestion || "",
    }),
    "",
    "[계산된 명식과 궁합 데이터]",
    safeJson(sajuResult),
    "",
    "[첫 답변 작성 방식]",
    "아래 JSON 형식만 출력합니다. JSON 밖에 다른 문장을 붙이지 않습니다.",
    "keywords는 지금 이 관계의 핵심 키워드 3개입니다.",
    "strategy는 지금의 연애 전략을 한 문장으로 씁니다.",
    "answer는 아래 흐름을 자연스럽게 이어서 상담하듯 작성합니다.",
    "sections는 결과 화면에 나눠 보여 줄 상담 카드입니다. 각 body는 2~5문장으로 자연스럽게 씁니다.",
    "finalLine은 마지막 한 줄 조언입니다.",
    "",
    "- 지금 연애 흐름의 핵심 결론",
    "- 나의 연애 성향",
    "- 상대방 또는 관계의 현재 온도",
    "- 반복되는 감정 패턴",
    "- 조심해야 할 말과 행동",
    "- 가능성을 높이는 접근법",
    "- 지금 당장 하지 말아야 할 것",
    "- 오늘의 연애 비책",
    "- 마지막 한 줄 조언",
    "",
    "[출력 JSON]",
    "{",
    '  "keywords": ["키워드1", "키워드2", "키워드3"],',
    '  "strategy": "지금의 연애 전략 한 문장",',
    '  "sections": [',
    '    { "title": "지금 연애 흐름의 핵심 결론", "body": "상담 본문" },',
    '    { "title": "나의 연애 성향", "body": "상담 본문" },',
    '    { "title": "관계의 현재 온도", "body": "상담 본문" },',
    '    { "title": "반복되는 감정 패턴", "body": "상담 본문" },',
    '    { "title": "조심해야 할 말과 행동", "body": "상담 본문" },',
    '    { "title": "가능성을 높이는 접근법", "body": "상담 본문" },',
    '    { "title": "오늘의 연애 비책", "body": "상담 본문" },',
    '    { "title": "마지막 한 줄 조언", "body": "상담 본문" }',
    "  ],",
    '  "finalLine": "마지막 한 줄 조언",',
    '  "answer": "sections 내용을 자연스럽게 이어 붙인 상담 본문"',
    "}",
  ].join("\n");
}

export function buildFollowUpConsultationPrompt(consultation = {}, userMessage = "") {
  const messages = Array.isArray(consultation.messages)
    ? consultation.messages.slice(-8).map((message) => ({
      role: message.role,
      content: clean(message.content, 2400),
    }))
    : [];
  return [
    "[상담 기본 정보]",
    safeJson({
      myInfo: consultation.myInfo,
      partnerInfo: consultation.partnerInfo || null,
      relationshipStatus: consultation.relationshipStatus,
      topic: consultation.topic,
      sajuResult: consultation.sajuResult,
    }),
    "",
    "[이전 대화]",
    safeJson(messages),
    "",
    "[사용자의 추가 질문]",
    clean(userMessage, 1200),
    "",
    "위 흐름을 이어서 실제 상담처럼 답변합니다.",
    "상대방의 마음을 단정하지 말고, 사용자가 건강한 선택을 할 수 있도록 현실적인 다음 행동을 제안합니다.",
    "결과에는 금지 표현을 쓰지 않습니다.",
  ].join("\n");
}

export function parseFirstConsultationResponse(text) {
  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    const error = new Error("first consultation response is not json");
    error.code = "INVALID_LLM_JSON";
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    error.code = "INVALID_LLM_JSON";
    throw error;
  }

  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.map((item) => clean(item, 24)).filter(Boolean).slice(0, 3)
    : [];
  const strategy = clean(parsed.strategy, 240);
  const sections = Array.isArray(parsed.sections)
    ? parsed.sections.map((section) => ({
      title: clean(section?.title, 80),
      body: clean(section?.body, 6000),
    })).filter((section) => section.title && section.body.length >= 20).slice(0, 10)
    : [];
  const finalLine = clean(parsed.finalLine, 500);
  const sectionAnswer = sections.map((section) => `${section.title}\n${section.body}`).join("\n\n");
  const answer = clean(parsed.answer || sectionAnswer || finalLine, 20000);

  if (keywords.length !== 3 || strategy.length < 8 || answer.length < 160 || sections.length < 5) {
    const error = new Error("first consultation response is incomplete");
    error.code = "INCOMPLETE_LLM_RESPONSE";
    throw error;
  }

  validateConsultationText(`${keywords.join(" ")} ${strategy} ${answer}`);
  return { keywords, strategy, sections, finalLine, answer };
}

export function validateConsultationText(text) {
  const value = clean(text);
  if (!value) {
    const error = new Error("consultation response is empty");
    error.code = "EMPTY_LLM_RESPONSE";
    throw error;
  }
  if (hasForbiddenResultText(value)) {
    const error = new Error("consultation response contains forbidden terms");
    error.code = "FORBIDDEN_RESULT_TEXT";
    throw error;
  }
  if (hasUnsafeAdvice(value)) {
    const error = new Error("consultation response contains unsafe advice");
    error.code = "UNSAFE_RELATIONSHIP_ADVICE";
    throw error;
  }
  return value;
}

export function normalizeFollowUpResponse(text) {
  const value = clean(text, 20000);
  if (value.length < 40) {
    const error = new Error("follow-up response is too short");
    error.code = "INCOMPLETE_LLM_RESPONSE";
    throw error;
  }
  validateConsultationText(value);
  return value;
}

export const __loveSecretAiPromptTestUtils = {
  hasForbiddenResultText,
  hasUnsafeAdvice,
};
