import { salvageTruncatedJsonObject } from "../../lib/llm-text.js";
import { jsonSchemaFromExample } from "./json-text-repair.js";
import { countPaidReportBodyChars, dropRepeatedReportSentences, hasRepeatedReportPassage } from "./paid-report-quality.js";
import { buildLoveSecretGroupFacts, compactSajuForFollowUp } from "./love-secret-ai-facts.js";
import { expertSubchapterPromptLines } from "./expert-subchapter-prompt.js";
import { followupSolutionPromptLines } from "./followup-solution-prompt.js";
import { compactFollowupMessages } from "./followup-context.js";

// 🔴 /g 플래그를 쓰지 않는다. RegExp.test() 는 /g 일 때 lastIndex 를 기억해, 같은 패턴으로 두 번째
//    호출하면 앞부분 일치를 건너뛰어 거짓 음성이 난다(같은 본문이 호출마다 다르게 판정된다).
const FORBIDDEN_RESULT_PATTERNS = Object.freeze([
  /\bAI\b/i,
  /프롬프트/,
  /시스템/,
  /\bPDF\b/i,
  /챕터/,
  /\bchapter\b/i,
  /\bjob\b/i,
  /\bprogress\b/i,
  /\bmock\b/i,
  /\btemplate\b/i,
  /이\s*기능은/,
  /이\s*결과는/,
  /분석\s*결과는/,
  /콘텐츠\s*블록/,
]);

const UNSAFE_ADVICE_PATTERNS = Object.freeze([
  /스토킹/,
  /감시하/,
  /뒤쫓/,
  /심리\s*조종/,
  /죄책감을\s*유발/,
  /무조건\s*(연락|기다|붙잡|밀어붙|이뤄|이루어|잘\s*풀|성공)/,
  /반드시\s*(돌아|좋아|싫어|연락|이뤄|이루어|결혼|사귀|재회|성공)/,
  /100\s*%\s*(이뤄|성공|돌아|확실)/,
  /틀림없이\s*(이뤄|돌아|사귀|결혼)/,
]);

// 일치 뒤 같은 절(쉼표·마침표 전, 최대 32자) 안에 금지·부정·경고 표현이 오면 '하지 말라'는 안전한 조언으로 본다.
// 예: "감시하지 마세요", "무조건 연락하기보다", "반드시 연락하려 들면 관계를 망쳐요".
const UNSAFE_NEGATION_WINDOW = 32;
const UNSAFE_NEGATION_PATTERN = /지\s*(마|말|않)|않|안\s*(돼|됩|되|좋)|금물|금지|삼가|피하|피해|멈추|멈춰|그만|아니|없[어습고]|보다|대신|위험|해롭|해로|망치|망쳐|망가|독이|역효과|처럼\s*(보|느껴|비)|듯/;

function unsafeMatchIsNegated(text, index, length) {
  const tail = text.slice(index + length, index + length + UNSAFE_NEGATION_WINDOW);
  const clause = tail.split(/[,.!?\n。]/)[0];
  return UNSAFE_NEGATION_PATTERN.test(clause);
}

