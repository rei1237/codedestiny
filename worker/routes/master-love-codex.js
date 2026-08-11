/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  마스터 인연의 서  (MASTER_LOVE_CODEX)  —  워커 라우트
 * ───────────────────────────────────────────────────────────────────────────
 *  회당 결제(per-use) LLM 20챕터·5만자 전자책 생성 엔드포인트.
 *   - GET  /api/master-love-codex/plan          챕터 목차/목표 분량(정적, 무인증)
 *   - POST /api/master-love-codex/ensure-access 이용권 선검사 → 커버 시 무료 통과 / 미커버 시 402
 *   - POST /api/master-love-codex/start         접근 검증 후 세션 생성(status: generating)
 *   - POST /api/master-love-codex/generate      4챕터씩 배치 생성 → 세션에 누적 저장
 *   - GET  /api/master-love-codex/session       저장된 세션 재열람(재결제 없음)
 *
 *  결제: featureKey `master-love-codex`(500코인=50,000원). 이용권은 family만 커버한다
 *        (PASS_LIMITS standard 30 / premium 50 / vvip 100 < 500).
 *  명식(사주)·명반(자미두수)은 로컬 결정론 계산, LLM은 해석 텍스트만 생성한다.
 *  챕터/프롬프트 정의: worker/lib/master-love-codex-prompt.mjs
 *
 *  ▶ 접근 키워드: `MASTER_LOVE_CODEX`, `master-love-codex`, `handleMasterLoveCodexRoutes`
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import { EDGE_RESPONSE_DEADLINE_MS } from "../lib/sync-llm-timeout.js";
import { MasterLoveCodexSession, MonthlyCreditLedger, Payment, PointHistory, User } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement, resolveMonthlySpendQuota, resolvePremiumQuota } from "../lib/profile-limits.js";
// 🔴 상담 포함횟수/월 누적 한도의 cycleKey 는 entitlement 의 expiresAt 에서 나온다. coin-gate(billing.js)가
// 쓰는 것과 같은 생산자를 써야 두 곳의 cycleKey 가 일치하고, 저장된 카운터를 실제로 읽을 수 있다
// (다른 생산자를 쓰면 storedKey 불일치로 used 가 항상 0 이 되어 검사가 조용히 무력해진다).
import { resolveCanonicalEntitlement } from "../lib/entitlement-policy.js";
import { callGeminiText } from "../lib/gemini.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { calculateLifeBookAiSaju } from "../lib/life-book-ai-saju.js";
import { calculateZiweiAiChart } from "../lib/ziwei-ai-chart.js";
import {
  LOVE_DNA_METRICS,
  MASTER_LOVE_CODEX_CHAPTERS,
  MASTER_LOVE_CODEX_META,
  buildMasterLoveCodexChapterPrompt,
  getMasterLoveCodexPlan,
} from "../lib/master-love-codex-prompt.mjs";
import {
  LOVE_DNA_COMPAT_METRICS,
  MASTER_LOVE_CODEX_COMPAT_CHAPTERS,
  MASTER_LOVE_CODEX_COMPAT_META,
  buildMasterLoveCodexCompatChapterPrompt,
  getMasterLoveCodexCompatPlan,
} from "../lib/master-love-codex-compat-prompt.mjs";
import { buildMasterLoveCodexCompatibility } from "../lib/master-love-codex-compat.js";

const SERVICE_KEY = "master-love-codex";
const FEATURE_KEY = MASTER_LOVE_CODEX_META.featureKey;
const COMPAT_FEATURE_KEY = MASTER_LOVE_CODEX_COMPAT_META.featureKey;
const ACCESS_TOKEN_TYPE = "master-love-codex-access";
const ACCESS_TOKEN_TTL = "45m";
const TITLE = MASTER_LOVE_CODEX_META.label;

/**
 * 모드 정본 테이블.
 *  - solo   : 본인 명식·명반만. featureKey `master-love-codex` (300코인=30,000원)
 *  - compat : 상대 명식·명반까지 4개 차트 + 궁합 판정. featureKey `master-love-codex-compat` (500코인=50,000원)
 * 상대 정보가 없으면 언제나 solo 로 떨어진다(가격이 낮은 쪽이 기본).
 */
const MODES = Object.freeze({
  solo: Object.freeze({
    mode: "solo",
    featureKey: FEATURE_KEY,
    title: MASTER_LOVE_CODEX_META.label,
    chapters: MASTER_LOVE_CODEX_CHAPTERS,
    dnaMetrics: LOVE_DNA_METRICS,
    cacheKeyExtra: "master-love-codex-v2", // 프롬프트 지시문 상향(v2) — 캐시 키는 프롬프트 전문도 해시한다
  }),
  compat: Object.freeze({
    mode: "compat",
    featureKey: COMPAT_FEATURE_KEY,
    title: MASTER_LOVE_CODEX_COMPAT_META.label,
    chapters: MASTER_LOVE_CODEX_COMPAT_CHAPTERS,
    dnaMetrics: LOVE_DNA_COMPAT_METRICS,
    cacheKeyExtra: "master-love-codex-compat-v1",
  }),
});

function resolveMode(value) {
  return clean(value) === "compat" ? MODES.compat : MODES.solo;
}
const KNOWN_FEATURE_KEYS = Object.freeze([FEATURE_KEY, COMPAT_FEATURE_KEY]);

const CHAPTER_CONCURRENCY = 4; // Gemini 병렬 상한(레이트리밋·subrequest 안전)
const CHAPTER_BATCH_SIZE = CHAPTER_CONCURRENCY; // 한 요청 = 1 동시성 웨이브 → 엣지 100초 컷 회피
const CHAPTER_TIMEOUT_MS = 60000;

/**
 * 🔴 배치 1회의 벽시계 상한. 이 예산이 없으면 요청이 엣지 컷(100초)에 잘려
 *    JSON 대신 게이트웨이 HTML 이 나가고, 클라이언트는 원인을 잃은 채 "생성 실패"만 본다.
 *
 * 왜 CHAPTER_TIMEOUT_MS 로는 부족한가 — 그 값은 `callGeminiText` 안에서 **Gemini fetch 하나만**
 * 묶는다. 그 뒤에 붙는 Workers AI 폴백 체인(lib/llm-client.ts `callCloudflareWorkersAI`)은
 * `env.AI.run` 에 signal 을 넘기지 않아 **아무 타임아웃도 없고**, 모델 2개를 순차로 시도한다.
 * 그래서 한 장의 실제 상한은 "60초"가 아니라 "60초 + 폴백 무제한"이다.
 *
 * 남는 22초는 인증·DB 왕복·프롬프트 구성·병합 저장 몫이다.
 */
