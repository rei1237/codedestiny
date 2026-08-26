import { dedupeTextList, salvageTruncatedJsonObject, trimToSentenceBoundary } from "../../lib/llm-text.js";
import { buildBasisFactLines, collectBasisLabels } from "./analysis-basis-contract.js";
import { scrubInternalKeyPaths } from "./llm-leak-guard.js";
import { buildNeoBasisPayload, sliceNeoBasisPayload } from "./neo-operation-room-basis.js";
import { REASONING_OUTPUT_RULE_LINES } from "./fortune-reasoning-contract.js";
import { escapeRawControlCharsInJsonStrings } from "./json-text-repair.js";
import { buildZiweiPersonalityContextLines } from "./ziwei-personality-context.js";
import { neoRelationshipStatusFocus, normalizeTopicKey } from "./neo-operation-room-compat.js";

const METHOD_LABELS = Object.freeze({
  saju: "사주",
  ziwei: "자미두수",
  vedic: "베다점",
  astrology: "점성술",
});

const METHOD_WRITING_GUIDES = Object.freeze({
  saju: {
    title: "사주 작전 브리핑",
    concept: "내가 어떤 무기를 들고 태어났는가, 그리고 그 무기를 제대로 쓰고 있는가.",
    focus: ["일간 성향", "월령/계절감", "오행 균형", "십성 구조", "강한 기운과 약한 기운", "반복되는 선택 습관", "연애/직업/돈/인간관계별 작전", "계산 가능한 대운/세운/월운", "오늘부터 바꿔야 할 행동"],
    tone: ["네가 약해서 흔들리는 게 아니다. 네 무기를 이상한 방식으로 쓰고 있는 거다.", "사주는 네가 들고 태어난 무기를 보여준다. 문제는 그걸 제대로 쓰고 있느냐다.", "운이 들어올 틈을 같은 습관으로 막고 있다면, 먼저 그 습관부터 끊어야 한다."],
  },
  ziwei: {
    title: "자미두수 운명 지휘도",
    concept: "내 인생판에서 어느 궁이 힘을 잃고 있고, 어디를 다시 세워야 하는가.",
    focus: ["명궁·신궁: 삶의 중심과 실제 행동 방식", "14주성의 별 세기(묘·왕·득·리·평·함)로 본 강한 궁과 약한 궁", "관록궁: 일과 사회적 역할", "재백궁: 돈을 다루는 방식", "부처궁: 관계와 연애 흐름", "복덕궁: 멘탈과 회복력", "생년 사화(화록·화권·화과·화기)가 걸린 궁", "삼방사정(명궁-재백-관록)의 세력 연결", "궁별로 지금 밀리는 자리와 지금 살려야 할 궁"],
    tone: ["네 문제는 능력이 없는 게 아니다. 인생판에서 힘을 써야 할 자리를 잘못 잡고 있는 거다.", "명궁은 네 중심이고, 복덕궁은 버티는 힘이다. 둘 중 하나가 흔들리면 선택도 흔들린다.", "묘·왕에 앉은 강한 별은 밀어붙일 자리고, 함에 빠진 약한 별은 무리하지 말고 지킬 자리다.", "지금은 모든 궁을 동시에 살리려 하지 말고, 먼저 무너진 중심부터 다시 세워야 한다."],
    starStrengthRule: "자미두수 판단은 주성의 별 세기(◎묘 최상, O득 강함, ▲리 이로움, △평 균형, X함 함몰 주의)를 1순위 근거로 삼는다. 강한 궁(◎·O)은 밀어붙일 전략, 약한 궁(X)은 지키고 보완할 전략으로 나눠 구체화한다. [계산 확정값]에 적힌 별과 그 세기를 반드시 인용하되, 표에 세기가 없는 별의 강약은 절대 지어내지 않는다.",
  },
  vedic: {
    title: "베다점 카르마 브리핑",
    concept: "내가 왜 같은 사람, 같은 상황, 같은 불안으로 반복해서 돌아가는가.",
    focus: ["라그나: 세상에 서는 방식", "문 사인: 마음이 반응하는 방식", "나크샤트라: 깊은 습관과 끌림", "계산 가능한 다샤 또는 주요 흐름", "반복해서 끌리는 사람/상황", "관계에서 되풀이되는 감정", "삶의 주제와 카르마적 과제", "현실적인 교정 작전"],
    tone: ["너는 우연히 같은 장면으로 돌아가는 게 아니다. 익숙한 불안을 운명처럼 붙잡고 있는 거다.", "라그나는 네가 세상 앞에 서는 방식이고, 나크샤트라는 마음 깊은 곳의 흔적이다.", "이 흐름은 너를 벌주려는 게 아니라, 같은 선택을 이제는 다르게 보라고 밀어붙이는 것이다."],
  },
  astrology: {
    title: "점성술 심리 작전",
    concept: "내 마음과 욕망의 궤도가 어디서 충돌하고 있는가.",
    focus: ["태양: 내가 향하는 방향", "달: 감정과 불안 반응", "상승궁: 세상에 보이는 방식", "금성: 사랑받고 싶은 방식", "화성: 싸우고 밀어붙이는 방식", "수성: 생각과 말의 패턴", "주요 하우스", "주요 애스펙트", "계산 가능한 현재 트랜짓", "관계/일/멘탈에서 반복되는 심리"],
    tone: ["별은 핑계가 아니다. 네 마음이 왜 같은 궤도로 돌아가는지 보여주는 지도다.", "태양은 네가 향하는 방향이고, 달은 네가 흔들리는 방식이다.", "지금 필요한 건 감정을 없애는 게 아니라, 감정이 네 선택을 대신하지 못하게 하는 것이다."],
  },
});

const INTENSITY_GUIDES = Object.freeze({
  soft: {
    label: "순한맛",
    rules: [
      "단호하게 진단하되 문장 끝은 부드럽게 마무리한다.",
      "팩폭 문장 뒤에는 반드시 사용자가 지킬 수 있는 방어선 한 줄을 세워준다.",
      "명령문보다 '~부터 잡아라', '~는 지켜라' 같은 지시형 권유를 쓴다.",
      "과장, 조롱, 극단적 단정은 금지한다.",
    ],
  },
  standard: {
    label: "기본맛",
    rules: [
      "군더더기 없는 직설로 쓰고, 각 단락은 결론부터 말한다.",
      "위로 문장은 최소화하고, 진단과 행동 지시의 비중을 높인다.",
      "돌려 말하지 않되 인격이 아니라 선택과 행동만 겨냥한다.",
    ],
  },
  roar: {
    label: "사자 포효맛",
    rules: [
      "서론과 예열 없이 결론부터 때린다. 각 필드의 첫 문장은 사용자가 가장 인정하기 싫어할 사실의 단정문이다.",
      "쿠션어 전면 금지: '아마', '~일 수 있다', '어쩌면', '조심스럽게', '~인 것 같다'를 쓰지 않는다. 계산 근거가 있는 판단은 전부 단정문으로 쓴다.",
      "사용자가 스스로에게 하고 있을 법한 자기합리화 문장을 한 줄 그대로 재현한 뒤, 바로 다음 문장에서 계산 근거로 깨뜨린다.",
      "위로 문장은 0개다. 공감 표현 대신 상황을 더 정확하게 명명하는 문장을 쓴다. 대안은 전부 명령문으로만 준다.",
      "문장은 짧게 끊는다. 한 문장에 하나의 사실만 담는다.",
      "팩폭 본문은 최소 4문장, 전부 직격으로 쓴다. 마지막 문장은 지금 당장 할 행동 명령이다.",
      "단, 인격·외모 비하, 욕설, 저주·협박성 표현은 금지다. 때리는 대상은 사용자의 선택과 패턴이지 사용자라는 사람이 아니다.",
    ],
  },
});

const TOPIC_METHOD_FOCUS = Object.freeze({
  "연애/재회": {
    saju: "일지(배우자궁)의 지장간과 배우자성(십성 중 재성/관성)의 강약을 먼저 판단하고, 현재 대운·올해 세운 지지가 일지와 합인지 충인지로 인연의 열림/닫힘 타이밍을 단정한다. 합충 데이터가 natalInteractions와 대운·세운 항목에 있으면 반드시 그 조합을 인용한다.",
    ziwei: "부부궁의 주성과 살성, 부부궁에 걸린 사화(특히 화기)를 먼저 읽고 명궁-부부궁 축으로 관계 태도를 진단한다. 올해 유년궁이 부부궁·명궁과 겹치거나 마주보면 그 사실로 시기를 판단한다.",
    vedic: "금성의 사인·하우스·디그니티와 7하우스(라그나 가능 시) 상태를 근거로 관계 패턴을 진단하고, 현재 마하다샤·안타르다샤 로드가 금성/7하우스와 연결되는지로 시기를 판단한다. 다샤 종료 시점을 반드시 언급한다.",
    astrology: "금성과 달의 사인·애스펙트, 7하우스를 근거로 사랑받고 싶은 방식과 실제 행동의 간극을 짚는다. 현재 트랜짓이 금성·7하우스를 건드리면 그 시기를 명시한다.",
  },
  "직업/이직": {
    saju: "월주 십성(직업 성향의 축)과 관성·식상의 균형, 신강약과 용신 방향으로 맞는 일의 방식을 단정한다. 현재 대운 십성과 올해 세운 십성이 관성/식상/재성 중 무엇인지로 이직 타이밍을 판단하고 그 간지를 인용한다.",
    ziwei: "관록궁의 주성·사화와 명궁의 관계로 일에서 힘이 나는 방식을 진단한다. 관록궁에 화기가 걸렸으면 그 별 이름을 인용해 지금 소모되는 지점을 단정한다. 삼방사정(명궁-관록-재백)의 축으로 판을 읽는다.",
    vedic: "10하우스와 그 로드, 태양·토성의 상태로 커리어 구조를 진단한다. 현재 다샤 로드가 10하우스/커리어와 연결되는지, 다샤 전환 시점이 언제인지로 이직 타이밍을 단정한다.",
    astrology: "MC/10하우스 관련 배치, 태양(방향)과 토성(구조) 애스펙트로 일의 패턴을 진단한다. 현재 트랜짓 토성·목성의 위치로 확장기인지 정비기인지 단정한다.",
  },
  "돈/재물": {
    saju: "재성의 위치·강약과 비겁의 재성 극탈 여부로 돈이 새는 구조를 단정한다. 식상생재 흐름이 있는지, 현재 대운·세운이 재성 운인지 간지로 인용해 판단한다.",
    ziwei: "재백궁의 주성·사화(화록이면 흐름, 화기면 누수)를 인용해 돈을 다루는 방식을 진단한다. 명궁-재백-관록 삼방의 연결로 버는 방식과 쓰는 방식의 불일치를 짚는다.",
    vedic: "2하우스(자산)와 11하우스(수입)의 로드·행성 배치, 목성의 상태를 근거로 재물 구조를 진단한다. 현재 다샤가 재물 하우스와 연결되는지로 시기를 판단한다.",
    astrology: "2하우스·8하우스 배치와 금성·목성 애스펙트로 소유와 소비 심리를 진단한다. 돈 문제의 뿌리가 심리 패턴(달)인지 구조(토성)인지 단정한다.",
  },
  "인간관계": {
    saju: "비겁(경쟁·동료)과 관성(위계)의 균형, 지지 합충으로 반복되는 관계 마찰 지점을 단정한다. 일지와 연·월지의 충형이 있으면 그 글자를 인용한다.",
    ziwei: "노복궁(교우궁)·형제궁과 명궁의 관계, 해당 궁의 살성으로 사람에게서 힘을 얻는지 뺏기는지 단정한다. 사화가 대인 궁에 걸렸으면 그 별을 인용한다.",
    vedic: "달(마음의 반응)과 수성(소통)의 사인·나크샤트라, 11하우스로 관계 습관을 진단한다. 라후·케투 축이 대인 하우스에 있으면 카르마적 반복으로 명명한다.",
    astrology: "달과 수성의 사인·애스펙트, 7·11하우스로 사람을 대하는 기본 회로를 진단한다. 하드 애스펙트가 있으면 그 행성 조합을 인용해 마찰 패턴을 단정한다.",
  },
  "멘탈/자기관리": {
    saju: "조후(계절 균형)와 신강약, 인성의 상태로 회복 루틴이 맞는지 단정한다. 오행 중 과다·결핍 원소를 인용해 무엇이 소모를 만드는지 짚는다.",
    ziwei: "복덕궁(멘탈·회복력)의 주성과 살성·화기를 인용해 버티는 힘의 상태를 단정한다. 명궁과 복덕궁 중 어느 쪽이 무너져 있는지 우선순위를 정해준다.",
    vedic: "달의 사인·나크샤트라·하우스로 불안이 반응하는 방식을 단정한다. 토성-달 관계가 있으면 그것으로 눌림의 구조를 설명하고, 현재 다샤가 감정에 미치는 영향을 명시한다.",
    astrology: "달의 사인·하우스·애스펙트로 감정 회로를, 해왕성·토성 관여로 회피/억압 패턴을 단정한다. 감정이 아니라 회로의 문제임을 계산값으로 보여준다.",
  },
  "인생방향": {
    saju: "일간의 본질과 용신 방향, 월령이 가리키는 계절 과제로 삶의 축을 단정한다. 대운의 큰 흐름(순행/역행과 현재 대운 십성)으로 지금이 어떤 국면인지 명시한다.",
    ziwei: "명궁 주성의 본질과 신궁의 위치(실제 행동이 쏠리는 궁)의 간극으로 방향 이탈을 진단한다. 생년 사화 네 별을 인용해 삶이 강하게 끌리는 방향을 단정한다.",
    vedic: "라그나(서는 방식)와 라후·케투 축(가야 할 방향과 익숙한 과거)으로 인생 과제를 단정한다. 현재 마하다샤의 의미와 남은 기간을 명시해 이 국면의 숙제를 정의한다.",
    astrology: "태양(방향)·상승궁(보이는 방식)·MC의 삼각으로 방향의 불일치를 진단한다. 노드 축이나 주요 하드 애스펙트를 인용해 반복 회피 주제를 단정한다.",
  },
  "지금선택": {
    saju: "올해 세운 간지와 십성을 인용해 지금이 벌릴 때인지 닫을 때인지 단정한다. 세운 지지가 원국과 만드는 합충으로 선택의 방향을 하나로 좁혀준다.",
    ziwei: "올해 유년궁의 위치와 주성·사화를 인용해 올해의 전선이 어느 궁인지 단정한다. 그 궁이 질문의 주제와 같은 방향인지로 선택을 판정한다.",
    vedic: "현재 안타르다샤 로드와 남은 기간을 인용해 이 선택의 유효 시한을 단정한다. 현재 트랜짓(고차라)에서 토성·목성의 위치로 확장/수축을 판정한다.",
    astrology: "현재 트랜짓에서 주요 행성이 네이탈의 어디를 건드리는지 인용해 지금 열린 문과 닫힌 문을 단정한다. 선택지를 계산값 기준으로 하나로 좁혀준다.",
  },
  "반복실수": {
    saju: "원국의 합충(natalInteractions)과 과다 십성을 인용해 반복 회로의 구조를 단정한다. 같은 실수가 대운·세운에서 언제 증폭됐는지 타이밍으로 보여준다.",
    ziwei: "명궁·신궁에 걸린 살성과 화기의 별을 인용해 반복 패턴의 방아쇠를 단정한다. 그 별이 어느 궁에서 작동하는지로 실수가 터지는 영역을 특정한다.",
    vedic: "달의 나크샤트라(깊은 습관)와 라후·케투 축을 인용해 반복해서 돌아가는 자리를 단정한다. 카르마적 반복이라는 명명으로 끝내지 말고 교정 행동까지 잇는다.",
    astrology: "달-화성/토성 하드 애스펙트나 반복 각도를 인용해 방아쇠-반응 회로를 단정한다. 감정(달)이 어느 지점에서 선택을 대신하는지 특정한다.",
  },
});

