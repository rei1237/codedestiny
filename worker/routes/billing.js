import {
  getRoutePath,
  handleRouteError,
  json,
  logApiCatchDiagnostic,
  methodNotAllowed,
  notFound,
  readJson,
} from "../lib/http.js";
import { handleFortuneRoutes } from "./fortune.js";
import { handlePaymentRoutes } from "./payments.js";
import { requireUser } from "../lib/auth.js";
import {
  assertFeatureEnabled,
  getBillingFeaturePricing,
  listBillingFeatures,
} from "../lib/billing-feature-registry.js";

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

function success(data, message = "요청이 성공했습니다.") {
  return json({ ok: true, data, message });
}

const ACCESS_DECISION_REASONS = Object.freeze({
  FREE: "free",
  ALREADY_UNLOCKED: "already_unlocked",
  SUBSCRIPTION_ACTIVE: "subscription_active",
  REQUIRES_PURCHASE: "requires_purchase",
  INSUFFICIENT_COINS: "insufficient_coins",
  AUTH_REQUIRED: "auth_required",
  FEATURE_DISABLED: "feature_disabled",
});

function failure(status, code, message, debugMessage, extras = {}) {
  return json({
    ok: false,
    ...extras,
    error: {
      code,
      message,
      ...(debugMessage ? { debugMessage: String(debugMessage).slice(0, 300) } : {}),
    },
  }, { status });
}

function hasMongoBinding(env = {}) {
  return Boolean(String(env?.MONGO_URI || env?.MONGODB_URI || "").trim());
}

function featureKeyFailure(featureKey, message, debugMessage) {
  return failure(
    400,
    "UNKNOWN_FEATURE_KEY",
    message || "서버 가격표에 정의되지 않은 기능입니다.",
    debugMessage,
    { featureKey: String(featureKey || "").trim() },
  );
}

function requestHasCookie(request, cookieName) {
  const cookieHeader = String(request.headers.get("cookie") || "");
  if (!cookieHeader) return false;
  return new RegExp(`(?:^|;\\s*)${cookieName}=`).test(cookieHeader);
}

function logBillingDiagnostic(event, request, details = {}) {
  const payload = {
    event,
    requestPath: (() => {
      try {
        return new URL(request.url).pathname;
      } catch {
        return "";
      }
    })(),
    method: String(request.method || ""),
    authCookiePresent: requestHasCookie(request, "fortune_auth_token"),
    refreshCookiePresent: requestHasCookie(request, "fortune_auth_refresh"),
    authorizationHeaderPresent: Boolean(request.headers.get("authorization")),
    ...details,
  };

  try {
    console.info("[billing-diagnostic]", JSON.stringify(payload));
  } catch {
    console.info("[billing-diagnostic]", payload);
  }
}