const BATCH_BUDGET_MS = EDGE_RESPONSE_DEADLINE_MS - 22_000;
/** 이보다 적게 남았으면 새 장을 시작하지 않는다 — 시작해도 예산 안에 못 끝낸다. */
const CHAPTER_MIN_BUDGET_MS = 12_000;
/**
 * 배치 락 TTL. 반드시 BATCH_BUDGET_MS 보다 크고 엣지 컷보다 크게 두되 과하게 길면 안 된다.
 * 🔴 예전 390초는 엣지 컷(100초)의 4배라, 엣지가 요청을 끊어 락 해제 코드가 돌지 못하면
 *    세션이 6분 반 동안 409(GENERATION_IN_PROGRESS)만 뱉어 재시도가 통째로 막혔다.
 *    이제 배치가 BATCH_BUDGET_MS 안에서 반드시 반환하므로 이 값을 그에 맞춰 좁힌다.
 */
const BATCH_LOCK_TTL_MS = 120_000;

const MESSAGES = {
  loginRequired: "마스터 인연의 서를 열려면 로그인이 필요합니다.",
  invalidInput: "생년월일과 태어난 시각(또는 '태어난 시각 모름')을 확인해 주세요.",
  paymentRequired: "마스터 인연의 서는 회당 결제가 필요합니다.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 끝났다면 잠시 후 다시 시도해 주세요.",
  calculationFailed: "명식과 명반을 세우는 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  notFound: "요청하신 인연의 서를 찾을 수 없습니다.",
  serverError: "인연의 서를 준비하는 중 문제가 발생했습니다.",
  busy: "이미 다른 창에서 이어 쓰는 중입니다. 잠시 후 다시 시도해 주세요.",
};

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}
function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function sha256(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}
function uniq(values = []) {
  return Array.from(new Set(values.map((value) => clean(value)).filter(Boolean)));
}
function objectIdLike(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function invalidInput(message = MESSAGES.invalidInput, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message }, { status });
}
function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.loginRequired }, { status: 401 });
}
function serverError(message = MESSAGES.serverError, status = 500) {
  return json({ ok: false, reason: "SERVER_ERROR", message }, { status });
}
function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: MESSAGES.paymentVerifyFailed }, { status: 402 });
}
function isAdmin(auth = {}) {
  return clean(auth.role).toLowerCase() === "admin";
}

/** 출생 정보 한 사람분 정규화 (본인·상대 공용) */
function normalizePerson(src = {}) {
  const genderRaw = clean(src.gender).toLowerCase();
  const person = {
    name: clean(src.name, 40),
    gender: genderRaw === "male" || genderRaw === "female" ? genderRaw : "",
    birthDate: clean(src.birthDate, 10),
    birthTime: clean(src.birthTime, 5),
    birthTimeUnknown: src.birthTimeUnknown === true || src.birthTimeUnknown === "true",
    calendarType: clean(src.calendarType).toLowerCase() === "lunar" ? "lunar" : "solar",
    isLeapMonth: src.isLeapMonth === true || src.isLeapMonth === "true",
  };
  if (person.birthTimeUnknown) person.birthTime = "";
  return person;
}

function personHashParts(person) {
  return [
    person.birthDate, person.birthTime, person.birthTimeUnknown,
    person.calendarType, person.isLeapMonth, person.gender,
  ];
}

/** 상대 정보가 실제로 들어왔는지 — 생년월일이 유일한 판정 기준이다. */
function hasPartnerSignal(src) {
  return /^\d{4}-\d{2}-\d{2}$/.test(clean(asObject(src).birthDate, 10));
}

/**
 * 입력 정규화: 명식·명반 계산에 필요한 출생 정보만 받는다.
 * 상대(partnerInfo)가 함께 오면 궁합 모드로 전환된다 — 없으면 기존 솔로 경로 그대로다.
 */
function normalizeInput(body = {}) {
  const src = asObject(body.birthInfo || body);
  const birthInfo = normalizePerson(src);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthInfo.birthDate)) return { ok: false, message: MESSAGES.invalidInput };
  if (!birthInfo.gender) return { ok: false, message: "성별을 선택해 주세요." };
  if (!birthInfo.birthTime && !birthInfo.birthTimeUnknown) {
    return { ok: false, message: "태어난 시각을 입력하거나 '태어난 시각 모름'을 선택해 주세요." };
  }

  const partnerSrc = asObject(body.partnerInfo || body.partner || src.partnerInfo);
  const wantsCompat = hasPartnerSignal(partnerSrc);
  let partnerInfo = null;
  if (wantsCompat) {
    partnerInfo = normalizePerson(partnerSrc);
    // 상대는 생년월일만 필수다. 시각을 안 적었으면 '모름'으로 받아 정오 기준으로 세운다.
    if (!partnerInfo.birthTime) partnerInfo.birthTimeUnknown = true;
  }

  const prologueChoiceRaw = clean(body.prologueChoice, 20).toLowerCase();
  const prologueChoice = ["yes", "unsure", "partner", "self"].includes(prologueChoiceRaw) ? prologueChoiceRaw : "";

  // 솔로 해시는 기존 문자열을 문자 단위로 보존한다 — 바꾸면 진행 중 세션의 토큰 검증이 깨진다.
  const selfHashSource = personHashParts(birthInfo).join("|");
  const inputHash = sha256(
    partnerInfo ? `${selfHashSource}|compat|${personHashParts(partnerInfo).join("|")}` : selfHashSource,
  );

  return { ok: true, mode: partnerInfo ? "compat" : "solo", birthInfo, partnerInfo, prologueChoice, inputHash };
}

/**
 * 명식·명반을 세운다. 궁합이면 상대 것까지 4개를 세우고 궁합 판정을 함께 만든다.
 * 실패 시 code=CALCULATION_FAILED
 */