function topicMethodFocusFor(topic, method) {
  const topicKey = normalizeTopicKey(topic);
  const focus = topicKey ? TOPIC_METHOD_FOCUS[topicKey]?.[clean(method, 30)] : "";
  return focus || "";
}

function intensityGuideFor(intensity) {
  return INTENSITY_GUIDES[clean(intensity, 30)] || INTENSITY_GUIDES.standard;
}

// LLM이 문자열 자리에 중첩 객체/배열을 반환하면 String()이 "[object Object]"를 만들어
// 그대로 DB에 저장·노출된다. 잘 알려진 텍스트 키를 우선 꺼내 읽을 수 있는 문장으로 평탄화한다.
const COERCE_TEXT_KEYS = ["description", "text", "content", "summary", "reading", "body", "value"];

function coerceText(value, depth = 0) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (depth >= 3) return "";
  if (Array.isArray(value)) {
    return value.map((item) => coerceText(item, depth + 1).trim()).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    const title = typeof value.title === "string" ? value.title.trim() : "";
    for (const key of COERCE_TEXT_KEYS) {
      const bodyText = coerceText(value[key], depth + 1).trim();
      if (bodyText) return title && title !== bodyText ? `${title} — ${bodyText}` : bodyText;
    }
    const joined = Object.values(value)
      .map((item) => coerceText(item, depth + 1).trim())
      .filter(Boolean)
      .join("\n");
    return title && joined && joined !== title ? `${title} — ${joined}` : joined || title;
  }
  return "";
}

// 식별자·제목·enum 전용. 상한을 넘기면 글자 한복판에서 자른다 — 문장이 아니므로 그래도 된다.
function clean(value, maxLength = 0) {
  const text = coerceText(value).trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

// 상담 문장·리스트 항목 전용. 상한을 넘기면 마지막 완결 문장까지만 남긴다.
// 🔴 clean() 을 여기에 쓰면 "그는 반복되는 선택을 하"처럼 끊긴 문장이 결과에 그대로 남는다.
//    반대로 cleanProse() 를 제목·enum 에 쓰면 안 된다 — 종결부호가 없어 통째로 날아간다.
function cleanProse(value, maxLength = 0) {
  return trimToSentenceBoundary(coerceText(value).trim(), maxLength);
}

// 리스트 항목(핵심 기질·강점·약점·핵심 포인트·시기 포인트·규칙) 공통 상한.
// 챕터 minChars 1400~1800 을 description 과 나눠 지므로, 항목 하나가 여기에 닿으면
// 이미 설계보다 훨씬 길게 쓴 것이다. scripts/verify-neo-operation-room-output-safety.mjs
// 가 "이 상한으로 챕터 minChars 를 채울 수 있는가"를 실제 병합 결과로 단언한다.
const LIST_ITEM_CAP = 500;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function extractJsonObject(text) {
  const raw = clean(text);
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    const error = new Error("Neo briefing JSON was not found");
    error.code = "LLM_RESPONSE_INVALID";
    throw error;
  }
  const jsonText = raw.slice(start, end + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    // 1차 실패는 대개 문자열 안 raw 개행이다(자미두수 실측 2026-08-01). 이스케이프해 한 번 더.
    return JSON.parse(escapeRawControlCharsInJsonStrings(jsonText));
  }
}

function normalizeEvidence(input, methodSummary) {
  const method = clean(input?.selectedMethod || methodSummary?.method, 30);
  const label = METHOD_LABELS[method] || method;
  const fallback = clean(methodSummary?.evidenceSummary || methodSummary?.summary, 900);
  if (!fallback) return [];
  return [{ method, label: `${label} 근거`, summary: fallback }];
}

export function buildNeoOperationRoomInitialPrompt(input, methodSummary) {
  const selectedMethod = clean(input?.selectedMethod, 30);
  const methodLabel = METHOD_LABELS[selectedMethod] || selectedMethod;
  const writingGuide = METHOD_WRITING_GUIDES[selectedMethod] || {
    title: methodLabel,
    concept: "선택한 술수의 계산 요약을 현실 작전으로 바꾼다.",
    focus: ["계산 요약에서 확인되는 핵심 근거", "반복되는 선택", "오늘 바꿔야 할 행동"],
    tone: ["운은 핑계가 아니라 흐름을 다시 읽는 지도다."],
  };
  return [
    "너는 '네오의 팩폭 작전실'의 사자 장군 네오다.",
    "역할은 위로가 아니라 진단과 작전 재정비다.",
    "말투는 직설적이고 차갑지만, 사용자를 깎아내리거나 조롱하지 않는다.",
    "입력된 계산 요약 데이터만 근거로 삼고, 생년월일을 직접 점치는 척하거나 없는 계산값을 만들지 않는다.",
    "계산 요약 데이터에 없는 항목은 지어내지 말고, 필요하면 '현재 계산 가능한 범위에서 해석했다'고 자연스럽게 밝힌다.",
    "methodEvidence와 술수별 판단은 반드시 [계산 확정값] 안에 실제로 존재하는 항목만 근거로 삼는다.",
    "개발자식 장애 지점 표현은 쓰지 말고 '막힌 지점', '흔들리는 자리', '어긋난 흐름', '운이 새는 틈', '전선이 밀리는 곳', '반복되는 선택', '흐려진 판단', '놓친 신호', '다시 잡아야 할 기준' 같은 상담 언어를 쓴다.",
    "mock, dry-run, provider, system, prompt 같은 내부 구현 단어를 결과에 쓰지 않는다.",
    "이 기능은, 이 결과는, 분석 결과는, 리포트 항목, 콘텐츠 블록 같은 제품 설명식 문장을 쓰지 않는다.",
    "반드시 JSON 객체 하나만 반환한다. 마크다운 코드블록과 설명 문장은 금지한다.",
    "",
    "[사용자 입력]",
    JSON.stringify({
      selectedMethod,
      methodLabel,
      topic: input?.topic || "",
      intensity: input?.intensity || "",
      question: input?.question || "",
      birthTimeUnknown: input?.birthInfo?.birthTimeUnknown === true,
    }),
    "",
    "[계산 확정값]",
    JSON.stringify(methodSummary || {}),
    "",
    "[선택 술수 작성 지침]",
    JSON.stringify(writingGuide),
    "",
    "[팩폭 강도 지침]",
    JSON.stringify(intensityGuideFor(input?.intensity)),
    "",
    "[주제별 판독 지침]",
    topicMethodFocusFor(input?.topic, selectedMethod) || "선택한 주제와 직접 연결되는 계산 항목을 우선 판독하고, 주제와 무관한 일반 해석은 줄인다.",
    "",
    "[반환 JSON 스키마]",
    JSON.stringify({
      version: 1,
      documentType: "initial_briefing",
      selectedMethod,
      operationTitle: "작전명",
      neoOpening: "네오의 첫 판단",
      frontlineSummary: "현재 운명의 전선 요약",
      repeatedChoice: {
        title: "반복되는 선택 제목",
        description: "사용자가 반복하기 쉬운 선택 방식",
      },
      originalStrategy: {
        title: "본래 너는 이렇게 움직여야 한다",
        description: "타고난 구조상 힘이 나는 방식",
        keyRules: ["규칙"],
      },
      misalignedFlow: {
        title: "지금 흐름이 어긋난 자리",
        description: "현재 삶에서 어긋난 지점",
      },
      methodEvidence: [
        {
          method: selectedMethod,
          label: `${methodLabel} 근거`,
          summary: "계산 요약에서 확인되는 근거",
        },
      ],
      bluntTruth: "네오의 팩폭",
      forbiddenAction: {
        title: "오늘 금지 행동",
        reason: "왜 금지해야 하는지",
      },
      actionOrders: ["바로 해야 할 작전 1", "바로 해야 할 작전 2", "바로 해야 할 작전 3"],
      sevenDayMission: [
        { day: 1, mission: "1일차 작전" },
        { day: 2, mission: "2일차 작전" },
        { day: 3, mission: "3일차 작전" },
        { day: 4, mission: "4일차 작전" },
        { day: 5, mission: "5일차 작전" },
        { day: 6, mission: "6일차 작전" },
        { day: 7, mission: "7일차 작전" },
      ],
      thirtyDayStrategy: ["1주차 전략", "2주차 전략", "3주차 전략", "4주차 전략"],
      realityCheckQuestions: [
        {
          question: "현실 점검 질문",
          whyItMatters: "왜 중요한지",
        },
      ],
      badge: {
        name: "사자 휘장 이름",
        description: "휘장 설명",
      },
      tsundereClosing: "네오의 마지막 츤데레 한마디",
    }),
    "",
    "각 문자열은 한국어로 작성한다.",
    "결과는 네오가 사용자에게 직접 말하는 상담 문장으로 쓴다.",
    "모든 문장의 어조는 [팩폭 강도 지침]의 rules를 따른다. 순한맛과 사자 포효맛의 문장은 확연히 달라야 한다.",
    "neoOpening의 첫 두 문장 안에서 [사용자 입력]의 question 내용을 직접 짚고 시작한다. 질문과 무관한 일반론으로 시작하지 않는다.",
    "methodEvidence의 각 summary에는 [계산 확정값]에 실제로 존재하는 구체 값(간지, 일간, 십성, 궁 이름, 별 이름, 사화, 행성-사인-하우스, 나크샤트라, 다샤 이름과 기간 중 해당 술수의 것)을 최소 1개 그대로 인용한다.",
    "팩폭 본문은 정찰 보고에서 인용한 계산값과 연결해서 쓴다. 계산 근거 없이 성격 일반론만으로 팩폭하지 않는다.",
    "대운/세운/다샤/트랜짓 등 시기 데이터가 계산 요약에 있으면 frontlineSummary 또는 thirtyDayStrategy에서 그 시기를 구체적으로 언급한다.",
    "전체 흐름은 진단 → 반복 선택 → 술수 근거 → 금지 행동 → 7일 작전 → 30일 전략 순서로 자연스럽게 이어지게 한다.",
    "선택 술수 작성 지침의 '짚을 것' 중 계산 확정값에서 확인 가능한 항목을 우선 반영한다.",
    "methodEvidence는 선택한 술수의 실제 계산 요약 근거만 1~4개로 만든다.",
    "realityCheckQuestions는 2~4개로 만든다.",
    "keyRules는 3~5개로 만든다.",
    "actionOrders는 정확히 3개로 만든다.",
    "sevenDayMission은 day 1부터 7까지 반드시 7개로 만든다.",
    "thirtyDayStrategy는 4개로 만든다.",
    "tsundereClosing은 반드시 현실 점검과 2차 수정 작전 명령서로 이어지게 쓴다.",
  ].join("\n");
}