async function requireBillingAuth(request, env, context = {}) {
  try {
    const resolved = await requireUser(request, env);
    logBillingDiagnostic("auth_ok", request, {
      featureKey: String(context.featureKey || ""),
      userIdPresent: Boolean(resolved?.userId),
    });
    return { ok: true, user: resolved };
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status === 401 || status === 403) {
      logBillingDiagnostic("auth_required", request, {
        featureKey: String(context.featureKey || ""),
        userIdPresent: false,
        errorCode: String(error?.payload?.code || error?.code || "AUTH_REQUIRED"),
      });
      return {
        ok: false,
        response: failure(401, "AUTH_REQUIRED", "로그인이 필요합니다.", "인증 쿠키가 없거나 서버 세션 검증에 실패했습니다."),
      };
    }
    throw error;
  }
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
  } catch {
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

function mapCoinGateFailure(responseStatus, payload) {
  const rawCode = String(toCode(payload) || "").trim().toUpperCase();
  const message = toMessage(payload, "코인 결제 처리 중 오류가 발생했습니다.");

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
      code: "INSUFFICIENT_COINS",
      message: "코인이 부족합니다.",
      debugMessage: message,
    };
  }

  if (
    rawCode === "UNKNOWN_FEATURE_KEY"
  ) {
    return {
      status: 400,
      code: "UNKNOWN_FEATURE_KEY",
      message: "서버 가격표에 정의되지 않은 기능입니다.",
      debugMessage: message,
    };
  }

  if (
    responseStatus === 404
    || rawCode === "PRICE_NOT_FOUND"
    || rawCode === "SERVER_PRICE_REQUIRED"
  ) {
    return {
      status: 404,
      code: "PRICE_NOT_FOUND",
      message: "요청한 기능의 서버 가격표를 찾을 수 없습니다.",
      debugMessage: message,
    };
  }

  if (rawCode === "SERVER_CONFIG_ERROR" || rawCode === "DB_QUERY_FAILED") {
    return {
      status: 500,
      code: rawCode,
      message: "서버 설정 또는 데이터 조회 중 오류가 발생했습니다.",
      debugMessage: message,
    };
  }

  if (
    responseStatus === 503
    || rawCode === "SERVICE_UNAVAILABLE"
    || rawCode === "COIN_STORAGE_UNAVAILABLE"
  ) {
    return {
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "코인 결제 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
      debugMessage: message,
    };
  }

  if (responseStatus >= 500) {
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

async function handleFeatures(request) {
  const url = new URL(request.url);
  const categoryKey = String(url.searchParams.get("categoryKey") || "").trim();
  const subFeatureKey = String(url.searchParams.get("subFeatureKey") || "").trim();
  const featureKey = String(url.searchParams.get("featureKey") || "").trim();
  const reason = String(url.searchParams.get("reason") || "").trim();

  if (categoryKey || subFeatureKey || featureKey || reason) {
    const resolved = getBillingFeaturePricing({ categoryKey, subFeatureKey, featureKey, reason });
    if (!resolved.ok) {
      return featureKeyFailure(featureKey, "서버 가격표에 정의되지 않은 기능입니다.", resolved.message || "가격 정보를 찾을 수 없습니다.");
    }

    return success({ pricing: resolved.pricing, source: resolved.source }, "기능 가격 정보를 조회했습니다.");
  }

  return success(listBillingFeatures(), "서버 기능 가격표를 조회했습니다.");
}

async function handleBalance(request, env) {
  const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/balance", "GET");
  const delegatedResponse = await handleFortuneRoutes(delegatedRequest, env);
  const payload = await readPayloadSafe(delegatedResponse);

  if (!delegatedResponse.ok) {
    const mapped = mapCoinGateFailure(delegatedResponse.status, payload);
    return failure(mapped.status, mapped.code, mapped.message, mapped.debugMessage);
  }

  const balance = Number(payload?.user?.points ?? payload?.balance ?? 0);
  return success({
    authenticated: Boolean(payload?.authenticated),
    balance: Number.isFinite(balance) ? balance : 0,
    user: payload?.user || null,
    unlockedFeatures: Array.isArray(payload?.unlockedFeatures) ? payload.unlockedFeatures : [],
    unlockMap: payload?.unlockMap && typeof payload.unlockMap === "object" ? payload.unlockMap : {},
    raw: payload,
  }, "코인 잔액을 조회했습니다.");
}

function extractBalanceData(payload) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const unlockMap = data.unlockMap && typeof data.unlockMap === "object" ? data.unlockMap : {};
  const unlockedFeatures = Array.isArray(data.unlockedFeatures) ? data.unlockedFeatures : [];
  const balance = Number(data.balance || 0);
  return {
    authenticated: Boolean(data.authenticated),
    balance: Number.isFinite(balance) ? balance : 0,
    unlockMap,
    unlockedFeatures,
    user: data.user || null,
  };
}

async function handleSubscriptionMe(request, env) {
  const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/profile-subscription/status", "GET");
  const delegatedResponse = await handleFortuneRoutes(delegatedRequest, env);
  const payload = await readPayloadSafe(delegatedResponse);

  if (!delegatedResponse.ok) {
    const mapped = mapCoinGateFailure(delegatedResponse.status, payload);
    return failure(mapped.status, mapped.code, mapped.message, mapped.debugMessage);
  }

  return success({
    tier: String(payload?.tier || payload?.plan || "free"),
    isActive: Boolean(payload?.isActive || payload?.isSubscribed),
    expiresAt: payload?.expiresAt || null,
    freeLimit: Number(payload?.freeLimit || 0),
    profileLimit: Number(payload?.profileLimit || 1),
    source: String(payload?.source || "coin"),
    raw: payload,
  }, "구독 상태를 조회했습니다.");
}

