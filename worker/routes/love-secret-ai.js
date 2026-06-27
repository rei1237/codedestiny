import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose } from "../lib/db.js";
import { LoveSecretAiConsultation, MonthlyCreditLedger, Payment, PointHistory, User } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { callGeminiText } from "../lib/gemini.js";
import { calculateLoveSecretAiSaju, normalizeLoveSecretAiInput } from "../lib/love-secret-ai-calculation.js";
import {
  LOVE_SECRET_AI_SYSTEM_PROMPT,
  buildFirstConsultationPrompt,
  buildFollowUpConsultationPrompt,
  normalizeFollowUpResponse,
  parseFirstConsultationResponse,
} from "../lib/love-secret-ai-prompt.js";

const SERVICE_KEY = "love-secret-ai";
const FEATURE_KEY = "love-secret-ai-consultation";
const ACCESS_TOKEN_TYPE = "love-secret-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "연애 비책 AI 상담";

const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "생년월일과 연애 상담 정보를 다시 확인해 주세요.";
const CALCULATION_FAILED_MESSAGE = "연애 흐름 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function sha256(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function readIdempotencyKey(request, body = {}) {
  return clean(
    body?.idempotencyKey
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key"),
    180,
  );
}

function randomToken(length = 10) {
  const bytes = new Uint8Array(Math.max(8, Math.ceil(length * 0.75)));
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, length);
}

function invalidInput(message = INVALID_INPUT_MESSAGE, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message: clean(message) || INVALID_INPUT_MESSAGE }, { status });
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: LOGIN_REQUIRED_MESSAGE }, { status: 401 });
}

function serverError(message = SERVER_ERROR_MESSAGE, status = 500) {
  return json({ ok: false, reason: "SERVER_ERROR", message }, { status });
}

function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: PAYMENT_VERIFY_FAILED_MESSAGE }, { status: 402 });
}

function calculationFailed() {
  return json({ ok: false, reason: "CALCULATION_FAILED", message: CALCULATION_FAILED_MESSAGE }, { status: 422 });
}

function normalizeRequestBody(body = {}) {
  const normalized = normalizeLoveSecretAiInput(body);
  if (!normalized.ok) return normalized;
  return {
    ...normalized,
    inputHash: sha256(stableJson(normalized.input)),
  };
}

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || coinPrice * 100);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("love-secret-ai price not found");
    error.code = "PRICE_NOT_FOUND";
    throw error;
  }
  return {
    pricing,
    coinPrice,
    amountKRW,
    membershipCreditCost: calculateMembershipCreditCost(coinPrice),
  };
}

async function createAccessToken(env, payload) {
  return signJwt(
    {
      typ: ACCESS_TOKEN_TYPE,
      serviceKey: SERVICE_KEY,
      featureKey: FEATURE_KEY,
      ...payload,
    },
    getAccessTokenSecret(env),
    {
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    },
  );
}

async function verifyAccessToken(env, token) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), {
    issuer: getJwtIssuer(env),
    audience: getJwtAudience(env),
  });
  if (payload?.typ !== ACCESS_TOKEN_TYPE || payload?.serviceKey !== SERVICE_KEY || payload?.featureKey !== FEATURE_KEY) {
    const error = new Error("invalid access token");
    error.code = "INVALID_ACCESS_TOKEN";
    throw error;
  }
  return payload;
}

function isAdmin(auth = {}) {
  return clean(auth.role).toLowerCase() === "admin";
}

async function loadBillingUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return null;
  return User.findById(userId)
    .select("email name phoneNumber points role profileSubscription subscription membership pass entitlement paidFeatures unlockedFeatures")
    .lean();
}

function monthlyCreditBalance(user = {}) {
  return Math.max(0, Math.floor(Number(
    user?.profileSubscription?.membershipCreditBalance
      || user?.profileSubscription?.monthlyStoneBalance
      || 0,
  )));
}

