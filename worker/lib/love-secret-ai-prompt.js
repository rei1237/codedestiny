import { buildLoveSecretGroupFacts, compactSajuForFollowUp } from "./love-secret-ai-facts.js";

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

// 분량 문턱은 2단이다.
//  - TARGET_*  : 목표치. 미달/초과하면 "책임 그룹만" 다시 쓰는 수리(wave 2) 트리거.
//  - MIN/MAX_* : 전달 가능 하한/상한. 벗어나면 throw(=결제 실패 경로).
// 🔴 MIN 은 degrade 바닥(4개 그룹 × 5,000자)보다 낮아야 한다. 그렇지 않으면 정당한
//    부분 성공 결과가 결제 후 하드 실패로 뒤집힌다.
export const LOVE_SECRET_AI_TARGET_MIN_TOTAL_BODY_CHARS = 30000;
export const LOVE_SECRET_AI_TARGET_MAX_TOTAL_BODY_CHARS = 39000;
export const LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS = 18000;
export const LOVE_SECRET_AI_MAX_TOTAL_BODY_CHARS = 44000;
const LOVE_SECRET_AI_PARSE_TEXT_MAX_CHARS = 44000;

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

// ── 섹션 그룹 ─────────────────────────────────────────────────────────────
// 상담 본문을 6개 그룹으로 나눠 한 요청 안에서 동시에 생성한다(new-year-ai.js:35 선례).
// 단일 호출로는 목표 분량(30,000~36,000자)이 엣지 100초 컷을 구조적으로 넘는다.
//
// 겹치는 섹션 제목은 기존 STRUCTURED_SECTION_FIELDS 문자열을 그대로 재사용한다 —
// 결과 화면의 FALLBACK_SECTIONS 와 회귀 스크립트가 이 제목으로 맞춰져 있다.
/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   그룹별 사용자 프롬프트는 계산된 명식·궁합 데이터를 입력으로 받으므로 생년 정보만으로는 조립되지 않는다. */
export function buildAdminLabPrompt() {
  return {
    systemPrompt: LOVE_SECRET_AI_SYSTEM_PROMPT,
    prompt: "",
    partial: true,
    partialReason: "사용자 프롬프트는 6개 그룹별로 계산된 명식·궁합 데이터를 입력으로 받습니다. 시스템 프롬프트만 표시합니다.",
  };
}

export const LOVE_SECRET_AI_GROUP_MIN_CHARS = 5000;
export const LOVE_SECRET_AI_GROUP_MAX_CHARS = 6500;

