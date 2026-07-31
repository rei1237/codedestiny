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
  /이\s*기능은/g,
  /이\s*결과는/g,
  /분석\s*결과는/g,
  /콘텐츠\s*블록/g,
]);

const UNSAFE_ADVICE_PATTERNS = Object.freeze([
  /스토킹/g,
  /감시하/g,
  /뒤쫓/g,
  /심리\s*조종/g,
  /죄책감을\s*유발/g,
  /무조건\s*(연락|기다|붙잡|밀어붙|이뤄|이루어|잘\s*풀|성공)/g,
  /반드시\s*(돌아|좋아|싫어|연락|이뤄|이루어|결혼|사귀|재회|성공)/g,
  /100\s*%\s*(이뤄|성공|돌아|확실)/g,
  /틀림없이\s*(이뤄|돌아|사귀|결혼)/g,
]);

export const LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS = 10000;
export const LOVE_SECRET_AI_MAX_TOTAL_BODY_CHARS = 20000;
const LOVE_SECRET_AI_PARSE_TEXT_MAX_CHARS = 24000;

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
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

// 토큰 상한 절단으로 잘린 JSON을 마지막 완결 값 경계까지 잘라내고 열린 괄호를 닫아
// 파싱 가능한 부분만이라도 복구한다(하드 실패 대신 degrade — 완결성 검증은 호출부가 수행).
function salvageTruncatedJsonObject(text) {
  const raw = stripCodeFence(text);
  const start = raw.indexOf("{");
  if (start < 0) return null;
  const body = raw.slice(start);

  // 한 번의 전방 스캔으로 "문자열 밖 완결 경계" 후보 위치와 그 시점의 괄호 스택을 수집.
  const candidates = [];
  const stack = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      if (inString) escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      if (!inString) candidates.push({ end: i + 1, stack: stack.slice() });
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      stack.pop();
      candidates.push({ end: i + 1, stack: stack.slice() });
    }
  }

  // 뒤쪽 후보부터(가장 많은 내용을 보존) 닫는 괄호를 보충해 파싱을 시도.
  const maxTries = 40;
  for (let idx = candidates.length - 1, tried = 0; idx >= 0 && tried < maxTries; idx -= 1, tried += 1) {
    const { end, stack: openBrackets } = candidates[idx];
    if (!openBrackets.length && end < body.length) continue;
    const candidate = body.slice(0, end);
    let closers = "";
    for (let i = openBrackets.length - 1; i >= 0; i -= 1) {
      closers += openBrackets[i] === "{" ? "}" : "]";
    }
    try {
      const parsed = JSON.parse(candidate + closers);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // 다음 후보로 계속
    }
  }
  return null;
}

function hasForbiddenResultText(text) {
  return FORBIDDEN_RESULT_PATTERNS.some((pattern) => pattern.test(String(text || "")));
}

function hasUnsafeAdvice(text) {
  return UNSAFE_ADVICE_PATTERNS.some((pattern) => pattern.test(String(text || "")));
}

