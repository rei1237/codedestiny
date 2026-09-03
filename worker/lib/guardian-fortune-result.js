import {
  GUARDIAN_FORTUNE_FORBIDDEN_RESULT_PATTERNS,
  GUARDIAN_FORTUNE_LIST_LIMITS,
  GUARDIAN_FORTUNE_MODE_SHARE_HINTS,
  GUARDIAN_FORTUNE_RESULT_LENGTH,
  GUARDIAN_FORTUNE_SAFE_RESULT_DEFAULTS,
  getDefaultCta,
  getTopicContract,
  getTopicCtas,
} from "./guardian-fortune-runtime-contract.js";
import { GUARDIAN_TOPIC_ADAPTER_PRIORITY } from "./guardian-fortune-adapter-utils.js";
import { buildContextDrivenGuardianFallback } from "./guardian-fortune-fallback.js";
import { escapeRawControlCharsInJsonStrings } from "./json-text-repair.js";

const VISIBLE_RESULT_FIELDS = Object.freeze([
  "openingLine",
  "innerState",
  "coreReading",
  "topicAdvice",
  "cautionPattern",
  "luckyAction",
]);

const ALL_RESULT_TEXT_FIELDS = Object.freeze([
  "title",
  ...VISIBLE_RESULT_FIELDS,
  "shareText",
]);

const PARSE_ERROR = "GUARDIAN_LLM_PARSE_FAILED";

const CATEGORY_SYSTEM_MARKERS = Object.freeze({
  saju: ["사주", "일간", "십성", "오행", "월지", "시주"],
  ziwei: ["자미두수", "명궁", "신궁", "관록궁", "재백궁", "부처궁", "복덕궁"],
  vedic: ["베다점", "베다 점성술", "라그나", "나크샤트라", "다샤", "문사인"],
  sukuyo: ["숙요점", "숙요", "본명숙"],
  astrology: ["서양 점성술", "상승궁", "어센던트", "하우스"],
  tarot: ["타로", "스프레드", "정방향", "역방향"],
});

/**
 * 모델이 고르지 않은 체계의 용어를 상담 본문에 섞어 쓰는지 본다.
 *
 * 🔴 premiumCta 는 검사 대상이 아니다. CTA 는 **다른 상품으로 넘기는 크로스셀 포인터**라
 * 다른 체계 이름을 부르는 게 정상이다. 예: mind 주제의 bridge 문구는 "나크샤트라 기반
 * 해석으로 이어갈 수 있습니다"(guardian-fortune-insight.js), decision 주제의 기본 CTA 는
 * "타로로 선택의 결 보기". 이걸 함께 훑는 바람에 category 가 그 체계가 아닌 거의 모든
 * 조합이 GUARDIAN_RESULT_CATEGORY_BOUNDARY_FAILED 로 떨어졌고, 폴백까지 같은 이유로
 * 탈락해 요청 전체가 502 로 끝났다. 검사해야 할 것은 모델이 쓴 상담 본문이다.
 */
function findForeignSystemMarker(result, category) {
  if (!CATEGORY_SYSTEM_MARKERS[category]) return "invalid_category";
  const visibleText = ALL_RESULT_TEXT_FIELDS.map((field) => safeText(result?.[field], 4000)).join(" ");
  for (const [system, markers] of Object.entries(CATEGORY_SYSTEM_MARKERS)) {
    if (system === category) continue;
    const marker = markers.find((candidate) => visibleText.includes(candidate));
    if (marker) return `${system}:${marker}`;
  }
  return "";
}

function safeText(value, max = 1200) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/\s+/g, " ").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

function cloneObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function tryParseJson(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function stripCodeFence(value) {
  return value
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function removeTrailingCommas(value) {
  return value.replace(/,\s*([}\]])/g, "$1");
}

/** Parses common LLM JSON formatting mistakes without logging the raw response. */
export function parseGuardianFortuneLLMResponse(rawResponse) {
  if (typeof rawResponse !== "string" || rawResponse.length === 0 || rawResponse.length > 30000) {
    return { ok: false, errorCode: PARSE_ERROR, message: "LLM 결과 형식을 읽을 수 없습니다." };
  }

  const source = stripCodeFence(rawResponse.trim());
  const candidates = [source];
  const firstObject = source.indexOf("{");
  const lastObject = source.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) candidates.push(source.slice(firstObject, lastObject + 1));

  for (const candidate of candidates) {
    const attempts = [candidate, removeTrailingCommas(candidate)];
    for (const attempt of attempts) {
      const parsed = tryParseJson(attempt) || tryParseJson(escapeRawControlCharsInJsonStrings(attempt));
      if (parsed) return { ok: true, value: parsed };
    }
  }

  return { ok: false, errorCode: PARSE_ERROR, message: "LLM 결과가 JSON 형식이 아닙니다." };
}

