// 사주 고급 궁합(10,000원, featureKey saju-compat-premium) 유료 전달 라우트.
//
// 수명 주기는 신년운세(new-year-ai.js)의 공용 다시 시도 우선 경로를 따른다:
//   접근 판정 → 레코드 생성(partial) → 한 요청에 한 그룹(장) 생성·체크포인트 → 네 그룹 완성 때만
//   결과 조립(delivery_pending) → 이용 확정(차감 1회) → completed.
// 요청 중 종결 실패는 환불하지 않고 생성 + 7일 안에서 무료 다시 시도를 연다(retryableFailureMeta).
// 🔴 다시 시도(고객 버튼·복구 크론 모두)는 저장된 완성 그룹을 다시 생성하지 않는다 — 빠진 그룹만 이어 쓴다.
// 🔴 완성 전에는 본문을 내보내지 않는다(진행 수만). 레거시 saju-compat-basic 경로와 코드를 공유하지 않는다.
import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import { MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory, SajuCompatPremiumConsultation, User } from "../lib/models.js";
import { findMoonstoneSpendEvidence } from "../lib/moonstone-spend-proof.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { normalizeConsultAccessType, resolveCanonicalEntitlement, resolveFeatureAccessPolicy } from "../lib/entitlement-policy.js";
import { consumePassForFeature, passDenialCode } from "../lib/pass-consumption.js";
import { lateAccessDenialSettlement, lateUsageSettlementFailure, usageSettlementSetFields } from "../lib/late-usage-settlement.js";
import { consultationRefundResponse } from "../lib/consultation-refund-state.js";
import { markRetryableRefundDue, publicRetryState, reopenRetryableConsultation, retryableFailureMeta } from "../lib/paid-delivery-stuck.js";
import { isStagingLlmMockEnabled } from "../lib/staging-llm-mock.js";
import { resultStorageFailurePayload, resultStorageUnavailable } from "../lib/result-storage.js";
import { isStoredPaidResultRevoked } from "../lib/paid-result-revocation.js";
import { claimRequestBillingEvidence, evidenceClaimErrorBody, releaseRequestBillingEvidence } from "../lib/billing-evidence-claim.js";
import { EDGE_RESPONSE_DEADLINE_MS, clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { sajuAuthorityOn } from "../lib/saju-authority-consumer.js";
import { calculateSajuCompatPremiumFacts, normalizeSajuCompatPremiumInput } from "../lib/saju-compat-premium-facts.js";
import {
  SAJU_COMPAT_PREMIUM_GROUPS,
  SAJU_COMPAT_PREMIUM_GROUP_MIN_CHARS,
  SAJU_COMPAT_PREMIUM_MAX_OUTPUT_TOKENS,
  SAJU_COMPAT_PREMIUM_SYSTEM_PROMPT,
  assembleSajuCompatPremiumResult,
  buildSajuCompatPremiumGroupPrompt,
  buildSajuCompatPremiumResponseSchema,
  isSajuCompatPremiumComplete,
  isSajuCompatPremiumGroupUsable,
  parseSajuCompatPremiumGroupResponse,
} from "../lib/saju-compat-premium-prompt.js";

const SERVICE_KEY = "saju-compat-premium";
const FEATURE_KEY = "saju-compat-premium";
const ORDER_NAME = "사주 고급 궁합";
const ROUTE_BASE = "/api/saju-compat-premium";
// 그룹(장)마다 생성 2회. 다시 시도는 빠진 그룹의 횟수만 새로 연다.
const GROUP_MAX_ATTEMPTS = 2;
const GENERATING_FRESH_MS = 120000;
// 한 요청 = 한 그룹(sync-llm-timeout.js PAID_LLM_PARTS_PER_REQUEST). 엣지 100초 안에서 앞뒤 작업 몫을 남긴다.
const LLM_BUDGET_MS = EDGE_RESPONSE_DEADLINE_MS - 12000;

const LLM_ERROR_MESSAGE = "사주 고급 궁합을 아직 완성하지 못했습니다. 결제는 보존되었으니 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const LOGIN_REQUIRED_MESSAGE = "사주 고급 궁합을 보려면 로그인이 필요합니다.";
const SERVER_ERROR_MESSAGE = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const CALCULATION_FAILED_MESSAGE = "입력한 생년월일로 명식을 계산하지 못했습니다. 날짜와 양력·음력을 확인해 주세요.";

async function defaultCallDeferredUsage(args) {
  const { handleBillingRoutes } = await import("./billing.js");
  return callDeferredUsageRoute(handleBillingRoutes, args);
}

async function defaultSettleRefund(env, args) {
  const { settleFailedConsultationRefund } = await import("../lib/consultation-delivery-refund.js");
  return settleFailedConsultationRefund(env, args);
}

// 테스트가 DB·LLM·결제 경계만 바꿔 끼운다. 운영 기본값은 실제 모듈이다.
const DEFAULT_DEPS = Object.freeze({
  Model: SajuCompatPremiumConsultation,
  User,
  Payment,
  PointHistory,
  PaidExecutionRecord,
  MonthlyCreditLedger,
  connectDb,
  withMongoRetry,
  getUser: getOptionalUserFromRequest,
  callLlm: callGeminiJsonWithRetry,
  findMoonstoneSpendEvidence,
  resolveFeatureAccessPolicy,
  consumePassForFeature,
  claimEvidence: claimRequestBillingEvidence,
  releaseEvidence: releaseRequestBillingEvidence,
  settleRefund: defaultSettleRefund,
  callDeferredUsage: defaultCallDeferredUsage,
  isRevoked: isStoredPaidResultRevoked,
  authorityOn: sajuAuthorityOn,
  now: () => Date.now(),
});
let deps = { ...DEFAULT_DEPS };

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniq(values = []) {
  return [...new Set(values.map((value) => clean(value, 180)).filter(Boolean))];
}

function randomToken(length = 10) {
  const bytes = new Uint8Array(Math.max(8, Math.ceil(length * 0.75)));
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, length);
}

function readIdempotencyKey(request, body = {}) {
  return clean(body?.idempotencyKey || request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key"), 180);
}

function inputHashOf(input) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function invalidInput(message, status = 422, extra = {}) {
  return json({ ok: false, reason: "INVALID_INPUT", message, ...extra }, { status });
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: LOGIN_REQUIRED_MESSAGE }, { status: 401 });
}