async function findPaidPayment({ userId, idempotencyKey = "", paymentId = "" }) {
  const clauses = [];
  if (idempotencyKey) clauses.push({ idempotencyKey });
  if (paymentId) clauses.push({ merchantUid: paymentId }, { impUid: paymentId }, { requestId: paymentId });
  if (!clauses.length) return null;
  return Payment.findOne({
    userId,
    featureKey: FEATURE_KEY,
    paymentType: "digital_content",
    accessType: "single_purchase",
    status: { $in: ["paid", "success", "fulfilled"] },
    $or: clauses,
  }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
}

async function resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash, paymentId = "" }) {
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "" };
  }

  const paidPayment = await findPaidPayment({ userId: auth.userId, idempotencyKey, paymentId });
  if (paidPayment) {
    const storedHash = clean(paidPayment?.pricingSnapshot?.inputHash);
    if (storedHash && storedHash !== inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "같은 요청 키로 다른 상담 정보를 사용할 수 없습니다." };
    }
    return { ok: true, accessType: "paid", paymentId: clean(paidPayment.merchantUid || paidPayment.impUid || paymentId, 160) };
  }

  const pass = normalizeHoneyPassEntitlement(user || {});
  if (canUseByPass(pass, pricing.coinPrice)) {
    return { ok: true, accessType: "pass", paymentId: "" };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function buildBillingGatePayload(pricing, idempotencyKey, user = {}) {
  const monthlyBalance = monthlyCreditBalance(user);
  return {
    billingMode: "coin-gate",
    featureKey: FEATURE_KEY,
    serviceKey: SERVICE_KEY,
    reason: ORDER_NAME,
    cost: pricing.coinPrice,
    coinPrice: pricing.coinPrice,
    amountKRW: pricing.amountKRW,
    membershipCreditCost: pricing.membershipCreditCost,
    requestId: idempotencyKey,
    idempotencyKey,
    runtimeGate: {
      title: ORDER_NAME,
      reason: ORDER_NAME,
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      featureKey: FEATURE_KEY,
      serviceKey: SERVICE_KEY,
      productId: SERVICE_KEY,
      productType: SERVICE_KEY,
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      amountKrw: pricing.amountKRW,
      membershipCreditCost: pricing.membershipCreditCost,
      monthlyBalance,
      monthlyCredits: monthlyBalance,
      membershipCreditBalance: monthlyBalance,
      allowedPaymentModes: ["monthly", "direct"],
      requestId: idempotencyKey,
      idempotencyKey,
    },
  };
}

function objectOf(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isObjectIdLike(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || ""));
}

function collectBillingEvidenceIds(body = {}) {
  const ids = new Set();
  const add = (value) => {
    const id = clean(value, 180);
    if (id) ids.add(id);
  };
  const payment = objectOf(body.payment);
  const accessGrant = objectOf(body.accessGrant);
  const consume = objectOf(body.consume);
  [
    body.paymentId,
    body.transactionId,
    body.purchaseId,
    body.ledgerId,
    body.requestId,
    body.idempotencyKey,
    body.orderId,
    payment.paymentId,
    payment.impUid,
    payment.merchantUid,
    payment.transactionId,
    payment.purchaseId,
    payment.requestId,
    accessGrant.paymentId,
    accessGrant.purchaseId,
    accessGrant.transactionId,
    accessGrant.ledgerId,
    accessGrant.evidenceId,
    accessGrant.requestId,
    consume.paymentId,
    consume.purchaseId,
    consume.transactionId,
    consume.ledgerId,
    consume.evidenceId,
    consume.requestId,
  ].forEach(add);
  return [...ids];
}

function buildPointHistoryEvidenceQuery(ids) {
  const or = [];
  ids.forEach((id) => {
    or.push(
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
      { "metadata.transactionId": id },
      { "metadata.ledgerId": id },
      { "metadata.evidenceId": id },
    );
    if (isObjectIdLike(id)) or.push({ _id: id });
  });
  return or;
}

function buildMonthlyLedgerEvidenceQuery(ids) {
  const or = [];
  ids.forEach((id) => {
    or.push(
      { sourceId: id },
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
      { "metadata.pointHistoryId": id },
      { "metadata.transactionId": id },
      { "metadata.ledgerId": id },
      { "metadata.evidenceId": id },
    );
    if (isObjectIdLike(id)) or.push({ _id: id });
  });
  return or;
}