function buildCharts(normalized) {
  const { birthInfo, partnerInfo } = asObject(normalized);
  try {
    const year = new Date().getFullYear();
    const saju = calculateLifeBookAiSaju(birthInfo);
    const ziweiChart = calculateZiweiAiChart({ birthInfo }, { year });
    if (!partnerInfo) return { saju, ziweiChart, partnerSaju: null, partnerZiweiChart: null, compatibility: null };

    const partnerSaju = calculateLifeBookAiSaju(partnerInfo);
    const partnerZiweiChart = calculateZiweiAiChart({ birthInfo: partnerInfo }, { year });
    const compatibility = buildMasterLoveCodexCompatibility({
      selfSaju: saju, selfZiwei: ziweiChart, partnerSaju, partnerZiwei: partnerZiweiChart,
    });
    return { saju, ziweiChart, partnerSaju, partnerZiweiChart, compatibility };
  } catch (error) {
    const failure = new Error(clean(error?.message, 200) || "chart calculation failed");
    failure.code = "CALCULATION_FAILED";
    throw failure;
  }
}

// ─── 가격 / 결제 페이로드 ────────────────────────────────────────────────────

function getPricing(modeKey = "solo") {
  const modeDef = resolveMode(modeKey);
  const resolved = getBillingFeaturePricing({ featureKey: modeDef.featureKey, reason: modeDef.title });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || 0);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error(`${modeDef.featureKey} price not found`);
    error.code = "PRICE_NOT_FOUND";
    throw error;
  }
  return {
    pricing, coinPrice, amountKRW,
    membershipCreditCost: calculateMembershipCreditCost(coinPrice),
    featureKey: modeDef.featureKey,
    title: modeDef.title,
  };
}

/**
 * 결제창 페이로드. paymentMode 를 하드코딩하지 않는다 —
 * 하드코딩하면 클라이언트 게이트가 이용권 선검사를 건너뛰고 월정석 옵션이 사라진다.
 */
function buildBillingGatePayload(pricing, idempotencyKey) {
  const featureKey = clean(pricing.featureKey) || FEATURE_KEY;
  const title = clean(pricing.title) || TITLE;
  const gate = {
    categoryKey: "premium-consultation",
    subFeatureKey: featureKey,
    featureKey,
    reason: title,
    productId: SERVICE_KEY,
    productType: SERVICE_KEY,
    serviceType: featureKey,
    cost: pricing.coinPrice,
    coinPrice: pricing.coinPrice,
    totalAmount: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    amountKRW: pricing.amountKRW,
    amountKrw: pricing.amountKRW,
    membershipCreditCost: pricing.membershipCreditCost,
    requestId: idempotencyKey,
    idempotencyKey,
  };
  return {
    billingMode: "coin-gate",
    serviceKey: SERVICE_KEY,
    serviceId: SERVICE_KEY,
    contentId: FEATURE_KEY,
    contentType: SERVICE_KEY,
    title: TITLE,
    orderName: TITLE,
    currency: "KRW",
    checkoutEndpoint: "/api/billing/checkout",
    confirmEndpoint: "/api/billing/confirm",
    ...gate,
    runtimeGate: gate,
  };
}

function paymentRequired(pricing, idempotencyKey) {
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: MESSAGES.paymentRequired,
    paymentPayload: buildBillingGatePayload(pricing, idempotencyKey),
  }, { status: 402 });
}

// ─── 결제 증거 확인 (requestId 바인딩) ───────────────────────────────────────
//
// 회당 결제이므로 "과거에 한 번 산 적이 있다"로 통과시키면 안 된다(무한 재생성).
// 이번 요청의 idempotencyKey/requestId 로 방금 완료된 결제만 인정한다.

function readBillingContext(body = {}) {
  const billing = asObject(body.billingGate || body.billingEvidence || body.billing || body.paymentEvidence);
  const consume = asObject(body.billingConsume || body.consume || billing.consume);
  const accessGrant = asObject(body.billingAccessGrant || body.accessGrant || billing.accessGrant);
  return { billing, consume, accessGrant };
}

function collectBillingTokens(body = {}, idempotencyKey = "") {
  const ctx = readBillingContext(body);
  return uniq([
    idempotencyKey,
    body.billingRequestId, body.paymentId, body.transactionId, body.purchaseId, body.requestId,
    ctx.billing.transactionId, ctx.billing.purchaseId, ctx.billing.paymentId, ctx.billing.requestId,
    ctx.consume.transactionId, ctx.consume.purchaseId, ctx.consume.requestId,
    ctx.consume.pointHistoryId, ctx.consume.ledgerId, ctx.consume.monthlyCreditLedgerId,
    ctx.accessGrant.purchaseId, ctx.accessGrant.paymentId, ctx.accessGrant.requestId,
  ]);
}

function metadataTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
    clauses.push({ "metadata.transactionId": token });
    if (objectIdLike(token)) clauses.push({ _id: token });
  });
  return clauses;
}

function paymentTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ requestId: token }, { idempotencyKey: token }, { merchantUid: token }, { impUid: token });
    clauses.push({ "metadata.requestId": token }, { "metadata.idempotencyKey": token });
  });
  return clauses;
}

/**
 * @param {{ userId: string, idempotencyKey: string, body: object, featureKey: string }} params
 *   🔴 featureKey 는 반드시 이 요청의 모드 것을 넘긴다. 상수(개인판)로 박으면 궁합판(500코인)
 *      결제가 `master-love-codex-compat` 로 기록되는데 개인판 키로 찾게 되어 증빙을 못 찾고,
 *      결제를 마친 사용자가 /start 에서 402 를 받는다(돈만 나간다).
 *      반대로 두 키를 함께 받아들이면 30,000원 결제로 50,000원 상품을 받게 되므로 정확히 일치시킨다.
 */
async function findBillingEvidence({ userId, idempotencyKey, body, featureKey }) {
  if (!objectIdLike(userId)) return null;
  const evidenceFeatureKey = clean(featureKey) || FEATURE_KEY;
  const tokens = collectBillingTokens(body, idempotencyKey);
  if (!tokens.length) return null;

  const pointClauses = metadataTokenClauses(tokens);
  const point = await PointHistory.findOne({
    userId,
    featureKey: evidenceFeatureKey,
    kind: "deduct",
    "metadata.coinRefundedForUnlockFailure": { $ne: true },
    "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
    "metadata.refundedForServiceExecution": { $ne: true },
    $or: pointClauses,
  }).sort({ createdAt: -1 }).lean();
  if (point) {
    return { ok: true, accessType: "paid", paymentId: clean(point._id, 160), billingRequestId: clean(point?.metadata?.requestId || idempotencyKey, 180) };
  }

  const ledger = await MonthlyCreditLedger.findOne({
    userId,
    type: "MONTHLY_CREDIT_SPEND",
    "metadata.featureKey": evidenceFeatureKey,
    "metadata.refundedForUnlockFailure": { $ne: true },
    "metadata.refundedForServiceExecution": { $ne: true },
    $or: pointClauses,
  }).sort({ createdAt: -1 }).lean();
  if (ledger) {
    return { ok: true, accessType: "monthly_credit", paymentId: clean(ledger._id, 160), billingRequestId: clean(ledger?.metadata?.requestId || idempotencyKey, 180) };
  }

  const payment = await Payment.findOne({
    userId,
    featureKey: evidenceFeatureKey,
    status: { $in: ["paid", "success", "fulfilled"] },
    $or: paymentTokenClauses(tokens),
  }).sort({ updatedAt: -1, createdAt: -1 }).lean();
  if (payment) {
    return { ok: true, accessType: "paid", paymentId: clean(payment.merchantUid || payment.impUid || payment._id, 160), billingRequestId: clean(payment.requestId || payment.idempotencyKey || idempotencyKey, 180) };
  }

  return null;
}

