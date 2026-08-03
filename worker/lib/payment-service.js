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

export async function runAtomicMonthlyPayment({ mongoose, operation } = {}) {
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
    });
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