async function resolveBillingUsageEvidence(env, auth, body = {}) {
  const ids = collectBillingEvidenceIds(body);
  if (!ids.length) return null;
  await connectDb(env);
  const pointOr = buildPointHistoryEvidenceQuery(ids);
  const pointHistory = pointOr.length
    ? await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      "metadata.monthlyCreditRefundedForLoveSecretAiFailure": { $ne: true },
      $and: [
        { $or: pointOr },
        {
          $or: [
            { "metadata.accessType": { $in: ["membership_credit", "coin", "single_purchase"] } },
            { "metadata.transactionType": { $in: ["membership_credit", "coin", "single_purchase"] } },
            { "metadata.accessMethod": { $in: ["MONTHLY", "COIN", "DIRECT_KRW"] } },
            { "metadata.paymentMethod": { $in: ["MONTHLY", "COIN", "DIRECT_KRW"] } },
          ],
        },
      ],
    }).select("_id metadata").lean()
    : null;
  if (pointHistory) {
    const accessType = clean(pointHistory?.metadata?.accessType).toLowerCase();
    const isMonthly = accessType === "membership_credit"
      || clean(pointHistory?.metadata?.transactionType).toLowerCase() === "membership_credit"
      || clean(pointHistory?.metadata?.accessMethod).toUpperCase() === "MONTHLY";
    return {
      ok: true,
      accessType: isMonthly ? "subscription" : "paid",
      accessSource: isMonthly ? "billing_gate_membership_credit" : "billing_gate_paid",
      paymentId: String(pointHistory._id || body.paymentId || ""),
      billingEvidence: {
        pointHistoryId: String(pointHistory._id || ""),
        ledgerId: clean(pointHistory?.metadata?.ledgerId, 160),
        purchaseId: clean(pointHistory?.metadata?.purchaseId || pointHistory?.metadata?.requestId, 160),
        membershipCreditCost: Math.max(0, Math.floor(Number(pointHistory?.metadata?.membershipCreditCost || pointHistory?.metadata?.requiredMonthlyCredits || 0))),
      },
    };
  }

  const ledgerOr = buildMonthlyLedgerEvidenceQuery(ids);
  const ledger = ledgerOr.length
    ? await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: FEATURE_KEY,
      "metadata.refundedForLoveSecretAiFailure": { $ne: true },
      $or: ledgerOr,
    }).select("_id amount sourceId metadata").lean()
    : null;
  if (ledger) {
    return {
      ok: true,
      accessType: "subscription",
      accessSource: "billing_gate_membership_credit",
      paymentId: String(ledger._id || body.paymentId || ""),
      billingEvidence: {
        ledgerId: String(ledger._id || ""),
        pointHistoryId: clean(ledger?.metadata?.pointHistoryId, 160),
        purchaseId: clean(ledger.sourceId || ledger?.metadata?.purchaseId || ledger?.metadata?.requestId, 160),
        membershipCreditCost: Math.max(0, Math.floor(Number(ledger.amount || ledger?.metadata?.requiredMonthlyCredits || 0))),
      },
    };
  }
  return null;
}

async function generateFirstConsultation(env, input, sajuResult) {
  const ai = await callGeminiText(env, buildFirstConsultationPrompt(input, sajuResult), {
    systemPrompt: LOVE_SECRET_AI_SYSTEM_PROMPT,
    temperature: 0.72,
    maxOutputTokens: 8000,
    taskType: "fortune",
  });
  if (!ai?.ok || !clean(ai.text)) {
    const error = new Error(ai?.message || ai?.error || "LLM_GENERATION_FAILED");
    error.code = "LLM_GENERATION_FAILED";
    throw error;
  }
  const parsed = parseFirstConsultationResponse(ai.text);
  return {
    ...parsed,
    provider: clean(ai.provider),
    model: clean(ai.model),
  };
}

async function generateFollowUp(env, consultation, message) {
  const ai = await callGeminiText(env, buildFollowUpConsultationPrompt(consultation, message), {
    systemPrompt: LOVE_SECRET_AI_SYSTEM_PROMPT,
    temperature: 0.7,
    maxOutputTokens: 5000,
    taskType: "fortune",
  });
  if (!ai?.ok || !clean(ai.text)) {
    const error = new Error(ai?.message || ai?.error || "LLM_GENERATION_FAILED");
    error.code = "LLM_GENERATION_FAILED";
    throw error;
  }
  return {
    text: normalizeFollowUpResponse(ai.text),
    provider: clean(ai.provider),
    model: clean(ai.model),
  };
}

async function applyUsageOnce({ sessionId }) {
  const existing = await LoveSecretAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  await LoveSecretAiConsultation.updateOne(
    { id: sessionId, usageAppliedAt: null },
    { $set: { usageAppliedAt: new Date() } },
  );
  return true;
}

