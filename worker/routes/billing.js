import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { handleFortuneRoutes } from "./fortune.js";
import { handlePaymentRoutes } from "./payments.js";
import { getOptionalUserFromRequest } from "../lib/auth.js";
import { buildPremiumAccessCookie } from "../lib/premium-access-token.js";
import {
  assertFeatureEnabled,
  getBillingFeaturePricing,
  listBillingFeatures,
} from "../lib/billing-feature-registry.js";
import {
  completeServiceExecution,
  failServiceExecution,
  getServiceExecution,
  heartbeatServiceExecution,
  startServiceExecution,
} from "../lib/service-execution-task.js";
import { connectDb } from "../lib/db.js";
import { PointHistory, ServiceExecutionTransaction, User } from "../lib/models.js";
import { calculateMembershipCreditCost, MEMBERSHIP_CREDIT_PER_COIN } from "../lib/billing-policy.js";

const MEMBERSHIP_CREDIT_GRANT_BY_TIER = Object.freeze({
  standard: 990,
  premium: 2990,
  vvip: 5900,
});

const MEMBERSHIP_FREE_LIMIT_BY_TIER = Object.freeze({
  standard: 30,
  premium: 50,
  vvip: 100,
});

const ACCESS_DECISION_REASONS = Object.freeze({
  FREE: "free",
  AUTH_REQUIRED: "auth_required",
  ALREADY_UNLOCKED: "already_unlocked",
  SUBSCRIPTION_ACTIVE: "subscription_active",
  USAGE_PASS_ACTIVE: "usage_pass_active",
  INSUFFICIENT_COINS: "insufficient_coins",
  REQUIRES_PURCHASE: "requires_purchase",
});

function resolveUsagePassCategories(pricing = {}) {
  const featureKey = String(pricing?.featureKey || "").trim().toLowerCase();
  const cost = Number(pricing?.coinPrice || pricing?.cost || 0);
  const categories = [];
  if (!featureKey) return categories;

  const isCompat = featureKey.includes("compat")
    || featureKey.includes("relationship")
    || featureKey === "section_compat"
    || featureKey === "vedic-compatibility-per-use"
    || featureKey === "premium-love-secret-couple"
    || featureKey === "premium_pdf_saju_love_secret_compat";
  const isSajuUnlock = featureKey === "section_daewun"
    || featureKey === "section_summary"
    || featureKey === "section_compat"
    || featureKey.startsWith("rpt_")
    || featureKey === "rpgcharacter"
    || featureKey === "traveldestiny"
    || featureKey === "healthreport"
    || featureKey === "sajudiary"
    || featureKey === "secrethouseepisodes";

  if (isCompat) categories.push("compat");
  if (isSajuUnlock) categories.push("saju_unlock");
  if (Number.isFinite(cost) && cost > 0 && cost <= 30) categories.push("fortune_30");
  if (Number.isFinite(cost) && cost > 0 && cost <= 50) categories.push("fortune_50");

  return Array.from(new Set(categories));
}

async function consumeUsagePassIfAvailable(env, authUserId, pricing, requestId) {
  const categories = resolveUsagePassCategories(pricing);
  if (!categories.length) return null;

  await connectDb(env);

  let updatedUser = null;
  let category = "";
  for (let i = 0; i < categories.length; i += 1) {
    category = categories[i];
    updatedUser = await User.findOneAndUpdate(
      {
        _id: authUserId,
        usagePasses: {
          $elemMatch: {
            category,
            remainingUses: { $gt: 0 },
          },
        },
      },
      {
        $inc: { "usagePasses.$.remainingUses": -1 },
        $set: { "usagePasses.$.updatedAt": new Date() },
      },
      {
        returnDocument: "after",
        projection: { points: 1, usagePasses: 1 },
      },
    ).lean();
    if (updatedUser) break;
  }

  if (!updatedUser) return null;

  const usagePasses = Array.isArray(updatedUser.usagePasses) ? updatedUser.usagePasses : [];
  const activePass = usagePasses.find((entry) => String(entry?.category || "") === category);

  return {
    category,
    remainingUses: Number(activePass?.remainingUses || 0),
    requestId: String(requestId || ""),
    transactionType: "usage_pass",
    user: {
      id: String(authUserId || ""),
      points: Number(updatedUser?.points || 0),
    },
  };
}

function isActiveMembership(profileSubscription = {}) {
  const tier = String(profileSubscription?.tier || "free").trim().toLowerCase();
  const expiresAt = profileSubscription?.expiresAt ? new Date(profileSubscription.expiresAt) : null;
  return tier !== "free" && expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() > Date.now();
}

async function getActiveMembershipPassForUser(env, authUserId) {
  await connectDb(env);
  const user = await User.findById(authUserId).select("profileSubscription").lean();
  const sub = user?.profileSubscription || {};
  const tier = String(sub?.tier || "free").trim().toLowerCase();
  const isActive = isActiveMembership(sub);
  return {
    isActive,
    tier: isActive ? tier : "free",
    freeLimit: isActive ? Number(MEMBERSHIP_FREE_LIMIT_BY_TIER[tier] || 0) : 0,
    profileSubscription: sub,
  };
}