/** 위험 조언으로 판정된 일치만 돌려준다(부정·금지 문맥의 일치는 뺀다). */
function findUnsafeAdviceMatches(text) {
  const value = String(text || "");
  const found = [];
  UNSAFE_ADVICE_PATTERNS.forEach((pattern) => {
    const global = new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`);
    let match;
    while ((match = global.exec(value))) {
      if (!unsafeMatchIsNegated(value, match.index, match[0].length)) found.push({ index: match.index, phrase: match[0] });
      if (match[0].length === 0) global.lastIndex += 1;
    }
  });
  return found.sort((a, b) => a.index - b.index);
}

function findForbiddenResultMatches(text) {
  const value = String(text || "");
  return FORBIDDEN_RESULT_PATTERNS.map((pattern) => {
    const match = pattern.exec(value);
    return match ? { index: match.index, phrase: match[0] } : null;
  }).filter(Boolean).sort((a, b) => a.index - b.index);
}

function excerptAround(text, index, length, radius = 30) {
  const value = String(text || "");
  const from = Math.max(0, index - radius);
  const to = Math.min(value.length, index + length + radius);
  return `${from > 0 ? "…" : ""}${value.slice(from, to).replace(/\s+/g, " ").trim()}${to < value.length ? "…" : ""}`;
}

/**
 * 반려 사유를 짚는다 — 어떤 표현이 어느 문맥에서 걸렸는지.
 * 그룹 체크포인트·로그와 수리 프롬프트("이 표현을 바꾸세요")에 쓴다.
 */
export function explainLoveSecretTextIssues(text, limit = 3) {
  const value = String(text || "");
  const forbidden = findForbiddenResultMatches(value).slice(0, limit)
    .map((match) => ({ issue: "FORBIDDEN_RESULT_TEXT", phrase: match.phrase, excerpt: excerptAround(value, match.index, match.phrase.length) }));
  const unsafe = findUnsafeAdviceMatches(value).slice(0, limit)
    .map((match) => ({ issue: "UNSAFE_RELATIONSHIP_ADVICE", phrase: match.phrase, excerpt: excerptAround(value, match.index, match.phrase.length) }));
  return [...forbidden, ...unsafe];
}

function loveSecretFlaggedPhraseLine(flagged = []) {
  const phrases = [...new Set((flagged || []).map((item) => clean(item?.phrase, 24)).filter(Boolean))].slice(0, 4);
  if (!phrases.length) return "";
  return ` 문제가 된 표현: ${phrases.map((phrase) => `'${phrase}'`).join(", ")}. 부정문이라도 이 어구를 그대로 쓰지 말고 다른 말로 바꾸세요.`;
}

/**
 * 직전 시도가 반려된 사유로 수리 지시를 만든다. 사유를 모르면 빈 배열(평소 프롬프트로 다시 쓴다).
 * rejection: { reason, issues, flagged }
 */
export function buildLoveSecretRejectionRepairLines(rejection) {
  if (!rejection) return [];
  const issues = new Set([...(rejection.issues || []), rejection.reason].filter(Boolean));
  const lines = [];
  if (issues.has("FORBIDDEN_RESULT_TEXT")) {
    lines.push(`직전 응답이 제작물·시스템을 가리키는 표현 때문에 반려됐습니다.${loveSecretFlaggedPhraseLine((rejection.flagged || []).filter((item) => item.issue === "FORBIDDEN_RESULT_TEXT"))}`);
  }
  if (issues.has("UNSAFE_RELATIONSHIP_ADVICE")) {
    lines.push(`직전 응답이 감시·압박·단정으로 읽히는 표현 때문에 반려됐습니다.${loveSecretFlaggedPhraseLine((rejection.flagged || []).filter((item) => item.issue === "UNSAFE_RELATIONSHIP_ADVICE"))} 피해야 할 행동은 '상대의 일상을 하나하나 확인하려는 마음', '답을 재촉하는 연락'처럼 풀어 쓰세요.`);
  }
  if (issues.has("REQUIRED_SECTIONS_INCOMPLETE") || issues.has("NO_SECTIONS") || issues.has("SECTION_EMPTY") || issues.has("INVALID_SECTION_BODY")) {
    lines.push("직전 응답에 빠진 섹션이 있었습니다. sections 배열에 지정된 제목을 한 글자도 바꾸지 말고 모두, 각각 한 번씩 넣으세요. body 는 문자열입니다.");
  }
  if (issues.has("REPEATED_PASSAGE")) {
    lines.push("직전 응답에 같은 문장이 되풀이됐습니다. 섹션마다 새 근거와 새 장면으로 쓰세요.");
  }
  if (issues.has("PARSE_FAILED") || issues.has("EMPTY_RESPONSE") || issues.has("EMPTY_LLM_RESPONSE")) {
    lines.push("직전 응답이 JSON 으로 읽히지 않았습니다. 설명 없이 지정된 JSON 객체 하나만 출력하세요.");
  }
  return lines;
}

// 분량 문턱은 2단이다.
//  - TARGET_*  : 목표치. 미달/초과하면 "책임 그룹만" 다시 쓰는 수리(wave 2) 트리거.
//  - MIN/MAX_* : 전달 가능 하한/상한. 벗어나면 throw(=결제 실패 경로).
// 🔴 MIN 은 degrade 바닥(4개 그룹 × 5,000자)보다 낮아야 한다. 그렇지 않으면 정당한
//    부분 성공 결과가 결제 후 하드 실패로 뒤집힌다.
// 목표는 V2(7개 그룹) 기준 7 × 5,000~6,500자. V1(6개 그룹) 저장 세션은 부족분을 수리로 메우지 않아도 MIN 위라 전달된다.
export const LOVE_SECRET_AI_TARGET_MIN_TOTAL_BODY_CHARS = 35000;
export const LOVE_SECRET_AI_TARGET_MAX_TOTAL_BODY_CHARS = 45500;
export const LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS = 20000;
export const LOVE_SECRET_AI_MAX_TOTAL_BODY_CHARS = 52000;
const LOVE_SECRET_AI_PARSE_TEXT_MAX_CHARS = 52000;

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

function hasForbiddenResultText(text) {
  const value = String(text || "");
  return FORBIDDEN_RESULT_PATTERNS.some((pattern) => pattern.test(value));
}

function hasUnsafeAdvice(text) {
  return findUnsafeAdviceMatches(text).length > 0;
}

/** 금지·위험 표현이 든 문장만 덜어 낸다. 마지막 시도에서 그룹 전체를 버리는 대신 쓴다. */
function scrubFlaggedSentences(body) {
  const parts = String(body || "").split(/(?<=[.!?。])\s+/);
  const kept = parts.filter((sentence) => !hasForbiddenResultText(sentence) && !hasUnsafeAdvice(sentence));
  return { body: kept.join(" ").trim(), dropped: parts.length - kept.length };
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
    partialReason: `사용자 프롬프트는 ${LOVE_SECRET_AI_GROUPS.length}개 그룹별로 계산된 명식·궁합 데이터를 입력으로 받습니다. 시스템 프롬프트만 표시합니다.`,
  };
}

export const LOVE_SECRET_AI_GROUP_MIN_CHARS = 5000;
export const LOVE_SECRET_AI_GROUP_MAX_CHARS = 6500;
// V2 그룹(perspective 가 있는 그룹)이 프롬프트에서 요구하는 분량(2026-11-08 분량 넉넉). 전달 하한·수리 문턱은 위 V1 값 그대로라
// 짧게 와도 실패하지 않는다. V1 그룹 프롬프트는 위 값을 그대로 써 바이트 단위로 같다.
export const LOVE_SECRET_AI_V2_GROUP_MIN_CHARS = 6000;
export const LOVE_SECRET_AI_V2_GROUP_MAX_CHARS = 7500;
export function loveSecretGroupCharRange(group) {
  return group?.perspective
    ? [LOVE_SECRET_AI_V2_GROUP_MIN_CHARS, LOVE_SECRET_AI_V2_GROUP_MAX_CHARS]
    : [LOVE_SECRET_AI_GROUP_MIN_CHARS, LOVE_SECRET_AI_GROUP_MAX_CHARS];
}

// V1: 2026-11-08 이전 6개 그룹. groupPlanVersion 이 없는 저장 세션은 이 계획으로 이어 쓴다.
// 🔴 프롬프트가 바이트 단위로 그대로여야 한다 — 이 표는 고치지 않는다.
export const LOVE_SECRET_AI_GROUPS_V1 = Object.freeze([
  Object.freeze({
    key: "core",
    label: "핵심 연애운과 질문의 답",
    emits: Object.freeze(["header"]),
    covered: "나의 연애 반복 패턴·장단점/상대와 궁합·이상형/갈등·바람기·재회/타이밍·좋은 날짜·결혼운/실행 전략과 마무리",
    sections: Object.freeze([
      Object.freeze({ title: "현재 관계의 자리와 질문의 핵심", field: "relationshipCore", guide: "사용자의 자유 질문을 첫 문장에서 정면으로 받아 한 줄로 답한 뒤, 타고난 성향 총론을 먼저 짚는다. 일간·월지·오행 분포를 근거로 이 사람의 타고난 기질과 성향을 전반적으로 소개해, 상담자가 '나를 정확히 봤다'고 느끼도록 신뢰를 세운다(핵심 기질 2~3가지, 감정·관계에서의 반응, 결정 습관을 계산 사실의 쉬운 뜻 → 생활 장면 순으로). 연애에서 반복되는 패턴·장단점은 다른 부분이 맡으니 여기서는 총론에 머문다. 이어서 그 성향 위에서 지금 관계가 어느 자리에 서 있는지 확정한다." }),
      Object.freeze({ title: "핵심 연애운 — 명식이 사랑에서 그리는 큰 결", field: "coreLoveFortune", guide: "현재 연애운의 흐름, 열리는 기회, 위험 구간, 전체 분위기를 대운·세운·격국에 걸어 말한다." }),
      Object.freeze({ title: "오행과 조후로 보는 감정의 온도", field: "fiveElementsInsight", guide: "오행 분포와 조후로 감정의 온도·습도를 설명하고, 그것이 연애에서 어떻게 드러나는지로 번역한다." }),
    ]),
  }),
  Object.freeze({
    key: "self",
    label: "나의 연애 성향 — 장점·약점·심리",
    emits: Object.freeze([]),
    covered: "질문의 핵심·타고난 성향 총론과 전체 연애운/상대와 궁합·이상형/갈등·바람기·재회/타이밍·좋은 날짜·결혼운/실행 전략과 마무리",
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

const V2_COVERED_NATURE = "타고난 연애 기질(사랑하는 방식의 원형과 생활 장면)";
const V2_SECTION_GUIDES = Object.freeze({
  "현재 관계의 자리와 질문의 핵심": "사용자의 자유 질문을 첫 문장에서 한 번만 인용해 정면으로 받고 한 줄로 답한다. 타고난 기질 총론은 다른 부분이 이미 맡았으니 되풀이하지 않는다. 그 답 위에서 지금 관계가 어느 자리에 서 있는지 확정하고, 왜 그렇게 보는지 명식 근거로 받친다.",
  // V1 guide 의 "감시·압박·집착은 어떤 경우에도 조언하지 않는다"는 금지 어간을 본문에 그대로 끌어와 반려를 불렀다(2026-11-08 샘플).
  "피해야 할 선택과 자기 보호": "지켜야 할 경계와 물러설 지점을 구체적으로 정한다. 피해야 할 행동은 '상대의 하루를 하나하나 확인하고 싶어지는 마음', '답을 재촉하는 연락'처럼 생활 장면으로 풀어 쓰고, 그 대신 지킬 나의 리듬을 함께 제시한다.",
  "상대에게 다가가는 대화 문장": "그대로 보낼 수 있는 문장을 따옴표로 제시하고, 피하면 좋은 말은 '재촉처럼 들리는 말'처럼 성격으로 짚은 뒤 바꿔 말할 문장을 함께 준다.",
});
const V2_GROUP_OVERRIDES = Object.freeze({
  core: { perspective: "질문에 답하는 시선 — 지금 관계의 자리와 질문의 답을 정합니다.", questionRule: "core", covered: `${V2_COVERED_NATURE}/나의 연애 반복 패턴·장단점/상대와 궁합·이상형/갈등·바람기·재회/타이밍·좋은 날짜·결혼운/실행 전략과 마무리` },
  self: { perspective: "나를 들여다보는 시선 — 사랑에서 반복하는 선택과 그 이유를 봅니다.", questionRule: "other", covered: `${V2_COVERED_NATURE}/질문의 핵심과 전체 연애운/상대와 궁합·이상형/갈등·바람기·재회/타이밍·좋은 날짜·결혼운/실행 전략과 마무리` },
  partner: { perspective: "상대를 바라보는 시선 — 상대의 결과 두 사람 사이의 끌림을 봅니다.", questionRule: "other", covered: `${V2_COVERED_NATURE}/질문의 핵심과 전체 연애운/나의 성향·장단점/갈등·바람기·재회/타이밍·좋은 날짜·결혼운/실행 전략과 마무리` },
  risk: { perspective: "지켜 내는 시선 — 마음이 흔들리는 조건과 물러설 경계를 정합니다.", questionRule: "other", covered: `${V2_COVERED_NATURE}/질문의 핵심과 전체 연애운/나의 성향·장단점/상대와 궁합·이상형/타이밍·좋은 날짜·결혼운/실행 전략과 마무리` },
  timing: { perspective: "시간의 시선 — 언제 움직이고 언제 기다릴지를 정합니다.", questionRule: "other", covered: `${V2_COVERED_NATURE}/질문의 핵심과 전체 연애운/나의 성향·장단점/상대와 궁합·이상형/갈등·바람기·재회/실행 전략과 마무리` },
  action: { perspective: "실행의 시선 — 오늘부터 할 행동과 건넬 말을 고릅니다.", questionRule: "other", covered: `${V2_COVERED_NATURE}/질문의 핵심과 전체 연애운/나의 성향·장단점/상대와 궁합·이상형/갈등·바람기·재회/타이밍·좋은 날짜·결혼운` },
});

const LOVE_SECRET_NATURE_GROUP = Object.freeze({
  key: "nature",
  label: "타고난 연애 기질",
  emits: Object.freeze([]),
  perspective: "타고난 기질의 시선 — 질문보다 먼저, 이 사람이 사랑하는 방식의 원형을 비춥니다.",
  questionRule: "nature",
  covered: "질문의 답과 지금 관계의 자리·전체 연애운/나의 연애 반복 패턴·장단점/상대와 궁합·이상형/갈등·바람기·재회/타이밍·좋은 날짜·결혼운/실행 전략과 마무리",
  sections: Object.freeze([
    Object.freeze({ title: "타고난 연애 기질 — 당신이 사랑하는 방식의 원형", field: "natureArchetype", guide: "일간·월지·오행 분포를 쉬운 말로 먼저 풀고, 그 위에서 이 사람이 사랑하는 방식의 원형을 소개한다(핵심 기질 2~3가지, 마음이 움직이는 속도, 가까워질 때와 멀어질 때의 반응, 결정 습관). 계산 사실의 쉬운 뜻 → 생활 장면 순으로 써서 상담자가 '나를 정확히 봤다'고 느끼게 한다." }),
    Object.freeze({ title: "그래서 이런 순간 마음이 먼저 움직여요", field: "natureEmpathyScenes", guide: "그 기질이 일상에서 드러나는 장면 2~3개를 구체적으로 그린다(답장을 기다리는 밤, 약속 전날, 다툰 뒤 첫 연락 같은 순간). 장면마다 그때 마음속에서 일어나는 일을 다정하게 짚는다. 마지막 문단에서만 이 기질이 이번 상담 주제와 어떻게 이어지는지 한두 문장으로 잇는다." }),
  ]),
});

function deriveV2Group(group) {
  const override = V2_GROUP_OVERRIDES[group.key] || {};
  return Object.freeze({
    ...group,
    ...override,
    sections: Object.freeze(group.sections.map((section) => (V2_SECTION_GUIDES[section.title]
      ? Object.freeze({ ...section, guide: V2_SECTION_GUIDES[section.title] })
      : section))),
  });
}

// V2(현재): 타고난 연애 기질(nature)을 맨 앞에 두는 7개 그룹. 제목·필드는 V1 그대로이고 guide·covered·관점만 바뀐다.
export const LOVE_SECRET_AI_GROUP_PLAN_VERSION = 2;
export const LOVE_SECRET_AI_GROUPS = Object.freeze([
  LOVE_SECRET_NATURE_GROUP,
  ...LOVE_SECRET_AI_GROUPS_V1.map(deriveV2Group),
]);

/** 저장 세션의 groupPlanVersion 으로 그룹 계획을 고른다. 버전이 없으면(예전 세션) V1. */
export function loveSecretGroupsForPlan(version) {
  return Number(version) >= 2 ? LOVE_SECRET_AI_GROUPS : LOVE_SECRET_AI_GROUPS_V1;
}

export function findLoveSecretGroup(key, version = LOVE_SECRET_AI_GROUP_PLAN_VERSION) {
  return loveSecretGroupsForPlan(version).find((group) => group.key === key) || null;
}

export function buildLoveSecretGroupResponseSchema(group) {
  return jsonSchemaFromExample(JSON.parse(groupJsonSkeleton(group)));
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

// 연애 비책은 연이·서한비 공동 마스터다. 마음과 실천(nature·core·self·action)은 연이, 상대·위험·시기(partner·risk·timing)는 서한비가 쓴다.
// 결과 화면 화자 칩(app/love-secret-ai/result/love-secret-sections.ts)이 이 매핑을 섹션 제목으로 따라간다.
export const LOVE_SPEAKER_BY_GROUP = Object.freeze({
  nature: "yeoni", core: "yeoni", self: "yeoni", partner: "hanbi", risk: "hanbi", timing: "hanbi", action: "yeoni",
});
const LOVE_SPEAKER_NAMES = Object.freeze({ yeoni: "연이", hanbi: "서한비" });

/**
 * 그룹별로 시스템 프롬프트에 담당 범위를 덧붙인다(기본 페르소나는 CMS 오버라이드가 소유).
 * persona 는 이 그룹 화자의 페르소나 원문이다. 비어 있으면 예전 출력과 바이트 단위로 같다.
 */
export function buildLoveSecretGroupSystemPrompt(basePrompt, group, persona = "") {
  const speaker = LOVE_SPEAKER_NAMES[LOVE_SPEAKER_BY_GROUP[group.key]];
  const voice = persona && speaker
    ? ["", `이 상담은 연이와 서한비가 부를 나눠 씁니다. 이번 부는 ${speaker}가 씁니다. 다른 상담자의 말투를 섞지 않고, 상대 상담자를 언급하지 않습니다.`, persona]
    : [];
  return [
    clean(basePrompt),
    ...voice,
    "",
    `이번 응답에서는 상담의 한 부분 — "${group.label}" — 만 씁니다. 나머지 부분은 같은 상담의 다른 곳에서 이미 다루므로 여기서 반복하지 않습니다.`,
    "계산되지 않은 날짜·간지·신살을 만들어 쓰지 않습니다. 제공된 계산 확정값 안에서만 해석합니다.",
  ].join("\n");
}

const LOVE_QUESTION_RULES = Object.freeze({
  nature: "이 부분에서는 사용자의 질문에 답하지 않고 질문을 인용하지도 않습니다. 마지막 문단에서만 이번 상담 주제와 이어 줍니다.",
  core: "사용자의 질문은 이 부분의 첫 문장에서 한 번만 인용하고, 그 뒤로는 다시 인용하지 않습니다.",
  other: "사용자의 질문을 다시 인용하지 않습니다. 질문에 대한 답은 다른 부분이 이미 했습니다.",
});

// V2 그룹(perspective 가 있는 그룹)에만 붙는다. V1 그룹 프롬프트는 이 줄이 없어 예전과 바이트 단위로 같다.
function loveSecretPerspectiveLines(group) {
  if (!group?.perspective) return [];
  return [
    `이 부분의 관점: ${group.perspective} 다른 부분과 같은 이야기를 이 관점으로만 다시 씁니다.`,
    "'결국 중요한 것은', '다시 말해', '앞서 말했듯' 같은 되풀이 연결어를 쓰지 않습니다.",
    "섹션마다 같은 여는 문장이나 같은 맺는 문장을 되풀이하지 않습니다.",
    LOVE_QUESTION_RULES[group.questionRule] || LOVE_QUESTION_RULES.other,
    ...(group.questionRule === "core" ? [] : [LOVE_SITUATION_RULE]),
    ...LOVE_V2_READABILITY_LINES,
  ];
}

// 첫 샘플(2026-11-08)에서 '연락이 뜸'이 16번 나왔다. 상황 요약은 core 가 한 번만 맡는다.
const LOVE_SITUATION_RULE = "사용자가 적은 상황(예: 연락이 뜸해졌다는 사정)을 다시 요약하거나 되풀이하지 않습니다. 상황을 가리켜야 하면 이 부분 전체에서 한 번, 짧게만 씁니다.";
const LOVE_V2_READABILITY_LINES = Object.freeze([
  "점수와 개수를 숫자로 쓰지 않습니다('4.7점', '토 기운 4개' 금지). '토 기운이 넉넉한 편', '끌림이 강한 편'처럼 말로 풉니다.",
  "억부·신강·신약·합·충·형·파·해·귀문관살 같은 명리 용어는 꼭 필요할 때만 처음 한 번 쓰고 바로 쉬운 말로 뜻을 풀며, 그 뒤로는 풀어 쓴 말로만 부릅니다.",
  "같은 비유(빚, 온도, 다리, 문, 계절 같은 이미지)는 이 부분에서 한 번만 씁니다.",
  "문장 끝은 해요체(~해요, ~예요, ~거든요, ~세요)로만 맺습니다. '~합니다', '~입니다', '~습니다' 같은 합니다체는 쓰지 않습니다.",
]);

function loveSecretV2SectionLengthLine(group) {
  const count = Math.max(1, group.sections.length);
  const min = Math.round(LOVE_SECRET_AI_V2_GROUP_MIN_CHARS / count / 100) * 100;
  const max = Math.round(LOVE_SECRET_AI_V2_GROUP_MAX_CHARS / count / 100) * 100;
  const paragraphs = Math.max(3, Math.ceil(min / 300));
  return `각 섹션의 body는 최소 ${min}자 이상(목표 ${min}~${max}자)이고 ${paragraphs}문단 이상, 문단마다 4~6문장으로 넉넉하게 씁니다. 짧게 요약하고 끝내지 말고, 근거 → 생활 장면 → 할 일 순서로 문단을 늘리며, 첫 문장 구조를 반복하지 않습니다.`;
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
    `이 부분의 sections body 합계는 ${loveSecretGroupCharRange(group)[0]}~${loveSecretGroupCharRange(group)[1]}자로 씁니다. 마지막 문장을 중간에 끊지 말고 반드시 완결합니다.`,
    group.perspective
      ? loveSecretV2SectionLengthLine(group)
      :"각 섹션의 body는 900~1,300자 안팎의 밀도 있는 문단으로 쓰되 첫 문장 구조를 반복하지 않습니다.",
    ...loveSecretPerspectiveLines(group),
    "각 섹션은 반드시 명리 근거(일간·일지·오행·조후·십성·신살·대운/세운·궁합 관계 중 해당되는 것)를 최소 1회 명시하고, 그 근거를 관계 심리와 현실 행동 처방으로 이어 씁니다. 근거 없이 누구에게나 통하는 일반 연애 조언은 금지합니다.",
    "명식 근거는 용어를 나열하지 말고 사랑에서 드러나는 감정, 거리감, 표현 방식, 선택 습관으로 번역합니다.",
    "관계 상태와 상담 주제를 모든 판단의 기준으로 삼습니다.",
    "상대 정보가 부족하면 단정하지 말고, 현재 드러난 흐름과 사용자가 확인할 수 있는 신호를 중심으로 말합니다.",
    "body 안에서는 문단 사이를 빈 줄로 구분하고, 핵심 문구만 **굵게** 표시합니다. 필요할 때만 '-' 목록을 쓰고, 그 외 마크다운(제목 #, 코드블록, 표)은 쓰지 않습니다.",
    "분량을 채우기 위해 같은 조언을 늘이지 않습니다.",
    "",
    ...expertSubchapterPromptLines({ feature: "연애 비책 전문가 상담" }),
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
    ? compactFollowupMessages(consultation.messages, { maxChars: 16000, recent: 2 }).map((message) => ({
      role: message.role,
      content: clean(message.content, 2400),
      ...(message.compacted ? { compacted: true } : {}),
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
    ...followupSolutionPromptLines({ feature: "연애 비책 후속 상담" }),
    "",
    "첫 근거 공감 문단을 짧게 마친 뒤 사용자의 추가 질문에 바로 답합니다.",
    "이전 상담은 필요한 만큼만 이어받고, 새 질문과 무관한 전체 요약으로 흐르지 않습니다.",
    "명식과 궁합 근거는 관계 언어로 짧게 풀어 사용자가 지금의 마음과 선택을 이해하도록 돕습니다.",
    "상대방의 마음을 단정하지 말고, 사용자가 건강한 선택을 할 수 있도록 현실적인 다음 행동을 제안합니다.",
    "재회, 고백, 갈등, 정리 질문에서는 오늘 할 말과 하지 말아야 할 행동을 함께 짚습니다.",
    "문단형 상담으로만 답하고 금지 표현을 쓰지 않습니다. 문단 사이는 빈 줄로 구분하고, 핵심 문구만 **굵게** 표시합니다.",
  ].join("\n");
}

// 섹션 제목 ↔ reading 필드. 그룹 정의에서 파생해 한 곳에서만 관리한다.
// V2 의 제목은 V1 제목을 모두 포함한다(제목을 바꾸지 않았다) — V2 목록이 곧 두 계획의 합집합이다.
// 순서는 V2 그룹 순서 = 화면 표시 순서.
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

function normalizeSectionList(value, limit = 14, minBodyChars = 20) {
  if (!Array.isArray(value)) return [];
  return value.map((section) => ({
    title: clean(section?.title, 80),
    body: clean(section?.body || section?.content || section?.text, 12000),
  })).filter((section) => section.title && section.body.length >= minBodyChars).slice(0, limit);
}

function countSectionBodyChars(sections = []) {
  return Array.isArray(sections)
    ? sections.reduce((sum, section) => sum + countPaidReportBodyChars(section?.body), 0)
    : 0;
}

export function countLoveSecretConsultationBodyChars(result = {}) {
  const pdfChars = countSectionBodyChars(result.pdfSections);
  if (pdfChars > 0) return pdfChars;
  const sectionChars = countSectionBodyChars(result.sections);
  if (sectionChars > 0) return sectionChars;
  return countPaidReportBodyChars(result.answer);
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
    my.approvedSaju ? [] : [clean(reference.yongshinElementLabel, 4), clean(reference.yongshinElement, 12)],
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

/** 정밀지표 영문 키가 "매력(attraction)" 처럼 한국어 뒤 괄호로 새어 나온 꼬리를 지운다. */
function stripMetricKeyTails(text) {
  return String(text ?? "").replace(/(?<=[가-힣])\((?:attraction|stability|communication|conflict|confidence)\)/gi, "");
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
export function parseLoveSecretGroupResponse(text, group, { lengthRepair = false, scrubUnsafe = false } = {}) {
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
    if (Array.isArray(parsed.sections) && parsed.sections.some(section => {
      const body = section?.body ?? section?.content ?? section?.text;
      return typeof body !== "string";
    })) return { ...base, reason: "INVALID_SECTION_BODY", issues: ["REQUIRED_SECTIONS_INCOMPLETE"] };
    sections = normalizeSectionList(parsed.sections, titles.length + 2, lengthRepair ? 1 : 20);
    if (!sections.length) {
      // 필드 형태(title 없이 field 키로만)로 왔을 때의 구제.
      if ((group?.sections || []).some(section => {
        const value = parsed[section.field];
        return value != null && typeof value !== "string" && !(Array.isArray(value) && value.every(item => typeof item === "string"));
      })) return { ...base, reason: "INVALID_SECTION_BODY", issues: ["REQUIRED_SECTIONS_INCOMPLETE"] };
      sections = (group?.sections || [])
        .map((section) => ({ title: section.title, body: bodyFromValue(parsed[section.field]) }))
        .filter((section) => section.body.length >= (lengthRepair ? 1 : 20));
    }
  } else {
    // JSON 이 아예 아닐 때 — 이 그룹 제목 범위로만 프로즈를 쪼갠다.
    sections = fallbackSectionsFromTitles(raw, titles);
  }

  if (!sections.length) return { ...base, reason: "NO_SECTIONS", issues: ["SECTION_EMPTY"] };

  let trimmed = sections.map((section) => ({ title: section.title, body: trimToLastCompleteSentence(stripMetricKeyTails(section.body)) }));
  let issues = scanConsultationTextIssues(trimmed.map((section) => section.body).join("\n"));
  const textFlag = (issue) => issue === "FORBIDDEN_RESULT_TEXT" || issue === "UNSAFE_RELATIONSHIP_ADVICE";
  // 금지·위험 표현에 걸리면 무엇이 어느 문맥에서 걸렸는지 남긴다(재시도 프롬프트가 그 표현을 짚어 고치게).
  const flagged = issues.some(textFlag) ? explainLoveSecretTextIssues(trimmed.map((section) => section.body).join("\n")) : [];
  let scrubbed = 0;
  if (scrubUnsafe && flagged.length && issues.every(textFlag)) {
    // 마지막 시도: 그룹을 통째로 비우는 대신 걸린 문장만 덜어 낸다.
    let dropped = 0;
    const cleaned = trimmed.map((section) => {
      const result = scrubFlaggedSentences(section.body);
      dropped += result.dropped;
      return { title: section.title, body: result.body };
    });
    const rescanned = scanConsultationTextIssues(cleaned.map((section) => section.body).join("\n"));
    if (!rescanned.length) {
      trimmed = cleaned;
      issues = rescanned;
      scrubbed = dropped;
    }
  }
  const chars = countSectionBodyChars(trimmed);
  const sectionFloor = Math.ceil(LOVE_SECRET_AI_GROUP_MIN_CHARS * 0.7 / Math.max(1, titles.length));
  const lengthShort = titles.some(title => !trimmed.some(section => section.title === title && countPaidReportBodyChars(section.body) >= sectionFloor))
    || chars < LOVE_SECRET_AI_GROUP_MIN_CHARS * 0.7;
  const requiredSectionsPresent = titles.every(title => trimmed.filter(section => section.title === title && countPaidReportBodyChars(section.body) >= (lengthRepair ? 1 : sectionFloor)).length === 1);
  if (hasRepeatedReportPassage(trimmed.map(section => section.body).join("\n"))) issues.push("REPEATED_PASSAGE");
  if (!requiredSectionsPresent) issues.push("REQUIRED_SECTIONS_INCOMPLETE");

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

  const result = { ...base, ok: requiredSectionsPresent && issues.length === 0, sections: trimmed, extras, chars, issues, lengthShort };
  if (flagged.length) result.flagged = flagged;
  if (scrubbed) result.scrubbed = scrubbed;
  return result;
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
      lengthShort: Boolean(result?.lengthShort),
      lengthRepair: Boolean(result?.lengthRepair),
      reason: clean(result?.reason, 60),
      provider: clean(result?.provider, 40),
      model: clean(result?.model, 60),
      startedAt: Number(result?.startedAt || 0),
      endedAt: Number(result?.endedAt || 0),
    })),
    degraded: usable.length < groupResults.length,
  };
}

/**
 * 그룹 사이에 되풀이된 문장을 뒤쪽 섹션에서 지운다. 실패하거나 섹션이 비면 원문을 그대로 둔다 —
 * 전달을 막는 단계가 아니다. 섹션이 바뀌면 reading 필드와 answer 도 같이 맞춘다.
 */
export function dedupeLoveSecretSections(assembled) {
  if (!assembled || !Array.isArray(assembled.sections) || !assembled.sections.length) return assembled;
  let prior = "";
  const fieldByTitle = new Map(STRUCTURED_SECTION_FIELDS);
  const reading = { ...(assembled.reading || {}) };
  let changed = false;
  const sections = assembled.sections.map((section) => {
    const body = String(section?.body || "");
    let next = body;
    try {
      next = dropRepeatedReportSentences(body, prior);
    } catch (_) {
      next = body;
    }
    if (typeof next !== "string" || !next.trim()) next = body;
    prior = prior ? `${prior}\n\n${next}` : next;
    if (next === body) return section;
    changed = true;
    const field = fieldByTitle.get(section.title);
    if (field && reading[field] === body) reading[field] = next;
    return { ...section, body: next };
  });
  if (!changed) return assembled;
  return {
    ...assembled,
    sections,
    reading,
    answer: clean(sections.map((section) => `${section.title}\n${section.body}`).join("\n\n"), LOVE_SECRET_AI_PARSE_TEXT_MAX_CHARS),
  };
}

const DATE_PATTERN = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;

/** 조립본 품질 검증. 각 이슈는 책임 그룹으로 매핑 가능한 형태여야 한다. */
export function validateLoveSecretConsultation(result = {}, context = {}) {
  const { sajuResult = {}, groundingTerms = [] } = context;
  const issues = [...validateLoveSecretGrounding(result, groundingTerms)];
  if (hasRepeatedReportPassage((result.sections || []).map(section => section.body).join("\n"))) issues.push("REPEATED_PASSAGE");
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
  if (totalChars < LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS) issues.push(`TOTAL_BELOW_TARGET:${totalChars}`);

  (result.groupStatus || []).forEach((status) => {
    if (!status.ok) {
      issues.push(`SECTION_EMPTY:${status.key}`);
      return;
    }
    if (!status.lengthRepair && (status.lengthShort || status.chars < LOVE_SECRET_AI_GROUP_MIN_CHARS * 0.7)) issues.push(`SECTION_MIN_CHARS:${status.key}`);
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
    if (issue === "REPEATED_PASSAGE") {
      const repeated = groupResults.filter(result => result?.ok && hasRepeatedReportPassage(textOf(result)));
      (repeated.length ? repeated : groupResults.filter(result => result?.ok).slice(-1))
        .forEach(result => push(result.key, "반복 문장을 제거하고 해당 계산 근거에 맞는 고유한 사례와 행동 조언으로 보완하세요."));
      return;
    }
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
        .forEach((result) => push(result.key, `${line}${loveSecretFlaggedPhraseLine(explainLoveSecretTextIssues(textOf(result)).filter((item) => item.issue === issue))}`));
      return;
    }
    if (issue.startsWith("SECTION_EMPTY:") || issue.startsWith("SECTION_MIN_CHARS:")) {
      push(issue.split(":")[1], `이 부분이 비었거나 너무 짧습니다. ${LOVE_SECRET_AI_GROUP_MIN_CHARS}자 이상으로 다시 쓰세요.`);
      return;
    }
    if (issue.startsWith("TOTAL_BELOW_TARGET")) {
      if (groupResults.some(result => !result?.ok)) return;
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
  findUnsafeAdviceMatches,
  scrubFlaggedSentences,
  countSectionBodyChars,
};