function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: PAYMENT_VERIFY_FAILED_MESSAGE }, { status: 402 });
}

function isAdmin(auth = {}) {
  return clean(auth.role).toLowerCase() === "admin";
}

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || coinPrice * 100);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    throw Object.assign(new Error("saju-compat-premium price not found"), { code: "PRICE_NOT_FOUND" });
  }
  return { pricing, coinPrice, amountKRW, membershipCreditCost: calculateMembershipCreditCost(coinPrice) };
}

async function loadBillingUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return null;
  return deps.User.findById(userId)
    .select("email name phoneNumber points role profileSubscription subscription membership pass entitlement paidFeatures unlockedFeatures")
    .lean();
}

// ── 결제 증빙(신년운세와 같은 순서: 차감 원장 → 월정석 → 이연 실행 기록 → 결제 행) ──────────────

function objectIdLike(value) {
  const text = clean(value, 180);
  return Boolean(text && mongoose.Types.ObjectId.isValid(text));
}

function readBillingContext(body = {}) {
  const billing = asObject(body.billingGate || body.billingEvidence || body.billing || body.paymentEvidence);
  const consume = asObject(body.billingConsume || body.consume || billing.consume);
  const accessGrant = asObject(body.billingAccessGrant || body.accessGrant || billing.accessGrant);
  const pricing = asObject(body.pricing || billing.pricing);
  return { billing, consume, accessGrant, pricing };
}

function collectBillingTokens(body = {}, idempotencyKey = "") {
  const ctx = readBillingContext(body);
  return uniq([
    idempotencyKey, body.billingRequestId, body.executionId, body.paymentId, body.transactionId, body.purchaseId, body.requestId,
    ctx.billing.executionId, ctx.billing.transactionId, ctx.billing.purchaseId, ctx.billing.paymentId, ctx.billing.requestId,
    ctx.consume.executionId, ctx.consume.transactionId, ctx.consume.purchaseId, ctx.consume.requestId, ctx.consume.receiptId,
    ctx.consume.pointHistoryId, ctx.consume.ledgerId, ctx.consume.monthlyCreditLedgerId,
    ctx.accessGrant.executionId, ctx.accessGrant.evidenceId, ctx.accessGrant.purchaseId, ctx.accessGrant.paymentId, ctx.accessGrant.requestId,
  ]);
}

function readBillingAccessSignal(body = {}) {
  const ctx = readBillingContext(body);
  return [
    body.accessType, body.accessMethod, body.paymentMode,
    ctx.billing.accessType, ctx.billing.accessMethod, ctx.billing.paymentMode, ctx.billing.paymentMethod,
    ctx.consume.accessType, ctx.consume.accessMethod, ctx.consume.paymentMethod, ctx.consume.paymentMode, ctx.consume.transactionType,
    ctx.accessGrant.accessType, ctx.accessGrant.accessMethod, ctx.accessGrant.paymentMethod,
  ].map((value) => clean(value).toLowerCase()).filter(Boolean).join("|");
}

function pointHistoryTokenClauses(tokens = []) {
  return tokens.flatMap((token) => [
    { "metadata.requestId": token }, { "metadata.purchaseId": token }, { "metadata.idempotencyKey": token },
    { "metadata.orderId": token }, { "metadata.transactionId": token }, { "metadata.pointHistoryId": token },
    ...(objectIdLike(token) ? [{ _id: token }] : []),
  ]);
}

function deferredTokenClauses(tokens = []) {
  return tokens.flatMap((token) => [
    { requestId: token }, { idempotencyKey: token }, { executionId: token }, { paymentId: token }, { orderId: token },
    { "result.deferredUsage.requestId": token }, { "result.deferredUsage.paymentId": token },
    ...(objectIdLike(token) ? [{ _id: token }] : []),
  ]);
}

function paymentTokenClauses(tokens = []) {
  return tokens.flatMap((token) => [
    { requestId: token }, { idempotencyKey: token }, { merchantUid: token }, { impUid: token },
    { "metadata.requestId": token }, { "metadata.purchaseId": token }, { "metadata.idempotencyKey": token },
  ]);
}

function normalizeBillingAccessType(value) {
  const accessType = clean(value).toLowerCase();
  if (["membership_credit", "monthly_credit", "moonlight_stone", "monthly", "subscription"].includes(accessType)) return "subscription";
  if (["membership_pass", "license_pass", "subscription_pass", "pass", "family", "family_pass"].includes(accessType)) return "pass";
  return "paid";
}