export const LOVE_SECRET_AI_GROUPS = Object.freeze([
  Object.freeze({
    key: "core",
    label: "핵심 연애운과 질문의 답",
    emits: Object.freeze(["header"]),
    covered: "나의 성향·장단점/상대와 궁합·이상형/갈등·바람기·재회/타이밍·좋은 날짜·결혼운/실행 전략과 마무리",
    sections: Object.freeze([
      Object.freeze({ title: "현재 관계의 자리와 질문의 핵심", field: "relationshipCore", guide: "사용자의 자유 질문을 첫 문장에서 정면으로 받고, 지금 관계가 어느 자리에 서 있는지부터 확정한다." }),
      Object.freeze({ title: "핵심 연애운 — 명식이 사랑에서 그리는 큰 결", field: "coreLoveFortune", guide: "현재 연애운의 흐름, 열리는 기회, 위험 구간, 전체 분위기를 대운·세운·격국에 걸어 말한다." }),
      Object.freeze({ title: "오행과 조후로 보는 감정의 온도", field: "fiveElementsInsight", guide: "오행 분포와 조후로 감정의 온도·습도를 설명하고, 그것이 연애에서 어떻게 드러나는지로 번역한다." }),
    ]),
  }),
  Object.freeze({
    key: "self",
    label: "나의 연애 성향 — 장점·약점·심리",
    emits: Object.freeze([]),
    covered: "질문의 핵심과 전체 연애운/상대와 궁합·이상형/갈등·바람기·재회/타이밍·좋은 날짜·결혼운/실행 전략과 마무리",
    sections: Object.freeze([
      Object.freeze({ title: "나의 명식이 사랑에서 반복하는 방식", field: "userLovePattern", guide: "일간과 오행 성향에서 반복되는 선택 습관과 관계 패턴을 짚는다." }),
      Object.freeze({ title: "십성으로 보는 애착과 표현 방식", field: "tenGodsAttachmentPattern", guide: "십성 분포로 애착 유형, 표현 방식, 불안이 올라오는 순간을 설명한다." }),
      Object.freeze({ title: "연애 장점 — 상대가 먼저 알아보는 힘", field: "loveStrengths", guide: "매력, 강점, 호감 요소, 첫인상, 본인이 모르는 숨은 장점까지 명식 근거로 짚는다." }),
      Object.freeze({ title: "연애 약점 — 반복해서 걸려 넘어지는 자리", field: "loveWeaknesses", guide: "실수하기 쉬운 지점, 집착·회피의 방향, 오해받는 이유를 현실적으로 쓴다. 비난조가 아니라 원인 설명으로." }),
      Object.freeze({ title: "애정 표현 스타일과 연애 심리", field: "affectionStyle", guide: "말·행동·스킨십·선물·배려 중 어떤 방식으로 사랑을 표현하는지, 그리고 왜 사랑이 어렵게 느껴지는지 무의식·애착까지 이어 쓴다." }),
    ]),
  }),
  Object.freeze({
    key: "partner",
    label: "상대·궁합·이상형",
    emits: Object.freeze([]),
    covered: "질문의 핵심과 전체 연애운/나의 성향·장단점/갈등·바람기·재회/타이밍·좋은 날짜·결혼운/실행 전략과 마무리",
    sections: Object.freeze([
      Object.freeze({ title: "상대의 기운과 감정 거리감", field: "partnerLovePattern", guide: "상대 명식이 있으면 그 결로, 없으면 배우자궁과 현재 확인 가능한 신호로만 말한다. 상대의 마음을 단정하지 않는다." }),
      Object.freeze({ title: "두 사람 사이 끌림이 살아나는 조건", field: "attractionCondition", guide: "끌림이 다시 켜지는 조건을 일지 관계·용신 지원·신살 교차로 설명한다." }),
      Object.freeze({ title: "속궁합과 친밀감 리듬", field: "johuIntimacyRhythm", guide: "감정 온도, 스킨십 선호 리듬, 친밀감 속도, 정서적 안정감 중심으로 품격 있게 다룬다. 선정적 서술 금지." }),
      Object.freeze({ title: "이상형 분석 — 내 명식이 끌리는 사람", field: "idealPartnerReading", guide: "좋은 연인상과 좋은 배우자상, 피해야 할 유형, 잘 맞는 성격과 직업 결까지 용신·배우자궁 근거로 나눈다." }),
      Object.freeze({ title: "상대가 원하는 연애 스타일", field: "partnerPreferredStyle", guide: "어떤 사람이 나에게 끌리는지, 왜 그런지, 그 사람이 원하는 연애 방식이 무엇인지 심리까지 설명한다." }),
    ]),
  }),
  Object.freeze({
    key: "risk",
    label: "갈등·바람기·재회·자기 보호",
    emits: Object.freeze([]),
    covered: "질문의 핵심과 전체 연애운/나의 성향·장단점/상대와 궁합·이상형/타이밍·좋은 날짜·결혼운/실행 전략과 마무리",
    sections: Object.freeze([
      Object.freeze({ title: "갈등의 뿌리와 회복 방식", field: "conflictPattern", guide: "충·형·파·해·원진 중 실제로 성립한 것만 근거로 들어 갈등의 뿌리를 짚고, 해서는 안 되는 말과 행동을 함께 쓴다." }),
      Object.freeze({ title: "바람기와 마음이 흩어지는 조건", field: "wanderingRisk", guide: "도화·홍염·재성/관성 구조로 본인의 흔들림, 상대에게 흔들리는 이유, 유혹에 약해지는 시기를 판단이 아니라 조건으로 설명한다." }),
      Object.freeze({ title: "재회 가능성과 그 조건", field: "reunionPossibility", guide: "재회 가능성을 확률이 아니라 조건으로 말한다. 좋은 시기, 재회가 반복될 때의 주의점을 대운·세운으로 건다." }),
      Object.freeze({ title: "피해야 할 선택과 자기 보호", field: "selfProtectionBoundary", guide: "지켜야 할 경계와 물러설 지점을 구체적으로 정한다. 감시·압박·집착은 어떤 경우에도 조언하지 않는다." }),
    ]),
  }),
  Object.freeze({
    key: "timing",
    label: "대운·올해·좋은 날짜·결혼운",
    emits: Object.freeze(["timing"]),
    covered: "질문의 핵심과 전체 연애운/나의 성향·장단점/상대와 궁합·이상형/갈등·바람기·재회/실행 전략과 마무리",
    sections: Object.freeze([
      Object.freeze({ title: "연락/고백/재회/관계 진전 타이밍", field: "timingAdvice", guide: "지금 밀지 기다릴지를 계산된 세운·대운·일진에 걸어 결정해 준다." }),
      Object.freeze({ title: "올해 연애운 — 좋은 달과 조심할 달", field: "yearlyLoveFlow", guide: "월별 흐름 데이터에서 좋은 달과 조심할 달을 각각 최소 하나씩 이름 붙여 말하고, 소개팅·고백·인연운의 결을 나눈다." }),
      Object.freeze({ title: "좋은 날짜 — 계산된 일진으로 고른 날", field: "luckyDatesReading", guide: "🔴 계산된좋은날짜 목록의 날짜만 쓴다. 최소 3개를 YYYY-MM-DD 그대로 인용하고 각 날의 간지와 근거를 붙인다. 목록에 없는 날짜는 절대 만들지 않는다." }),
      Object.freeze({ title: "결혼운과 인연이 굳어지는 시기", field: "marriageFortune", guide: "결혼 적기, 배우자상, 가정운, 결혼 후 모습을 대운과 배우자궁으로 설명한다." }),
      Object.freeze({ title: "30일 관계 흐름 처방", field: "thirtyDayFlow", guide: "앞으로 30일을 주 단위로 나눠 온도를 조율하는 흐름을 쓴다." }),
    ]),
  }),
  Object.freeze({
    key: "action",
    label: "썸 전략·대화·매력·실천",
    emits: Object.freeze(["actions", "closing"]),
    covered: "질문의 핵심과 전체 연애운/나의 성향·장단점/상대와 궁합·이상형/갈등·바람기·재회/타이밍·좋은 날짜·결혼운",
    sections: Object.freeze([
      Object.freeze({ title: "썸에서 확신으로 가는 전략", field: "crushStrategy", guide: "다가가는 방법, 연락 빈도, 고백 타이밍, 데이트 전략을 순서대로 좁힌다." }),
      Object.freeze({ title: "관계 단계별 실행 비책", field: "stageActionSecrets", guide: "썸·연애·재회·정리 중 사용자의 현재 단계를 먼저 지목하고 그 단계의 실행안을 쓴다." }),
      Object.freeze({ title: "상대에게 다가가는 대화 문장", field: "communicationAdvice", guide: "그대로 보낼 수 있는 문장을 따옴표로 제시하고, 하지 말아야 할 말도 함께 짚는다." }),
      Object.freeze({ title: "매력적으로 보이는 방법 — 이미지·말투·스타일", field: "charmPresentation", guide: "용신 색·개운 방향에 걸어 헤어스타일, 이미지, 말투, 분위기, 첫인상, 패션 방향을 구체적으로 조언한다." }),
      Object.freeze({ title: "7일 실천 가이드", field: "sevenDayGuide", guide: "1일차부터 7일차까지 각 날의 행동을 명식 근거와 함께 쓴다." }),
      Object.freeze({ title: "마지막 상담사의 한마디", field: "finalMessage", guide: "연애 편지처럼 마무리한다. 오늘 붙잡을 태도 하나와 행동 하나가 남게 쓴다." }),
    ]),
  }),
]);