export function countGuardianFortuneVisibleTextLength(result = {}) {
  const bodyLength = VISIBLE_RESULT_FIELDS.reduce((total, field) => total + safeText(result[field]).length, 0);
  const ctaReasonLength = safeText(result?.premiumCta?.reason).length;
  return bodyLength + ctaReasonLength;
}

function applyForbiddenReplacements(value) {
  let result = safeText(value);
  for (const rule of GUARDIAN_FORTUNE_FORBIDDEN_RESULT_PATTERNS) {
    rule.pattern.lastIndex = 0;
    result = result.replace(rule.pattern, rule.replacement);
  }
  return result;
}

function applyUnsupportedClaimSafety(value, context = {}) {
  let result = safeText(value, 2200);
  const hasBirthTime = Boolean(context?.inputSummary?.hasBirthTime);
  const hasBirthPlace = Boolean(context?.inputSummary?.hasBirthPlace);

  if (!hasBirthTime) {
    result = result
      .replace(/시주(?:가|는|에서|상)?\s*(?:확실히|분명히|뚜렷하게|강하게)?/g, "생시가 없어 시주 해석은 낮은 확신으로만")
      .replace(/신궁(?:이|은|에서|상)?\s*(?:확실히|분명히|뚜렷하게|강하게)?/g, "신궁은 생시가 있을 때 더 정확하므로")
      .replace(/라그나(?:가|는|에서|상)?\s*(?:확실히|분명히|뚜렷하게|강하게)?/g, "라그나는 생시가 있을 때 더 정확하므로");
  }

  if (!hasBirthTime || !hasBirthPlace) {
    result = result
      .replace(/상승궁(?:이|은|에서|상)?\s*(?:확실히|분명히|뚜렷하게|강하게)?/g, "상승궁은 생시와 출생지가 있을 때 더 정확하므로")
      .replace(/하우스(?:가|는|에서|상)?\s*(?:확실히|분명히|뚜렷하게|강하게)?/g, "하우스 해석은 생시와 출생지가 있을 때 더 정확하므로");
  }

  return result.replace(/\s+/g, " ").trim();
}

function applyContextualClaimSafety(result = {}, context = {}) {
  const source = cloneObject(result);
  const safe = { ...source };
  for (const field of ALL_RESULT_TEXT_FIELDS) {
    safe[field] = applyUnsupportedClaimSafety(source[field], context);
  }
  const cta = cloneObject(source.premiumCta);
  safe.premiumCta = {
    ...cta,
    label: applyUnsupportedClaimSafety(cta.label, context),
    reason: applyUnsupportedClaimSafety(cta.reason, context),
  };
  return safe;
}

function hasForbiddenExpression(value) {
  const source = safeText(value, 2000);
  return GUARDIAN_FORTUNE_FORBIDDEN_RESULT_PATTERNS.some((rule) => {
    const flags = rule.pattern.flags.replace("g", "");
    return new RegExp(rule.pattern.source, flags).test(source);
  });
}

function collectSensitiveValues(input = {}) {
  const values = [
    input.birthDate,
    input.birthTime,
    input.nickname,
    input.concern,
    input.birthPlace?.city,
    input.birthPlace?.country,
    input.birthPlace?.timezone,
    input.birthPlace?.latitude,
    input.birthPlace?.longitude,
  ];
  return values
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).trim())
    .filter((value) => value.length >= 3);
}

export function assertGuardianFortuneNoSensitiveLeak({ result, input = {} } = {}) {
  const values = collectSensitiveValues(input);
  const textValues = ALL_RESULT_TEXT_FIELDS.map((field) => safeText(result?.[field], 4000));
  textValues.push(safeText(result?.premiumCta?.label, 4000));
  textValues.push(safeText(result?.premiumCta?.reason, 4000));
  const combined = textValues.join(" ");
  if (values.some((value) => combined.includes(value))) {
    const error = new Error("운세 결과에 민감한 입력이 포함되었습니다.");
    error.code = "GUARDIAN_RESULT_SENSITIVE_LEAK";
    throw error;
  }
  return true;
}