export function parseNeoOperationRoomBriefingResponse(text, input, methodSummary) {
  const parsed = extractJsonObject(text);
  const selectedMethod = clean(parsed.selectedMethod || input?.selectedMethod, 30);
  const repeatedChoice = firstObject(parsed.repeatedChoice || parsed.repeatedPattern);
  const misalignedFlow = firstObject(parsed.misalignedFlow || parsed.currentProblem);
  const frontlineSummary = clean(parsed.frontlineSummary || parsed.coreDiagnosis, 1800);
  const briefing = {
    version: 1,
    documentType: "initial_briefing",
    selectedMethod,
    operationTitle: clean(parsed.operationTitle, 120),
    neoOpening: clean(parsed.neoOpening, 700),
    frontlineSummary,
    coreDiagnosis: frontlineSummary,
    repeatedChoice: {
      title: clean(repeatedChoice.title || "반복되는 선택", 120),
      description: clean(repeatedChoice.description, 1600),
    },
    repeatedPattern: {
      title: clean(repeatedChoice.title || "반복되는 선택", 120),
      description: clean(repeatedChoice.description, 1600),
    },
    originalStrategy: {
      title: clean(firstObject(parsed.originalStrategy).title || "본래 너는 이렇게 움직여야 한다", 120),
      description: clean(firstObject(parsed.originalStrategy).description, 1800),
      keyRules: safeArray(firstObject(parsed.originalStrategy).keyRules).map((item) => clean(item, 220)).filter(Boolean).slice(0, 6),
    },
    misalignedFlow: {
      title: clean(misalignedFlow.title || "지금 흐름이 어긋난 자리", 120),
      description: clean(misalignedFlow.description, 1800),
    },
    currentProblem: {
      title: clean(misalignedFlow.title || "지금 흐름이 어긋난 자리", 120),
      description: clean(misalignedFlow.description, 1800),
    },
    methodEvidence: safeArray(parsed.methodEvidence).map((item) => ({
      method: clean(firstObject(item).method || selectedMethod, 30),
      label: clean(firstObject(item).label, 120),
      summary: clean(firstObject(item).summary, 1000),
    })).filter((item) => item.summary).slice(0, 4),
    bluntTruth: clean(parsed.bluntTruth, 1200),
    forbiddenAction: {
      title: clean(firstObject(parsed.forbiddenAction).title, 120),
      reason: clean(firstObject(parsed.forbiddenAction).reason, 900),
    },
    actionOrders: safeArray(parsed.actionOrders).map((item) => clean(item, 280)).filter(Boolean).slice(0, 3),
    sevenDayMission: safeArray(parsed.sevenDayMission).map((item, index) => ({
      day: Number(firstObject(item).day) || index + 1,
      mission: clean(firstObject(item).mission, 320),
    })).filter((item) => item.mission).slice(0, 7),
    thirtyDayStrategy: safeArray(parsed.thirtyDayStrategy).map((item) => clean(item, 340)).filter(Boolean).slice(0, 4),
    realityCheckQuestions: safeArray(parsed.realityCheckQuestions).map((item) => ({
      question: clean(firstObject(item).question, 260),
      whyItMatters: clean(firstObject(item).whyItMatters, 700),
    })).filter((item) => item.question).slice(0, 5),
    badge: {
      name: clean(firstObject(parsed.badge).name, 80),
      description: clean(firstObject(parsed.badge).description, 700),
    },
    tsundereClosing: clean(parsed.tsundereClosing || parsed.nextStepPrompt, 700),
    nextStepPrompt: clean(parsed.nextStepPrompt || parsed.tsundereClosing, 700),
  };
  if (!briefing.methodEvidence.length) briefing.methodEvidence = normalizeEvidence(input, methodSummary);
  if (
    !briefing.operationTitle
    || !briefing.frontlineSummary
    || !briefing.bluntTruth
    || !briefing.forbiddenAction.title
    || briefing.actionOrders.length < 3
    || briefing.sevenDayMission.length < 7
    || !briefing.badge.name
    || !briefing.tsundereClosing
    || !briefing.realityCheckQuestions.length
  ) {
    const error = new Error("Neo briefing response is incomplete");
    error.code = "LLM_RESPONSE_INVALID";
    throw error;
  }
  return briefing;
}

/**
 * 2차 프롬프트에 실을 1차 브리핑 요약.
 *
 * 🔴 전문(JSON.stringify)을 그대로 실으면 안 된다. 1차는 20,050자 계약이고 2차는 8챕터를 각각
 * 부르므로 같은 20,050자가 8번 실려 입력이 부풀고, 그만큼 응답 지연·잘림·비용이 함께 올라간다.
 * 무엇보다 프롬프트 끝의 [사용자 현실 점검 답변]이 그 더미에 묻힌다 — 2차의 존재 이유가 그 답변인데.
 *
 * 여기 담는 것은 2차가 "고쳐 쓸 대상"인 진단뿐이다. 이미 준 조언은 buildPreviousAdviceLog 가
 * 반복 금지 목록으로 따로 싣고, 계산 근거는 [계산 요약 데이터]가 공통 라인으로 이미 싣는다.
 */
function summarizeInitialBriefingForRefine(initialBriefing) {
  const briefing = firstObject(initialBriefing);
  const repeated = firstObject(briefing.repeatedPattern);
  const problem = firstObject(briefing.currentProblem);
  return {
    operationTitle: clean(briefing.operationTitle, 120),
    coreDiagnosis: clean(briefing.coreDiagnosis, 900),
    bluntTruth: clean(briefing.bluntTruth, 900),
    originalStrategy: clean(firstObject(briefing.originalStrategy).description, 700),
    repeatedPattern: { title: clean(repeated.title, 120), description: clean(repeated.description, 700) },
    currentProblem: { title: clean(problem.title, 120), description: clean(problem.description, 700) },
  };
}

export function buildPreviousAdviceLog(initialBriefing) {
  const briefing = firstObject(initialBriefing);
  const items = [];
  const push = (prefix, value) => {
    const text = clean(value, 120);
    if (text) items.push(`- [${prefix}] ${text}`);
  };
  safeArray(briefing.actionOrders).forEach((item) => push("바로 작전", item));
  safeArray(briefing.sevenDayMission).forEach((item) => push("7일 미션", firstObject(item).mission));
  safeArray(briefing.thirtyDayStrategy).forEach((item) => push("30일 전략", item));
  safeArray(firstObject(briefing.originalStrategy).keyRules).forEach((item) => push("본래 전략", item));
  push("금지 행동", firstObject(briefing.forbiddenAction).title);
  return items.slice(0, 20).join("\n");
}

export function buildNeoOperationRoomRefinedPrompt(consultation, realityCheck, previousAdviceLog = "") {
  const selectedMethod = clean(consultation?.selectedMethod || consultation?.initialBriefing?.selectedMethod, 30);
  const methodLabel = METHOD_LABELS[selectedMethod] || selectedMethod;
  const writingGuide = METHOD_WRITING_GUIDES[selectedMethod] || {
    title: methodLabel,
    concept: "선택한 술수의 계산 요약과 사용자 현실 답변을 다시 맞춰 본다.",
    focus: ["사용자 답변에서 실제로 흔들린 자리", "버려야 할 선택 방식", "7일 안에 바꿀 행동"],
    tone: ["이제 같은 흐름을 다른 방식으로 다룰 때다."],
  };
  const topicLabel = clean(consultation?.topic, 120) || "선택 주제";
  return [
    "너는 '네오의 팩폭 작전실'의 사자 장군 네오다.",
    "지금은 1차 작전 브리핑 이후, 사용자의 현실 점검 답변을 반영해 2차 수정 작전 명령서를 작성한다.",
    "지금은 위로가 아니라 확신 있는 판단자로서, 사용자의 현재 방향이 맞는지부터 단정한다. 애매하게 얼버무리지 않는다.",
    "v2는 v1의 반복이 아니다. 사용자가 인정한 부분, 반박한 부분, 더 중요하다고 밝힌 현실 문제를 반드시 반영해 진단을 보정한다.",
    "말투는 직설적이고 차갑지만 사용자를 비난하거나 조롱하지 않는다.",
    "계산 근거는 이미 저장된 methodSummary와 initialBriefing 안에서만 사용한다. 없는 계산값을 새로 만들지 않는다.",
    "계산 요약 데이터에 없는 항목은 지어내지 말고, 필요하면 '현재 계산 가능한 범위에서 해석했다'고 자연스럽게 밝힌다.",
    "'케이스마다 다르다', '노력하면 좋아진다' 같은 회피성·추상적 답변을 금지한다. 모든 대안에는 시기와 구체 행동과 근거가 붙어야 한다.",
    "사용자가 고른 체크 항목이나 자유 입력 중 최소 하나는 neoReview의 첫 문단에서 직접 짚고 지나간다.",
    `모든 판정과 대안은 '${topicLabel}' 주제에 밀착시킨다. 주제와 무관한 일반론으로 새지 않는다.`,
    "개발자식 장애 지점 표현은 쓰지 말고 '막힌 지점', '흔들리는 자리', '어긋난 흐름', '운이 새는 틈', '전선이 밀리는 곳', '반복되는 선택', '흐려진 판단', '놓친 신호', '다시 잡아야 할 기준' 같은 상담 언어를 쓴다.",
    "mock, dry-run, provider, system, prompt 같은 내부 구현 단어를 결과에 쓰지 않는다.",
    "이 기능은, 이 결과는, 분석 결과는, 리포트 항목, 콘텐츠 블록 같은 제품 설명식 문장을 쓰지 않는다.",
    "반드시 JSON 객체 하나만 반환한다. 마크다운 코드블록과 설명 문장은 금지한다.",
    "",
    "[상담 맥락]",
    JSON.stringify({
      selectedMethod,
      methodLabel,
      topic: consultation?.topic || "",
      intensity: consultation?.intensity || "",
      originalQuestion: consultation?.question || "",
    }),
    "",
    "[1차 작전 브리핑]",
    JSON.stringify(consultation?.initialBriefing || {}),
    "",
    "[이미 제시한 조언 (반복 금지)]",
    clean(previousAdviceLog) || "(없음)",
    "이 목록에 있는 조언·행동·표현은 그대로 다시 쓰지 않는다. 주제가 겹치면 반드시 다른 각도로 새로 만든다.",
    "",
    "[계산 확정값]",
    JSON.stringify(consultation?.methodSummary || {}),
    "",
    "[선택 술수 작성 지침]",
    JSON.stringify(writingGuide),
    "",
    "[팩폭 강도 지침]",
    JSON.stringify(intensityGuideFor(consultation?.intensity)),
    "",
    "[주제별 판독 지침]",
    topicMethodFocusFor(consultation?.topic, selectedMethod) || "선택한 주제와 직접 연결되는 계산 항목을 우선 판독하고, 주제와 무관한 일반 해석은 줄인다.",
    "",
    "[사용자 현실 점검 답변]",
    JSON.stringify({
      selectedChecks: safeArray(realityCheck?.selectedChecks),
      freeform: realityCheck?.freeform || "",
    }),
    "",
    "[반환 JSON 스키마]",
    JSON.stringify({
      version: 2,
      documentType: "refined_order",
      selectedMethod,
      operationTitle: "수정 작전명",
      neoReview: "네오의 재판단(사용자 현실 점검 답변을 직접 반영해 시작)",
      verdict: {
        status: "잘하고 있다 | 조정이 필요하다 | 방향은 맞지만 부족하다 중 하나",
        statement: "현재 방향에 대한 단정(1~2문장)",
      },
      verdictBasis: "판정 근거(계산 요약의 구체 값 최소 1개 인용, 1~2문장)",
      actionAlternatives: [
        {
          timing: "언제부터 언제까지(구체 시기)",
          action: "무엇을 어떻게(구체 행동)",
          rationale: "왜 지금 이 행동이 흐름에 맞는지(계산 근거 연결)",
        },
      ],
      peopleToMeet: [
        {
          role: "만나야 할 사람의 역할/직업/경험",
          complementaryEnergy: "사용자에게 부족한 기운을 어떻게 보완하는지",
          whereToFind: "어디서 만날 가능성이 높은지(커뮤니티/모임/소개 경로)",
        },
      ],
      forbiddenAction: {
        title: "오늘 금지 행동",
        reason: "금지 이유",
      },
      thisWeekFirstStep: "이번 주 안에 실행 가능한 가장 작은 첫 걸음 하나",
      badge: {
        name: "휘장 이름",
        description: "휘장 설명",
      },
      tsundereClosing: "네오의 마지막 한마디",
    }),
    "",
    "verdict.status는 반드시 '잘하고 있다', '조정이 필요하다', '방향은 맞지만 부족하다' 중 하나로만 쓴다. 애매한 표현 금지.",
    "verdictBasis에는 [계산 확정값]의 구체 값(오행/십성/대운·세운/궁/별/사화/행성-사인-하우스/나크샤트라/다샤 중 해당 술수의 것)을 최소 1개 그대로 인용한다.",
    "actionAlternatives는 3~5개로 만들고, 각 항목에 timing/action/rationale 셋을 모두 채운다. [이미 제시한 조언]과 겹치지 않게 새로 만든다.",
    "peopleToMeet은 2~3개로 만들고, 각 항목에 role/complementaryEnergy/whereToFind 셋을 모두 채운다. '좋은 사람을 만나라' 같은 막연한 표현 금지.",
    "thisWeekFirstStep은 이번 주 안에 실행 가능한 가장 작은 한 걸음 하나만 쓴다. 거창한 계획 금지.",
    "badge.name은 오늘의 사자 휘장 이름처럼 짧고 상징적으로 쓴다.",
    "결과는 네오가 사용자에게 직접 말하는 상담 문장으로 쓴다.",
    "모든 문장의 어조는 [팩폭 강도 지침]의 rules를 따른다.",
    "neoReview에는 사용자의 체크 답변 또는 자유 입력 중 최소 하나를 직접 반영해 재판단을 시작한다.",
    "현실 점검 답변이 1차 질문과 본질적으로 같은 맥락이면 neoReview에서 '이전과 같은 맥락이네요'라고 짚고, 이전과 다른 영역(시간/관계/재정/커리어/건강 등)으로 확장해 답한다.",
  ].join("\n");
}

const VERDICT_STATUS_VALUES = Object.freeze(["잘하고 있다", "조정이 필요하다", "방향은 맞지만 부족하다"]);

function normalizeVerdictStatus(value) {
  const text = clean(value, 60).replace(/\s+/g, "");
  if (!text) return "";
  if (/잘하고있|맞다$|맞게/.test(text) && !/부족|아니|조정/.test(text)) return "잘하고 있다";
  if (/아니|조정필요|바꿔야|틀렸|재정비/.test(text)) return "조정이 필요하다";
  if (/부족|보완|맞지만|덜/.test(text)) return "방향은 맞지만 부족하다";
  const exact = VERDICT_STATUS_VALUES.find((status) => text === status.replace(/\s+/g, ""));
  return exact || "";
}