export const LOVE_SECRET_AI_SYSTEM_PROMPT = `당신은 30년 경력의 사주 명리학자이자 실제 연애 상담 경험이 풍부한 상담사입니다.

사용자의 생년월일, 성별, 출생시간, 양력/음력 정보, 현재 관계 상태, 상담 주제, 자유 질문, 그리고 계산된 명식과 궁합 데이터를 바탕으로 사랑의 흐름을 상담형으로 해석합니다.

반드시 지켜야 할 원칙:

1. 사용자의 자유 질문을 가장 먼저 붙잡고, 상담 전체가 그 질문을 향해 흐르게 합니다.
2. 실제 연애 상담사가 조용히 마주 앉아 말하듯 부드럽고 현실적으로 답변합니다.
3. 명리학적 근거를 사용하되 일간, 일지, 오행, 조후, 십성의 의미를 관계 언어로 자연스럽게 풀어냅니다.
4. 관계 상태가 썸, 연애, 짝사랑, 재회, 이별 후 정리, 결혼 고민, 갈등 중 어디에 가까운지에 따라 조언의 온도를 조절합니다.
5. 상대방 정보가 있을 경우 두 사람의 끌림, 갈등, 안정성, 관계 지속 가능성을 함께 봅니다.
6. 상대방 정보가 없을 경우 사용자의 연애 패턴, 감정 방식, 선택 습관, 반복되는 관계 문제를 중심으로 봅니다.
7. 상대방의 마음을 확정적으로 단정하지 않고 가능성과 흐름으로 설명합니다.
8. 불안감을 조장하거나 집착, 감시, 압박, 심리 조종을 조언하지 않습니다.
9. "무조건 연락이 온다", "반드시 헤어진다", "상대는 당신을 사랑한다" 같은 단정 표현을 쓰지 않습니다.
10. 재회, 고백, 결혼, 갈등 상담에서는 사용자가 실제로 할 수 있는 행동을 제시합니다.
11. 필요한 경우 기다림, 거리두기, 대화 방식, 자기 보호를 균형 있게 안내합니다.
12. 같은 문장 구조로 섹션을 시작하지 않고, 기계적인 목록 설명처럼 들리지 않게 씁니다.
13. "AI", "프롬프트", "시스템", "PDF", "챕터", "job", "progress", "mock", "template" 같은 표현을 결과에 노출하지 않습니다.
14. "이 기능은", "이 결과는", "분석 결과는"처럼 제작물이나 상품 설명처럼 들리는 표현을 쓰지 않습니다.
15. 궁합 점수만 말하지 말고 이유, 감정 흐름, 현실 행동 조언을 함께 전합니다.
16. 속궁합은 선정적으로 쓰지 않고 감정 온도, 스킨십 선호 리듬, 친밀감 속도, 정서적 안정감 중심으로 품격 있게 다룹니다.
17. 마지막에는 사용자가 오늘 바로 붙잡을 수 있는 한 가지 태도와 한 가지 행동이 남도록 정리합니다.
18. 미성년자, 강요, 통제, 추적, 성적 노골성으로 읽힐 수 있는 표현은 피합니다.
19. 모든 행동 제안은 계산된 명식·궁합 데이터의 근거와 연결합니다. "진심을 다하면 통합니다" 같은 근거 없는 일반론과 "반드시 이뤄집니다" 같은 무책임한 확언은 금지합니다.
20. 톤은 상황에 따라 오갑니다 — 위로가 필요한 대목은 다정하게, 판단이 필요한 대목은 짧고 직설적으로. 단, 직설은 사실 근거 위에서만 씁니다.`;

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
    "상담의 첫 흐름은 사용자의 자유 질문에 직접 닿아야 합니다.",
    "관계 상태와 상담 주제를 모든 핵심 섹션의 판단 기준으로 삼습니다.",
    "명식 근거는 용어를 나열하지 말고 사랑에서 드러나는 감정, 거리감, 표현 방식, 선택 습관으로 번역합니다.",
    "상대 정보가 부족하면 단정하지 말고, 현재 드러난 흐름과 사용자가 확인할 수 있는 신호를 중심으로 말합니다.",
    "전체 상담 본문은 sections의 모든 body를 합산해 10,000~20,000자 사이로 씁니다.",
    "분량을 채우기 위해 같은 조언을 늘이지 않습니다. 각 섹션은 반드시 명리 근거(일간·일지·오행·조후·십성·궁합 관계 중 해당되는 것)를 최소 1회 명시하고, 그 근거를 관계 심리와 현실 행동 처방으로 이어 씁니다. 근거 없이 누구에게나 통하는 일반 연애 조언은 금지합니다.",
    "각 섹션의 body는 700~1,000자 안팎의 밀도 있는 문단으로 쓰되 첫 문장 구조를 반복하지 않습니다.",
    "body 안에서는 문단 사이를 빈 줄로 구분하고, 핵심 문구만 **굵게** 표시합니다. 필요할 때만 '-' 목록을 쓰고, 그 외 마크다운(제목 #, 코드블록, 표)은 쓰지 않습니다.",
    "조언은 기다림, 대화, 거리두기, 고백, 재회, 정리 중 사용자의 상황에 맞는 선택지를 구체적으로 좁힙니다.",
    "keywords는 지금 이 관계의 핵심 키워드 3개입니다.",
    "strategy는 지금의 연애 전략을 한 문장으로 씁니다.",
    "summaryTitle은 상담의 품격 있는 제목입니다.",
    "oneLineDiagnosis는 오늘의 관계 한 줄 진단입니다.",
    "relationshipTemperature는 두 사람의 감정 온도를 한 문장으로 정리합니다.",
    "sections와 pdfSections는 같은 상담 내용을 화면과 저장용으로 나눠 보여 줄 상담 카드입니다.",
    "actionSecrets는 지금 당장 실천할 연애 비책 5가지입니다. 각 항목은 반드시 '[난이도·타이밍] 행동 문장 (근거: 명식 근거 한 줄)' 형식으로 씁니다. 난이도는 쉬움/보통/도전 중 하나, 타이밍은 오늘/이번 주/이번 달 중 하나입니다. 예: '[쉬움·오늘] 답장 속도를 상대 리듬에 맞춰 반 박자 늦추세요 (근거: 상대 일간 갑목은 재촉당하면 닫히는 결)'.",
    "sevenDayGuide는 7일 동안 실행할 수 있는 현실적인 가이드입니다. 각 일차 항목도 상대 또는 나의 명식 근거와 연결된 구체 행동으로 쓰고, 막연한 덕담('마음을 여세요' 류)은 금지합니다.",
    "finalMessage와 finalLine은 마지막 상담사의 한마디입니다.",
    "answer는 주요 섹션을 자연스럽게 이어 붙인 전체 상담 본문입니다.",
    "",
    "- 현재 관계의 자리와 질문의 핵심",
    "- 나의 명식이 사랑에서 반복하는 방식",
    "- 상대의 기운과 감정 거리감",
    "- 두 사람 사이 끌림이 살아나는 조건",
    "- 오행과 조후로 보는 감정의 온도",
    "- 십성으로 보는 애착과 표현 방식",
    "- 속궁합과 친밀감 리듬",
    "- 갈등의 뿌리와 회복 방식",
    "- 연락/고백/재회/관계 진전 타이밍",
    "- 관계 단계별 실행 비책",
    "- 상대에게 다가가는 대화 문장",
    "- 피해야 할 선택과 자기 보호",
    "- 7일 실천 가이드",
    "- 30일 관계 흐름 처방",
    "- 마지막 상담사의 한마디",
    "",
    "[출력 JSON]",
    "{",
    '  "keywords": ["키워드1", "키워드2", "키워드3"],',
    '  "strategy": "지금의 연애 전략 한 문장",',
    '  "summaryTitle": "연애 비책 상담 제목",',
    '  "oneLineDiagnosis": "오늘의 관계 한 줄 진단",',
    '  "relationshipTemperature": "두 사람의 감정 온도",',
    '  "relationshipCore": "현재 관계의 자리와 사용자가 묻는 질문의 핵심",',
    '  "userLovePattern": "내 일간과 오행 성향을 바탕으로 반복되는 연애 방식",',
    '  "partnerLovePattern": "상대의 기운과 감정 거리감. 상대 정보가 없으면 현재 관계에서 확인 가능한 신호",',
    '  "attractionCondition": "두 사람 사이 끌림이 다시 살아나는 조건",',
    '  "compatibilityFlow": "두 사람의 궁합 흐름과 끌림의 이유",',
    '  "fiveElementsInsight": "오행 균형과 십성/일간/일지 관계를 쉬운 말로 풀어 쓴 해석",',
    '  "tenGodsAttachmentPattern": "십성으로 보는 애착 방식, 표현 방식, 불안이 올라오는 순간",',
    '  "johuIntimacyRhythm": "조후로 보는 감정 온도, 속궁합, 친밀감 리듬의 품격 있는 해석",',
    '  "conflictPattern": "갈등의 뿌리와 회복 방식, 해서는 안 되는 말과 행동",',
    '  "timingAdvice": "연락/고백/재회/관계 진전 타이밍 조언",',
    '  "stageActionSecrets": "썸, 연애, 재회, 정리 등 관계 단계별 실행 비책",',
    '  "communicationAdvice": "상대에게 다가갈 때 사용할 수 있는 대화 문장과 말의 온도",',
    '  "selfProtectionBoundary": "피해야 할 선택과 지켜야 할 자기 보호 기준",',
    '  "actionSecrets": ["[쉬움·오늘] 행동 문장 (근거: 명식 근거)", "[보통·이번 주] 행동 문장 (근거: 명식 근거)", "[보통·이번 주] 행동 문장 (근거: 명식 근거)", "[도전·이번 달] 행동 문장 (근거: 명식 근거)", "[쉬움·오늘] 행동 문장 (근거: 명식 근거)"],',
    '  "sevenDayGuide": ["1일차 가이드", "2일차 가이드", "3일차 가이드", "4일차 가이드", "5일차 가이드", "6일차 가이드", "7일차 가이드"],',
    '  "thirtyDayFlow": "30일 동안 관계의 온도를 조율하는 흐름 처방",',
    '  "sections": [',
    '    { "title": "현재 관계의 자리와 질문의 핵심", "body": "상담 본문" },',
    '    { "title": "나의 명식이 사랑에서 반복하는 방식", "body": "상담 본문" },',
    '    { "title": "상대의 기운과 감정 거리감", "body": "상담 본문" },',
    '    { "title": "두 사람 사이 끌림이 살아나는 조건", "body": "상담 본문" },',
    '    { "title": "오행과 조후로 보는 감정의 온도", "body": "상담 본문" },',
    '    { "title": "십성으로 보는 애착과 표현 방식", "body": "상담 본문" },',
    '    { "title": "속궁합과 친밀감 리듬", "body": "상담 본문" },',
    '    { "title": "갈등의 뿌리와 회복 방식", "body": "상담 본문" },',
    '    { "title": "연락/고백/재회/관계 진전 타이밍", "body": "상담 본문" },',
    '    { "title": "관계 단계별 실행 비책", "body": "상담 본문" },',
    '    { "title": "상대에게 다가가는 대화 문장", "body": "상담 본문" },',
    '    { "title": "피해야 할 선택과 자기 보호", "body": "상담 본문" },',
    '    { "title": "7일 실천 가이드", "body": "상담 본문" },',
    '    { "title": "30일 관계 흐름 처방", "body": "상담 본문" },',
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
    "첫 문장부터 사용자의 추가 질문에 답합니다.",
    "이전 상담은 필요한 만큼만 이어받고, 새 질문과 무관한 전체 요약으로 흐르지 않습니다.",
    "명식과 궁합 근거는 관계 언어로 짧게 풀어 사용자가 지금의 마음과 선택을 이해하도록 돕습니다.",
    "상대방의 마음을 단정하지 말고, 사용자가 건강한 선택을 할 수 있도록 현실적인 다음 행동을 제안합니다.",
    "재회, 고백, 갈등, 정리 질문에서는 오늘 할 말과 하지 말아야 할 행동을 함께 짚습니다.",
    "문단형 상담으로만 답하고 금지 표현을 쓰지 않습니다. 문단 사이는 빈 줄로 구분하고, 핵심 문구만 **굵게** 표시합니다.",
  ].join("\n");
}