/** 목록 필드를 개수·길이 계약 안으로 정규화한다. 금지 표현 치환은 산문과 동일하게 건다. */
function sanitizeResultList(value, limits) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const items = [];
  for (const entry of value) {
    const normalized = safeText(applyForbiddenReplacements(entry), limits.maxLength);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    items.push(normalized);
    if (items.length >= limits.max) break;
  }
  return items;
}

export function sanitizeGuardianFortuneResult(result = {}) {
  const source = cloneObject(result);
  const sanitized = {};
  for (const field of ALL_RESULT_TEXT_FIELDS) sanitized[field] = applyForbiddenReplacements(source[field]);

  sanitized.evidenceLines = sanitizeResultList(source.evidenceLines, GUARDIAN_FORTUNE_LIST_LIMITS.evidenceLines);
  sanitized.followUpQuestions = sanitizeResultList(source.followUpQuestions, GUARDIAN_FORTUNE_LIST_LIMITS.followUpQuestions);

  const cta = cloneObject(source.premiumCta);
  sanitized.premiumCta = {
    ctaKey: safeText(cta.ctaKey, 100),
    label: applyForbiddenReplacements(cta.label),
    targetPath: safeText(cta.targetPath, 200),
    reason: applyForbiddenReplacements(cta.reason),
  };
  return sanitized;
}

function adapterEvidence(context = {}, topic) {
  const priority = GUARDIAN_TOPIC_ADAPTER_PRIORITY[topic] || GUARDIAN_TOPIC_ADAPTER_PRIORITY.daily;
  for (const adapter of priority) {
    const data = context?.[adapter];
    if (!data || typeof data !== "object") continue;
    const candidate = data.personalityHook
      || data.relationshipPattern
      || data.innerRhythm
      || data.currentMoodSummary
      || data.topicPalaceSummary
      || data.symbolicMessage
      || data.currentFlowSummary
      || data.nakshatraSummary;
    if (safeText(candidate)) return safeText(candidate, 280);
  }
  return "계산된 흐름은 감정과 현실의 순서를 함께 살필 때 더 선명해집니다.";
}

function contextInsight(context = {}) {
  return context?.integratedInsight || {};
}

function getTopicAndMode(input = {}, context = {}) {
  const topic = getTopicContract(context?.inputSummary?.topic || input.topic) ? (context?.inputSummary?.topic || input.topic) : "daily";
  const mode = (context?.inputSummary?.mode || input.mode) === "neo" ? "neo" : "yeoni";
  return { topic: GUARDIAN_FORTUNE_TOPICS_SAFE(topic), mode };
}

function GUARDIAN_FORTUNE_TOPICS_SAFE(topic) {
  return ["daily", "love", "money_work", "relationship", "mind", "decision"].includes(topic) ? topic : "daily";
}

function defaultReason(context, topic) {
  return safeText(contextInsight(context).premiumBridge, 360)
    || `${getTopicContract(topic).label}의 흐름을 더 깊게 살펴보고 싶다면 다음 상담에서 이어갈 수 있어요.`;
}