async function resolveBillingGateAccess({ env, auth, body, idempotencyKey }) {
  const signal = readBillingAccessSignal(body);
  const tokens = collectBillingTokens(body, idempotencyKey);
  const ctx = readBillingContext(body);
  const featureKey = clean(ctx.pricing.featureKey || ctx.billing.featureKey || ctx.consume.featureKey || ctx.accessGrant.featureKey);
  const hasEvidencePayload = tokens.length > 0 || /pass|monthly|credit|coin/.test(signal);
  if (!hasEvidencePayload) return null;
  if (featureKey && featureKey !== FEATURE_KEY) return null;
  if (/usage[-_]pass/.test(signal)) return null;

  const pointClauses = pointHistoryTokenClauses(tokens);
  if (pointClauses.length) {
    const pointHistory = await deps.PointHistory.findOne({
      userId: auth.userId, kind: "deduct", featureKey: FEATURE_KEY,
      "metadata.coinRefundedForUnlockFailure": { $ne: true },
      "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: pointClauses,
    }).sort({ createdAt: -1 }).lean();
    if (pointHistory) {
      return {
        ok: true,
        accessType: normalizeBillingAccessType(pointHistory?.metadata?.accessType || signal),
        paymentId: clean(pointHistory._id, 160),
        evidenceRequestId: clean(pointHistory?.metadata?.requestId, 180),
        prepaid: true,
      };
    }
  }

  // 월정석 차감은 정본(moonstone-spend-proof.js)이 기능키·정산을 확인한다.
  const monthlyEvidence = await deps.findMoonstoneSpendEvidence(env, { userId: auth.userId, featureKeys: [FEATURE_KEY], tokens });
  if (monthlyEvidence) {
    return { ok: true, accessType: "subscription", paymentId: clean(monthlyEvidence.ledgerId, 160), evidenceRequestId: clean(monthlyEvidence.sourceId, 180), prepaid: true };
  }

  const deferredClauses = deferredTokenClauses(tokens);
  if (deferredClauses.length) {
    const record = await deps.PaidExecutionRecord.findOne({
      userId: clean(auth.userId), featureId: FEATURE_KEY,
      status: { $in: ["paid_pending_generation", "generating", "completed"] },
      $or: deferredClauses,
    }).sort({ updatedAt: -1, createdAt: -1 }).lean();
    if (record) {
      const deferredUsage = asObject(asObject(record.result).deferredUsage);
      return {
        ok: true,
        accessType: normalizeBillingAccessType(deferredUsage.accessType || record.accessMethod || signal),
        paymentId: clean(record._id, 160),
        billingRequestId: clean(record.requestId || idempotencyKey, 180),
        deferredUsage: record.status !== "completed",
        usageAlreadyApplied: record.status === "completed",
        prepaid: true,
      };
    }
  }

  const paymentClauses = paymentTokenClauses(tokens);
  if (paymentClauses.length) {
    const payment = await deps.Payment.findOne({
      userId: auth.userId, featureKey: FEATURE_KEY, status: { $in: ["paid", "success", "fulfilled"] }, $or: paymentClauses,
    }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
    if (payment) {
      return {
        ok: true,
        accessType: "paid",
        paymentId: clean(payment.merchantUid || payment.impUid || payment._id || tokens[0], 160),
        billingRequestId: clean(payment.requestId || payment.idempotencyKey || idempotencyKey, 180),
        usageAlreadyApplied: true,
        prepaid: true,
      };
    }
  }
  return null;
}

function buildBillingGatePayload({ pricing, idempotencyKey }) {
  return {
    billingMode: "coin-gate",
    featureKey: FEATURE_KEY,
    serviceKey: SERVICE_KEY,
    serviceId: SERVICE_KEY,
    serviceType: FEATURE_KEY,
    consultationType: "sajuCompatPremium",
    categoryKey: "premium-consultation",
    subFeatureKey: FEATURE_KEY,
    contentId: FEATURE_KEY,
    orderName: ORDER_NAME,
    reason: ORDER_NAME,
    cost: pricing.coinPrice,
    coinPrice: pricing.coinPrice,
    totalAmount: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    amountKRW: pricing.amountKRW,
    currency: "CURRENCY_KRW",
    membershipCreditCost: pricing.membershipCreditCost,
    requestId: idempotencyKey,
    idempotencyKey,
    runtimeGate: {
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      featureKey: FEATURE_KEY,
      reason: ORDER_NAME,
      productId: SERVICE_KEY,
      productType: SERVICE_KEY,
      serviceType: FEATURE_KEY,
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      membershipCreditCost: pricing.membershipCreditCost,
    },
  };
}

async function resolveServerAccess({ env, auth, user, pricing, idempotencyKey = "", inputHash = "", body = {} }) {
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "", usageAlreadyApplied: true };
  }
  if (idempotencyKey && inputHash) {
    const existing = await deps.Model.findOne({ userId: clean(auth.userId), idempotencyKey, inputHash, status: "completed" })
      .select("id accessType paymentId").lean();
    if (existing) {
      return { ok: true, accessType: clean(existing.accessType) || "paid", paymentId: clean(existing.paymentId, 160), billingRequestId: idempotencyKey, usageAlreadyApplied: true };
    }
  }
  const billing = await resolveBillingGateAccess({ env, auth, body, idempotencyKey });
  if (billing?.ok) return { ...billing, usageAlreadyApplied: billing.usageAlreadyApplied === true };
  const featureAccess = deps.resolveFeatureAccessPolicy({ user: user || {}, pricing, coinCost: pricing.coinPrice });
  if (featureAccess?.allowed) {
    return { ok: true, accessType: normalizeConsultAccessType(featureAccess.accessType), paymentId: "", usageAlreadyApplied: false };
  }
  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

// 결제 증빙 1건 = 상담 1건. 원 결제 요청 키도 함께 묶는다. 이용권·관리자는 ID 가 없어 건너뛴다.
function startEvidenceIds(access = {}) {
  const paymentId = clean(access.paymentId, 160);
  return paymentId ? [paymentId, clean(access.evidenceRequestId || access.billingRequestId, 180)] : [];
}

async function resolveStartAccess({ env, auth, body, normalized, pricing, idempotencyKey }) {
  const tokens = collectBillingTokens(body, idempotencyKey);
  const revokedStatuses = ["cancelled", "canceled", "refunded", "CANCELLED", "REFUNDED"];
  const revoked = await Promise.all([
    deps.PaidExecutionRecord.findOne({ userId: clean(auth.userId), featureId: FEATURE_KEY, status: { $in: revokedStatuses }, $or: deferredTokenClauses(tokens) }).lean(),
    deps.Payment.findOne({ userId: auth.userId, status: { $in: revokedStatuses }, $or: paymentTokenClauses(tokens) }).lean(),
    deps.PointHistory.findOne({ userId: auth.userId, featureKey: FEATURE_KEY, $and: [{ $or: pointHistoryTokenClauses(tokens) }, { $or: [
      { "metadata.refundedForServiceExecution": true }, { "metadata.coinRefundedForUnlockFailure": true }, { "metadata.monthlyCreditRefundedForUnlockFailure": true },
    ] }] }).lean(),
  ]);
  if (revoked.some(Boolean)) return { ok: false, reason: "PAYMENT_VERIFY_FAILED" };
  const user = await deps.withMongoRetry(env, () => loadBillingUser(auth.userId));
  if (!user && !isAdmin(auth)) return { ok: false, reason: "LOGIN_REQUIRED" };
  return deps.withMongoRetry(env, () => resolveServerAccess({ env, auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, body }));
}

function cloneBillingHeaders(request) {
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  headers.delete("content-length");
  return headers;
}