async function refundBillingGateMonthlyCredit({ userId, evidence = {}, reason = LLM_ERROR_MESSAGE }) {
  const amount = Math.max(0, Math.floor(Number(evidence.membershipCreditCost || 0)));
  const sourceId = clean(evidence.ledgerId || evidence.pointHistoryId || evidence.purchaseId, 160);
  if (!amount || !sourceId) return { refunded: false };

  const refundSourceId = `love-secret-ai-refund:${sourceId}`.slice(0, 180);
  const existing = await MonthlyCreditLedger.findOne({
    userId,
    type: "MONTHLY_CREDIT_GRANT",
    sourceId: refundSourceId,
  }).lean();
  if (existing) return { refunded: true, idempotent: true };

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $inc: {
        "profileSubscription.membershipCreditBalance": amount,
        "profileSubscription.membershipCreditUsed": -amount,
      },
      ...(evidence.purchaseId ? { $pull: { recentConsumeRequestIds: evidence.purchaseId } } : {}),
    },
    { new: true, projection: { profileSubscription: 1 } },
  ).lean();
  if (!updatedUser) return { refunded: false };

  const afterBalance = Math.max(0, Math.floor(Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0)));
  await MonthlyCreditLedger.create({
    userId,
    type: "MONTHLY_CREDIT_GRANT",
    amount,
    beforeBalance: Math.max(0, afterBalance - amount),
    afterBalance,
    reason,
    sourceId: refundSourceId,
    serviceKey: FEATURE_KEY,
    metadata: {
      source: "love-secret-ai",
      refundFor: sourceId,
      originalLedgerId: clean(evidence.ledgerId, 160),
      originalPointHistoryId: clean(evidence.pointHistoryId, 160),
      purchaseId: clean(evidence.purchaseId, 160),
      refundedAt: new Date(),
    },
  }).catch((error) => {
    if (error?.code !== 11000) throw error;
  });

  if (evidence.pointHistoryId && mongoose.Types.ObjectId.isValid(String(evidence.pointHistoryId))) {
    await PointHistory.updateOne(
      { _id: evidence.pointHistoryId, userId },
      {
        $set: {
          "metadata.monthlyCreditRefundedForLoveSecretAiFailure": true,
          "metadata.monthlyCreditRefundedForUnlockFailure": true,
          "metadata.monthlyCreditRefundedAt": new Date(),
        },
      },
    ).catch(() => {});
  }
  if (evidence.ledgerId && mongoose.Types.ObjectId.isValid(String(evidence.ledgerId))) {
    await MonthlyCreditLedger.updateOne(
      { _id: evidence.ledgerId, userId },
      {
        $set: {
          "metadata.refundedForLoveSecretAiFailure": true,
          "metadata.refundedForUnlockFailure": true,
          "metadata.refundedAt": new Date(),
        },
      },
    ).catch(() => {});
  }
  return { refunded: true };
}

function publicSession(doc) {
  return {
    ok: true,
    sessionId: clean(doc.id),
    accessType: clean(doc.accessType),
    status: clean(doc.status),
    keywords: Array.isArray(doc.keywords) ? doc.keywords.map((item) => clean(item)).filter(Boolean).slice(0, 3) : [],
    strategy: clean(doc.strategy),
    consultationMode: clean(doc.sajuResult?.consultationMode),
    messages: Array.isArray(doc.messages)
      ? doc.messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      }))
      : [],
  };
}

async function handleEnsureAccess(request, env) {
  const body = await readJson(request);
  const normalized = normalizeRequestBody(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput("요청 정보가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  const pricing = getPricing();
  if (isAdmin(auth)) {
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: "admin",
        idempotencyKey,
        inputHash: normalized.inputHash,
      }),
      accessType: "admin",
    });
  }

  await connectDb(env);
  const user = await loadBillingUser(auth.userId);
  if (!user) return loginRequired();

  const access = await resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash });
  if (access.ok) {
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: access.accessType,
        idempotencyKey,
        inputHash: normalized.inputHash,
        paymentId: access.paymentId || "",
      }),
      accessType: access.accessType,
    });
  }
  if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);

  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    paymentPayload: buildBillingGatePayload(pricing, idempotencyKey, user),
  }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-love-secret-ai-access-token"));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "상담 접근 정보가 현재 입력값과 일치하지 않습니다." };
    }
    return { ok: true, accessType: clean(payload.accessType), paymentId: clean(payload.paymentId, 160) };
  }

  const billingEvidence = await resolveBillingUsageEvidence(env, auth, body);
  if (billingEvidence?.ok) return billingEvidence;

  const user = await loadBillingUser(auth.userId);
  if (!user && !isAdmin(auth)) return { ok: false, reason: "LOGIN_REQUIRED" };
  return resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash });
}

