import { FusionFortuneGenerationAttempt } from "./models.js";
import { mongoose } from "./db.js";
import {
  buildFusionSectionGroupPrompt,
  FUSION_FORTUNE_LENGTH,
  FUSION_SECTION_GROUP_SPECS,
} from "./fusion-fortune-prompt.js";
import {
  FUSION_VISUAL_SYSTEMS,
  isFusionVisualizationShaped,
  normalizeFusionFinalVerdict,
  normalizeFusionVisualization,
} from "./fusion-fortune-visual.js";
import { buildGuardianFortuneContext } from "./guardian-fortune-context.js";
import { buildIntegratedInsight } from "./guardian-fortune-insight.js";
import { buildFortuneQuestionFocus } from "./fortune-question-focus.js";
import { pickGeminiKeys } from "./gemini.js";
import { callGeminiJsonWithRetry } from "./structured-consultation.js";
import { TAROT_CARDS } from "../../lib/tarot/tarot-cards.mjs";

// 초융합 운세는 표준 회당 결제(B유형)다. 가격 정본은 worker/lib/paid-feature-registry.js 이며
// 300코인(30,000원)이라 이용권 커버는 family 등급만 통과한다(PASS_LIMITS 참고).
export const FUSION_FORTUNE_PAID_FEATURE_KEY = "fusion-fortune-consultation";

export const FUSION_FORTUNE_ERROR_CODES = Object.freeze({
  FEATURE_DISABLED: "FUSION_FORTUNE_FEATURE_DISABLED",
  AUTH_REQUIRED: "FUSION_FORTUNE_AUTH_REQUIRED",
  INVALID_INPUT: "FUSION_FORTUNE_INVALID_INPUT",
  // 전용 "초융합 상담권"을 폐지하고 표준 회당 결제로 옮겼다(2026-08-07). 구 NO_TICKET 자리다.
  PAYMENT_REQUIRED: "FUSION_FORTUNE_PAYMENT_REQUIRED",
  // 결제 증빙 조회가 DB 장애로 판단 보류된 상태 — 402 가 아니라 503 으로 표면화한다.
  PAYMENT_CHECK_DEGRADED: "FUSION_FORTUNE_PAYMENT_CHECK_DEGRADED",
  REQUEST_IN_PROGRESS: "FUSION_FORTUNE_REQUEST_IN_PROGRESS",
  CONTEXT_FAILED: "FUSION_FORTUNE_CONTEXT_FAILED",
  GENERATION_FAILED: "FUSION_FORTUNE_GENERATION_FAILED",
  RESULT_INVALID: "FUSION_FORTUNE_RESULT_INVALID",
  COMMIT_FAILED: "FUSION_FORTUNE_COMMIT_FAILED",
  CANCELLED: "FUSION_FORTUNE_CANCELLED",
});

const FORBIDDEN = ["무조건", "반드시", "100%", "확실히 된다", "확실히 망한다", "큰일 난다", "결제해야 해결된다", "유료로 봐야만 답이 나온다", "투자하면 오른다", "반드시 매수해라", "병이 있다", "고소하면 이긴다", "상대는 반드시 돌아온다"];
const SECTION_KEYS = ["sajuSection", "ziweiSection", "vedicSection", "sukuyoSection", "astrologySection", "tarotSection", "integratedReading"];
const REQUIRED_KEYS = ["title", "openingMessage", "executiveSummary", "timingAndAction", "closingMessage"];
// 그룹 검증과 전체 검증이 같은 기준을 보도록 정규식을 한곳에 둔다.
const INTERNAL_DATA_PATTERN = /(raw[_ ]?(prompt|response|context)|paymentId|merchantUid|ticketRemaining|totalRemaining)/i;
const BIRTH_TIME_OVERCLAIM_PATTERN = /(상승궁|라그나|정밀 명반|하우스).{0,24}(확실|분명|단정|결정|보장)/;
const BIRTH_PLACE_OVERCLAIM_PATTERN = /(라그나|상승궁|하우스|나크샤트라).{0,24}(확실|분명|단정|결정|보장)/;

function text(value, max = 1200) { return String(value || "").trim().slice(0, max); }
function count(value) { return Math.max(0, Number(value || 0)); }
function flag(env, name) { return env?.[name] === true || String(env?.[name] || "").toLowerCase() === "true"; }
function isDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(text(value, 10)); }
function safeRequestId(value) { return text(value, 120) || globalThis.crypto?.randomUUID?.() || `fusion-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
function objectIdOrString(value) {
  const normalized = text(value, 120);
  return mongoose.Types.ObjectId.isValid(normalized) ? new mongoose.Types.ObjectId(normalized) : normalized;
}

async function emitFusionFortuneStage(onStage, stage, extra) {
  if (typeof onStage !== "function") return;
  try {
    await onStage({ stage, status: "completed", ...(extra || {}) });
  } catch {
    // A disconnected progress stream never changes the daily-limit state.
  }
}

/**
 * 회당 결제 증빙 판정. 결제 지식(env·featureKey·verifyPerUsePayment)은 라우트가 소유하고
 * 여기서는 콜백만 부른다.
 *
 * 🔴 예외는 "결제 안 함"이 아니라 "확인 못 함"이다 — degraded 로 올려 503 을 만든다.
 * 402 로 내리면 이미 결제한 사용자가 3만원을 내고도 결과를 못 받는다.
 */
async function resolveFusionFortunePaidAccess(resolvePaidAccess, context) {
  if (typeof resolvePaidAccess !== "function") return { ok: false, degraded: false };
  try {
    const verdict = await resolvePaidAccess(context);
    return { ok: verdict?.ok === true, degraded: verdict?.degraded === true };
  } catch {
    return { ok: false, degraded: true };
  }
}

function throwIfFusionFortuneAborted(signal) {
  if (!signal?.aborted) return;
  const error = new Error("fusion_fortune_cancelled");
  error.code = FUSION_FORTUNE_ERROR_CODES.CANCELLED;
  throw error;
}

export function isFusionFortuneUiEnabled(env = {}) { return flag(env, "ENABLE_FUSION_FORTUNE_UI"); }
export function isFusionFortuneApiEnabled(env = {}) { return flag(env, "ENABLE_FUSION_FORTUNE_API"); }
export function isFusionFortuneMockFlowEnabled(env = {}) { return flag(env, "ENABLE_FUSION_FORTUNE_MOCK_FLOW"); }
// 🔴 키 이름은 pickGeminiKeys() 하나만 본다. 예전에는 GEMINI_API_KEY/GOOGLE_API_KEY 만 확인해서,
//    정본 시크릿인 GEMINIF_API_KEY 만 있는 프로덕션에서 생성 경로는 키를 찾는데 이 게이트만 막혀
//    결제 후 503(FEATURE_DISABLED)이 났다. 게이트가 자기가 지키는 호출보다 엄격하면 안 된다.
export function isFusionFortuneRealLlmAllowed(env = {}) {
  return flag(env, "ENABLE_FUSION_FORTUNE_REAL_LLM")
    && flag(env, "ALLOW_FUSION_FORTUNE_REAL_LLM")
    && env.NODE_ENV !== "test"
    && pickGeminiKeys().some((name) => Boolean(env[name]));
}

export function getFusionFortuneDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function getFusionFortuneNextResetAt(now = new Date()) {
  const key = getFusionFortuneDateKey(now);
  const [year, month, day] = key.split("-").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day + 1, -9, 0, 0);
  return new Date(utcGuess).toISOString();
}

export function normalizeFusionFortuneInput(input = {}) {
  const birthDate = text(input.birthDate, 10);
  const birthTimeUnknown = input.birthTimeUnknown === true || !text(input.birthTime, 5);
  const birthTime = birthTimeUnknown ? "" : text(input.birthTime, 5);
  if (!isDate(birthDate) || (!birthTimeUnknown && !/^\d{2}:\d{2}$/.test(birthTime))) {
    const error = new Error("생년월일과 생시를 확인해 주세요."); error.code = FUSION_FORTUNE_ERROR_CODES.INVALID_INPUT; throw error;
  }
  let birthPlace;
  if (input.birthPlace && typeof input.birthPlace === "object" && !Array.isArray(input.birthPlace)) {
    const latitude = Number(input.birthPlace.latitude);
    const longitude = Number(input.birthPlace.longitude);
    const timezone = text(input.birthPlace.timezone, 80);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !timezone) {
      const error = new Error("출생지를 확인해 주세요."); error.code = FUSION_FORTUNE_ERROR_CODES.INVALID_INPUT; throw error;
    }
    birthPlace = {
      city: text(input.birthPlace.city, 80) || undefined,
      country: text(input.birthPlace.country, 80) || undefined,
      latitude: Math.round(latitude * 10000) / 10000,
      longitude: Math.round(longitude * 10000) / 10000,
      timezone,
    };
  }
  return {
    birthDate,
    birthTime,
    birthTimeUnknown,
    calendarType: text(input.calendarType, 10) === "lunar" ? "lunar" : "solar",
    gender: ["female", "male", "unspecified"].includes(text(input.gender, 20)) ? text(input.gender, 20) : "unspecified",
    nickname: text(input.nickname, 40),
    topic: text(input.topic, 80) || "삶의 전반적인 흐름",
    concern: text(input.concern, 1000),
    birthPlace,
  };
}

const FUSION_TAROT_CARD_IDS = Object.freeze(["major_fool", "major_magician", "major_high_priestess", "major_empress", "major_emperor", "major_lovers", "major_chariot", "major_strength", "major_hermit", "major_wheel_of_fortune", "major_justice", "major_temperance", "major_star", "major_sun", "major_world"]);

// 카드 선택은 서버 컨텍스트 생성 단계에서만 수행한다. LLM은 이 id와 position만 해석하며 새 카드를 만들 수 없다.
export function selectFusionFortuneTarotSpread(input = {}) {
  const seed = `${text(input.birthDate, 10)}|${text(input.birthTime, 5)}|${text(input.topic, 80)}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  const positions = ["core", "saju_bridge", "ziwei_bridge", "vedic_bridge", "relationship_bridge", "action_bridge"];
  return {
    spreadType: "fusion_six_system_bridge",
    cards: positions.map((position, index) => {
      const cardId = FUSION_TAROT_CARD_IDS[Math.abs(hash + index * 7) % FUSION_TAROT_CARD_IDS.length];
      const card = TAROT_CARDS.find((candidate) => candidate.id === cardId);
      const orientation = ((hash >>> (index % 16)) & 1) === 1 ? "upright" : "reversed";
      const meaning = orientation === "reversed" ? card?.reversed : card?.upright;
      return {
        position,
        positionKey: position,
        cardId,
        name: text(card?.nameKo || card?.nameEn, 100),
        orientation,
        meaningSummary: text(meaning?.coreMeaning || meaning?.psychologicalMeaning || meaning?.advice?.[0], 280),
      };
    }),
  };
}