function buildAccessDecision({
  pricing,
  authenticated,
  balance,
  unlockMap,
  subscription,
}) {
  const featureKey = String(pricing?.featureKey || "");
  const priceCoins = Number(pricing?.cost || 0);
  const isActiveSubscription = Boolean(subscription?.isActive);
  const subscriptionFreeLimit = Number(subscription?.freeLimit || 0);
  const isUnlocked = Boolean(featureKey && unlockMap && unlockMap[featureKey] === true);

  if (!featureKey || !Number.isFinite(priceCoins) || priceCoins < 0) {
    return {
      allowed: false,
      reason: ACCESS_DECISION_REASONS.FEATURE_DISABLED,
      featureKey,
    };
  }

  if (priceCoins <= 0) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.FREE,
      featureKey,
      priceCoins,
      coinBalance: Number.isFinite(balance) ? balance : 0,
    };
  }

  if (!authenticated) {
    return {
      allowed: false,
      reason: ACCESS_DECISION_REASONS.AUTH_REQUIRED,
      featureKey,
      priceCoins,
      coinBalance: Number.isFinite(balance) ? balance : 0,
    };
  }

  if (isUnlocked) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.ALREADY_UNLOCKED,
      featureKey,
      priceCoins,
      coinBalance: Number.isFinite(balance) ? balance : 0,
    };
  }

  if (isActiveSubscription && subscriptionFreeLimit > 0 && priceCoins <= subscriptionFreeLimit) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.SUBSCRIPTION_ACTIVE,
      featureKey,
      priceCoins,
      coinBalance: Number.isFinite(balance) ? balance : 0,
    };
  }

  if (Number(balance) < priceCoins) {
    return {
      allowed: false,
      reason: ACCESS_DECISION_REASONS.INSUFFICIENT_COINS,
      featureKey,
      priceCoins,
      coinBalance: Number.isFinite(balance) ? balance : 0,
    };
  }

  return {
    allowed: false,
    reason: ACCESS_DECISION_REASONS.REQUIRES_PURCHASE,
    featureKey,
    priceCoins,
    coinBalance: Number.isFinite(balance) ? balance : 0,
  };
}

async function resolveAccessDecision(request, env, pricingInput) {
  const pricingResult = pricingInput || getBillingFeaturePricing({
    categoryKey: new URL(request.url).searchParams.get("categoryKey"),
    subFeatureKey: new URL(request.url).searchParams.get("subFeatureKey"),
    featureKey: new URL(request.url).searchParams.get("featureKey"),
    reason: new URL(request.url).searchParams.get("reason"),
  });

  if (!pricingResult?.ok) {
    return {
      ok: false,
      response: featureKeyFailure(
        new URL(request.url).searchParams.get("featureKey"),
        "서버 가격표에 정의되지 않은 기능입니다.",
        pricingResult?.message || "가격 정보를 찾을 수 없습니다.",
      ),
    };
  }

  const enabled = assertFeatureEnabled(pricingResult.pricing);
  if (!enabled.ok) {
    return {
      ok: false,
      response: failure(403, enabled.code || "FEATURE_DISABLED", enabled.message || "현재 이용할 수 없는 기능입니다."),
    };
  }

  const [balanceResponse, subscriptionResponse] = await Promise.all([
    handleBalance(request, env),
    handleSubscriptionMe(request, env),
  ]);

  const balancePayload = await readPayloadSafe(balanceResponse);
  const subscriptionPayload = await readPayloadSafe(subscriptionResponse);

  if (!balancePayload?.ok) {
    const mappedCode = String(balancePayload?.error?.code || "").toUpperCase();
    if (mappedCode === "AUTH_REQUIRED") {
      const decision = {
        allowed: false,
        reason: ACCESS_DECISION_REASONS.AUTH_REQUIRED,
        featureKey: String(pricingResult.pricing.featureKey || ""),
        priceCoins: Number(pricingResult.pricing.cost || 0),
      };
      return {
        ok: true,
        decision,
        pricing: pricingResult.pricing,
        context: {
          authenticated: false,
          balance: 0,
          unlockMap: {},
          unlockedFeatures: [],
          subscription: { isActive: false, freeLimit: 0, tier: "free" },
        },
      };
    }
    return { ok: false, response: balanceResponse };
  }

  const balanceData = extractBalanceData(balancePayload);
  const subscriptionData = subscriptionPayload?.ok
    ? {
      isActive: Boolean(subscriptionPayload?.data?.isActive),
      freeLimit: Number(subscriptionPayload?.data?.freeLimit || 0),
      tier: String(subscriptionPayload?.data?.tier || "free"),
    }
    : { isActive: false, freeLimit: 0, tier: "free" };

  const decision = buildAccessDecision({
    pricing: pricingResult.pricing,
    authenticated: balanceData.authenticated,
    balance: balanceData.balance,
    unlockMap: balanceData.unlockMap,
    subscription: subscriptionData,
  });

  return {
    ok: true,
    decision,
    pricing: pricingResult.pricing,
    context: {
      authenticated: balanceData.authenticated,
      balance: balanceData.balance,
      unlockMap: balanceData.unlockMap,
      unlockedFeatures: balanceData.unlockedFeatures,
      subscription: subscriptionData,
    },
  };
}

