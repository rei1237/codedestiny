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

export const LOVE_SECRET_AI_SYSTEM_PROMPT = `당신은 30년 경력의 사주 명리학자이자 실제 연애 상담 경험이 풍부한 상담사입니다.

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
12. 사용자가 선택한 관계 상태와 상담 주제를 가장 깊게 다룹니다.
13. 궁합 점수만 말하지 말고 이유, 감정 흐름, 현실 행동 조언을 함께 전합니다.
14. 조후, 오행, 십성, 일간/일지 관계를 연애 언어로 번역합니다.
15. 속궁합은 선정적으로 쓰지 않고 감정 온도, 스킨십 선호 리듬, 친밀감 속도, 정서적 안정감 중심으로 품격 있게 다룹니다.
16. 미성년자, 강요, 통제, 추적, 성적 노골성으로 읽힐 수 있는 표현은 피합니다.`;

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
    "summaryTitle은 결과의 품격 있는 제목입니다.",
    "oneLineDiagnosis는 오늘의 관계 한 줄 진단입니다.",
    "relationshipTemperature는 두 사람의 감정 온도를 한 문장으로 정리합니다.",
    "sections와 pdfSections는 같은 상담 내용을 화면과 저장용으로 나눠 보여 줄 상담 카드입니다. 각 body는 3~7문장으로 구체적으로 씁니다.",
    "actionSecrets는 지금 당장 실천할 연애 비책 5가지입니다.",
    "sevenDayGuide는 7일 동안 실행할 수 있는 현실적인 가이드입니다.",
    "finalMessage와 finalLine은 마지막 상담사의 한마디입니다.",
    "answer는 주요 섹션을 자연스럽게 이어 붙인 전체 상담 본문입니다.",
    "",
    "- 오늘의 관계 한 줄 진단",
    "- 나의 연애 성향",
    "- 상대방의 연애 성향",
    "- 두 사람의 궁합 흐름",
    "- 오행과 조후로 보는 감정의 온도",
    "- 속궁합과 친밀감 리듬",
    "- 갈등이 생기는 지점",
    "- 상대에게 다가가는 대화법",
    "- 연락/고백/재회/관계 진전 타이밍",
    "- 내가 조심해야 할 연애 패턴",
    "- 지금 당장 실천할 연애 비책 5가지",
    "- 7일 실천 가이드",
    "- 마지막 상담사의 한마디",
    "",
    "[출력 JSON]",
    "{",
    '  "keywords": ["키워드1", "키워드2", "키워드3"],',
    '  "strategy": "지금의 연애 전략 한 문장",',
    '  "summaryTitle": "연애 비책 상담 제목",',
    '  "oneLineDiagnosis": "오늘의 관계 한 줄 진단",',
    '  "relationshipTemperature": "두 사람의 감정 온도",',
    '  "userLovePattern": "내 일간과 오행 성향을 바탕으로 본 연애 방식",',
    '  "partnerLovePattern": "상대방의 연애 성향. 상대 정보가 없으면 현재 관계에서 보이는 상대 에너지의 가능성",',
    '  "compatibilityFlow": "두 사람의 궁합 흐름과 끌림의 이유",',
    '  "fiveElementsInsight": "오행 균형과 십성/일간/일지 관계를 쉬운 말로 풀어 쓴 해석",',
    '  "johuIntimacyRhythm": "조후로 보는 감정 온도, 속궁합, 친밀감 리듬의 품격 있는 해석",',
    '  "conflictPattern": "충돌이 생기는 지점과 해서는 안 되는 말/행동",',
    '  "communicationAdvice": "연락, 대화, 고백 또는 재회 접근법",',
    '  "timingAdvice": "연락/고백/재회/관계 진전 타이밍 조언",',
    '  "actionSecrets": ["실천 비책 1", "실천 비책 2", "실천 비책 3", "실천 비책 4", "실천 비책 5"],',
    '  "sevenDayGuide": ["1일차 가이드", "2일차 가이드", "3일차 가이드", "4일차 가이드", "5일차 가이드", "6일차 가이드", "7일차 가이드"],',
    '  "sections": [',
    '    { "title": "오늘의 관계 한 줄 진단", "body": "상담 본문" },',
    '    { "title": "나의 연애 성향", "body": "상담 본문" },',
    '    { "title": "상대방의 연애 성향", "body": "상담 본문" },',
    '    { "title": "두 사람의 궁합 흐름", "body": "상담 본문" },',
    '    { "title": "오행과 조후로 보는 감정의 온도", "body": "상담 본문" },',
    '    { "title": "속궁합과 친밀감 리듬", "body": "상담 본문" },',
    '    { "title": "갈등이 생기는 지점", "body": "상담 본문" },',
    '    { "title": "상대에게 다가가는 대화법", "body": "상담 본문" },',
    '    { "title": "연락/고백/재회/관계 진전 타이밍", "body": "상담 본문" },',
    '    { "title": "이 관계에서 내가 조심해야 할 패턴", "body": "상담 본문" },',
    '    { "title": "지금 당장 실천할 연애 비책 5가지", "body": "상담 본문" },',
    '    { "title": "마지막 상담사의 한마디", "body": "상담 본문" }',
    "  ],",
    '  "pdfSections": [{ "title": "저장용 섹션 제목", "body": "저장용 상담 본문" }],',
    '  "finalMessage": "마지막 상담사의 한마디",',
    '  "finalLine": "마지막 상담사의 한마디",',
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