const STRUCTURED_SECTION_FIELDS = Object.freeze([
  ["현재 관계의 자리와 질문의 핵심", "relationshipCore"],
  ["나의 명식이 사랑에서 반복하는 방식", "userLovePattern"],
  ["상대의 기운과 감정 거리감", "partnerLovePattern"],
  ["두 사람 사이 끌림이 살아나는 조건", "attractionCondition"],
  ["오행과 조후로 보는 감정의 온도", "fiveElementsInsight"],
  ["십성으로 보는 애착과 표현 방식", "tenGodsAttachmentPattern"],
  ["속궁합과 친밀감 리듬", "johuIntimacyRhythm"],
  ["갈등의 뿌리와 회복 방식", "conflictPattern"],
  ["연락/고백/재회/관계 진전 타이밍", "timingAdvice"],
  ["관계 단계별 실행 비책", "stageActionSecrets"],
  ["상대에게 다가가는 대화 문장", "communicationAdvice"],
  ["피해야 할 선택과 자기 보호", "selfProtectionBoundary"],
  ["7일 실천 가이드", "sevenDayGuide"],
  ["30일 관계 흐름 처방", "thirtyDayFlow"],
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
    body: clean(section?.body || section?.content || section?.text, 12000),
  })).filter((section) => section.title && section.body.length >= 20).slice(0, limit);
}