export function findLoveSecretGroup(key) {
  return LOVE_SECRET_AI_GROUPS.find((group) => group.key === key) || null;
}

function groupJsonSkeleton(group) {
  const lines = ["{"];
  if (group.emits.includes("header")) {
    lines.push('  "keywords": ["키워드1", "키워드2", "키워드3"],');
    lines.push('  "strategy": "지금의 연애 전략 한 문장",');
    lines.push('  "summaryTitle": "연애 비책 상담 제목",');
    lines.push('  "oneLineDiagnosis": "오늘의 관계 한 줄 진단",');
    lines.push('  "relationshipTemperature": "두 사람의 감정 온도 한 문장",');
  }
  if (group.emits.includes("timing")) {
    lines.push('  "monthlyHighlights": { "best": ["N월 — 이유"], "caution": ["N월 — 이유"] },');
    lines.push('  "luckyDates": [{ "date": "YYYY-MM-DD", "ganji": "간지", "why": "이 날을 고른 근거" }],');
  }
  if (group.emits.includes("actions")) {
    lines.push('  "actionSecrets": ["[쉬움·오늘] 행동 문장 (근거: 명식 근거)", "[보통·이번 주] 행동 문장 (근거: 명식 근거)", "[도전·이번 달] 행동 문장 (근거: 명식 근거)"],');
    lines.push('  "sevenDayGuide": ["1일차 …", "2일차 …", "3일차 …", "4일차 …", "5일차 …", "6일차 …", "7일차 …"],');
  }
  if (group.emits.includes("closing")) {
    lines.push('  "finalMessage": "마지막 상담사의 한마디",');
    lines.push('  "finalLine": "마지막 상담사의 한마디",');
  }
  lines.push('  "sections": [');
  group.sections.forEach((section, index) => {
    const comma = index === group.sections.length - 1 ? "" : ",";
    lines.push(`    { "title": ${JSON.stringify(section.title)}, "body": "상담 본문" }${comma}`);
  });
  lines.push("  ]");
  lines.push("}");
  return lines.join("\n");
}

/** 그룹별로 시스템 프롬프트에 담당 범위를 덧붙인다(기본 페르소나는 CMS 오버라이드가 소유). */
export function buildLoveSecretGroupSystemPrompt(basePrompt, group) {
  return [
    clean(basePrompt),
    "",
    `이번 응답에서는 상담의 한 부분 — "${group.label}" — 만 씁니다. 나머지 부분은 같은 상담의 다른 곳에서 이미 다루므로 여기서 반복하지 않습니다.`,
    "계산되지 않은 날짜·간지·신살을 만들어 쓰지 않습니다. 제공된 계산 확정값 안에서만 해석합니다.",
  ].join("\n");
}

/**
 * 그룹 하나를 생성하는 프롬프트.
 * repairLines/previousText 가 있으면 수리(wave 2) 프롬프트가 된다.
 */