const STRUCTURED_SECTION_FIELDS = Object.freeze([
  ["오늘의 관계 한 줄 진단", "oneLineDiagnosis"],
  ["나의 연애 기질", "userLovePattern"],
  ["상대방의 연애 기질", "partnerLovePattern"],
  ["두 사람의 궁합 흐름", "compatibilityFlow"],
  ["오행과 조후로 보는 감정의 온도", "fiveElementsInsight"],
  ["속궁합과 친밀감 리듬", "johuIntimacyRhythm"],
  ["갈등이 생기는 지점", "conflictPattern"],
  ["상대에게 다가가는 대화법", "communicationAdvice"],
  ["연락/고백/재회/관계 진전 타이밍", "timingAdvice"],
  ["지금 당장 실천할 연애 비책 5가지", "actionSecrets"],
  ["7일 실천 가이드", "sevenDayGuide"],
  ["마지막 상담사의 한마디", "finalMessage"],
]);

function normalizeTextList(value, maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (item && typeof item === "object") return clean(item.body || item.text || item.content || item.title, 800);
    return clean(item, 800);
  }).filter(Boolean).slice(0, maxItems);
}

function bodyFromValue(value) {
  const list = normalizeTextList(value, 10);
  if (list.length) return list.map((item) => `- ${item}`).join("\n");
  return clean(value, 8000);
}

function normalizeSectionList(value, limit = 14) {
  if (!Array.isArray(value)) return [];
  return value.map((section) => ({
    title: clean(section?.title, 80),
    body: clean(section?.body || section?.content || section?.text, 8000),
  })).filter((section) => section.title && section.body.length >= 20).slice(0, limit);
}

function buildStructuredSections(parsed = {}) {
  return STRUCTURED_SECTION_FIELDS.map(([title, field]) => ({
    title,
    body: bodyFromValue(parsed[field]),
  })).filter((section) => section.body.length >= 20);
}