export function parseNeoOperationRoomRefinedResponse(text, consultation) {
  const parsed = extractJsonObject(text);
  const selectedMethod = clean(parsed.selectedMethod || consultation?.selectedMethod, 30);
  const verdict = firstObject(parsed.verdict);
  const refined = {
    version: 2,
    documentType: "refined_order",
    selectedMethod,
    operationTitle: clean(parsed.operationTitle, 120),
    neoReview: clean(parsed.neoReview, 1400),
    verdict: {
      status: normalizeVerdictStatus(verdict.status) || "방향은 맞지만 부족하다",
      statement: clean(verdict.statement, 900),
    },
    verdictBasis: clean(parsed.verdictBasis, 1200),
    actionAlternatives: safeArray(parsed.actionAlternatives).map((item) => ({
      timing: clean(firstObject(item).timing, 160),
      action: clean(firstObject(item).action, 400),
      rationale: clean(firstObject(item).rationale, 500),
    })).filter((item) => item.action).slice(0, 5),
    peopleToMeet: safeArray(parsed.peopleToMeet).map((item) => ({
      role: clean(firstObject(item).role, 200),
      complementaryEnergy: clean(firstObject(item).complementaryEnergy, 400),
      whereToFind: clean(firstObject(item).whereToFind, 400),
    })).filter((item) => item.role).slice(0, 4),
    forbiddenAction: {
      title: clean(firstObject(parsed.forbiddenAction).title, 120),
      reason: clean(firstObject(parsed.forbiddenAction).reason, 900),
    },
    thisWeekFirstStep: clean(parsed.thisWeekFirstStep, 400),
    badge: {
      name: clean(firstObject(parsed.badge).name, 80),
      description: clean(firstObject(parsed.badge).description, 700),
    },
    tsundereClosing: clean(parsed.tsundereClosing, 700),
  };
  if (
    !refined.operationTitle
    || !refined.neoReview
    || !refined.verdict.statement
    || !refined.verdictBasis
    || refined.actionAlternatives.length < 3
    || refined.peopleToMeet.length < 2
    || !refined.thisWeekFirstStep
    || !refined.forbiddenAction.title
    || !refined.badge.name
    || !refined.tsundereClosing
  ) {
    const error = new Error("Neo refined order response is incomplete");
    error.code = "LLM_RESPONSE_INVALID";
    throw error;
  }
  return refined;
}

// ═══════════════════════════════════════════════════════════════════════════
//  챕터(섹션) 배치 생성 — 네오 팩폭 작전실 다챕터 리포트
//  ziwei-deep-report 패턴 이식: 챕터마다 개별 Gemini 호출 + minChars 하한.
//  각 빌더는 JSON 하나만 반환하는 프롬프트를 만들고, merge* 가 챕터 JSON들을
//  프론트가 렌더하는 briefing/refined 객체로 합친다.
// ═══════════════════════════════════════════════════════════════════════════

const NEO_EXPERT_PERSONA = Object.freeze({
  saju: "너는 30년 경력의 사주명리학 대가이자 '네오의 팩폭 작전실'의 사자 장군 네오다.",
  ziwei: "너는 30년 경력의 자미두수 명반 대가이자 '네오의 팩폭 작전실'의 사자 장군 네오다.",
  vedic: "너는 30년 경력의 베다 점성학(조티시) 대가이자 '네오의 팩폭 작전실'의 사자 장군 네오다.",
  astrology: "너는 30년 경력의 서양 점성학 대가이자 '네오의 팩폭 작전실'의 사자 장군 네오다.",
});

const NEO_DOMAIN_COVERAGE = Object.freeze({
  saju: "일간과 신강약, 용신·희기신, 십성 구조, 조후, 격국, 대운·세운·월운 흐름, 오행 균형 중 [계산 확정값]에 실재하는 항목을 최대한 전문가답게 풀어 근거로 삼는다.",
  ziwei: "명궁·신궁, 14주성과 별 세기(묘·왕·득·리·평·함), 생년 사화, 삼방사정, 12궁 세력, 유년 중 [계산 확정값]에 실재하는 항목을 최대한 전문가답게 풀어 근거로 삼는다.",
  vedic: "라그나, 달·나크샤트라, 행성 디그니티, 주요 하우스, 다샤·안타르다샤, 요가, 고차라 중 [계산 확정값]에 실재하는 항목을 최대한 전문가답게 풀어 근거로 삼는다.",
  astrology: "태양·달·상승, 행성 사인, 하우스, 주요 애스펙트, 현재 트랜짓 중 [계산 확정값]에 실재하는 항목을 최대한 전문가답게 풀어 근거로 삼는다.",
});

const NEO_COMMON_RULES = Object.freeze([
  "역할은 위로가 아니라 진단과 작전 재정비다. 말투는 직설적이고 차갑지만 사용자를 깎아내리거나 조롱하지 않는다.",
  "입력된 계산 확정값만 근거로 삼고, 생년월일을 직접 점치는 척하거나 없는 계산값을 만들지 않는다. 없는 항목은 지어내지 말고 '현재 계산 가능한 범위에서 해석했다'고 자연스럽게 밝힌다.",
  "개발자식 장애 지점 표현은 쓰지 말고 '막힌 지점', '흔들리는 자리', '어긋난 흐름', '운이 새는 틈', '전선이 밀리는 곳', '반복되는 선택', '흐려진 판단', '놓친 신호', '다시 잡아야 할 기준' 같은 상담 언어를 쓴다.",
  "mock, dry-run, provider, system, prompt 같은 내부 구현 단어를 결과에 쓰지 않는다.",
  "이 기능은, 이 결과는, 분석 결과는, 리포트 항목, 콘텐츠 블록 같은 제품 설명식 문장을 쓰지 않는다.",
  // 유료 상담 공통 출력 계약(worker/lib/fortune-reasoning-contract.js). 어조는 아래
  // [팩폭 강도 지침]이 그대로 결정하고, 이 세 줄은 "무엇을 근거로 어떤 확신으로 말하는가"만 정한다.
  ...REASONING_OUTPUT_RULE_LINES,
  // 🔴 [계산 확정값] 은 한글 라벨 표다. 예전에는 계산 객체를 JSON 으로 통째로 실어서 이 지시가
  //    "camelCase 키를 인용하라"는 뜻이 돼 버렸고, 실제로 상담문에
  //    "sanFangSiZheng.lifePalace.mainStars" 가 노출됐다.
  "해석 문단마다 [계산 확정값]에 실제로 있는 항목명을 최소 1개, 표에 적힌 이름 그대로 인용한다. 표에 없는 항목명은 만들지 않는다.",
  "영문 필드명이나 점으로 이어진 식별자는 어떤 경우에도 결과에 쓰지 않는다. 항목은 표에 적힌 한글 이름으로만 부른다.",
  "반드시 JSON 객체 하나만 반환한다. 마크다운 코드블록과 설명 문장은 금지한다.",
]);

// 술수 계산 요약에서 자미두수일 때 별 세기 지시를 덧붙인다.
function starStrengthRuleFor(method) {
  return method === "ziwei" ? clean(METHOD_WRITING_GUIDES.ziwei?.starStrengthRule) : "";
}

// 자미두수일 때만 "성향을 먼저 종합하라"는 공유 지침을 덧붙인다. 다른 3개 술수(사주·베다·점성술)
// 프롬프트는 이 함수를 거치지 않으므로 그대로 유지된다.
function ziweiPersonalityContextLinesFor(method, methodSummary) {
  return method === "ziwei" ? buildZiweiPersonalityContextLines(methodSummary) : [];
}

// 궁합 모드일 때만 붙는 공통 지침. 챕터 4개만 갈아 끼우지만 나머지 10개도 상대가 있다는 것을
// 알아야 한다 — 모르면 "너는 혼자다" 같은 1인 전제 문장이 그대로 나온다.
// 🔴 여기 문장은 전부 한국어여야 한다. 서술 지시부에 camelCase 가 섞이면 모델이 본문에 인용하고,
//    verify:neo-operation-room-output-safety 의 식별자 누출 검사가 실패한다.
function compatGuideLines(ctx) {
  const compat = ctx?.methodSummary?.compat;
  if (!compat) return [];
  const statusLabel = clean(compat.relationshipStatusLabel, 40);
  const statusFocus = clean(neoRelationshipStatusFocus(ctx.relationshipStatus), 400);
  return [
    "",
    "[궁합 모드 — 두 사람을 함께 본다]",
    "이 상담에는 상대의 명반이 함께 계산돼 있다. 상대가 없는 것처럼 쓰지 않는다.",
    ...(statusLabel ? [`두 사람의 관계 상태: ${statusLabel}`] : []),
    ...(statusFocus ? [statusFocus] : []),
    "🔴 상대의 현재 속마음·행동을 사실로 단정하지 않는다. '명반상 이런 관계 패턴이 나타날 가능성이 있다'로 쓴다.",
    "🔴 확정적 예언을 하지 않는다 — 반드시 결혼한다 / 반드시 헤어진다 / 상대가 반드시 연락한다 같은 문장을 쓰지 않는다.",
    "🔴 행동 패턴을 비판하되 사람 자체를 공격하지 않는다. 상대에게 인격 낙인을 찍는 표현을 쓰지 않는다.",
    "🔴 점술을 근거로 외도·범죄 등 특정 행위를 단정하지 않는다.",
    "이 상담의 주인은 어디까지나 이 사용자다. 상대의 1인 상담을 대신 써 주지 않는다.",
    ...(compat.uncertainty?.partnerBirthTimeUnknown
      ? ["상대의 출생시간이 미상이라 정오 기준으로 계산했다. 상대 쪽 궁위 판정은 단정하지 말고 여지를 남겨 쓴다."]
      : []),
  ];
}

// 챕터 프롬프트 공통 컨텍스트 라인(1차/2차 공유).
function neoSectionCommonLines(section, ctx) {
  const method = clean(ctx.selectedMethod, 30);
  const methodLabel = METHOD_LABELS[method] || method;
  const writingGuide = METHOD_WRITING_GUIDES[method] || {
    title: methodLabel,
    concept: "선택한 술수의 계산 요약을 현실 작전으로 바꾼다.",
    focus: ["계산 요약에서 확인되는 핵심 근거", "반복되는 선택", "오늘 바꿔야 할 행동"],
    tone: ["운은 핑계가 아니라 흐름을 다시 읽는 지도다."],
  };
  const persona = NEO_EXPERT_PERSONA[method] || "너는 '네오의 팩폭 작전실'의 사자 장군 네오다.";
  const coverage = NEO_DOMAIN_COVERAGE[method] || "[계산 확정값]에 실재하는 항목만 근거로 삼는다.";
  const starRule = starStrengthRuleFor(method);
  return [
    persona,
    `너는 지금 '${methodLabel}' 전문가로서, 아래 [이번 챕터]만 집중해 깊이 있게 작성한다.`,
    coverage,
    ...(starRule ? [starRule] : []),
    ...NEO_COMMON_RULES,
    "",
    "[선택 술수 작성 지침]",
    ...guideLines(writingGuide),
    "",
    "[팩폭 강도 지침]",
    ...guideLines(intensityGuideFor(ctx.intensity)),
    "",
    "[주제별 판독 지침]",
    topicMethodFocusFor(ctx.topic, method) || "선택한 주제와 직접 연결되는 계산 항목을 우선 판독하고, 주제와 무관한 일반 해석은 줄인다.",
    ...compatGuideLines(ctx),
    "",
    ...neoBasisLines(section, ctx),
    ...otherChapterScopeLines(section),
    ...ziweiPersonalityContextLinesFor(method, ctx.methodSummary),
  ];
}

// 지침 객체를 한글 라벨 줄로 편다. JSON 으로 실으면 starStrengthRule 같은 키가 프롬프트에
// 그대로 들어가고, 모델이 그걸 본문에 인용한다.
const GUIDE_LABELS = Object.freeze({
  title: "제목",
  concept: "관점",
  focus: "짚을 것",
  tone: "말투 예시",
  starStrengthRule: "별 세기 규칙",
  label: "강도",
  rules: "규칙",
  opening: "도입",
});

function guideLines(guide) {
  const source = firstObject(guide);
  return Object.entries(source)
    .map(([key, value]) => {
      const text = Array.isArray(value) ? value.map((item) => clean(item)).filter(Boolean).join(" / ") : clean(value);
      if (!text) return "";
      // 라벨이 없는 키는 이름을 버리고 값만 싣는다 — 새 키가 생겨도 영문이 새지 않는다.
      return GUIDE_LABELS[key] ? `- ${GUIDE_LABELS[key]}: ${text}` : `- ${text}`;
    })
    .filter(Boolean);
}

// 이 챕터가 볼 계산 확정값만 골라 한글 라벨 표로 싣는다.
// 🔴 JSON.stringify(methodSummary) 를 여기에 되살리지 말 것 — 그게 내부 키 누출의 원인이었고,
//    14개 챕터가 같은 덤프를 봐서 같은 표를 각자 다시 푸는 중복의 원인이기도 했다.
function neoBasisLines(section, ctx) {
  const payload = sliceNeoBasisPayload(buildNeoBasisPayload(ctx.methodSummary), section.basisGroups ?? "*");
  const factLines = buildBasisFactLines(payload);
  if (!factLines.length) {
    // 어댑터가 못 알아본 술수·빈 계산 결과 — 이미 한국어인 서술형 요약으로 폴백한다.
    const fallback = clean(ctx.methodSummary?.evidenceSummary || ctx.methodSummary?.summary);
    return fallback ? ["[계산 확정값]", fallback] : ["[계산 확정값]", "(이번 요청에서 계산된 값이 없다)"];
  }
  const labels = collectBasisLabels(payload);
  return [
    "[계산 확정값]",
    "아래 값은 서버가 계산한 확정값이다. 본문은 이 값과 어긋나면 안 되고, 표에 없는 수치는 새로 만들지 않는다.",
    ...factLines,
    ...(labels.length ? ["", `[인용 가능한 항목명] ${labels.join(", ")}`] : []),
  ];
}