async function seedMembershipCreditForExistingPassIfNeeded(authUserId) {
  const user = await User.findById(authUserId).select("points profileSubscription").lean();
  const sub = user?.profileSubscription || {};
  const tier = String(sub?.tier || "free").trim().toLowerCase();
  const legacyPoints = Number(user?.points || 0);
  const grantedCredit = Number(sub?.membershipCreditGranted || 0);
  if (!user?._id) return null;

  const passCredit = Number(MEMBERSHIP_CREDIT_GRANT_BY_TIER[tier] || 0);
  const legacyCredit = !sub?.legacyCoinCreditSeeded && legacyPoints > 0
    ? Math.floor(legacyPoints * MEMBERSHIP_CREDIT_PER_COIN)
    : 0;
  const shouldSeedPassCredit = isActiveMembership(sub) && grantedCredit <= 0 && passCredit > 0;
  let updatedUser = null;

  if (legacyCredit > 0) {
    updatedUser = await User.findOneAndUpdate(
      {
        _id: authUserId,
        "profileSubscription.legacyCoinCreditSeeded": { $ne: true },
      },
      {
        $inc: {
          "profileSubscription.membershipCreditBalance": legacyCredit,
          "profileSubscription.membershipCreditGranted": legacyCredit,
        },
        $set: {
          "profileSubscription.legacyCoinCreditSeeded": true,
          "profileSubscription.legacyCoinCreditSeededAt": new Date(),
          "profileSubscription.legacyCoinCreditSeededPoints": Math.floor(legacyPoints),
        },
      },
      {
        returnDocument: "after",
        projection: { points: 1, profileSubscription: 1 },
      },
    ).lean();
  }

  if (shouldSeedPassCredit) {
    updatedUser = await User.findOneAndUpdate(
      {
        _id: authUserId,
        "profileSubscription.membershipCreditGranted": { $lte: legacyCredit > 0 ? legacyCredit : 0 },
      },
      {
        $inc: {
          "profileSubscription.membershipCreditBalance": passCredit,
          "profileSubscription.membershipCreditGranted": passCredit,
        },
      },
      {
        returnDocument: "after",
        projection: { points: 1, profileSubscription: 1 },
      },
    ).lean() || updatedUser;
  }

  return updatedUser;
}

async function consumeMembershipCreditIfAvailable(env, authUserId, pricing, requestId, body = {}) {
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const requiredCredit = Number(pricing?.membershipCreditCost || calculateMembershipCreditCost(coinPrice));
  if (!Number.isInteger(requiredCredit) || requiredCredit <= 0) return null;

  await connectDb(env);
  await seedMembershipCreditForExistingPassIfNeeded(authUserId);

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: authUserId,
      "profileSubscription.membershipCreditBalance": { $gte: requiredCredit },
    },
    {
      $inc: {
        "profileSubscription.membershipCreditBalance": -requiredCredit,
        "profileSubscription.membershipCreditUsed": requiredCredit,
      },
    },
    {
      returnDocument: "after",
      projection: { points: 1, profileSubscription: 1 },
    },
  ).lean();

  if (!updatedUser) return null;

  const reportId = String(body?.reportId || body?.accessGrant?.reportId || "").trim();
  const sessionId = String(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || "").trim();
  const featureKey = String(pricing?.featureKey || body?.featureKey || "").trim();
  const history = await PointHistory.create({
    userId: authUserId,
    kind: "deduct",
    delta: -Math.max(0, coinPrice),
    balanceAfter: Number(updatedUser?.points || 0),
    reason: String(pricing?.reason || "membership_credit_access"),
    featureKey,
    metadata: {
      accessType: "membership_credit",
      requestId: String(requestId || ""),
      purchaseId: String(requestId || ""),
      reportId,
      sessionId,
      reportSessionId: sessionId,
      featureKey,
      coinPrice,
      membershipCreditCost: requiredCredit,
      remainingMembershipCredit: Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0),
    },
  }).catch(async (error) => {
    await User.findByIdAndUpdate(authUserId, {
      $inc: {
        "profileSubscription.membershipCreditBalance": requiredCredit,
        "profileSubscription.membershipCreditUsed": -requiredCredit,
      },
    }).catch(() => {});
    throw error;
  });

  return {
    transactionId: String(history?._id || ""),
    requestId: String(requestId || ""),
    transactionType: "membership_credit",
    accessType: "membership_credit",
    featureKey,
    coinPrice,
    membershipCreditCost: requiredCredit,
    remainingMembershipCredit: Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0),
    user: {
      id: String(authUserId || ""),
      points: Number(updatedUser?.points || 0),
      profileSubscription: updatedUser?.profileSubscription || null,
    },
  };
}

function buildBillingErrorDetails(stage, error, extras = {}) {
  return {
    stage: String(stage || "billing-route"),
    name: error?.name || "Error",
    code: error?.code || "BILLING_ROUTE_ERROR",
    message: String(error?.message || "Unknown error"),
    ...(extras && typeof extras === "object" ? extras : {}),
  };
}

function logBillingRouteError(stage, error, request, extras = {}) {
  const payload = {
    route: "billing",
    method: request?.method || "",
    path: request ? new URL(request.url).pathname : "",
    ...buildBillingErrorDetails(stage, error, extras),
  };

  try {
    console.error("[worker-billing-route-error]", JSON.stringify(payload));
  } catch (e) {
    console.error("[worker-billing-route-error]", payload);
  }
}

function toMessage(payload, fallbackMessage) {
  if (!payload || typeof payload !== "object") return fallbackMessage;
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  if (payload.error && typeof payload.error.message === "string" && payload.error.message.trim()) {
    return payload.error.message;
  }
  return fallbackMessage;
}

function toCode(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.code === "string") return payload.code;
  if (payload.error && typeof payload.error.code === "string") return payload.error.code;
  return "";
}

function success(data, message = "요청이 성공했습니다.", init = {}) {
  return json({ ok: true, data, message }, init);
}

function cleanText(value, max = 240) {
  return String(value || "").trim().slice(0, max);
}

function toIso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

const REPORT_TYPE_FALLBACK = Object.freeze({
  lifeBook: { reportType: "life_book", displayName: "사주 인생의 책" },
  loveSecret: { reportType: "love_book", displayName: "사주 연애 비책" },
  sajuNewYear: { reportType: "new_year", displayName: "사주 신년운세" },
  ziweiPremium: { reportType: "ziwei_book", displayName: "자미두수" },
  sookyoPremium: { reportType: "sukyo_book", displayName: "숙요점" },
  westernAstrologyPremium: { reportType: "western_astro_book", displayName: "점성술" },
  vedicPremium: { reportType: "vedic_book", displayName: "베다점" },
  soulOriginKarma: { reportType: "soul_origin_book", displayName: "운명의 기원서" },
});