function fallbackSectionsFromText(text) {
  const value = clean(text, 20000).replace(/\r\n/g, "\n");
  const headingMatches = [];
  const headingPattern = /^(?:#{1,3}\s*)?(\d{1,2}[.)]\s*)?([^\n]{2,42})\n+/gm;
  let match = headingPattern.exec(value);
  while (match) {
    if (/관계|연애|궁합|오행|조후|친밀감|갈등|대화|타이밍|비책|가이드|한마디|진단/.test(match[2] || "")) {
      headingMatches.push(match);
    }
    match = headingPattern.exec(value);
  }
  if (headingMatches.length >= 3) {
    return headingMatches.map((item, index) => {
      const start = item.index + item[0].length;
      const end = headingMatches[index + 1]?.index ?? value.length;
      return {
        title: clean(item[2].replace(/\*\*/g, ""), 80),
        body: clean(value.slice(start, end), 8000),
      };
    }).filter((section) => section.title && section.body.length >= 20).slice(0, 12);
  }

  const titles = STRUCTURED_SECTION_FIELDS.map(([title]) => title);
  const paragraphs = value.split(/\n{2,}/).map((part) => clean(part, 3000)).filter(Boolean);
  const chunkSize = Math.max(1, Math.ceil(paragraphs.length / Math.min(titles.length, 8)));
  return titles.map((title, index) => ({
    title,
    body: paragraphs.slice(index * chunkSize, (index + 1) * chunkSize).join("\n\n"),
  })).filter((section) => section.body.length >= 20).slice(0, 12);
}

function normalizeReading(parsed = {}) {
  return {
    summaryTitle: clean(parsed.summaryTitle, 120),
    oneLineDiagnosis: clean(parsed.oneLineDiagnosis, 500),
    relationshipTemperature: clean(parsed.relationshipTemperature, 500),
    userLovePattern: clean(parsed.userLovePattern, 4000),
    partnerLovePattern: clean(parsed.partnerLovePattern, 4000),
    compatibilityFlow: clean(parsed.compatibilityFlow, 4000),
    fiveElementsInsight: clean(parsed.fiveElementsInsight, 4000),
    johuIntimacyRhythm: clean(parsed.johuIntimacyRhythm, 4000),
    conflictPattern: clean(parsed.conflictPattern, 4000),
    communicationAdvice: clean(parsed.communicationAdvice, 4000),
    timingAdvice: clean(parsed.timingAdvice, 4000),
    actionSecrets: normalizeTextList(parsed.actionSecrets, 5),
    sevenDayGuide: normalizeTextList(parsed.sevenDayGuide, 7),
    finalMessage: clean(parsed.finalMessage || parsed.finalLine, 1000),
  };
}

export function parseFirstConsultationResponse(text) {
  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    const raw = clean(stripCodeFence(text), 20000);
    if (raw.length < 400) {
      const error = new Error("first consultation response is not json");
      error.code = "INVALID_LLM_JSON";
      throw error;
    }
    validateConsultationText(raw);
    const sections = fallbackSectionsFromText(raw);
    if (sections.length < 5) {
      const error = new Error("first consultation response fallback is incomplete");
      error.code = "INCOMPLETE_LLM_RESPONSE";
      throw error;
    }
    return {
      keywords: ["마음의 온도", "관계 리듬", "연애 비책"],
      strategy: "지금은 마음의 속도를 낮추고 관계의 온도를 현실적으로 맞추는 흐름이 좋습니다.",
      sections,
      finalLine: "마음이 앞서도 행동은 부드럽게, 확인은 천천히 가져가 주세요.",
      answer: raw,
      reading: {
        summaryTitle: "연애 비책 상담 리포트",
        oneLineDiagnosis: sections[0]?.body || "",
        relationshipTemperature: "",
        finalMessage: "마음이 앞서도 행동은 부드럽게, 확인은 천천히 가져가 주세요.",
      },
      pdfSections: sections,
    };
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
  const reading = normalizeReading(parsed);
  const strategy = clean(parsed.strategy || reading.oneLineDiagnosis || reading.relationshipTemperature, 300);
  const explicitSections = normalizeSectionList(parsed.sections, 14);
  const structuredSections = buildStructuredSections(parsed);
  const sections = explicitSections.length >= 8 ? explicitSections : normalizeSectionList([...explicitSections, ...structuredSections], 14);
  const pdfSections = normalizeSectionList(parsed.pdfSections, 16);
  const finalLine = clean(parsed.finalLine || parsed.finalMessage || reading.finalMessage, 700);
  const sectionAnswer = sections.map((section) => `${section.title}\n${section.body}`).join("\n\n");
  const answer = clean(parsed.answer || sectionAnswer || finalLine, 24000);

  if (keywords.length !== 3 || strategy.length < 8 || answer.length < 500 || sections.length < 8) {
    const error = new Error("first consultation response is incomplete");
    error.code = "INCOMPLETE_LLM_RESPONSE";
    throw error;
  }

  validateConsultationText(`${keywords.join(" ")} ${strategy} ${answer}`);
  return {
    keywords,
    strategy,
    sections,
    finalLine,
    answer,
    reading,
    pdfSections: pdfSections.length ? pdfSections : sections,
  };
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