export function buildLoveSecretGroupPrompt(input = {}, sajuResult = {}, group, options = {}) {
  const { repairLines = [], previousText = "" } = options;
  const partnerMode = sajuResult?.partnerChart ? "상대 포함 연애 상담 모드" : "단독 연애 상담 모드";
  const facts = Array.isArray(sajuResult?.facts) ? sajuResult.facts : [];
  const groupFacts = buildLoveSecretGroupFacts(sajuResult, group.key);

  const lines = [
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
    "[계산 확정값 — 본문에서 이 값과 다르게 서술하는 것을 금지]",
    facts.map((line) => `- ${line}`).join("\n"),
    "",
    "[이 부분에서 쓸 계산 데이터]",
    safeJson(groupFacts),
    "",
    `[이번에 쓸 항목 — "${group.label}"]`,
    ...group.sections.map((section) => `- ${section.title}: ${section.guide}`),
    "",
    "[다른 부분이 맡은 내용 — 여기서 반복 금지]",
    group.covered,
    "",
    "[작성 방식]",
    "아래 JSON 형식만 출력합니다. JSON 밖에 다른 문장을 붙이지 않습니다.",
    `이 부분의 sections body 합계는 ${LOVE_SECRET_AI_GROUP_MIN_CHARS}~${LOVE_SECRET_AI_GROUP_MAX_CHARS}자로 씁니다. 마지막 문장을 중간에 끊지 말고 반드시 완결합니다.`,
    "각 섹션의 body는 900~1,300자 안팎의 밀도 있는 문단으로 쓰되 첫 문장 구조를 반복하지 않습니다.",
    "각 섹션은 반드시 명리 근거(일간·일지·오행·조후·십성·신살·대운/세운·궁합 관계 중 해당되는 것)를 최소 1회 명시하고, 그 근거를 관계 심리와 현실 행동 처방으로 이어 씁니다. 근거 없이 누구에게나 통하는 일반 연애 조언은 금지합니다.",
    "명식 근거는 용어를 나열하지 말고 사랑에서 드러나는 감정, 거리감, 표현 방식, 선택 습관으로 번역합니다.",
    "관계 상태와 상담 주제를 모든 판단의 기준으로 삼습니다.",
    "상대 정보가 부족하면 단정하지 말고, 현재 드러난 흐름과 사용자가 확인할 수 있는 신호를 중심으로 말합니다.",
    "body 안에서는 문단 사이를 빈 줄로 구분하고, 핵심 문구만 **굵게** 표시합니다. 필요할 때만 '-' 목록을 쓰고, 그 외 마크다운(제목 #, 코드블록, 표)은 쓰지 않습니다.",
    "분량을 채우기 위해 같은 조언을 늘이지 않습니다.",
  ];

  if (group.emits.includes("header")) {
    lines.push(
      "keywords는 지금 이 관계의 핵심 키워드 3개입니다.",
      "strategy는 지금의 연애 전략을 한 문장으로 씁니다.",
      "summaryTitle은 상담의 품격 있는 제목이고, oneLineDiagnosis는 오늘의 관계 한 줄 진단입니다.",
    );
  }
  if (group.emits.includes("timing")) {
    lines.push(
      "monthlyHighlights.best 와 caution 은 계산 데이터의 월별흐름에서 각각 최소 1개씩 고릅니다.",
      "luckyDates 는 계산된좋은날짜 목록에서 최소 3개를 그대로 옮깁니다. 날짜와 간지를 바꾸거나 새로 만들지 않습니다.",
    );
  }
  if (group.emits.includes("actions")) {
    lines.push(
      "actionSecrets는 오늘부터 실행 가능한 연애 비책 3~7가지입니다. 각 항목은 반드시 '[난이도·타이밍] 행동 문장 (근거: 명식 근거 한 줄)' 형식으로 씁니다. 난이도는 쉬움/보통/도전 중 하나, 타이밍은 오늘/이번 주/이번 달 중 하나입니다. 예: '[쉬움·오늘] 답장 속도를 상대 리듬에 맞춰 반 박자 늦추세요 (근거: 상대 일간 갑목은 재촉당하면 닫히는 결)'.",
      "sevenDayGuide는 7일 동안 실행할 수 있는 현실적인 가이드입니다. 각 일차 항목도 명식 근거와 연결된 구체 행동으로 쓰고 '(근거: …)'를 붙입니다. 막연한 덕담('마음을 여세요' 류)은 금지합니다.",
    );
  }

  if (repairLines.length) {
    lines.push("", "[이번에 반드시 고칠 점]", ...repairLines.map((line) => (line.startsWith("-") ? line : `- ${line}`)));
    if (previousText) {
      lines.push("", "[직전에 쓴 이 부분 — 살릴 내용은 유지하고 위 지적만 고쳐 다시 쓴다]", clean(previousText, 6000));
    }
  }

  lines.push("", "[출력 JSON]", groupJsonSkeleton(group));
  return lines.join("\n");
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
    // sajuResult 전체(v2 기준 60~80KB)를 그대로 넣으면 5,000토큰짜리 후속 호출을 통째로 삼킨다.
    safeJson({
      myInfo: consultation.myInfo,
      partnerInfo: consultation.partnerInfo || null,
      relationshipStatus: consultation.relationshipStatus,
      topic: consultation.topic,
      sajuResult: compactSajuForFollowUp(consultation.sajuResult),
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

// 섹션 제목 ↔ reading 필드. 그룹 정의(LOVE_SECRET_AI_GROUPS)에서 파생해 한 곳에서만 관리한다.
// 순서는 그룹 순서 = 화면 표시 순서.
const STRUCTURED_SECTION_FIELDS = Object.freeze(
  LOVE_SECRET_AI_GROUPS.flatMap((group) => group.sections.map((section) => Object.freeze([section.title, section.field]))),
);

export const LOVE_SECRET_AI_SECTION_TITLES = Object.freeze(STRUCTURED_SECTION_FIELDS.map(([title]) => title));

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

function normalizeReading(parsed = {}) {
  const reading = {
    summaryTitle: clean(parsed.summaryTitle, 120),
    oneLineDiagnosis: clean(parsed.oneLineDiagnosis, 500),
    relationshipTemperature: clean(parsed.relationshipTemperature, 500),
    compatibilityFlow: clean(parsed.compatibilityFlow, 4000),
    // actionSecrets 는 3~7개 계약(요청 "오늘 바로 실천할 행동 3~7가지").
    actionSecrets: normalizeTextList(parsed.actionSecrets, 7),
    sevenDayGuide: normalizeTextList(parsed.sevenDayGuide, 7),
    monthlyHighlights: {
      best: normalizeTextList(parsed.monthlyHighlights?.best, 4),
      caution: normalizeTextList(parsed.monthlyHighlights?.caution, 4),
    },
    luckyDates: (Array.isArray(parsed.luckyDates) ? parsed.luckyDates : [])
      .map((item) => ({
        date: clean(item?.date, 12),
        ganji: clean(item?.ganji, 10),
        why: clean(item?.why, 200),
      }))
      .filter((item) => item.date)
      .slice(0, 8),
    finalMessage: clean(parsed.finalMessage || parsed.finalLine, 1000),
  };
  // 섹션 본문 필드는 그룹 정의에서 파생한다 — 그룹에 섹션을 추가하면 여기도 자동으로 따라온다.
  STRUCTURED_SECTION_FIELDS.forEach(([, field]) => {
    if (field === "sevenDayGuide" || field === "finalMessage") return;
    reading[field] = clean(parsed[field], 6000);
  });
  return reading;
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

/**
 * 근거 용어 목록. 각 항목은 **별칭 배열**이며 하나만 맞아도 인정한다.
 *
 * 🔴 예전에는 한자 일간(癸)만 넣었는데 한국어 본문은 "계수"라고 쓴다. 그래서 거의 모든
 * 요청에서 GROUNDING_TERMS 가 실패해 전체 재작성이 상시 발동했다(벽시계 2배의 주범).
 */
export function buildLoveSecretGroundingTerms(sajuResult = {}) {
  const my = sajuResult.myChart || {};
  const partner = sajuResult.partnerChart || null;
  const reference = my.reference || {};
  const dayStem = clean(my.dayMaster, 4);
  const dayStemKo = clean(reference.dayMasterLabel, 12).replace(/\(.*\)/, "");
  const dayBranch = clean(my.pillarDetails?.day?.earthlyBranch, 4);
  const currentCycle = my.majorLuck?.currentCycle?.pillar || "";

  const groups = [
    [dayStem, dayStemKo, dayStemKo ? `${dayStemKo}${reference.dayElementLabel || ""}` : ""],
    [dayBranch, dayBranch ? clean(my.pillarDetails?.day?.branchElement, 4) : ""],
    [clean(reference.dominantTenGod, 12)],
    [clean(my.gyeokguk?.finalGyeokguk, 12)],
    [clean(reference.yongshinElementLabel, 4), clean(reference.yongshinElement, 12)],
    [currentCycle],
    partner ? [clean(partner.dayMaster, 4), clean(partner.reference?.dayMasterLabel, 12).replace(/\(.*\)/, "")] : [],
    ["일간"],
  ];

  return groups
    .map((aliases) => aliases.map((alias) => clean(alias, 20)).filter(Boolean))
    .filter((aliases) => aliases.length);
}

// 상담문이 계산된 명식 근거를 실제로 참조했는지 사후 검증한다.
// (길이·금칙어 게이트만으로는 근거 없는 일반 연애 조언을 걸러낼 수 없음)
export function validateLoveSecretGrounding(result = {}, groundingTerms = []) {
  // 항목은 문자열 또는 별칭 배열 둘 다 받는다.
  const terms = groundingTerms
    .map((entry) => (Array.isArray(entry) ? entry : [entry]).map((term) => clean(term)).filter(Boolean))
    .filter((aliases) => aliases.length);
  const issues = [];
  const fullText = [result.answer, ...(Array.isArray(result.sections) ? result.sections.map((section) => section.body) : [])].join("\n");

  if (terms.length) {
    const hits = terms.filter((aliases) => aliases.some((term) => fullText.includes(term)));
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

// ── 그룹 파싱 · 조립 · 검증 ────────────────────────────────────────────────

/** validateConsultationText 의 비-throw 형제. 그룹 단위 수리를 위해 코드만 돌려준다. */
export function scanConsultationTextIssues(text) {
  const value = clean(text);
  const issues = [];
  if (!value) issues.push("EMPTY_LLM_RESPONSE");
  if (hasForbiddenResultText(value)) issues.push("FORBIDDEN_RESULT_TEXT");
  if (hasUnsafeAdvice(value)) issues.push("UNSAFE_RELATIONSHIP_ADVICE");
  return issues;
}

/** 토큰 상한에 걸려 문장 중간에 끊긴 본문을 마지막 완결 문장까지 되돌린다. */
function trimToLastCompleteSentence(text) {
  const value = clean(text);
  if (!value) return "";
  const lastStop = Math.max(value.lastIndexOf("."), value.lastIndexOf("!"), value.lastIndexOf("?"), value.lastIndexOf("다."), value.lastIndexOf("요."));
  if (lastStop < value.length * 0.6) return value;
  return value.slice(0, lastStop + 1);
}

/**
 * 그룹 응답 파싱. **절대 throw 하지 않는다** — 실패는 값으로 돌려 한 그룹이 나머지를 죽이지 못하게 한다.
 */
export function parseLoveSecretGroupResponse(text, group) {
  const base = { key: group?.key || "", ok: false, sections: [], extras: {}, chars: 0, issues: [], reason: "" };
  const raw = clean(text);
  if (!raw) return { ...base, reason: "EMPTY_RESPONSE", issues: ["EMPTY_LLM_RESPONSE"] };

  let parsed = null;
  const jsonText = extractJsonObject(raw);
  if (jsonText) {
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      parsed = salvageTruncatedJsonObject(raw);
    }
  } else {
    parsed = salvageTruncatedJsonObject(raw);
  }

  const titles = (group?.sections || []).map((section) => section.title);
  let sections = [];
  if (parsed && typeof parsed === "object") {
    sections = normalizeSectionList(parsed.sections, titles.length + 2);
    if (!sections.length) {
      // 필드 형태(title 없이 field 키로만)로 왔을 때의 구제.
      sections = (group?.sections || [])
        .map((section) => ({ title: section.title, body: bodyFromValue(parsed[section.field]) }))
        .filter((section) => section.body.length >= 20);
    }
  } else {
    // JSON 이 아예 아닐 때 — 이 그룹 제목 범위로만 프로즈를 쪼갠다.
    sections = fallbackSectionsFromTitles(raw, titles);
  }

  if (!sections.length) return { ...base, reason: "NO_SECTIONS", issues: ["SECTION_EMPTY"] };

  const trimmed = sections.map((section) => ({ title: section.title, body: trimToLastCompleteSentence(section.body) }));
  const chars = countSectionBodyChars(trimmed);
  const issues = scanConsultationTextIssues(trimmed.map((section) => section.body).join("\n"));

  const extras = {};
  if (parsed && typeof parsed === "object") {
    (group?.emits || []).forEach((emit) => {
      if (emit === "header") {
        extras.keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
        extras.strategy = parsed.strategy;
        extras.summaryTitle = parsed.summaryTitle;
        extras.oneLineDiagnosis = parsed.oneLineDiagnosis;
        extras.relationshipTemperature = parsed.relationshipTemperature;
      }
      if (emit === "timing") {
        extras.monthlyHighlights = parsed.monthlyHighlights;
        extras.luckyDates = parsed.luckyDates;
      }
      if (emit === "actions") {
        extras.actionSecrets = parsed.actionSecrets;
        extras.sevenDayGuide = parsed.sevenDayGuide;
      }
      if (emit === "closing") {
        extras.finalMessage = parsed.finalMessage;
        extras.finalLine = parsed.finalLine;
      }
    });
  }

  return { ...base, ok: true, sections: trimmed, extras, chars, issues };
}

/** 그룹 제목 범위 안에서만 프로즈를 쪼갠다(전역 15섹션 폴백의 그룹 스코프 버전). */
function fallbackSectionsFromTitles(text, titles) {
  const value = clean(text, LOVE_SECRET_AI_PARSE_TEXT_MAX_CHARS).replace(/\r\n/g, "\n");
  if (!titles.length || value.length < 200) return [];
  const paragraphs = value.split(/\n{2,}/).map((part) => clean(part, 4000)).filter(Boolean);
  if (!paragraphs.length) return [];
  const chunkSize = Math.max(1, Math.ceil(paragraphs.length / titles.length));
  return titles
    .map((title, index) => ({ title, body: paragraphs.slice(index * chunkSize, (index + 1) * chunkSize).join("\n\n") }))
    .filter((section) => section.body.length >= 20);
}

/** core 그룹이 실패해도 헤더 불변조건(키워드 3개·전략 8자 이상)을 계산값으로 채운다. */
export function deriveFallbackHeader(sajuResult = {}, input = {}) {
  const reference = sajuResult?.myChart?.reference || {};
  const dayLabel = clean(reference.dayMasterLabel, 12) || clean(sajuResult?.myChart?.dayMaster, 4) || "일간";
  const keywords = [
    dayLabel.replace(/\(.*\)/, "") || "일간",
    clean(reference.dominantTenGod, 12) || "관계 리듬",
    clean(input.relationshipStatus, 20) || "연애 비책",
  ].map((item) => clean(item, 24)).filter(Boolean);
  while (keywords.length < 3) keywords.push("연애 비책");

  const strengthTip = clean(sajuResult?.myChart?.loveReference?.strengthTip, 280);
  return {
    keywords: keywords.slice(0, 3),
    strategy: strengthTip || "지금은 마음의 속도를 낮추고 관계의 온도를 현실적으로 맞추는 흐름이 좋습니다.",
    summaryTitle: "연애 비책 상담",
    oneLineDiagnosis: clean(sajuResult?.myChart?.lovePattern, 400),
    relationshipTemperature: "",
  };
}

/**
 * 6개 그룹 결과를 하나의 상담으로 조립한다.
 * 반환 shape 은 단일 호출 시절과 동일하다 — publicSession·결과 화면은 그대로 동작한다.
 */
export function assembleLoveSecretConsultation(groupResults = [], context = {}) {
  const { input = {}, sajuResult = {} } = context;
  const usable = groupResults.filter((result) => result?.ok && result.sections?.length);
  const merged = {};

  usable.forEach((result) => {
    Object.entries(result.extras || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value) && !value.length) return;
      merged[key] = value;
    });
  });

  const sections = usable.flatMap((result) => result.sections);
  // reading 의 개별 필드는 섹션 제목 ↔ 필드 매핑을 되짚어 채운다.
  const fieldByTitle = new Map(STRUCTURED_SECTION_FIELDS);
  sections.forEach((section) => {
    const field = fieldByTitle.get(section.title);
    if (field && !merged[field]) merged[field] = section.body;
  });

  const header = deriveFallbackHeader(sajuResult, input);
  const keywords = (Array.isArray(merged.keywords) ? merged.keywords : [])
    .map((item) => clean(item, 24)).filter(Boolean).slice(0, 3);
  const resolvedKeywords = keywords.length === 3 ? keywords : header.keywords;

  const reading = normalizeReading({
    ...merged,
    summaryTitle: clean(merged.summaryTitle) || header.summaryTitle,
    oneLineDiagnosis: clean(merged.oneLineDiagnosis) || header.oneLineDiagnosis,
  });
  const strategy = clean(merged.strategy || reading.oneLineDiagnosis || header.strategy, 300);
  const finalLine = clean(merged.finalLine || merged.finalMessage || reading.finalMessage, 700);
  const answer = clean(sections.map((section) => `${section.title}\n${section.body}`).join("\n\n"), LOVE_SECRET_AI_PARSE_TEXT_MAX_CHARS);

  return {
    keywords: resolvedKeywords,
    strategy: strategy.length >= 8 ? strategy : header.strategy,
    sections,
    finalLine,
    answer,
    reading,
    // sections 와 동일하면 저장하지 않는다(문서당 ~36KB 절약, 클라이언트가 이미 폴백한다).
    pdfSections: [],
    groupStatus: groupResults.map((result) => ({
      key: result?.key || "",
      ok: Boolean(result?.ok),
      chars: Number(result?.chars || 0),
      reason: clean(result?.reason, 60),
      provider: clean(result?.provider, 40),
      model: clean(result?.model, 60),
      startedAt: Number(result?.startedAt || 0),
      endedAt: Number(result?.endedAt || 0),
    })),
    degraded: usable.length < groupResults.length,
  };
}

const DATE_PATTERN = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;

/** 조립본 품질 검증. 각 이슈는 책임 그룹으로 매핑 가능한 형태여야 한다. */
export function validateLoveSecretConsultation(result = {}, context = {}) {
  const { sajuResult = {}, groundingTerms = [] } = context;
  const issues = [...validateLoveSecretGrounding(result, groundingTerms)];
  const fullText = [result.answer, ...(result.sections || []).map((section) => section.body)].join("\n");

  issues.push(...scanConsultationTextIssues(fullText));

  const calendar = sajuResult?.calendar;
  if (calendar?.available) {
    const allowed = new Set((calendar.days || []).map((day) => day.date));
    const cited = new Set();
    let match = DATE_PATTERN.exec(fullText);
    while (match) {
      cited.add(match[0]);
      match = DATE_PATTERN.exec(fullText);
    }
    DATE_PATTERN.lastIndex = 0;
    const invented = [...cited].filter((date) => !allowed.has(date));
    if (invented.length) issues.push(`INVENTED_DATE:${invented.slice(0, 3).join(",")}`);

    const luckyDates = result.reading?.luckyDates || [];
    const validLucky = luckyDates.filter((item) => allowed.has(item.date));
    if (validLucky.length < 3) issues.push(`MISSING_LUCKY_DATES:${validLucky.length}/3`);

    const highlights = result.reading?.monthlyHighlights || {};
    if (!highlights.best?.length || !highlights.caution?.length) issues.push("MISSING_MONTH_WINDOWS");
  }

  const totalChars = countLoveSecretConsultationBodyChars(result);
  if (totalChars < LOVE_SECRET_AI_TARGET_MIN_TOTAL_BODY_CHARS) issues.push(`TOTAL_BELOW_TARGET:${totalChars}`);
  if (totalChars > LOVE_SECRET_AI_TARGET_MAX_TOTAL_BODY_CHARS) issues.push(`TOTAL_ABOVE_TARGET:${totalChars}`);

  (result.groupStatus || []).forEach((status) => {
    if (!status.ok) {
      issues.push(`SECTION_EMPTY:${status.key}`);
      return;
    }
    if (status.chars < LOVE_SECRET_AI_GROUP_MIN_CHARS * 0.7) issues.push(`SECTION_MIN_CHARS:${status.key}`);
  });

  return { issues, totalChars };
}

/**
 * 이슈 → 책임 그룹. 전체 재생성을 막고 문제가 난 그룹만 다시 쓰기 위한 매핑이다.
 * 반환: Map<groupKey, issueLine[]>
 */
export function mapLoveSecretIssuesToGroups(quality = {}, groupResults = []) {
  const issues = Array.isArray(quality.issues) ? quality.issues : [];
  const targets = new Map();
  const byKey = new Map(groupResults.map((result) => [result?.key, result]));
  const push = (key, line) => {
    if (!key || !byKey.has(key)) return;
    if (!targets.has(key)) targets.set(key, []);
    if (!targets.get(key).includes(line)) targets.get(key).push(line);
  };
  const textOf = (result) => (result?.sections || []).map((section) => section.body).join("\n");

  issues.forEach((issue) => {
    if (issue.startsWith("GROUNDING_TERMS")) {
      // 근거를 전혀 안 쓴 그룹만 지목한다(전체 블랭킷 금지).
      groupResults.filter((result) => result?.ok && !/일간|오행|십성|용신|대운|세운|신살/.test(textOf(result)))
        .forEach((result) => push(result.key, "계산된 명식 데이터(일간·십성·용신·대운·신살)를 본문에서 직접 언급하며 근거로 삼으세요. 근거 없는 일반 연애 조언은 금지입니다."));
      return;
    }
    if (issue === "ACTION_GROUNDING_MISSING") {
      push("action", "actionSecrets와 sevenDayGuide의 각 항목에 '(근거: …)' 형태로 명식 근거를 붙이세요.");
      return;
    }
    if (issue === "ACTION_BADGE_FORMAT") {
      push("action", "actionSecrets 각 항목을 '[난이도·타이밍] 행동 (근거: …)' 형식으로 쓰세요. 난이도는 쉬움/보통/도전, 타이밍은 오늘/이번 주/이번 달 중 하나입니다.");
      return;
    }
    if (issue.startsWith("INVENTED_DATE")) {
      push("timing", `계산되지 않은 날짜(${issue.split(":")[1] || ""})를 썼습니다. 계산된좋은날짜 목록에 있는 날짜만 인용하세요.`);
      return;
    }
    if (issue.startsWith("MISSING_LUCKY_DATES")) {
      push("timing", "luckyDates 에 계산된좋은날짜 목록의 날짜를 최소 3개 그대로 넣고 본문에서도 인용하세요.");
      return;
    }
    if (issue === "MISSING_MONTH_WINDOWS") {
      push("timing", "monthlyHighlights.best 와 caution 에 월별흐름 데이터 기준으로 각각 최소 1개씩 채우세요.");
      return;
    }
    if (issue === "FORBIDDEN_RESULT_TEXT" || issue === "UNSAFE_RELATIONSHIP_ADVICE") {
      const line = issue === "FORBIDDEN_RESULT_TEXT"
        ? "제작물·시스템을 가리키는 표현을 지우고 상담 언어로만 쓰세요."
        : "감시·압박·집착·단정 표현을 지우고 사용자가 실제로 할 수 있는 건강한 선택으로 바꾸세요.";
      groupResults.filter((result) => result?.ok && scanConsultationTextIssues(textOf(result)).includes(issue))
        .forEach((result) => push(result.key, line));
      return;
    }
    if (issue.startsWith("SECTION_EMPTY:") || issue.startsWith("SECTION_MIN_CHARS:")) {
      push(issue.split(":")[1], `이 부분이 비었거나 너무 짧습니다. ${LOVE_SECRET_AI_GROUP_MIN_CHARS}자 이상으로 다시 쓰세요.`);
      return;
    }
    if (issue.startsWith("TOTAL_BELOW_TARGET")) {
      // 자기 최소치에 못 미친 그룹만(전부가 아니라).
      groupResults.filter((result) => result?.ok && result.chars < LOVE_SECRET_AI_GROUP_MIN_CHARS)
        .forEach((result) => push(result.key, `이 부분을 ${LOVE_SECRET_AI_GROUP_MIN_CHARS}~${LOVE_SECRET_AI_GROUP_MAX_CHARS}자로 채워 다시 쓰세요.`));
      return;
    }
    if (issue.startsWith("TOTAL_ABOVE_TARGET")) {
      const longest = [...groupResults].filter((result) => result?.ok).sort((a, b) => b.chars - a.chars)[0];
      if (longest) push(longest.key, `이 부분이 너무 깁니다. 내용을 잃지 말고 ${LOVE_SECRET_AI_GROUP_MAX_CHARS}자 이하로 압축해 다시 쓰세요.`);
    }
  });

  return targets;
}

export const __loveSecretAiPromptTestUtils = {
  hasForbiddenResultText,
  hasUnsafeAdvice,
  countSectionBodyChars,
};