// 다른 챕터가 맡는 범위를 레지스트리에서 파생해 알려준다(손으로 쓴 목록이 아니다).
// 🔴 section.id 를 쓰지 말 것 — camelCase 가 프롬프트에 들어가면 모델이 그대로 에코한다. title 만 쓴다.
function otherChapterScopeLines(section) {
  const registry = [NEO_INITIAL_SECTIONS, ...Object.values(NEO_COMPAT_SECTIONS_BY_METHOD), NEO_REFINED_SECTIONS]
    .find((entries) => entries.some((entry) => entry.id === section.id)) || NEO_REFINED_SECTIONS;
  const others = registry.filter((entry) => entry.id !== section.id).map((entry) => entry.title);
  if (!others.length) return [];
  return [
    "",
    "[다른 챕터가 맡는 범위 — 여기서 펼치지 말 것]",
    others.join(" / "),
    "위 주제가 필요하면 한 줄로만 스치고 넘어간다. 이 챕터에서 다시 풀지 않는다.",
  ];
}

// 챕터 공통 마무리(분량·JSON 지시).
function neoSectionClosingLines(section) {
  return [
    "",
    "[이번 챕터]",
    `제목: ${section.title}`,
    `범위: ${section.scope}`,
    "",
    "[반환 JSON 스키마]",
    JSON.stringify(section.schema),
    "",
    ...safeArray(section.rules),
    `분량: 이 챕터의 모든 텍스트 값 합계가 공백 포함 최소 ${section.minChars}자 이상이 되도록 충분히 전개한다. 얕게 끝내지 말고 근거→해석→구체적 장면→실행 조언 순으로 두텁게 쓴다.`,
    "각 문자열은 한국어로, 네오가 사용자에게 직접 말하는 상담 문장으로 쓴다. 모든 문장의 어조는 [팩폭 강도 지침]의 rules를 따른다.",
    "반드시 위 [반환 JSON 스키마]의 키만 가진 JSON 객체 하나만 반환한다.",
  ];
}

// ─── 1차(초기 브리핑) 챕터 레지스트리 ──────────────────────────────────────
// counts: 리스트 필드가 최소 몇 개인지. rules 산문("정확히 3개", "3~5개")에만 있으면 기계가
// 못 읽어서 "상한 × 개수가 minChars 를 지탱하는가"를 검사할 수 없다. schema 의 배열 리프와
// 1:1 로 맞아야 하며, 어긋나면 verify-neo-operation-room-output-safety.mjs 가 실패시킨다.
export const NEO_INITIAL_SECTIONS = Object.freeze([
  {
    id: "opening",
    basisGroups: ["core", "timing"],
    title: "작전 개시 — 네오의 첫 진단",
    minChars: 1150,
    scope: "사용자의 질문을 첫 두 문장에서 직접 짚고, 현재 운명의 전선(핵심 국면)을 단정한다.",
    schema: { operationTitle: "작전명", neoOpening: "네오의 첫 판단(질문 직격)", frontlineSummary: "현재 운명의 전선 요약" },
    rules: [
      "neoOpening의 첫 두 문장 안에서 [상담 맥락]의 question을 직접 짚고 시작한다. 질문과 무관한 일반론으로 시작하지 않는다.",
      "대운/세운/다샤/트랜짓 등 시기 데이터가 계산 요약에 있으면 frontlineSummary에서 그 시기를 구체적으로 언급한다.",
    ],
  },
  {
    id: "innateCore",
    basisGroups: ["core"],
    title: "병력 판독 Ⅰ — 타고난 성향의 핵",
    minChars: 1650,
    scope: "타고난 구조상 이 사람의 자아·중심·기본 동기가 무엇인지 전문가답게 깊이 진단한다. 신뢰를 쌓는 챕터다.",
    schema: { innateNature: { title: "타고난 성향의 핵", description: "중심 구조·자아·기본 동기 심층 해석", keyTraits: ["핵심 기질1", "핵심 기질2", "핵심 기질3"] } },
    counts: { "innateNature.keyTraits": 3 },
    rules: [
      "[계산 확정값]의 중심 지표(사주=일간, 자미두수=명궁 주성, 베다=라그나/달, 점성술=태양/달/상승)를 반드시 인용해 근거를 남긴다.",
      "자미두수라면 명궁 주성의 별 세기(◎묘·O득·△평·X함)를 명시해 강약을 판단한다.",
      "keyTraits는 3~5개, 각 항목은 계산 근거와 연결된 짧은 문장으로 쓴다.",
    ],
  },
  {
    id: "innateStrength",
    basisGroups: ["core", "strength"],
    title: "병력 판독 Ⅱ — 타고난 강점과 약점",
    minChars: 1550,
    scope: "타고난 구조에서 강한 기운과 약한 기운을 나눠, 어디를 밀고 어디를 지켜야 하는지 판단한다.",
    schema: { innateStrength: { title: "타고난 강점과 약점", description: "강한 기운/약한 기운 심층 해석", strongPoints: ["강점1", "강점2"], weakPoints: ["약점1", "약점2"] } },
    counts: { "innateStrength.strongPoints": 2, "innateStrength.weakPoints": 2 },
    rules: [
      "자미두수라면 강한 궁(◎·O에 앉은 주성)과 약한 궁(X 함)을 구체적으로 대비해 밀 자리/지킬 자리를 나눈다.",
      "사주라면 오행 과다·결핍과 십성 강약으로, 베다·점성술이라면 디그니티/애스펙트로 강약을 판단한다.",
      "strongPoints·weakPoints는 각 2~4개.",
    ],
  },
  {
    id: "topicStyle",
    basisGroups: ["core", "topic"],
    title: "주제 맞춤 판독 — 이 영역에서 너의 방식",
    minChars: 1800,
    scope: "[상담 맥락]의 topic 주제에서 이 사람의 타고난 방식·성향을 술수 근거로 진단한다. 예: 돈이면 돈을 버는 방식, 연애면 연애 성향, 직업이면 일하는 방식, 인간관계면 사람을 대하는 방식.",
    schema: { topicStyle: { title: "이 주제에서 너의 방식", description: "주제에 대한 타고난 성향·방식 심층 해석", keyPoints: ["핵심1", "핵심2", "핵심3"] } },
    counts: { "topicStyle.keyPoints": 3 },
    rules: [
      "반드시 [상담 맥락]의 topic에 밀착한다. 주제와 무관한 일반론으로 새지 않는다.",
      "[주제별 판독 지침]에 제시된 술수별 판독 포인트를 근거로 삼는다.",
      "자미두수라면 주제 관련 궁의 주성과 별 세기(◎묘·X함)를, 사주라면 관련 십성·자리를 인용한다.",
      "keyPoints는 3~5개.",
    ],
  },
  {
    id: "topicAreaBreakdown",
    basisGroups: ["topic", "strength"],
    title: "주제 영역별 심층 — 자리마다 다른 결",
    minChars: 2000,
    scope: "[상담 맥락]의 topic과 직접 연결되는 각 영역을 하나씩 나눠 분석한다. 자미두수=관련 궁들(예: 돈이면 재백궁·관록궁·전택궁), 사주=관련 십성/자리, 베다·점성술=관련 하우스/행성. 각 자리가 이 주제에 대해 어떻게 말하는지 전문가답게 풀어낸다.",
    schema: { topicAreas: [{ area: "영역(궁/자리/하우스) 이름", reading: "그 영역이 이 주제에 대해 말하는 것(구체 계산 근거 포함)" }] },
    counts: { topicAreas: 3 },
    rules: [
      "topicAreas는 3~5개. 각 area는 [계산 확정값]에 실재하는 궁/자리/하우스 이름으로 쓴다.",
      "각 reading에 계산 근거(궁 주성·별 세기·사화·십성·행성-사인-하우스 등)를 최소 1개 인용한다. 없는 값은 지어내지 않는다.",
      "예: 돈 주제·자미두수면 재백궁(주성·세기), 관록궁(버는 통로), 전택궁(모이는 자리)을 각각 분석한다.",
    ],
  },
  {
    id: "topicTiming",
    basisGroups: ["timing"],
    title: "주제 시기 흐름 — 언제 열리고 닫히는가",
    minChars: 1400,
    scope: "[상담 맥락]의 topic에 대해 대운/세운/유년/다샤/트랜짓 등 시기 데이터로 언제가 열리고 닫히는지 판단한다.",
    schema: { topicTiming: { title: "이 주제의 시기 흐름", description: "주제 관련 시기 해석", windows: ["열리는/닫히는 시기 포인트1", "포인트2"] } },
    counts: { "topicTiming.windows": 1 },
    rules: [
      "계산 요약에 시기 데이터(대운·세운·유년·다샤·트랜짓)가 있으면 그 시기를 구체적으로 명시한다.",
      "시기 데이터가 없으면 '현재 계산 가능한 범위'임을 밝히고 무리하게 시기를 만들지 않는다.",
      "windows는 1~4개.",
    ],
  },
  {
    id: "originalStrategy",
    basisGroups: ["core", "strength"],
    title: "본래 무기 체계 — 이렇게 움직여야 한다",
    minChars: 1400,
    scope: "타고난 구조상 이 사람이 힘이 나는 본래의 방식과, 지켜야 할 핵심 규칙을 제시한다.",
    schema: { originalStrategy: { title: "본래 너는 이렇게 움직여야 한다", description: "타고난 구조상 힘이 나는 방식", keyRules: ["규칙1", "규칙2", "규칙3"] } },
    counts: { "originalStrategy.keyRules": 3 },
    rules: ["keyRules는 3~5개로, 계산 근거와 연결된 실행 규칙으로 쓴다."],
  },
  {
    id: "repeatedChoice",
    basisGroups: ["core", "strength"],
    title: "반복되는 패전 — 되풀이하는 선택",
    minChars: 1300,
    scope: "사용자가 반복하기 쉬운 선택 방식과 그 뿌리를 계산 근거로 짚는다.",
    schema: { repeatedChoice: { title: "반복되는 선택", description: "사용자가 반복하기 쉬운 선택 방식과 그 뿌리" } },
    rules: ["반복 패턴의 방아쇠를 계산값(사주 합충/자미 살성·화기/베다 라후·케투/점성 하드 애스펙트 등)으로 특정한다."],
  },
  {
    id: "misalignedFlow",
    basisGroups: ["core", "strength"],
    title: "어긋난 전선 — 지금 흐름이 밀리는 자리",
    minChars: 1300,
    scope: "타고난 방식과 현재 삶이 어긋난 지점을 진단한다.",
    schema: { misalignedFlow: { title: "지금 흐름이 어긋난 자리", description: "본래 방식과 현재 삶의 간극" } },
    rules: ["본래 무기 체계와 현재 반복 선택의 간극을 대비해 어긋난 자리를 단정한다."],
  },
  {
    id: "methodEvidence",
    basisGroups: "*",
    title: "정찰 보고 — 술수 근거",
    minChars: 1650,
    scope: "선택한 술수의 실제 계산 근거를 전문가 시선으로 1~4개 항목으로 정리한다.",
    schema: { methodEvidence: [{ label: "근거 제목", summary: "계산 요약에서 확인되는 구체 근거" }] },
    counts: { methodEvidence: 1 },
    rules: [
      "각 summary에는 [계산 확정값]에 실제로 존재하는 구체 값(간지·일간·십성·궁 이름·별 이름·별 세기·사화·행성-사인-하우스·나크샤트라·다샤 중 해당 술수의 것)을 최소 1개 그대로 인용한다.",
      "methodEvidence는 1~4개.",
    ],
  },
  {
    id: "bluntTruth",
    basisGroups: ["core", "strength"],
    title: "급소 타격 — 네오의 팩폭",
    minChars: 1300,
    scope: "정찰 보고의 계산값과 연결해, 사용자가 인정하기 싫어할 사실을 직격으로 때린다.",
    schema: { bluntTruth: "네오의 팩폭" },
    rules: [
      "계산 근거 없이 성격 일반론만으로 팩폭하지 않는다. 인용한 계산값과 연결한다.",
      "인격·외모 비하, 욕설, 저주·협박성 표현은 금지. 때리는 대상은 사용자의 선택과 패턴이지 사람이 아니다.",
    ],
  },
  {
    id: "todayOrders",
    basisGroups: ["core", "strength"],
    title: "즉시 작전 — 오늘 금지 행동과 바로 할 작전",
    minChars: 1150,
    scope: "오늘 당장 금지할 행동 하나와, 바로 실행할 작전 3개를 준다.",
    schema: { forbiddenAction: { title: "오늘 금지 행동", reason: "왜 금지해야 하는지" }, actionOrders: ["바로 해야 할 작전 1", "바로 해야 할 작전 2", "바로 해야 할 작전 3"] },
    counts: { actionOrders: 3 },
    rules: ["actionOrders는 정확히 3개, 각각 오늘~이번 주에 실행 가능한 구체 행동으로 쓴다."],
  },
  {
    id: "sevenDayMission",
    basisGroups: ["core", "strength"],
    title: "7일 전투 계획",
    minChars: 1650,
    scope: "1일차부터 7일차까지 하루 단위 작전을 설계한다.",
    schema: { sevenDayMission: [{ day: 1, mission: "1일차 작전" }] },
    counts: { sevenDayMission: 7 },
    rules: ["sevenDayMission은 day 1부터 7까지 반드시 7개, 각 mission은 그날 실행할 구체 행동으로 쓴다."],
  },
  {
    id: "meta",
    basisGroups: [],
    title: "전황 점검 + 사자 휘장",
    minChars: 750,
    scope: "2차 수정 작전으로 이어질 현실 점검 질문과 오늘의 사자 휘장, 츤데레 마무리를 준다.",
    counts: { realityCheckQuestions: 2 },
    schema: {
      realityCheckQuestions: [{ question: "현실 점검 질문", whyItMatters: "왜 중요한지" }],
      badge: { name: "사자 휘장 이름", description: "휘장 설명" },
      tsundereClosing: "네오의 마지막 츤데레 한마디",
    },
    rules: [
      "realityCheckQuestions는 2~4개.",
      "tsundereClosing은 반드시 현실 점검과 2차 수정 작전 명령서로 이어지게 쓴다.",
    ],
  },
]);

