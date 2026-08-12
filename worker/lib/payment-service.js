export const PAYMENT_METHODS = Object.freeze({
  MEMBERSHIP_PASS: "MEMBERSHIP_PASS",
  MONTHLY: "MONTHLY",
  DIRECT_KRW: "DIRECT_KRW",
  LEGACY_COIN: "LEGACY_COIN",
  UNSPECIFIED: "UNSPECIFIED",
  UNKNOWN: "UNKNOWN",
});

const PASS_ALIASES = new Set(["membership_pass", "membership"]);
const MONTHLY_ALIASES = new Set([
  "monthly_credit",
  "monthly",
  "membership_credit",
  "moonlight_stone",
  "moonlight stone",
  "moonlightstone",
]);
const DIRECT_ALIASES = new Set(["direct_krw", "single_payment", "single", "single_purchase"]);
const LEGACY_COIN_ALIASES = new Set(["coin", "coins", "point", "points"]);

export function resolvePaymentCommand({ paymentMode = "", directPaymentRequested = false } = {}) {
  const normalized = String(paymentMode || "").trim().toLowerCase();
  if (directPaymentRequested || DIRECT_ALIASES.has(normalized)) {
    return { method: PAYMENT_METHODS.DIRECT_KRW, requestedMode: normalized };
  }
  if (PASS_ALIASES.has(normalized)) {
    return { method: PAYMENT_METHODS.MEMBERSHIP_PASS, requestedMode: normalized };
  }
  if (MONTHLY_ALIASES.has(normalized)) {
    return { method: PAYMENT_METHODS.MONTHLY, requestedMode: normalized };
  }
  if (LEGACY_COIN_ALIASES.has(normalized)) {
    return { method: PAYMENT_METHODS.LEGACY_COIN, requestedMode: normalized };
  }
  if (!normalized) return { method: PAYMENT_METHODS.UNSPECIFIED, requestedMode: "" };
  return { method: PAYMENT_METHODS.UNKNOWN, requestedMode: normalized };
}

export function shouldVerifyMembershipPass(method) {
  return method === PAYMENT_METHODS.MEMBERSHIP_PASS;
}

function isTruthyFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

/**
 * 이 요청이 "사용자가 단건 카드 결제를 명시적으로 골랐다"인가.
 *
 * 🔴 결제수단 판정의 입력은 `paymentMode` 하나가 아니다 — `accessMode`·`mode` 도 같은 축이고,
 * `forceDirectPayment` 와 PortOne/Inicis provider 조합은 다른 값이 뭐라 적혀 있든 단건으로 확정한다.
 * 이 함수가 billing.js 안에만 있던 동안 라우터는 `paymentMode` 대문자 정확 일치로만 갈래를 정했고,
 * 그래서 같은 결제가 URL 이 아니라 **필드 철자에 따라** 신·구 구현으로 갈렸다. 판정을 여기 한 곳에
 * 두는 이유가 그것이다 — 라우터와 핸들러가 같은 답을 내야 한다. 복제하지 말 것.
 */
export function shouldCreateDirectPortOneOrder(body = {}) {
  const paymentMode = String(body?.paymentMode || body?.accessMode || body?.mode || "").trim().toLowerCase();
  const provider = String(body?.provider || body?.paymentProvider || "").trim().toLowerCase();
  const pg = String(body?.pg || body?.pgProvider || "").trim().toLowerCase();
  return paymentMode === "direct_krw"
    || paymentMode === "single_payment"
    || paymentMode === "single"
    || isTruthyFlag(body?.forceDirectPayment)
    || (provider === "portone_v2" && (pg === "kg_inicis" || pg === "kg-inicis" || pg === "inicis"));
}

/**
 * 본문 하나로 결제수단을 확정한다. billing.js 의 coin-gate 진입 판정(별칭·accessMode·단건 신호)과
 * **같은 답**을 내야 하는 곳이 쓴다(worker/index.js 의 V2 라우팅).
 */
export function resolvePaymentCommandFromBody(body = {}) {
  return resolvePaymentCommand({
    paymentMode: String(body?.paymentMode || body?.accessMode || "").trim().toLowerCase(),
    directPaymentRequested: shouldCreateDirectPortOneOrder(body),
  });
}

export function createInactiveMembershipPass() {
  return {
    isActive: false,
    entitlement: {},
    profileSubscription: null,
    tier: "free",
    passTier: null,
    freeLimit: 0,
  };
}

export function isTransactionUnsupported(error) {
  return /Transaction numbers are only allowed|replica set|Transaction .* not supported/i
    .test(String(error?.message || ""));
}

export function createMonthlyAtomicUnavailableError(error) {
  const wrapped = new Error("Monthly credit atomic transaction is unavailable.");
  wrapped.code = "MONTHLY_ATOMIC_UNAVAILABLE";
  wrapped.status = 503;
  wrapped.retryable = true;
  wrapped.cause = error;
  return wrapped;
}