export async function buildFusionFortuneContext(input, options = {}) {
  const normalized = normalizeFusionFortuneInput(input);
  const topic = normalized.topic.includes("연애") || normalized.topic.includes("관계")
    ? "love"
    : normalized.topic.includes("일") || normalized.topic.includes("돈")
      ? "money_work"
      : normalized.topic.includes("마음") || normalized.topic.includes("회복")
        ? "mind"
        : "daily";
  const questionFocus = buildFortuneQuestionFocus({ concern: normalized.concern, topic });
  const systems = {};
  const limitations = [];
  const systemInsights = {};
  // This order is the public premium-stream contract. Each event is emitted
  // only after the corresponding calculator completes successfully.
  const categories = ["saju", "ziwei", "sukuyo", "vedic", "astrology", "tarot"];
  for (const category of categories) {
    const guardian = await buildGuardianFortuneContext({
      birthDate: normalized.birthDate,
      birthTime: normalized.birthTime || undefined,
      birthTimeUnknown: normalized.birthTimeUnknown,
      birthPlace: normalized.birthPlace,
      calendarType: normalized.calendarType,
      gender: normalized.gender === "unspecified" ? "unknown" : normalized.gender,
      topic,
      category,
      mode: "yeoni",
      concern: normalized.concern.slice(0, 120) || undefined,
    }, {
      ...options,
      fusionTarot: category === "tarot",
      tarotSeed: options.tarotSeed || `${normalized.topic}|${normalized.birthTimeUnknown ? "unknown" : "known"}`,
    });
    if (!guardian?.ok || !guardian.context || guardian.context.availableSystems?.length !== 1 || guardian.context.availableSystems[0] !== category || !guardian.context[category]) {
      return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.CONTEXT_FAILED, failedSystem: category };
    }
    systems[category] = guardian.context[category];
    if (category === "tarot" && (!Array.isArray(systems.tarot.cards) || systems.tarot.cards.length !== 6)) {
      return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.CONTEXT_FAILED, failedSystem: "tarot" };
    }
    systemInsights[category] = guardian.context.integratedInsight;
    limitations.push(...(guardian.context.unavailableClaims || []));
    await emitFusionFortuneStage(options.onStage, category);
  }
  const integratedInsight = buildIntegratedInsight({ topic, results: systems, hasConcern: Boolean(normalized.concern) });
  return {
    ok: true,
    context: {
      version: "fusion-fortune.v1",
      birthTimeKnown: !normalized.birthTimeUnknown,
      birthPlaceKnown: Boolean(normalized.birthPlace),
      systems,
      tarotSpread: {
        spreadType: systems.tarot.spreadType,
        spreadId: systems.tarot.spreadId,
        cards: systems.tarot.cards,
      },
      integratedInsight: { ...integratedInsight, systemInsights },
      limitations: [...new Set(limitations)],
      topic: normalized.topic,
      questionFocus,
      // Privacy boundary: no raw birth date, time, or concern is retained in the result context.
      inputSummary: { calendarType: normalized.calendarType, gender: normalized.gender, topic: normalized.topic },
    },
  };
}

function collectContextEvidence(value, output = [], key = "") {
  if (output.length >= 10 || value === null || value === undefined) return output;
  if (typeof value === "string") {
    const normalized = text(value, 360);
    if (normalized.length >= 8 && !/^[a-z]+(?:[._-][a-z0-9]+)+$/i.test(normalized)) output.push(normalized);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectContextEvidence(item, output, key));
    return output;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([childKey, item]) => {
      if (["evidence", "engine", "spreadId", "questionType"].includes(childKey)) return;
      collectContextEvidence(item, output, childKey);
    });
  }
  return [...new Set(output)];
}

const FUSION_FALLBACK_PROFILES = Object.freeze({
  saju: { focus: "타고난 기질이 계절과 환경을 만날 때 달라지는 힘의 배분", strength: "시작할 때의 추진력과 끝까지 지키는 지속력", shadow: "강한 오행의 장점이 서두름이나 고집으로 바뀌는 순간", relationship: "십성이 보여주는 주고받음과 책임의 습관", work: "재성과 관성이 드러내는 자원 관리와 역할 선택", timing: "월지의 계절감에 맞춰 힘을 보태거나 덜어낼 시기", action: "해야 할 일을 오행의 균형처럼 늘릴 것과 줄일 것으로 나누기" },
  ziwei: { focus: "각 궁이 맡은 삶의 무대와 그 안에서 반복되는 역할", strength: "명궁의 기본 태도와 관록궁에서 살아나는 사회적 역량", shadow: "주요 별의 강점이 과도한 책임감으로 굳는 순간", relationship: "부처궁이 비추는 친밀감의 역할과 기대", work: "관록궁과 재백궁을 함께 보며 정하는 성과와 자원의 기준", timing: "복덕궁의 회복 상태를 살핀 뒤 다음 역할을 맡을 시기", action: "내 몫과 타인의 몫을 구분해 이번 주 책임 범위를 적기" },
  vedic: { focus: "행성과 달이 만드는 무의식의 리듬과 오래된 학습 패턴", strength: "라시와 나크샤트라가 보여주는 집중력과 회복 방식", shadow: "익숙한 반응을 운명처럼 되풀이하려는 관성", relationship: "달의 안정 욕구와 관계에서 기대하는 정서적 안전", work: "다샤의 큰 흐름 안에서 능력을 훈련하고 쓰는 순서", timing: "빠른 성취보다 현재 주기의 배움을 충분히 소화할 시기", action: "반복되는 감정 반응 앞에 사실을 확인하는 질문 하나 두기" },
  sukuyo: { focus: "본명숙이 보여주는 친밀감의 속도와 관계의 거리", strength: "상대의 분위기를 읽고 관계의 온도를 조절하는 감각", shadow: "배려가 지나쳐 내 요구를 뒤로 미루는 순간", relationship: "가까워질 때와 잠시 숨을 고를 때의 감정 반응", work: "사회적 관계에서 신뢰를 쌓되 에너지를 과소비하지 않는 방식", timing: "답을 재촉하지 않고 서로의 속도가 맞는지 확인할 시기", action: "편안한 거리와 불편한 경계를 각각 한 문장으로 말하기" },
  astrology: { focus: "태양의 방향과 달의 안전 욕구가 만나는 선택 패턴", strength: "금성과 화성이 보여주는 매력의 표현과 행동의 추진력", shadow: "토성의 책임이 자기검열이나 지연으로 굳는 순간", relationship: "감정의 달과 관계 취향의 금성 사이에서 맞추는 속도", work: "태양의 목표를 현실적인 일정과 역할로 번역하는 방식", timing: "현재 확인된 행성 상징을 행동의 준비도로 바꿔 읽을 시기", action: "원하는 모습과 실제로 편안한 조건을 나눠 적기" },
  tarot: { focus: "서버가 펼친 여섯 카드 사이에서 이어지는 장면과 선택", strength: "첫 카드의 핵심 주제를 다음 카드의 행동으로 옮기는 힘", shadow: "불편한 상징 하나만 붙잡아 전체 흐름을 비관하는 습관", relationship: "관계 위치의 카드가 권하는 표현과 기다림의 균형", work: "현실 위치와 행동 위치의 카드가 보여주는 우선순위", timing: "카드 배열의 순서를 사건 예언이 아닌 준비의 순서로 읽는 시기", action: "각 카드에서 지금 할 수 있는 동사 하나씩 골라 실행 순서 만들기" },
  integrated: { focus: "여섯 체계의 공통 신호와 서로 다르게 말하는 지점", strength: "여러 관점을 하나의 현실적인 선택 기준으로 묶는 힘", shadow: "많은 해석 속에서 오히려 결정을 미루는 순간", relationship: "사랑과 인간관계에서 되풀이되는 속도와 경계의 문제", work: "일과 돈에서 능력을 반복 가능한 구조로 바꾸는 방식", timing: "공통 신호가 생활에서 실제로 확인되는지 관찰할 시기", action: "공통 조언 하나와 서로 다른 조언 하나를 구분해 기록하기" },
  action: { focus: "해석을 오늘과 이번 주의 행동으로 옮기는 순서", strength: "작게 시험하고 결과를 다음 판단 근거로 남기는 힘", shadow: "불안을 줄이려고 한 번에 크게 바꾸려는 순간", relationship: "상대의 답을 정하기보다 내가 지킬 경계를 표현하는 방식", work: "시간과 돈이 새는 지점을 먼저 막고 확장하는 방식", timing: "되돌릴 수 있는 작은 실험으로 흐름을 확인할 시기", action: "오늘 확인할 사실 하나와 멈출 습관 하나를 정하기" },
  closing: { focus: "운세를 정답이 아니라 선택을 비추는 지도로 사용하는 태도", strength: "나의 패턴을 알아차리고 더 나은 방향을 다시 고르는 힘", shadow: "해석을 확정된 운명으로 받아들이는 순간", relationship: "나와 타인의 속도를 함께 존중하는 방식", work: "작은 완료를 쌓아 삶의 신뢰를 회복하는 방식", timing: "지금 할 수 있는 선택부터 차분히 시작할 시기", action: "가장 마음에 남은 조언을 일주일 동안 한 가지 행동으로 실천하기" },
});