async function handlePrices(request) {
  return handleFeatures(request);
}

async function handleMe(request, env) {
  const [balanceResponse, paymentsResponse] = await Promise.all([
    handleBalance(request, env),
    handlePaymentRoutes(buildRoutedRequest(request, "/api/payments/me", "GET"), env),
  ]);

  const balancePayload = await readPayloadSafe(balanceResponse);
  if (!balancePayload?.ok) return balanceResponse;

  const paymentsPayload = await readPayloadSafe(paymentsResponse);
  const balanceData = extractBalanceData(balancePayload);

  const dataSection = paymentsPayload?.data && typeof paymentsPayload.data === "object"
    ? paymentsPayload.data
    : {};

  return success({
    authenticated: balanceData.authenticated,
    balance: balanceData.balance,
    user: balanceData.user,
    unlockedFeatures: balanceData.unlockedFeatures,
    unlockMap: balanceData.unlockMap,
    transactions: Array.isArray(dataSection.transactions) ? dataSection.transactions : [],
    payments: Array.isArray(dataSection.payments) ? dataSection.payments : [],
    subscriptions: Array.isArray(dataSection.subscriptions) ? dataSection.subscriptions : [],
  }, "결제/권한 상태를 조회했습니다.");
}

async function handleEntitlements(request, env) {
  const [balanceResponse, subscriptionResponse] = await Promise.all([
    handleBalance(request, env),
    handleSubscriptionMe(request, env),
  ]);

  const balancePayload = await readPayloadSafe(balanceResponse);
  if (!balancePayload?.ok) return balanceResponse;

  const balanceData = extractBalanceData(balancePayload);
  const entitlements = Object.keys(balanceData.unlockMap || {})
    .filter((featureKey) => balanceData.unlockMap[featureKey] === true)
    .map((featureKey) => ({
      userId: String(balanceData.user?.id || balanceData.user?._id || ""),
      featureKey,
      status: "active",
      source: "coin",
      createdAt: null,
      expiresAt: null,
      transactionId: null,
    }));

  const subscriptionPayload = await readPayloadSafe(subscriptionResponse);
  const subscription = subscriptionPayload?.ok ? subscriptionPayload.data : null;

  return success({
    entitlements,
    unlockMap: balanceData.unlockMap,
    unlockedFeatures: balanceData.unlockedFeatures,
    subscription,
  }, "권한 목록을 조회했습니다.");
}

async function handleAccess(request, env) {
  const resolved = await resolveAccessDecision(request, env);
  if (!resolved.ok) return resolved.response;

  return success({
    featureKey: resolved.decision.featureKey,
    pricing: resolved.pricing,
    accessDecision: resolved.decision,
    subscription: resolved.context.subscription,
  }, "접근 가능 여부를 조회했습니다.");
}