function toArchiveBase(doc) {
  const metadata = (doc && typeof doc.metadata === "object" && doc.metadata) ? doc.metadata : {};
  const archive = (metadata.archive && typeof metadata.archive === "object") ? metadata.archive : {};
  const fallback = REPORT_TYPE_FALLBACK[String(doc?.reportType || "")] || {
    reportType: cleanText(doc?.reportType || "premium_report", 80) || "premium_report",
    displayName: "프리미엄 리포트",
  };

  const reportId = cleanText(doc?.reportId || archive.reportId || metadata.reportId, 120);
  const createdAt = toIso(doc?.createdAt || archive.createdAt || doc?.updatedAt);
  const completedAt = toIso(doc?.completedAt || archive.completedAt || doc?.updatedAt || doc?.createdAt);
  const updatedAt = toIso(doc?.updatedAt || completedAt || createdAt);
  const pdfUrl = cleanText(archive.pdfUrl || archive?.pdfReady?.pdfUrl, 500);
  const chapters = Array.isArray(archive.chapters) ? archive.chapters : [];
  const canReopen = Boolean(pdfUrl || chapters.length > 0 || (archive.payload && typeof archive.payload === "object"));

  return {
    reportId,
    reportType: cleanText(archive.reportType || fallback.reportType, 80) || fallback.reportType,
    title: cleanText(archive.title || "", 240),
    displayName: cleanText(archive.displayName || fallback.displayName, 120) || fallback.displayName,
    mode: cleanText(archive.mode || "", 40),
    status: "completed",
    createdAt,
    completedAt,
    updatedAt,
    birthName: cleanText(archive.birthName || "", 120),
    targetName: cleanText(archive.targetName || "", 120),
    pdfUrl,
    pdfStorageKey: cleanText(archive.pdfStorageKey || "", 200),
    summary: cleanText(archive.summary || "", 1000),
    chapters,
    payload: archive.payload && typeof archive.payload === "object" ? archive.payload : null,
    paymentSessionId: cleanText(doc?.paymentSessionId || metadata.purchaseId || "", 160),
    coinAmount: Number(doc?.coinAmount || 0),
    canReopen,
    canDownload: Boolean(pdfUrl),
  };
}

async function requireArchiveAuth(request, env) {
  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth?.userId) {
    return {
      ok: false,
      response: failure(401, "AUTH_REQUIRED", "로그인이 필요합니다."),
      auth: null,
    };
  }
  return { ok: true, auth, response: null };
}

async function handlePdfArchiveList(request, env) {
  const authCheck = await requireArchiveAuth(request, env);
  if (!authCheck.ok) return authCheck.response;

  await connectDb(env);
  const docs = await ServiceExecutionTransaction.find({
    userId: authCheck.auth.userId,
    status: "success",
    premiumStatus: "completed",
    reportId: { $exists: true, $ne: "" },
  })
    .sort({ completedAt: -1, updatedAt: -1, createdAt: -1 })
    .limit(120)
    .lean();

  const items = docs
    .map((doc) => toArchiveBase(doc))
    .filter((item) => item.reportId)
    .sort((a, b) => String(b.completedAt || b.updatedAt || "").localeCompare(String(a.completedAt || a.updatedAt || "")));

  return json({ ok: true, items });
}

async function handlePdfArchiveDetail(request, env, reportIdRaw) {
  const authCheck = await requireArchiveAuth(request, env);
  if (!authCheck.ok) return authCheck.response;

  const reportId = cleanText(reportIdRaw, 120);
  if (!reportId) {
    return failure(400, "MISSING_REPORT_ID", "reportId가 필요합니다.");
  }

  await connectDb(env);

  const foundAny = await ServiceExecutionTransaction.findOne({ reportId }).lean();
  if (foundAny && String(foundAny.userId || "") !== String(authCheck.auth.userId || "")) {
    return failure(403, "FORBIDDEN", "이 리포트를 열람할 권한이 없습니다.");
  }

  const doc = await ServiceExecutionTransaction.findOne({
    userId: authCheck.auth.userId,
    reportId,
    status: "success",
    premiumStatus: "completed",
  })
    .sort({ completedAt: -1, updatedAt: -1 })
    .lean();

  if (!doc) {
    return failure(404, "REPORT_NOT_FOUND", "저장된 PDF 결과를 찾을 수 없습니다.");
  }

  const report = toArchiveBase(doc);
  return json({ ok: true, report });
}

function failure(status, code, message, debugMessage, extras = {}, errorDetails) {
  return json({
    ok: false,
    ...extras,
    error: {
      code,
      message,
      ...(debugMessage ? { debugMessage: String(debugMessage).slice(0, 300) } : {}),
      ...(errorDetails && typeof errorDetails === "object" ? { details: errorDetails } : {}),
    },
  }, { status });
}

function buildRoutedRequest(request, targetPath, method, body) {
  const url = new URL(request.url);
  url.pathname = targetPath;

  const headers = new Headers(request.headers || {});
  const nextMethod = String(method || request.method || "GET").toUpperCase();

  const init = {
    method: nextMethod,
    headers,
  };

  if (body !== undefined && body !== null && nextMethod !== "GET") {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(body);
  }

  return new Request(url.toString(), init);
}

async function readPayloadSafe(response) {
  try {
    return await response.clone().json();
  } catch (e) {
    return {};
  }
}