function composeExpertReading(intro, vocabulary, target = 1250, evidence = [], domain = "integrated") {
  const profile = FUSION_FALLBACK_PROFILES[domain] || FUSION_FALLBACK_PROFILES.integrated;
  const lenses = [
    `이 영역의 핵심 관찰 대상은 “${profile.focus}”입니다.`,
    `강점으로 확인되는 모습은 “${profile.strength}”입니다. 이미 잘하고 있는 방식을 의식적으로 반복할수록 안정됩니다.`,
    `주의할 그림자는 “${profile.shadow}”입니다. 이때에는 결과보다 반응의 속도를 먼저 점검해 보세요.`,
    `관계에서 중요한 단서는 “${profile.relationship}”입니다. 상대의 마음을 확정하기보다 실제 대화에서 확인할 여백을 남겨야 합니다.`,
    `일과 돈에서 권하는 방식은 “${profile.work}”입니다. 한 번의 큰 승부보다 기록하고 반복할 수 있는 구조가 더 오래 갑니다.`,
    `가까운 흐름의 관찰 기준은 “${profile.timing}”입니다. 특정 사건을 예고하기보다 준비 상태를 확인하는 기준으로 쓰는 편이 안전합니다.`,
    `현실에서 시작할 행동은 “${profile.action}”입니다. 작은 실행의 결과가 다음 선택을 더 정확하게 만듭니다.`,
    `${profile.focus}에 대한 해석은 가능성과 패턴을 읽는 참고 자료입니다. 실제 상황과 맞지 않는 부분은 내려놓고, 생활에서 반복해 확인되는 신호만 선택 기준으로 남겨도 충분합니다.`,
    `선택이 복잡할 때의 핵심 기준은 “${profile.focus}”입니다. 지금 바꿀 수 있는 것과 기다려야 하는 것을 나누면 판단의 피로가 줄어듭니다.`,
    `강점으로 확인된 내용은 “${profile.strength}”입니다. 혼자 애쓰기보다 기록과 대화를 통해 재현 가능한 방식으로 만들면 생활 속 힘으로 자리 잡습니다.`,
    `주의 신호는 “${profile.shadow}”입니다. 이 모습이 보이면 자신을 탓하기보다 속도를 늦추고 처음 세운 기준이 현재에도 맞는지 확인해 보세요.`,
    `관계에서 관찰할 주제는 “${profile.relationship}”입니다. 말의 의미뿐 아니라 연락의 간격, 약속을 지키는 방식, 갈등 뒤 회복하는 행동을 함께 보는 편이 정확합니다.`,
    `일과 돈의 현실 과제는 “${profile.work}”입니다. 성과의 크기보다 들인 시간과 다시 사용할 수 있는 결과물을 남기는 것이 중요합니다.`,
    `시기 신호는 “${profile.timing}”입니다. 이때에는 새로운 약속을 늘리기보다 이미 시작한 일의 마감과 회복 시간을 확보해 보세요.`,
    `첫 행동은 “${profile.action}”입니다. 실행한 뒤에는 잘했는지를 즉시 평가하지 말고, 마음과 상황의 변화를 하루 뒤에 다시 기록해 보세요.`,
    `이 체계가 말하는 가능성은 다른 체계의 공통 신호와 함께 볼 때 더 유용합니다. 겹치는 조언은 우선순위로 삼고, 엇갈리는 조언은 상황에 따라 달라질 선택지로 남깁니다.`,
    `“${profile.focus}”를 한 주 단위로 관찰하면 해석이 훨씬 구체적으로 바뀝니다. 요일마다 반응이 달라지는 지점이 있다면 그것이 지금 다뤄야 할 실제 변수입니다.`,
    `“${profile.strength}”은 상황이 좋을 때보다 피곤하거나 시간이 없을 때 더 잘 드러납니다. 여유가 없는 날에도 유지되는 방식이 무엇인지 살펴보면 진짜 강점의 자리를 알 수 있습니다.`,
    `“${profile.shadow}”이 나타나는 순간에는 대개 정보가 부족한 상태에서 결론을 먼저 내리게 됩니다. 판단을 하루 미루고 사실을 한 가지만 더 확인해도 결과가 달라집니다.`,
    `“${profile.relationship}”은 갈등 자체보다 갈등 뒤의 회복 속도에서 더 정확하게 드러납니다. 서로 다시 말을 거는 데 걸리는 시간이 관계의 실제 상태를 보여 줍니다.`,
    `“${profile.work}”에서 가장 자주 새는 것은 돈보다 시간과 주의입니다. 어디에 시간이 들어가는지를 한 주만 기록해도 조정할 지점이 눈에 보입니다.`,
    `“${profile.timing}”은 달력의 날짜가 아니라 준비 상태의 문제입니다. 조건이 갖춰졌는지를 먼저 확인하면 시기를 기다리는 불안이 줄어듭니다.`,
    `“${profile.action}”을 실행할 때는 완성도를 목표로 삼지 말고 되돌릴 수 있는 크기로 시작하세요. 작게 시작한 일은 수정이 쉽고, 수정이 쉬운 일은 오래 갑니다.`,
    `해석이 실제와 다르게 느껴진다면 그 차이 자체가 정보입니다. 어떤 부분이 맞고 어떤 부분이 어긋나는지 적어 두면, 다음 상담에서 훨씬 정확한 질문을 할 수 있습니다.`,
    `“${profile.focus}”와 관련해 이미 시도해 본 방법이 있다면 그 결과를 먼저 살펴보세요. 새로운 조언보다 지난 시도의 기록이 더 나은 판단 근거가 되는 경우가 많습니다.`,
    `마지막으로 “${profile.action}”은 한 번의 결심이 아니라 반복 가능한 습관으로 옮길 때 힘이 생깁니다. 이번 주에 두 번만 반복해도 다음 선택의 기준이 분명해집니다.`,
  ];
  const evidenceText = evidence.length
    ? `서버 계산에서 확인된 핵심 근거는 ${evidence.slice(0, 3).map((item) => text(item, 180)).join(" ")} 이 근거는 결과를 고정하는 판정이 아니라, 실제 생활에서 반복되는 반응과 선택을 확인하는 출발점으로 사용합니다. `
    : "정밀 계산이 제한된 부분은 값을 추정하지 않고, 확인 가능한 범위와 해석의 한계를 먼저 밝힙니다. ";
  let value = `${intro} ${vocabulary} ${evidenceText}`;
  let round = 0;
  while (value.length < target && round < lenses.length) {
    value += `${lenses[round]} `;
    round += 1;
  }
  return value.trim();
}

function section(title, intro, vocabulary, length = 2250, evidence = [], domain = "integrated") {
  return {
    title,
    content: composeExpertReading(intro, vocabulary, length, evidence, domain),
    keyPoints: ["강점이 과해지는 순간까지 함께 관찰하기", "감정과 사실을 나누어 선택 기준을 기록하기", "작은 실행의 결과를 다음 판단 근거로 남기기"],
  };
}


/**
 * 결정론 폴백의 최종 교차 판정.
 *
 * 지어낸 합의를 쓰지 않는다 — 입장은 그 체계에 대해 서버가 **실제로 계산한 근거가 있는지**로
 * 정한다. 근거가 있으면 결론을 지지(agree), 부분적이면 조건부(conditional), 아예 없으면
 * 속도를 늦추라(caution)로 읽는다. confidence 는 이 분포에서 나온다.
 */
function buildFallbackFinalVerdict(context = {}) {
  const insight = context?.integratedInsight || {};
  const headline = text(insight.adviceDirection, 90)
    || "지금은 방향을 바꾸기보다, 이미 정한 방향에서 힘의 배분을 조정할 때입니다.";
  const systemVerdicts = FUSION_VISUAL_SYSTEMS.map((system) => {
    // 확정값이 몇 개나 채워졌는지로 읽는다. collectContextEvidence 는 8자 이상만 세어
    // 짧은 확정값(일간·본명숙 등)을 통째로 놓치므로 여기서는 채움 개수를 본다.
    const source = context?.systems?.[system.key];
    const filled = source && typeof source === "object"
      ? Object.values(source).filter((item) => (Array.isArray(item) ? item.length > 0 : String(item || "").trim().length >= 2)).length
      : 0;
    const stance = filled >= 3 ? "agree" : filled >= 1 ? "conditional" : "caution";
    const note = stance === "agree"
      ? `${system.label}의 확정값이 이 결론과 같은 방향을 가리킵니다.`
      : stance === "conditional"
        ? `${system.label}은 조건이 맞을 때만 같은 방향입니다. 근거가 부분적입니다.`
        : `${system.label}은 이번 입력으로 확인할 값이 부족해 속도를 늦추라고 읽습니다.`;
    return { key: system.key, stance, note };
  });
  return {
    headline,
    systemVerdicts,
    rationale: composeExpertReading(
      "여섯 체계를 각각 판정한 뒤 남는 결론은 하나입니다.",
      "같은 방향을 가리키는 체계가 많을수록 그 조언은 상황이 바뀌어도 잘 흔들리지 않고, 조건부나 주의로 읽히는 체계가 섞일수록 한 번에 크게 움직이기보다 되돌릴 수 있는 크기로 시험하는 편이 안전합니다.",
      820,
      [],
      "integrated",
    ),
    doNow: [
      text(insight.luckyActionHint, 110) || "이번 주에 확인할 사실 하나를 문장으로 적어 두기",
      "되돌릴 수 있는 크기로 한 가지만 먼저 시험해 보기",
      "결과가 아니라 반응을 기록해 다음 판단의 근거로 남기기",
    ],
    avoid: [
      text(insight.cautionPattern, 110) || "불안한 마음으로 답을 재촉하는 것",
      "근거를 더 모으기 전에 한 번에 크게 바꾸는 것",
    ],
  };
}

