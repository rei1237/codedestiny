import {
  FusionFortuneDailyLimit,
  FusionFortuneGenerationAttempt,
  FusionFortuneTicketBalance,
  FusionFortuneTicketTransaction,
} from "./models.js";
import { mongoose } from "./db.js";
import { buildFusionFortunePrompt } from "./fusion-fortune-prompt.js";

export const FUSION_FORTUNE_TICKET_PRODUCT = Object.freeze({
  productId: "fusion_fortune_ticket_1",
  productType: "fusion_fortune_ticket",
  name: "초융합 운세 이용권",
  priceKRW: 10000,
  ticketAmount: 1,
  description: "사주·자미두수·베다점·숙요점·점성술·타로를 한 번에 엮어 1만자 이상의 깊은 초융합 운세를 볼 수 있어요.",
  allowedPurchaseChannels: ["pg"],
  blockedPurchaseChannels: ["pass", "family_pass", "free_pass", "event_pass", "credit", "conversation_credit", "fusion_fortune_ticket", "entitlement", "price_coverage", "monthly_entitlement"],
});

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
  NO_TICKET: "FUSION_FORTUNE_NO_TICKET",
  REQUEST_IN_PROGRESS: "FUSION_FORTUNE_REQUEST_IN_PROGRESS",
  CONTEXT_FAILED: "FUSION_FORTUNE_CONTEXT_FAILED",
  GENERATION_FAILED: "FUSION_FORTUNE_GENERATION_FAILED",
  RESULT_INVALID: "FUSION_FORTUNE_RESULT_INVALID",
  COMMIT_FAILED: "FUSION_FORTUNE_COMMIT_FAILED",
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

export function isFusionFortuneUiEnabled(env = {}) { return flag(env, "ENABLE_FUSION_FORTUNE_UI"); }
export function isFusionFortuneApiEnabled(env = {}) { return flag(env, "ENABLE_FUSION_FORTUNE_API"); }
export function isFusionFortuneMockFlowEnabled(env = {}) { return flag(env, "ENABLE_FUSION_FORTUNE_MOCK_FLOW"); }
export function isFusionFortuneRealLlmAllowed(env = {}) {
  return flag(env, "ENABLE_FUSION_FORTUNE_REAL_LLM")
    && flag(env, "ALLOW_FUSION_FORTUNE_REAL_LLM")
    && env.NODE_ENV !== "test"
    && Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY);
}
export function assertFusionFortuneTicketPurchaseAllowed(channel) {
  if (String(channel || "").toLowerCase() !== "pg") {
    const error = new Error("초융합 운세 이용권은 일반 이용권, family 이용권, 대화권, 무료권, 이벤트권, 잔여 크레딧, 월정석 보유 권한, price coverage 로직으로 구매할 수 없습니다.");
    error.code = "FUSION_FORTUNE_PURCHASE_CHANNEL_BLOCKED";
    error.status = 400;
    throw error;
  }
  return { channel: "pg", product: FUSION_FORTUNE_TICKET_PRODUCT };
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
  return {
    birthDate,
    birthTime,
    birthTimeUnknown,
    calendarType: text(input.calendarType, 10) === "lunar" ? "lunar" : "solar",
    gender: ["female", "male", "unspecified"].includes(text(input.gender, 20)) ? text(input.gender, 20) : "unspecified",
    nickname: text(input.nickname, 40),
    topic: text(input.topic, 80) || "삶의 전반적인 흐름",
    concern: text(input.concern, 1000),
  };
}

const FUSION_TAROT_CARD_IDS = Object.freeze(["major_00", "major_01", "major_02", "major_03", "major_04", "major_06", "major_07", "major_08", "major_09", "major_10", "major_11", "major_14", "major_17", "major_19", "major_21"]);