async function handlePurchase(request, env) {
  const body = await readJson(request);
  const pricingResult = getBillingFeaturePricing({
    categoryKey: body?.categoryKey,
    subFeatureKey: body?.subFeatureKey,
    featureKey: body?.featureKey,
    reason: body?.reason,
  });

  if (!pricingResult.ok) {
    logBillingDiagnostic("price_not_found", request, {
      featureKey: String(body?.featureKey || ""),
      priceFound: false,
      errorCode: pricingResult.code || "PRICE_NOT_FOUND",
    });
    return featureKeyFailure(body?.featureKey, "서버 가격표에 정의되지 않은 기능입니다.", pricingResult.message || "가격 정보를 찾을 수 없습니다.");
  }

  const authCheck = await requireBillingAuth(request, env, { featureKey: pricingResult.pricing.featureKey });
  if (!authCheck.ok) return authCheck.response;

  const enabled = assertFeatureEnabled(pricingResult.pricing);
  if (!enabled.ok) {
    return failure(403, enabled.code || "FEATURE_DISABLED", enabled.message || "현재 이용할 수 없는 기능입니다.");
  }

  const accessResolved = await resolveAccessDecision(request, env, pricingResult);
  if (!accessResolved.ok) return accessResolved.response;

  const decision = accessResolved.decision;
  if (decision.reason === ACCESS_DECISION_REASONS.AUTH_REQUIRED) {
    return failure(401, "AUTH_REQUIRED", "로그인 후 이용할 수 있어요.");
  }

  if (decision.allowed) {
    return success({
      purchased: false,
      accessDecision: decision,
      pricing: accessResolved.pricing,
      unlockState: {
        alreadyUnlocked: decision.reason === ACCESS_DECISION_REASONS.ALREADY_UNLOCKED,
        subscriptionGranted: decision.reason === ACCESS_DECISION_REASONS.SUBSCRIPTION_ACTIVE,
      },
    }, "이미 이용 가능한 서비스입니다.");
  }

  if (decision.reason === ACCESS_DECISION_REASONS.INSUFFICIENT_COINS) {
    return failure(402, "INSUFFICIENT_COINS", "꽃돼지 코인이 부족해요. 충전 후 다시 시도해 주세요.");
  }

  if (decision.reason !== ACCESS_DECISION_REASONS.REQUIRES_PURCHASE) {
    return failure(400, "SERVER_ERROR", "결제 진입 조건을 확인할 수 없습니다.");
  }

  const requestId = resolveRequestId(request, body);
  const purchaseBody = {
    ...body,
    categoryKey: accessResolved.pricing.categoryKey,
    subFeatureKey: accessResolved.pricing.subFeatureKey,
    featureKey: accessResolved.pricing.featureKey,
    reason: accessResolved.pricing.reason,
    requestId,
    forceDeduct: body?.forceDeduct !== false,
  };

  const delegatedRequest = buildRoutedRequest(request, "/api/billing/coin-gate", "POST", purchaseBody);
  const delegatedResponse = await handleCoinGate(delegatedRequest, env);
  const delegatedPayload = await readPayloadSafe(delegatedResponse);

  if (!delegatedResponse.ok || !delegatedPayload?.ok) {
    return delegatedResponse;
  }

  return success({
    purchased: true,
    requestId,
    pricing: accessResolved.pricing,
    consume: delegatedPayload?.data?.consume || null,
    balance: delegatedPayload?.data?.balance,
    user: delegatedPayload?.data?.user || null,
    accessDecision: {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.ALREADY_UNLOCKED,
      featureKey: String(accessResolved.pricing.featureKey || ""),
      priceCoins: Number(accessResolved.pricing.cost || 0),
      coinBalance: Number.isFinite(Number(delegatedPayload?.data?.balance))
        ? Number(delegatedPayload.data.balance)
        : null,
    },
  }, "결제가 완료되었습니다.");
}