export async function generateFusionFortuneWithMockLLM({ context = {}, now = new Date() } = {}) {
  const uncertainty = context.birthTimeKnown ? "생시 정보를 참고한 흐름" : "생시가 없어 시간 기반 정밀 해석은 유보한 흐름";
  const evidence = Object.fromEntries(["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map((system) => [system, collectContextEvidence(context.systems?.[system]) ]));
  const integratedEvidence = [...new Set(Object.values(evidence).flat())].slice(0, 12);
  const tarotNames = Array.isArray(context.tarotSpread?.cards)
    ? context.tarotSpread.cards.map((card) => text(card?.name, 100)).filter(Boolean)
    : [];
  return {
    title: "여섯 개의 별자리에서 만난 당신의 흐름",
    openingMessage: `서로 다른 여섯 체계가 공통으로 비추는 것은, 지금의 당신이 방향을 고르는 과정에 있다는 점입니다. ${uncertainty}을 바탕으로 삶의 전반을 차분히 엮어 보겠습니다.`,
    executiveSummary: composeExpertReading("이번 초융합 운세의 핵심은 힘을 한곳에 모으고 관계와 일의 리듬을 함께 정돈하는 데 있습니다.", "여섯 체계는 표현 방식은 달라도 선택을 서두를 때 생기는 소모와 기준을 세운 뒤 살아나는 집중력을 공통으로 비춥니다.", 900, [], "integrated"),
    sajuSection: section("사주: 기질과 선택의 뿌리", "사주의 일간과 월지, 오행과 십성은 일을 시작하고 관계를 유지하는 기본 리듬을 보여줍니다.", "오행은 많고 적음을 좋고 나쁨으로 가르기보다, 추진력·정리력·표현력·현실 감각·회복력 중 무엇이 자연스럽고 무엇이 의식적인 연습을 필요로 하는지 살피는 언어입니다.", 2250, evidence.saju, "saju"),
    ziweiSection: section("자미두수: 삶의 무대와 역할", "자미두수의 궁위와 주요 별은 사회적 역할, 재능의 배치, 관계에서 책임을 느끼는 지점을 비춥니다.", "명궁은 기본 태도, 관록궁은 일의 방식, 재백궁은 자원을 다루는 습관, 부처궁은 가까운 관계의 역할, 복덕궁은 혼자 있을 때의 회복 방식을 서로 연결해 읽습니다.", 2250, evidence.ziwei, "ziwei"),
    vedicSection: section("베다점: 무의식의 리듬", "베다점의 달과 나크샤트라는 감정이 반응하는 속도와 오래 반복된 배움의 패턴을 살펴봅니다.", "라그나와 문사인, 나크샤트라와 다샤는 컨텍스트에 제공된 범위 안에서만 사용하며, 카르마는 벌이나 숙명이 아니라 되풀이해 배우게 되는 선택 습관으로 해석합니다.", 2250, evidence.vedic, "vedic"),
    sukuyoSection: section("숙요점: 관계의 거리감", "숙요점은 사람 사이의 거리와 감정이 닿는 방식, 가까워질 때와 숨을 고를 때를 보여줍니다.", "본명숙과 관계 리듬은 누가 옳은지를 판정하기보다 친밀감이 편안해지는 속도, 갈등 뒤 회복하는 방식, 사회적 관계에서 에너지를 배분하는 습관을 살피는 데 사용합니다.", 2250, evidence.sukuyo, "sukuyo"),
    astrologySection: section("점성술: 감정과 표현의 방향", "점성술은 태양과 달의 상징을 통해 원하는 삶과 실제 감정 반응이 만나는 지점을 해석합니다.", "태양은 의식적인 방향, 달은 정서적 안전, 금성과 화성은 관계의 취향과 행동, 토성은 책임과 성장의 시간을 뜻하며 상승궁은 생시가 확인된 범위에서만 다룹니다.", 2250, evidence.astrology, "astrology"),
    tarotSection: section("타로: 지금의 선택을 비추는 카드", "서버에서 선택된 여섯 장의 타로 배치는 현재의 흐름을 한 단계씩 정리하도록 돕는 상징으로 사용됩니다.", `서버가 선택한 카드는 ${tarotNames.join(", ") || "정해진 여섯 장"}입니다. 카드는 예언을 고정하는 도구가 아니라 핵심 주제, 체계 사이의 다리, 관계 반응, 다음 행동을 비추는 질문이며 이 목록 밖의 카드는 덧붙이지 않습니다.`, 2250, evidence.tarot, "tarot"),
    integratedReading: section("통합 해석: 하나의 상담으로 엮는 흐름", "여섯 체계가 함께 가리키는 핵심은 감정을 억누르거나 성급히 결론내리지 않고, 기준을 세워 현실의 행동으로 옮기는 과정입니다.", "공통 신호는 삶의 핵심 패턴으로, 서로 다른 신호는 상황별 선택지로 남깁니다. 사랑·일·돈·마음은 분리된 문제가 아니라 같은 선택 기준이 서로 다른 장면에서 나타난 결과로 연결해 읽습니다.", 3100, integratedEvidence, "integrated"),
    timingAndAction: { title: "가까운 시기와 현실적인 행동", content: composeExpertReading("가까운 시기에는 큰 결단보다 현재 가진 자원과 관계를 정리하는 작은 선택이 다음 기회를 만듭니다.", "시기 조언은 특정 사건을 예고하기보다 지금 준비할 것, 지켜볼 신호, 멈춰야 할 습관을 구분하는 데 초점을 둡니다.", 2050, [], "action"), luckyActions: ["이번 주 가장 중요한 일 하나를 문장으로 정리하기", "관계에서 원하는 경계를 부드럽게 말하기", "지출과 일정에서 반복되는 부담 한 가지 줄이기"], cautionPatterns: ["불안한 마음으로 답을 재촉하는 패턴", "남의 속도에 맞추다 내 계획을 놓치는 패턴", "준비 없이 한 번에 크게 바꾸려는 패턴"] },
    visualization: normalizeFusionVisualization(undefined, context, { now }),
    finalVerdict: buildFallbackFinalVerdict(context),
    closingMessage: composeExpertReading("운세는 정답을 대신 정하는 말이 아니라, 더 나은 선택을 하도록 비추는 지도입니다.", "오늘의 작은 정리와 솔직한 경계가 다음 흐름을 바꾸는 현실적인 출발점이 됩니다.", 850, [], "closing"),
    shareText: "여섯 개의 운세 체계를 하나의 상담으로 엮어, 지금의 나를 다시 읽어봤어요.",
  };
}

export function countFusionFortuneVisibleText(result = {}) {
  const verdict = result.finalVerdict || {};
  return [result.title, result.openingMessage, result.executiveSummary,
    verdict.headline, verdict.rationale, ...(verdict.systemVerdicts || []).map((item) => item?.note), ...(verdict.doNow || []), ...(verdict.avoid || []), ...SECTION_KEYS.flatMap((key) => [result[key]?.title, result[key]?.content, ...(result[key]?.keyPoints || [])]), result.timingAndAction?.title, result.timingAndAction?.content, ...(result.timingAndAction?.luckyActions || []), ...(result.timingAndAction?.cautionPatterns || []), result.closingMessage].join(" ").length;
}

function hasRepeatedLongSentence(result = {}) {
  const sections = [result.executiveSummary, ...SECTION_KEYS.map((key) => result[key]?.content), result.timingAndAction?.content, result.closingMessage];
  const seen = new Map();
  for (const sectionText of sections) {
    const uniqueInSection = new Set(String(sectionText || "").split(/(?<=[.!?。！？])\s+/).map((sentence) => sentence.replace(/\s+/g, " ").trim()).filter((sentence) => sentence.length >= 70));
    for (const sentence of uniqueInSection) seen.set(sentence, (seen.get(sentence) || 0) + 1);
  }
  return [...seen.values()].some((occurrences) => occurrences >= 3);
}

// 결과 계약에는 성격이 다른 두 판정이 섞여 있다. 이 구분이 "3만원 내고 0을 받는" 경로를 없앤다.
//  · 안전 — 개인정보 노출·위험 표현·타로 환각·생시/출생지 단정. 어기면 배달하지 않는다.
//  · 품질 — 분량 하한/상한·섹션 깊이·문장 반복. 미달이면 사유를 밝히고 강등 배달한다.
const FUSION_QUALITY_ISSUES = Object.freeze(new Set([
  "section_depth", "summary_or_action_depth", "final_verdict_depth", "repeated_sentence", "length",
]));

export const FUSION_DEGRADED_NOTICE = "일부 묶음이 목표 분량에 못 미친 상태로 전해 드립니다. 같은 요청으로 다시 시도하면 추가 결제 없이 새로 씁니다.";

/**
 * 결과 계약을 **끝까지** 평가해 위반을 순서대로 모은다.
 *
 * 🔴 왜 끝까지 평가하나: 예전에는 첫 위반에서 곧바로 반려했는데, 품질 판정(섹션 깊이·반복)이
 *    안전 판정(개인정보 노출·타로 환각)보다 **앞**에 있어서 "품질만 미달"인지 "안전도 위반"인지
 *    가릴 근거가 없었다. 그래서 결제가 끝난 결과를 강등 배달할지 정할 수 없었다.
 *    검사 순서는 예전 그대로다 — `validateFusionFortuneResult` 가 돌려주는 첫 위반이 바뀌지 않는다.
 */
export function evaluateFusionFortuneResult(result = {}, { birthTimeKnown = true, birthPlaceKnown = true, sensitiveValues = [], selectedTarotCards = [] } = {}) {
  const source = JSON.stringify(result || {});
  const issues = [];
  const sectionMinChars = (key) => (key === "integratedReading" ? FUSION_FORTUNE_LENGTH.integratedReading : FUSION_FORTUNE_LENGTH.section);
  if (REQUIRED_KEYS.some((key) => !text(result[key], 20000))) issues.push("missing_required");
  if (SECTION_KEYS.some((key) => text(result[key]?.content, 50000).length < sectionMinChars(key) || !Array.isArray(result[key]?.keyPoints) || result[key].keyPoints.length < 3)) issues.push("section_depth");
  if (text(result.executiveSummary, 50000).length < FUSION_FORTUNE_LENGTH.executiveSummary || text(result.timingAndAction?.content, 50000).length < FUSION_FORTUNE_LENGTH.timingAndAction) issues.push("summary_or_action_depth");
  // 시각화는 normalizeFusionVisualization 이 항상 채워 준다. 여기서 걸린다면 정규화를
  // 건너뛴 경로가 생겼다는 뜻이지, 모델이 못 쓴 게 아니다.
  if (!isFusionVisualizationShaped(result.visualization)) issues.push("missing_visualization");
  // 🔴 최종 교차 판정이 이 상품의 마지막 답이다. 없으면 여섯 해석만 남고 결론이 사라진다.
  const verdict = normalizeFusionFinalVerdict(result.finalVerdict);
  if (!verdict.ok) issues.push("final_verdict:" + verdict.reason);
  if (text(result.finalVerdict?.rationale, 50000).length < FUSION_FORTUNE_LENGTH.finalVerdictRationale) issues.push("final_verdict_depth");
  if (!Array.isArray(result.timingAndAction?.luckyActions) || result.timingAndAction.luckyActions.length < 3 || !Array.isArray(result.timingAndAction?.cautionPatterns) || result.timingAndAction.cautionPatterns.length < 3) issues.push("missing_actions");
  if (hasRepeatedLongSentence(result)) issues.push("repeated_sentence");
  if (FORBIDDEN.some((phrase) => source.includes(phrase))) issues.push("unsafe_phrase");
  if (INTERNAL_DATA_PATTERN.test(source)) issues.push("internal_data_exposed");
  const exposedSensitiveValue = sensitiveValues.map((value) => text(value, 100)).find((value) => value.length >= 4 && source.includes(value));
  if (exposedSensitiveValue) issues.push("private_input_exposed");
  if (!birthTimeKnown && BIRTH_TIME_OVERCLAIM_PATTERN.test(source)) issues.push("birth_time_overclaim");
  if (!birthPlaceKnown && BIRTH_PLACE_OVERCLAIM_PATTERN.test(source)) issues.push("birth_place_overclaim");
  const selectedNames = selectedTarotCards.map((card) => text(card?.name, 100)).filter(Boolean);
  if (selectedNames.length) {
    const tarotText = `${text(result.tarotSection?.title, 1000)} ${text(result.tarotSection?.content, 50000)} ${(result.tarotSection?.keyPoints || []).join(" ")}`;
    const knownNames = TAROT_CARDS.flatMap((card) => [text(card?.nameKo, 100), text(card?.nameEn, 100)]).filter(Boolean);
    const unexpected = knownNames.find((name) => !selectedNames.includes(name) && (tarotText.includes(`${name} 카드`) || tarotText.includes(`카드 ${name}`)));
    if (unexpected) issues.push("invented_tarot_card");
    if (selectedNames.some((name) => !tarotText.includes(name))) issues.push("missing_selected_tarot_card");
  }
  const length = countFusionFortuneVisibleText(result);
  if (length < FUSION_FORTUNE_LENGTH.total.min || length > FUSION_FORTUNE_LENGTH.total.max) issues.push("length");
  return {
    issues,
    length,
    safetyIssues: issues.filter((issue) => !FUSION_QUALITY_ISSUES.has(issue)),
    qualityIssues: issues.filter((issue) => FUSION_QUALITY_ISSUES.has(issue)),
  };
}

/** 계약 전체를 만족해야 통과. 첫 위반만 돌려주는 기존 계약 그대로다(가드 단언이 이 모양을 본다). */
export function validateFusionFortuneResult(result = {}, options = {}) {
  const evaluated = evaluateFusionFortuneResult(result, options);
  const firstIssue = evaluated.issues[0];
  if (!firstIssue) return { ok: true, value: result, length: evaluated.length };
  return {
    ok: false,
    errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID,
    issues: [firstIssue],
    ...(firstIssue === "length" ? { length: evaluated.length } : {}),
  };
}

/**
 * 배달 판정. 안전 위반이면 반려하고, 품질만 미달이면 사유와 함께 **강등 배달**한다.
 *
 * 🔴 왜 강등 배달인가: 결제는 생성 **전에** 끝난다. 검증 실패로 아무것도 주지 않으면 30,000원을
 *    낸 사용자가 0을 받는데, 최후 폴백까지 같은 검증기를 통과해야 했던 예전 구조에서는 입력에
 *    종속적인 판정(선택된 타로 카드 이름·생시 단정·분량 밴드) 하나가 걸리는 순간 **같은 requestId
 *    재시도가 영원히 같은 자리에서 죽었다.** 안전 판정은 그대로 막고 품질 판정만 열어 준다.
 */
export function resolveFusionFortuneDelivery(result = {}, options = {}) {
  const evaluated = evaluateFusionFortuneResult(result, options);
  if (evaluated.safetyIssues.length) {
    return { deliverable: false, tier: "rejected", errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: evaluated.issues, length: evaluated.length };
  }
  if (evaluated.qualityIssues.length) {
    return { deliverable: true, tier: "degraded", value: result, length: evaluated.length, issues: evaluated.qualityIssues, qualityNotice: FUSION_DEGRADED_NOTICE };
  }
  return { deliverable: true, tier: "full", value: result, length: evaluated.length, issues: [] };
}

export function parseFusionFortuneLLMResponse(rawResponse) {
  if (typeof rawResponse !== "string" || rawResponse.length === 0 || rawResponse.length > 120000) return { ok: false, errorCode: "FUSION_LLM_PARSE_FAILED" };
  const source = rawResponse.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const first = source.indexOf("{");
  const last = source.lastIndexOf("}");
  const candidates = [source, first >= 0 && last > first ? source.slice(first, last + 1) : ""].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return { ok: true, value: parsed };
    } catch {
      // A single repair call handles malformed provider JSON.
    }
  }
  return { ok: false, errorCode: "FUSION_LLM_PARSE_FAILED" };
}