// 카드 선택은 서버 컨텍스트 생성 단계에서만 수행한다. LLM은 이 id와 position만 해석하며 새 카드를 만들 수 없다.
export function selectFusionFortuneTarotSpread(input = {}) {
  const seed = `${text(input.birthDate, 10)}|${text(input.birthTime, 5)}|${text(input.topic, 80)}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  const positions = ["core", "saju_bridge", "ziwei_bridge", "vedic_bridge", "relationship_bridge", "action_bridge"];
  return {
    spreadType: "fusion_six_system_bridge",
    cards: positions.map((position, index) => ({ position, cardId: FUSION_TAROT_CARD_IDS[Math.abs(hash + index * 7) % FUSION_TAROT_CARD_IDS.length] })),
  };
}

export async function buildFusionFortuneContext(input, options = {}) {
  const normalized = normalizeFusionFortuneInput(input);
  const { buildGuardianFortuneContext } = await import("./guardian-fortune-context.js");
  const guardian = await buildGuardianFortuneContext({
    birthDate: normalized.birthDate, birthTime: normalized.birthTime, birthTimeUnknown: normalized.birthTimeUnknown,
    calendarType: normalized.calendarType, gender: normalized.gender, topic: "daily", mode: "yeoni", concern: normalized.concern,
  }, options);
  if (!guardian?.ok || !guardian.context) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.CONTEXT_FAILED };
  return {
    ok: true,
    context: {
      version: "fusion-fortune.v1",
      birthTimeKnown: !normalized.birthTimeUnknown,
      systems: guardian.context.adapters || guardian.context.systems || {},
      tarotSpread: selectFusionFortuneTarotSpread(normalized),
      integratedInsight: guardian.context.integratedInsight || {},
      topic: normalized.topic,
      // Privacy boundary: no raw birth date, time, or concern is retained in the result context.
      inputSummary: { calendarType: normalized.calendarType, gender: normalized.gender, topic: normalized.topic },
    },
  };
}

function composeExpertReading(intro, vocabulary, target = 1250) {
  const lenses = [
    "기질의 강점은 빠르게 시작하는 힘보다, 무엇을 오래 지켜낼지 고르는 순간에 선명해집니다.",
    "관계에서는 상대를 설득하려는 속도와 내 감정을 알아차리는 속도 사이에 간격을 두면 불필요한 소모가 줄어듭니다.",
    "일과 돈의 흐름은 한 번의 큰 승부보다 반복 가능한 방식, 기록 가능한 성과, 감당할 수 있는 범위를 만들 때 안정됩니다.",
    "마음이 흔들릴 때는 결론을 앞당기기보다 사실과 해석을 나누어 적는 것이 본래의 판단력을 되찾는 데 도움이 됩니다.",
    "강점이 과해지면 책임을 혼자 떠안거나 선택지를 지나치게 넓힐 수 있으니, 지금의 우선순위를 한 문장으로 좁혀보세요.",
    "가까운 흐름에서는 새로운 것을 더하기보다 이미 시작한 일의 구조를 정리할 때 다음 기회가 들어올 자리가 생깁니다.",
    "관찰할 지점은 결과의 크기보다 회복 속도입니다. 작은 실패 뒤에 얼마나 부드럽게 다시 움직이는지가 현재 운의 활용도를 보여줍니다.",
    "실행은 거창할 필요가 없습니다. 오늘 확인할 사실 하나, 줄일 부담 하나, 솔직히 말할 경계 하나를 정하면 흐름이 현실과 연결됩니다.",
  ];
  let value = `${intro} ${vocabulary} `;
  let round = 0;
  while (value.length < target) {
    const lens = lenses[round % lenses.length];
    value += `${lens} ${round % 2 === 0 ? "이때 운세의 상징은 미래를 고정하는 판정이 아니라, 지금의 선택을 점검하는 질문으로 사용하는 편이 좋습니다." : "서로 다른 체계의 신호가 겹치는 부분은 가능성이 큰 반복 패턴으로 보고, 엇갈리는 부분은 상황에 따라 달라질 선택지로 남겨둡니다."} `;
    round += 1;
  }
  return value.slice(0, target);
}

function section(title, intro, vocabulary, length = 1250) {
  return {
    title,
    content: composeExpertReading(intro, vocabulary, length),
    keyPoints: ["강점이 과해지는 순간까지 함께 관찰하기", "감정과 사실을 나누어 선택 기준을 기록하기", "작은 실행의 결과를 다음 판단 근거로 남기기"],
  };
}

export async function generateFusionFortuneWithMockLLM({ context = {} } = {}) {
  const uncertainty = context.birthTimeKnown ? "생시 정보를 참고한 흐름" : "생시가 없어 시간 기반 정밀 해석은 유보한 흐름";
  return {
    title: "여섯 개의 별자리에서 만난 당신의 흐름",
    openingMessage: `서로 다른 여섯 체계가 공통으로 비추는 것은, 지금의 당신이 방향을 고르는 과정에 있다는 점입니다. ${uncertainty}을 바탕으로 삶의 전반을 차분히 엮어 보겠습니다.`,
    executiveSummary: composeExpertReading("이번 초융합 운세의 핵심은 힘을 한곳에 모으고 관계와 일의 리듬을 함께 정돈하는 데 있습니다.", "여섯 체계는 표현 방식은 달라도 선택을 서두를 때 생기는 소모와 기준을 세운 뒤 살아나는 집중력을 공통으로 비춥니다.", 900),
    sajuSection: section("사주: 기질과 선택의 뿌리", "사주의 일간과 월지, 오행과 십성은 일을 시작하고 관계를 유지하는 기본 리듬을 보여줍니다.", "오행은 많고 적음을 좋고 나쁨으로 가르기보다, 추진력·정리력·표현력·현실 감각·회복력 중 무엇이 자연스럽고 무엇이 의식적인 연습을 필요로 하는지 살피는 언어입니다."),
    ziweiSection: section("자미두수: 삶의 무대와 역할", "자미두수의 궁위와 주요 별은 사회적 역할, 재능의 배치, 관계에서 책임을 느끼는 지점을 비춥니다.", "명궁은 기본 태도, 관록궁은 일의 방식, 재백궁은 자원을 다루는 습관, 부처궁은 가까운 관계의 역할, 복덕궁은 혼자 있을 때의 회복 방식을 서로 연결해 읽습니다."),
    vedicSection: section("베다점: 무의식의 리듬", "베다점의 달과 나크샤트라는 감정이 반응하는 속도와 오래 반복된 배움의 패턴을 살펴봅니다.", "라그나와 문사인, 나크샤트라와 다샤는 컨텍스트에 제공된 범위 안에서만 사용하며, 카르마는 벌이나 숙명이 아니라 되풀이해 배우게 되는 선택 습관으로 해석합니다."),
    sukuyoSection: section("숙요점: 관계의 거리감", "숙요점은 사람 사이의 거리와 감정이 닿는 방식, 가까워질 때와 숨을 고를 때를 보여줍니다.", "본명숙과 관계 리듬은 누가 옳은지를 판정하기보다 친밀감이 편안해지는 속도, 갈등 뒤 회복하는 방식, 사회적 관계에서 에너지를 배분하는 습관을 살피는 데 사용합니다."),
    astrologySection: section("점성술: 감정과 표현의 방향", "점성술은 태양과 달의 상징을 통해 원하는 삶과 실제 감정 반응이 만나는 지점을 해석합니다.", "태양은 의식적인 방향, 달은 정서적 안전, 금성과 화성은 관계의 취향과 행동, 토성은 책임과 성장의 시간을 뜻하며 상승궁은 생시가 확인된 범위에서만 다룹니다."),
    tarotSection: section("타로: 지금의 선택을 비추는 카드", "서버에서 선택된 여섯 장의 타로 배치는 현재의 흐름을 한 단계씩 정리하도록 돕는 상징으로 사용됩니다.", "카드는 예언을 고정하는 도구가 아니라 핵심 주제, 체계 사이의 다리, 관계 반응, 다음 행동을 비추는 질문입니다. 서버가 지정한 카드와 포지션 밖의 상징은 덧붙이지 않습니다."),
    integratedReading: section("통합 해석: 하나의 상담으로 엮는 흐름", "여섯 체계가 함께 가리키는 핵심은 감정을 억누르거나 성급히 결론내리지 않고, 기준을 세워 현실의 행동으로 옮기는 과정입니다.", "공통 신호는 삶의 핵심 패턴으로, 서로 다른 신호는 상황별 선택지로 남깁니다. 사랑·일·돈·마음은 분리된 문제가 아니라 같은 선택 기준이 서로 다른 장면에서 나타난 결과로 연결해 읽습니다.", 1500),
    timingAndAction: { title: "가까운 시기와 현실적인 행동", content: composeExpertReading("가까운 시기에는 큰 결단보다 현재 가진 자원과 관계를 정리하는 작은 선택이 다음 기회를 만듭니다.", "시기 조언은 특정 사건을 예고하기보다 지금 준비할 것, 지켜볼 신호, 멈춰야 할 습관을 구분하는 데 초점을 둡니다.", 1050), luckyActions: ["이번 주 가장 중요한 일 하나를 문장으로 정리하기", "관계에서 원하는 경계를 부드럽게 말하기", "지출과 일정에서 반복되는 부담 한 가지 줄이기"], cautionPatterns: ["불안한 마음으로 답을 재촉하는 패턴", "남의 속도에 맞추다 내 계획을 놓치는 패턴", "준비 없이 한 번에 크게 바꾸려는 패턴"] },
    closingMessage: composeExpertReading("운세는 정답을 대신 정하는 말이 아니라, 더 나은 선택을 하도록 비추는 지도입니다.", "오늘의 작은 정리와 솔직한 경계가 다음 흐름을 바꾸는 현실적인 출발점이 됩니다.", 650),
    shareText: "여섯 개의 운세 체계를 하나의 상담으로 엮어, 지금의 나를 다시 읽어봤어요.",
  };
}

export function countFusionFortuneVisibleText(result = {}) {
  return [result.title, result.openingMessage, result.executiveSummary, ...SECTION_KEYS.flatMap((key) => [result[key]?.title, result[key]?.content, ...(result[key]?.keyPoints || [])]), result.timingAndAction?.title, result.timingAndAction?.content, ...(result.timingAndAction?.luckyActions || []), ...(result.timingAndAction?.cautionPatterns || []), result.closingMessage].join(" ").length;
}

export function validateFusionFortuneResult(result = {}, { birthTimeKnown = true, sensitiveValues = [] } = {}) {
  const source = JSON.stringify(result || {});
  const required = ["title", "openingMessage", "executiveSummary", "timingAndAction", "closingMessage"];
  if (required.some((key) => !text(result[key], 20000))) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["missing_required"] };
  if (SECTION_KEYS.some((key) => text(result[key]?.content, 50000).length < 900 || !Array.isArray(result[key]?.keyPoints) || result[key].keyPoints.length < 3)) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["section_depth"] };
  if (text(result.executiveSummary, 50000).length < 600 || text(result.timingAndAction?.content, 50000).length < 800) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["summary_or_action_depth"] };
  if (!Array.isArray(result.timingAndAction?.luckyActions) || result.timingAndAction.luckyActions.length < 3 || !Array.isArray(result.timingAndAction?.cautionPatterns) || result.timingAndAction.cautionPatterns.length < 3) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["missing_actions"] };
  if (FORBIDDEN.some((phrase) => source.includes(phrase))) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["unsafe_phrase"] };
  if (/(raw[_ ]?(prompt|response|context)|paymentId|merchantUid|ticketRemaining|totalRemaining)/i.test(source)) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["internal_data_exposed"] };
  const exposedSensitiveValue = sensitiveValues.map((value) => text(value, 100)).find((value) => value.length >= 4 && source.includes(value));
  if (exposedSensitiveValue) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["private_input_exposed"] };
  if (!birthTimeKnown && /(상승궁은|라그나는|정밀 명반은)/.test(source)) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["birth_time_overclaim"] };
  const length = countFusionFortuneVisibleText(result);
  if (length < 10000 || length > 15000) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID, issues: ["length"], length };
  return { ok: true, value: result, length };
}

export function createMemoryFusionFortuneStore(seed = {}) {
  const balances = new Map(Object.entries(seed.balances || {})); const daily = new Map(Object.entries(seed.daily || {})); const attempts = new Map(Object.entries(seed.attempts || {})); const transactions = [...(seed.transactions || [])];
  let reservationQueue = Promise.resolve();
  const withReservationLock = (run) => {
    const previous = reservationQueue;
    let release;
    reservationQueue = new Promise((resolve) => { release = resolve; });
    return previous.then(async () => { try { return await run(); } finally { release(); } });
  };
  return {
    balances, daily, attempts, transactions,
    async getBalance(userId) { return balances.get(String(userId)) || { totalRemaining: 0, purchasedTotal: 0, usedTotal: 0, refundedTotal: 0, reserved: 0 }; },
    async getDaily(dateKey) { return daily.get(dateKey) || { dateKey, limit: 100, successCount: 0, reserved: 0 }; },
    async reserve(userId, dateKey, requestId) { return withReservationLock(async () => {
      if (attempts.has(requestId)) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.REQUEST_IN_PROGRESS, status: 409 };
      const balance = await this.getBalance(userId); const limit = await this.getDaily(dateKey);
      if (count(limit.successCount) + count(limit.reserved) >= 100) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.SOLD_OUT, status: 429 };
      if (count(balance.totalRemaining) - count(balance.reserved) < 1) return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.NO_TICKET, status: 402 };
      balance.reserved = count(balance.reserved) + 1; limit.reserved = count(limit.reserved) + 1; balances.set(String(userId), balance); daily.set(dateKey, limit); attempts.set(requestId, { userId: String(userId), dateKey, status: "reserved" }); return { ok: true, userId: String(userId), dateKey, requestId };
    }); },
    async release(reservation) { const balance = await this.getBalance(reservation.userId); const limit = await this.getDaily(reservation.dateKey); balance.reserved = Math.max(0, count(balance.reserved) - 1); limit.reserved = Math.max(0, count(limit.reserved) - 1); balances.set(reservation.userId, balance); daily.set(reservation.dateKey, limit); attempts.set(reservation.requestId, { ...attempts.get(reservation.requestId), status: "released" }); },
    async commit(reservation) { const balance = await this.getBalance(reservation.userId); const limit = await this.getDaily(reservation.dateKey); if (count(balance.reserved) < 1 || count(balance.totalRemaining) < 1 || count(limit.reserved) < 1) return null; balance.reserved -= 1; balance.totalRemaining -= 1; balance.usedTotal = count(balance.usedTotal) + 1; limit.reserved -= 1; limit.successCount = count(limit.successCount) + 1; balances.set(reservation.userId, balance); daily.set(reservation.dateKey, limit); transactions.push({ userId: reservation.userId, type: "use", amount: -1, balanceAfter: balance.totalRemaining, fusionRequestId: reservation.requestId }); attempts.set(reservation.requestId, { ...attempts.get(reservation.requestId), status: "completed" }); return { balance, limit }; },
  };
}

export function createMongoFusionFortuneStore() {
  return {
    async getBalance(userId) { return (await FusionFortuneTicketBalance.findOne({ userId: objectIdOrString(userId) }).lean()) || { totalRemaining: 0, purchasedTotal: 0, usedTotal: 0, refundedTotal: 0, reserved: 0 }; },
    async getDaily(dateKey) { return (await FusionFortuneDailyLimit.findOne({ dateKey }).lean()) || { dateKey, limit: 100, successCount: 0, reserved: 0 }; },
    async reserve(userId, dateKey, requestId, now = new Date()) {
      try { await FusionFortuneGenerationAttempt.create({ requestId, userId: objectIdOrString(userId), dateKey, status: "reserved", expiresAt: new Date(now.getTime() + 10 * 60 * 1000) }); } catch { return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.REQUEST_IN_PROGRESS, status: 409 }; }
      const daily = await FusionFortuneDailyLimit.findOneAndUpdate({ dateKey, $expr: { $lt: [{ $add: [{ $ifNull: ["$successCount", 0] }, { $ifNull: ["$reserved", 0] }] }, 100] } }, { $setOnInsert: { timezone: "Asia/Seoul", limit: 100, successCount: 0, createdAt: now }, $inc: { reserved: 1 }, $set: { updatedAt: now } }, { new: true, upsert: true }).lean();
      if (!daily) { await FusionFortuneGenerationAttempt.updateOne({ requestId }, { $set: { status: "blocked", errorCode: FUSION_FORTUNE_ERROR_CODES.SOLD_OUT } }); return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.SOLD_OUT, status: 429 }; }
      const balance = await FusionFortuneTicketBalance.findOneAndUpdate({ userId: objectIdOrString(userId), $expr: { $gte: [{ $subtract: [{ $ifNull: ["$totalRemaining", 0] }, { $ifNull: ["$reserved", 0] }] }, 1] } }, { $inc: { reserved: 1 }, $set: { updatedAt: now } }, { new: true }).lean();
      if (!balance) { await FusionFortuneDailyLimit.updateOne({ dateKey, reserved: { $gt: 0 } }, { $inc: { reserved: -1 }, $set: { updatedAt: now } }); await FusionFortuneGenerationAttempt.updateOne({ requestId }, { $set: { status: "blocked", errorCode: FUSION_FORTUNE_ERROR_CODES.NO_TICKET } }); return { ok: false, errorCode: FUSION_FORTUNE_ERROR_CODES.NO_TICKET, status: 402 }; }
      return { ok: true, userId: String(userId), dateKey, requestId };
    },
    async release(reservation, now = new Date()) { await Promise.all([FusionFortuneTicketBalance.updateOne({ userId: objectIdOrString(reservation.userId), reserved: { $gt: 0 } }, { $inc: { reserved: -1 }, $set: { updatedAt: now } }), FusionFortuneDailyLimit.updateOne({ dateKey: reservation.dateKey, reserved: { $gt: 0 } }, { $inc: { reserved: -1 }, $set: { updatedAt: now } }), FusionFortuneGenerationAttempt.updateOne({ requestId: reservation.requestId }, { $set: { status: "released" } })]); },
    async commit(reservation, now = new Date()) { const balance = await FusionFortuneTicketBalance.findOneAndUpdate({ userId: objectIdOrString(reservation.userId), reserved: { $gt: 0 }, totalRemaining: { $gt: 0 } }, { $inc: { reserved: -1, totalRemaining: -1, usedTotal: 1 }, $set: { updatedAt: now } }, { new: true }).lean(); if (!balance) return null; const limit = await FusionFortuneDailyLimit.findOneAndUpdate({ dateKey: reservation.dateKey, reserved: { $gt: 0 }, successCount: { $lt: 100 } }, { $inc: { reserved: -1, successCount: 1 }, $set: { updatedAt: now } }, { new: true }).lean(); if (!limit) { await FusionFortuneTicketBalance.updateOne({ userId: objectIdOrString(reservation.userId) }, { $inc: { totalRemaining: 1, usedTotal: -1 }, $set: { updatedAt: now } }); return null; } await FusionFortuneTicketTransaction.create({ userId: objectIdOrString(reservation.userId), type: "use", amount: -1, balanceAfter: count(balance.totalRemaining), productId: FUSION_FORTUNE_TICKET_PRODUCT.productId, fusionRequestId: reservation.requestId, reason: "fusion_fortune_generation" }); await FusionFortuneGenerationAttempt.updateOne({ requestId: reservation.requestId }, { $set: { status: "completed" } }); return { balance, limit }; },
  };
}

export async function buildFusionFortuneStatus({ userId = "", store, now = new Date(), enabled = true } = {}) {
  const dateKey = getFusionFortuneDateKey(now); const loggedIn = Boolean(text(userId));
  if (!enabled) return { isLoggedIn: loggedIn, ticket: { remaining: 0, canUse: false }, dailyLimit: { dateKey, limit: 100, usedCount: 0, remainingCount: 0, isSoldOut: false }, canGenerate: false, nextAction: "disabled", message: "초융합 운세는 준비 중입니다." };
  if (!loggedIn) return { isLoggedIn: false, ticket: { remaining: 0, canUse: false }, dailyLimit: { dateKey, limit: 100, usedCount: 0, remainingCount: 100, isSoldOut: false, nextResetAt: getFusionFortuneNextResetAt(now) }, canGenerate: false, nextAction: "login", message: "초융합 운세는 로그인 후 이용할 수 있어요.", cta: { label: "로그인하기", targetPath: "/login", reason: "ticket_owner_required" } };
  const [balance, daily] = await Promise.all([store.getBalance(userId), store.getDaily(dateKey)]); const remaining = Math.max(0, 100 - count(daily.successCount) - count(daily.reserved)); const ticketRemaining = Math.max(0, count(balance.totalRemaining) - count(balance.reserved)); const soldOut = remaining === 0; const nextAction = soldOut ? "sold_out" : ticketRemaining > 0 ? "generate" : "buy_ticket";
  return { isLoggedIn: true, ticket: { remaining: ticketRemaining, canUse: ticketRemaining > 0 }, dailyLimit: { dateKey, limit: 100, usedCount: count(daily.successCount), remainingCount: remaining, isSoldOut: soldOut, nextResetAt: getFusionFortuneNextResetAt(now) }, canGenerate: !soldOut && ticketRemaining > 0, nextAction, message: soldOut ? "오늘 선착순 100명의 초융합 운세가 모두 마감되었어요." : ticketRemaining > 0 ? `오늘 선착순 ${remaining}자리가 남아 있어요. 이용권으로 결과를 생성할 수 있어요.` : `오늘 선착순 ${remaining}자리가 남아 있어요. 초융합 운세 이용권이 필요해요.`, cta: soldOut ? { label: "다른 운세 보기", targetPath: "/", reason: "daily_sold_out" } : ticketRemaining > 0 ? undefined : { label: "이용권 구매하기", targetPath: "/fusion-fortune#ticket", reason: "ticket_required" } };
}

export async function generateFusionFortuneRequest({ input = {}, userId = "", requestId, dateKey, store, now = new Date(), contextBuilder = buildFusionFortuneContext, generator = generateFusionFortuneWithMockLLM } = {}) {
  if (!text(userId)) return { ok: false, status: 401, error: FUSION_FORTUNE_ERROR_CODES.AUTH_REQUIRED, message: "로그인이 필요합니다." };
  let normalized; try { normalized = normalizeFusionFortuneInput(input); } catch { return { ok: false, status: 400, error: FUSION_FORTUNE_ERROR_CODES.INVALID_INPUT, message: "입력 정보를 확인해 주세요." }; }
  const safeId = safeRequestId(requestId); const reservation = await store.reserve(userId, dateKey || getFusionFortuneDateKey(now), safeId, now); if (!reservation.ok) return { ok: false, status: reservation.status, error: reservation.errorCode, message: reservation.errorCode === FUSION_FORTUNE_ERROR_CODES.SOLD_OUT ? "오늘 선착순 100명의 초융합 운세가 모두 마감되었어요." : reservation.errorCode === FUSION_FORTUNE_ERROR_CODES.NO_TICKET ? "초융합 운세 이용권이 필요해요." : "이미 처리 중인 요청입니다." };
  try { const contextResult = await contextBuilder(normalized, { now }); if (!contextResult?.ok) throw Object.assign(new Error("context"), { code: FUSION_FORTUNE_ERROR_CODES.CONTEXT_FAILED }); const prompt = buildFusionFortunePrompt({ context: contextResult.context }); const result = await generator({ context: contextResult.context, prompt }); const validated = validateFusionFortuneResult(result, { birthTimeKnown: contextResult.context.birthTimeKnown, sensitiveValues: [normalized.birthDate, normalized.birthTime, normalized.concern] }); if (!validated.ok) throw Object.assign(new Error("result"), { code: FUSION_FORTUNE_ERROR_CODES.RESULT_INVALID }); const committed = await store.commit(reservation, now); if (!committed) throw Object.assign(new Error("commit"), { code: FUSION_FORTUNE_ERROR_CODES.COMMIT_FAILED }); const status = await buildFusionFortuneStatus({ userId, store, now }); return { ok: true, status: 200, requestId: safeId, result: validated.value, fusionStatus: status, generationSource: "mock" }; } catch (error) { await store.release(reservation, now).catch(() => {}); const code = error?.code || FUSION_FORTUNE_ERROR_CODES.GENERATION_FAILED; return { ok: false, status: code === FUSION_FORTUNE_ERROR_CODES.CONTEXT_FAILED ? 502 : 500, error: code, message: "결과를 준비하지 못했어요. 이용권과 오늘의 한도는 차감되지 않았습니다." }; }
}