async function callDeferredUsageRoute(handleBillingRoutes, { request, env, auth, path, idempotencyKey, sessionId, code = "", message = "" }) {
  const url = new URL(request.url);
  url.pathname = `/api/billing/coin-gate/deferred/${path}`;
  url.search = "";
  const response = await handleBillingRoutes(new Request(url.toString(), {
    method: "POST",
    headers: cloneBillingHeaders(request),
    body: JSON.stringify({ featureKey: FEATURE_KEY, serviceType: FEATURE_KEY, consultationType: "sajuCompatPremium", reason: ORDER_NAME,
      requestId: idempotencyKey, idempotencyKey, sessionId, resultId: sessionId, code, message }),
  }), env, { preverifiedAuth: auth });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw Object.assign(new Error(clean(payload?.message || `Deferred usage ${path} failed.`, 500)), {
      code: clean(payload?.error?.code || `DEFERRED_USAGE_${path.toUpperCase()}_FAILED`, 80),
    });
  }
  return payload?.data || payload;
}

async function applyUsageOnce({ userId, sessionId, accessType }) {
  const existing = await deps.Model.findOne({ id: sessionId, userId: clean(userId) }).select("usageAppliedAt idempotencyKey").lean();
  if (!existing?.idempotencyKey) throw resultStorageUnavailable(sessionId);
  if (existing.usageAppliedAt) return true;
  if (normalizeConsultAccessType(accessType) === "pass") {
    const user = await deps.User.findById(userId).select("profileSubscription recentConsumeRequestIds").lean();
    const consumed = await deps.consumePassForFeature({ user: user || {}, entitlement: resolveCanonicalEntitlement(user || {}),
      userId, featureKey: FEATURE_KEY, requestId: existing.idempotencyKey, coinCost: getPricing().coinPrice });
    if (!consumed?.covered) throw Object.assign(new Error("이용권 사용 한도를 확인해 주세요."), { code: passDenialCode(consumed?.reason) || "PAYMENT_REQUIRED" });
  }
  await deps.Model.updateOne({ id: sessionId, userId: clean(userId), usageAppliedAt: null }, { $set: { usageAppliedAt: new Date(deps.now()) } });
  return true;
}

// ── 그룹 상태 ─────────────────────────────────────────────────────────────────

function savedGroupMap(doc) {
  return asObject(doc?.llmMeta?.groups);
}

function savedGroupRows(doc) {
  const map = savedGroupMap(doc);
  return SAJU_COMPAT_PREMIUM_GROUPS.map((group) => map[group.key]).filter(Boolean);
}

function usableGroupKeys(doc) {
  const map = savedGroupMap(doc);
  return SAJU_COMPAT_PREMIUM_GROUPS.filter((group) => isSajuCompatPremiumGroupUsable(map[group.key], group)).map((group) => group.key);
}

/** 복구 크론이 delivery_pending 정체를 completed 로 구제해도 되는지(완성본이 저장돼 있는지). */
export function isStuckDeliveryComplete(doc) {
  return Boolean(doc?.result) && isSajuCompatPremiumComplete(savedGroupRows(doc));
}

function publicSession(doc) {
  const completed = doc?.status === "completed";
  return {
    ok: true,
    sessionId: clean(doc?.id),
    resumeSessionId: clean(doc?.id),
    status: clean(doc?.status),
    saved: completed,
    accessType: clean(doc?.accessType),
    relationType: clean(doc?.relationType),
    progress: { completed: usableGroupKeys(doc).length, total: SAJU_COMPAT_PREMIUM_GROUPS.length },
    // 완성 전에는 본문을 싣지 않는다(완성본만 전달).
    ...(completed && doc.result ? { result: doc.result } : {}),
    createdAt: doc?.createdAt,
  };
}

// 응답용 다시 시도 상태. 최상위 retryable 은 "자동으로 계속 조회"라는 뜻이라 쓰지 않는다.
function retryPayload(doc) {
  const state = publicRetryState(doc, deps.now());
  const sessionId = clean(doc?.id);
  return state ? { sessionId, refunded: false, retry: { available: true, refundAt: state.refundAt, sessionId } } : {};
}

// 다시 시도는 빠진 그룹만 다시 쓴다: 완성 그룹은 행·시도 수를 그대로 두고, 나머지 그룹만 행을 지우고 시도 수를 새로 연다.
export function sajuCompatPremiumRetryReset(fresh) {
  const map = savedGroupMap(fresh);
  const groups = {};
  const keep = new Set();
  for (const group of SAJU_COMPAT_PREMIUM_GROUPS) {
    if (isSajuCompatPremiumGroupUsable(map[group.key], group)) {
      groups[group.key] = map[group.key];
      keep.add(group.key);
    }
  }
  const attempts = {};
  for (const [key, value] of Object.entries(asObject(fresh?.llmMeta?.attempts))) if (keep.has(key)) attempts[key] = value;
  return { "llmMeta.groups": groups, "llmMeta.attempts": attempts };
}

async function saveState({ id, userId, lockToken, status = "generating", values }) {
  try {
    const saved = await deps.Model.findOneAndUpdate({ id, userId: clean(userId), status, "llmMeta.lockToken": lockToken }, { $set: values }, { new: true }).lean();
    const confirmed = saved && await deps.Model.findOne({ id, userId: clean(userId) }).lean();
    if (!confirmed || Object.entries(values).some(([key, value]) => JSON.stringify(key.split(".").reduce((at, part) => at?.[part], confirmed)) !== JSON.stringify(value))) {
      throw resultStorageUnavailable(id);
    }
    return confirmed;
  } catch { throw resultStorageUnavailable(id); }
}

function repairLinesFor(row) {
  if (!row || row.ok) return [];
  const issues = Array.isArray(row.issues) && row.issues.length ? row.issues : [row.reason || "PARSE_FAILED"];
  return issues.slice(0, 4).map((issue) => {
    if (/LENGTH_SHORT|SECTION_SHORT/.test(issue)) return "분량이 모자랐다. 섹션마다 근거를 더 풀어 목표 분량을 채운다.";
    if (/PARSE|JSON/.test(issue)) return "응답이 JSON 하나가 아니었다. 설명 없이 형식의 JSON 하나만 낸다.";
    if (/REQUIRED_SECTIONS/.test(issue)) return "빠진 섹션이 있었다. 지시한 섹션 제목을 모두 그대로 쓴다.";
    return `지난 응답 문제(${clean(issue, 60)})를 고친다.`;
  });
}