function buildStructuredSections(parsed = {}) {
  return STRUCTURED_SECTION_FIELDS.map(([title, field]) => ({
    title,
    body: bodyFromValue(parsed[field]),
  })).filter((section) => section.body.length >= 20);
}

function fallbackSectionsFromText(text) {
  const value = clean(text, LOVE_SECRET_AI_PARSE_TEXT_MAX_CHARS).replace(/\r\n/g, "\n");
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
        body: clean(value.slice(start, end), 12000),
      };
    }).filter((section) => section.title && section.body.length >= 20).slice(0, 16);
  }

  const titles = STRUCTURED_SECTION_FIELDS.map(([title]) => title);
  const paragraphs = value.split(/\n{2,}/).map((part) => clean(part, 3000)).filter(Boolean);
  const chunkSize = Math.max(1, Math.ceil(paragraphs.length / Math.min(titles.length, 8)));
  return titles.map((title, index) => ({
    title,
    body: paragraphs.slice(index * chunkSize, (index + 1) * chunkSize).join("\n\n"),
  })).filter((section) => section.body.length >= 20).slice(0, 16);
}

function countSectionBodyChars(sections = []) {
  return Array.isArray(sections)
    ? sections.reduce((sum, section) => sum + clean(section?.body).length, 0)
    : 0;
}