function buildLegacyFallback({ input = {}, context = {}, reason = "" } = {}) {
  const { topic, mode } = getTopicAndMode(input, context);
  const insight = contextInsight(context);
  const topicContract = getTopicContract(topic);
  const cta = getDefaultCta(topic);
  const openingDefault = mode === "neo"
    ? GUARDIAN_FORTUNE_SAFE_RESULT_DEFAULTS.neoOpening
    : GUARDIAN_FORTUNE_SAFE_RESULT_DEFAULTS.yeoniOpening;
  const openingHook = safeText(insight.openingHook, 360) || openingDefault;
  const currentTheme = safeText(insight.currentTheme, 360) || `${topicContract.label}은 오늘의 속도와 순서를 정리할 때 방향이 보입니다.`;
  const likelyConcern = safeText(insight.likelyConcern, 300) || `${topicContract.label}에서 무엇부터 확인할지 고민하는 흐름`;
  const advice = safeText(insight.adviceDirection, 220) || "확신보다 확인 가능한 다음 행동을 고르기";
  const caution = safeText(insight.cautionPattern, 280) || "작은 신호 하나를 전체 결론처럼 해석하는 것";
  const action = safeText(insight.luckyActionHint, 300) || "오늘 확인할 수 있는 조건 하나를 적고 작은 행동부터 시작해보세요.";
  const evidence = adapterEvidence(context, topic);

  return {
    title: GUARDIAN_FORTUNE_SAFE_RESULT_DEFAULTS.title,
    openingLine: `${openingDefault} ${openingHook}`,
    innerState: `지금 마음에는 ${likelyConcern}이(가) 함께 놓여 있어 보여요. ${openingHook} 그래서 감정을 억지로 밀어내기보다, 내가 실제로 확인할 수 있는 부분과 아직 기다려야 하는 부분을 나눠보는 것이 좋아요.`,
    coreReading: `${currentTheme} 계산된 흐름에서는 ${evidence}라는 단서가 보입니다. 이 신호는 결과를 미리 확정한다는 뜻보다, 오늘 어떤 순서로 움직이면 마음과 현실의 부담을 줄일 수 있는지 알려주는 재료에 가까워요. 여러 가능성을 한 번에 해결하려 하기보다 지금 손댈 수 있는 한 가지를 고르면 흐름이 훨씬 선명해집니다.`,
    topicAdvice: `${topicContract.label}에서 오늘의 방향은 ${advice}입니다. 먼저 사실과 감정을 분리해 적어보고, 상대나 환경의 반응을 기다리는 일과 내가 바로 할 수 있는 일을 구분해보세요. 작은 확인을 거치면 큰 결정을 서두르지 않아도 다음 장면이 자연스럽게 보일 수 있어요.`,
    cautionPattern: `오늘 조심할 패턴은 ${caution}입니다. 마음이 급해질수록 한 번 멈추고, 지금 가진 정보가 충분한지 확인해보세요. 불안한 상태에서 내린 결론은 실제 상황보다 더 크게 느껴질 수 있어요.`,
    luckyAction: action,
    premiumCta: {
      ctaKey: cta.ctaKey,
      label: cta.label,
      targetPath: cta.targetPath,
      reason: defaultReason(context, topic),
    },
    shareText: `${GUARDIAN_FORTUNE_MODE_SHARE_HINTS[mode]} ${topicContract.shareHint}`,
    _reason: reason,
  };
}

function buildBaseFallback(args = {}) {
  try {
    return buildContextDrivenGuardianFallback(args);
  } catch {
    return buildLegacyFallback(args);
  }
}

function appendUnique(result, field, value) {
  const addition = safeText(value, 480);
  if (!addition) return;
  const current = safeText(result[field], 4000);
  if (!current.includes(addition)) result[field] = `${current} ${addition}`.trim();
}