function fusionValidationOptions(context = {}, input = {}) {
  return {
    birthTimeKnown: context.birthTimeKnown === true,
    birthPlaceKnown: context.birthPlaceKnown === true,
    sensitiveValues: [input.birthDate, input.birthTime, input.concern],
    selectedTarotCards: context.tarotSpread?.cards || [],
  };
}

function attachQuestionFocusedFusionReading(result, context = {}) {
  const focus = context?.questionFocus;
  if (!focus?.answerFrame || !focus?.actionFrame) return result;
  return {
    ...result,
    openingMessage: `질문에 바로 답하면, ${focus.answerFrame}가 이번 초융합 해석의 중심입니다. ${result.openingMessage}`,
    executiveSummary: `이번 리딩은 “${focus.label || "현재의 선택"}”을 두고 ${focus.answerFrame}를 살피는 데서 시작합니다. ${result.executiveSummary}`,
    timingAndAction: {
      ...result.timingAndAction,
      content: `${focus.actionFrame} ${result.timingAndAction?.content || ""}`.trim(),
    },
  };
}

async function buildValidatedFusionFallback({ context, input, now = new Date() }) {
  const result = attachQuestionFocusedFusionReading(await generateFusionFortuneWithMockLLM({ context, now }), context);
  // 🔴 최후 폴백은 품질 미달로 버리지 않는다. 여기서 undefined 를 돌려주면 결제가 끝난
  //    사용자가 받는 것이 0 이 되고, 결정론 폴백이라 재시도해도 결과가 같다.
  return resolveFusionFortuneDelivery(result, fusionValidationOptions(context, input));
}

// ── 4그룹 병렬 생성 ───────────────────────────────────────────────────
// 그룹 하나의 LLM 대기 상한. 네 그룹이 병렬이라 1차 벽시계는 가장 느린 그룹 기준이다.
const FUSION_GROUP_TIMEOUT_MS = 55000;
// callGeminiJsonWithRetry 기본값 attempts=3 은 최악 timeout×3 을 쓴다 — 그룹은 2회로 묶는다.
const FUSION_GROUP_ATTEMPTS = 2;
// 목표의 이 비율에 못 미친 그룹은 다시 부른다. 낮게 잡으면 65%짜리 그룹이 통과해 합계가 무너진다.
const FUSION_GROUP_RETRY_RATIO = 0.8;
// 생성 전체(1차 병렬 + 미달 그룹 재생성)의 벽시계 예산.
const FUSION_GENERATION_DEADLINE_MS = 120000;
const FUSION_GROUP_RETRY_MIN_BUDGET_MS = 25000;
/**
 * 한국어 1자 ≈ 1.6 출력 토큰(JSON 키·이스케이프 몫 포함) + 여유.
 * 단일 호출 시절의 운영 노브 FUSION_FORTUNE_MAX_OUTPUT_TOKENS 는 이제 **그룹당** 상한으로 읽는다.
 */
function fusionGroupTokens(group, env = {}) {
  const override = Number(env.FUSION_FORTUNE_MAX_OUTPUT_TOKENS);
  if (Number.isFinite(override) && override > 0) return Math.min(16384, Math.max(3000, Math.round(override)));
  return Math.min(12000, Math.round(group.targetChars * 1.8) + 900);
}

/** 그룹 1회 호출의 LLM 대기 상한. FUSION_FORTUNE_LLM_TIMEOUT_MS 로 덮을 수 있다. */
function fusionGroupTimeoutMs(env = {}) {
  const override = Number(env.FUSION_FORTUNE_LLM_TIMEOUT_MS);
  if (Number.isFinite(override) && override > 0) return Math.min(90000, Math.max(20000, Math.round(override)));
  return FUSION_GROUP_TIMEOUT_MS;
}

function pickKeys(source, keys) {
  return keys.reduce((picked, key) => {
    const value = source?.[key];
    const empty = value === null || value === undefined || (typeof value === "string" && !value.trim());
    return empty ? picked : { ...picked, [key]: value };
  }, {});
}