export function countLoveSecretConsultationBodyChars(result = {}) {
  const pdfChars = countSectionBodyChars(result.pdfSections);
  if (pdfChars > 0) return pdfChars;
  const sectionChars = countSectionBodyChars(result.sections);
  if (sectionChars > 0) return sectionChars;
  return clean(result.answer).length;
}

function ensureMinimumTotalBodyChars(result = {}) {
  const totalChars = countLoveSecretConsultationBodyChars(result);
  if (totalChars < LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS || totalChars > LOVE_SECRET_AI_MAX_TOTAL_BODY_CHARS) {
    const error = new Error("first consultation response is outside target body length");
    error.code = "INCOMPLETE_LLM_RESPONSE";
    error.details = {
      totalChars,
      minTotalChars: LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS,
      maxTotalChars: LOVE_SECRET_AI_MAX_TOTAL_BODY_CHARS,
    };
    throw error;
  }
}

function normalizeReading(parsed = {}) {
  return {
    summaryTitle: clean(parsed.summaryTitle, 120),
    oneLineDiagnosis: clean(parsed.oneLineDiagnosis, 500),
    relationshipTemperature: clean(parsed.relationshipTemperature, 500),
    relationshipCore: clean(parsed.relationshipCore, 4000),
    userLovePattern: clean(parsed.userLovePattern, 4000),
    partnerLovePattern: clean(parsed.partnerLovePattern, 4000),
    attractionCondition: clean(parsed.attractionCondition, 4000),
    compatibilityFlow: clean(parsed.compatibilityFlow, 4000),
    fiveElementsInsight: clean(parsed.fiveElementsInsight, 4000),
    tenGodsAttachmentPattern: clean(parsed.tenGodsAttachmentPattern, 4000),
    johuIntimacyRhythm: clean(parsed.johuIntimacyRhythm, 4000),
    conflictPattern: clean(parsed.conflictPattern, 4000),
    communicationAdvice: clean(parsed.communicationAdvice, 4000),
    timingAdvice: clean(parsed.timingAdvice, 4000),
    stageActionSecrets: clean(parsed.stageActionSecrets, 4000),
    selfProtectionBoundary: clean(parsed.selfProtectionBoundary, 4000),
    actionSecrets: normalizeTextList(parsed.actionSecrets, 5),
    sevenDayGuide: normalizeTextList(parsed.sevenDayGuide, 7),
    thirtyDayFlow: clean(parsed.thirtyDayFlow, 4000),
    finalMessage: clean(parsed.finalMessage || parsed.finalLine, 1000),
  };
}