export function enrichShortGuardianFortuneResult(result = {}, { context = {}, input = {} } = {}) {
  const next = sanitizeGuardianFortuneResult(result);
  const { topic } = getTopicAndMode(input, context);
  const insight = contextInsight(context);
  const additions = [
    insight.currentTheme,
    insight.adviceDirection ? `오늘의 기준은 ${insight.adviceDirection}입니다.` : "오늘의 기준은 확인 가능한 작은 행동입니다.",
    insight.cautionPattern ? `특히 ${insight.cautionPattern}을(를) 살펴보세요.` : "작은 신호를 전체 결론처럼 키우지 않는 것이 좋아요.",
    insight.luckyActionHint,
    `${getTopicContract(topic).label}의 흐름은 한 번에 결론을 내리기보다 한 단계씩 확인할 때 더 안정적으로 읽힙니다.`,
    "오늘의 메시지는 정해진 미래가 아니라, 지금 선택할 수 있는 방향을 살펴보는 참고 자료로 받아들여 주세요.",
    `계산 결과가 보여주는 ${getTopicContract(topic).label}의 단서는 한 문장으로 결론 내리는 답이 아니라, 현재의 선택을 조금 더 잘 관찰하도록 돕는 기준입니다. 오늘은 주변의 반응을 억지로 바꾸려 하기보다 내가 조절할 수 있는 속도와 순서를 먼저 정리해보세요.`,
    "마음이 다시 복잡해지면 처음부터 모든 것을 해결하려 하지 말고, 지금 확인할 수 있는 사실 하나와 잠시 내려놓을 생각 하나를 나누어 적어보세요. 그 구분만으로도 다음 행동을 고르는 부담이 줄어들 수 있어요.",
    "오늘의 귀인 행동은 거창한 결심보다 작은 확인에 있습니다. 답장을 보내기 전 문장을 한 번 줄이고, 결제를 결정하기 전 조건을 다시 읽고, 해야 할 일을 세 가지 안으로 좁혀보세요. 이처럼 되돌릴 수 있는 행동부터 시작하면 흐름을 안전하게 시험할 수 있어요.",
    `${getTopicContract(topic).label}에서 같은 고민이 반복된다면, 상황이 그대로여서가 아니라 확인하는 순서가 매번 달라졌기 때문일 수 있어요. 오늘은 확인할 것과 미룰 것을 먼저 갈라두면 다음 판단이 한결 가벼워집니다.`,
    "지금의 흐름은 좋고 나쁨으로 나뉘기보다, 어떤 속도로 움직이면 덜 지치는지를 알려주는 쪽에 가깝습니다. 서두르면 놓치기 쉬운 신호가 있고, 너무 미루면 선택지가 줄어드는 지점도 함께 있어요.",
    "결정을 앞두고 마음이 무거워지면, 그 무게가 상황의 크기 때문인지 아직 확인하지 못한 정보 때문인지 구분해보세요. 대부분의 부담은 사실이 부족할 때 더 크게 느껴집니다.",
    "오늘 하루의 결론을 지금 내리지 않아도 괜찮아요. 흐름은 한 번에 뒤집히기보다 작은 확인이 쌓이면서 방향을 바꾸는 경우가 훨씬 많습니다.",
    `${getTopicContract(topic).label}에서 지금 필요한 것은 더 많은 정보가 아니라, 이미 가진 정보 중 무엇을 기준으로 삼을지 정하는 일일 수 있어요. 기준이 하나 정해지면 나머지 신호는 판단을 흔드는 소음이 아니라 참고 자료가 됩니다.`,
    "확신이 서지 않는 상태에서 내린 결정도 되돌릴 수 있는 크기라면 충분히 시도해볼 만합니다. 중요한 것은 옳은 선택을 한 번에 고르는 일이 아니라, 틀렸을 때 빨리 알아차릴 수 있는 방식으로 움직이는 일이에요.",
    `${getTopicContract(topic).label}의 흐름이 답답하게 느껴진다면, 상황이 멈춰 있어서가 아니라 변화가 아직 눈에 보이는 크기로 쌓이지 않았기 때문일 수 있어요. 이런 구간에서는 결과를 확인하는 주기를 조금 길게 잡는 편이 덜 지칩니다.`,
    "다른 사람의 반응을 기준으로 내 상태를 판단하면, 같은 하루도 매번 다르게 평가됩니다. 오늘은 바깥의 반응보다 내가 실제로 무엇을 했는지를 먼저 적어보세요.",
    "지금 흐름에서 가장 소모가 큰 것은 결정 자체가 아니라, 결정을 미룬 채 계속 생각하는 상태입니다. 오늘 정할 수 있는 작은 것 하나만 먼저 닫아도 남은 판단이 가벼워져요.",
    `${getTopicContract(topic).label}에서 반복되는 장면이 있다면 그 장면 자체보다, 그 앞에 늘 놓이는 조건을 살펴보세요. 대부분의 반복은 상황이 같아서가 아니라 시작하는 조건이 같아서 생깁니다.`,
    "마음이 급할수록 선택지를 늘리게 되지만, 선택지가 많아질수록 결정은 더 늦어집니다. 오늘은 후보를 늘리기보다 확실히 빼도 되는 것을 먼저 지워보세요.",
    "몸이 지쳐 있을 때의 판단은 상황보다 컨디션을 더 많이 반영합니다. 중요한 결정을 앞두고 있다면 쉬고 난 뒤에 같은 질문을 한 번 더 던져보는 것이 좋아요.",
    `${getTopicContract(topic).label}은 한 번의 큰 변화보다 매번 같은 자리에서 조금씩 달라지는 선택으로 방향이 바뀝니다. 오늘의 작은 차이가 당장은 표시가 나지 않아도 흐름의 기울기는 이미 달라지고 있어요.`,
    "결과가 마음에 들지 않았던 선택도 그 당시 가진 정보 안에서는 최선이었을 수 있습니다. 지난 판단을 탓하는 대신, 그때 없던 정보가 무엇이었는지만 확인해두면 다음에 쓸 기준이 하나 늘어납니다.",
  ].map((value) => safeText(value, 420)).filter(Boolean);

  // 🔴 sanitizeGuardianFortuneResult 가 필드마다 1,200자로 자른다. 두 필드에만 덧붙이면
  // 합산 상한이 2,400자라 하한(2,600자)에 구조적으로 도달할 수 없어 네 필드로 나눈다.
  const targetFields = ["coreReading", "topicAdvice", "innerState", "cautionPattern"];
  let index = 0;
  while (countGuardianFortuneVisibleTextLength(next) < GUARDIAN_FORTUNE_RESULT_LENGTH.min && index < additions.length * 3) {
    appendUnique(next, targetFields[index % targetFields.length], additions[index % additions.length]);
    index += 1;
  }
  return next;
}