function emitPaymentLog(context, payload) {
  const entry = {
    event: "payment_command",
    productId: String(payload?.productId || ""),
    featureKey: String(payload?.featureKey || ""),
    profileId: String(payload?.profileId || ""),
    method: String(payload?.method || ""),
    snapshotUsed: context?.snapshotUsed === true,
    snapshotVersion: String(context?.snapshotVersion || ""),
    passDecision: String(context?.passDecision || "NOT_CHECKED"),
    monthlyDecision: String(context?.monthlyDecision || "NOT_CHECKED"),
    existingAccessDecision: String(context?.existingAccessDecision || "NOT_CHECKED"),
    dbDurationMs: Math.max(0, Number(context?.dbDurationMs || 0)),
    apiDurationMs: Math.max(0, Number(payload?.apiDurationMs || 0)),
    requestId: String(payload?.requestId || ""),
    operationId: String(payload?.operationId || ""),
    failureCode: String(payload?.failureCode || ""),
    failureStage: String(payload?.failureStage || ""),
    httpStatus: Number(payload?.httpStatus || 0),
    retry: context?.retry === true,
    recovery: context?.recovery === true,
    clientDuplicate: context?.clientDuplicate === true,
    serverDuplicate: payload?.serverDuplicate === true,
  };
  try {
    if (typeof context?.log === "function") context.log(entry);
    else console.info("[payment-service]", JSON.stringify(entry));
  } catch {
    // Payment logging must never change the command result.
  }
}

// 🔴 withTransaction 의 드라이버 기본 상한은 120초다(mongodb/lib/sessions.js `MAX_TIMEOUT`).
// 우리 op 예산은 12초라, 이 값을 주지 않으면 "사용자에겐 실패라고 답했는데 트랜잭션은 뒤에서
// 최대 108초를 더 재시도하다 커밋" 이 가능해진다. 이 모듈은 의존성 주입식(mongoose 를 받는다)이라
// db.js 를 import 하지 않으므로 상수를 여기 한 벌 더 둔다 — 두 값이 어긋나지 않는지는
// __tests__/worker/db.transaction-budget.test.js 가 고정한다.
const DEFAULT_TRANSACTION_OPTIONS = Object.freeze({ timeoutMS: 8000 });

export async function runAtomicMonthlyPayment({ mongoose, operation, transactionOptions = DEFAULT_TRANSACTION_OPTIONS } = {}) {
  if (!mongoose?.startSession || typeof operation !== "function") {
    throw createMonthlyAtomicUnavailableError(new Error("Mongo transaction API is unavailable."));
  }

  let session;
  try {
    session = await mongoose.startSession();
  } catch (error) {
    throw createMonthlyAtomicUnavailableError(error);
  }
  if (typeof session?.withTransaction !== "function") {
    try {
      await session?.endSession?.();
    } finally {
      throw createMonthlyAtomicUnavailableError(new Error("Mongo transaction session is unavailable."));
    }
  }
  let outcome = null;
  try {
    await session.withTransaction(async () => {
      outcome = await operation(session);
    }, transactionOptions);
    return outcome;
  } catch (error) {
    if (isTransactionUnsupported(error)) throw createMonthlyAtomicUnavailableError(error);
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function executePayment({
  method,
  productId = "",
  featureKey = "",
  profileId = "",
  requestId = "",
  priceQuoteToken = "",
  handlers = {},
  context = {},
} = {}) {
  const command = {
    method,
    productId: String(productId || "").trim(),
    featureKey: String(featureKey || "").trim(),
    profileId: String(profileId || "").trim(),
    requestId: String(requestId || "").trim(),
    priceQuoteToken: String(priceQuoteToken || "").trim(),
    context,
  };
  const handler = handlers[method];
  if (typeof handler !== "function") {
    const error = new Error(`Unsupported payment method: ${String(method || "")}`);
    error.code = method === PAYMENT_METHODS.UNKNOWN ? "UNKNOWN_PAYMENT_METHOD" : "PAYMENT_HANDLER_UNAVAILABLE";
    throw error;
  }
  const startedAt = Date.now();
  try {
    const result = await handler(command);
    emitPaymentLog(context, {
      ...command,
      apiDurationMs: Date.now() - startedAt,
      operationId: result?.operationId || result?.transactionId || result?.paymentId || result?.ledgerId || "",
      httpStatus: result?.status || 200,
      serverDuplicate: result?.idempotent === true || result?.replayed === true || result?.duplicate === true,
    });
    return result;
  } catch (error) {
    emitPaymentLog(context, {
      ...command,
      apiDurationMs: Date.now() - startedAt,
      failureCode: error?.code || "PAYMENT_COMMAND_FAILED",
      failureStage: error?.stage || "execute",
      httpStatus: error?.status || 500,
    });
    throw error;
  }
}