/** 그룹이 실제로 쓴 본문 분량. visualization 같은 구조 데이터는 세지 않는다. */
function countFusionGroupChars(source, group) {
  return group.keys.reduce((sum, key) => {
    const value = source?.[key];
    if (typeof value === "string") return sum + value.length;
    if (value && typeof value === "object" && typeof value.content === "string") return sum + value.content.length;
    return sum;
  }, 0);
}

/**
 * 그룹 단위 검증. 병합 전에 여기서 걸러야 한 그룹의 잘못 때문에 나머지 세 그룹의 정상
 * 결과까지 버려지지 않는다(전체 검증만 두면 그때는 통째로 폴백이 나간다).
 * 문장 반복(hasRepeatedLongSentence)과 총 분량은 그룹을 가로지르므로 전체 검증이 맡는다.
 */
export function validateFusionFortuneGroup(value = {}, group, { birthTimeKnown = true, birthPlaceKnown = true, sensitiveValues = [], selectedTarotCards = [] } = {}) {
  const missing = group.keys.filter((key) => key !== "visualization" && !text(value[key], 200) && !text(value[key]?.content, 200));
  if (missing.length) return { ok: false, issue: "missing_keys", detail: missing.join(",") };
  for (const key of group.keys) {
    if (!SECTION_KEYS.includes(key)) continue;
    const minChars = key === "integratedReading" ? FUSION_FORTUNE_LENGTH.integratedReading : FUSION_FORTUNE_LENGTH.section;
    if (text(value[key]?.content, 50000).length < minChars) return { ok: false, issue: "section_depth", detail: key };
    if (!Array.isArray(value[key]?.keyPoints) || value[key].keyPoints.length < 3) return { ok: false, issue: "missing_key_points", detail: key };
  }
  if (group.keys.includes("executiveSummary") && text(value.executiveSummary, 50000).length < FUSION_FORTUNE_LENGTH.executiveSummary) return { ok: false, issue: "summary_depth" };
  if (group.keys.includes("timingAndAction")) {
    if (text(value.timingAndAction?.content, 50000).length < FUSION_FORTUNE_LENGTH.timingAndAction) return { ok: false, issue: "action_depth" };
    if (!Array.isArray(value.timingAndAction?.luckyActions) || value.timingAndAction.luckyActions.length < 3) return { ok: false, issue: "missing_actions" };
    if (!Array.isArray(value.timingAndAction?.cautionPatterns) || value.timingAndAction.cautionPatterns.length < 3) return { ok: false, issue: "missing_actions" };
  }
  if (group.keys.includes("closingMessage") && text(value.closingMessage, 50000).length < FUSION_FORTUNE_LENGTH.closingMessage) return { ok: false, issue: "closing_depth" };
  if (group.keys.includes("finalVerdict")) {
    const verdict = normalizeFusionFinalVerdict(value.finalVerdict);
    if (!verdict.ok) return { ok: false, issue: "final_verdict", detail: verdict.reason };
    if (text(value.finalVerdict?.rationale, 50000).length < FUSION_FORTUNE_LENGTH.finalVerdictRationale) return { ok: false, issue: "final_verdict_depth" };
  }

  const source = JSON.stringify(value || {});
  if (FORBIDDEN.some((phrase) => source.includes(phrase))) return { ok: false, issue: "unsafe_phrase" };
  if (INTERNAL_DATA_PATTERN.test(source)) return { ok: false, issue: "internal_data_exposed" };
  if (sensitiveValues.map((item) => text(item, 100)).some((item) => item.length >= 4 && source.includes(item))) return { ok: false, issue: "private_input_exposed" };
  if (!birthTimeKnown && BIRTH_TIME_OVERCLAIM_PATTERN.test(source)) return { ok: false, issue: "birth_time_overclaim" };
  if (!birthPlaceKnown && BIRTH_PLACE_OVERCLAIM_PATTERN.test(source)) return { ok: false, issue: "birth_place_overclaim" };

  if (group.keys.includes("tarotSection")) {
    const selectedNames = selectedTarotCards.map((card) => text(card?.name, 100)).filter(Boolean);
    if (selectedNames.length) {
      const tarotText = `${text(value.tarotSection?.title, 1000)} ${text(value.tarotSection?.content, 50000)} ${(value.tarotSection?.keyPoints || []).join(" ")}`;
      const knownNames = TAROT_CARDS.flatMap((card) => [text(card?.nameKo, 100), text(card?.nameEn, 100)]).filter(Boolean);
      if (knownNames.some((name) => !selectedNames.includes(name) && (tarotText.includes(`${name} 카드`) || tarotText.includes(`카드 ${name}`)))) return { ok: false, issue: "invented_tarot_card" };
      if (selectedNames.some((name) => !tarotText.includes(name))) return { ok: false, issue: "missing_selected_tarot_card" };
    }
  }
  return { ok: true, value };
}

/** 기본 그룹 호출 — 잘림 반응형 재시도와 폴백 JSON 정화를 공용 헬퍼에 맡긴다. */
function callFusionGroupProvider(env, userPrompt, options = {}) {
  const { attempts, maxOutputTokens, ...rest } = options;
  return callGeminiJsonWithRetry(env, userPrompt, {
    ...rest,
    attempts,
    baseTokens: maxOutputTokens,
    capTokens: Math.round(maxOutputTokens * 1.3),
  });
}

function buildFusionShortfallInstruction(group, currentChars) {
  return [
    `직전 시도는 이 부분을 ${Number(currentChars).toLocaleString("ko-KR")}자로 썼습니다. 목표 ${Number(group.targetChars).toLocaleString("ko-KR")}자에 크게 못 미칩니다.`,
    "처음부터 다시 쓰되, 위의 키별 최소 분량을 반드시 채우세요.",
    "같은 말을 바꿔 쓰지 말고, 아직 인용하지 않은 서버 확정값을 새로 끌어와 근거를 더하고 현실의 장면으로 풀어 늘리세요.",
  ].join("\n");
}

/**
 * 초융합 생성 — 네 그룹을 병렬로 부르고 하나의 결과 JSON으로 병합한다.
 *
 * 왜 병렬인가: 목표 20,000자를 단일 호출로 뽑으려면 Gemini 출력 상한(16,384토큰)과 요청
 * 시간 예산이 먼저 바닥난다. 실제로는 매번 잘려 짧은 결과가 30,000원 결제로 배달됐다.
 * 그룹당 3,400~6,600자면 한 호출이 시간 안에 완주한다. 선행 사례: worker/routes/ziwei-ai.js.
 *
 * 실패한 그룹은 그 그룹만 다시 부르고, 끝내 실패하면 그 키만 결정론 폴백으로 메운다.
 */