export async function generateSajuCompatPremiumGroup(env, facts, group, { deadlineAt, finalAttempt, previous }) {
  const remaining = deadlineAt - deps.now();
  if (!(remaining > 5000)) return { key: group.key, ok: false, reason: "BUDGET_EXHAUSTED", issues: ["BUDGET_EXHAUSTED"] };
  const timeoutMs = clampSyncLlmTimeoutMs(remaining - 4000);
  const call = deps.callLlm(env, buildSajuCompatPremiumGroupPrompt(facts, group, { repairLines: repairLinesFor(previous) }), {
    systemPrompt: SAJU_COMPAT_PREMIUM_SYSTEM_PROMPT,
    responseSchema: buildSajuCompatPremiumResponseSchema(group),
    temperature: 0.72,
    attempts: 1,
    baseTokens: SAJU_COMPAT_PREMIUM_MAX_OUTPUT_TOKENS,
    capTokens: SAJU_COMPAT_PREMIUM_MAX_OUTPUT_TOKENS,
    timeoutMs,
    taskType: "fortune",
    fallbackMinChars: Math.round(SAJU_COMPAT_PREMIUM_GROUP_MIN_CHARS * 0.3),
    maxProviderAttempts: 1,
    finalProviderAttempt: finalAttempt,
  });
  let timer;
  const ai = await Promise.race([
    call,
    new Promise((resolve) => { timer = setTimeout(() => resolve({ ok: false, error: "group_hard_deadline" }), timeoutMs + 4000); }),
  ]).finally(() => clearTimeout(timer));
  const provider = clean(ai?.provider, 40);
  const model = clean(ai?.model, 80);
  const isMock = (/mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true) && !isStagingLlmMockEnabled(env);
  // 끊긴 응답은 다음 시도가 있으면 받지 않는다. 마지막 시도는 끝난 문장까지 파서가 판정한다.
  const cutOff = Boolean(ai?.ok) && (ai.truncated === true || /^(MAX_TOKENS|length)$/i.test(clean(ai.finishReason)));
  if (!ai?.ok || isMock || !clean(ai.text) || (cutOff && !finalAttempt)) {
    const reason = clean(isMock ? "MOCK_RESULT" : cutOff ? "TRUNCATED" : ai?.error || ai?.message || "LLM_FAILED", 60);
    return { key: group.key, ok: false, reason, issues: [reason], provider, model, at: new Date(deps.now()).toISOString() };
  }
  const parsed = parseSajuCompatPremiumGroupResponse(ai.text, group, { finalAttempt: Boolean(finalAttempt) });
  return { ...parsed, key: group.key, provider, model, at: new Date(deps.now()).toISOString() };
}

function retryMetaFor(doc, code) {
  if (clean(code) === "DEFERRED_USAGE_APPLY_FAILED") return null;
  return retryableFailureMeta(doc || {}, deps.now(), clean(code || "LLM_GENERATION_FAILED", 40));
}

async function settleFailureRefund(env, id, userId) {
  try {
    return await deps.settleRefund(env, { service: SERVICE_KEY, id, userId });
  } catch {
    console.warn("[saju-compat-premium] refund settlement pending");
    return { ok: false, refundStatus: "pending", retryable: true };
  }
}

async function finishDelivery({ request, env, auth, access, pending, settlement = null }) {
  let usageSettlement = settlement;
  try {
    if (usageSettlement) { /* 재확인이 이용권 한도로 거절된 미정산 전달 — 차감을 다시 시도하지 않는다. */ }
    else if (access.deferredUsage) await deps.callDeferredUsage({ request, env, auth, path: "apply", idempotencyKey: pending.idempotencyKey, sessionId: pending.id });
    else if (!access.usageAlreadyApplied && access.accessType === "subscription") throw new Error("MONTHLY_CREDIT_GATE_REQUIRED");
    else await applyUsageOnce({ userId: auth.userId, sessionId: pending.id, accessType: access.accessType }).catch((error) => {
      usageSettlement = lateUsageSettlementFailure(error, { service: SERVICE_KEY, sessionId: pending.id, accessType: access.accessType });
      if (!usageSettlement) throw error;
    });
  } catch (cause) {
    throw Object.assign(new Error("이용 처리 확인 중입니다. 같은 상담에서 다시 시도해 주세요."), { code: "RESULT_DELIVERY_PENDING", resultId: pending.id, cause });
  }
  return saveState({ id: pending.id, userId: auth.userId, lockToken: pending.llmMeta?.lockToken || "", status: "delivery_pending", values: {
    status: "completed", usageAppliedAt: new Date(deps.now()), ...usageSettlementSetFields(usageSettlement),
  } });
}

function lateSettlementModels() {
  // 월정석 되돌림 표식도 확인한다(life-book·love-secret 과 같은 묶음).
  return { User: deps.User, Payment: deps.Payment, PaidExecutionRecord: deps.PaidExecutionRecord, PointHistory: deps.PointHistory, MonthlyCreditLedger: deps.MonthlyCreditLedger };
}

// ── 핸들러 ────────────────────────────────────────────────────────────────────

function calculationFailed(error) {
  return json({ ok: false, reason: "CALCULATION_FAILED", side: clean(error?.side, 10), message: CALCULATION_FAILED_MESSAGE }, { status: 422 });
}