// ─── 궁합 모드(상대 명반 동반) 챕터 ────────────────────────────────────────
// 🔴 **더하지 않고 갈아 끼운다.** 1차는 동시성 4라 14챕터 = 4웨이브이고, 챕터를 늘리면
//    SYNC_LLM_TIMEOUT_CEILING_MS 예산 안에서 완주하지 못한다. 아래 4개는 각각 1인 모드의
//    topicStyle / topicAreaBreakdown / repeatedChoice / misalignedFlow 자리를 대신한다.
// 🔴 새 챕터의 스키마 필드는 반드시 mergeNeoInitialSections 가 병합해야 한다 —
//    안 그러면 결과에 0자로 실려 verify:neo-operation-room-output-safety 의 분량 계약이 실패한다.
/**
 * 술수별 궁합 어휘. 🔴 자미두수 항목은 이 표가 생기기 전 문장을 **한 글자도 바꾸지 않고**
 * 옮긴 것이다 — 자미두수 궁합 프롬프트가 달라지면 LLM 캐시가 회전하고 이미 본 상담의 재생성
 * 결과가 바뀐다. 새 술수를 더할 때 자미두수 문장을 "정리"하지 말 것.
 *
 * 각 술수는 같은 네 자리를 자기 어휘로 채운다:
 *  - evidenceHint : 상호 판독 챕터가 인용해야 할 교차 항목
 *  - crossTitle/crossScope/crossAreaLabel/crossAreas : 자리별 교차 챕터의 범위
 *  - mentalArea/moneyArea/outerArea : 멘탈·돈·바깥활동을 각 술수에서 무엇으로 보는가
 *  - crossEvidence : 자리별 교차 챕터가 인용해야 할 계산 근거
 *  - triggerBasis : 교전 패턴 챕터가 방아쇠를 특정할 근거
 */
const NEO_COMPAT_METHOD_FOCUS = Object.freeze({
  ziwei: Object.freeze({
    chartWord: "명반",
    evidenceHint: "상대 명궁 주성, 부부궁 교차, 사화 낙궁, 살성 낙궁",
    crossTitle: "궁위 교차 — 자리마다 다른 온도",
    crossScope: "부부궁·복덕궁·재백궁·관록궁·천이궁을 각각 두 사람 기준으로 교차해, 그 자리에서 맞물리는 방식과 부딪히는 방식을 나눠 분석한다.",
    crossAreaLabel: "궁 이름",
    crossAreas: "부부궁·복덕궁·재백궁·관록궁·천이궁",
    mentalArea: "복덕궁",
    moneyArea: "재백궁",
    moneyRule: "재백궁에서는 소비·저축 성향 차이와 공동재정에서 부딪힐 지점을 짚는다.",
    outerRule: "🔴 천이궁을 근거로 외도·범죄 등 특정 행위를 단정하지 않는다. 바깥에서의 활동 방식 차이까지만 쓴다.",
    crossEvidence: "궁 주성·별 세기·사화 낙궁·살성 낙궁",
    triggerBasis: "살성 낙궁·화기 낙궁·부부궁 교차",
  }),
  saju: Object.freeze({
    chartWord: "명식",
    evidenceHint: "두 일간의 관계, 천간 합충, 지지 합충, 상대가 내 명식에 앉는 십성, 용신 공급 여부",
    crossTitle: "명식 교차 — 자리마다 다른 온도",
    crossScope: "일지(배우자궁)·재성과 관성·인성과 식상·지지 합충·오행 보완을 각각 두 사람 기준으로 교차해, 그 자리에서 맞물리는 방식과 부딪히는 방식을 나눠 분석한다.",
    crossAreaLabel: "자리 이름",
    crossAreas: "일지(배우자궁)·재성과 관성·인성과 식상·지지 합충·오행 보완",
    mentalArea: "인성과 식상",
    moneyArea: "재성",
    moneyRule: "재성에서는 소비·저축 성향 차이와 공동재정에서 부딪힐 지점을 짚는다.",
    outerRule: "🔴 지지 충형을 근거로 외도·범죄 등 특정 행위를 단정하지 않는다. 생활 리듬과 활동 방식의 차이까지만 쓴다.",
    crossEvidence: "일간 관계·천간 합충·지지 합충·십성 역할·용신 공급",
    triggerBasis: "지지 충형·기신을 키우는 오행·일주끼리 걸린 자리",
  }),
  astrology: Object.freeze({
    chartWord: "차트",
    evidenceHint: "두 사람 사이의 각과 오브, 상대 행성이 내 하우스에 떨어지는 자리, 상대의 태양·달·금성·화성 사인",
    crossTitle: "시나스트리 교차 — 자리마다 다른 온도",
    crossScope: "7하우스·금성·화성·달·상대 행성이 내 하우스에 떨어지는 자리를 각각 두 사람 기준으로 교차해, 그 자리에서 맞물리는 방식과 부딪히는 방식을 나눠 분석한다.",
    crossAreaLabel: "자리 이름",
    crossAreas: "7하우스·금성·화성·달·상승궁·상대 행성이 떨어진 하우스",
    mentalArea: "달",
    moneyArea: "금성",
    moneyRule: "금성에서는 소비·저축 성향 차이와 공동재정에서 부딪힐 지점을 짚는다.",
    outerRule: "🔴 화성이나 특정 각을 근거로 외도·범죄 등 특정 행위를 단정하지 않는다. 부딪히는 방식의 차이까지만 쓴다.",
    crossEvidence: "각의 종류와 오브·행성이 떨어진 하우스·사인",
    triggerBasis: "오브가 좁은 사각·대칭 각·상대 화성이 떨어진 하우스",
  }),
  vedic: Object.freeze({
    chartWord: "차트",
    evidenceHint: "아쉬타쿠타 쿠타별 점수, 도샤, 두 사람의 달 나크샤트라와 가나",
    crossTitle: "쿠타 교차 — 자리마다 다른 온도",
    crossScope: "요니와 가나·그라하 마이트리·바쿠트·나디·타라를 각각 두 사람 기준으로 교차해, 그 자리에서 맞물리는 방식과 부딪히는 방식을 나눠 분석한다.",
    crossAreaLabel: "쿠타 이름",
    crossAreas: "요니·가나·그라하 마이트리·바쿠트·나디·타라·바샤",
    mentalArea: "가나",
    moneyArea: "바쿠트",
    moneyRule: "바쿠트에서는 생활 기반과 살림 운영에서 부딪힐 지점을 짚는다.",
    outerRule: "🔴 나디·바쿠트 도샤를 근거로 질병·불임·이혼 같은 결과를 단정하지 않는다. 주의해서 관리할 결까지만 쓴다.",
    crossEvidence: "쿠타별 점수와 만점·도샤·나크샤트라·가나·나디",
    triggerBasis: "점수가 0에 가까운 쿠타·도샤가 걸린 쿠타",
  }),
});

export function neoCompatMethodFocus(method) {
  return NEO_COMPAT_METHOD_FOCUS[clean(method, 30)] || null;
}

const buildNeoCompatSectionOverrides = (focus) => Object.freeze({
  topicStyle: {
    id: "compatMutualRead",
    basisGroups: ["compat", "core"],
    title: "상호 판독 — 서로를 어떻게 느끼는가",
    minChars: 1900,
    scope: `두 ${focus.chartWord}을 교차해, 상대가 이 사람을 어떻게 느낄 수 있는지와 이 사람이 상대를 어떻게 느끼는지를 양방향으로 진단한다. 매력·기대·불안·답답함을 함께 다룬다.`,
    schema: {
      mutualRead: {
        towardPartner: { title: "내가 상대에게 느끼는 것", description: "끌리는 지점과 답답한 지점을 교차 근거로 해석", signals: ["신호1", "신호2", "신호3"] },
        towardMe: { title: "상대가 나에게 느낄 수 있는 것", description: `상대 ${focus.chartWord} 구조가 이 관계에서 만들 반응`, signals: ["신호1", "신호2", "신호3"] },
        coreKeyword: "이 관계를 한 문장으로 요약한 핵심 키워드",
      },
    },
    counts: { "mutualRead.towardPartner.signals": 3, "mutualRead.towardMe.signals": 3 },
    rules: [
      `[계산 확정값]의 '두 사람 교차' 표에 실재하는 항목(${focus.evidenceHint})을 최소 2개 인용한다.`,
      `🔴 상대의 현재 속마음이나 실제 행동을 사실로 단정하지 않는다. '${focus.chartWord}상 이런 반응이 나오기 쉽다'로 쓴다.`,
      `한쪽 ${focus.chartWord}만 보고 상대의 마음을 확정하지 않는다. towardMe 는 반드시 상대 ${focus.chartWord} 근거로 쓴다.`,
      "signals 는 각각 3~5개.",
    ],
  },
  topicAreaBreakdown: {
    id: "compatPalaceCross",
    basisGroups: ["compat", "topic"],
    title: focus.crossTitle,
    minChars: 2000,
    scope: focus.crossScope,
    schema: { palaceCross: [{ palace: focus.crossAreaLabel, reading: "그 자리에서 두 사람이 맞물리거나 부딪히는 방식(계산 근거 포함)" }] },
    counts: { palaceCross: 4 },
    rules: [
      `palaceCross 는 4~6개. palace 는 ${focus.crossAreas} 중에서 고르고, [계산 확정값]에 실재하는 이름 그대로 쓴다.`,
      `${focus.mentalArea}에서는 싸웠을 때 누가 먼저 닫히고 누가 계속 말하려 하는지를 반드시 짚는다.`,
      focus.moneyRule,
      focus.outerRule,
      `각 reading 에 계산 근거(${focus.crossEvidence})를 최소 1개 인용한다. 없는 값은 지어내지 않는다.`,
    ],
  },
  repeatedChoice: {
    id: "compatConflictPattern",
    basisGroups: ["compat", "core"],
    title: "최악의 교전 패턴 — 이렇게 싸운다",
    minChars: 1500,
    scope: "이 두 사람이 실제로 어떻게 싸우게 되는지를 방아쇠부터 확대 과정까지 재구성하고, 실제로 오갈 법한 대화를 짧게 만든 뒤 푸는 순서를 준다.",
    schema: {
      conflictPattern: {
        title: "이 관계에서 가장 위험한 패턴",
        trigger: "싸움이 시작되는 방아쇠(계산 근거 포함)",
        escalation: "그 방아쇠가 어떻게 커지는가",
        dialogue: [{ speaker: "말하는 쪽(나 / 상대)", line: "실제로 나올 법한 한 마디" }],
        resolution: "감정 → 공감 → 의도 → 해결 순서로 푸는 구체적인 방법",
      },
    },
    counts: { "conflictPattern.dialogue": 4 },
    rules: [
      "dialogue 는 4~6개를 번갈아 쓰고, 각 line 은 실제 대화체 한 마디로 짧게 쓴다.",
      "resolution 은 반드시 감정 → 공감 → 의도 → 해결 순서를 그대로 밟는다.",
      "🔴 행동 패턴을 비판하되 사람 자체를 공격하지 않는다. 상대에게 인격 낙인을 찍는 표현을 쓰지 않는다.",
      `방아쇠를 [계산 확정값]의 ${focus.triggerBasis} 중 하나로 특정한다.`,
    ],
  },
  misalignedFlow: {
    id: "compatRelationStrategy",
    basisGroups: ["compat", "timing"],
    title: "관계 작전 — 지금 상태에서 무엇을 하는가",
    minChars: 1500,
    scope: `[상담 맥락]의 관계 상태에 맞춰, 지금 이 사람이 밟아야 할 단계를 순서대로 준다. 감성적 위로가 아니라 ${focus.chartWord} 성향에 맞춘 개인화된 행동 지침이어야 한다.`,
    schema: {
      relationStrategy: {
        title: "지금 상태에서의 작전",
        situationRead: `관계 상태와 ${focus.chartWord} 교차를 함께 읽은 현재 판단`,
        steps: [{ stage: "단계 이름", doThis: "이 단계에서 할 것", avoidThis: "이 단계에서 하지 말 것" }],
      },
    },
    counts: { "relationStrategy.steps": 4 },
    rules: [
      "steps 는 4~5개. [상담 맥락]의 관계 상태가 '재회 시도'면 접근 금지 → 첫 접촉 → 관계 회복 → 재회 판단 → 재회 후 순서로 쓴다.",
      "관계 상태가 '결혼 예정'이면 생활 궁합·돈·역할 분담·양가 문제·결혼 후 주의점 중심으로 전환한다.",
      `각 단계의 doThis 는 상대 ${focus.chartWord} 성향에 맞춘 구체 행동으로 쓴다. 일반적인 연애 조언으로 흐르지 않는다.`,
      "🔴 '반드시 재회한다 / 반드시 헤어진다 / 상대가 반드시 연락한다' 같은 확정 예언을 쓰지 않는다.",
    ],
  },
});

/**
 * 궁합 모드 1차 레지스트리. 🔴 1인 모드와 챕터 수가 **같아야** 한다(예산 동일) —
 * 갈아 끼우는 것이지 더하는 게 아니다. 술수마다 어휘가 다르므로 술수별로 만든다.
 * 결과는 고정이라 한 번만 만들어 재사용한다(같은 배열이어야 프롬프트 캐시 키도 안정적이다).
 */
const NEO_COMPAT_SECTIONS_BY_METHOD = Object.freeze(Object.fromEntries(
  Object.entries(NEO_COMPAT_METHOD_FOCUS).map(([method, focus]) => {
    const overrides = buildNeoCompatSectionOverrides(focus);
    return [method, Object.freeze(NEO_INITIAL_SECTIONS.map((section) => overrides[section.id] || section))];
  }),
));