export function parseFirstConsultationResponse(text) {
  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    const raw = clean(stripCodeFence(text), LOVE_SECRET_AI_PARSE_TEXT_MAX_CHARS);
    if (raw.length < LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS) {
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
    const fallbackResult = {
      keywords: ["마음의 온도", "관계 리듬", "연애 비책"],
      strategy: "지금은 마음의 속도를 낮추고 관계의 온도를 현실적으로 맞추는 흐름이 좋습니다.",
      sections,
      finalLine: "마음이 앞서도 행동은 부드럽게, 확인은 천천히 가져가 주세요.",
      answer: raw,
      reading: {
        summaryTitle: "연애 비책 상담",
        oneLineDiagnosis: sections[0]?.body || "",
        relationshipTemperature: "",
        finalMessage: "마음이 앞서도 행동은 부드럽게, 확인은 천천히 가져가 주세요.",
      },
      pdfSections: sections,
    };
    ensureMinimumTotalBodyChars(fallbackResult);
    return fallbackResult;
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    // 잘린 JSON(토큰 상한 절단)은 마지막 완결 값까지 복구를 먼저 시도한다 —
    // 결제 후 하드 실패 대신 부분 결과 degrade(완결성 미달이면 아래 검증이 다시 걸러냄).
    parsed = salvageTruncatedJsonObject(text);
    if (!parsed) {
      error.code = "INVALID_LLM_JSON";
      throw error;
    }
  }

  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.map((item) => clean(item, 24)).filter(Boolean).slice(0, 3)
    : [];
  const reading = normalizeReading(parsed);
  const strategy = clean(parsed.strategy || reading.oneLineDiagnosis || reading.relationshipTemperature, 300);
  const explicitSections = normalizeSectionList(parsed.sections, 16);
  const structuredSections = buildStructuredSections(parsed);
  const sections = explicitSections.length >= 8 ? explicitSections : normalizeSectionList([...explicitSections, ...structuredSections], 16);
  const pdfSections = normalizeSectionList(parsed.pdfSections, 16);
  const finalLine = clean(parsed.finalLine || parsed.finalMessage || reading.finalMessage, 700);
  const sectionAnswer = sections.map((section) => `${section.title}\n${section.body}`).join("\n\n");
  const answer = clean(parsed.answer || sectionAnswer || finalLine, LOVE_SECRET_AI_PARSE_TEXT_MAX_CHARS);
  let resolvedPdfSections = pdfSections.length ? pdfSections : sections;
  if (countSectionBodyChars(resolvedPdfSections) < LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS && answer.length >= LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS) {
    const answerSections = fallbackSectionsFromText(answer);
    if (countSectionBodyChars(answerSections) >= LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS) resolvedPdfSections = answerSections;
  }

  if (keywords.length !== 3 || strategy.length < 8 || answer.length < 500 || sections.length < 8) {
    const error = new Error("first consultation response is incomplete");
    error.code = "INCOMPLETE_LLM_RESPONSE";
    throw error;
  }

  validateConsultationText(`${keywords.join(" ")} ${strategy} ${answer}`);
  const result = {
    keywords,
    strategy,
    sections,
    finalLine,
    answer,
    reading,
    pdfSections: resolvedPdfSections,
  };
  ensureMinimumTotalBodyChars(result);
  return result;
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

// 상담문이 계산된 명식 근거를 실제로 참조했는지 사후 검증한다.
// (길이·금칙어 게이트만으로는 근거 없는 일반 연애 조언을 걸러낼 수 없음)
export function validateLoveSecretGrounding(result = {}, groundingTerms = []) {
  const terms = groundingTerms.map((term) => clean(term)).filter((term) => term.length >= 1);
  const issues = [];
  const fullText = [result.answer, ...(Array.isArray(result.sections) ? result.sections.map((section) => section.body) : [])].join("\n");

  if (terms.length) {
    const hits = terms.filter((term) => fullText.includes(term));
    if (hits.length < Math.min(3, terms.length)) issues.push(`GROUNDING_TERMS:${hits.length}/${terms.length}`);
  }

  const actionSecrets = Array.isArray(result.reading?.actionSecrets) ? result.reading.actionSecrets : [];
  const sevenDayGuide = Array.isArray(result.reading?.sevenDayGuide) ? result.reading.sevenDayGuide : [];
  const actionText = [...actionSecrets, ...sevenDayGuide].join("\n");
  if (actionText && !/근거\s*[:：]/.test(actionText)) issues.push("ACTION_GROUNDING_MISSING");

  if (actionSecrets.length >= 3) {
    const badgeCount = actionSecrets.filter((item) => /^\[\s*(쉬움|보통|도전)\s*[·,\s]\s*(오늘|이번\s*주|이번\s*달)\s*\]/.test(String(item))).length;
    if (badgeCount < 3) issues.push("ACTION_BADGE_FORMAT");
  }
  return issues;
}

export function describeLoveSecretGroundingIssues(issues = []) {
  const lines = [];
  if (issues.some((issue) => issue.startsWith("GROUNDING_TERMS"))) {
    lines.push("- 계산된 명식 데이터(일간, 십성, 궁합 관계)를 본문에서 직접 언급하며 근거로 삼으세요. 근거 없는 일반 연애 조언은 금지입니다.");
  }
  if (issues.includes("ACTION_GROUNDING_MISSING")) {
    lines.push("- actionSecrets와 sevenDayGuide의 각 항목에 '(근거: …)' 형태로 명식 근거를 붙이세요.");
  }
  if (issues.includes("ACTION_BADGE_FORMAT")) {
    lines.push("- actionSecrets 각 항목을 '[난이도·타이밍] 행동 (근거: …)' 형식으로 쓰세요. 난이도는 쉬움/보통/도전, 타이밍은 오늘/이번 주/이번 달 중 하나입니다.");
  }
  return lines;
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
  countSectionBodyChars,
  ensureMinimumTotalBodyChars,
};