async function handlePrepare(request, env) {
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  const normalized = normalizeSajuCompatPremiumInput(body);
  if (!normalized.ok) return invalidInput(normalized.message, 400);
  let validation;
  try {
    validation = calculateSajuCompatPremiumFacts(normalized.input, { mode: "validate", nowMs: deps.now() });
  } catch (error) {
    return calculationFailed(error);
  }
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.", 400, { validation });
  const auth = await deps.getUser(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();
  const pricing = getPricing();
  await deps.connectDb(env);
  const user = await deps.withMongoRetry(env, () => loadBillingUser(auth.userId));
  if (!user && !isAdmin(auth)) return loginRequired();
  const access = await deps.withMongoRetry(env, () => resolveServerAccess({ env, auth, user, pricing, idempotencyKey, inputHash: inputHashOf(normalized.input), body }));
  if (access.ok) return json({ ok: true, validation, accessType: access.accessType });
  return json({ ok: false, reason: "PAYMENT_REQUIRED", validation, paymentPayload: buildBillingGatePayload({ pricing, idempotencyKey }) }, { status: 402 });
}

async function handleStart(request, env, recoveryAuth = null) {
  const startedAt = deps.now();
  let body = await readJson(request);
  const auth = recoveryAuth || await deps.getUser(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();
  await deps.connectDb(env);
  if (body.resumeSessionId) {
    const stored = await deps.Model.findOne({ id: clean(body.resumeSessionId, 180), userId: clean(auth.userId) }).lean();
    if (!stored) return notFound();
    const refund = consultationRefundResponse(stored);
    if (refund) return json(refund.body, { status: refund.status });
    if (stored.status === "completed") return json(publicSession(stored));
    if (!stored.llmMeta?.resumeBody) return invalidInput("원래 상담 정보를 확인하지 못했습니다.", 409);
    body = { ...stored.llmMeta.resumeBody, idempotencyKey: stored.idempotencyKey, requestId: stored.idempotencyKey };
  }
  const idempotencyKey = readIdempotencyKey(request, body);
  const normalizedInput = normalizeSajuCompatPremiumInput(body);
  if (!normalizedInput.ok || idempotencyKey.length < 12) return invalidInput(normalizedInput.message || "요청 키를 확인하지 못했습니다.");
  const normalized = { ...normalizedInput, inputHash: inputHashOf(normalizedInput.input) };
  const existing = await deps.Model.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
  const refund = consultationRefundResponse(existing);
  if (refund) return json(refund.body, { status: refund.status });
  if (existing && clean(existing.inputHash) !== normalized.inputHash) return invalidInput("같은 요청 키로 다른 궁합 정보를 사용할 수 없습니다.", 409);
  if (existing?.status === "completed") return json(publicSession(existing));
  if (existing?.status === "generation_failed") return json({ ok: false, reason: "GENERATION_FAILED", message: LLM_ERROR_MESSAGE, ...retryPayload(existing) }, { status: 409 });

  const pricing = getPricing();
  const access = await resolveStartAccess({ env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok && access.reason === "LOGIN_REQUIRED") return loginRequired();
  if (!access.ok) {
    // 새 상담은 결제창으로 보낸다. 이미 본문까지 만든 이용권 상담(delivery_pending)은 그 뒤 한도 소진으로 거절돼도 전달한다.
    if (!existing && access.reason === "PAYMENT_REQUIRED") {
      return json({ ok: false, reason: "PAYMENT_REQUIRED", paymentPayload: buildBillingGatePayload({ pricing, idempotencyKey }) }, { status: 402 });
    }
    const settlement = await lateAccessDenialSettlement({ fresh: access, doc: existing, userId: auth.userId, idempotencyKey, service: SERVICE_KEY, models: lateSettlementModels() });
    if (!settlement) return paymentVerifyFailed();
    return json(publicSession(await finishDelivery({ request, env, auth, access: { accessType: existing.accessType }, pending: existing, settlement })));
  }
  const evidenceIds = startEvidenceIds(access);
  const evidenceClaim = await deps.claimEvidence(env, { userId: clean(auth.userId), requestId: idempotencyKey, evidenceIds, featureKey: FEATURE_KEY });
  if (!evidenceClaim.ok) return json(evidenceClaimErrorBody(evidenceClaim), { status: evidenceClaim.status });

  const sessionId = existing?.id || `scp_${clean(auth.userId).slice(-8)}_${startedAt.toString(36)}_${randomToken(8)}`;
  if (existing?.status === "delivery_pending") return json(publicSession(await finishDelivery({ request, env, auth, access, pending: existing })));
  if (existing?.status === "generating" && existing.llmMeta?.lockedAt && startedAt - new Date(existing.llmMeta.lockedAt).getTime() < GENERATING_FRESH_MS) {
    return json({ ...publicSession(existing), status: "generating" }, { status: 202 });
  }
  let facts = existing?.llmMeta?.facts;
  if (!facts) {
    try {
      facts = calculateSajuCompatPremiumFacts(normalized.input, { nowMs: startedAt, authorityEnabled: Boolean(deps.authorityOn(env)) });
    } catch (error) {
      if (!existing) {
        await deps.releaseEvidence(env, { userId: clean(auth.userId), requestId: idempotencyKey, evidenceIds });
        if (access.deferredUsage) await deps.callDeferredUsage({ request, env, auth, path: "cancel", idempotencyKey, sessionId, code: "CALCULATION_FAILED", message: clean(error?.message, 300) }).catch(() => {});
      }
      return calculationFailed(error);
    }
  }
  const resumeBody = existing?.llmMeta?.resumeBody || { ...body, paymentId: clean(access.paymentId, 160) || body.paymentId, accessToken: undefined };
  if (!existing) {
    try {
      await deps.Model.create({ id: sessionId, userId: clean(auth.userId), featureKey: FEATURE_KEY, self: normalized.input.self, partner: normalized.input.partner,
        relationType: normalized.input.relationType, accessType: access.accessType, paymentId: clean(access.paymentId, 160), idempotencyKey,
        inputHash: normalized.inputHash, status: "partial", generationError: null,
        llmMeta: { facts, resumeBody, groups: {}, attempts: {}, lockedAt: null, lockToken: "" } });
    } catch (error) {
      if (error?.code !== 11000) throw resultStorageUnavailable(sessionId);
      const duplicate = await deps.Model.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
      const duplicateRefund = consultationRefundResponse(duplicate);
      if (duplicateRefund) return json(duplicateRefund.body, { status: duplicateRefund.status });
      if (duplicate?.status === "completed") return json(publicSession(duplicate));
      return json({ ok: true, sessionId: duplicate?.id, status: "generating" }, { status: 202 });
    }
  }

  const lockToken = randomToken(16);
  const staleBefore = new Date(startedAt - GENERATING_FRESH_MS).toISOString();
  const claimed = await deps.Model.findOneAndUpdate({ id: sessionId, userId: clean(auth.userId), status: { $in: ["generating", "partial"] },
    $or: [{ "llmMeta.lockedAt": null }, { "llmMeta.lockedAt": { $exists: false } }, { "llmMeta.lockedAt": { $lt: staleBefore } }] },
  { $set: { status: "generating", "llmMeta.lockedAt": new Date(startedAt).toISOString(), "llmMeta.lockToken": lockToken,
    "llmMeta.resumeBody": resumeBody, "llmMeta.facts": facts } }, { new: true }).lean().catch(() => { throw resultStorageUnavailable(sessionId); });
  if (!claimed) {
    const current = await deps.Model.findOne({ id: sessionId, userId: clean(auth.userId) }).lean();
    if (!current) throw resultStorageUnavailable(sessionId);
    const currentRefund = consultationRefundResponse(current);
    if (currentRefund) return json(currentRefund.body, { status: currentRefund.status });
    if (current.status === "completed") return json(publicSession(current));
    return json({ ok: true, sessionId, status: "generating" }, { status: 202 });
  }

  let refundAfterUnlock = false;
  try {
    const groups = { ...savedGroupMap(claimed) };
    const attempts = { ...asObject(claimed.llmMeta?.attempts) };
    const usable = (group) => isSajuCompatPremiumGroupUsable(groups[group.key], group);
    // 🔴 저장된 완성 그룹은 고르지 않는다 — 다시 시도·복구 재개 모두 빠진 그룹만 생성한다.
    const missing = SAJU_COMPAT_PREMIUM_GROUPS.filter((group) => !usable(group));
    const next = missing.find((group) => Number(attempts[group.key] || 0) < GROUP_MAX_ATTEMPTS);
    if (missing.length && !next) throw Object.assign(new Error("생성 한도 안에서 궁합 장을 완성하지 못했습니다."), { code: "LLM_QUALITY_CHECK_FAILED" });
    if (next) {
      attempts[next.key] = Number(attempts[next.key] || 0) + 1;
      await saveState({ id: sessionId, userId: auth.userId, lockToken, values: { "llmMeta.attempts": attempts } });
      const row = await generateSajuCompatPremiumGroup(env, facts, next, { deadlineAt: startedAt + LLM_BUDGET_MS,
        finalAttempt: attempts[next.key] >= GROUP_MAX_ATTEMPTS, previous: groups[next.key] });
      groups[next.key] = row;
      await saveState({ id: sessionId, userId: auth.userId, lockToken, values: { [`llmMeta.groups.${next.key}`]: row } });
      if (!usable(next) && attempts[next.key] >= GROUP_MAX_ATTEMPTS) {
        throw Object.assign(new Error("생성 한도 안에서 궁합 장을 완성하지 못했습니다."), { code: "LLM_QUALITY_CHECK_FAILED", groupKey: next.key });
      }
    }
    const rows = SAJU_COMPAT_PREMIUM_GROUPS.map((group) => groups[group.key]).filter(Boolean);
    const result = assembleSajuCompatPremiumResult(rows, facts);
    if (!result) {
      const stored = await saveState({ id: sessionId, userId: auth.userId, lockToken, values: { status: "partial" } });
      return json({ ...publicSession(stored), continue: true }, { status: 202 });
    }
    const stored = await saveState({ id: sessionId, userId: auth.userId, lockToken, values: { status: "delivery_pending", result } });
    const freshAccess = await resolveStartAccess({ env, auth, body, normalized, pricing, idempotencyKey }).catch(() => { throw resultStorageUnavailable(sessionId); });
    const settlement = freshAccess.ok ? null : await lateAccessDenialSettlement({ fresh: freshAccess, doc: stored, userId: auth.userId, idempotencyKey, service: SERVICE_KEY, models: lateSettlementModels() });
    if (!freshAccess.ok && !settlement) return paymentVerifyFailed();
    return json(publicSession(await finishDelivery({ request, env, auth, access: freshAccess.ok ? freshAccess : { accessType: stored.accessType }, pending: stored, settlement })));
  } catch (error) {
    if (["RESULT_STORAGE_UNAVAILABLE", "RESULT_DELIVERY_PENDING"].includes(error?.code)) throw error;
    const failedAt = new Date(deps.now()).toISOString();
    const retry = retryMetaFor(claimed, error?.code);
    await saveState({ id: sessionId, userId: auth.userId, lockToken, values: { status: "generation_failed",
      ...(retry ? { "llmMeta.retryable": retry } : { "llmMeta.refundEligibleAt": failedAt }),
      generationError: { code: clean(error?.code || "LLM_GENERATION_FAILED", 80), message: clean(error?.message, 300), at: failedAt } } });
    if (retry) {
      // 다시 시도 가능: 환불·증빙 해제·이연 차감 취소를 하지 않는다(같은 결제 건으로 이어 쓴다). 본문은 숨긴 채 안내만.
      return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE, sessionId, refunded: false,
        retry: { available: true, refundAt: new Date(retry.refundAt).toISOString(), sessionId } }, { status: 503 });
    }
    refundAfterUnlock = true;
    await deps.releaseEvidence(env, { userId: clean(auth.userId), requestId: idempotencyKey, evidenceIds });
    if (access.deferredUsage) {
      const cleanup = await deps.callDeferredUsage({ request, env, auth, path: "cancel", idempotencyKey, sessionId,
        code: clean(error?.code || "LLM_GENERATION_FAILED", 80), message: clean(error?.message, 300) }).then(() => true, () => false);
      await saveState({ id: sessionId, userId: auth.userId, lockToken, status: "generation_failed", values: { "llmMeta.billingCleanupPending": !cleanup } });
    }
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE, sessionId }, { status: 503 });
  } finally {
    const released = await deps.Model.findOneAndUpdate({ id: sessionId, userId: clean(auth.userId), "llmMeta.lockToken": lockToken },
      { $set: { "llmMeta.lockedAt": null, "llmMeta.lockToken": "" } }, { new: true }).lean().catch(() => null);
    if (refundAfterUnlock && released?.status === "generation_failed") await settleFailureRefund(env, sessionId, auth.userId);
  }
}