function splitSentences(value) {
  const normalized = safeText(value, 5000);
  if (!normalized) return [];
  return normalized.match(/[^.!?。！？]+[.!?。！？]?/g)?.map((item) => item.trim()).filter(Boolean) || [normalized];
}

function removeLastSentence(result, field) {
  const sentences = splitSentences(result[field]);
  if (sentences.length <= 1) return false;
  sentences.pop();
  result[field] = sentences.join(" ").trim();
  return true;
}

export function trimLongGuardianFortuneResult(result = {}) {
  const next = sanitizeGuardianFortuneResult(result);
  const removableFields = ["coreReading", "topicAdvice", "innerState", "cautionPattern"];
  let index = 0;
  while (countGuardianFortuneVisibleTextLength(next) > GUARDIAN_FORTUNE_RESULT_LENGTH.max && index < 100) {
    const field = removableFields[index % removableFields.length];
    if (!removeLastSentence(next, field)) {
      const fallbackField = removableFields.find((candidate) => splitSentences(next[candidate]).length > 1);
      if (fallbackField) removeLastSentence(next, fallbackField);
      else break;
    }
    index += 1;
  }
  if (countGuardianFortuneVisibleTextLength(next) > GUARDIAN_FORTUNE_RESULT_LENGTH.max) {
    const field = "coreReading";
    next[field] = safeText(next[field], Math.max(80, GUARDIAN_FORTUNE_RESULT_LENGTH.max - 500));
  }
  return next;
}

export function normalizeGuardianFortuneShareText({ candidate, input = {}, context = {} } = {}) {
  const { topic, mode } = getTopicAndMode(input, context);
  const normalized = applyForbiddenReplacements(candidate);
  const fallback = `${GUARDIAN_FORTUNE_MODE_SHARE_HINTS[mode]} ${getTopicContract(topic).shareHint}`;
  const chosen = normalized && normalized.length <= 180 ? normalized : fallback;
  const result = { title: "", openingLine: "", shareText: chosen };
  try {
    assertGuardianFortuneNoSensitiveLeak({ result, input });
    return chosen;
  } catch {
    return fallback;
  }
}

function normalizeCta(rawCta, topic, fallbackReason) {
  const ctaCandidates = getTopicCtas(topic);
  const candidate = ctaCandidates.find((item) => item.ctaKey === safeText(rawCta?.ctaKey, 100)) || getDefaultCta(topic);
  const reason = applyForbiddenReplacements(rawCta?.reason) || fallbackReason;
  return {
    ctaKey: candidate.ctaKey,
    label: candidate.label,
    targetPath: candidate.targetPath,
    reason: safeText(reason, 420),
  };
}

export function buildFallbackGuardianFortuneResult({ input = {}, context = {}, reason = "" } = {}) {
  let fallback = buildBaseFallback({ input, context, reason });
  delete fallback._reason;
  fallback = enrichShortGuardianFortuneResult(fallback, { input, context });
  fallback = trimLongGuardianFortuneResult(fallback);
  fallback.shareText = normalizeGuardianFortuneShareText({ candidate: fallback.shareText, input, context });
  return fallback;
}

