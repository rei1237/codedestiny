import {
  FusionFortuneDailyLimit,
  FusionFortuneGenerationAttempt,
} from "./models.js";
import { mongoose } from "./db.js";
import { buildFusionFortunePrompt } from "./fusion-fortune-prompt.js";
import { buildGuardianFortuneContext } from "./guardian-fortune-context.js";
import { buildIntegratedInsight } from "./guardian-fortune-insight.js";
import { buildFortuneQuestionFocus } from "./fortune-question-focus.js";
import { callGeminiText } from "./gemini.js";
import { TAROT_CARDS } from "../../lib/tarot/tarot-cards.mjs";

// 초융합 운세는 표준 회당 결제(B유형)다. 가격 정본은 worker/lib/paid-feature-registry.js 이며
// 300코인(30,000원)이라 이용권 커버는 family 등급만 통과한다(PASS_LIMITS 참고).
export const FUSION_FORTUNE_PAID_FEATURE_KEY = "fusion-fortune-consultation";

export const FUSION_FORTUNE_DAILY_LIMIT = Object.freeze({
  timezone: "Asia/Seoul",
  maxSuccessfulGenerationsPerDay: 100,
  countPolicy: "successful_generation_only",
  resetPolicy: "daily_kst_midnight",
});

export const FUSION_FORTUNE_ERROR_CODES = Object.freeze({
  FEATURE_DISABLED: "FUSION_FORTUNE_FEATURE_DISABLED",
  AUTH_REQUIRED: "FUSION_FORTUNE_AUTH_REQUIRED",
  INVALID_INPUT: "FUSION_FORTUNE_INVALID_INPUT",
  SOLD_OUT: "FUSION_FORTUNE_SOLD_OUT",
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

function text(value, max = 1200) { return String(value || "").trim().slice(0, max); }
function count(value) { return Math.max(0, Number(value || 0)); }
function flag(env, name) { return env?.[name] === true || String(env?.[name] || "").toLowerCase() === "true"; }
function isDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(text(value, 10)); }
function safeRequestId(value) { return text(value, 120) || globalThis.crypto?.randomUUID?.() || `fusion-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
function objectIdOrString(value) {
  const normalized = text(value, 120);
  return mongoose.Types.ObjectId.isValid(normalized) ? new mongoose.Types.ObjectId(normalized) : normalized;
}

async function emitFusionFortuneStage(onStage, stage) {
  if (typeof onStage !== "function") return;
  try {
    await onStage({ stage, status: "completed" });
  } catch {
    // A disconnected progress stream never changes ticket or daily-limit state.
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
export function isFusionFortuneRealLlmAllowed(env = {}) {
  return flag(env, "ENABLE_FUSION_FORTUNE_REAL_LLM")
    && flag(env, "ALLOW_FUSION_FORTUNE_REAL_LLM")
    && env.NODE_ENV !== "test"
    && Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY);
}

export function getFusionFortuneDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: FUSION_FORTUNE_DAILY_LIMIT.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
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

function section(title, intro, vocabulary, length = 1250, evidence = [], domain = "integrated") {
  return {
    title,
    content: composeExpertReading(intro, vocabulary, length, evidence, domain),
    keyPoints: ["강점이 과해지는 순간까지 함께 관찰하기", "감정과 사실을 나누어 선택 기준을 기록하기", "작은 실행의 결과를 다음 판단 근거로 남기기"],
  };
}

export async function generateFusionFortuneWithMockLLM({ context = {} } = {}) {
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
    sajuSection: section("사주: 기질과 선택의 뿌리", "사주의 일간과 월지, 오행과 십성은 일을 시작하고 관계를 유지하는 기본 리듬을 보여줍니다.", "오행은 많고 적음을 좋고 나쁨으로 가르기보다, 추진력·정리력·표현력·현실 감각·회복력 중 무엇이 자연스럽고 무엇이 의식적인 연습을 필요로 하는지 살피는 언어입니다.", 1250, evidence.saju, "saju"),
    ziweiSection: section("자미두수: 삶의 무대와 역할", "자미두수의 궁위와 주요 별은 사회적 역할, 재능의 배치, 관계에서 책임을 느끼는 지점을 비춥니다.", "명궁은 기본 태도, 관록궁은 일의 방식, 재백궁은 자원을 다루는 습관, 부처궁은 가까운 관계의 역할, 복덕궁은 혼자 있을 때의 회복 방식을 서로 연결해 읽습니다.", 1250, evidence.ziwei, "ziwei"),
    vedicSection: section("베다점: 무의식의 리듬", "베다점의 달과 나크샤트라는 감정이 반응하는 속도와 오래 반복된 배움의 패턴을 살펴봅니다.", "라그나와 문사인, 나크샤트라와 다샤는 컨텍스트에 제공된 범위 안에서만 사용하며, 카르마는 벌이나 숙명이 아니라 되풀이해 배우게 되는 선택 습관으로 해석합니다.", 1250, evidence.vedic, "vedic"),
    sukuyoSection: section("숙요점: 관계의 거리감", "숙요점은 사람 사이의 거리와 감정이 닿는 방식, 가까워질 때와 숨을 고를 때를 보여줍니다.", "본명숙과 관계 리듬은 누가 옳은지를 판정하기보다 친밀감이 편안해지는 속도, 갈등 뒤 회복하는 방식, 사회적 관계에서 에너지를 배분하는 습관을 살피는 데 사용합니다.", 1250, evidence.sukuyo, "sukuyo"),
    astrologySection: section("점성술: 감정과 표현의 방향", "점성술은 태양과 달의 상징을 통해 원하는 삶과 실제 감정 반응이 만나는 지점을 해석합니다.", "태양은 의식적인 방향, 달은 정서적 안전, 금성과 화성은 관계의 취향과 행동, 토성은 책임과 성장의 시간을 뜻하며 상승궁은 생시가 확인된 범위에서만 다룹니다.", 1250, evidence.astrology, "astrology"),
    tarotSection: section("타로: 지금의 선택을 비추는 카드", "서버에서 선택된 여섯 장의 타로 배치는 현재의 흐름을 한 단계씩 정리하도록 돕는 상징으로 사용됩니다.", `서버가 선택한 카드는 ${tarotNames.join(", ") || "정해진 여섯 장"}입니다. 카드는 예언을 고정하는 도구가 아니라 핵심 주제, 체계 사이의 다리, 관계 반응, 다음 행동을 비추는 질문이며 이 목록 밖의 카드는 덧붙이지 않습니다.`, 1250, evidence.tarot, "tarot"),
    integratedReading: section("통합 해석: 하나의 상담으로 엮는 흐름", "여섯 체계가 함께 가리키는 핵심은 감정을 억누르거나 성급히 결론내리지 않고, 기준을 세워 현실의 행동으로 옮기는 과정입니다.", "공통 신호는 삶의 핵심 패턴으로, 서로 다른 신호는 상황별 선택지로 남깁니다. 사랑·일·돈·마음은 분리된 문제가 아니라 같은 선택 기준이 서로 다른 장면에서 나타난 결과로 연결해 읽습니다.", 1500, integratedEvidence, "integrated"),
    timingAndAction: { title: "가까운 시기와 현실적인 행동", content: composeExpertReading("가까운 시기에는 큰 결단보다 현재 가진 자원과 관계를 정리하는 작은 선택이 다음 기회를 만듭니다.", "시기 조언은 특정 사건을 예고하기보다 지금 준비할 것, 지켜볼 신호, 멈춰야 할 습관을 구분하는 데 초점을 둡니다.", 1050, [], "action"), luckyActions: ["이번 주 가장 중요한 일 하나를 문장으로 정리하기", "관계에서 원하는 경계를 부드럽게 말하기", "지출과 일정에서 반복되는 부담 한 가지 줄이기"], cautionPatterns: ["불안한 마음으로 답을 재촉하는 패턴", "남의 속도에 맞추다 내 계획을 놓치는 패턴", "준비 없이 한 번에 크게 바꾸려는 패턴"] },
    closingMessage: composeExpertReading("운세는 정답을 대신 정하는 말이 아니라, 더 나은 선택을 하도록 비추는 지도입니다.", "오늘의 작은 정리와 솔직한 경계가 다음 흐름을 바꾸는 현실적인 출발점이 됩니다.", 650, [], "closing"),
    shareText: "여섯 개의 운세 체계를 하나의 상담으로 엮어, 지금의 나를 다시 읽어봤어요.",
  };
}

export function countFusionFortuneVisibleText(result = {}) {
  return [result.title, result.openingMessage, result.executiveSummary, ...SECTION_KEYS.flatMap((key) => [result[key]?.title, result[key]?.content, ...(result[key]?.keyPoints || [])]), result.timingAndAction?.title, result.timingAndAction?.content, ...(result.timingAndAction?.luckyActions || []), ...(result.timingAndAction?.cautionPatterns || []), result.closingMessage].join(" ").length;
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

export function validateFusionFortuneResult(result = {}, { birthTimeKnown = true, birthPlaceKnown = true, sensitiveValues = [], selectedTarotCards = [] } = {}) {
  const source = JSON.stringify(result || {});
  const required = ["title", "openingMessage", "executiveSummary", "timingAndAction", "closingMessage"];
  if (required.some((key) => !text(result[key], 20000))) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["missing_required"] };
  if (SECTION_KEYS.some((key) => text(result[key]?.content, 50000).length < 900 || !Array.isArray(result[key]?.keyPoints) || result[key].keyPoints.length < 3)) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["section_depth"] };
  if (text(result.executiveSummary, 50000).length < 600 || text(result.timingAndAction?.content, 50000).length < 800) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["summary_or_action_depth"] };
  if (!Array.isArray(result.timingAndAction?.luckyActions) || result.timingAndAction.luckyActions.length < 3 || !Array.isArray(result.timingAndAction?.cautionPatterns) || result.timingAndAction.cautionPatterns.length < 3) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["missing_actions"] };
  if (hasRepeatedLongSentence(result)) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["repeated_sentence"] };
  if (FORBIDDEN.some((phrase) => source.includes(phrase))) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["unsafe_phrase"] };
  if (/(raw[_ ]?(prompt|response|context)|paymentId|merchantUid|ticketRemaining|totalRemaining)/i.test(source)) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["internal_data_exposed"] };
  const exposedSensitiveValue = sensitiveValues.map((value) => text(value, 100)).find((value) => value.length >= 4 && source.includes(value));
  if (exposedSensitiveValue) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["private_input_exposed"] };
  if (!birthTimeKnown && /(상승궁|라그나|정밀 명반|하우스).{0,24}(확실|분명|단정|결정|보장)/.test(source)) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["birth_time_overclaim"] };
  if (!birthPlaceKnown && /(라그나|상승궁|하우스|나크샤트라).{0,24}(확실|분명|단정|결정|보장)/.test(source)) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["birth_place_overclaim"] };
  const selectedNames = selectedTarotCards.map((card) => text(card?.name, 100)).filter(Boolean);
  if (selectedNames.length) {
    const tarotText = `${text(result.tarotSection?.title, 1000)} ${text(result.tarotSection?.content, 50000)} ${(result.tarotSection?.keyPoints || []).join(" ")}`;
    const knownNames = TAROT_CARDS.flatMap((card) => [text(card?.nameKo, 100), text(card?.nameEn, 100)]).filter(Boolean);
    const unexpected = knownNames.find((name) => !selectedNames.includes(name) && (tarotText.includes(`${name} 카드`) || tarotText.includes(`카드 ${name}`)));
    if (unexpected) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["invented_tarot_card"] };
    if (selectedNames.some((name) => !tarotText.includes(name))) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["missing_selected_tarot_card"] };
  }
  const length = countFusionFortuneVisibleText(result);
  if (length < 10000 || length > 15000) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["length"], length };
  return { ok: true, value: result, length };
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

async function buildValidatedFusionFallback({ context, input }) {
  const result = attachQuestionFocusedFusionReading(await generateFusionFortuneWithMockLLM({ context }), context);
  const checked = validateFusionFortuneResult(result, fusionValidationOptions(context, input));
  return checked.ok ? checked.value : undefined;
}

export async function generateFusionFortuneWithRealLLM({
  input = {},
  context = {},
  prompt = buildFusionFortunePrompt({ context }),
  env = {},
  requestId = "",
  providerCall = callGeminiText,
} = {}) {
  if (!isFusionFortuneRealLlmAllowed(env)) {
    const error = new Error("FUSION_REAL_LLM_NOT_ALLOWED");
    error.code = "FUSION_REAL_LLM_NOT_ALLOWED";
    throw error;
  }
  const options = {
    systemPrompt: prompt.systemPrompt,
    responseMimeType: "application/json",
    maxOutputTokens: Math.min(16384, Math.max(12000, Number(env.FUSION_FORTUNE_MAX_OUTPUT_TOKENS) || 16384)),
    temperature: 0.62,
    timeoutMs: Math.min(90000, Math.max(45000, Number(env.FUSION_FORTUNE_LLM_TIMEOUT_MS) || 75000)),
    model: text(env.FUSION_FORTUNE_LLM_MODEL, 100) || "gemini-2.5-flash",
    taskType: "fortune",
    fallbackToWorkersAI: false,
    logContext: { requestId: text(requestId, 120), featureKey: "fusion_fortune" },
  };
  let providerResult;
  try {
    providerResult = await providerCall(env, prompt.userPrompt, options);
  } catch (error) {
    providerResult = { ok: false, error: text(error?.code, 80) || "provider_exception" };
  }
  let parsed = providerResult?.ok ? parseFusionFortuneLLMResponse(providerResult.text) : { ok: false, errorCode: text(providerResult?.error, 80) || "provider_failed" };
  let checked = parsed.ok ? validateFusionFortuneResult(parsed.value, fusionValidationOptions(context, input)) : parsed;
  let providerCalls = 1;

  if (!checked.ok && providerResult?.ok) {
    const repairPrompt = [
      "아래 후보를 같은 JSON 스키마로 한 번만 보정하세요.",
      `검증 문제: ${(checked.issues || [checked.errorCode]).join(", ")}`,
      "모든 섹션과 서버 선택 타로 카드만 유지하고, 개인정보를 추가하지 마세요.",
      `후보 JSON:\n${JSON.stringify(parsed.value || {}).slice(0, 90000)}`,
      `스키마:\n${JSON.stringify(prompt.responseSchema)}`,
    ].join("\n\n");
    let repaired;
    try {
      repaired = await providerCall(env, repairPrompt, options);
    } catch (error) {
      repaired = { ok: false, error: text(error?.code, 80) || "repair_exception" };
    }
    providerCalls += 1;
    parsed = repaired?.ok ? parseFusionFortuneLLMResponse(repaired.text) : { ok: false, errorCode: text(repaired?.error, 80) || "repair_failed" };
    checked = parsed.ok ? validateFusionFortuneResult(parsed.value, fusionValidationOptions(context, input)) : parsed;
  }

  if (checked.ok) {
    console.info("[fusion-fortune-llm-metric]", { requestId: text(requestId, 120), provider: text(providerResult?.provider, 40) || "gemini", model: text(providerResult?.model, 100) || options.model, providerCalls, success: true, fallbackUsed: false });
    return { result: checked.value, deliverable: true, generationSource: "gemini", providerCalls };
  }

  const fallback = await buildValidatedFusionFallback({ context, input });
  console.info("[fusion-fortune-llm-metric]", { requestId: text(requestId, 120), provider: text(providerResult?.provider, 40) || "gemini", model: text(providerResult?.model, 100) || options.model, providerCalls, success: Boolean(fallback), fallbackUsed: Boolean(fallback), errorCode: text(checked.errorCode, 80) || "validation_failed" });
  return { result: fallback, deliverable: Boolean(fallback), generationSource: "context_fallback", providerCalls };
}

export async function generateFusionFortuneWithConfiguredLLM(args = {}) {
  if (isFusionFortuneRealLlmAllowed(args.env || {})) return generateFusionFortuneWithRealLLM(args);
  if (isFusionFortuneMockFlowEnabled(args.env || {})) {
    const result = attachQuestionFocusedFusionReading(await generateFusionFortuneWithMockLLM(args), args.context);
    return { result, deliverable: true, generationSource: "mock" };
  }
  const error = new Error("FUSION_FORTUNE_GENERATION_DISABLED");
  error.code = FUSION_FORTUNE_ERROR_CODES.FEATURE_DISABLED;
  throw error;
}

// 스토어는 이제 "오늘의 선착순 100자리"와 requestId 멱등성만 지킨다. 과금은 표준 회당 결제가
// 맡으므로 잔액(ticket balance) 개념이 사라졌다.
export function createMemoryFusionFortuneStore(seed = {}) {
  const daily = new Map(Object.entries(seed.daily || {})); const attempts = new Map(Object.entries(seed.attempts || {}));
  let reservationQueue = Promise.resolve();
  const withReservationLock = (run) => {
    const previous = reservationQueue;
    let release;
    reservationQueue = new Promise((resolve) => { release = resolve; });
    return previous.then(async () => { try { return await run(); } finally { release(); } });
  };
  return {
    daily, attempts,
    async getDaily(dateKey) { return daily.get(dateKey) || { dateKey, limit: 100, successCount: 0, reserved: 0 }; },
    async reserve(userId, dateKey, requestId) { return withReservationLock(async () => {
      if (attempts.has(requestId)) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.REQUEST_IN_PROGRESS, status: 409 };
      const limit = await this.getDaily(dateKey);
      if (count(limit.successCount) + count(limit.reserved) >= 100) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.SOLD_OUT, status: 429 };
      limit.reserved = count(limit.reserved) + 1; daily.set(dateKey, limit); attempts.set(requestId, { userId: String(userId), dateKey, status: "reserved" }); return { ok: true, userId: String(userId), dateKey, requestId };
    }); },
    async release(reservation) { const limit = await this.getDaily(reservation.dateKey); limit.reserved = Math.max(0, count(limit.reserved) - 1); daily.set(reservation.dateKey, limit); attempts.set(reservation.requestId, { ...attempts.get(reservation.requestId), status: "released" }); },
    async commit(reservation) { const limit = await this.getDaily(reservation.dateKey); if (count(limit.reserved) < 1) return null; limit.reserved -= 1; limit.successCount = count(limit.successCount) + 1; daily.set(reservation.dateKey, limit); attempts.set(reservation.requestId, { ...attempts.get(reservation.requestId), status: "completed" }); return { limit }; },
  };
}

export function createMongoFusionFortuneStore() {
  return {
    async getDaily(dateKey) { return (await FusionFortuneDailyLimit.findOne({ dateKey }).lean()) || { dateKey, limit: 100, successCount: 0, reserved: 0 }; },
    async reserve(userId, dateKey, requestId, now = new Date()) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await FusionFortuneGenerationAttempt.create([{ requestId, userId: objectIdOrString(userId), dateKey, status: "reserved", expiresAt: new Date(now.getTime() + 10 * 60 * 1000) }], { session });
          await FusionFortuneDailyLimit.updateOne({ dateKey }, { $setOnInsert: { timezone: "Asia/Seoul", limit: 100, successCount: 0, reserved: 0, createdAt: now }, $set: { updatedAt: now } }, { upsert: true, session });
          const daily = await FusionFortuneDailyLimit.findOneAndUpdate({ dateKey, $expr: { $lt: [{ $add: [{ $ifNull: ["$successCount", 0] }, { $ifNull: ["$reserved", 0] }] }, 100] } }, { $inc: { reserved: 1 }, $set: { updatedAt: now } }, { new: true, session }).lean();
          if (!daily) throw Object.assign(new Error("sold_out"), { fusionCode: FUSION_FORTUNE_ERROR_CODES.SOLD_OUT, status: 429 });
        });
        return { ok: true, userId: String(userId), dateKey, requestId };
      } catch (error) {
        if (error?.fusionCode) return { ok: false, errorCode: error.fusionCode, status: error.status };
        if (Number(error?.code) === 11000) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.REQUEST_IN_PROGRESS, status: 409 };
        throw error;
      } finally {
        await session.endSession();
      }
    },
    async release(reservation, now = new Date()) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await FusionFortuneDailyLimit.updateOne({ dateKey: reservation.dateKey, reserved: { $gt: 0 } }, { $inc: { reserved: -1 }, $set: { updatedAt: now } }, { session });
          await FusionFortuneGenerationAttempt.updateOne({ requestId: reservation.requestId, status: "reserved" }, { $set: { status: "released" } }, { session });
        });
      } finally {
        await session.endSession();
      }
    },
    async commit(reservation, now = new Date()) {
      const session = await mongoose.startSession();
      let committed;
      try {
        await session.withTransaction(async () => {
          const limit = await FusionFortuneDailyLimit.findOneAndUpdate({ dateKey: reservation.dateKey, reserved: { $gt: 0 }, successCount: { $lt: 100 } }, { $inc: { reserved: -1, successCount: 1 }, $set: { updatedAt: now } }, { new: true, session }).lean();
          if (!limit) throw new Error("fusion_daily_commit_failed");
          const attempt = await FusionFortuneGenerationAttempt.updateOne({ requestId: reservation.requestId, status: "reserved" }, { $set: { status: "completed" } }, { session });
          if (Number(attempt.modifiedCount || 0) !== 1) throw new Error("fusion_attempt_commit_failed");
          committed = { limit };
        });
        return committed || null;
      } catch {
        return null;
      } finally {
        await session.endSession();
      }
    },
  };
}

export async function buildFusionFortuneStatus({ userId = "", store, now = new Date(), enabled = true } = {}) {
  const dateKey = getFusionFortuneDateKey(now); const loggedIn = Boolean(text(userId));
  const pricing = { featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY };
  if (!enabled) return { isLoggedIn: loggedIn, pricing, dailyLimit: { dateKey, limit: 100, usedCount: 0, remainingCount: 0, isSoldOut: false }, canGenerate: false, nextAction: "disabled", message: "초융합 운세는 준비 중입니다." };
  if (!loggedIn) return { isLoggedIn: false, pricing, dailyLimit: { dateKey, limit: 100, usedCount: 0, remainingCount: 100, isSoldOut: false, nextResetAt: getFusionFortuneNextResetAt(now) }, canGenerate: false, nextAction: "login", message: "초융합 운세는 로그인 후 이용할 수 있어요.", cta: { label: "로그인하기", targetPath: "/login", reason: "login_required" } };
  const daily = await store.getDaily(dateKey); const remaining = Math.max(0, 100 - count(daily.successCount) - count(daily.reserved)); const soldOut = remaining === 0;
  // 결제 여부는 여기서 판정하지 않는다 — 진입 시 서버 선검사를 두면 결제창 앞 지연이 되살아난다.
  // 남은 선착순 자리만 보고, 결제는 생성 요청 직전 공용 게이트가 처리한다.
  return { isLoggedIn: true, pricing, dailyLimit: { dateKey, limit: 100, usedCount: count(daily.successCount), remainingCount: remaining, isSoldOut: soldOut, nextResetAt: getFusionFortuneNextResetAt(now) }, canGenerate: !soldOut, nextAction: soldOut ? "sold_out" : "generate", message: soldOut ? "오늘 선착순 100명의 초융합 운세가 모두 마감되었어요." : `오늘 선착순 ${remaining}자리가 남아 있어요.`, cta: soldOut ? { label: "다른 운세 보기", targetPath: "/", reason: "daily_sold_out" } : undefined };
}

export async function generateFusionFortuneRequest({ input = {}, userId = "", requestId, dateKey, store, resolvePaidAccess, now = new Date(), contextBuilder = buildFusionFortuneContext, generator = generateFusionFortuneWithConfiguredLLM, env = {}, onStage, abortSignal, onDelivery } = {}) {
  if (!text(userId)) return { ok: false, status: 401, error: FUSION_FORTUNE_ERROR_CODES.AUTH_REQUIRED, message: "로그인이 필요합니다." };
  let normalized; try { normalized = normalizeFusionFortuneInput(input); } catch { return { ok: false, status: 400, error: FUSION_FORTUNE_ERROR_CODES.INVALID_INPUT, message: "입력 정보를 확인해 주세요." }; }
  const safeId = safeRequestId(requestId);

  // 결제 증빙을 선착순 자리를 잡기 전에 확인한다. 순서를 뒤집으면 미결제 요청이 남의 자리를
  // 점유했다가 풀리는 낭비가 생긴다. 증빙은 requestId 로 조회되므로 같은 requestId 재시도는
  // 이중 과금 없이 통과한다 — 생성이 실패한 결제 사용자가 결과를 받을 수 있는 근거다.
  const paid = await resolveFusionFortunePaidAccess(resolvePaidAccess, { userId: text(userId, 120), requestId: safeId });
  if (!paid.ok) {
    return paid.degraded
      ? { ok: false, status: 503, retryable: true, error: FUSION_FORTUNE_ERROR_CODES.PAYMENT_CHECK_DEGRADED, message: "결제 내역을 확인하지 못했어요. 잠시 후 다시 시도해 주세요. 이미 결제하셨다면 차감되지 않습니다." }
      : { ok: false, status: 402, error: FUSION_FORTUNE_ERROR_CODES.PAYMENT_REQUIRED, message: "초융합 운세는 1회 30,000원입니다.", pricing: { featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY } };
  }

  const reservation = await store.reserve(userId, dateKey || getFusionFortuneDateKey(now), safeId, now);
  if (!reservation.ok) {
    return {
      ok: false,
      status: reservation.status,
      error: reservation.errorCode,
      // 이미 결제한 뒤 마감을 만난 경우다. 결제 증빙은 requestId 로 남아 있으므로 같은
      // requestId 로 내일 다시 시도하면 추가 결제 없이 결과를 받는다.
      message: reservation.errorCode === FUSION_FORTUNE_ERROR_CODES.SOLD_OUT
        ? "오늘 선착순 100명의 초융합 운세가 모두 마감되었어요. 결제하셨다면 내일 같은 화면에서 추가 결제 없이 이어서 받을 수 있어요."
        : "이미 처리 중인 요청입니다.",
      ...(reservation.errorCode === FUSION_FORTUNE_ERROR_CODES.SOLD_OUT ? { retryRequestId: safeId } : {}),
    };
  }
  let committed = false;
  try {
    throwIfFusionFortuneAborted(abortSignal);
    const contextResult = await contextBuilder(normalized, { now, env, onStage });
    if (!contextResult?.ok) throw Object.assign(new Error("context"), { code: FUSION_FORTUNE_ERROR_CODES.CONTEXT_FAILED });
    throwIfFusionFortuneAborted(abortSignal);
    const prompt = buildFusionFortunePrompt({ context: contextResult.context });
    const generated = await generator({ input: normalized, context: contextResult.context, prompt, env, requestId: safeId, userId });
    const result = generated?.result && generated?.deliverable !== undefined ? generated.result : generated;
    if (generated?.deliverable === false || !result) throw Object.assign(new Error("generation"), { code: FUSION_FORTUNE_ERROR_CODES.GENERATION_FAILED });
    const validated = validateFusionFortuneResult(result, fusionValidationOptions(contextResult.context, normalized));
    if (!validated.ok) throw Object.assign(new Error("result"), { code: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID });
    throwIfFusionFortuneAborted(abortSignal);
    if (typeof onDelivery === "function") {
      await onDelivery({ requestId: safeId, result: validated.value, generationSource: generated?.generationSource || "mock" });
    }
    throwIfFusionFortuneAborted(abortSignal);
    const commitResult = await store.commit(reservation, now);
    if (!commitResult) throw Object.assign(new Error("commit"), { code: FUSION_FORTUNE_ERROR_CODES.COMMIT_FAILED });
    committed = true;
    await emitFusionFortuneStage(onStage, "fusion");
    const status = await buildFusionFortuneStatus({ userId, store, now }).catch(() => ({
      isLoggedIn: true,
      pricing: { featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY },
      dailyLimit: { dateKey: reservation.dateKey, limit: 100, usedCount: count(commitResult.limit?.successCount), remainingCount: Math.max(0, 100 - count(commitResult.limit?.successCount)), isSoldOut: count(commitResult.limit?.successCount) >= 100, nextResetAt: getFusionFortuneNextResetAt(now) },
      canGenerate: count(commitResult.limit?.successCount) < 100,
      nextAction: count(commitResult.limit?.successCount) >= 100 ? "sold_out" : "generate",
      message: "초융합 운세 결과가 완성되었어요.",
    }));
    return { ok: true, status: 200, requestId: safeId, result: validated.value, fusionStatus: status, generationSource: generated?.generationSource || "mock", providerCalls: count(generated?.providerCalls) || undefined };
  } catch (error) {
    if (!committed) await store.release(reservation, now).catch(() => {});
    const code = error?.code || FUSION_FORTUNE_ERROR_CODES.GENERATION_FAILED;
    // 결제는 생성 전에 이미 끝났으므로 "차감되지 않았다"고 말하면 거짓이 된다. 실제로 안전한 것은
    // ①오늘의 선착순 자리 ②같은 requestId 재시도 시 추가 결제가 없다는 점이다.
    return { ok: false, status: code === FUSION_FORTUNE_ERROR_CODES.CANCELLED ? 499 : code === FUSION_FORTUNE_ERROR_CODES.CONTEXT_FAILED ? 502 : code === FUSION_FORTUNE_ERROR_CODES.FEATURE_DISABLED ? 503 : 500, error: code, message: code === FUSION_FORTUNE_ERROR_CODES.CANCELLED ? "분석을 중단했어요. 오늘의 선착순 자리는 차감되지 않았고, 다시 시도해도 추가 결제는 없습니다." : "결과를 준비하지 못했어요. 오늘의 선착순 자리는 차감되지 않았고, 다시 시도해도 추가 결제는 없습니다.", retryRequestId: safeId };
  }
}