export async function generateFusionFortuneWithRealLLM({
  input = {},
  context = {},
  env = {},
  requestId = "",
  providerCall = callFusionGroupProvider,
  onStage,
  now = new Date(),
  abortSignal,
  deadlineStartAt,
} = {}) {
  if (!isFusionFortuneRealLlmAllowed(env)) {
    const error = new Error("FUSION_REAL_LLM_NOT_ALLOWED");
    error.code = "FUSION_REAL_LLM_NOT_ALLOWED";
    throw error;
  }
  // 🔴 데드라인 시계는 요청 시작 시점(결제 증빙 직후)부터 돈다. 컨텍스트 빌드(6개 계산기)가
  //    LLM 그룹보다 먼저 같은 예산을 소모하므로, 여기서 새로 시작하면 컨텍스트 시간이 예산에
  //    안 잡혀 Cloudflare 엣지 한도(~100s)를 넘겨 요청이 도중에 죽는다.
  const startedAt = Number.isFinite(Number(deadlineStartAt)) && Number(deadlineStartAt) > 0 ? Number(deadlineStartAt) : Date.now();
  const remainingMs = () => FUSION_GENERATION_DEADLINE_MS - (Date.now() - startedAt);

  const model = text(env.FUSION_FORTUNE_LLM_MODEL, 100) || "gemini-2.5-flash";
  const validationOptions = fusionValidationOptions(context, input);
  const providers = new Set();
  const models = new Set();
  let providerCalls = 0;
  // 🔴 진행 카운터는 **국면마다 새로** 센다. 예전에는 하나를 1차 병렬과 재생성이 공유해
  //    화면에 "6 / 4 묶음 완성"이 떴다 — 총량을 넘는 진행률은 사용자에게 고장으로 보인다.
  const composeProgress = { phase: "compose", total: FUSION_SECTION_GROUP_SPECS.length, done: 0 };

  const groupTimeoutMs = fusionGroupTimeoutMs(env);
  const runGroup = async (group, { attempts = FUSION_GROUP_ATTEMPTS, timeoutMs = groupTimeoutMs, extraInstruction = "", progress = composeProgress } = {}) => {
    // 🔴 데드라인을 그룹 호출 **안에서** 강제한다. 예전에는 1차 병렬이 예산을 전혀 보지 않고
    //    attempts×timeoutMs(최악 110초)를 다 쓴 뒤에야 다음 물결에서 남은 예산을 확인했다.
    //    컨텍스트 빌드(6개 계산기)까지 같은 120초 예산을 소모하므로, 그대로면 Cloudflare 엣지
    //    한도(~100s)를 넘겨 요청이 도중에 죽고 SSE 스트림이 끊긴다. 남은 예산으로 호출 상한을
    //    조여 요청이 끝까지 완주하게 한다.
    const remainingBeforeCall = remainingMs();
    if (remainingBeforeCall <= 0) {
      console.warn("[fusion-fortune-group-skipped-deadline]", { requestId: text(requestId, 120), sectionGroup: group.id, remainingMs: remainingBeforeCall });
      return { ok: false, group, issue: "deadline_exhausted" };
    }
    const clampedTimeoutMs = Math.max(1000, Math.min(timeoutMs, remainingBeforeCall - 8000));
    const groupPrompt = buildFusionSectionGroupPrompt({ context, group, extraInstruction });
    providerCalls += 1;
    let response;
    try {
      response = await providerCall(env, groupPrompt.userPrompt, {
        systemPrompt: groupPrompt.systemPrompt,
        responseMimeType: "application/json",
        attempts,
        maxOutputTokens: fusionGroupTokens(group, env),
        temperature: 0.62,
        timeoutMs: clampedTimeoutMs,
        model,
        taskType: "fortune",

        // 🔴 초융합은 Workers AI 폴백을 켜지 않는다. 폴백 모델은 목표의 60~77%에서 스스로
        // 멈춰(2026-07-30 실측) 20,000자 계약을 구조적으로 채울 수 없다. 켜면 호출만 더
        // 태우고 결국 반려된다. 폴백을 켜게 되면 fallbackMinChars 를 함께 줘야 한다.
        fallbackToWorkersAI: false,
        logContext: { requestId: text(requestId, 120), featureKey: "fusion_fortune", sectionGroup: group.id },
      });
    } catch (error) {
      response = { ok: false, error: text(error?.code, 80) || "provider_exception" };
    }
    progress.done += 1;
    await emitFusionFortuneStage(onStage, "compose", { group: group.id, groupLabel: group.stageLabel, phase: progress.phase, completedGroups: progress.done, totalGroups: progress.total });
    if (!response?.ok) return { ok: false, group, issue: text(response?.error, 80) || "provider_failed" };
    const parsed = parseFusionFortuneLLMResponse(response.text);
    if (!parsed.ok) return { ok: false, group, issue: "parse_failed" };
    const picked = pickKeys(parsed.value, group.keys);
    const checked = validateFusionFortuneGroup(picked, group, validationOptions);
    if (response.provider) providers.add(text(response.provider, 40));
    if (response.model) models.add(text(response.model, 100));
    if (!checked.ok) return { ok: false, group, issue: checked.issue, detail: checked.detail, value: picked };
    return { ok: true, group, value: picked };
  };

  const merged = {};
  const failedGroups = [];
  const settled = await Promise.allSettled(FUSION_SECTION_GROUP_SPECS.map((group) => runGroup(group)));
  settled.forEach((outcome, index) => {
    const group = FUSION_SECTION_GROUP_SPECS[index];
    if (outcome.status !== "fulfilled" || !outcome.value.ok) {
      failedGroups.push(group);
      console.warn("[fusion-fortune-group-failed]", { requestId: text(requestId, 120), sectionGroup: group.id, issue: text(outcome.status === "fulfilled" ? outcome.value.issue : outcome.reason?.message, 120), detail: text(outcome.status === "fulfilled" ? outcome.value.detail : "", 80) });
      return;
    }
    Object.assign(merged, outcome.value.value);
  });

  // 실패했거나 목표를 크게 밑돈 그룹만 다시 부른다. 그룹 단위라 예산 안에 들어온다.
  const shortGroups = FUSION_SECTION_GROUP_SPECS.filter((group) => !failedGroups.includes(group) && countFusionGroupChars(merged, group) < group.targetChars * FUSION_GROUP_RETRY_RATIO);
  const retryTargets = [...failedGroups, ...shortGroups];
  // 연결이 끊긴 뒤에 보완 호출을 또 태우지 않는다. 1차 호출은 provider 안에서 이미 진행 중이라
  // 여기서 못 끊지만, **두 번째 물결**은 막을 수 있다(비용의 절반이 여기다).
  if (retryTargets.length && !abortSignal?.aborted && remainingMs() > FUSION_GROUP_RETRY_MIN_BUDGET_MS) {
    const retryTimeoutMs = Math.max(20000, Math.min(groupTimeoutMs, remainingMs() - 8000));
    const repairProgress = { phase: "repair", total: retryTargets.length, done: 0 };
    const retried = await Promise.allSettled(retryTargets.map((group) => runGroup(group, {
      attempts: 1,
      timeoutMs: retryTimeoutMs,
      extraInstruction: buildFusionShortfallInstruction(group, countFusionGroupChars(merged, group)),
      progress: repairProgress,
    })));
    retried.forEach((outcome, index) => {
      if (outcome.status !== "fulfilled" || !outcome.value.ok) return;
      const group = retryTargets[index];
      // 재생성이 더 길 때만 교체한다 — 더 짧아진 결과로 기존 본문을 덮어쓰지 않는다.
      if (countFusionGroupChars(outcome.value.value, group) <= countFusionGroupChars(merged, group)) return;
      Object.assign(merged, outcome.value.value);
      const stillFailedIndex = failedGroups.indexOf(group);
      if (stillFailedIndex >= 0) failedGroups.splice(stillFailedIndex, 1);
    });
  } else if (retryTargets.length) {
    console.warn("[fusion-fortune-group-retry-skipped]", { requestId: text(requestId, 120), remainingMs: remainingMs(), aborted: abortSignal?.aborted === true, groups: retryTargets.map((group) => group.id) });
  }

  // 남은 실패 그룹은 결정론 폴백으로 메운다. 세 그룹이 멀쩡한데 한 그룹 때문에 전체를
  // 폴백으로 돌리면 30,000원을 낸 사용자가 받는 글의 4분의 3이 이유 없이 사라진다.
  const fallbackBase = attachQuestionFocusedFusionReading(await generateFusionFortuneWithMockLLM({ context, now }), context);
  const composed = { ...pickKeys(fallbackBase, Object.keys(fallbackBase)), ...merged };
  composed.visualization = normalizeFusionVisualization(composed.visualization, context, { now });

  // 🔴 품질 미달이어도 모델이 실제로 쓴 본문을 우선한다. 여기서 결정론 폴백으로 갈아타면
  //    3만원짜리 결과가 통째로 템플릿 문장으로 바뀐다 — 안전 위반일 때만 갈아탄다.
  const decision = resolveFusionFortuneDelivery(composed, validationOptions);
  const usedFallbackGroups = FUSION_SECTION_GROUP_SPECS.filter((group) => failedGroups.includes(group)).map((group) => group.id);
  const provider = [...providers][0] || "gemini";
  const resolvedModel = [...models][0] || model;

  if (decision.deliverable) {
    const generationSource = usedFallbackGroups.length === 0 ? "gemini" : usedFallbackGroups.length === FUSION_SECTION_GROUP_SPECS.length ? "context_fallback" : "gemini_partial";
    console.info("[fusion-fortune-llm-metric]", { requestId: text(requestId, 120), provider, model: resolvedModel, providerCalls, success: true, fallbackUsed: usedFallbackGroups.length > 0, fallbackGroups: usedFallbackGroups, length: decision.length, qualityTier: decision.tier, qualityIssues: decision.issues });
    return { result: decision.value, deliverable: true, generationSource, providerCalls, qualityTier: decision.tier, qualityIssues: decision.issues, qualityNotice: decision.qualityNotice };
  }

  const fallback = await buildValidatedFusionFallback({ context, input, now });
  console.info("[fusion-fortune-llm-metric]", { requestId: text(requestId, 120), provider, model: resolvedModel, providerCalls, success: fallback.deliverable === true, fallbackUsed: true, errorCode: text(decision.errorCode, 80) || "validation_failed", issues: decision.issues || [], fallbackIssues: fallback.issues || [] });
  return { result: fallback.value, deliverable: fallback.deliverable === true, generationSource: "context_fallback", providerCalls, qualityTier: fallback.tier, qualityIssues: fallback.issues, qualityNotice: fallback.qualityNotice };
}

export async function generateFusionFortuneWithConfiguredLLM(args = {}) {
  if (isFusionFortuneRealLlmAllowed(args.env || {})) return generateFusionFortuneWithRealLLM(args);
  if (isFusionFortuneMockFlowEnabled(args.env || {})) {
    const result = attachQuestionFocusedFusionReading(await generateFusionFortuneWithMockLLM(args), args.context);
    // mock 도 그룹 진행 이벤트를 흘려보내 로딩 화면이 같은 계약을 보게 한다.
    for (const [index, group] of FUSION_SECTION_GROUP_SPECS.entries()) {
      await emitFusionFortuneStage(args.onStage, "compose", { group: group.id, groupLabel: group.stageLabel, phase: "compose", completedGroups: index + 1, totalGroups: FUSION_SECTION_GROUP_SPECS.length });
    }
    return { result, deliverable: true, generationSource: "mock" };
  }
  const error = new Error("FUSION_FORTUNE_GENERATION_DISABLED");
  error.code = FUSION_FORTUNE_ERROR_CODES.FEATURE_DISABLED;
  throw error;
}

// 스토어는 이제 "오늘의 선착순 100자리"와 requestId 멱등성만 지킨다. 과금은 표준 회당 결제가
// 맡으므로 잔액(ticket balance) 개념이 사라졌다.
export function createMemoryFusionFortuneStore(seed = {}) {
  const attempts = new Map(Object.entries(seed.attempts || {}));
  let reservationQueue = Promise.resolve();
  const withReservationLock = (run) => {
    const previous = reservationQueue;
    let release;
    reservationQueue = new Promise((resolve) => { release = resolve; });
    return previous.then(async () => { try { return await run(); } finally { release(); } });
  };
  return {
    attempts,
    async reserve(userId, dateKey, requestId) { return withReservationLock(async () => {
      // released(실패·중단)는 끝난 시도다. 409 로 막으면 그 requestId 로 결제한 사용자가
      // 결과를 영원히 못 받는다 — 증빙이 requestId 에 묶여 있어 새 id 로는 안 잡힌다.
      const previous = attempts.get(requestId);
      if (previous && previous.status !== "released") return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.REQUEST_IN_PROGRESS, status: 409 };
      attempts.set(requestId, { userId: String(userId), dateKey, status: "reserved" });
      return { ok: true, userId: String(userId), dateKey, requestId };
    }); },
    async release(reservation) { attempts.set(reservation.requestId, { ...attempts.get(reservation.requestId), status: "released" }); },
    async commit(reservation) { const previous = attempts.get(reservation.requestId); if (!previous || previous.status !== "reserved") return null; attempts.set(reservation.requestId, { ...previous, status: "completed" }); return { committed: true }; },
  };
}