// ─── 액세스 토큰 ─────────────────────────────────────────────────────────────

/**
 * 액세스 토큰은 모드별 featureKey 를 함께 서명한다.
 * 🔴 이걸 상수로 박으면 30,000원(개인) 결제로 받은 토큰이 50,000원(궁합) 생성에도 통과한다.
 */
async function createAccessToken(env, payload, modeKey = "solo") {
  const modeDef = resolveMode(modeKey);
  return signJwt(
    { typ: ACCESS_TOKEN_TYPE, serviceKey: SERVICE_KEY, featureKey: modeDef.featureKey, mode: modeDef.mode, ...payload },
    getAccessTokenSecret(env),
    { expiresIn: ACCESS_TOKEN_TTL, issuer: getJwtIssuer(env), audience: getJwtAudience(env) },
  );
}

async function verifyAccessToken(env, token) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), { issuer: getJwtIssuer(env), audience: getJwtAudience(env) });
  if (payload?.typ !== ACCESS_TOKEN_TYPE
    || payload?.serviceKey !== SERVICE_KEY
    || !KNOWN_FEATURE_KEYS.includes(clean(payload?.featureKey))) {
    const error = new Error("invalid access token");
    error.code = "INVALID_ACCESS_TOKEN";
    throw error;
  }
  return payload;
}

/** 토큰이 이 모드용으로 발급된 것인지 — featureKey 와 mode 를 모두 본다. */
function tokenMatchesMode(payload, modeKey) {
  const modeDef = resolveMode(modeKey);
  return clean(payload?.featureKey) === modeDef.featureKey
    && resolveMode(payload?.mode).mode === modeDef.mode;
}

async function loadBillingUser(userId) {
  if (!objectIdLike(userId)) return null;
  return User.findById(userId)
    .select("role points profileSubscription subscription membership pass entitlement")
    .lean();
}

// ─── 챕터 생성 ───────────────────────────────────────────────────────────────

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function runner() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runner()));
  return results;
}

function chapterCache(env, modeKey = "solo") {
  // 명식·명반 기반 결정론(자유질문 없음)이라 응답 캐시 + in-flight dedup 이 안전하다.
  // 캐시 키는 프롬프트 전문까지 해시하므로(lib/llm-cache.ts) keyExtra 는 모드 구분용 명시적 가드다.
  return {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: resolveMode(modeKey).cacheKeyExtra,
  };
}

/**
 * 예산 안에서만 기다린다. 초과하면 `{ deferred: true }` 를 돌려주고 원래 프라미스는 버린다.
 *
 * 🔴 중첩이 아니다 — `callGeminiText(timeoutMs)` 가 묶는 것은 Gemini fetch 하나뿐이고,
 *    그 뒤 Workers AI 폴백 체인에는 타임아웃이 아예 없다(lib/llm-client.ts:402~443).
 *    안쪽(timeoutMs)은 항상 바깥(deadlineAt)보다 짧게 주므로 두 장치가 서로를 무력화하지 않는다.
 */