function resolveRequestId(request, body) {
  const rawRequestId = String(
    body?.requestId
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key")
      || "",
  ).trim().slice(0, 120);

  if (rawRequestId) return rawRequestId;
  return `billing:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function shouldRetryCoinConsume(responseStatus, payload) {
  const status = Number(responseStatus || 0);
  if (status >= 500) return true;
  const code = String(toCode(payload) || "").trim().toUpperCase();
  return code === "SERVICE_UNAVAILABLE" || code === "WORKER_UNHANDLED_EXCEPTION";
}

function sleep(ms) {
  const delay = Number(ms);
  if (!Number.isFinite(delay) || delay <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function withTimeout(promise, timeoutMs, code = "BILLING_TIMEOUT") {
  const ms = Math.max(1000, Number(timeoutMs || 15000));
  let timer = null;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(`Billing operation timed out after ${ms}ms`);
          error.code = code;
          reject(error);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function shouldRetryCoinConsumeException(error) {
  const code = String(error?.code || "").trim().toUpperCase();
  return code === "COIN_GATE_CONSUME_TIMEOUT" || code === "WORKER_UNHANDLED_EXCEPTION";
}

function isProductionRuntime(env) {
  const nodeEnv = String(env?.NODE_ENV || "").trim().toLowerCase();
  if (nodeEnv === "production") return true;

  const appEnv = String(env?.APP_ENV || env?.DEPLOY_ENV || env?.ENVIRONMENT || "").trim().toLowerCase();
  return appEnv === "prod" || appEnv === "production";
}

function logCoinGateResult(payload) {
  try {
    console.log("[worker-billing-coin-gate]", JSON.stringify(payload));
  } catch (e) {
    console.log("[worker-billing-coin-gate]", payload);
  }
}

async function consumeCoinWithRetry(request, env, delegatedBody) {
  const maxAttempts = 2;
  const consumeTimeoutMs = Math.max(2000, Number(env?.BILLING_COIN_GATE_TIMEOUT_MS || env?.COIN_GATE_TIMEOUT_MS || 15000));
  let delegatedResponse = null;
  let payload = {};

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/consume", "POST", delegatedBody);
    try {
      delegatedResponse = await withTimeout(
        handleFortuneRoutes(delegatedRequest, env),
        consumeTimeoutMs,
        "COIN_GATE_CONSUME_TIMEOUT",
      );
      payload = await readPayloadSafe(delegatedResponse);
    } catch (error) {
      payload = {};
      if (attempt >= maxAttempts || !shouldRetryCoinConsumeException(error)) {
        throw error;
      }
      await sleep(120);
      continue;
    }

    if (delegatedResponse.ok) break;
    if (attempt >= maxAttempts) break;
    if (!shouldRetryCoinConsume(delegatedResponse.status, payload)) break;
    await sleep(120);
  }

  return { delegatedResponse, payload };
}

function mapCoinGateFailure(responseStatus, payload) {
  const rawCode = String(toCode(payload) || "").trim().toUpperCase();
  const message = toMessage(payload, "코인 결제 처리 중 오류가 발생했습니다.");

  if (rawCode === "SERVER_CONFIG_ERROR") {
    return {
      status: 500,
      code: "SERVER_CONFIG_ERROR",
      message: "서버 설정을 확인해 주세요.",
      debugMessage: message,
    };
  }

  if (
    responseStatus === 401
    || responseStatus === 403
    || rawCode === "AUTH_REQUIRED"
    || rawCode === "LOGIN_REQUIRED"
    || rawCode === "UNAUTHORIZED"
  ) {
    return {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "로그인이 필요합니다.",
      debugMessage: message,
    };
  }

  if (
    responseStatus === 402
    || rawCode === "INSUFFICIENT_BALANCE"
    || rawCode === "INSUFFICIENT_POINTS"
    || rawCode === "INSUFFICIENT_COINS"
  ) {
    return {
      status: 402,
      code: "PAYMENT_REQUIRED",
      message: "상품별 원화 단건 결제가 필요합니다.",
      debugMessage: message,
    };
  }

  if (
    responseStatus === 404
    || rawCode === "PRICE_NOT_FOUND"
    || rawCode === "SERVER_PRICE_REQUIRED"
    || rawCode === "UNKNOWN_FEATURE_KEY"
  ) {
    return {
      status: 404,
      code: "PRICE_NOT_FOUND",
      message: "요청한 기능의 서버 가격표를 찾을 수 없습니다.",
      debugMessage: message,
    };
  }

  if (responseStatus >= 500) {
    if (rawCode === "SERVICE_UNAVAILABLE") {
      return {
        status: 500,
        code: "SERVER_CONFIG_ERROR",
        message: "서버 설정을 확인해 주세요.",
        debugMessage: message,
      };
    }
    return {
      status: 500,
      code: "SERVER_ERROR",
      message: "서버 처리 중 오류가 발생했습니다.",
      debugMessage: message,
    };
  }

  return {
    status: 400,
    code: "SERVER_ERROR",
    message: "코인 결제 요청이 거부되었습니다.",
    debugMessage: message,
  };
}

function buildAccessDecision({
  pricing,
  authenticated,
  balance,
  unlockMap,
  subscription,
  usagePassMap,
} = {}) {
  const cost = Number(pricing?.cost || 0);
  const featureKey = String(pricing?.featureKey || "").trim();
  const currentBalance = Number(balance || 0);
  const unlocked = Boolean(featureKey && unlockMap && typeof unlockMap === "object" && unlockMap[featureKey]);
  const hasUsagePass = Boolean(featureKey && usagePassMap && typeof usagePassMap === "object" && usagePassMap[featureKey]);
  const subActive = Boolean(subscription?.isActive);
  const subFreeLimit = Number(subscription?.freeLimit || 0);

  if (!Number.isFinite(cost) || cost <= 0) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.FREE,
      requiredCoins: 0,
    };
  }

  if (!authenticated) {
    return {
      allowed: false,
      reason: ACCESS_DECISION_REASONS.AUTH_REQUIRED,
      requiredCoins: cost,
    };
  }

  if (unlocked) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.ALREADY_UNLOCKED,
      requiredCoins: cost,
    };
  }

  if (hasUsagePass) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.USAGE_PASS_ACTIVE,
      requiredCoins: cost,
    };
  }

  if (subActive && Number.isFinite(subFreeLimit) && cost <= subFreeLimit) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.SUBSCRIPTION_ACTIVE,
      requiredCoins: cost,
    };
  }

  return {
    allowed: false,
    reason: ACCESS_DECISION_REASONS.REQUIRES_PURCHASE,
    requiredCoins: cost,
  };
}

async function requireBillingAuth(request, env, pricing = {}) {
  const cost = Number(pricing?.cost || 0);
  const featureKey = String(pricing?.featureKey || "").trim();
  if (Number.isFinite(cost) && cost <= 0 && !featureKey) {
    return { ok: true, auth: null };
  }

  const auth = await getOptionalUserFromRequest(request, env);
  if (auth) {
    return { ok: true, auth };
  }

  return {
    ok: false,
    response: failure(401, "AUTH_REQUIRED", "로그인이 필요합니다."),
  };
}

function resolvePricingFromBody(body = {}) {
  return getBillingFeaturePricing({
    categoryKey: body?.categoryKey,
    subFeatureKey: body?.subFeatureKey,
    featureKey: body?.featureKey,
    reason: body?.reason,
    mode: body?.mode,
    reportMode: body?.reportMode,
  });
}

async function processCoinGateFromPricing(request, env, body, pricingResult) {
  const authCheck = await requireBillingAuth(request, env, pricingResult?.pricing || {});
  if (!authCheck.ok) return authCheck.response;

  const enabled = assertFeatureEnabled(pricingResult.pricing);
  if (!enabled.ok) {
    return failure(403, enabled.code || "FEATURE_DISABLED", enabled.message || "현재 이용할 수 없는 기능입니다.");
  }

  const requestId = resolveRequestId(request, body);
  const pricing = pricingResult.pricing;
  const forceDeductRaw = body?.forceDeduct;
  const forceDeduct = forceDeductRaw === undefined
    ? true
    : (forceDeductRaw === true || String(forceDeductRaw).toLowerCase() === "true");

  const reportId = String(body?.reportId || body?.accessGrant?.reportId || "").trim();
  const reportSessionId = String(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || (reportId ? `love-book:${reportId}` : requestId)).trim();

  if (authCheck?.auth?.userId) {
    const subscriptionPass = await getActiveMembershipPassForUser(env, authCheck.auth.userId);
    const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
    if (subscriptionPass.isActive && Number.isFinite(coinPrice) && coinPrice > 0 && coinPrice <= subscriptionPass.freeLimit) {
      return success({
        pricing,
        consume: {
          ok: true,
          transactionType: "membership_pass",
          accessType: "membership_pass",
          requestId,
          featureKey: String(pricing.featureKey || ""),
          coinPrice,
          chargedCoins: 0,
          membershipCreditCost: 0,
        },
        premiumAccessToken: null,
        accessGrant: {
          ok: true,
          accessType: "membership_pass",
          featureKey: String(pricing.featureKey || ""),
          sessionId: reportSessionId || undefined,
          requestId,
          purchaseId: requestId,
          evidenceId: `membership:${subscriptionPass.tier}:${requestId}`,
          reportId: reportId || undefined,
          paidAt: new Date().toISOString(),
        },
        balance: null,
        membershipPass: {
          tier: subscriptionPass.tier,
          freeLimit: subscriptionPass.freeLimit,
        },
        user: {
          id: String(authCheck.auth.userId || ""),
          profileSubscription: subscriptionPass.profileSubscription || null,
        },
      }, "이용권 무료 한도 조건으로 서비스를 열었습니다.");
    }

    try {
      const membershipConsume = await consumeMembershipCreditIfAvailable(env, authCheck.auth.userId, pricing, requestId, {
        ...body,
        reportId,
        sessionId: reportSessionId,
        reportSessionId,
      });
      if (membershipConsume) {
        return success({
          pricing,
          consume: {
            ok: true,
            transactionType: "membership_credit",
            accessType: "membership_credit",
            requestId,
            featureKey: String(pricing.featureKey || ""),
            coinPrice: membershipConsume.coinPrice,
            membershipCreditCost: membershipConsume.membershipCreditCost,
            remainingMembershipCredit: membershipConsume.remainingMembershipCredit,
          },
          premiumAccessToken: null,
          accessGrant: {
            ok: true,
            accessType: "membership_credit",
            featureKey: String(pricing.featureKey || ""),
            sessionId: reportSessionId || undefined,
            requestId,
            purchaseId: requestId,
            evidenceId: membershipConsume.transactionId || "",
            reportId: reportId || undefined,
            paidAt: new Date().toISOString(),
          },
          balance: Number(membershipConsume?.user?.points || 0),
          membershipCreditBalance: membershipConsume.remainingMembershipCredit,
          user: membershipConsume.user,
        }, "월정석 크레딧으로 콘텐츠 이용 권한을 발급했습니다.");
      }
    } catch (error) {
      logBillingRouteError("membership-credit-consume", error, request, {
        featureKey: String(pricing?.featureKey || ""),
        requestId,
      });
      return failure(
        500,
        "MEMBERSHIP_CREDIT_CONSUME_FAILED",
        "월정석 크레딧 처리 중 오류가 발생했습니다.",
        String(error?.message || ""),
      );
    }

    const usagePassConsume = await consumeUsagePassIfAvailable(env, authCheck.auth.userId, pricing, requestId);
    if (usagePassConsume) {
      return success({
        pricing,
        consume: {
          ok: true,
          transactionType: "usage_pass",
          requestId,
          featureKey: String(pricing.featureKey || ""),
          category: usagePassConsume.category,
          remainingUses: usagePassConsume.remainingUses,
        },
        premiumAccessToken: null,
        accessGrant: {
          ok: true,
          featureKey: String(pricing.featureKey || ""),
          sessionId: reportSessionId || undefined,
          requestId,
          reportId: reportId || undefined,
          paidAt: new Date().toISOString(),
        },
        balance: Number(usagePassConsume?.user?.points || 0),
        user: usagePassConsume.user,
      }, "이용권 회차를 사용해 서비스를 열었습니다.");
    }
  }

  return failure(402, "PAYMENT_REQUIRED", "상품별 원화 단건 결제가 필요합니다.", undefined, {
    pricing,
    accessGrant: null,
    balance: null,
    checkout: {
      endpoint: "/api/billing/checkout",
      payload: {
        paymentType: "digital_content",
        featureKey: String(pricing.featureKey || ""),
        reason: String(pricing.reason || ""),
        categoryKey: pricing.categoryKey,
        subFeatureKey: pricing.subFeatureKey,
        paymentAmount: Number(pricing.amountKRW || pricing.cashPrice || 0),
        coinPrice: Number(pricing.coinPrice || pricing.cost || 0),
        membershipCreditCost: Number(pricing.membershipCreditCost || calculateMembershipCreditCost(pricing.coinPrice || pricing.cost || 0)),
        requestId,
        reportId: reportId || undefined,
        sessionId: reportSessionId || undefined,
      },
    },
  });

  const delegatedBody = {
    cost: Number(pricing.cost),
    reason: String(pricing.reason),
    featureKey: String(pricing.featureKey),
    requestId,
    forceDeduct,
    categoryKey: pricing.categoryKey,
    subFeatureKey: pricing.subFeatureKey,
    payloadHash: String(body?.payloadHash || "").trim().slice(0, 120),
    reportId: reportId || undefined,
    sessionId: reportSessionId || undefined,
    reportSessionId: reportSessionId || undefined,
  };

  if (body?.productId) {
    delegatedBody.productId = String(body.productId).trim().toLowerCase();
  }

  let delegatedResponse = null;
  let payload = {};
  try {
    const consumeResult = await consumeCoinWithRetry(request, env, delegatedBody);
    delegatedResponse = consumeResult.delegatedResponse;
    payload = consumeResult.payload;
  } catch (error) {
    logBillingRouteError("coin-gate-consume", error, request, {
      featureKey: String(pricing?.featureKey || ""),
      requestId,
    });
    return failure(
      500,
      "SERVER_ERROR",
      "코인 결제 처리 중 오류가 발생했습니다.",
      String(error?.message || ""),
      {},
      buildBillingErrorDetails("coin-gate-consume", error, { featureKey: String(pricing?.featureKey || "") }),
    );
  }

  if (!delegatedResponse.ok) {
    const mapped = mapCoinGateFailure(delegatedResponse.status, payload);
    logCoinGateResult({
      status: "failed",
      requestId,
      featureKey: String(pricing?.featureKey || ""),
      responseStatus: Number(delegatedResponse.status || 0),
      code: mapped.code,
      delegatedCode: String(toCode(payload) || ""),
      hasPremiumAccessToken: Boolean(String(payload?.premiumAccessToken || "").trim()),
      transactionId: String(payload?.transactionId || ""),
    });
    return failure(mapped.status, mapped.code, mapped.message, mapped.debugMessage);
  }

  const balance = Number(payload?.user?.points ?? payload?.balance ?? 0);
  const premiumAccessToken = String(
    payload?.premiumAccessToken
    || payload?.data?.premiumAccessToken
    || "",
  ).trim();
  const responseHeaders = new Headers();
  const delegatedCookie = String(delegatedResponse.headers?.get("set-cookie") || "").trim();
  if (delegatedCookie) responseHeaders.append("Set-Cookie", delegatedCookie);
  if (premiumAccessToken) {
    responseHeaders.append("Set-Cookie", buildPremiumAccessCookie(premiumAccessToken, isProductionRuntime(env)));
  }

  logCoinGateResult({
    status: "ok",
    requestId,
    featureKey: String(pricing?.featureKey || ""),
    responseStatus: Number(delegatedResponse.status || 200),
    hasPremiumAccessToken: Boolean(premiumAccessToken),
    transactionId: String(payload?.transactionId || ""),
    chargedCoins: Number(payload?.chargedCoins || payload?.delta || payload?.deductedAmount || 0),
    balance: Number.isFinite(balance) ? balance : null,
  });

  const requestedFeatureKey = String(body?.featureKey || pricing?.featureKey || "").trim() || String(pricing?.featureKey || "").trim();
  const purchaseId = String(payload?.transactionId || payload?.data?.transactionId || "").trim();
  const accessGrant = requestedFeatureKey && purchaseId
    ? {
      ok: true,
      featureKey: requestedFeatureKey,
      sessionId: reportSessionId || undefined,
      purchaseId: purchaseId || undefined,
      requestId: requestId || undefined,
      reportId: reportId || undefined,
      paidAt: new Date().toISOString(),
    }
    : null;

  return success({
    pricing,
    consume: payload,
    premiumAccessToken: premiumAccessToken || null,
    accessGrant,
    balance: Number.isFinite(balance) ? balance : null,
    user: payload?.user || null,
  }, toMessage(payload, "코인 결제가 완료되었습니다."), {
    headers: responseHeaders,
  });
}

async function handleFeatures(request) {
  const url = new URL(request.url);
  const categoryKey = String(url.searchParams.get("categoryKey") || "").trim();
  const subFeatureKey = String(url.searchParams.get("subFeatureKey") || "").trim();
  const featureKey = String(url.searchParams.get("featureKey") || "").trim();
  const reason = String(url.searchParams.get("reason") || "").trim();

  if (categoryKey || subFeatureKey || featureKey || reason) {
    const resolved = getBillingFeaturePricing({ categoryKey, subFeatureKey, featureKey, reason });
    if (!resolved.ok) {
      return failure(404, "PRICE_NOT_FOUND", resolved.message || "가격 정보를 찾을 수 없습니다.");
    }

    return success({ pricing: resolved.pricing, source: resolved.source }, "기능 가격 정보를 조회했습니다.");
  }

  return success(listBillingFeatures(), "서버 기능 가격표를 조회했습니다.");
}

async function handleBalance(request, env) {
  let delegatedResponse = null;
  let payload = {};
  try {
    const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/balance", "GET");
    delegatedResponse = await handleFortuneRoutes(delegatedRequest, env);
    payload = await readPayloadSafe(delegatedResponse);
  } catch (error) {
    logBillingRouteError("balance-delegate-fortune", error, request);
    return success({
      authenticated: false,
      balance: 0,
      user: null,
      unlockedFeatures: [],
      unlockMap: {},
      degraded: true,
      error: {
        code: "SERVER_ERROR",
        message: "서버 처리 중 오류가 발생했습니다.",
        errorDetails: buildBillingErrorDetails("balance-delegate-fortune", error),
      },
    }, "잔액 정보를 일시적으로 불러오지 못해 기본값으로 응답합니다.");
  }

  if (!delegatedResponse.ok) {
    const mapped = mapCoinGateFailure(delegatedResponse.status, payload);
    const authRequired = mapped.status === 401 || mapped.code === "AUTH_REQUIRED";

    if (authRequired) {
      return success({
        authenticated: false,
        balance: 0,
        user: null,
        unlockedFeatures: [],
        unlockMap: {},
        degraded: false,
      }, "로그인이 필요하여 기본 잔액 상태로 응답합니다.");
    }

    return success({
      authenticated: false,
      balance: 0,
      user: null,
      unlockedFeatures: [],
      unlockMap: {},
      degraded: true,
      error: {
        code: mapped.code,
        message: mapped.message,
      },
    }, "잔액 정보를 일시적으로 불러오지 못해 기본값으로 응답합니다.");
  }

  const balance = Number(payload?.user?.points ?? payload?.balance ?? 0);
  let membershipCreditBalance = 0;
  let membership = null;
  try {
    const auth = await getOptionalUserFromRequest(request, env);
    if (auth?.userId) {
      await connectDb(env);
      await seedMembershipCreditForExistingPassIfNeeded(auth.userId);
      const user = await User.findById(auth.userId).select("profileSubscription points").lean();
      const sub = user?.profileSubscription || {};
      membershipCreditBalance = Number(sub?.membershipCreditBalance || 0);
      membership = {
        tier: String(sub?.tier || "free"),
        isActive: isActiveMembership(sub),
        expiresAt: sub?.expiresAt || null,
        membershipCreditBalance,
        membershipCreditGranted: Number(sub?.membershipCreditGranted || 0),
        membershipCreditUsed: Number(sub?.membershipCreditUsed || 0),
        legacyCoinCreditSeeded: Boolean(sub?.legacyCoinCreditSeeded),
        legacyCoinCreditSeededPoints: Number(sub?.legacyCoinCreditSeededPoints || 0),
        legacyCoinBalance: Number(user?.points || 0),
      };
    }
  } catch (_) {
    membership = null;
  }

  return success({
    authenticated: Boolean(payload?.authenticated),
    balance: Number.isFinite(balance) ? balance : 0,
    legacyCoinBalance: Number.isFinite(balance) ? balance : 0,
    membershipCreditBalance,
    membership,
    user: payload?.user || null,
    unlockedFeatures: Array.isArray(payload?.unlockedFeatures) ? payload.unlockedFeatures : [],
    unlockMap: payload?.unlockMap && typeof payload.unlockMap === "object" ? payload.unlockMap : {},
    raw: payload,
  }, "코인 잔액을 조회했습니다.");
}

async function readSubscriptionStatusSnapshot(request, env) {
  try {
    const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/profile-subscription/status", "GET");
    const delegatedResponse = await handleFortuneRoutes(delegatedRequest, env);
    if (!delegatedResponse.ok) {
      return { isActive: false, tier: "free", freeLimit: 0 };
    }
    const payload = await readPayloadSafe(delegatedResponse);
    return {
      isActive: Boolean(payload?.isActive),
      tier: String(payload?.tier || "free"),
      freeLimit: Number(payload?.freeLimit || 0),
    };
  } catch (_) {
    return { isActive: false, tier: "free", freeLimit: 0 };
  }
}

async function handleUnlockStatus(request, env) {
  const url = new URL(request.url);
  const categoryKey = String(url.searchParams.get("categoryKey") || "").trim();
  const subFeatureKey = String(url.searchParams.get("subFeatureKey") || "").trim();
  const featureKey = String(url.searchParams.get("featureKey") || "").trim();
  const reason = String(url.searchParams.get("reason") || "").trim();

  const pricingResult = getBillingFeaturePricing({ categoryKey, subFeatureKey, featureKey, reason });
  if (!pricingResult.ok) {
    return failure(404, "PRICE_NOT_FOUND", pricingResult.message || "가격 정보를 찾을 수 없습니다.");
  }

  const balanceResponse = await handleBalance(request, env);
  const balancePayload = await readPayloadSafe(balanceResponse);

  if (!balancePayload?.ok) {
    return balanceResponse;
  }

  const data = balancePayload.data || {};
  const unlockMap = data.unlockMap && typeof data.unlockMap === "object" ? data.unlockMap : {};
  const pricing = pricingResult.pricing;
  const unlocked = Boolean(unlockMap[pricing.featureKey]);
  const currentBalance = Number(data.balance || 0);
  const subscription = await readSubscriptionStatusSnapshot(request, env);

  const access = buildAccessDecision({
    pricing,
    authenticated: Boolean(data.authenticated),
    balance: currentBalance,
    unlockMap,
    subscription,
  });

  return success({
    pricing,
    unlocked,
    accessReason: access.reason,
    subscriptionTier: subscription.tier,
    freeLimit: Number(subscription.freeLimit || 0),
    freeBySubscription: access.reason === ACCESS_DECISION_REASONS.SUBSCRIPTION_ACTIVE,
    currentBalance,
    requiredCoins: access.reason === ACCESS_DECISION_REASONS.SUBSCRIPTION_ACTIVE ? 0 : Number(pricing.cost || 0),
    canAccess: Boolean(access.allowed),
  }, "기능 접근 상태를 조회했습니다.");
}

async function handleCoinGate(request, env) {
  const body = await readJson(request);
  const pricingResult = resolvePricingFromBody(body);

  if (!pricingResult.ok) {
    return failure(404, "PRICE_NOT_FOUND", pricingResult.message || "가격 정보를 찾을 수 없습니다.");
  }

  return processCoinGateFromPricing(request, env, body, pricingResult);
}

async function handleLegacyPurchaseOrCharge(request, env) {
  const body = await readJson(request);
  const pricingResult = resolvePricingFromBody(body);

  if (!pricingResult.ok) {
    return failure(
      400,
      "UNKNOWN_FEATURE_KEY",
      "결제 상품 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      undefined,
      {
        featureKey: String(body?.featureKey || "").trim() || undefined,
      },
    );
  }

  return processCoinGateFromPricing(request, env, body, pricingResult);
}

async function handleLegacyRefund(request, env) {
  const authCheck = await requireBillingAuth(request, env, { cost: 1 });
  if (!authCheck.ok) return authCheck.response;

  const body = await readJson(request);
  let delegatedResponse = null;
  let payload = {};
  try {
    const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/refund", "POST", body);
    delegatedResponse = await handleFortuneRoutes(delegatedRequest, env);
    payload = await readPayloadSafe(delegatedResponse);
  } catch (error) {
    logBillingRouteError("refund-delegate-fortune", error, request);
    return failure(
      500,
      "SERVER_ERROR",
      "환불 처리 중 서버 오류가 발생했습니다.",
      String(error?.message || ""),
      {},
      buildBillingErrorDetails("refund-delegate-fortune", error),
    );
  }

  if (!delegatedResponse.ok) {
    const mapped = mapCoinGateFailure(delegatedResponse.status, payload);
    return failure(mapped.status, mapped.code, mapped.message, mapped.debugMessage);
  }

  return success(payload, toMessage(payload, "환불 요청이 처리되었습니다."));
}

async function delegateToPayments(request, env, targetPath, body) {
  let delegatedResponse = null;
  let payload = {};
  try {
    const delegatedRequest = buildRoutedRequest(request, targetPath, "POST", body);
    delegatedResponse = await handlePaymentRoutes(delegatedRequest, env);
    payload = await readPayloadSafe(delegatedResponse);
  } catch (error) {
    logBillingRouteError("delegate-to-payments", error, request, { targetPath });
    return failure(
      500,
      "SERVER_ERROR",
      "결제 서버 처리 중 오류가 발생했습니다.",
      String(error?.message || ""),
      {},
      buildBillingErrorDetails("delegate-to-payments", error, { targetPath }),
    );
  }

  if (!delegatedResponse.ok) {
    const code = delegatedResponse.status === 401 || delegatedResponse.status === 403 ? "AUTH_REQUIRED" : "SERVER_ERROR";
    return failure(
      delegatedResponse.status,
      code,
      delegatedResponse.status >= 500 ? "서버 결제 처리 중 오류가 발생했습니다." : "결제 요청이 거부되었습니다.",
      toMessage(payload, "결제 요청 실패"),
    );
  }

  return success(payload, toMessage(payload, "결제 요청이 성공했습니다."));
}

async function handleCheckout(request, env) {
  const body = await readJson(request);
  const isSubscription = Boolean(body?.subscriptionTier) || String(body?.paymentType || "").toLowerCase() === "subscription";
  const targetPath = isSubscription ? "/api/payments/subscription/prepare" : "/api/payments/prepare";
  return delegateToPayments(request, env, targetPath, body);
}

async function handleConfirm(request, env) {
  const body = await readJson(request);
  const isSubscription = Boolean(body?.subscriptionTier) || String(body?.paymentType || "").toLowerCase() === "subscription";
  const targetPath = isSubscription ? "/api/payments/subscription/confirm" : "/api/payments/confirm";
  return delegateToPayments(request, env, targetPath, body);
}

async function runServiceExecutionAction(request, env, action) {
  const authCheck = await requireBillingAuth(request, env, { cost: 1 });
  if (!authCheck.ok) return authCheck.response;

  const body = await readJson(request);
  let result;
  if (action === "start") {
    result = await startServiceExecution(env, authCheck.auth.userId, body);
  } else if (action === "heartbeat") {
    result = await heartbeatServiceExecution(env, authCheck.auth.userId, body);
  } else if (action === "complete") {
    result = await completeServiceExecution(env, authCheck.auth.userId, body);
  } else if (action === "fail") {
    result = await failServiceExecution(env, authCheck.auth.userId, body);
  } else {
    return failure(400, "INVALID_EXECUTION_ACTION", "지원하지 않는 실행 액션입니다.");
  }

  if (!result?.ok) {
    return failure(
      Number(result?.status || 400),
      "SERVICE_EXECUTION_ERROR",
      String(result?.message || "서비스 실행 상태를 처리하지 못했습니다."),
    );
  }

  return success({
    idempotent: Boolean(result.idempotent),
    execution: result.execution || null,
    settlement: result.settlement || null,
  }, "서비스 실행 상태가 반영되었습니다.", { status: Number(result.status || 200) });
}

async function getServiceExecutionStatus(request, env) {
  const authCheck = await requireBillingAuth(request, env, { cost: 1 });
  if (!authCheck.ok) return authCheck.response;

  const url = new URL(request.url);
  const result = await getServiceExecution(env, authCheck.auth.userId, {
    executionKey: String(url.searchParams.get("executionKey") || "").trim(),
    requestId: String(url.searchParams.get("requestId") || "").trim(),
    sessionId: String(url.searchParams.get("sessionId") || "").trim(),
    reportId: String(url.searchParams.get("reportId") || "").trim(),
  });

  if (!result?.ok) {
    return failure(
      Number(result?.status || 400),
      "SERVICE_EXECUTION_NOT_FOUND",
      String(result?.message || "서비스 실행 상태를 찾을 수 없습니다."),
    );
  }

  return success({ execution: result.execution || null }, "서비스 실행 상태를 조회했습니다.");
}

export async function handleBillingRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/billing");
  const trace = {
    route: "billing",
    requestPath: new URL(request.url).pathname,
    method,
  };

  try {
    if (method === "GET" && path === "/features") return await handleFeatures(request);
    if (method === "GET" && path === "/balance") return await handleBalance(request, env);
    if (method === "GET" && path === "/unlock-status") return await handleUnlockStatus(request, env);

    if (method === "POST" && path === "/coin-gate") return await handleCoinGate(request, env);
    if (method === "POST" && (path === "/purchase" || path === "/charge")) return await handleLegacyPurchaseOrCharge(request, env);
    if (method === "POST" && path === "/refund") return await handleLegacyRefund(request, env);
    if (method === "POST" && path === "/checkout") return await handleCheckout(request, env);
    if (method === "POST" && path === "/confirm") return await handleConfirm(request, env);
    if (method === "POST" && path === "/executions/start") return await runServiceExecutionAction(request, env, "start");
    if (method === "POST" && path === "/executions/heartbeat") return await runServiceExecutionAction(request, env, "heartbeat");
    if (method === "POST" && path === "/executions/complete") return await runServiceExecutionAction(request, env, "complete");
    if (method === "POST" && path === "/executions/fail") return await runServiceExecutionAction(request, env, "fail");
    if (method === "GET" && path === "/executions/status") return await getServiceExecutionStatus(request, env);
    if (method === "GET" && path === "/pdf-archive") return await handlePdfArchiveList(request, env);
    if (method === "GET" && path.startsWith("/pdf-archive/")) {
      const reportId = cleanText(path.slice("/pdf-archive/".length), 120);
      return await handlePdfArchiveDetail(request, env, reportId);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    logBillingRouteError("handle-billing-routes", error, request);
    return handleRouteError(error, { request, env, trace });
  }
}

export const __billingTestUtils = {
  ACCESS_DECISION_REASONS,
  buildAccessDecision,
  requireBillingAuth,
};