async function handleStart(request, env) {
  const body = await readJson(request);
  const normalized = normalizeRequestBody(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput("요청 정보가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return paymentVerifyFailed();
  }

  const existing = await LoveSecretAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
  if (existing && clean(existing.inputHash) !== normalized.inputHash) {
    return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  }
  if (existing?.status === "completed") return json(publicSession(existing));
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 90000) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "연애 비책 상담을 준비하고 있습니다" }, { status: 202 });
  }

  let sajuResult;
  try {
    sajuResult = calculateLoveSecretAiSaju(normalized);
  } catch (error) {
    console.warn("[love-secret-ai] calculation failed", clean(error?.message || error, 500));
    return calculationFailed();
  }

  const sessionId = existing?.id || `lsai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
  const now = new Date();
  const seed = {
    id: sessionId,
    userId: clean(auth.userId),
    myInfo: normalized.input.myInfo,
    partnerInfo: normalized.input.partnerInfo || null,
    relationshipStatus: normalized.input.relationshipStatus,
    topic: normalized.input.topic,
    userQuestion: normalized.input.userQuestion || "",
    sajuResult,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    keywords: [],
    strategy: "",
    messages: [],
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "generating",
    generationError: null,
  };

  if (existing) {
    await LoveSecretAiConsultation.updateOne(
      { id: existing.id },
      { $set: { ...seed, updatedAt: now } },
    );
  } else {
    try {
      await LoveSecretAiConsultation.create(seed);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await LoveSecretAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "연애 비책 상담을 준비하고 있습니다" }, { status: 202 });
      }
      throw error;
    }
  }

  try {
    const generated = await generateFirstConsultation(env, normalized.input, sajuResult);
    const completed = await LoveSecretAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
          keywords: generated.keywords,
          strategy: generated.strategy,
          messages: [
            {
              role: "user",
              content: normalized.input.userQuestion || `${normalized.input.relationshipStatus} · ${normalized.input.topic}`,
              createdAt: now,
            },
            { role: "assistant", content: generated.answer, createdAt: new Date() },
          ],
          llmMeta: { provider: generated.provider, model: generated.model, completedAt: new Date().toISOString() },
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    await applyUsageOnce({
      userId: auth.userId,
      sessionId,
      accessType: access.accessType,
      accessSource: access.accessSource || "",
      paymentId: clean(access.paymentId, 160),
      pricing,
    });
    const finalDoc = await LoveSecretAiConsultation.findOne({ id: sessionId }).lean();
    return json(publicSession(finalDoc || completed));
  } catch (error) {
    if (access.accessSource === "billing_gate_membership_credit") {
      await refundBillingGateMonthlyCredit({
        userId: auth.userId,
        evidence: access.billingEvidence || {},
        reason: LLM_ERROR_MESSAGE,
      }).catch((refundError) => {
        console.warn("[love-secret-ai] monthly credit refund failed", clean(refundError?.message || refundError, 500));
      });
    }
    await LoveSecretAiConsultation.updateOne(
      { id: sessionId },
      {
        $set: {
          status: "generation_failed",
          generationError: {
            code: clean(error?.code || "LLM_GENERATION_FAILED", 80),
            message: clean(error?.message || error, 500),
            at: new Date().toISOString(),
          },
        },
      },
    ).catch(() => {});
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

async function handleMessage(request, env) {
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.consultationId, 120);
  const message = clean(body?.message || body?.question, 1200);
  if (!sessionId) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);
  if (message.length < 2) return invalidInput("추가 질문을 입력해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await LoveSecretAiConsultation.findOne({
    id: sessionId,
    userId: clean(auth.userId),
    status: "completed",
  }).lean();
  if (!consultation) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);

  try {
    const generated = await generateFollowUp(env, consultation, message);
    const userMessage = { role: "user", content: message, createdAt: new Date() };
    const assistantMessage = { role: "assistant", content: generated.text, createdAt: new Date() };
    const updated = await LoveSecretAiConsultation.findOneAndUpdate(
      { id: sessionId, userId: clean(auth.userId) },
      {
        $push: { messages: { $each: [userMessage, assistantMessage] } },
        $set: {
          llmMeta: { provider: generated.provider, model: generated.model, updatedAt: new Date().toISOString() },
        },
      },
      { new: true },
    ).lean();
    return json(publicSession(updated));
  } catch (error) {
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

export async function handleLoveSecretAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/love-secret-ai");

  try {
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[love-secret-ai]", clean(error?.code || error?.message || error, 500));
    return serverError();
  }
}

export const __loveSecretAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeRequestBody,
  getPricing,
};