export function validateAndNormalizeGuardianFortuneResult({ parsed, input = {}, context = {} } = {}) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, errorCode: "GUARDIAN_RESULT_MISSING_FIELDS", issues: ["result_object"] };
  }

  const category = context?.inputSummary?.category || input?.category || "";
  const availableSystems = Array.isArray(context?.availableSystems) ? context.availableSystems : [];
  if (!CATEGORY_SYSTEM_MARKERS[category] || availableSystems.length !== 1 || availableSystems[0] !== category) {
    return { ok: false, errorCode: "GUARDIAN_RESULT_CATEGORY_BOUNDARY_FAILED", issues: ["category_context_mismatch"] };
  }
  const foreignSystemMarker = findForeignSystemMarker(parsed, category);
  if (foreignSystemMarker) {
    return { ok: false, errorCode: "GUARDIAN_RESULT_CATEGORY_BOUNDARY_FAILED", issues: [`foreign_system_${foreignSystemMarker}`] };
  }

  const { topic } = getTopicAndMode(input, context);
  const fallback = buildFallbackGuardianFortuneResult({ input, context, reason: "validation_fallback" });
  let candidate = sanitizeGuardianFortuneResult({ ...fallback, ...parsed });
  const issues = [];
  for (const field of ALL_RESULT_TEXT_FIELDS) {
    if (!safeText(parsed[field])) issues.push(`fallback_${field}`);
    if (!safeText(candidate[field])) candidate[field] = fallback[field];
  }

  candidate.premiumCta = normalizeCta(parsed.premiumCta, topic, fallback.premiumCta.reason);
  candidate.shareText = normalizeGuardianFortuneShareText({ candidate: parsed.shareText, input, context });
  candidate = applyContextualClaimSafety(candidate, context);

  try {
    assertGuardianFortuneNoSensitiveLeak({ result: candidate, input });
  } catch {
    return { ok: false, errorCode: "GUARDIAN_RESULT_SENSITIVE_LEAK", issues: [...issues, "sensitive_leak"] };
  }

  let normalized = candidate;
  if (countGuardianFortuneVisibleTextLength(normalized) < GUARDIAN_FORTUNE_RESULT_LENGTH.min) {
    normalized = enrichShortGuardianFortuneResult(normalized, { input, context });
    issues.push("enriched_short_result");
  }
  if (countGuardianFortuneVisibleTextLength(normalized) > GUARDIAN_FORTUNE_RESULT_LENGTH.max) {
    normalized = trimLongGuardianFortuneResult(normalized);
    issues.push("trimmed_long_result");
  }

  normalized = sanitizeGuardianFortuneResult(normalized);
  normalized.premiumCta = normalizeCta(normalized.premiumCta, topic, fallback.premiumCta.reason);
  normalized.shareText = normalizeGuardianFortuneShareText({ candidate: normalized.shareText, input, context });
  normalized = applyContextualClaimSafety(normalized, context);
  // 목록이 모자라면 폴백의 목록으로 채운다. 목록 부재로 전체 상담을 버리면 결제한
  // 사용자가 산문까지 잃는다 — 목록은 보조 구조라 폴백 대체가 맞다.
  for (const [field, limits] of Object.entries(GUARDIAN_FORTUNE_LIST_LIMITS)) {
    if ((normalized[field] || []).length < limits.min) {
      normalized[field] = fallback[field] || [];
      issues.push(`fallback_${field}`);
    }
  }
  const hasMissingRequired = VISIBLE_RESULT_FIELDS.some((field) => !safeText(normalized[field])) || !safeText(normalized.title);
  const hasForbidden = ALL_RESULT_TEXT_FIELDS.some((field) => hasForbiddenExpression(normalized[field]))
    || hasForbiddenExpression(normalized.premiumCta.reason);
  const length = countGuardianFortuneVisibleTextLength(normalized);
  if (hasMissingRequired || hasForbidden || length < GUARDIAN_FORTUNE_RESULT_LENGTH.min || length > GUARDIAN_FORTUNE_RESULT_LENGTH.max) {
    return {
      ok: false,
      errorCode: hasForbidden ? "GUARDIAN_RESULT_UNSAFE_CONTENT" : "GUARDIAN_RESULT_QUALITY_FAILED",
      issues: [...issues, hasMissingRequired ? "required_field" : "", hasForbidden ? "forbidden_expression" : "", `length_${length}`].filter(Boolean),
    };
  }
  return { ok: true, value: normalized, issues, length };
}

export {
  ALL_RESULT_TEXT_FIELDS,
  VISIBLE_RESULT_FIELDS,
  applyForbiddenReplacements,
};