export function createMongoFusionFortuneStore() {
  return {
    async reserve(userId, dateKey, requestId, now = new Date()) {
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
      try {
        // released(실패·중단)된 시도는 같은 requestId 로 다시 연다. 결제 증빙이 requestId 에
        // 묶여 있어, 여기서 막으면 이미 결제한 사용자가 결과를 받을 길이 사라진다.
        const reopened = await FusionFortuneGenerationAttempt.findOneAndUpdate(
          { requestId, status: "released" },
          { $set: { status: "reserved", dateKey, expiresAt } },
        ).lean();
        if (!reopened) {
          await FusionFortuneGenerationAttempt.create({ requestId, userId: objectIdOrString(userId), dateKey, status: "reserved", expiresAt });
        }
        return { ok: true, userId: String(userId), dateKey, requestId };
      } catch (error) {
        if (Number(error?.code) === 11000) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.REQUEST_IN_PROGRESS, status: 409 };
        throw error;
      }
    },
    async release(reservation) {
      await FusionFortuneGenerationAttempt.updateOne({ requestId: reservation.requestId, status: "reserved" }, { $set: { status: "released" } });
    },
    async commit(reservation) {
      const attempt = await FusionFortuneGenerationAttempt.updateOne({ requestId: reservation.requestId, status: "reserved" }, { $set: { status: "completed" } });
      return Number(attempt.modifiedCount || 0) === 1 ? { committed: true } : null;
    },
  };
}

export async function buildFusionFortuneStatus({ userId = "", enabled = true } = {}) {
  const loggedIn = Boolean(text(userId));
  const pricing = { featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY };
  if (!enabled) return { isLoggedIn: loggedIn, pricing, canGenerate: false, nextAction: "disabled", message: "초융합 운세는 준비 중입니다." };
  if (!loggedIn) {
    return { isLoggedIn: false, pricing, canGenerate: false, nextAction: "login", message: "초융합 운세는 로그인 후 이용할 수 있어요.", cta: { label: "로그인하기", targetPath: "/login", reason: "login_required" } };
  }
  // 결제 여부는 여기서 판정하지 않는다 — 진입 시 서버 선검사를 두면 결제창 앞 지연이 되살아난다.
  // 결제는 생성 요청 직전 공용 게이트가 처리한다.
  return { isLoggedIn: true, pricing, canGenerate: true, nextAction: "generate", message: "생년 정보를 입력하면 여섯 체계를 한 번에 읽어 드려요." };
}

export async function generateFusionFortuneRequest({ input = {}, userId = "", requestId, dateKey, store, resolvePaidAccess, now = new Date(), contextBuilder = buildFusionFortuneContext, generator = generateFusionFortuneWithConfiguredLLM, env = {}, onStage, abortSignal, onDelivery } = {}) {
  if (!text(userId)) return { ok: false, status: 401, error: FUSION_FORTUNE_ERROR_CODES.AUTH_REQUIRED, message: "로그인이 필요합니다." };
  let normalized; try { normalized = normalizeFusionFortuneInput(input); } catch { return { ok: false, status: 400, error: FUSION_FORTUNE_ERROR_CODES.INVALID_INPUT, message: "입력 정보를 확인해 주세요." }; }
  const safeId = safeRequestId(requestId);

  // 결제 증빙을 먼저 확인한다. 증빙은 requestId 로 조회되므로 같은 requestId 재시도는
  // 이중 과금 없이 통과한다 — 생성이 실패한 결제 사용자가 결과를 받을 수 있는 근거다.
  const paid = await resolveFusionFortunePaidAccess(resolvePaidAccess, { userId: text(userId, 120), requestId: safeId });
  if (!paid.ok) {
    return paid.degraded
      ? { ok: false, status: 503, retryable: true, error: FUSION_FORTUNE_ERROR_CODES.PAYMENT_CHECK_DEGRADED, message: "결제 내역을 확인하지 못했어요. 잠시 후 다시 시도해 주세요. 이미 결제하셨다면 차감되지 않습니다." }
      : { ok: false, status: 402, error: FUSION_FORTUNE_ERROR_CODES.PAYMENT_REQUIRED, message: "초융합 운세는 1회 30,000원입니다.", pricing: { featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY } };
  }

  const reservation = await store.reserve(userId, dateKey || getFusionFortuneDateKey(now), safeId, now);
  if (!reservation.ok) {
    return { ok: false, status: reservation.status, error: reservation.errorCode, message: "이미 처리 중인 요청입니다." };
  }
  let committed = false;
  // 실패 진단용. 어느 관문에서 얼마 만에 죽었는지가 프로덕션에서 유일한 단서다.
  const startedAt = Date.now();
  let generationSourceForLog = "";
  try {
    throwIfFusionFortuneAborted(abortSignal);
    const contextResult = await contextBuilder(normalized, { now, env, onStage });
    if (!contextResult?.ok) throw Object.assign(new Error("context"), { code: FUSION_FORTUNE_ERROR_CODES.CONTEXT_FAILED });
    throwIfFusionFortuneAborted(abortSignal);
    // 🔴 데드라인 시계를 요청 시작 시점(결제 증빙 직후)으로 고정해 넘긴다. 컨텍스트 빌드(6개
    //    계산기)가 LLM 그룹보다 먼저 같은 120초 예산을 소모하므로, 생성기가 시계를 새로 시작하면
    //    컨텍스트 시간이 예산에 안 잡혀 Cloudflare 엣지 한도(~100s)를 넘겨 요청이 도중에 죽는다.
    const generated = await generator({ input: normalized, context: contextResult.context, env, requestId: safeId, userId, onStage, now, abortSignal, deadlineStartAt: startedAt });

    generationSourceForLog = generated?.generationSource || "";
    const result = generated?.result && generated?.deliverable !== undefined ? generated.result : generated;
    if (generated?.deliverable === false || !result) throw Object.assign(new Error("generation"), { code: FUSION_FORTUNE_ERROR_CODES.GENERATION_FAILED, issues: generated?.qualityIssues });
    // 생성기가 이미 등급을 냈으면 그 판정을 쓴다 — 같은 결과를 두 번 재는 것은 비용일 뿐이고,
    // 두 호출이 서로 다른 답을 내면 배달 직전에 이유 없이 죽는다(중첩 사전검사).
    const delivery = generated?.qualityTier
      ? { deliverable: true, tier: generated.qualityTier, value: result, issues: generated.qualityIssues || [], qualityNotice: generated.qualityNotice }
      : resolveFusionFortuneDelivery(result, fusionValidationOptions(contextResult.context, normalized));
    if (!delivery.deliverable) throw Object.assign(new Error("result"), { code: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: delivery.issues });
    throwIfFusionFortuneAborted(abortSignal);
    if (typeof onDelivery === "function") {
      await onDelivery({ requestId: safeId, result: delivery.value, generationSource: generated?.generationSource || "mock", qualityTier: delivery.tier, qualityNotice: delivery.qualityNotice });
    }
    throwIfFusionFortuneAborted(abortSignal);
    const commitResult = await store.commit(reservation, now);
    if (!commitResult) {
      console.warn("[fusion-fortune-commit-failed-after-delivery]", {
        requestId: safeId,
        elapsedMs: Date.now() - startedAt,
      });
    }
    committed = true;
    await emitFusionFortuneStage(onStage, "fusion");
    const status = await buildFusionFortuneStatus({ userId }).catch(() => ({
      isLoggedIn: true,
      pricing: { featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY },
      canGenerate: true,
      nextAction: "generate",
      message: "초융합 운세 결과가 완성되었어요.",
    }));
    return { ok: true, status: 200, requestId: safeId, result: delivery.value, fusionStatus: status, generationSource: generated?.generationSource || "mock", providerCalls: count(generated?.providerCalls) || undefined, qualityTier: delivery.tier, qualityNotice: delivery.qualityNotice };
  } catch (error) {
    if (!committed) await store.release(reservation, now).catch(() => {});
    const code = error?.code || FUSION_FORTUNE_ERROR_CODES.GENERATION_FAILED;
    const cancelled = code === FUSION_FORTUNE_ERROR_CODES.CANCELLED;
    // 🔴 실패해도 어느 관문에서 죽었는지 남겨야 한다. 예전에는 사용자에게 보낸 문구가 전부라
    //    프로덕션에서 검증 실패인지 타임아웃인지 예외인지 가릴 방법이 없었다.
    console.warn("[fusion-fortune-failed]", {
      requestId: safeId,
      stage: text(error?.message, 40),
      errorCode: text(code, 80),
      issues: Array.isArray(error?.issues) ? error.issues.slice(0, 8) : [],
      elapsedMs: Date.now() - startedAt,
      generationSource: text(generationSourceForLog, 40),
    });
    // 결제는 생성 전에 이미 끝났으므로 "차감되지 않았다"고 말하면 거짓이 된다. 실제로 안전한 것은
    // 같은 requestId 로 다시 시도하면 추가 결제가 없다는 점이다.
    // 🔴 retryable 을 함께 준다 — 이 값이 없으면 새로고침으로 메모리 상태를 잃은 사용자에게
    //    재시도 버튼이 사라지고, 3만원을 낸 요청을 회수할 방법이 화면에서 없어진다.
    return {
      ok: false,
      status: cancelled ? 499 : code === FUSION_FORTUNE_ERROR_CODES.CONTEXT_FAILED ? 502 : code === FUSION_FORTUNE_ERROR_CODES.FEATURE_DISABLED ? 503 : 500,
      error: code,
      message: cancelled ? "분석을 중단했어요. 같은 요청으로 다시 시도해도 추가 결제는 없습니다." : "결과를 준비하지 못했어요. 같은 요청으로 다시 시도해도 추가 결제는 없습니다.",
      retryRequestId: safeId,
      retryable: true,
      issues: Array.isArray(error?.issues) ? error.issues.slice(0, 8) : undefined,
    };
  }
}