async function handleResult(request, env) {
  let auth = null;
  try {
    auth = await deps.getUser(request, env, { surfaceDbInfraError: true });
  } catch {
    return json({ ok: false, retryable: true, reason: "DB_DEGRADED", message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
  if (!auth?.userId) return loginRequired();
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("id"), 180);
  await deps.connectDb(env);
  if (!sessionId) {
    const rows = await deps.Model.find({ userId: clean(auth.userId), status: "completed" }).sort({ createdAt: -1 }).limit(10)
      .select("id relationType self.name partner.name createdAt updatedAt").lean();
    const pending = await deps.Model.findOne({ userId: clean(auth.userId), status: { $in: ["generating", "partial", "delivery_pending"] } })
      .sort({ createdAt: -1 }).select("id").lean();
    return json({ ok: true, pendingSessionId: clean(pending?.id), sessions: rows.map((row) => ({
      sessionId: clean(row.id), relationType: clean(row.relationType), selfName: clean(row.self?.name, 40), partnerName: clean(row.partner?.name, 40),
      createdAt: row.createdAt, updatedAt: row.updatedAt,
    })) });
  }
  const doc = await deps.Model.findOne({ userId: clean(auth.userId), id: sessionId }).lean();
  if (!doc) return notFound();
  const refund = consultationRefundResponse(doc);
  if (refund) return json(refund.body, { status: refund.status });
  if (["generating", "partial", "delivery_pending"].includes(doc.status)) {
    const busy = doc.status === "generating" && doc.llmMeta?.lockedAt && deps.now() - new Date(doc.llmMeta.lockedAt).getTime() < GENERATING_FRESH_MS;
    return json({ ...publicSession(doc), status: busy ? "generating" : doc.status, continue: !busy }, { status: 202 });
  }
  if (doc.status !== "completed") {
    return json({ ok: false, reason: "GENERATION_FAILED", message: LLM_ERROR_MESSAGE, ...retryPayload(doc) }, { status: 409 });
  }
  if (await deps.isRevoked(auth.userId, FEATURE_KEY, doc)) return json({ ok: false, reason: "PAYMENT_REVOKED", retryable: false }, { status: 403 });
  return json(publicSession(doc));
}

// 다시 시도(무료): 같은 소유자의 다시 시도 가능 실패만 빠진 그룹 이어쓰기로 되돌리고 재개 경로로 한 그룹을 생성한다.
// 새 결제·차감·증빙 청구를 하지 않는다 — 재개가 같은 멱등 키로 기존 접근을 재확인하고, 차감은 전달 때 한 번뿐이다.
async function handleRetry(request, env) {
  const auth = await deps.getUser(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.resumeSessionId, 180);
  if (!sessionId) return invalidInput("다시 시도할 궁합을 확인하지 못했습니다.");
  await deps.connectDb(env);
  const owner = { id: sessionId, userId: clean(auth.userId) };
  const reopened = await reopenRetryableConsultation(deps.Model, owner, deps.now(), { reset: sajuCompatPremiumRetryReset });
  if (!reopened.ok && reopened.reason !== "CONFLICT") {
    const stored = await deps.Model.findOne(owner).lean().catch(() => null);
    if (!stored) return notFound();
    const refund = consultationRefundResponse(stored);
    if (refund) return json(refund.body, { status: refund.status });
    if (stored.status === "completed") return json(publicSession(stored));
    return json({ ok: false, reason: reopened.reason, message: LLM_ERROR_MESSAGE, ...retryPayload(stored) }, { status: 409 });
  }
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  return handleStart(new Request(request.url, { method: "POST", headers, body: JSON.stringify({ resumeSessionId: sessionId }) }), env, auth);
}

// 고객 환불 요청: 다시 시도 가능 실패를 공용 환불(settleFailedConsultationRefund)로 넘기고 바로 정산을 시도한다.
async function handleRefundRequest(request, env) {
  const auth = await deps.getUser(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId, 180);
  if (!sessionId) return invalidInput("환불을 요청할 궁합을 확인하지 못했습니다.");
  await deps.connectDb(env);
  const owner = { id: sessionId, userId: clean(auth.userId) };
  const marked = await markRetryableRefundDue(deps.Model, owner, deps.now(), "CUSTOMER_REQUEST");
  if (!marked.ok) {
    const stored = await deps.Model.findOne(owner).lean().catch(() => null);
    if (!stored) return notFound();
    const refund = consultationRefundResponse(stored);
    if (refund) return json(refund.body, { status: refund.status });
    return json({ ok: false, reason: marked.reason || "NOT_RETRYABLE" }, { status: 409 });
  }
  const settlement = await settleFailureRefund(env, sessionId, auth.userId);
  const refundStatus = settlement?.refundStatus || "pending";
  return json({ ok: true, sessionId, refunded: refundStatus === "refunded", refundStatus });
}

export async function handleSajuCompatPremiumRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, ROUTE_BASE);
  try {
    if (method === "POST" && path === "/prepare") return await handlePrepare(request, env);
    if (method === "POST" && path === "/generate") return await handleStart(request, env);
    if (method === "POST" && path === "/retry") return await handleRetry(request, env);
    if (method === "POST" && path === "/refund-request") return await handleRefundRequest(request, env);
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (["RESULT_STORAGE_UNAVAILABLE", "RESULT_DELIVERY_PENDING"].includes(error?.code)) {
      return json({ ...resultStorageFailurePayload(error), reason: error.code, ...(error.code === "RESULT_DELIVERY_PENDING" ? { message: error.message } : {}) }, { status: 503 });
    }
    console.error("[saju-compat-premium]", clean(error?.code || error?.message || error, 300));
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) {
      return json({ ok: false, retryable: true, reason: "DB_DEGRADED", message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    }
    return json({ ok: false, reason: "SERVER_ERROR", message: SERVER_ERROR_MESSAGE }, { status: 500 });
  }
}

// 내부 복구 크론 이어쓰기: 저장된 소유자·id 만 받는다. 일반 경로가 결제 증빙을 다시 확인한다.
export async function resumeConsultationOnServer(env, doc) {
  if (!doc?.userId || !doc.id) throw new Error("RECOVERY_doc.id_REQUIRED");
  const request = new Request(`https://internal.invalid${ROUTE_BASE}/resume`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ resumeSessionId: String(doc.id) }) });
  return handleStart(request, env, { userId: String(doc.userId) });
}

export const __sajuCompatPremiumTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  GROUP_MAX_ATTEMPTS,
  publicSession,
  sajuCompatPremiumRetryReset,
  setDeps(overrides = {}) { deps = { ...DEFAULT_DEPS, ...overrides }; },
  resetDeps() { deps = { ...DEFAULT_DEPS }; },
};