/** 궁합을 지원하는 술수 목록(프롬프트 기준). 라우트·화면의 목록과 같아야 한다. */
export const NEO_COMPAT_PROMPT_METHODS = Object.freeze(Object.keys(NEO_COMPAT_SECTIONS_BY_METHOD));

/**
 * 해당 술수의 궁합 챕터 레지스트리. 궁합을 지원하지 않는 술수면 1인 레지스트리를 그대로 돌려준다
 * — 라우트가 compat 없이 이 함수를 부르는 일은 없지만, 여기서 빈 배열을 내면 챕터가 통째로 사라진다.
 */
export function neoCompatInitialSections(method) {
  return NEO_COMPAT_SECTIONS_BY_METHOD[clean(method, 30)] || NEO_INITIAL_SECTIONS;
}

// ─── 2차(수정 작전) 챕터 레지스트리 ────────────────────────────────────────
/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   섹션별 사용자 프롬프트는 계산된 체계별 요약 데이터를 입력으로 받으므로 생년 정보만으로는 조립되지 않는다.
   페르소나가 체계(사주/자미/베다/점성술)마다 다르므로 체계를 고를 수 있게 목록을 함께 돌려준다. */
export function buildAdminLabPrompt(body = {}, options = {}) {
  const methods = Object.keys(NEO_EXPERT_PERSONA);
  const method = methods.includes(options.variant) ? options.variant : methods[0];

  // 이 기능은 사용자 질문을 프롬프트 안에서 직접 인용한다("neoOpening 의 첫 두 문장 안에서
  // question 을 직접 짚는다"). 계산 요약은 비워 두고 질문이 들어간 실제 프롬프트를 만든다.
  const prompt = buildNeoOperationRoomInitialPrompt(
    {
      selectedMethod: method,
      topic: body?.topic || "",
      question: body?.question || "",
      birthInfo: { birthTimeUnknown: Boolean(body?.birthTimeUnknown) },
    },
    {},
  );

  return {
    systemPrompt: NEO_EXPERT_PERSONA[method],
    prompt,
    partial: true,
    partialReason: "[계산 확정값] 칸은 비어 있습니다 — 실제 상담에서는 선택한 체계의 계산 결과가 들어갑니다. 질문과 지시문은 프로덕션과 같습니다.",
    variantKey: method,
    variants: methods.map((key) => ({ key, label: key })),
    notes: NEO_DOMAIN_COVERAGE[method] ? [`${method} 근거 범위: ${NEO_DOMAIN_COVERAGE[method]}`] : [],
  };
}

export const NEO_REFINED_SECTIONS = Object.freeze([
  {
    id: "neoReview",
    basisGroups: ["core"],
    title: "전황 재판단",
    minChars: 1000,
    scope: "사용자의 현실 점검 답변(체크·자유 입력)을 첫 문단에서 직접 반영해 재판단을 시작한다.",
    schema: { operationTitle: "수정 작전명", neoReview: "네오의 재판단(현실 점검 답변 직접 반영)" },
    rules: [
      "neoReview에는 [사용자 현실 점검 답변]의 체크 또는 자유 입력 중 최소 하나를 직접 인용해 시작한다.",
      "현실 점검 답변이 1차 질문과 본질적으로 같은 맥락이면 '이전과 같은 맥락이네요'라고 짚고 다른 영역으로 확장한다.",
    ],
  },
  {
    id: "verdict",
    basisGroups: ["core", "timing"],
    title: "판정 — 지금 방향이 맞는가",
    minChars: 900,
    scope: "현재 방향이 맞는지 단정하고, 그 판정의 계산 근거를 댄다.",
    schema: { verdict: { status: "잘하고 있다 | 조정이 필요하다 | 방향은 맞지만 부족하다 중 하나", statement: "현재 방향에 대한 단정(2~4문장)" }, verdictBasis: "판정 근거(계산 요약의 구체 값 최소 1개 인용)" },
    rules: [
      "verdict.status는 반드시 '잘하고 있다', '조정이 필요하다', '방향은 맞지만 부족하다' 중 하나로만 쓴다. 애매한 표현 금지.",
      "verdictBasis에는 [계산 확정값]의 구체 값(오행/십성/대운·세운/궁/별/별 세기/사화/행성-사인-하우스/나크샤트라/다샤 중 해당 술수의 것)을 최소 1개 그대로 인용한다.",
    ],
  },
  {
    id: "actionAlternatives",
    basisGroups: ["timing", "strength"],
    title: "전선 조정 — 대안 행동",
    minChars: 1400,
    scope: "시기·행동·근거가 붙은 구체 대안 행동 3~5개를 준다.",
    schema: { actionAlternatives: [{ timing: "언제부터 언제까지(구체 시기)", action: "무엇을 어떻게(구체 행동)", rationale: "왜 지금 이 행동이 흐름에 맞는지(계산 근거 연결)" }] },
    counts: { actionAlternatives: 3 },
    rules: [
      "actionAlternatives는 3~5개, 각 항목에 timing/action/rationale 셋을 모두 채운다.",
      "[이미 제시한 조언]과 겹치지 않게 새로 만든다. '케이스마다 다르다', '노력하면 좋아진다' 같은 회피성·추상 답변 금지.",
    ],
  },
  {
    id: "peopleToMeet",
    basisGroups: ["core", "strength"],
    title: "지원군 확보 — 만나야 할 사람",
    minChars: 1000,
    scope: "사용자에게 부족한 기운을 보완할 사람의 역할과 만날 경로를 구체화한다.",
    schema: { peopleToMeet: [{ role: "만나야 할 사람의 역할/직업/경험", complementaryEnergy: "사용자에게 부족한 기운을 어떻게 보완하는지", whereToFind: "어디서 만날 가능성이 높은지(커뮤니티/모임/소개 경로)" }] },
    counts: { peopleToMeet: 2 },
    rules: ["peopleToMeet은 2~3개, 각 항목에 role/complementaryEnergy/whereToFind 셋을 모두 채운다. '좋은 사람을 만나라' 같은 막연한 표현 금지."],
  },
  {
    id: "thirtyDayWeek12",
    basisGroups: ["timing", "strength"],
    title: "30일 장기 작전 Ⅰ — 1·2주차",
    minChars: 1200,
    scope: "30일 전략의 1주차·2주차를, 주차별 목표·근거·구체 행동으로 두텁게 설계한다.",
    schema: { thirtyDayWeek12: ["1주차: 목표·근거·구체 행동", "2주차: 목표·근거·구체 행동"] },
    counts: { thirtyDayWeek12: 2 },
    rules: ["thirtyDayWeek12는 정확히 2개(1주차, 2주차). 각 항목에 그 주의 목표·계산 근거·구체 행동을 담는다."],
  },
  {
    id: "thirtyDayWeek34",
    basisGroups: ["timing", "strength"],
    title: "30일 장기 작전 Ⅱ — 3·4주차",
    minChars: 1200,
    scope: "30일 전략의 3주차·4주차를, 주차별 목표·근거·구체 행동으로 두텁게 설계한다.",
    schema: { thirtyDayWeek34: ["3주차: 목표·근거·구체 행동", "4주차: 목표·근거·구체 행동"] },
    counts: { thirtyDayWeek34: 2 },
    rules: ["thirtyDayWeek34는 정확히 2개(3주차, 4주차). 1·2주차와 이어지되 반복하지 않는다."],
  },
  {
    id: "thisWeekFirstStep",
    basisGroups: ["core", "timing"],
    title: "이번 주 첫 진격",
    minChars: 800,
    scope: "이번 주 안에 실행 가능한 가장 작은 첫 걸음 하나와 오늘 금지 행동을 준다.",
    schema: { thisWeekFirstStep: "이번 주 안에 실행 가능한 가장 작은 첫 걸음 하나", forbiddenAction: { title: "오늘 금지 행동", reason: "금지 이유" } },
    rules: ["thisWeekFirstStep은 가장 작은 한 걸음 하나만. 거창한 계획 금지."],
  },
  {
    id: "meta",
    basisGroups: [],
    title: "승전 휘장",
    minChars: 500,
    scope: "오늘의 사자 휘장과 츤데레 마무리를 준다.",
    schema: { badge: { name: "휘장 이름", description: "휘장 설명" }, tsundereClosing: "네오의 마지막 한마디" },
    rules: ["badge.name은 오늘의 사자 휘장 이름처럼 짧고 상징적으로 쓴다."],
  },
]);

// 상담 맥락을 한글 라벨 줄로. JSON 으로 실으면 selectedMethod·birthTimeUnknown 같은 키가
// 프롬프트에 그대로 들어가고, 모델이 그걸 본문에 인용한다.
function contextLines(ctx, { questionLabel }) {
  const method = clean(ctx.selectedMethod, 30);
  return [
    `- 술수: ${METHOD_LABELS[method] || method}`,
    `- 주제: ${clean(ctx.topic, 60) || "(미지정)"}`,
    `- 팩폭 강도: ${clean(ctx.intensity, 30) || "(기본)"}`,
    `- ${questionLabel}: ${clean(ctx.question, 1200) || "(없음)"}`,
    ...(ctx.birthTimeUnknown === true ? ["- 태어난 시각을 모른다. 시각에 의존하는 판단은 단정하지 않는다."] : []),
  ];
}

// summarizeInitialBriefingForRefine 의 결과를 한글 라벨 줄로 편다.
// JSON 으로 실으면 coreDiagnosis·repeatedPattern 같은 키가 프롬프트에 들어가고 모델이 인용한다.
function refineDigestLines(initialBriefing) {
  const digest = summarizeInitialBriefingForRefine(initialBriefing);
  const lines = [
    digest.operationTitle ? `- 작전명: ${digest.operationTitle}` : "",
    digest.coreDiagnosis ? `- 핵심 진단: ${digest.coreDiagnosis}` : "",
    digest.bluntTruth ? `- 팩폭 요지: ${digest.bluntTruth}` : "",
    digest.originalStrategy ? `- 본래 움직여야 할 방식: ${digest.originalStrategy}` : "",
    digest.repeatedPattern?.description ? `- 반복되는 선택(${digest.repeatedPattern.title || "제목 없음"}): ${digest.repeatedPattern.description}` : "",
    digest.currentProblem?.description ? `- 어긋난 자리(${digest.currentProblem.title || "제목 없음"}): ${digest.currentProblem.description}` : "",
  ].filter(Boolean);
  return lines.length ? lines : ["(1차 브리핑 없음)"];
}

export function buildNeoInitialSectionPrompt(section, ctx) {
  return [
    ...neoSectionCommonLines(section, ctx),
    "",
    "[상담 맥락]",
    ...contextLines(ctx, { questionLabel: "질문" }),
    ...neoSectionClosingLines(section),
  ].join("\n");
}

export function buildNeoRefinedSectionPrompt(section, ctx) {
  return [
    ...neoSectionCommonLines(section, ctx),
    "",
    "[상담 맥락]",
    ...contextLines(ctx, { questionLabel: "처음 질문" }),
    "",
    // 사용자 답변을 1차 브리핑 앞에 둔다 — 뒤에 두면 긴 맥락에 묻혀 "이 답변을 반영한 수정본"이
    // 아니라 "1차의 재탕"이 나온다. 2차 명령서의 입력 중 가장 중요한 것은 이 블록이다.
    "[사용자 현실 점검 답변] ← 이번 수정의 출발점",
    `- 고른 항목: ${safeArray(ctx.realityCheck?.selectedChecks).map((entry) => clean(entry, 220)).filter(Boolean).join(" / ") || "(없음)"}`,
    `- 직접 쓴 답: ${clean(ctx.realityCheck?.freeform, 1800) || "(없음)"}`,
    "위 답변을 이번 챕터의 내용에 반드시 반영한다. 답변이 이번 챕터와 직접 닿지 않더라도, 답변이 드러낸 상황·제약·감정을 전제로 삼아 쓴다.",
    "",
    "[1차 작전 브리핑 요약 (고쳐 쓸 대상)]",
    ...refineDigestLines(ctx.initialBriefing),
    "",
    "[이미 제시한 조언 (반복 금지)]",
    clean(ctx.previousAdviceLog) || "(없음)",
    "이 목록에 있는 조언·행동·표현은 그대로 다시 쓰지 않는다. 주제가 겹치면 반드시 다른 각도로 새로 만든다.",
    ...neoSectionClosingLines(section),
  ].join("\n");
}

// 챕터 JSON 하나를 안전 파싱(실패 시 {}). merge* 에서 fallback 처리.
// 🔴 잘린 JSON 은 extractJsonObject 의 lastIndexOf("}") 가 못 살려서 챕터가 통째로 사라진다.
//    괄호를 보충해 완결된 필드만이라도 건진다 — 유료 챕터를 0으로 만드는 것보다 낫다.
export function parseNeoSectionResponse(text) {
  try {
    return extractJsonObject(text);
  } catch {
    // 🔴 extractJsonObject 의 복구는 **완결된** JSON 의 raw 개행까지다. 잘림이 겹치면 거기서도
    //    실패하는데, 긴 챕터에서는 두 손상이 함께 온다(개행은 문단을 나누며 생기고 잘림은
    //    길어서 생긴다). 그래서 같은 이스케이프를 먹인 뒤 괄호를 보충한다 — 순서가 반대면
    //    salvage 가 이스케이프 안 된 개행에 다시 걸린다.
    return salvageTruncatedJsonObject(escapeRawControlCharsInJsonStrings(text)) || {};
  }
}