async function handleUnlockStatus(request, env) {
  const url = new URL(request.url);
  const categoryKey = String(url.searchParams.get("categoryKey") || "").trim();
  const subFeatureKey = String(url.searchParams.get("subFeatureKey") || "").trim();
  const featureKey = String(url.searchParams.get("featureKey") || "").trim();
  const reason = String(url.searchParams.get("reason") || "").trim();

  const pricingResult = getBillingFeaturePricing({ categoryKey, subFeatureKey, featureKey, reason });
  if (!pricingResult.ok) {
    return featureKeyFailure(featureKey, "서버 가격표에 정의되지 않은 기능입니다.", pricingResult.message || "가격 정보를 찾을 수 없습니다.");
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

  return success({
    pricing,
    unlocked,
    currentBalance,
    requiredCoins: Number(pricing.cost || 0),
    canAccess: unlocked || currentBalance >= Number(pricing.cost || 0),
  }, "기능 접근 상태를 조회했습니다.");
}

async function handleCoinGate(request, env) {
  const body = await readJson(request);

  const pricingResult = getBillingFeaturePricing({
    categoryKey: body?.categoryKey,
    subFeatureKey: body?.subFeatureKey,
    featureKey: body?.featureKey,
    reason: body?.reason,
  });

  if (!pricingResult.ok) {
    logBillingDiagnostic("price_not_found", request, {
      featureKey: String(body?.featureKey || ""),
      priceFound: false,
      errorCode: pricingResult.code || "PRICE_NOT_FOUND",
    });
    return featureKeyFailure(body?.featureKey, "서버 가격표에 정의되지 않은 기능입니다.", pricingResult.message || "가격 정보를 찾을 수 없습니다.");
  }

  const authCheck = await requireBillingAuth(request, env, { featureKey: pricingResult.pricing.featureKey });
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

  const delegatedBody = {
    cost: Number(pricing.cost),
    reason: String(pricing.reason),
    featureKey: String(pricing.featureKey),
    requestId,
    forceDeduct,
    categoryKey: pricing.categoryKey,
    subFeatureKey: pricing.subFeatureKey,
    payloadHash: String(body?.payloadHash || "").trim().slice(0, 120),
  };

  if (body?.productId) {
    delegatedBody.productId = String(body.productId).trim().toLowerCase();
  }

  const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/consume", "POST", delegatedBody);
  const delegatedResponse = await handleFortuneRoutes(delegatedRequest, env);
  const payload = await readPayloadSafe(delegatedResponse);

  if (!delegatedResponse.ok) {
    const mapped = mapCoinGateFailure(delegatedResponse.status, payload);
    return failure(mapped.status, mapped.code, mapped.message, mapped.debugMessage);
  }

  const balance = Number(payload?.user?.points ?? payload?.balance ?? 0);
  logBillingDiagnostic("coin_gate_completed", request, {
    featureKey: String(pricing.featureKey || ""),
    priceFound: true,
    transactionId: String(payload?.transactionId || ""),
    chargedCoins: Number(payload?.chargedCoins || 0),
    balanceAfter: Number.isFinite(balance) ? balance : null,
    refunded: false,
  });
  return success({
    pricing,
    consume: payload,
    balance: Number.isFinite(balance) ? balance : null,
    user: payload?.user || null,
  }, toMessage(payload, "코인 결제가 완료되었습니다."));
}

async function delegateToPayments(request, env, targetPath, body) {
  const delegatedRequest = buildRoutedRequest(request, targetPath, "POST", body);
  const delegatedResponse = await handlePaymentRoutes(delegatedRequest, env);
  const payload = await readPayloadSafe(delegatedResponse);

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

export async function handleBillingRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/billing");
  const trace = {
    route: "billing",
    requestPath: new URL(request.url).pathname,
    method,
    hasSession: Boolean(request.headers.get("Authorization") || request.headers.get("Cookie")),
    envBindingExists: hasMongoBinding(env),
    userIdExists: false,
  };

  try {
    if (method === "GET" && path === "/prices") return await handlePrices(request);
    if (method === "GET" && path === "/me") return await handleMe(request, env);
    if (method === "GET" && path === "/entitlements") return await handleEntitlements(request, env);
    if (method === "GET" && path === "/access") return await handleAccess(request, env);

    if (method === "GET" && path === "/features") return await handleFeatures(request);
    if (method === "GET" && path === "/balance") return await handleBalance(request, env);
    if (method === "GET" && path === "/unlock-status") return await handleUnlockStatus(request, env);

    if (method === "POST" && path === "/purchase") return await handlePurchase(request, env);
    if (method === "POST" && path === "/consume") return await handlePurchase(request, env);
    if (method === "POST" && path === "/coin-gate") return await handleCoinGate(request, env);
    if (method === "POST" && path === "/checkout") return await handleCheckout(request, env);
    if (method === "POST" && path === "/confirm") return await handleConfirm(request, env);

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    logApiCatchDiagnostic({
      request,
      route: `/api/billing${path}`,
      method,
      userId: "",
      env,
      hasSession: trace.hasSession,
      envBindingExists: trace.envBindingExists,
      error,
    });
    return handleRouteError(error, { request, env, trace });
  }
}

export const __billingTestUtils = {
  buildAccessDecision,
  ACCESS_DECISION_REASONS,
  requireBillingAuth,
};