async function withDeadline(promise, deadlineAt) {
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) return { deferred: true };
  // 거부를 값으로 접어 둔다 — 타이머가 레이스를 이긴 뒤 원래 프라미스가 거부해도
  // 처리되지 않은 거부(unhandled rejection)로 남지 않는다.
  const settled = promise.then((value) => ({ value }), (error) => ({ error }));
  let timer = null;
  try {
    return await Promise.race([
      settled,
      new Promise((resolve) => { timer = setTimeout(() => resolve({ deferred: true }), remainingMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 이번 배치에서 실제로 저장할 장을 고른다.
 *
 * 챕터는 반드시 연속이어야 한다(`startIndex = chapters.length` 가 진행 위치의 정본이므로
 * 중간에 구멍이 나면 그 뒤 장이 영영 다른 번호로 밀린다). 그래서 예산 초과로 못 쓴 장이
 * 나오면 그 지점에서 자르고 앞쪽 연속분만 커밋한다. 버려진 장은 다음 /generate 가 다시
 * 쓰는데, 챕터 캐시가 결정론(30일 TTL)이라 재생성은 대개 캐시 히트다.
 */
function planBatchCommit(results = []) {
  const committed = [];
  for (const result of results) {
    if (!result || result.status === "deferred") break;
    committed.push(result);
  }
  return committed;
}

function fallbackChapterBody(chapter, birthInfo) {
  return [
    `● ${clean(chapter.title).replace(/^제\d+장 · /, "")}`,
    `이 장의 이야기를 옮겨 적는 중 잠시 손이 멈췄습니다. 잠시 후 다시 열면 ${clean(birthInfo?.name) || "당신"}님의 명식과 명반을 근거로 이 장이 채워집니다.`,
    "이미 완성된 다른 장은 그대로 남아 있으니 먼저 읽으셔도 좋습니다.",
  ].join("\n");
}

/**
 * DNA 챕터 JSON 파싱.
 * Gemini 는 responseMimeType 으로 순수 JSON 을 보장하지만 Workers AI 폴백(env.AI.run)은
 * 그 옵션을 받지 않아 코드펜스나 앞뒤 설명문이 섞여 온다. 첫 `{` ~ 마지막 `}` 만 잘라 쓴다.
 * (같은 헬퍼가 nakshatra/love-secret/neo 프롬프트 모듈에 각자 있다 — 워커 번들 1MB 제약 때문에
 *  그 모듈들을 끌어오지 않고 이 라우트에도 지역 사본을 둔다.)
 */
function parseChapterJson(text) {
  const raw = clean(text);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) { /* 폴백 경로: 앞뒤 잡음 제거 후 재시도 */ }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch (_) {
    return {};
  }
}

function normalizeLoveDna(parsed, metricDefs = LOVE_DNA_METRICS) {
  const source = asObject(parsed);
  const byKey = new Map(
    (Array.isArray(source.metrics) ? source.metrics : [])
      .map((item) => [clean(asObject(item).key), asObject(item)]),
  );
  const metrics = (Array.isArray(metricDefs) && metricDefs.length ? metricDefs : LOVE_DNA_METRICS).map(({ key, label }) => {
    const raw = byKey.get(key) || {};
    const score = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)));
    return { key, label, score, basis: clean(raw.basis, 300) };
  });
  return {
    typeName: clean(source.typeName, 40),
    typeSummary: clean(source.typeSummary, 200),
    metrics,
  };
}

/**
 * New reports may carry an editorial reading contract alongside their legacy
 * markdown body.  Keep every field optional: previously purchased reports and
 * safe fallbacks only have `body` and must remain readable forever.
 */
function normalizeChapterContent(parsed, fallbackBody = "") {
  const source = asObject(parsed);
  const text = (value, limit) => clean(value, limit);
  const list = (value, limit, max = 4) => (Array.isArray(value) ? value : [])
    .map((item) => text(item, limit))
    .filter(Boolean)
    .slice(0, max);
  const evidence = (Array.isArray(source.evidence) ? source.evidence : [])
    .map((item) => {
      const entry = asObject(item);
      const label = text(entry.label, 60);
      if (!label) return null;
      return {
        label,
        system: text(entry.system, 32),
        explanation: text(entry.explanation, 180),
      };
    })
    .filter(Boolean)
    .slice(0, 6);
  const visualization = asObject(source.visualization);
  const visualizationItems = (Array.isArray(visualization.items) ? visualization.items : [])
    .map((item) => {
      const entry = asObject(item);
      const label = text(entry.label, 48);
      const level = ["low", "balanced", "high", "watch", "opportunity"].includes(text(entry.level, 16))
        ? text(entry.level, 16) : "";
      return label && level ? { label, level, note: text(entry.note, 100) } : null;
    })
    .filter(Boolean)
    .slice(0, 6);
  const body = text(source.body, 12000) || text(fallbackBody, 12000);
  return {
    narration: text(source.narration, 520),
    evidence,
    insight: text(source.insight, 1200),
    keySentence: text(source.keySentence, 320),
    caution: text(source.caution, 900),
    actions: list(source.actions, 240, 3),
    bridge: text(source.bridge, 360),
    visualization: visualizationItems.length
      ? { kind: text(visualization.kind, 32), title: text(visualization.title, 80), items: visualizationItems }
      : null,
    body,
  };
}

async function generateChapter(env, {
  mode = "solo", saju, ziweiChart, partnerSaju, partnerZiweiChart, compatibility,
  birthInfo, partnerInfo, chapter, prologueChoice, memory, deadlineAt = Infinity,
}) {
  // 남은 예산이 한 장을 쓰기에도 모자라면 아예 시작하지 않는다(시작해도 못 끝낸다).
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs < CHAPTER_MIN_BUDGET_MS) return { status: "deferred", chapter: null, loveDna: null };
  // 안쪽 타임아웃은 항상 바깥 예산보다 짧게 — 두 장치가 경합하지 않도록.
  const timeoutMs = Math.min(CHAPTER_TIMEOUT_MS, remainingMs);

  const modeDef = resolveMode(mode);
  const prompt = modeDef.mode === "compat"
    ? buildMasterLoveCodexCompatChapterPrompt({
      selfSaju: saju, selfZiwei: ziweiChart, partnerSaju, partnerZiwei: partnerZiweiChart,
      compatibility, birthInfo, partnerInfo, chapter, memory,
    })
    : buildMasterLoveCodexChapterPrompt({ saju, ziweiChart, birthInfo, chapter, prologueChoice, memory });
  const cache = chapterCache(env, modeDef.mode);
  try {
    if (chapter.structured !== false) {
      // 🔴 시간 예산은 timeoutMs 가 아니라 timeoutMs × attempts 다. 3시도는 예산을 혼자 다 먹는다.
      const raced = await withDeadline(callGeminiJsonWithRetry(env, prompt, {
        attempts: 2,
        baseTokens: 6000,
        capTokens: 14000,
        temperature: 0.6,
        timeoutMs,
        cache,
      }), deadlineAt);
      if (raced.deferred) return { status: "deferred", chapter: null, loveDna: null };
      if (raced.error) throw raced.error;
      const ai = raced.value;
      const parsed = parseChapterJson(ai?.text);
      const content = normalizeChapterContent(parsed);
      const body = content.body;
      if (body.length < 200) throw new Error("LLM_OUTPUT_TOO_SHORT");
      return {
        status: "ok",
        chapter: { id: chapter.id, order: chapter.order, symbol: chapter.symbol, title: chapter.title, body, content, chars: body.length, provider: clean(ai?.provider || "gemini", 40), ok: true },
        loveDna: chapter.jsonMode ? normalizeLoveDna(parsed, modeDef.dnaMetrics) : null,
      };
    }

    // Workers AI 폴백을 끄지 않는다(옵션 미지정 = 켜짐).
    // 과거에는 "Workers AI 는 장문이 잘린다"고 껐지만, 그때의 폴백 모델 @cf/meta/llama-3.1-8b-instruct
    // 는 2026-05-30 폐기되고 지금 기본값은 llama-3.3-70b-instruct-fp8-fast 다(lib/llm-client.ts).
    // 더 중요한 건 비교 대상이다 — 끄면 Gemini 실패 시 독자가 받는 것은 짧은 장이 아니라
    // fallbackChapterBody() 사과 문구다. 결제한 책에는 짧은 실제 해석이 사과문보다 낫다.
    const raced = await withDeadline(callGeminiText(env, prompt, {
      maxOutputTokens: 8000,
      temperature: 0.72,
      timeoutMs,
      cache,
    }), deadlineAt);
    if (raced.deferred) return { status: "deferred", chapter: null, loveDna: null };
    if (raced.error) throw raced.error;
    const ai = raced.value;
    const body = clean(ai?.text || "");
    if (body.length < 200) throw new Error("LLM_OUTPUT_TOO_SHORT");
    return {
      status: "ok",
      chapter: { id: chapter.id, order: chapter.order, symbol: chapter.symbol, title: chapter.title, body, chars: body.length, provider: clean(ai?.provider || "gemini", 40), ok: true },
      loveDna: null,
    };
  } catch (error) {
    // 결제 후 결과는 반드시 전달한다 — 한 장이 예산 안에서 실패해도 책 전체를 실패시키지 않는다.
    // (예산 초과로 못 쓴 장은 여기 오지 않는다 — 위에서 deferred 로 빠져 저장 자체를 건너뛴다.)
    console.error("[master-love-codex] chapter", chapter.id, clean(error?.message, 200));
    const body = fallbackChapterBody(chapter, birthInfo);
    return {
      status: "fallback",
      chapter: { id: chapter.id, order: chapter.order, symbol: chapter.symbol, title: chapter.title, body, chars: body.length, provider: "fallback", ok: false },
      loveDna: null,
    };
  }
}

/** 앞 장의 요약(첫 소제목 문장)만 모아 중복 서술을 줄인다. */
function buildMemory(chapters = []) {
  return chapters
    .slice(-8)
    .map((entry) => {
      const firstLine = clean(entry?.body, 4000).split("\n").map((line) => clean(line)).find((line) => line && !line.startsWith("●"));
      return firstLine ? `${clean(entry.title)}: ${clean(firstLine, 160)}` : "";
    })
    .filter(Boolean);
}

// ─── 세션 저장 ───────────────────────────────────────────────────────────────

function createSessionId(userId) {
  const tail = clean(userId, 24).slice(-6) || "anon";
  return `mlc_${tail}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function publicSession(doc) {
  const chapters = (Array.isArray(doc?.chapters) ? doc.chapters : [])
    .slice()
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map(({ id, order, symbol, title, body, content, chars, ok }) => ({ id, order, symbol, title, body, content, chars, ok }));
  const modeDef = resolveMode(doc?.mode);
  return {
    ok: true,
    sessionId: clean(doc?.id),
    status: clean(doc?.status) || "generating",
    accessType: clean(doc?.accessType),
    mode: modeDef.mode,
    featureKey: modeDef.featureKey,
    label: modeDef.title,
    narrator: MASTER_LOVE_CODEX_META.narrator,
    birthInfo: doc?.birthInfo || null,
    partnerInfo: doc?.partnerInfo || null,
    prologueChoice: clean(doc?.prologueChoice),
    sajuResult: doc?.sajuResult || null,
    ziweiChart: doc?.ziweiChart || null,
    partnerSajuResult: doc?.partnerSajuResult || null,
    partnerZiweiChart: doc?.partnerZiweiChart || null,
    compatibility: doc?.compatibility || null,
    chapters,
    loveDna: doc?.loveDna || null,
    totalChapters: modeDef.chapters.length,
    totalCharCount: Number(doc?.totalCharCount || 0),
    createdAt: doc?.createdAt || null,
    updatedAt: doc?.updatedAt || null,
  };
}

// ─── 핸들러 ──────────────────────────────────────────────────────────────────

function handlePlan(request) {
  const mode = clean(new URL(request.url).searchParams.get("mode"));
  const plan = mode === "compat" ? getMasterLoveCodexCompatPlan() : getMasterLoveCodexPlan();
  return json({ ok: true, mode: resolveMode(mode).mode, plan });
}

async function handleEnsureAccess(request, env) {
  const body = await readJson(request);
  const idempotencyKey = clean(body?.idempotencyKey || body?.requestId, 120) || sha256(String(Date.now()));
  const normalized = normalizeInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);

  try {
    buildCharts(normalized);
  } catch (_) {
    return json({ ok: false, reason: "CALCULATION_FAILED", message: MESSAGES.calculationFailed }, { status: 422 });
  }

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  const pricing = getPricing(normalized.mode);
  const grant = async (accessType) => json({
    ok: true,
    accessType,
    mode: normalized.mode,
    accessToken: await createAccessToken(
      env,
      { userId: auth.userId, accessType, idempotencyKey, inputHash: normalized.inputHash },
      normalized.mode,
    ),
  });

  if (isAdmin(auth)) return grant("admin");

  await connectDb(env);
  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId));
  if (clean(user?.role).toLowerCase() === "admin") return grant("admin");

  // 이용권 선검사 — 커버되면 결제창 없이 무료 통과한다.
  // canUseByPass(건당 상한)만 보면 상담 포함횟수(family 10회·vvip 3회)와 월 누적 한도를 우회할
  // 수 있어 두 검사를 나란히 돌린다(worker/lib/nakshatra-paid-access.js 의 같은 패턴 참고).
  {
    const canonicalEntitlement = resolveCanonicalEntitlement(user || {});
    const premiumQuota = resolvePremiumQuota(user?.profileSubscription || {}, canonicalEntitlement, pricing.coinPrice);
    // premiumQuota.eligible 인 건은 canUseByPass(건당 상한)를 통과 못해도 커버 대상이다 — VVIP는
    // 건당 상한(10,000원)이 상담 포함횟수 기준가(300코인=30,000원)보다 낮다. cycleKey를 못 구해도
    // (만료일 없음) 열어 둬야 하므로 applies가 아니라 eligible을 쓴다(profile-limits.js 참고).
    if (canUseByPass(normalizeHoneyPassEntitlement(user || {}), pricing.coinPrice) || premiumQuota.eligible) {
      const monthlyQuota = resolveMonthlySpendQuota(user?.profileSubscription || {}, canonicalEntitlement, pricing.coinPrice);
      if (!(premiumQuota.applies && premiumQuota.exhausted) && !(monthlyQuota.applies && monthlyQuota.exceeded)) {
        return grant("pass");
      }
    }
  }

  return paymentRequired(pricing, idempotencyKey);
}

/** 이 요청의 모드가 궁합인지 — 세션 문서/정규화 결과 어느 쪽에서든 같은 기준으로 읽는다. */
function sessionMode(doc) {
  return resolveMode(asObject(doc).mode).mode;
}

async function resolveStartAccess(request, env, auth, body, normalized, idempotencyKey) {
  const token = clean(asObject(body).accessToken || request.headers.get("x-master-love-codex-token"));
  if (token) {
    try {
      const payload = await verifyAccessToken(env, token);
      if (clean(payload.userId) === clean(auth.userId)
        && clean(payload.idempotencyKey) === idempotencyKey
        && clean(payload.inputHash) === normalized.inputHash
        // 🔴 모드(=featureKey)가 다르면 거부한다. 개인판 토큰으로 궁합을 생성할 수 없다.
        && tokenMatchesMode(payload, normalized.mode)
        && ["admin", "pass"].includes(clean(payload.accessType))) {
        return { ok: true, accessType: clean(payload.accessType), paymentId: "", billingRequestId: idempotencyKey };
      }
    } catch (_) { /* fall through */ }
  }
  if (isAdmin(auth)) return { ok: true, accessType: "admin", paymentId: "", billingRequestId: idempotencyKey };

  await connectDb(env);
  const evidence = await findBillingEvidence({
    userId: auth.userId,
    idempotencyKey,
    body,
    // 궁합판 결제는 `master-love-codex-compat` 로 기록된다 — 이 요청의 모드 키로 찾아야 한다.
    featureKey: resolveMode(normalized.mode).featureKey,
  });
  if (evidence?.ok) return evidence;

  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId));
  if (clean(user?.role).toLowerCase() === "admin") return { ok: true, accessType: "admin", paymentId: "", billingRequestId: idempotencyKey };
  const startCoinCost = getPricing(normalized.mode).coinPrice;
  {
    const canonicalEntitlement = resolveCanonicalEntitlement(user || {});
    const premiumQuota = resolvePremiumQuota(user?.profileSubscription || {}, canonicalEntitlement, startCoinCost);
    // premiumQuota.eligible 인 건은 canUseByPass(건당 상한)를 통과 못해도 커버 대상이다 — VVIP는
    // 건당 상한(10,000원)이 상담 포함횟수 기준가(300코인=30,000원)보다 낮다. cycleKey를 못 구해도
    // (만료일 없음) 열어 둬야 하므로 applies가 아니라 eligible을 쓴다(profile-limits.js 참고).
    if (canUseByPass(normalizeHoneyPassEntitlement(user || {}), startCoinCost) || premiumQuota.eligible) {
      const monthlyQuota = resolveMonthlySpendQuota(user?.profileSubscription || {}, canonicalEntitlement, startCoinCost);
      if (!(premiumQuota.applies && premiumQuota.exhausted) && !(monthlyQuota.applies && monthlyQuota.exceeded)) {
        return { ok: true, accessType: "pass", paymentId: "", billingRequestId: idempotencyKey };
      }
    }
  }
  return { ok: false };
}

async function handleStart(request, env) {
  const body = await readJson(request);
  const idempotencyKey = clean(body?.idempotencyKey || body?.requestId, 120) || sha256(String(Date.now()));
  const normalized = normalizeInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  let charts;
  try {
    charts = buildCharts(normalized);
  } catch (_) {
    return json({ ok: false, reason: "CALCULATION_FAILED", message: MESSAGES.calculationFailed }, { status: 422 });
  }

  const access = await resolveStartAccess(request, env, auth, body, normalized, idempotencyKey);
  if (!access.ok) return paymentVerifyFailed();

  await connectDb(env);
  // 같은 결제 건(idempotencyKey)으로 이미 시작했다면 그 세션을 그대로 돌려준다(재결제·중복생성 방지).
  const existing = await MasterLoveCodexSession.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
  if (existing) {
    return json({
      ...publicSession(existing),
      accessToken: await createAccessToken(
        env,
        { userId: auth.userId, accessType: clean(existing.accessType), sessionId: clean(existing.id) },
        sessionMode(existing),
      ),
    });
  }

  const sessionId = createSessionId(auth.userId);
  const doc = await MasterLoveCodexSession.create({
    id: sessionId,
    userId: clean(auth.userId),
    mode: normalized.mode,
    birthInfo: normalized.birthInfo,
    partnerInfo: normalized.partnerInfo,
    prologueChoice: normalized.prologueChoice,
    sajuResult: charts.saju,
    ziweiChart: charts.ziweiChart,
    partnerSajuResult: charts.partnerSaju,
    partnerZiweiChart: charts.partnerZiweiChart,
    compatibility: charts.compatibility,
    chapters: [],
    accessType: clean(access.accessType) || "paid",
    paymentId: clean(access.paymentId, 160),
    billingRequestId: clean(access.billingRequestId, 180),
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "generating",
  });

  return json({
    ...publicSession(doc.toObject ? doc.toObject() : doc),
    accessToken: await createAccessToken(
      env,
      { userId: auth.userId, accessType: clean(access.accessType), sessionId },
      normalized.mode,
    ),
  });
}

/** 배치 락 확보 — 병렬 요청이 같은 구간을 중복 생성하지 않게 한다. */
async function acquireBatchLock(sessionId, userId) {
  const now = Date.now();
  const lockToken = `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const updated = await MasterLoveCodexSession.findOneAndUpdate(
    {
      id: sessionId,
      userId,
      status: "generating",
      $or: [
        { "generationProgress.lockedAt": { $exists: false } },
        { "generationProgress.lockedAt": null },
        { "generationProgress.lockedAt": { $lt: new Date(now - BATCH_LOCK_TTL_MS) } },
      ],
    },
    { $set: { "generationProgress.lockedAt": new Date(now), "generationProgress.lockToken": lockToken } },
    { new: true },
  ).lean();
  return updated ? { ok: true, lockToken, doc: updated } : { ok: false };
}

async function handleGenerate(request, env) {
  // 예산 시계는 핸들러 진입 시점부터 돈다 — 앞단의 인증·DB 왕복·락 획득이 자동으로 예산에서 빠진다.
  const deadlineAt = Date.now() + BATCH_BUDGET_MS;
  const body = await readJson(request);
  const sessionId = clean(asObject(body).sessionId, 120);
  if (!sessionId) return invalidInput("세션 정보가 없습니다. 처음부터 다시 시작해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  const token = clean(asObject(body).accessToken || request.headers.get("x-master-love-codex-token"));
  let tokenPayload = null;
  if (token) {
    try {
      const payload = await verifyAccessToken(env, token);
      if (clean(payload.userId) === clean(auth.userId) && clean(payload.sessionId) === sessionId) tokenPayload = payload;
    } catch (_) { tokenPayload = null; }
  }
  if (!tokenPayload && !isAdmin(auth)) return paymentVerifyFailed();

  await connectDb(env);
  const lock = await acquireBatchLock(sessionId, clean(auth.userId));
  if (!lock.ok) {
    const current = await MasterLoveCodexSession.findOne({ id: sessionId, userId: clean(auth.userId) }).lean();
    if (!current) return json({ ok: false, reason: "NOT_FOUND", message: MESSAGES.notFound }, { status: 404 });
    if (clean(current.status) === "completed") return json({ ...publicSession(current), done: true });
    return json({ ok: false, reason: "GENERATION_IN_PROGRESS", message: MESSAGES.busy, retryable: true }, { status: 409 });
  }

  const doc = lock.doc;
  const modeDef = resolveMode(doc.mode);
  // 🔴 토큰이 이 세션의 모드용으로 발급된 것인지 여기서 확인한다(토큰 검증 시점엔 세션을 아직 못 읽는다).
  if (tokenPayload && !tokenMatchesMode(tokenPayload, modeDef.mode)) {
    await MasterLoveCodexSession.updateOne(
      { id: sessionId },
      { $set: { "generationProgress.lockedAt": null, "generationProgress.lockToken": "" } },
    ).catch(() => {});
    return paymentVerifyFailed();
  }

  const existingChapters = Array.isArray(doc.chapters) ? doc.chapters.slice() : [];
  const startIndex = existingChapters.length; // 서버가 진행 위치의 정본이다(클라이언트 값 미신뢰)
  const slice = modeDef.chapters.slice(startIndex, startIndex + CHAPTER_BATCH_SIZE);

  if (!slice.length) {
    await MasterLoveCodexSession.updateOne(
      { id: sessionId },
      { $set: { status: "completed", "generationProgress.lockedAt": null, "generationProgress.lockToken": "" } },
    );
    const finished = await MasterLoveCodexSession.findOne({ id: sessionId }).lean();
    return json({ ...publicSession(finished), done: true });
  }

  try {
    const memory = buildMemory(existingChapters);
    const results = await runWithConcurrency(slice, CHAPTER_CONCURRENCY, (chapter) => generateChapter(env, {
      mode: modeDef.mode,
      saju: doc.sajuResult,
      ziweiChart: doc.ziweiChart,
      partnerSaju: doc.partnerSajuResult,
      partnerZiweiChart: doc.partnerZiweiChart,
      compatibility: doc.compatibility,
      birthInfo: doc.birthInfo,
      partnerInfo: doc.partnerInfo,
      chapter,
      prologueChoice: clean(doc.prologueChoice),
      memory,
      deadlineAt,
    }));

    // 예산 초과로 못 쓴 장이 나오면 그 앞까지만 커밋한다(챕터는 연속이어야 한다).
    const committed = planBatchCommit(results);
    if (!committed.length) {
      await MasterLoveCodexSession.updateOne(
        { id: sessionId },
        { $set: { "generationProgress.lockedAt": null, "generationProgress.lockToken": "" } },
      ).catch(() => {});
      console.warn("[master-love-codex] batch budget exceeded", sessionId, `startIndex=${startIndex}`);
      return json({
        ok: false,
        reason: "GENERATION_BUDGET_EXCEEDED",
        retryable: true,
        message: "생성이 지연되고 있습니다. 지금까지 쓰인 장은 그대로 보관되니 잠시 후 이어서 쓰면 됩니다.",
      }, { status: 503 });
    }

    const newChapters = committed.map((result) => result.chapter);
    const loveDna = committed.map((result) => result.loveDna).find(Boolean) || null;
    const merged = [...existingChapters, ...newChapters];
    const totalCharCount = merged.reduce((sum, chapter) => sum + Number(chapter.chars || 0), 0);
    const done = merged.length >= modeDef.chapters.length;

    await MasterLoveCodexSession.updateOne({ id: sessionId }, {
      $set: {
        chapters: merged,
        totalCharCount,
        status: done ? "completed" : "generating",
        ...(loveDna ? { loveDna } : {}),
        generationProgress: { completed: merged.length, total: modeDef.chapters.length, lockedAt: null, lockToken: "" },
      },
    });

    const updated = await MasterLoveCodexSession.findOne({ id: sessionId }).lean();
    return json({ ...publicSession(updated), done, batchStartIndex: startIndex, batchSize: newChapters.length });
  } catch (error) {
    console.error("[master-love-codex] generate", clean(error?.message, 300));
    await MasterLoveCodexSession.updateOne(
      { id: sessionId },
      { $set: { "generationProgress.lockedAt": null, "generationProgress.lockToken": "" } },
    ).catch(() => {});
    return serverError("이야기를 이어 쓰는 중 문제가 생겼습니다. 결제와 지금까지 쓰인 장은 보존되니 잠시 후 다시 시도해 주세요.", 503);
  }
}

async function handleSession(request, env) {
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("sessionId"), 120);
  if (!sessionId) return invalidInput("세션 정보가 없습니다.");

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  const doc = await withMongoRetry(env, () => MasterLoveCodexSession.findOne({ id: sessionId, userId: clean(auth.userId) }).lean());
  if (!doc) return json({ ok: false, reason: "NOT_FOUND", message: MESSAGES.notFound }, { status: 404 });
  return json(publicSession(doc));
}

export async function handleMasterLoveCodexRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/master-love-codex");
  try {
    if (method === "GET" && (path === "/plan" || path === "")) return await handlePlan(request);
    if (method === "GET" && path === "/session") return await handleSession(request, env);
    if (method === "POST" && (path === "/ensure-access" || path === "/prepare")) return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/generate") return await handleGenerate(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[master-love-codex]", clean(error?.code || error?.message || error, 300));
    // 네 핸들러 모두 surfaceDbInfraError:true 로 인증 DB 장애를 throw 시킨다. 그걸 여기서
    // 하드 500 으로 굳히면 일시적 블립이 "생성 실패"로 확정되어 클라가 재시도하지 못한다.
    // (ziwei-ai.js 등 14개 라우트가 쓰는 것과 같은 판정을 재사용한다.)
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) {
      return json({
        ok: false,
        retryable: true,
        reason: "DB_DEGRADED",
        message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
      }, { status: 503 });
    }
    return serverError();
  }
}

export const __masterLoveCodexTestUtils = {
  FEATURE_KEY, COMPAT_FEATURE_KEY, SERVICE_KEY, MODES,
  normalizeInput, getPricing, buildBillingGatePayload, normalizeLoveDna,
  resolveMode, tokenMatchesMode, buildCharts,
  // 배치 시간 예산 — 검증 스크립트가 LLM 호출 없이 순수 함수로 확인한다.
  withDeadline, planBatchCommit,
  BATCH_BUDGET_MS, BATCH_LOCK_TTL_MS, CHAPTER_MIN_BUDGET_MS, EDGE_RESPONSE_DEADLINE_MS,
};