/**
 * 병합 결과 전체에서 내부 키 경로를 지운다(프롬프트 측 수정의 백스톱).
 *
 * 🔴 폐기가 아니라 치환이다. 예전 hasForbiddenResultText 는 걸리면 챕터를 통째로 버렸는데,
 *    키 하나 때문에 유료 상담 한 꼭지를 0으로 만드는 건 사용자 손해가 더 크다.
 * 라벨 맵은 이 요청이 실제로 보낸 계산 확정값 표에서 자동으로 만든다 — 손으로 유지하는
 * 키-라벨 표가 없으므로 새 필드가 생겨도 최신 상태가 유지된다.
 */
function scrubNeoResult(value, labelByToken) {
  if (typeof value === "string") return scrubInternalKeyPaths(value, labelByToken);
  if (Array.isArray(value)) return value.map((item) => scrubNeoResult(item, labelByToken));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrubNeoResult(item, labelByToken)]));
  }
  return value;
}

// methodSummary 가 실제로 담고 있던 키 경로 → 표의 한글 라벨.
// 낙타 등이 없는 경로("chart.lagna")는 정규식이 못 잡으므로 여기서 이름을 직접 알려준다.
function neoKeyLabelMap(methodSummary) {
  const labels = {};
  const walk = (node, path, depth) => {
    if (!node || typeof node !== "object" || depth > 3) return;
    for (const key of Object.keys(node)) {
      const next = path ? `${path}.${key}` : key;
      if (path) labels[next] = "";
      walk(node[key], next, depth + 1);
    }
  };
  walk(firstObject(methodSummary), "", 0);
  return labels;
}

// id → 파싱된 JSON 맵으로 합치기.
function sectionMap(results) {
  const map = {};
  safeArray(results).forEach((entry) => {
    if (entry && entry.id) map[entry.id] = firstObject(entry.parsed);
  });
  return map;
}

/**
 * 궁합 챕터 4종을 병합한다. 1인 모드에서는 해당 챕터가 아예 안 돌아 전부 빈 값이 되고,
 * 결과 화면의 `when` 필터가 그 페이지들을 통째로 뺀다.
 * 🔴 여기서 다루지 않은 스키마 필드는 결과에 0자로 실려 분량 계약 가드가 실패한다.
 */
function mergeNeoCompatSections(map) {
  const mutual = firstObject(firstObject(map.compatMutualRead).mutualRead);
  const conflict = firstObject(firstObject(map.compatConflictPattern).conflictPattern);
  const strategy = firstObject(firstObject(map.compatRelationStrategy).relationStrategy);
  const side = (node, fallbackTitle) => {
    const raw = firstObject(node);
    return {
      title: clean(raw.title || fallbackTitle, 120),
      description: cleanProse(raw.description, 3000),
      signals: dedupeTextList(safeArray(raw.signals).map((item) => cleanProse(item, LIST_ITEM_CAP)).filter(Boolean)).slice(0, 5),
    };
  };
  return {
    mutualRead: {
      towardPartner: side(mutual.towardPartner, "내가 상대에게 느끼는 것"),
      towardMe: side(mutual.towardMe, "상대가 나에게 느낄 수 있는 것"),
      coreKeyword: cleanProse(mutual.coreKeyword, 400),
    },
    palaceCross: dedupeTextList(
      safeArray(firstObject(map.compatPalaceCross).palaceCross).map((item) => ({
        palace: clean(firstObject(item).palace, 120),
        reading: cleanProse(firstObject(item).reading, 2000),
      })).filter((item) => item.palace && item.reading),
      (item) => item.palace,
    ).slice(0, 6),
    conflictPattern: {
      title: clean(conflict.title || "이 관계에서 가장 위험한 패턴", 120),
      trigger: cleanProse(conflict.trigger, 1500),
      escalation: cleanProse(conflict.escalation, 1500),
      dialogue: safeArray(conflict.dialogue).map((item) => ({
        speaker: clean(firstObject(item).speaker, 40),
        line: cleanProse(firstObject(item).line, 400),
      })).filter((item) => item.line).slice(0, 6),
      resolution: cleanProse(conflict.resolution, 2000),
    },
    relationStrategy: {
      title: clean(strategy.title || "지금 상태에서의 작전", 120),
      situationRead: cleanProse(strategy.situationRead, 2000),
      steps: safeArray(strategy.steps).map((item) => ({
        stage: clean(firstObject(item).stage, 80),
        doThis: cleanProse(firstObject(item).doThis, 600),
        avoidThis: cleanProse(firstObject(item).avoidThis, 600),
      })).filter((item) => item.stage && item.doThis).slice(0, 5),
    },
  };
}

export function mergeNeoInitialSections(results, input, methodSummary) {
  const map = sectionMap(results);
  const selectedMethod = clean(input?.selectedMethod, 30);
  const opening = firstObject(map.opening);
  const innateNatureRaw = firstObject(firstObject(map.innateCore).innateNature);
  const innateStrengthRaw = firstObject(firstObject(map.innateStrength).innateStrength);
  const originalStrategyRaw = firstObject(firstObject(map.originalStrategy).originalStrategy);
  const repeatedChoiceRaw = firstObject(firstObject(map.repeatedChoice).repeatedChoice);
  const misalignedFlowRaw = firstObject(firstObject(map.misalignedFlow).misalignedFlow);
  const meta = firstObject(map.meta);
  const today = firstObject(map.todayOrders);
  const frontlineSummary = cleanProse(opening.frontlineSummary, 4000);
  const repeatedChoice = {
    title: clean(repeatedChoiceRaw.title || "반복되는 선택", 120),
    description: cleanProse(repeatedChoiceRaw.description, 4000),
  };
  const misalignedFlow = {
    title: clean(misalignedFlowRaw.title || "지금 흐름이 어긋난 자리", 120),
    description: cleanProse(misalignedFlowRaw.description, 4000),
  };
  const briefing = {
    version: 1,
    documentType: "initial_briefing",
    selectedMethod,
    operationTitle: clean(opening.operationTitle, 120),
    neoOpening: cleanProse(opening.neoOpening, 2000),
    frontlineSummary,
    coreDiagnosis: frontlineSummary,
    innateNature: {
      title: clean(innateNatureRaw.title || "타고난 성향의 핵", 120),
      description: cleanProse(innateNatureRaw.description, 5000),
      keyTraits: dedupeTextList(safeArray(innateNatureRaw.keyTraits).map((item) => cleanProse(item, LIST_ITEM_CAP)).filter(Boolean)).slice(0, 6),
    },
    innateStrength: {
      title: clean(innateStrengthRaw.title || "타고난 강점과 약점", 120),
      description: cleanProse(innateStrengthRaw.description, 5000),
      strongPoints: dedupeTextList(safeArray(innateStrengthRaw.strongPoints).map((item) => cleanProse(item, LIST_ITEM_CAP)).filter(Boolean)).slice(0, 5),
      weakPoints: dedupeTextList(safeArray(innateStrengthRaw.weakPoints).map((item) => cleanProse(item, LIST_ITEM_CAP)).filter(Boolean)).slice(0, 5),
    },
    topicStyle: {
      title: clean(firstObject(firstObject(map.topicStyle).topicStyle).title || "이 주제에서 너의 방식", 120),
      description: cleanProse(firstObject(firstObject(map.topicStyle).topicStyle).description, 5000),
      keyPoints: dedupeTextList(safeArray(firstObject(firstObject(map.topicStyle).topicStyle).keyPoints).map((item) => cleanProse(item, LIST_ITEM_CAP)).filter(Boolean)).slice(0, 6),
    },
    topicAreas: dedupeTextList(
      safeArray(firstObject(map.topicAreaBreakdown).topicAreas).map((item) => ({
        area: clean(firstObject(item).area, 120),
        reading: cleanProse(firstObject(item).reading, 2000),
      })).filter((item) => item.area && item.reading),
      (item) => item.area,
    ).slice(0, 6),
    topicTiming: {
      title: clean(firstObject(firstObject(map.topicTiming).topicTiming).title || "이 주제의 시기 흐름", 120),
      description: cleanProse(firstObject(firstObject(map.topicTiming).topicTiming).description, 4000),
      windows: dedupeTextList(safeArray(firstObject(firstObject(map.topicTiming).topicTiming).windows).map((item) => cleanProse(item, LIST_ITEM_CAP)).filter(Boolean)).slice(0, 5),
    },
    originalStrategy: {
      title: clean(originalStrategyRaw.title || "본래 너는 이렇게 움직여야 한다", 120),
      description: cleanProse(originalStrategyRaw.description, 4000),
      keyRules: dedupeTextList(safeArray(originalStrategyRaw.keyRules).map((item) => cleanProse(item, LIST_ITEM_CAP)).filter(Boolean)).slice(0, 6),
    },
    repeatedChoice,
    repeatedPattern: repeatedChoice,
    misalignedFlow,
    currentProblem: misalignedFlow,
    ...mergeNeoCompatSections(map),
    methodEvidence: safeArray(firstObject(map.methodEvidence).methodEvidence).map((item) => ({
      method: clean(firstObject(item).method || selectedMethod, 30),
      label: clean(firstObject(item).label, 160),
      // 규칙이 1~4개를 허용하므로 1개만 왔을 때 이 항목 하나가 챕터 1650자를 혼자 져야 한다.
      summary: cleanProse(firstObject(item).summary, 3000),
    })).filter((item) => item.summary).slice(0, 4),
    bluntTruth: cleanProse(firstObject(map.bluntTruth).bluntTruth, 3000),
    forbiddenAction: {
      title: clean(firstObject(today.forbiddenAction).title, 120),
      reason: cleanProse(firstObject(today.forbiddenAction).reason, 2000),
    },
    actionOrders: dedupeTextList(safeArray(today.actionOrders).map((item) => cleanProse(item, 700)).filter(Boolean)).slice(0, 3),
    sevenDayMission: dedupeTextList(
      safeArray(firstObject(map.sevenDayMission).sevenDayMission).map((item, index) => ({
        day: Number(firstObject(item).day) || index + 1,
        mission: cleanProse(firstObject(item).mission, 600),
      })).filter((item) => item.mission),
      (item) => item.mission,
    ).slice(0, 7),
    realityCheckQuestions: dedupeTextList(
      safeArray(meta.realityCheckQuestions).map((item) => ({
        question: cleanProse(firstObject(item).question, 400),
        whyItMatters: cleanProse(firstObject(item).whyItMatters, 900),
      })).filter((item) => item.question),
      (item) => item.question,
    ).slice(0, 5),
    badge: {
      name: clean(firstObject(meta.badge).name, 80),
      description: cleanProse(firstObject(meta.badge).description, 900),
    },
    tsundereClosing: cleanProse(meta.tsundereClosing, 900),
    nextStepPrompt: cleanProse(meta.tsundereClosing, 900),
  };
  if (!briefing.methodEvidence.length) {
    const fallback = cleanProse(methodSummary?.evidenceSummary || methodSummary?.summary, 1200);
    if (fallback) {
      const label = METHOD_LABELS[selectedMethod] || selectedMethod;
      briefing.methodEvidence = [{ method: selectedMethod, label: `${label} 근거`, summary: fallback }];
    }
  }
  return scrubNeoResult(briefing, neoKeyLabelMap(methodSummary));
}

export function mergeNeoRefinedSections(results, consultation) {
  const map = sectionMap(results);
  const keyLabels = neoKeyLabelMap(consultation?.methodSummary);
  const selectedMethod = clean(consultation?.selectedMethod || consultation?.initialBriefing?.selectedMethod, 30);
  const review = firstObject(map.neoReview);
  const verdictRaw = firstObject(firstObject(map.verdict).verdict);
  const step = firstObject(map.thisWeekFirstStep);
  const meta = firstObject(map.meta);
  const thirtyDayStrategy = dedupeTextList([
    ...safeArray(firstObject(map.thirtyDayWeek12).thirtyDayWeek12),
    ...safeArray(firstObject(map.thirtyDayWeek34).thirtyDayWeek34),
  ].map((item) => cleanProse(item, 1100)).filter(Boolean)).slice(0, 6);
  return scrubNeoResult({
    version: 2,
    documentType: "refined_order",
    selectedMethod,
    operationTitle: clean(review.operationTitle, 120),
    neoReview: cleanProse(review.neoReview, 3000),
    verdict: {
      status: normalizeVerdictStatus(verdictRaw.status) || "방향은 맞지만 부족하다",
      statement: cleanProse(verdictRaw.statement, 1600),
    },
    verdictBasis: cleanProse(firstObject(map.verdict).verdictBasis, 1600),
    actionAlternatives: dedupeTextList(
      safeArray(firstObject(map.actionAlternatives).actionAlternatives).map((item) => ({
        // 보통은 "3월 초부터 4월 중순까지" 같은 구절이라 상한에 닿지 않는다. 닿았다면 모델이
        // 문장을 쓴 것이므로 하드 슬라이스하지 않는다.
        timing: cleanProse(firstObject(item).timing, 200),
        action: cleanProse(firstObject(item).action, 600),
        rationale: cleanProse(firstObject(item).rationale, 700),
      })).filter((item) => item.action),
      (item) => item.action,
    ).slice(0, 5),
    peopleToMeet: dedupeTextList(
      safeArray(firstObject(map.peopleToMeet).peopleToMeet).map((item) => ({
        role: cleanProse(firstObject(item).role, 400),
        complementaryEnergy: cleanProse(firstObject(item).complementaryEnergy, 600),
        whereToFind: cleanProse(firstObject(item).whereToFind, 600),
      })).filter((item) => item.role),
      (item) => item.role,
    ).slice(0, 4),
    thirtyDayStrategy,
    thisWeekFirstStep: cleanProse(step.thisWeekFirstStep, 900),
    forbiddenAction: {
      title: clean(firstObject(step.forbiddenAction).title, 120),
      reason: cleanProse(firstObject(step.forbiddenAction).reason, 1600),
    },
    badge: {
      name: clean(firstObject(meta.badge).name, 80),
      description: cleanProse(firstObject(meta.badge).description, 900),
    },
    tsundereClosing: cleanProse(meta.tsundereClosing, 900),
  }, keyLabels);
}
